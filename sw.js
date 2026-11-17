// Ambika Homoeopathy service worker: network-first app shell, never caches live data,
// and shows the "your turn is near" phone notifications sent by the clinic console.
const CACHE = "ambika-v2";
const SHELL = ["./", "index.html", "doctor.jpg", "icon-192.png", "icon-512.png", "badge-72.png", "manifest.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Firebase traffic goes straight to network
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Ambika Homoeopathy", {
    body: d.body || "",
    icon: "icon-192.png",
    badge: "badge-72.png",
    tag: d.tag || "ambika",
    renotify: true,
    requireInteraction: !!d.urgent,
    vibrate: d.urgent ? [400, 150, 400, 150, 700] : [250, 120, 250],
    lang: d.lang || "hi-IN",
    data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => !x.url.includes("#admin"));
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
