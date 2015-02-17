MappedIn REST API & Javascript
========

This documentation is intented for partners and integrators of the MappedIn Platform. In a few simple steps you can begin using MappedIn in your Javascript applications. 

## Getting Started

TODO: Setting up permissions. 

## Displaying a Map

MappedIn maps can be displayed with any technologies that support tilesets. In the example below, we are using Leaflet to display our map. 

```javascript
var map, leafletMap;

function initLeafletMap (tilesetURL) {
  // Prepare Tileset URL for Leaflet
  var url = tilesetURL + ((tilesetURL.substr(tilesetURL.length-1, 1) !== '/') ? '/' : '') + "{z}/{x}_{y}.png";
  leafletMap = L.map("< Div ID >", { crs: L.CRS.Simple });
  var tiles = L.tileLayer(url, { zoomOffset: 8, zoom: 0, minZoom: 0, maxZoom: "< tileset's max zoom level >" });
  leafletMap.addLayer(tiles);
}

function getMapsBySlug(slug, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/map', 
    data: 'slug=' + slug, 
    type: 'GET', 
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
    data: 'id=' + id, 
    type: 'GET', 
    success: cb
  });
}

function getLocationsByVenue(venue, cb) {
  $.ajax({ 
    url: 'https://api.mappedin.com/1/location', 
    data: 'venue=' + venue, 
    type: 'GET', 
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
    data: 'origin=' + start + '&destination=' + end + '&venue=' + slug, 
    type: 'GET', 
    success: cb
  });
}

getDirectionFromNodeToNode("< your venue slug >", "< origin node ID >", "< destination node ID >", displayDirections);

```

## API v1 Documentation

[Get V1 documentation here](../../v1.md)















    	   
    	   