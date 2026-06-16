import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const distDir = join(process.cwd(), "dist");
const cacheName = `murdoku-board-maker-${Date.now()}`;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const assets = walk(distDir)
  .filter((file) => !file.endsWith(`${sep}sw.js`))
  .map((file) => `./${relative(distDir, file).split(sep).join("/")}`)
  .sort();

if (!assets.includes("./index.html")) {
  assets.unshift("./index.html");
}

if (!assets.includes("./")) {
  assets.unshift("./");
}

const sw = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify(assets, null, 2)};

function toScopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS.map(toScopeUrl));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);

  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.href.startsWith(scopeUrl.href)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(toScopeUrl("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
`;

writeFileSync(join(distDir, "sw.js"), sw, "utf8");
writeFileSync(join(distDir, ".nojekyll"), "", "utf8");
console.log(`Service worker gemaakt met ${assets.length} assets.`);
