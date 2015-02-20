MappedIn REST API & Javascript
========

This documentation is intented for partners and integrators of the MappedIn Platform. The following steps will help you get setup so you can begin using MappedIn in your Javascript applications. Click [here](sample.html) to see a working sample application.

## Getting Started

Before you can make REST calls to MappedIn API, you need to retrieve a token by authenticating with your client key and secret.

```javascript
var token;
$.ajax({ 
  url: 'http://api.mappedin.com/1/oauth2/token', 
  data: { 
    grant_type: "client_credentials", 
    client_id: '< your client id >', 
    client_secret: '< your client secret >' 
  }, 
  type: 'POST',
  success: function (result) {
    token = result;
  },
  error: function (result) {}
});
```

## Displaying a Map

MappedIn maps can be displayed with any technologies that support tilesets. In the example below, we are using Leaflet to display our map.

```javascript
var map, leafletMap;

function initLeafletMap (tilesetURL) {
  leafletMap = L.map("< Div ID >", { crs: L.CRS.Simple });
  // Prepare Tileset URL for Leaflet
  var url = tilesetURL + ((tilesetURL.substr(tilesetURL.length-1, 1) !== '/') ? '/' : '') + "{z}/{x}_{y}.png",
  var zoomOffset = 8,
  var maxZoom = Math.ceil(Math.log((Math.max(perspective.size.height, perspective.size.width)))/Math.log(2)) - zoomOffset;
  var tiles = L.tileLayer(url, { zoomOffset: zoomOffset, zoom: 0, minZoom: 0, maxZoom: maxZoom, continuousWorld: true });
  leafletMap.addLayer(tiles);
}

function getMapsByVenue(slug, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/map', 
    data: { venue: slug }, 
    type: 'GET',
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
    }, 
    success: cb
  });
}

getMapsBySlug("< your venue slug >", function (maps) {
  map = maps[0];
  var perspective = map.perspectives["< persepective name >"];
  initLeafletMap(perspective.tiles);
});
```

## Adding Content to a Map

By utilizing the MappedIn-API, data can be easily retrieved and displayed in your application. Here is an example of adding location pins to a Leaflet map. 

```javascript
function drawLeafletMarker(coords) {
  var latlng = leafletMap.unproject(coords, leafletMap.getMaxZoom());
  var marker = new L.marker(latlng);  
  marker.addTo(leafletMap);
}

function getNodeById(id, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/node', 
    data: { id: id }, 
    type: 'GET', 
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
    }, 
    success: cb
  });
}

function getLocationsByVenue(venue, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/location', 
    data: { venue: venue }, 
    type: 'GET', 
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
    }, 
    success: cb
  });
}

getLocationsByVenue("< your venue slug >", function (locations) {
  for (var i = 0; i < locations.length; i++) {
    for (var j = 0 ; j < locations[i].nodes.length; j++) {
      if (locations[i].nodes[j].map === map.id) {
        getNodeById(locations[i].nodes[j].id, function (node) {
          drawLeafletMarker([node.x, node.y]);
        });
      }
    }
  }
});

```

## Get Directions!

```javascript
function displayDirections(directions) {
  var path = [];
  for (var i = 0; i < directions.path.length; i++) {
    var coords = [directions.path[i].x, direction.path[i].y];
    var latlng = leafletMap.unproject(coords, leafletMap.getMaxZoom());
    path.push(latlng);
  }
  leafletMap.addLayer(new L.polyline(path, { /* Leaflet Path Options */ }));
}

function getDirectionsFromNodeToNode(slug, start, end, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/directions', 
    data: { 
      venue: slug, 
      origin: start, 
      destination: end 
    },
    type: 'GET',
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
    }, 
    success: cb
  });
}

getDirectionFromNodeToNode("< your venue slug >", "< origin node ID >", "< destination node ID >", displayDirections);

```

## Perspectives

In order to display data onto perspective maps, data points must be projected onto your desired perspective map; projective.js will help you do this. First, initialize your perspective object with the control/target points found within your map's perspective object. Once your perspective object is initialized, use projective.transform to project points onto your perspective map's coordinate system.

```javascript 
var projective;

function initProjective (perspective) {
  var control = [],
      target = [];
  perspective.reference.forEach(function (pr) {
    control.push([parseFloat(pr.control.x),parseFloat(pr.control.y)]);
    target.push([parseFloat(pr.target.x),parseFloat(pr.target.y)]);
  });
  projective = new Projective({ from: control, to: target });
}

initProjective(map.perspectives['< your perspective name >']);

var projectedPoint = projective.transform([ '< x value >', '< y value >']);
```

## API v1 Documentation

[Get V1 documentation here](../../v1.md)    	   