var mapView
var venue
var search
var analytics

// For the demo animation
var polygonedLocations = []

// Track which polygon belongs to which location
var locationsByPolygon = {}

var mapList = document.getElementById("mapList")
var mapsSortedByElevation = []
var div = document.getElementById( 'mapView' )
var mapExpanded = false

// options for Mappedin.getVenue
// You will need to customize this with the data provided by Mappedin. Ask your representative if you don't have a key, secret, and slug.
var venueOptions = {
	clientId: "<Your API Key Here>",
	clientSecret: "<Your API Secret Here>",
	perspective: "Website",
	things: {
		venue: ['slug', 'name'],
		locations: ['name', 'type', 'description', 'icon', 'logo', 'sortOrder'],
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
	var location = locationsByPolygon[polygonId]
	if (location != null) {
		console.log(location.name + " was selected.")
		analytics.locationSelected(location)
	}
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

// Returns list of maps used in directions, sorted by elevation
function getMapsInJourney(directions) {
	var uniqueMapHash = {}
	directions.directions.forEach((direction) => {
		uniqueMapHash[direction.node.map] = true
	})
	var mapIds = new Array();
	for (var key in uniqueMapHash) {
	  mapIds.push(key);
	}
	var sortedMapIds = mapsSortedByElevation.filter(map => mapIds.indexOf(map.id) !== -1)
	return sortedMapIds
}

// Expands map to show multiple floors and draws path, then draws a new path in 9000 miliseconds
function drawMultiFloorPath(directions, startPolygon, endPolygon) {
	var mapsInJourney = getMapsInJourney(directions)
	mapView.expandMaps(mapsInJourney.map(map => map.id), { focus: true, debug: false, rotation: 0, duration: 600 })
		.then(() => {
			mapView.setPolygonColor(startPolygon.id, mapView.colors.path)
			mapView.setPolygonColor(endPolygon.id, mapView.colors.select)
			mapView.drawPath(directions.path, {
				drawConnectionSegments: true,
				connectionPathOptions: {
					color: mapView.colors.path
				}})
			mapExpanded = true
		})
		.then(() => new Promise((resolve) => setTimeout(resolve, 100)))
		.then(() => {
			drawRandomPath()
		})
		.catch(e => {console.log(e)})
}

// Draws path on single floor and then draws a new path in 9000 miliseconds
function drawSingleFloorPath(directions, startPolygon, endPolygon) {
	setMap(startPolygon.map)

	mapView.setPolygonColor(startPolygon.id, mapView.colors.path)
	mapView.setPolygonColor(endPolygon.id, mapView.colors.select)

	mapView.focusOnPath(directions.path, [startPolygon, endPolygon], true, 2000)

	mapView.drawPath(directions.path)
	new Promise((resolve) => setTimeout(resolve, 100))
		.then(() => {
			drawRandomPath()
		})
		.catch(e => {console.log(e)})
}

// Draws a random path, highlighting the locations and focusing on the path and polygons
function drawRandomPath() {
	console.log(polygonedLocations);
	var startLocation = getRandomInArray(polygonedLocations)
	var startPolygon = getRandomInArray(startLocation.polygons)
	var startNode = getRandomInArray(startPolygon.entrances);

	var endLocation = getRandomInArray(polygonedLocations)
	var endPolygon = getRandomInArray(endLocation.polygons)
	var endNode = getRandomInArray(endPolygon.entrances);



	startNode.directionsTo(endNode, null, function(error, directions) {
		if (error || directions.path.length == 0) {
			drawRandomPath()
			return
		}

		mapView.clearAllPolygonColors()
		mapView.removeAllPaths()

		if (startPolygon.map != endPolygon.map) {
			if (mapExpanded) {
				mapView.contractMaps({ focus: true, duration: 50 })
				.then(() => {
					drawMultiFloorPath(directions, startPolygon, endPolygon)
				})
			} else {
				drawMultiFloorPath(directions, startPolygon, endPolygon)
			}
		} else {
			if (mapExpanded) {
				mapView.contractMaps({ focus: true, duration: 50 })
				.then(() => {
					mapExpanded = false
					drawSingleFloorPath(directions, startPolygon, endPolygon)
				})
			} else {
				drawSingleFloorPath(directions, startPolygon, endPolygon)
			}
		}
	});
}

// This is your main function. It talks to the mappedin API and sets everything up for you
function init() {

	Mappedin.initialize(options, div).then(function (data) {
		mapView = data.mapview
		venue = data.venue
		search = data.search
		analytics = data.analytics

	},function (error) {
		window.alert("Mappedin " + error)
	})
}

function onDataLoaded() {
	mapView.onPolygonClicked = onPolygonClicked
	mapView.onNothingClicked = onNothingClicked
	var locationsWithNoEntrancesMap = {};
	var locationsMap = {};
	var locations = venue.locations;
	for (var j = 0, jLen = locations.length; j < jLen; j++) {
		var location = locations[j];

		if (location.polygons.length > 0) {
			locationsMap[location.id] = location;
		}
			var locationPolygons = location.polygons;


			for (var k = 0, kLen = locationPolygons.length; k < kLen; ++k) {
				var polygon = locationPolygons[k];
				
				
				//Find the locations which have atleast one polygon with no entrances
				if (polygon.entrances.length === 0){
					locationsWithNoEntrancesMap[location.id] = location;
				}
				
				mapView.addInteractivePolygon(polygon.id)
				// A polygon may be attached to more than one location. If that is the case for your venue,
				// you will need some way of determinng which is the "primary" location when it's clicked on.
				var oldLocation = locationsByPolygon[polygon.id]
				if (oldLocation == null || oldLocation.sortOrder > location.sortOrder) {
					locationsByPolygon[polygon.id] = location
				}
			}
		
	}
	//Comparison between locationMap and locationWithNoEntrancesMap to delete the locations which 
	//contain atleast one polygon with no entrances
	for (let locationId in locationsWithNoEntrancesMap){
		delete locationsMap[locationId];
	}
	//Convert the Object that contains the locations with entrances to an array of location objects
	polygonedLocations = Object.keys(locationsMap)
								  	.map(locationId=>locationsMap[locationId]);

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
	mapsSortedByElevation = venue.maps.sort((a, b) => b.elevation - a.elevation);

	// Shows off the pathing
	drawRandomPath()

	mapView.labelAllLocations({
		excludeTypes: [] // If there are certain Location types you don't want to have labels (like amenities), exclude them here)
	})
}

// Start up the mapview

// Uncomment the service worker stuff for an offline fallback. Only works on very modern browsers, but it should fail gracefully.
// This uses the Service Workers API, and relies on the fact that the MapView downloads everything it needs ahead of time.
// Directions, search, and analytics will not function offline, and any images from the Mappedin platform (logos, etc)
// that aren't baked into the map will not be downloaded automatically, you should make sure you do that in init.
// This is really for a kiosk type application.

// if ('serviceWorker' in navigator) {
// 	window.addEventListener('load', function() {
// 		navigator.serviceWorker.register('service-worker.js').then(function(registration) {
// 			// Registration was successful
//     	  	console.log('ServiceWorker registration successful with scope: ', registration.scope);
//       		init();
// 		}).catch(function(err) {
// 			// registration failed :(
// 			console.log('ServiceWorker registration failed: ', err);
// 			init();
// 		});
// 	})
// } else {
	// Otherwise, just init
	init();
// }

mapList.addEventListener("change", changeMap)
