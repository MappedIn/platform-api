# Mappedin Web SDK

Welcome to the Mappedin Web SDK Beta. The SDK is pretty stable (and is being used in production environments), but it's possible there will be breaking changes before official launch based on partner feedback, and there will definitely be new features, bug fixes and improvements added. Please report any issues you find directly to your Mappedin technical contact.

A comprehensive tutorial will be available soon, but you can see a working demo [here](examples/Demo), and read the [API docs](http://mappedin.github.io/platform-api/).

### Current Version
The current version of the Mappedin Web SDK is v1.8.2, and can be included in your application via script tag, like so:

```
  <script src="https://d1p5cqqchvbqmy.cloudfront.net/websdk/v1.8.2/mappedin.js"></script>
```

## Getting Started

The Mappedin Web SDK provides a simple way to use all of the data stored in the Mappedin CMS. It consists of four main components:
	1) **Venue**: The Mappedin.Venue object contains all of the data for a given Venue. All the communication with the Mappedin backend is handled for you, resulting in a single Venue object with all the data (locations, maps, categories, etc) ready and linked together.
	1) **MapView:** This gives you a single, prebuilt component that handles displaying a fully 3D map (with an automatic 2D fallback) of your Venue. It features things like selectable polygons, wayfinding, 2D markers with auto layout, hover labels, and 3D text labels.
	1) **Search**: Mappedin.Search gives you easy access to the powerful Mappedin Smart Search API. It provides a fast Suggestion API designed to provide real time autocomplete, and a powerful Search API for more detailed results.
	1) **Analytics**: Mappedin.Analytics provides a few simple analytics calls that will improve the Search experience and provide Venue owners with data and key insights. You should call locationSelected when a user selects a location.

To get started, you need to add the latest version of mappedin.js to your project:

```
  <script src="https://d1p5cqqchvbqmy.cloudfront.net/websdk/v1.8.2/mappedin.js"></script>
```

Then, when you are ready to show the map, call `Mappedin.initialize(options, container)`.

This takes a options object with all the configuration data the Mappedin SDK needs, and a container to put the MapView in, and returns a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) that will be resolved when the Venue data is downloaded and the other objects are created, or fail because of something like invalid credentials or a non-existant venue slug.

You'll probably do something like this: 

```
Mappedin.initialize(options, div).then(function (data) {
	mapView = data.mapview
	venue = data.venue
	search = data.search

},function (error) {
	window.alert("Mappedin " + error)
})
```

There are a number of options you can specify for initialize. We'll break down each of the high level groups next:

```
  var options = {
    venue: venueOptions,
    mapview: mapviewOptions,
    search: searchOptions
  }
 ```

### Venue options
This will be the most complicated set of options. It is here you specify your API key, secret, perspective, and "slug" for the Venue you want to download. If you don't know what those mean, ask your Mappedin representative.

You will also specify which fields you are interested in downloading for each Mappedin object. The Mappedin CMS is very flexible, and objects like Locations can have a lot of information stored on them, some of which is custom for your Venue, and not all of which needs to be downloaded by the user when they visit your web page. The Mappedin Web SDK will ensure it downloads the information it needs for itself (like the 3D or 2D files for your Map), and it's recommended to you only add the data you will actually use yourself to keep things snappy.

You can find out about what types of properties will be available from your Mappedin representative, or inspect the data yourself through our [JSON API](blob/v1.md) (this should only be used for testing purposes, as the API is not guaranteed to remain stable).

