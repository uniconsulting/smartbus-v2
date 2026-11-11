"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

type GlassMode = "pending" | "simple" | "opaque";
type LensSize = { width: number; height: number; radius: number; dpr: number };
type LensOptics = {
  scale: number;
  aberration: number;
  frost: number;
  edgeFrost: number;
  bevelDepth: number;
};
type Lens = LensSize & LensOptics & {
  id: string;
  mapUrl: string;
};

const SIMPLE_BACKDROP = "blur(20px) saturate(1.8) brightness(1.05)";
// Optical model adapted from the user-supplied LiquidGlass by Aakash Mehra.
const RESIZE_DELAY = 140;
const MAX_MAP_PIXELS = 1_000_000;
// Budget the *expanded filter surface at the display DPR*, not just its PNG map.
// The 4K audit isolated the multi-pass SVG backdrop as the scroll bottleneck.
const CHROMATIC_PIXEL_BUDGET = 400_000;
const REFRACTION_PIXEL_BUDGET = 850_000;

function lensOptics(height: number, radius: number): LensOptics {
  return {
    scale: Math.min(height * 0.6, radius * 1.65),
    aberration: Math.min(0.7, height * 0.009),
    frost: Math.min(2.4, Math.max(1.2, height * 0.023)),
    edgeFrost: Math.min(6, Math.max(4, height * 0.073)),
    bevelDepth: Math.min(height * 0.28, radius * 0.9),
  };
}

function filterPadding(optics: LensOptics) {
  // feDisplacementMap's maximum offset is scale / 2, not the full scale.
  return Math.ceil((optics.scale + optics.aberration) / 2 + 3 * optics.edgeFrost + 2);
}

