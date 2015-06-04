// Setting up our global variables
var token;


// We will be using MappedIn API V1
var host = {
	auth: 'https://auth.mappedin.com',
	api: 'https://api.mappedin.com/1/'
}

// We will be using the Leaflet (http://leafletjs.com/) map library to render the MappedIn Map and data.
// You are free to choose any other Map Rendering library for your web based projects
var leaflet = {
	map: null, 
	layers: {},
	maxBounds: null
};

// We will be rendering the 'MappedIn Mall' venue for this demo

var maps = {};
var projective;
var map = null;
var perspective;
var tileLayer = null;
var cache = {
	nodeById: {},
	locations: []
};
var categoryId;
var defaultZoom = 2;

// Auth
/**
* Our authentication function for requesting an OAuth token from the MappedIn server.
* We will need this token for requesting any data from our API. 
*
* Note: A MappedIn token expires after 24 hours. You should setup your code in your production 
* environment to be able to renew or request a new token before it expires
**/
function authenticate(grant, cb) {
	$.ajax({ 
		url: host.auth + '/oauth2/token', 
		data: grant, 
		type: 'POST',
		success: function (result) {
			token = result;
			cb();
		},
		error: function (result) {
			console.log("Error Authenticating.")
		}
	});
};

// Our main API object for requesting data from MappedIn
var api = {
	/**
	* A simple jQuery AJAX call to request the various type of data that the MappedIn web API is able to provide
	* Please consult the MappedIn API Reference doc at https://github.com/MappedIn/platform-api/blob/master/v1.md
	* for more information on the different parameters and calls you are allowed to make using the MappedIn API
	**/
	Get: function (asset, data, cb) {
		$.ajax({
			url: host.api + asset,
			data: data,
			type: 'GET',
			// Remember to include the OAuth token with every API request with MappedIn servers
			beforeSend: function (xhr) {
				xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
			},
			success: cb
		})
	}
};

/**
* Simple initialization function to get the map data for our current venue and start the map loading process
**/
function init(venueId, perspectiveName, cb) {
	api.Get('map', { venue: venueId }, function (results) {
		// Getting the first map returned by MappedIn API
		results.forEach(function(map){
			maps[map.id] = map;
		});

		map = results[0];
		
		// Getting the first perspective that belongs to this map
		perspective = map.perspectives[0];
		
		// Initializing the leaflet map
		initProjective(perspective);
		changeMap(perspectiveName);


		_.sortBy(maps, 'elevation').forEach(function(map){
			initFloor(map, perspectiveName);
		});
		cb();
	});
}


function initMap (tiles) {
	$('#map').empty();

	// Prepare tiles URL for use in Leaflet
	var	url = tiles + ((tiles.substr(tiles.length-1, 1) !== '/') ? '/' : '') + "{z}/{x}_{y}.png";
	
	// Here we are calculating the maximum zoom level available for our currently select map perspective.
	// The maximum zoom level is same as the maximum tile layer {z} available from our servers.
	var maxZoom = Math.ceil(Math.log((Math.max(perspective.size.height, perspective.size.width)))/Math.log(2)) - 8;
	tileLayer = new L.tileLayer(url, { 
		zoomOffset: 8, 
		zoom: defaultZoom, 
		minZoom: 0, 
		maxZoom: maxZoom, 
		noWrap: true, 
		continuousWorld: true 
	})

	// Setting up the Leaflet map layers
	leaflet.map = L.map('map', { 
		crs: L.CRS.Simple, 
		zoom: 0, 
		minZoom: 0, 
		maxZoom: maxZoom, 
		center: [0,0] 
	}).addLayer(tileLayer);

	leaflet.map.setZoom(defaultZoom);
	
	// Setting up the max bounds for the map since our venue is not as bug as the world
	leaflet.maxBounds = getMaxBounds();
	leaflet.map.setMaxBounds(leaflet.maxBounds);
}

/**
* This is our main function for initializing and changing the Leaflet map. 
* Here we tell Leaflet the URL for the map tiles to load and display. 
* We also tell Leaflet how much it should allow a user to scroll and pan the map.
*
* NOTE: As previously mentioned, you can use MappedIn API with any other map library that can display 
* custom map tiles. Using Leaflet in your web projects is not required to be able to use MappedIn API.
**/
function changeMap(perspectiveName) {

	clearLocationMarkers();

	leaflet.layers={};

	var perspectiveIndex = _.findIndex(maps[map.id].perspectives, function(item){
			return item.name == perspectiveName;
		})

	perspective = maps[map.id].perspectives[perspectiveIndex];

	initProjective(perspective);

	var tiles = perspective.tiles || perspective.image;
		
	if (tileLayer) {
		leaflet.map.removeLayer(tileLayer);
	}	

	if (leaflet.map) {
		leaflet.map.remove();
	}

	// Prepare tiles URL for use in Leaflet
	var	url = tiles + ((tiles.substr(tiles.length-1, 1) !== '/') ? '/' : '') + "{z}/{x}_{y}.png";
	
	// Here we are calculating the maximum zoom level available for our currently select map perspective.
	// The maximum zoom level is same as the maximum tile layer {z} available from our servers.
	var maxZoom = Math.ceil(Math.log((Math.max(perspective.size.height, perspective.size.width)))/Math.log(2)) - 8;
	
	tileLayer = new L.tileLayer(url, { 
		zoomOffset: 8, 
		zoom: defaultZoom, 
		minZoom: 0, 
		maxZoom: maxZoom, 
		noWrap: true, 
		continuousWorld: true 
	})

	leaflet.map = L.map('map', { 
		crs: L.CRS.Simple, 
		zoom: 0, 
		minZoom: 0, 
		maxZoom: maxZoom, 
		center: [0,0] 
	}).addLayer(tileLayer);	
	leaflet.map.setZoom(defaultZoom);


	// Setting up the max bounds for the map since our venue is not as bug as the world
	leaflet.maxBounds = getMaxBounds();
	leaflet.map.setMaxBounds(leaflet.maxBounds);
	getModelData(function(){
		initLocationMarkers(venueId);
		initMapInteraction();
		changeCategoryById(categoryId);
	});
}

