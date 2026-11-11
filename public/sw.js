/* Only public recovery assets are cached. Forms and API requests always use the network. */
const CACHE_PREFIX = "smartbus-recovery-";
const CACHE_NAME = `${CACHE_PREFIX}v6`;
const OFFLINE_PAGE = "/system/offline.html";
const ERROR_PAGE = "/system/unavailable.html";
const ASSETS = [
  OFFLINE_PAGE, ERROR_PAGE, "/system/state.css", "/system/retry.js",
  "/system/fonts/bicubik.woff2", "/system/fonts/garet.woff2",
  "/home/brand/logo.svg", "/home/footer/coach.svg", "/home/footer/citybus.svg",
  "/home/footer/shuttle.svg", "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS.map((path) => new Request(path, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const HTTP_MESSAGES = {
  401: ["Требуется авторизация", "Для доступа к странице нужны действующие учётные данные."],
  403: ["Доступ ограничен", "Для этого адреса действуют ограничения доступа. Проверьте ссылку или перейдите на главную."],
  410: ["Страница удалена", "Этот материал больше недоступен. На главной странице собраны актуальные разделы SmartBus."],
  429: ["Слишком много запросов", "Подождите немного и попробуйте открыть страницу ещё раз."],
  502: ["Сервис временно недоступен", "Сервер не смог получить корректный ответ. Попробуйте открыть страницу позже."],
  503: ["Сервис временно недоступен", "Попробуйте открыть страницу немного позже. По вопросам поездки можно позвонить диспетчеру."],
  504: ["Сервер не ответил вовремя", "Попробуйте открыть страницу ещё раз. По вопросам поездки можно позвонить диспетчеру."],
};

async function fallbackPage(path, original) {
  const cached = await caches.match(path, { cacheName: CACHE_NAME });
  if (!cached) return original || Response.error();

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  });
  if (!original) return new Response(cached.body, { status: 503, headers });

  for (const key of ["Retry-After", "WWW-Authenticate", "Proxy-Authenticate", "Allow"]) {
    const value = original.headers.get(key);
    if (value) headers.set(key, value);
  }
  let html = (await cached.text()).replace("<!--response-code-->Ошибка сайта", `Ошибка ${original.status}`);
  const message = HTTP_MESSAGES[original.status];
  if (message) {
    html = html.replace(/<!--response-title-->[^<]+/, message[0]).replace(/<!--response-detail-->[^<]+/, message[1]);
  }
  return new Response(html, { status: original.status, statusText: original.statusText, headers });
}

async function navigate(request) {
  let response;
  try {
    response = await fetch(request);
  } catch {
    return fallbackPage(OFFLINE_PAGE);
  }
  // Next renders its own branded 404 and supplies the correct routing context.
  if (response.status < 400 || response.status === 404) return response;
  return fallbackPage(ERROR_PAGE, response).catch(() => response);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname === "/adpanel" || url.pathname.startsWith("/adpanel/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }
  if (ASSETS.includes(url.pathname) && !url.search && request.cache !== "no-store") {
    event.respondWith(caches.match(url.pathname, { cacheName: CACHE_NAME }).then((cached) => cached || fetch(request)));
  }
});
