var mapsSortedByElevation = []
var div = document.getElementById( 'mapView' )
var mapExpanded = false

// options for Mappedin.getVenue
// To get you started we've provided a key and secret that has access to some demo venues.
//  - mappedin-demo-mall
//  - mappedin-demo-retail-2
// Speak with a Mappedin representative when you are ready to get your own key and secret set up with access to your own venues.
// You may need to customize these options with the data provided by Mappedin for your venue.
var venueOptions = {
	clientId: "5eab30aa91b055001a68e996",
	clientSecret: "RJyRXKcryCMy4erZqqCbuB1NbR66QTGNXVE0x3Pg6oCIlUR1",
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
