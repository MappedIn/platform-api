# Mappedin Web SDK

Welcome to the Mappedin Web SDK. Please report any issues you find directly to your Mappedin technical contact.

Check out the [demo](examples/Demo), and the full [API docs](http://mappedin.github.io/platform-api/).

### Current Version
The current version of the Mappedin Web SDK is v1.41.6, and can be included in your application via script tag, like so:

```xml
<script src="https://d1p5cqqchvbqmy.cloudfront.net/websdk/v1.46.1/mappedin.js"></script>
```

## Getting Started

The Mappedin Web SDK provides a simple way to use all of the data stored in the Mappedin CMS. It consists of four main components:


1. **Venue**: The Mappedin.Venue object contains all of the data for a given Venue. All the communication with the Mappedin backend is handled for you, resulting in a single Venue object with all the data (locations, maps, categories, etc) ready and linked together.
1. **MapView:** This gives you a single, prebuilt component that handles displaying a fully 3D map (with an automatic 2D fallback) of your Venue. It features things like selectable polygons, wayfinding, 2D markers with auto layout, hover labels, and 3D text labels.
1. **Search**: Mappedin.Search gives you easy access to the powerful Mappedin Smart Search API. It provides a fast Suggestion API designed to provide real time autocomplete, and a powerful Search API for more detailed results.
1. **Analytics**: Mappedin.Analytics provides a few simple analytics calls that will improve the Search experience and provide Venue owners with data and key insights. You should call locationSelected when a user selects a location.


To get started, you need to add the latest version of mappedin.js to your project, which you can find above.

Then, when you are ready to show the map, call `Mappedin.initialize(options, container)`.

This takes a options object with all the configuration data the Mappedin SDK needs, and a container to put the MapView in, and returns a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) that will be resolved when the Venue data is downloaded and the other objects are created, or fail because of something like invalid credentials or a non-existent venue slug.

You'll probably do something like this:

```js
Mappedin.initialize(options, div).then(function (data) {
  mapView = data.mapview;
  venue = data.venue;
  search = data.search;

},function (error) {
  window.alert("Mappedin " + error);
});
```

There are a number of options you can specify for initialize. We'll break down each of the high level groups next:

```js
var options = {
  venue: venueOptions,
  mapview: mapviewOptions,
  search: searchOptions
}
```

### Venue options
This will be the most complicated set of options. It is here you specify your API key, secret, perspective, and "slug" for the Venue you want to download. If you don't know what those mean, ask your Mappedin representative.

You will also specify which fields you are interested in downloading for each Mappedin object. The Mappedin CMS is very flexible, and objects like Locations can have a lot of information stored on them, some of which is custom for your Venue, and not all of which needs to be downloaded by the user when they visit your web page. The Mappedin Web SDK will ensure it downloads the information it needs for itself (like the 3D or 2D files for your Map), and it's recommended to you only add the data you will actually use yourself to keep things snappy.

A typical venueOptions might look like this:
```js
var venueOptions = {
  clientId: "<Your API Key Here>",
  clientSecret: "<Your API Secret Here>",
  perspective: "Website",
  things: {
    venue: ['slug', 'name'],
    locations: ['name', 'type', 'description', 'icon', 'logo'],
    categories: ['name'],
    maps: ['name', 'elevation', 'shortName']
  },
  venue: "<Your venue slug here>"
};
```

### Mapview options
These are options used by the MapView during construction. All of these are optional, though you almost certainly want at least one of `onFirstMapLoaded` and `onDataLoaded`.

Yours might look something like this:
```js
var mapviewOptions = {
  antialias: "AUTO",
  mode: Mappedin.modes.TEST,
  onFirstMapLoaded: function () {
    console.log("First map fully loaded. No more pop in.");
  },
  onDataLoaded: function() {
    console.log("3D data loaded, map usable. Could hide loading screen here, but things will be popping in. Now you can do things that interact with the 3D scene");
    onDataLoaded();
  };
};
```
Antialias is on AUTO by default, which means it's on unless you are running a High DPI display (like a 4K screen). Antialiasing gets very expensive as resolution gets higher.

Mode is set to `Mappedin.modes.TEST` by default as well. This will perform the 3D test the first time your page is loaded, save the result in local storage, and then either load the 2D or 3D MapView and associated resources for you. You can set it to 'Mappedin.modes.FORCE' to force the test to re-run (useful if your device was very busy doing something else when the initial test ran, and failed the performance benchmark). You can also force the MapView directly into 2D or 3D with ''Mappedin.modes["2D"]' and ''Mappedin.modes["3D"]' respectively. 2D should always work, but note that not all device/browsers have the WebGL support needed for 3D mode, which may lead to an exception.