/** Decorative lens only: the header's links remain outside its filtered surface. */
export function HeaderGlass() {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const surfaceRef = useRef<HTMLDivElement>(null);
  const liveUrls = useRef(new Set<string>());
  const lensSerial = useRef(0);
  const [mode, setMode] = useState<GlassMode>("pending");
  const [lens, setLens] = useState<Lens | null>(null);
  const [nativeLens, setNativeLens] = useState<(LensOptics & { radius: number }) | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const updateMode = () => {
      setMode(preference.matches ? "opaque" : supportsRefraction() ? "pending" : "simple");
    };
    updateMode();
    preference.addEventListener("change", updateMode);
    return () => preference.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    setLens(null);
    setNativeLens(null);
    if (!surface || mode !== "pending") return;
    if (typeof ResizeObserver === "undefined") {
      setMode("simple");
      return;
    }

    let disposed = false;
    let revision = 0;
    let signature = "";
    let timer: number | undefined;
    let idle: number | undefined;

    const cancelScheduled = () => {
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      timer = idle = undefined;
    };

    const buildLens = async (size: LensSize, optics: LensOptics, ticket: number) => {
      let mapUrl: string | undefined;
      let handedToReact = false;
      try {
        // The supplied squircle/Snell optics are scaled to this shallow header lens.
        const blob = await generateDisplacementBlob(size, optics.bevelDepth);
        if (disposed || ticket !== revision) return;
        mapUrl = URL.createObjectURL(blob);
        liveUrls.current.add(mapUrl);
        await decodeMap(mapUrl);
        if (disposed || ticket !== revision) return;
        setLens({
          ...size,
          ...optics,
          id: `sb-header-lens-${reactId}-${++lensSerial.current}`,
          mapUrl,
        });
        handedToReact = true;
      } catch {
        // A blocked canvas/blob/filter must never make the navigation disappear.
        if (!disposed && ticket === revision) setMode("simple");
      } finally {
        if (mapUrl && !handedToReact) {
          URL.revokeObjectURL(mapUrl);
          liveUrls.current.delete(mapUrl);
        }
      }
    };

    const schedule = () => {
      if (disposed) return;
      try {
        // Observe the filter surface itself, not the header's smaller content box.
        const { width, height } = surface.getBoundingClientRect();
        if (width < 2 || height < 2) return;
        const rawRadius = getComputedStyle(surface).borderTopLeftRadius.split(" ")[0];
        const radius = Math.min(
          width / 2,
          height / 2,
          rawRadius.endsWith("%")
            ? (parseFloat(rawRadius) / 100) * Math.min(width, height)
            : parseFloat(rawRadius) || 0,
        );
        const dpr = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(MAX_MAP_PIXELS / (width * height)),
        );
        const size = { width, height, radius, dpr };
        const optics = lensOptics(height, radius);
        const pad = filterPadding(optics);
        const displayDpr = Math.max(1, window.devicePixelRatio || 1);
        const filterPixels = (width + 2 * pad) * (height + 2 * pad) * displayDpr ** 2;
        const quality = filterPixels > REFRACTION_PIXEL_BUDGET ? "native"
          : filterPixels > CHROMATIC_PIXEL_BUDGET ? "single" : "chromatic";
        const nextSignature = [width, height, radius, dpr].map((value) => value.toFixed(2)).join(":") + quality;
        if (nextSignature === signature) return;
        signature = nextSignature;
        const ticket = ++revision;
        cancelScheduled();
        // Keep the ordinary blur while a new, correctly sized map is being decoded.
        setLens(null);
        if (quality === "native") {
          // Two native CSS backdrop layers preserve body/rim frosting at 4K.
          // There is no displacement map to allocate or SVG to render in this tier.
          setNativeLens({ ...optics, radius });
          return;
        }
        setNativeLens(null);
        if (quality === "single") optics.aberration = 0;
        timer = window.setTimeout(() => {
          timer = undefined;
          if (typeof window.requestIdleCallback === "function") {
            idle = window.requestIdleCallback(() => {
              idle = undefined;
              void buildLens(size, optics, ticket);
            }, { timeout: 500 });
          } else {
            void buildLens(size, optics, ticket);
          }
        }, RESIZE_DELAY);
      } catch {
        setMode("simple");
      }
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(surface, { box: "border-box" });
    window.addEventListener("resize", schedule, { passive: true });
    // Moving between displays can change DPR without resizing the CSS viewport.
    // A resolution query must be replaced after each change to watch the new DPR.
    let resolution: MediaQueryList | undefined;
    const watchResolution = () => {
      resolution?.removeEventListener("change", onResolutionChange);
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      resolution.addEventListener("change", onResolutionChange);
    };
    const onResolutionChange = () => {
      if (disposed) return;
      watchResolution();
      schedule();
    };
    watchResolution();
    schedule();
    return () => {
      disposed = true;
      revision++;
      cancelScheduled();
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      resolution?.removeEventListener("change", onResolutionChange);
    };
  }, [mode, reactId]);

  // Revoke the previous map only after React has committed its replacement.
  useEffect(() => {
    if (!lens) return;
    const urls = liveUrls.current;
    return () => {
      URL.revokeObjectURL(lens.mapUrl);
      urls.delete(lens.mapUrl);
    };
  }, [lens]);

  useEffect(() => {
    const urls = liveUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const activeLens = mode === "pending" ? lens : null;
  const activeNativeLens = mode === "pending" ? nativeLens : null;
  const backdrop = mode === "opaque"
    ? "none"
    : activeLens
      ? `url(#${activeLens.id}) blur(0.75px) saturate(1.85) brightness(1.02)`
      : activeNativeLens
        ? `blur(${Math.hypot(activeNativeLens.frost, 0.75).toFixed(3)}px) saturate(1.85) brightness(1.02)`
        : SIMPLE_BACKDROP;

  return (
    <>
      {activeNativeLens ? (
        <div
          className="sb-header-glass-rim"
          aria-hidden="true"
          style={{
            "--glass-rim-radius": `${activeNativeLens.radius}px`,
            "--glass-rim-depth": `${activeNativeLens.bevelDepth}px`,
            // The following body layer adds its own blur; variances add.
            backdropFilter: `blur(${Math.sqrt(activeNativeLens.edgeFrost ** 2 - activeNativeLens.frost ** 2).toFixed(3)}px)`,
            WebkitBackdropFilter: `blur(${Math.sqrt(activeNativeLens.edgeFrost ** 2 - activeNativeLens.frost ** 2).toFixed(3)}px)`,
          } as CSSProperties}
        />
      ) : null}
    <div
      ref={surfaceRef}
      className="sb-header-glass"
      aria-hidden="true"
      data-refract={activeLens ? "true" : "false"}
      data-mode={activeLens ? "refracted" : activeNativeLens ? "native" : mode}
      data-quality={activeLens ? activeLens.aberration > 0 ? "chromatic" : "single" : activeNativeLens ? "native" : undefined}
      style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop }}
    >
      {activeLens ? <LensFilter key={activeLens.id} lens={activeLens} /> : null}
    </div>
    </>
  );
}

