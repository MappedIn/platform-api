MappedIn.Venue = function(venueId, loaded) {

	this.polygons = {}
	this.nodes = {}
	this.maps = {}
	this.locations = {}
	this.categories = {}
	this.venue = {}

	this.venueId = venueId
	this.loaded = loaded
	this.numAPICalls = 6

	MappedIn.api.Get('venue', {slug: venueId}, this.loadVenue.bind(this))
	MappedIn.api.Get('node', {venue: venueId}, this.loadNodes.bind(this))
	MappedIn.api.Get('polygon', {venue: venueId}, this.loadPolygons.bind(this))
	MappedIn.api.Get('location', {venue: venueId}, this.loadLocations.bind(this))
	MappedIn.api.Get('category', {venue: venueId}, this.loadCategories.bind(this))
	MappedIn.api.Get('map', {venue: venueId}, this.loadMaps.bind(this))
}


// Make all this better
MappedIn.Venue.prototype.loadVenue = function(results) {
	this.venue = results[0]
	this.initPostAPI()
}

MappedIn.Venue.prototype.loadNodes = function(results) {
	for (var node of results) {
		this.nodes[node.id] = node
	}
	this.initPostAPI()
}

MappedIn.Venue.prototype.loadPolygons = function(results) {
	for (var polygon of results) {
		this.polygons[polygon.id] = polygon
	}
	this.initPostAPI()
}

MappedIn.Venue.prototype.loadLocations = function(results) {
	for (var location of results) {
		this.locations[location.id] = location
	}
	this.initPostAPI()
}

MappedIn.Venue.prototype.loadCategories = function(results) {
	for (var category of results) {
		this.categories[category.id] = category
	}
	this.initPostAPI()
}

MappedIn.Venue.prototype.loadMaps = function(results) {
	results.sort(function (a, b) {
		return a.elevation - b.elevation
	})

	for (var map of results) {
		this.maps[map.id] = map
	}
	this.initPostAPI()
}

// Simple, but doesn't have any kind of error handling.
MappedIn.Venue.prototype.initPostAPI = function () {
	this.numAPICalls--
	if (this.numAPICalls > 0) {
		return
	}
	this.loaded()
}