var colors = {
	hover: 0xcccccc, //0xFFCCFF, //0xcc95cc, //0xb2d7fe, //0xcccccc,
	select: 0x4ca1fc, //0x8C0047, //
	backgroundColor: 0xffffff,
	text: 0x00000
}

var fields = {
	venue: "slug,name",
	node: "map,x,y,paths",
	polygon: "map,vertexes,entrances,geometry",
	location: "name,type,description,icon,logo,nodes,polygons,categories",
	category: "name",
	map: "name,elevation,height,width,shortName,scene"
}

// Set Three.js scene
var venue

var venueId
var mapView
var cavas

// var numAPICalls = 6

// This doesn't handle errors at all right now
function init(venueId) {

	//venue = new MappedIn.Venue(venueId, initPostVenueLoaded)
	MappedIn.loadVenue(venueId, fields).then(initPostVenueLoaded)
}

function initPostVenueLoaded(error, result) {

	// If you get an error, the venue didn't load. Up to you to handle this gracefully.
	if (error) {
		console.log(error)
		return
	} 
	venue = result
	canvas = document.getElementById( 'mapView' );
	mapView = new MappedIn.MapView(canvas, venue, initPostMapLoaded)

}

function initPostMapLoaded() {

	// mapView.onPolygonClick = function (polygon) {
	// 	for (locationId of Object.keys(venue.locations)) {
	// 		var location = venue.locations[locationId]
	// 		for (polygonId of location.polygons) {
	// 			if (polygonId.id == polygon.name) {
	// 				console.log(location.name)
	// 			}
	// 		}
	// 	} 
	// }
	var drawLabels = false

	var testLocations = []

	var i = 0
	for (locationId of Object.keys(venue.locations)) {
		var location = venue.locations[locationId]

		if (drawLabels || testLocations.indexOf(location.name) >= 0) {
			mapView.displayTitle(location)
		}
		for (polygon of location.polygons) {
			var position = mapView.getPositionPolygon(polygon.id)
			if (position) {
				//mapView.createMarker(location.name, position, "location-label")
			}
		}
		i++
		if (i > 5) {
			//break
		}	
	}

}


