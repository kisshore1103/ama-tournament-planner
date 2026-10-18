import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.mode === 'navigate' && url.origin === self.location.origin,
      handler: new NetworkFirst({ cacheName: 'ama-pages', networkTimeoutSeconds: 4 }),
    },
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({ cacheName: 'ama-static' }),
    },
  ],
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});
serwist.addEventListeners();