A typical venueOptions might look like this:
```
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
```
var mapviewOptions = {
	antialias: "AUTO",
	mode: Mappedin.modes.TEST,
	onFirstMapLoaded: function () {
		console.log("First map fully loaded. No more pop in.");
	},
	onDataLoaded: function() {
		console.log("3D data loaded, map usable. Could hide loading screen here, but things will be popping in. Now you can do things that interact with the 3D scene")
		onDataLoaded()
	}
};
```
Antialias is on AUTO by default, which means it's on unless you are running a High DPI display (like a 4K screen). Antialiasing gets very expensive as resolution gets higher.

Mode is set to `Mappedin.modes.TEST` by default as well. This will perform the 3D test the first time your page is loaded, save the result in local storage, and then either load the 2D or 3D MapView and associated resources for you. You can set it to 'Mappedin.modes.FORCE' to force the test to re-run (useful if your device was very busy doing something else when the initial test ran, and failed the performance benchmark). You can also force the MapView directly into 2D or 3D with ''Mappedin.modes["2D"]' and ''Mappedin.modes["3D"]' respectively. 2D should always work, but note that not all device/browsers have the WebGL support needed for 3D mode, which may lead to an exception.

Most developers will leave the above settings at their default (and not even specify them), but you almost certainly want to set an `onDataLoaded` or `onFirstMapLoaded` callback. This will let you know when the MapView has entered into the various states of usability, from the initalize's promise resolving, to onDataLoaded, to onFirstMapLoaded. Here's what each state means:

#### Mappedin.initlialize(options).then(success, failure)
When the promise from initialize is resolved successfully, you will have a fully populated Venue object, a 2D or 3D MapView that is on the page but likely empty, and a Search and Analytics object ready for use. At this point the user can start Searching, you can show location and category information in your UI, but the MapView is not ready to be used yet. Assets will stream in as it goes, but you may want to cover it with a loading screen.

#### onDataLoaded

This event is fired when the 3D files for the maps have been downloaded from the internet and processed. At this point you can add interactive polygons, label locations, highlight polygons, etc. You can do everything, and the map is fully interactive, but the textures and geometery may still be popping in. Hide your loading screen here if you want to minimize the "time to first interaction" for the user.

#### onFirstMapLoaded

This event is called when the first map is finished loading everything, definitely hide your loading screen now. All the geometery and textures will be there, and there will be no more pop in. Note that if you called labelAllLocations (or labeled individual polygons yourself) in onDataLoaded, this will also be done before onFirstMapLoaded is called. Those labels pop in over a number of frames to keep the UI snappy, so if you would prefer to show the user the map when the map itself is there but not wait for the labels to pop in, create them in this callback.

The time difference between onDataLoaded and onFirstMapLoaded will be fairly small on a high end PC, but could be quite substatial on a low end device (especially if you are calling labelAllLocations in onDataLoaded.) Our general recommendation is to either a) Hide the loading screen in onDataLoaded, or b) hide it in onFirstMapLoaded, but also start labeling you polygons at that point too. Waiting for the labels to pop in can take several seconds, and will not provide a good user experience.

### Setting up the MapView
As mentioned above, once you get the onDataLoaded callback the MapView is fully usable, and all function calls should work as expected. There are a few things you will typically want to do in this callback.

### Customize the colours
The MapView will use a nice selection of colors by default, but you probably have specific brand colours you would like to use for things like polygon selection and the path. Colours can generally be set in the function that uses them (so you can highlight one polygon with one colour, and another using a second), but for convenience you can change the defaults by setting the values in your MapView's `colors` object.

Here are the defaults for your reference:

```
	mapView.colors = {
		hover: 0xcccccc,
		select: 0x4ca1fc,
		text: 0x000000,
		path: 0xff834c,
		pathPulse: 0xffffff,
		textSelect: 0xffffff
	}
```

#### Add Interactive Polygons
Both the 2D and 3D maps are made out of polygons. Some of them, like those representing a specific store, should be interactable by the user. They should be able to hover over them to know it's important, and click on them to select them for more details or wayfinding. Most polygons, however, will be things like the walls and floor. Things that are just decoration and should not be clickable at all. That's where `MapView.addInteractivePolygons` comes in.

There will probably be a convenience function to do this for you (similar to labelAllLocations, discussed below), but for now you will likely want to do something like this:

```
	var locations = venue.locations;
	for (var j = 0, jLen = locations.length; j < jLen; ++j) {
		var location = locations[j];

		if (location.polygons.length > 0) {
			polygonedLocations.push(location)
		}

		var locationPolygons = location.polygons;
		for (var k = 0, kLen = locationPolygons.length; k < kLen; ++k) {
			var polygon = locationPolygons[k];
			mapView.addInteractivePolygon(polygon.id)
		}
	}
```

This makes all polygons attached to a location clickable/hoverable. Without this, the map will not be very interactive.

#### Creating text labels
The Mappedin MapView makes it easy to add text labels directly to the scene in 3D. It also supports a hovering label banner, attached to the cursor, that is displayed when the user mouses over a specific polygon in 2D or 3D. This is done either with the `MapView.labelAllLocations` function, or directly with the `MapView.labelPolygon` function.

There are a number of options you can set to customize the look and feel of your labels. See the [documentation](http://mappedin.github.io/platform-api/classes/MapView.html#method-labelPolygon) for more details. For now, you probably want to just call MapView.labelAllLocations().

This will put a 3D Text Label, and a hover label, on each Polygon attached to a Location.

#### User Interaction
The user can hover over Interactive Polygons to get the hover effect, but nothing will happen when they are clicked until you set your MapView's onPolygonClicked property. This should be a function that takes a polygon ID, and returns false if no polygons below this one should get an onPolygonClicked event. This is the typical behaviour, but you may have a special case with, say, a food court polygon that overlaps individial resaurants.

This function will likely get more complicated once you have a UI for wayfinding, but by default you probably just want to clear any existing polygon highlighting, highlight this one, and perhaps focus in on it like so:

```
function onPolygonClicked (polygonId) {
	mapView.clearAllPolygonColors()
	mapView.setPolygonColor(polygonId, mapView.colors.select)
	mapView.focusOnPolygon(polygonId, true)
	console.log(polygonId + " clicked")
	return false
}
```

There is also an onNothingClicked event that is fired if nothing interactive is clicked on, or if your onPolygonClicked event returned true and there was nothing underneath it. This is a good opprunity to clear the UI up a bit:

```
function onNothingClicked() {
	console.log("onNothingClicked")
	mapView.clearAllPolygonColors()
}

```

### Changing Maps