Most developers will leave the above settings at their default (and not even specify them), but you almost certainly want to set an `onDataLoaded` or `onFirstMapLoaded` callback. This will let you know when the MapView has entered into the various states of usability, from initalize's promise resolving, to onDataLoaded, to onFirstMapLoaded. Here's what each state means:

#### Mappedin.initlialize(options).then(success, failure)
When the promise from initialize is resolved successfully, you will have a fully populated Venue object, a 2D or 3D MapView that is on the page but likely empty, and a Search and Analytics object ready for use. At this point the user can start Searching, you can show location and category information in your UI, but the MapView is not ready to be used yet. Assets will stream in as it goes, but you may want to cover it with a loading screen.

#### onDataLoaded

This event is fired when the 3D files for the maps have been downloaded from the internet and processed. At this point you can add interactive polygons, label locations, highlight polygons, etc. You can do everything, and the map is fully interactive, but the textures and geometry may still be popping in. Hide your loading screen here if you want to minimize the "time to first interaction" for the user.

#### onFirstMapLoaded

This event is called when the first map is finished loading everything, definitely hide your loading screen now. All the geometry and textures will be there, and there will be no more pop in. Note that if you called labelAllLocations (or labeled individual polygons yourself) in onDataLoaded, this will also be done before onFirstMapLoaded is called. Those labels pop in over a number of frames to keep the UI snappy, so if you would prefer to show the user the map when the map itself is there but not wait for the labels to pop in, create them in this callback.

The time difference between onDataLoaded and onFirstMapLoaded will be fairly small on a high end PC, but could be quite substantial on a low end device (especially if you are calling labelAllLocations in onDataLoaded.) Our general recommendation is to either a) Hide the loading screen in onDataLoaded, or b) hide it in onFirstMapLoaded, but also start labeling you polygons at that point too. Waiting for the labels to pop in can take several seconds, and will not provide a good user experience.

### Setting up the MapView
As mentioned above, once you get the onDataLoaded callback the MapView is fully usable, and all function calls should work as expected. There are a few things you will typically want to do in this callback.

### Customize the colours
The MapView will use a nice selection of colors by default, but you probably have specific brand colours you would like to use for things like polygon selection and the path. Colours can generally be set in the function that uses them (so you can highlight one polygon with one colour, and another using a second), but for convenience you can change the defaults by setting the values in your MapView's `colors` object.

Here are the defaults for your reference:

```js
mapView.colors = {
  hover: 0xcccccc,
  select: 0x4ca1fc,
  text: 0x000000,
  path: 0xff834c,
  pathPulse: 0xffffff,
  textSelect: 0xffffff
};
```

#### Add Interactive Polygons
Both the 2D and 3D maps are made out of polygons. Some of them, like those representing a specific store, should be intractable by the user. They should be able to hover over them to know it's important, and click on them to select them for more details or wayfinding. Most polygons, however, will be things like the walls and floor. Things that are just decoration and should not be clickable at all. That's where `MapView.addInteractivePolygons` comes in.

There will probably be a convenience function to do this for you (similar to labelAllLocations, discussed below), but for now you will likely want to do something like this:

```js
var locations = venue.locations;
for (var j = 0, jLen = locations.length; j < jLen; ++j) {
  var location = locations[j];

  if (location.polygons.length > 0) {
    polygonedLocations.push(location);
  }

  var locationPolygons = location.polygons;
  for (var k = 0, kLen = locationPolygons.length; k < kLen; ++k) {
    var polygon = locationPolygons[k];
    mapView.addInteractivePolygon(polygon.id);
  };
};
```

This makes all polygons attached to a location clickable/hoverable. Without this, the map will not be very interactive.

#### Creating text labels
The Mappedin MapView makes it easy to add text labels directly to the scene in 3D. It also supports a hovering label banner, attached to the cursor, that is displayed when the user mouses over a specific polygon in 2D or 3D. This is done either with the `MapView.labelAllLocations` function, or directly with the `MapView.labelPolygon` function.

