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

This takes a options object with all the configuration data the Mappedin SDK needs, and a container to put the MapView in, and returns a Promise that will be resolved when the Venue data is downloaded and the other objects are created. Let's look at the options first. There will be a few:

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
Antialias is on AUTO by default, which means it's on unless you are running a High DPI display (like a 4K screen).

`onFirstMapLoaded`
