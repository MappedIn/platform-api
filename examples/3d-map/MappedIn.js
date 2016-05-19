var MappedIn = MappedIn || {}

MappedIn.token = {}

// We will be using MappedIn API V1
MappedIn.host = {
	auth: 'https://auth.mappedin.com',
	api: 'https://api.mappedin.com/1/'
}

// Our main API object for requesting data from MappedIn
MappedIn.api = {
	Get: function(asset, data) {
		var headers = {"Authorization": MappedIn.token.token_type + ' ' + MappedIn.token.access_token}

		var url = MappedIn.host.api + asset;
		var p = new promise.Promise()
		var objects = []; 

		// Note: this function is for illustration purposes only. It is not robust
		// and it assumes absolute URLs.
		function getNextLink(headerValue) {
			if (headerValue == null) {
				return null
			}
			var links = headerValue.split(',');
			for (var i = 0, len = links.length; i < len; ++i) {
				var link = links[i];
				if (link.indexOf('rel="next"') !== -1) {
					return link.slice(link.indexOf('<') + 1, link.indexOf('>'));
				}
			}
		}

		function handleResponse(error, response, xhr) {
			if (error) {
				p.done(error, objects)
				return
			}
			var data = JSON.parse(response)
			if (Array.isArray(data) && Array.isArray(objects)) {
				for (var i = 0, len = data.length; i < len; ++i) {
					objects.push(data[i]);
				}
			} else {
				objects = data;
			}

			var linkHeader = xhr.getResponseHeader('Link');

			var nextLink = getNextLink(linkHeader);
	 		if (nextLink) {
	 			promise.get(nextLink, null, headers).then(handleResponse)
	 		} else {
	 			p.done(null, objects)
	 			return
	 		}

		}

		promise.get(url, data, headers).then(handleResponse)
		return p
	}
}

MappedIn.loadVenue = function(slug, fields) {
	var venue = new MappedIn.Venue(slug)
	var scope = this

	var p = new promise.Promise()

	if (fields == null) {
		p.done(new ReferenceError("'fields' argument cannot be blank. You must specify precisely the fields you wish to use for venue, nodes, polygons, locations, categories, and maps."), null)
		return p
	}

	var loadVenue = function(results) {
		console.log("Venue data loaded")
		venue.venue = results[0]
	}

	var loadNodes = function(results) {
		console.log("Node data loaded")
		for (var node of results) {
			venue.nodes[node.id] = node
		}
	}

	var loadPolygons = function(results) {
		console.log("Polygon data loaded")
		for (var polygon of results) {
			venue.polygons[polygon.id] = polygon
		}
	}

	var loadLocations = function(results) {
		console.log("Location data loaded")
		for (var location of results) {
			venue.locations[location.id] = location
		}
	}

	var loadCategories = function(results) {
		console.log("Category data loaded")
		for (var category of results) {
			venue.categories[category.id] = category
		}
	}

	var loadMaps = function(results) {
		console.log("Map data loaded")
		results.sort(function (a, b) {
			return a.elevation - b.elevation
		})

		for (var map of results) {
			venue.maps[map.id] = map
		}
	}

	// Pass along the first error we run into, otherwise give back the completed Venue
	var dataLoaded = function (results) {
		for (var i = 0; i < results.length; i++) {
			var result = results[i]
			var apiCall = apiCalls[i]
			if (result[0]) {
				scope.p.done(result[0], venue)
			
				return p
			}

			apiCall.handler(result[1])
		}
		console.log(venue.venue.name + " loaded")
		p.done(null, venue)
	}

	var ApiCall = function (endpoint, args, handler) {
		this.endpoint = endpoint
		this.args = args
		this.handler = handler
	}

	var apiCalls = [
		new ApiCall('venue', {slug: venueId}, loadVenue),
		new ApiCall('node', {venue: venueId}, loadNodes),
		new ApiCall('polygon', {venue: venueId}, loadPolygons),
		new ApiCall('location', {venue: venueId}, loadLocations),
		new ApiCall('category', {venue: venueId}, loadCategories),
		new ApiCall('map', {venue: venueId}, loadMaps)
	]

	promise.join(apiCalls.map(function (obj) {
		return MappedIn.api.Get(obj.endpoint, obj.args, obj.handler)
	})).then(dataLoaded)
	return p
}