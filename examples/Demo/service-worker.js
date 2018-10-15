/**
	Offline fallback service worker

	This service worker is designed for offline fallback mode. If you have a network connection at all, it will get the most recent data and use that. If the network is unavailable, it will use the last downloaded version.
	It has special logic to handle the paging behaviour from the Mappedin API, as a workaround for a weird bug with XHR and Service Workers where "unsafe" headers are available in fetch but not XHR.

	NOTE: Using this with the Mappedin Web SDK will ensure all the resources the SDK needs are available (since it downloads everything up front), but if you want icons/logos/images from Location objects you will need to ensure your app also
	tries to download them up front as well. If you do, they will be automatically cached.

	NOTE2: This will cache all network traffic (which could give you offline support for free for other parts of your app) If you want to limit it to only traffic for the SDK you will have structure your app so the Mappedin
	code lives in it's own folder, and you register the service worker to only handle requests from things in that folder. Read about Service Workers for more details.
 */

var CACHE = 'mappedin-sdk';

// Start the service worker right away. You can also cache specific files ahead of time, but the Mappedin SDK doesn't need to do this.
self.addEventListener('install', function(event) {
	console.log("Service worker for " + CACHE + " is being installed.");

	// Start the service worker right away
	event.waitUntil(self.skipWaiting())
});

self.addEventListener('activate', function (event){
	console.log("Service worker for " + CACHE + " activated.")

	// Just take over the old service worker, if present
	event.waitUntil(self.clients.claim())
})

// Intercept all HTTPS GET requests
self.addEventListener('fetch', function(event) {

	if (event.request.method !== 'GET' || !event.request.url.startsWith("https")) {
		return event.respondWith(fetch(event.request))
	}

	// Try network and if it fails, go for the cached copy.
	event.respondWith(fromNetwork(event.request))
});

// Get the data from the network if available, otherwise fall back with the cache
function fromNetwork(request) {
	return new Promise(function (fulfill, reject) {
		var fetchRequest = request.clone();
		// Handle legacy pagination special case due to weird XHR/Service Worker conflict
		// We should be able to remove this in a few months.
		if (request.url.includes("mappedin.com")) {
			getNextLink(request).then( function (data) {

				var headerOptions = {}
				for (var key of request.headers.keys()) {
					headerOptions[key] = request.headers.get(key)
				}
				var responseInit = {
					status: data.response.status,
					statusText: data.response.statusText,
					headers: headerOptions
				}
				var newResponse = new Response(data.body, responseInit)
				update(fetchRequest, newResponse.clone())
				fulfill(newResponse)
			}, function (response) {
				fulfill(fromCache(fetchRequest))
			})
		// Normal case. Fetch from network and update cache, or fulfill from cache if network error
		} else {
			fetch(request).then(function (response) {
				update(fetchRequest, response.clone())
				var fetchResponse = response

				fulfill(fetchResponse);
			}, function(response) {
				fulfill(fromCache(fetchRequest))
			});
		}
	});
}

// Handles Mappedin pagination by combining all the pages together and returing a single response.
// Should be removable in a few months
function getNextLink(request) {
	return new Promise(function (resolve, reject) {
		if (request) {
			fetch(request).then(function (response) {
				response.text().then(function (body) {
					// New request with the same headers
					var link = parseNextLink(response.headers.get("link"))
					if (link == null) {
						resolve({body: body, response: response})
					} else {
						var init = {
							method: request.method,
							headers: request.headers,
							mode: 'cors',
							credentials: request.credentials,
							redirect: 'manual'   // let browser handle redirects
						}

						// Get the next array and concat them into one big array
						getNextLink(new Request(link, init)).then(function (nextLink) {
							resolve({
								body: body.slice(0, -1) + ", " + nextLink.body.slice(1),
								response: response
							})
						})
					}
				})
			}, function(response) {
				reject()
			})
		} else {
			resolve({ body: "[]", response: null})
		}
	})
}

// Parse the link header into the next URL to grab data from, for pagination
function parseNextLink(linkHeader) {
	if (!linkHeader) {
		return null;
	}
	var linkValues = linkHeader.replace(/,\s*</g, ',\0<').split('\0');
	for (var i = 0, iLen = linkValues.length; i < iLen; ++i) {
		var linkValue = linkValues[i];
		var linkValueMatch = /^\s*<(.+)>\s*;/.exec(linkValue);
		if (!linkValueMatch) {
			continue;
	 	}
		var uriReference = linkValueMatch[1];
		var linkParamsStartIndex = linkValueMatch.index + linkValueMatch[0].length;
		var linkParams = linkValue.slice(linkParamsStartIndex).split(';');
		for (var j = 0, jLen = linkParams.length; j < jLen; ++j) {
			var linkParam = linkParams[j];
			var linkParamMatch = /^\s*(.+)\s*=\s*"?([^"]+)"?\s*$/.exec(linkParam);
			if (!linkParamMatch) {
				continue;
			}
			var parmname = linkParamMatch[1];
			var ptoken = linkParamMatch[2];
			if (parmname === 'rel' && ptoken === 'next') {
				return uriReference;
			}
	  	}
	}
	return null;
}

// Open the cache and pull the stored request out from the last time it was downloaded
function fromCache(request) {
	return caches.open(CACHE).then(function (cache) {
		return cache.match(request).then(function (matching) {
			return matching;
		});
	});
}


// Whenever we get a response from the network, cache it for next time.
// Don't cache it if it's a bad response.
function update(request, response) {
	if(!response || response.status !== 200) {
		return response;
	}
	return caches.open(CACHE).then(function (cache) {
		return cache.put(request, response).then(function () {
			return response;
		});
	});
}
