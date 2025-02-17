// File: /public/sw.js

// This is the "offline copy of pages" service worker

// Install stage sets up the index page (home page) in the cache and opens a new cache
self.addEventListener('install', function (event) {
  var indexPage = new Request('index.html');
  event.waitUntil(
    fetch(indexPage).then(function (response) {
      return caches.open('pwabuilder-offline').then(function (cache) {
        return cache.put(indexPage, response);
      });
    })
  );
});

// If any fetch fails, it will look for the request in the cache
// and serve it from there first
self.addEventListener('fetch', function (event) {
  const requestUrl = new URL(event.request.url);

  // Define a function to handle network requests and cache the response
  const handleNetworkFetch = async (request) => {
    try {
      // Try to fetch the resource from the network
      const response = await fetch(request);

      // Check if the response is valid (status code 200-299)
      if (!response || response.status < 200 || response.status >= 300) {
        throw new Error('Network request failed');
      }

      // Clone the response before caching, as the original will be consumed by the browser
      const responseToCache = response.clone();

      // Open the cache
      const cache = await caches.open('pwabuilder-offline');

      // Put the response into the cache, using the request as the key
      await cache.put(request, responseToCache);

      // Return the response to the browser
      return response;
    } catch (error) {
      // If the network request fails, try to serve the resource from the cache
      console.error('Fetch failed, falling back to cache:', error);
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // If the resource is not in the cache, return an error response
      return new Response('Not found in cache', {
        status: 404,
        statusText: 'Not found in cache',
      });
    }
  };

  // Respond to the request with the network response, or the cached response if the network fails
  event.respondWith(
    handleNetworkFetch(event.request).catch(error => {
      console.error('handleNetworkFetch promise rejected:', error);
      return new Response('Service unavailable', {
        status: 503,
        statusText: 'Service unavailable',
      });
    })
  );
});