function supportsRefraction() {
  // Firefox accepts URL filter syntax but does not apply this SVG backdrop lens.
  // Safari/iOS receive the ordinary translucent blur rather than a broken lens.
  if (!/Chrome\/|Chromium\//.test(navigator.userAgent)) return false;
  if (/Firefox|FxiOS|CriOS|EdgiOS/.test(navigator.userAgent)) return false;
  return typeof CSS !== "undefined" && typeof CSS.supports === "function"
    && (CSS.supports("backdrop-filter", "url(#sb-test)")
      || CSS.supports("-webkit-backdrop-filter", "url(#sb-test)"));
}

function LensFilter({ lens }: { lens: Lens }) {
  const { id, mapUrl, width, height, scale, aberration, frost, edgeFrost } = lens;
  const pad = filterPadding(lens);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id={id}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x={-pad}
          y={-pad}
          width={width + 2 * pad}
          height={height + 2 * pad}
          colorInterpolationFilters="sRGB"
        >
          <feImage href={mapUrl} xlinkHref={mapUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" result="map" />
          {aberration === 0 ? (
            <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="rgb" />
          ) : <>
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale + aberration} xChannelSelector="R" yChannelSelector="G" result="dispR" />
          <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dispG" />
          <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={Math.max(0, scale - aberration)} xChannelSelector="R" yChannelSelector="G" result="dispB" />
          <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="rgb" />
          </>}
          <feGaussianBlur in="rgb" stdDeviation={frost} result="bodyFrost" />
          <feGaussianBlur in="rgb" stdDeviation={edgeFrost} result="edgeFrost" />
          {/* Blue stores the smooth rim weight; R/G remain the refraction channels. */}
          <feColorMatrix in="map" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="rimMask" />
          <feComposite in="edgeFrost" in2="rimMask" operator="in" result="softRim" />
          <feComposite in="softRim" in2="bodyFrost" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

function roundedBoxDistance(px: number, py: number, halfW: number, halfH: number, radius: number) {
  const qx = Math.abs(px) - halfW + radius;
  const qy = Math.abs(py) - halfH + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/** Squircle dome slope and Snell's law, with a glass refractive index of 1.5. */
function bendFromDepth(depth: number) {
  const u = 1 - Math.min(1, Math.max(0, depth));
  const denominator = (1 - u ** 4) ** 0.75;
  if (denominator < 1e-6) return 0;
  const incidentAngle = Math.atan(Math.min(u ** 3 / denominator, 8));
  return Math.sin(incidentAngle - Math.asin(Math.sin(incidentAngle) / 1.5));
}

function heightTable(bevel: number) {
  const length = Math.max(1, Math.ceil(bevel));
  const table = new Float32Array(length + 1);
  for (let depth = 1; depth <= length; depth++) {
    table[depth] = table[depth - 1] + bendFromDepth(depth / length);
  }
  return table;
}

function sampleHeight(table: Float32Array, depth: number) {
  if (depth <= 0) return table[0];
  if (depth >= table.length - 1) return table[table.length - 1];
  const index = Math.floor(depth);
  const fraction = depth - index;
  return table[index] * (1 - fraction) + table[index + 1] * fraction;
}

async function generateDisplacementBlob(size: LensSize, bevelDepth: number) {
  const width = Math.max(1, Math.round(size.width * size.dpr));
  const height = Math.max(1, Math.round(size.height * size.dpr));
  const halfW = width / 2;
  const halfH = height / 2;
  const radius = Math.min(size.radius * size.dpr, halfW, halfH);
  const bevel = Math.max(1, bevelDepth * size.dpr);
  const table = heightTable(bevel);
  const field = new Float32Array(width * height);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = roundedBoxDistance(x - halfW + 0.5, y - halfH + 0.5, halfW, halfH, radius);
      field[y * width + x] = distance > 0 ? 0 : sampleHeight(table, Math.min(bevel, -distance));
      const pixel = (y * width + x) * 4;
      data[pixel] = data[pixel + 1] = 128;
      // A smoothstep fades the stronger blur from the rounded rim into the body.
      // Its zero slope at both ends avoids a visible band along the inner bevel.
      const depth = Math.min(1, Math.max(0, -distance / bevel));
      const rimWeight = 1 - depth * depth * (3 - 2 * depth);
      data[pixel + 2] = distance > 0 ? 0 : Math.round(rimWeight * 255);
      data[pixel + 3] = distance > 0 ? 0 : 255;
    }
  }

  // R/G hold the gradient of the refracted height field; the centre stays neutral.
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const pixel = (y * width + x) * 4;
      if (data[pixel + 3] === 0) continue;
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      const dx = (field[y * width + x1] - field[y * width + x0]) / (x1 - x0 || 1);
      const dy = (field[y1 * width + x] - field[y0 * width + x]) / (y1 - y0 || 1);
      data[pixel] = 128 + Math.max(-1, Math.min(1, dx * 1.35)) * 127;
      data[pixel + 1] = 128 + Math.max(-1, Math.min(1, dy * 1.35)) * 127;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Glass map canvas unavailable");
  context.putImageData(new ImageData(data, width, height), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Glass map encoding failed");
  return blob;
}

function decodeMap(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => finish(new Error("Glass map decoding timed out")), 4_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Glass map could not be decoded"));
    image.src = url;
  });
}

export default HeaderGlass;
