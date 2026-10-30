'use strict';

const CACHE_NAME = 'lovestronautes-v24-audio-lifecycle-visible';
const scope = self.registration.scope;
const APP_SHELL = [
  new URL('./', scope).href,
  new URL('./index.html', scope).href,
  new URL('./ui-v9.css', scope).href,
  new URL('./psy-track-creator.css', scope).href,
  new URL('./cwejman-s1.css', scope).href,
  new URL('./taiga-modular.css', scope).href,
  new URL('./studio-keyboard.css', scope).href,
  new URL('./loop-studio.css', scope).href,
  new URL('./hardware-synth-lab.css', scope).href,
  new URL('./grandmother-synth.css', scope).href,
  new URL('./studio-patchbay.css', scope).href,
  new URL('./studio-audio-repair-v21.css', scope).href,
  new URL('./field-kit.css', scope).href,
  new URL('./mobile-v17.css', scope).href,
  new URL('./mobile-v18.css', scope).href,
  new URL('./mobile-compat.js', scope).href,
  new URL('./audio-extensions.js', scope).href,
  new URL('./studio-features.js', scope).href,
  new URL('./composition-pro.js', scope).href,
  new URL('./composition-pro.css', scope).href,
  new URL('./studio-patchbay.js', scope).href,
  new URL('./studio-audio-repair-v21.js', scope).href,
  new URL('./psy-machines.js', scope).href,
  new URL('./psy-track-creator.js', scope).href,
  new URL('./cwejman-s1.js', scope).href,
  new URL('./taiga-modular.js', scope).href,
  new URL('./studio-keyboard.js', scope).href,
  new URL('./loop-studio.js', scope).href,
  new URL('./hardware-synth-lab.js', scope).href,
  new URL('./grandmother-synth.js', scope).href,
  new URL('./field-kit-import-v18.js', scope).href,
  new URL('./field-kit.js', scope).href,
  new URL('./studio-stability-v18.js', scope).href,
  new URL('./mobile-v17.js', scope).href,
  new URL('./pcm-capture-processor.js', scope).href,
  new URL('./mp3-encoder-worker.js', scope).href,
  new URL('./vendor/lame.min.js', scope).href,
  new URL('./manifest.json', scope).href,
  new URL('./icon.svg', scope).href,
  new URL('./banner.svg', scope).href
];
const INDEX_URL = new URL('./index.html', scope).href;

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(APP_SHELL); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(keys.filter(function(key) { return key !== CACHE_NAME; }).map(function(key) { return caches.delete(key); }));
      })
      .then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function() { return caches.match(request).then(function(hit) { return hit || caches.match(INDEX_URL); }); })
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // JavaScript is network-first so returning users see a published update,
  // with cached content preserved when the network is unavailable.
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css')) {
    event.respondWith(fetch(request).then(function(response){
      if(response && response.ok) {
        const copy=response.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(request,copy);});
      }
      return response;
    }).catch(function(){return caches.match(request);}));
    return;
  }
  event.respondWith(
    caches.match(request).then(function(hit) {
      if (hit) return hit;
      return fetch(request).then(function(response) {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(request, copy); });
        return response;
      });
    })
  );
});