function initFloor(myMap, perspectiveName) {
	var floorsDiv = $('#floors');
	var index = _.findIndex(myMap.perspectives, function(item){
		return item.name == perspectiveName;
	})


	var floor = '<div class="col-md-4 floor" id="floor_' + myMap.id +'"><div class="row floor-name">' + myMap.name + '</div><div class="row floor-image" style="background-image: url(' + myMap.perspectives[index].original+ ')"></div></div>';
	floorsDiv.append(floor);

	$("#floor_" + myMap.id).on('click', function(e){
		map = maps[myMap.id];
		changeMap(perspectiveName);
		
	});
	
}

/**
* Here we are creating a matrix for doing projective transformation calculations using the 
* Projective object from the Projective.js file.
*
* Matrix transformation are needed when the venue map you want to display in your web page has been
* transformed, like rotated, skewed or resized in MappedIn Portal. When this occurs, all node data
* returned from the server also has to be transformed to properly match the co-ordinates on the
* transformed map, since the server by default will return data for the base map only.
**/
function initProjective (perspective) {
	var control = [],
		target = [];
	perspective.reference.forEach(function (pr) {
		control.push([parseFloat(pr.control.x),parseFloat(pr.control.y)]);
		target.push([parseFloat(pr.target.x),parseFloat(pr.target.y)]);
	});
	projective = new Projective({ from: control, to: target });
}

/**
* Here we are getting all the data necessary to make our demo map work properly.
* We are getting all locations and nodes that belong in this venue, and caching them in our 'cache' object.
* We are also getting the different categories available for this venue and building a radio button list 
* to show how to display markers on the map for different types of locations.
**/
function getModelData(cb) {
	 cache = {
		nodeById: {},
		locations: []
	};

	// Getting all locations for our venue. 
	// You can also get all the location with the node objects inserted within my by passing 'embed' parameter like so:
	// api.Get('location', { venue: venueId, embed: 'nodes' }, function (locations) { ... });
	api.Get('location', { venue: venueId }, function (locations) {
	
		// Getting all nodes that belong to our currently selected map

		api.Get('node', { map: map.id }, function (nodes) {
		
			// Getting all categories that have been defined for this venue in the MappedIn portal
			api.Get('category', { venue: venueId }, function (categories) {
				// Caching all of our locations
				cache.locations = locations;
				
				// Creating a hash table of all of our nodes in our cache
				for (var i = 0; i < nodes.length; i++) {
					cache.nodeById[nodes[i].id] = nodes[i];
				}
				
				// Dynamically creating a dropdown for you to switch between different 
				// category marker layers in Leaflet
				
				var categoryListDiv = $('#category-list');
				categoryListDiv.empty();
				for (var i = 0; i < categories.length; i++) {


					var link = $('<a/>', { 
						role: "menuitem", 
						tabindex:"-1", 
						text:categories[i].name, 
						href: "#",
						value: categories[i].id, 
						click: function(e){
							categoryId = $(this).attr("value");
							changeCategoryById(categoryId);
							$('#categoriesDropdown').html($(this).text() + ' <span class="caret"></span>');
							return true;
						}
					});

					var listItem = $('<li/>', { role: "presentation", html: link});
					categoryListDiv.append(listItem);
				}



				return cb();
			});
		});
	});
}

/**
*  This function removeds all location markers from the map
**/
function clearLocationMarkers() {
	Object.keys(leaflet.layers).forEach(function (layer) {
		leaflet.map.removeLayer(leaflet.layers[layer]);
	});
}

