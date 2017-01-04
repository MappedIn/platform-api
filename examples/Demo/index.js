var mapView
var venue
var search

// For the demo animation
var polygonedLocations = []

var mapList = document.getElementById("mapList")
var canvas = document.getElementById( 'mapView' );

// options for Mappedin.getVenue
// You will need to customize this with the data provided by Mappedin. Ask your representative if you don't have a key, secret, and slug.
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

// Options for the MapView constructor
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

function onPolygonClicked (polygonId) {
	mapView.clearAllPolygonColors()
	mapView.setPolygonColor(polygonId, mapView.colors.select)
	mapView.focusOnPolygon(polygonId, true)
	console.log(polygonId + " clicked")
	return false
}

function onNothingClicked() {
	console.log("onNothingClicked")
	mapView.clearAllPolygonColors()
}

// Changes the map and updates the Map List
function setMap(map) {
	mapList.selectedIndex = mapList.namedItem(map).index
	mapView.setMap(map)
}

// Changes the map in response to a Map List selection
function changeMap() {
	mapView.setMap(mapList.value, function () {
		console.log("Map changed to " + mapList.value)
	})
}

// Convenience function to help us get random array items
function getRandomInArray(array) {
	return array[Math.floor(Math.random() * array.length)]
}

// Draws a random path, highlighting the locations and focusing on the path and polygons
function drawRandomPath() {
	var startLocation = getRandomInArray(polygonedLocations)
	var startPolygon = getRandomInArray(startLocation.polygons)
	var startNode = getRandomInArray(startPolygon.entrances)

	var endLocation = getRandomInArray(polygonedLocations)
	var endPolygon = getRandomInArray(endLocation.polygons)
	var endNode = getRandomInArray(endPolygon.entrances)

	startNode.directionsTo(endNode, null, function(error, directions) {
		if (error || directions.path.length == 0) {
			drawRandomPath()
			return
		}

		mapView.clearAllPolygonColors()
		setMap(startPolygon.map)

		mapView.setPolygonColor(startPolygon.id, mapView.colors.path)
		mapView.setPolygonColor(endPolygon.id, mapView.colors.select)

		mapView.focusOnPath(directions.path, [startPolygon, endPolygon], true, 2000)

		mapView.removeAllPaths()
		mapView.drawPath(directions.path)
	})
}

// This is your main function. It talks to the mappedin API and sets everything up for you
Mappedin.initialize(options, div).then(function (data) {
	mapView = data.mapview
	venue = data.venue
	search = data.search

},function (error) {
	window.alert("Mappedin " + error)
})

function onDataLoaded() {

	mapView.onPolygonClicked = onPolygonClicked
	mapView.onNothingClicked = onNothingClicked
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
	var maps = venue.maps;
	for (var m = 0, mLen = maps.length; m < mLen; ++m) {
		var map = maps[m];
		var mapId = map.id;
		var item = document.createElement("option")
		item.text = map.shortName
		item.value = map.id
		item.id = map.id
		if (mapId == mapView.currentMap) {
			item.selected = true
		}
		mapList.add(item)
	}

	// Shows off the pathing
	// drawRandomPath()
	// window.setInterval(drawRandomPath, 9000)

	mapView.labelAllLocations()
}

mapList.addEventListener("change", changeMap)