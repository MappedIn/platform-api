Simple Demo
-----------

This simple demo application shows you how to use a few of the key features of the Mappedin Web SDK.

Before you load it the first time, you will need to edit index.js and input your Mappedin Key, Secret, and Venue ID. Then, start an HTTP server in this directory, and open index.html.

The demo shows you how to set up the MapView object with the data from your Venue. It also sets up some typical behaviour like adding text labels to all locations, and making their polygons clickable/hoverable.

If you would like to see wayfinding in action, uncomment these lines in `onDataLoaded`:
```
	// Shows off the pathing
	// drawRandomPath()
	// window.setInterval(drawRandomPath, 9000)
```

This will draw a path between two random locations every few seconds.

There is also an option for offline mode via a Service Worker. Uncomment the lines near ```// Start up the mapview```
