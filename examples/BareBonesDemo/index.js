var mapsSortedByElevation = []
var div = document.getElementById( 'mapView' )
var mapExpanded = false

// options for Mappedin.getVenue
// You will need to customize this with the data provided by Mappedin. Ask your representative if you don't have a key, secret, and slug.
var venueOptions = {
	clientId: "phie0deebuh6UTh7Eebae3xiek9Yaen5",
	clientSecret: "Thu0of5aiz8WooWo",
	perspective: "Website",
	things: {
		venue: ['slug', 'name'],
		locations: ['name', 'type', 'description', 'icon', 'logo', 'sortOrder'],
		categories: ['name'],
		maps: ['name', 'elevation', 'shortName']
	},
	venue: "mappedin-demo-mall"
};

// Options for the MapView constructor
var mapviewOptions = {
	antialias: "AUTO",
	mode: Mappedin.modes.TEST,
};

// Options for search
var searchOptions = {
	key: "",
	secret: ""
}

// Combined all of them to use Mappedin.initalize
var options = {
	mapview: mapviewOptions,
	venue: venueOptions,
	search: searchOptions
}

Mappedin.initialize(options, div);
