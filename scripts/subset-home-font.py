#!/usr/bin/env python3
"""Build Garet's web subset without changing its source font or variable axes.

Reproduce with isolated tooling (no application dependencies):
  python3.12 -m pip install --target /tmp/sb-font-tooling \
    'fonttools[woff]==4.68.0' 'brotli==1.2.1' 'zopfli==0.4.3'
  PYTHONPATH=/tmp/sb-font-tooling python3.12 scripts/subset-home-font.py

The standard fontTools shaping features plus tnum are retained. Discretionary
stylistic sets/alternates not used by the site are intentionally excluded.
--check rebuilds deterministically in a temporary directory and compares bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import itertools
import json
from pathlib import Path
import re
import tempfile
import unicodedata

from fontTools import __version__ as fonttools_version, subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/fonts/Garet-Variable-Regular.woff2"
DESTINATION = ROOT / "design/fonts/Garet-Variable-Web.woff2"
SOURCE_ROOTS = ("app", "components", "lib", "content", "public/system")
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".css", ".html", ".json", ".md", ".mdx"}
RANGES = (
    (0x0020, 0x024F),  # Latin, Latin-1, Latin Extended A/B, digits and NBSP.
    (0x0300, 0x036F),  # Combining accents used by Latin/Cyrillic composition.
    (0x0400, 0x04FF),  # Cyrillic, including Russian, Ukrainian and Belarusian.
    (0x2000, 0x206F),  # Spaces, quotes, dashes, ellipsis and general punctuation.
    (0x20A0, 0x20CF),  # Currency signs including ruble and euro.
    (0x2100, 0x214F),  # Letterlike symbols, including numero and trademark.
    (0x2190, 0x21FF),  # Arrows.
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_codepoints() -> set[int]:
    """Conservatively scan complete source files, including comments and literals."""
    result: set[int] = set()
    for directory in SOURCE_ROOTS:
        for path in sorted((ROOT / directory).rglob("*")):
            if not path.is_file() or path.suffix not in SOURCE_EXTENSIONS:
                continue
            text = html.unescape(path.read_text(encoding="utf-8"))
            result.update(ord(char) for char in text if not unicodedata.category(char).startswith("C"))
            for match in re.finditer(r"\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))", text):
                result.add(int(match.group(1) or match.group(2), 16))
    return {cp for cp in result if cp >= 0x20 and cp <= 0x10FFFF and not 0xD800 <= cp <= 0xDFFF}


def metrics(font: TTFont) -> dict:
    fields = {
        "head": ("unitsPerEm",),
        "hhea": ("ascent", "descent", "lineGap", "caretSlopeRise", "caretSlopeRun"),
        "OS/2": ("xAvgCharWidth", "sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent", "sxHeight", "sCapHeight", "fsSelection"),
        "post": ("italicAngle", "underlinePosition", "underlineThickness"),
    }
    return {table: {name: getattr(font[table], name) for name in names} for table, names in fields.items()}


def rounded(value):
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, (tuple, list)):
        return tuple(rounded(item) for item in value)
    return value


def outlines(glyph_set, name):
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    return rounded(pen.value)


def verify(original: TTFont, web: TTFont, used: set[int], retained_names: list[str]) -> dict:
    old_map, new_map = original.getBestCmap(), web.getBestCmap()
    assert used <= new_map.keys(), "A source character was removed from the web font"
    assert metrics(original) == metrics(web), "Global layout metrics changed"
    for table in ("fvar", "avar", "STAT"):
        assert original[table].compile(original) == web[table].compile(web), f"{table} changed"

    # GIDs/names may be compacted, but each retained outline and full variation
    # tuple must be identical. This proves preservation throughout both axes,
    # not only at the sampled weights used by the second check below.
    target_names = web.getGlyphOrder()
    assert len(retained_names) == len(target_names)
    for before, after in zip(retained_names, target_names):
        assert original["hmtx"].metrics[before] == web["hmtx"].metrics[after], f"hmtx changed: {before}"
        a = original["gvar"].variations.get(before, [])
        b = web["gvar"].variations.get(after, [])
        assert len(a) == len(b), f"Variation tuple count changed: {before}"
        for x, y in zip(a, b):
            assert x.axes == y.axes and x.coordinates == y.coordinates, f"Variation deltas changed: {before}"

    axes = original["fvar"].axes
    locations = []
    axis_samples = []
    for axis in axes:
        samples = {axis.minValue, axis.defaultValue, axis.maxValue, (axis.minValue + axis.maxValue) / 2}
        if axis.axisTag == "wght":
            samples.update([100, 300, 400, 500, 600, 700, 800, 900])
        axis_samples.append(sorted(value for value in samples if axis.minValue <= value <= axis.maxValue))
    for values in itertools.product(*axis_samples):
        location = dict(zip((axis.axisTag for axis in axes), values))
        a, b = original.getGlyphSet(location=location), web.getGlyphSet(location=location)
        for cp in sorted(used):
            old_name, new_name = old_map[cp], new_map[cp]
            assert round(a[old_name].width, 6) == round(b[new_name].width, 6), f"Advance changed: U+{cp:04X} {location}"
            assert outlines(a, old_name) == outlines(b, new_name), f"Outline changed: U+{cp:04X} {location}"
        locations.append(location)
    return {"global_metrics_identical": True, "variable_tables_identical": ["fvar", "avar", "STAT"],
            "retained_glyphs_with_identical_metrics_and_variation_tuples": len(retained_names),
            "source_characters_with_identical_outlines_and_advances": len(used),
            "sampled_axis_locations": len(locations), "outline_comparisons": len(used) * len(locations)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify that the committed subset matches a fresh deterministic build")
    parser.add_argument("--report", type=Path, help="Optional JSON evidence path")
    args = parser.parse_args()
    assert fonttools_version == "4.68.0", "Use the pinned tooling versions documented above"
    source_hash = digest(SOURCE)
    original = TTFont(SOURCE, recalcTimestamp=False)
    cmap = original.getBestCmap()
    used = source_codepoints()
    missing_original = used - cmap.keys()
    assert not missing_original, f"Source characters unsupported by original Garet: {sorted(hex(cp) for cp in missing_original)}"
    wanted = {cp for start, end in RANGES for cp in range(start, end + 1)} | used | {0x2212}
    options = subset.Options()
    options.layout_features = sorted(set(options.layout_features) | {"tnum"})
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_outline = True
    options.recalc_timestamp = False
    options.recalc_bounds = False
    options.recalc_average_width = False
    font = TTFont(SOURCE, recalcTimestamp=False)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=wanted)
    subsetter.subset(font)
    retained_names = font.getGlyphOrder()
    font.flavor = "woff2"
    with tempfile.TemporaryDirectory(prefix="smartbus-font-") as directory:
        candidate = Path(directory) / "Garet-Variable-Web.woff2"
        font.save(candidate)
        web = TTFont(candidate, recalcTimestamp=False)
        checks = verify(original, web, used, retained_names)
        if args.check:
            assert DESTINATION.read_bytes() == candidate.read_bytes(), "Web subset differs from reproducible build"
        else:
            DESTINATION.write_bytes(candidate.read_bytes())
        assert digest(SOURCE) == source_hash, "Original font was modified"
        source_size, web_size = SOURCE.stat().st_size, candidate.stat().st_size
        report = {"source": str(SOURCE.relative_to(ROOT)), "output": str(DESTINATION.relative_to(ROOT)),
                  "source_sha256": source_hash, "web_sha256": digest(candidate), "source_bytes": source_size,
                  "web_bytes": web_size, "saved_bytes": source_size - web_size,
                  "reduction_percent": round((1 - web_size / source_size) * 100, 2),
                  "source_unicode_count": len(cmap), "web_unicode_count": len(web.getBestCmap()),
                  "axes": [{"tag": axis.axisTag, "min": axis.minValue, "default": axis.defaultValue, "max": axis.maxValue} for axis in web["fvar"].axes],
                  "fonttools": fonttools_version, "checks": checks}
        serialized = json.dumps(report, ensure_ascii=False, indent=2)
        if args.report:
            args.report.write_text(serialized + "\n", encoding="utf-8")
        print(serialized)


if __name__ == "__main__":
    main()