/**
* This function is used to pre-process all of our locations and create marker layers for them 
* depending on their category
**/
function initLocationMarkers(venueId) {
	
	for (var i = 0; i < cache.locations.length; i++) {
		// Skip parsing any locations that do not have any categories
		if (!cache.locations[i].categories) continue;
		
		// Processing all nodes for the current location
		for (var j = 0 ; j < cache.locations[i].nodes.length; j++) {
			// Only parse nodes that belong in the currently displayed map
			if (cache.locations[i].nodes[j].map === map.id) {
				// Make sure the current node exists in our node cache and is not null
				// NOTE: This error should not occur for a venue in production. If it does please,
				// contact MappedIn support as this error indicates bad venue data has some been created
				var node = cache.nodeById[cache.locations[i].nodes[j].node];
				if (!node) continue;
				
				// Using our projective transform matrix, we convert the node's x and y position into a LatLng 
				// object for drawing on our Leaflet map
				var latlng = leaflet.map.unproject(projective.transform([node.x, node.y]), leaflet.map.getMaxZoom());
				
				// Create and cache Leaflet marker layers for the current location's categories
				// These layers will be used for toggling markers for different categories on our map
				cache.locations[i].categories.forEach(function(category) {
					leaflet.layers[category] = leaflet.layers[category] || L.layerGroup([]);
					
					var marker = L.marker(latlng);
					
					// NOTE: In production code it is recommended that you do not add custom properties like this.
					// Instead extend the marker class to add such new properties. 
					// More info here: http://stackoverflow.com/a/17424238/616561
					marker.location = cache.locations[i];
					
					leaflet.layers[category].addLayer(marker);
				});
	    	}
	    }
  	}
}

/**
* This function contains sample code to show how to setup click events on a Leaflet map and markers.
**/
function initMapInteraction() {
	// Hooking a click event on the map that displays an alert with the click's transformed co-ordinate
	// Same co-ordinate that is used by the nodes
	/*leaflet.map.on('click', function(e) {
		var pos = leaflet.map.project(e.latlng, leaflet.map.getMaxZoom());
		alert("You clicked at co-ordinate " + pos.x + ", " + pos.y);
	});*/
	
	// Setting click events on all the markers to display an alert containing their location's name
	for (category in leaflet.layers) {
		for (mId in leaflet.layers[category].getLayers()) {
			var marker = leaflet.layers[category].getLayers()[mId];
			marker.on('click', function(e) {
				var pos = leaflet.map.project(e.latlng, leaflet.map.getMaxZoom());
				showLocationProfile(this.location);
				//alert("You clicked on the " + this.location.name + " marker \n" 
				//	+ "Located at co-ordinate " + pos.x.toFixed(2) + ", " + pos.y.toFixed(2));
			});
		}
	}
}

/**
* This function looks at all logo image sizes and determines which size to use.
**/
function getLogoURL(logo) {
	return logo.small || logo['140x140'] || logo.xsmall || logo['66x66'] || logo.original;
}

function showLocationProfile(location) {
	var locationProfileDiv = $('#location-profile');
	locationProfileDiv.removeClass('fade-in');

	setTimeout(function(){
		
		locationProfileDiv.empty();

		if (location.logo) {
			locationProfileDiv.append('<div class="col-md-4 col-md-offset-2 location-logo" style="background-color: '+ location.color.rgba +'; background-image: url('+getLogoURL(location.logo) + ')"></div>');
		} else {
			locationProfileDiv.append('<div class="col-md-4 col-md-offset-2 location-logo" ></div>');
		}

		locationProfileDiv.append('<div class="col-md-6"><div class="row"><div class="row location-name">' + location.name + '</div><div class="row location-description">' + (location.description ? location.description : "") + '</div></div></div>');
		locationProfileDiv.addClass('fade-in');
	}, 500);
}



/**
* Function to quickly switch between different category marker layers in Leaflet
**/
function changeCategoryById(id) {
	clearLocationMarkers();

	// Just show the currently provided category (id) layer on the map
	if (leaflet.layers[id]) {
		leaflet.map.addLayer(leaflet.layers[id]);
	}
}

/**
* A simple implementation that shows how to transform direction path co-ordinates and 
* then draw a path in Leaflet to show directions from the 'start' node to the 'end' node
**/
function drawDirections(venueId, start, end) {
	// Calling API to get the direction from 'start' to 'end' nodes
	api.Get('directions', { venue: venueId, origin: start, destination: end }, function (directions) {
		var path = [];
		
		// Processing all the nodes for the 'path' of the directions object into
		// co-ordinates that can be used by Leaflet to draw a directions line on the map
		for (var i = 0; i < directions.path.length; i++) {
			var coords = projective.transform([directions.path[i].x, directions.path[i].y]);
			var latlng = leaflet.map.unproject(coords, leaflet.map.getMaxZoom());
			path.push(latlng);
		}
		
		// Making Leaflet draw a red lines showing the path to take from 
		// the 'start' node to the 'end' node
		leaflet.map.addLayer(new L.polyline(path, { color: '#ff0000', opacity: 0.7 }));
	});
}

/**
* Simple utility function to calculate the maximum scroll bounds for our map so Leaflet
* does not scroll outside the map bounds
**/
function getMaxBounds() {
	var southWest = leaflet.map.unproject([0, perspective.size.height], leaflet.map.getMaxZoom());
	var northEast = leaflet.map.unproject([perspective.size.width, 0], leaflet.map.getMaxZoom());
	return new L.LatLngBounds(southWest, northEast);
}