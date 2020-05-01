Starter Sample
-----------

This simple sample application shows you how to use a few of the key features of the Mappedin Web SDK.

To get you started we've provided a key and secret that has access to some demo venues. Input your own Mappedin Key, Secret, and Venue ID in index.js to load your own Mappedin data. Then, start an HTTP server in this directory, and open index.html.

The sample shows you how to set up the MapView object with the data from your Venue. It also sets up some typical behaviour like adding text labels to all locations, and making their polygons clickable/hoverable.

If you would like to see wayfinding in action, uncomment this line in `onDataLoaded`:
```
	// Shows off the pathing
	// drawRandomPath()
```

This will draw a path between two random locations every few seconds.

There is also an option for offline mode via a Service Worker. Uncomment the lines near ```// Start up the mapview```