There are a number of options you can set to customize the look and feel of your labels. See the [documentation](http://mappedin.github.io/platform-api/classes/MapView.html#method-labelPolygon) for more details. For now, you probably want to just call MapView.labelAllLocations().

This will put a 3D Text Label, and a hover label, on each Polygon attached to a Location.

#### User Interaction
The user can hover over Interactive Polygons to get the hover effect, but nothing will happen when they are clicked until you set your MapView's onPolygonClicked property. This should be a function that takes a polygon ID, and returns false if no polygons below this one should get an onPolygonClicked event. This is the typical behaviour, but you may have a special case with, say, a food court polygon that overlaps individual restaurants.

This function will likely get more complicated once you have a UI for wayfinding, but by default you probably just want to clear any existing polygon highlighting, highlight this one, and perhaps focus in on it like so:

```js
function onPolygonClicked (polygonId) {
  mapView.clearAllPolygonColors();
  mapView.setPolygonColor(polygonId, mapView.colors.select);
  mapView.focusOnPolygon(polygonId, true);
  console.log(polygonId + " clicked");
  return false;
};
```

There is also an onNothingClicked event that is fired if nothing interactive is clicked on, or if your onPolygonClicked event returned true and there was nothing underneath it. This is a good opportunity to clear the UI up a bit:

```js
function onNothingClicked() {
  console.log("onNothingClicked");
  mapView.clearAllPolygonColors();
};
```

### Changing Maps
Most Venues will have more than one map, representing the different floors of a building. If there is a "default map" set for the Venue, that map will be loaded first. Otherwise, it's just the first one returned by the API.

Typically, maps in a multi-floor Venue will have an `elevation` property set. 0 or 1 will be the ground floor (depending on the Venue's convention) and the other maps can be sorted above and below using the elevation property. You probably want to construct some sort of map selector widget to let the user pick the map they are interested in. A simple dropdown might look something like this:

```js
var maps = venue.maps;
for (var m = 0, mLen = maps.length; m < mLen; ++m) {
  var map = maps[m];
  var mapId = map.id;
  var item = document.createElement("option");
  item.text = map.shortName;
  item.value = map.id;
  item.id = map.id;
  if (mapId == mapView.currentMap) {
    item.selected = true;
  };
  mapList.add(item);
};
```

As you can see, Maps tend to have a short name and a long name. Which you display to the user will depend on context, the Venue, and screen real estate.

To change maps, use `mapView.setMap(map, callback)`. This will replace the current map with the one you specify. It's worth noting that all of the MapView functions that accept Mappedin data can either take the object itself (the Map, Location, Node, etc from the Venue object) or just the Mappedin ID. This is especially useful when integrating with the Search API, which will return the ID but not the entire object. Avoid storing the ID outside the life of the Venue object, however, as if an object in the Mappedin CMS is destroyed and recreated with the same data, it will still have a different ID. Talk to Mappedin if you need something more durable to identify a specific resource.

The callback will be executed when the new map is fully loaded. The first time a Map is displayed, there will be a small delay as the 3D data is sent to the graphics card. Subsequent loads should be instantaneous, but for the first time you can consider a loading screen. When your callback fires, hide the loading screen.

### Wayfinding
The Mappedin Web SDK has built in wayfinding, with text directions and an animated, 3D path. You can navigate from a Node to another Node, or to a Location. This lets you go from a specific point on the map (ie, where the user is right now) to the closest entrance for their desired destination. This is especially useful for things that have multiple functionally identical locations throughout a venue, like Washrooms. Those are typically represented as a single location, with multiple entrances throughout the Venue. This makes it trivial to have a "Find nearest washroom" button.

To find directions, use the `directionsTo` function (there is a similar `directionsFrom`) on a Node, Polygon, or Location. This takes a destination, an options object indicating whether you want accessible directions or not (ie, don't take stairs and escalators) whether you want offline or the legacy online directions, and a callback for when the directions have been calculated and returned.

In your callback, if successful you will get a directions object with a path property you can pass to `mapView.drawPath()` and `mapView.focusOn()`.

```js
startNode.directionsTo(endNode, { accessible: false, directionsProvider: "offline" }, function(error, directions) {
  if (error || directions.path.length == 0) {
    // Some kind of network error, or those two points aren't connected, or are invalid
    return;
  };

  mapView.clearAllPolygonColors();
  setMap(startPolygon.map);

  mapView.setPolygonColor(startPolygon.id, mapView.colors.path);
  mapView.setPolygonColor(endPolygon.id, mapView.colors.select);

  mapView.focusOn(directions.path, [startPolygon, endPolygon], true, 2000);

  mapView.removeAllPaths();
  mapView.drawPath(directions.path);
});
```

When you call drawPath it will attempt to automatically handle breaking the path into multiple path segments and placing them on the correct map, animating them in sequence. You are responsible for placing any Markers to denote map transitions.

The directions engine will also return a set of text directions that you can display to the user. You may not need to, however, as most users understand where to go using only the animated 3D path.

### Focusing on Map Elements
You've already seen this in a few previous snippets, but it's worth a separate discussion. There will be many situations in which you would like to move the camera to draw attention to or provide a better view of certain map elements. Typically one or more nodes (either a specific point or a path), one or more polygons, or both. This is accomplished with the `mapView.focusOn(options)` function, or the more specific `focusOnPolygon` or `focusOnPath` (which just uses `focusOn` under the hood).

focusOn will take some nodes and/or polygons and animate the camera into the midpoint of them. By default, it will also change the zoom level (in or out) to fit all of those objects into the camera's field of view. It will not switch maps for you (and will actually ignore nodes and polygons not on the current map). This means you can safely pass in the entire path you get from a `directionsTo` call and not worry about which parts are on the current floor.

There are more advanced options in focusOn, including being able to set the animation duration and curve. See the docs for more details.

### 2D markers
The Mappedin SDK comes with a powerful set of 2D marker controls. You can create markers containing arbitrary HTML and anchor them directly to a node or polygon. They will stay the same size on screen as the user zooms in and out, and can automatically shuffle themselves so that there is no overlap with adjacent markers.

To create a marker, use the simple `mapView.createMarker` function.

```js
var marker = mapView.createMarker(markerString, mapView.getPositionNode(node.id), "", node.map);
```

 It will create a marker at the position use specified, with the HTML you supplied, and add it to the scene on map you specify. The position should be something you got from `mapView.getPositionNode` or `mapView.getPositionPolygon`. Trying to position something at arbitrary coordinates is not recommended at this time, as the underlying coordinate system is set to change.

 In a future beta release, there will be a more advanced Marker class that will let you do things like turn the collision avoidance off, or lock the marker to rotate with the camera, and have full control over when the marker is added to the MapView.

### Compass Rose
It's possible to attach the rotation of an arbitrary HTML element to that of the map (with some offset). This lets you add a compass rose (ie, a little arrow pointing north) to the scene. This is done with the `mapView.lockNorth(element, offset)`. For example:

```js
var compass = document.getElementById("compass");
mapView.lockNorth(compass);
```

### Offline Mode
The Mappedin Web SDK does not have offline support built in, but it can be enabled via a [Service Worker](https://developers.google.com/web/fundamentals/getting-started/primers/service-workers). Service Workers are a relatively new part of the web, and are not well supported on many browsers. However, modern versions of Chrome and Firefox do have support, making this an excellent tool when you are building your own standalone directory type application.

Check out the Mozilla docs for more information, but in brief Service Workers let you run your own JavaScript code to handle any network request from your page, and lets you provide your own response. There is an [example implementation in the demo](https://github.com/MappedIn/platform-api/blob/master/examples/Demo/service-worker.js) that should cover most use cases. It applies a cache fallback strategy: Any network requests are executed as they come in, and the results are saved in the cache and then returned to the app. If a network request fails (because of no internet access), the cached result is returned instead. This ensures you always have fresh data when you can access the network, but have a fallback option if you cannot.

This works because the Mappedin Web SDK (at least in 3D mode) downloads everything it needs ahead of time. When you call Mappedin.init, it starts the process, and when you get onDataLoaded, all the data the Web SDK needs has been downloaded and cached.

This strategy is designed to for the "mostly online" situation, where you generally have network access when needed, but there may be the occasional special case where, say, the power goes out and the kiosk application boots up before the network is back online. It is not designed to handle environments where the network is unreliable and going up and down during an update. For that situation, you could implement a strategy where you at each initialization you save to a new cache and if a network failure occurs before onDataLoaded is fired, you swap back to the old cache and re-init.

As touched on above, offline mode only works with 3D mode. The 2D fallback downloads tiles on the fly. We recommend simply using 3D mode, as it's quite able to run even on low end hardware, but you could also download the tiles ahead of time too. A bigger issue is that it will not automatically download any images attached to Mappedin objects (for example, icons and logos on Locations). This is because there are a number of possible sizes and you may or may not want to download any of them for your use case. If you do want them, just make sure you download them up front, and they will automatically be cached through the Service Worker. Smart Search and Analytics will not work while offline.
