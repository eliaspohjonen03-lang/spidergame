/// <reference lib="webworker" />
// Pelin palvelutyöntekijä: offline-välimuisti ja Androidin jakovalikosta tulevat kuvasetit.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

const SHARE_CACHE = 'custom-spider-share';
const SHARE_KEY = 'shared-file';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Jakovalikko lähettää tiedoston POST-pyyntönä. Tallennetaan se välimuistiin ja avataan peli.
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || !url.searchParams.has('share-target')) return;
  event.respondWith(
    (async () => {
      const target = new URL('./?shared=1', self.registration.scope).href;
      try {
        const form = await event.request.formData();
        const file = form.getAll('file').find((f): f is File => typeof f !== 'string');
        if (file) {
          const cache = await caches.open(SHARE_CACHE);
          await cache.put(SHARE_KEY, new Response(file, { headers: { 'Content-Type': file.type || 'application/json' } }));
          return Response.redirect(target, 303);
        }
      } catch {
        /* palataan peliin ilman tiedostoa */
      }
      return Response.redirect(new URL('./?shared=0', self.registration.scope).href, 303);
    })(),
  );
});

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
