MappedIn REST API
========

This documentation is intented for partners and integrators of the MappedIn Platform. In a few simple steps you can begin using MappedIn data into your Javascript applications. 

## Getting Started

Initialize the API object in your javascript application.

```javascript
var api = new MappedInAPI({ 
  key: '< your key >',
  secret: '< your secret >'
});

api.init(function() {
  /* Begin using API! */
});
```

## Displaying a Map

MappedIn maps can be displayed with any technologies that support tilesets. In the example below, we are using Leaflet to display our map. 

```javascript
var map, leafletMap;

function initLeafletMap (tilesetURL) {
  leafletMap = L.map("< Div ID >", { crs: L.CRS.Simple });
  var tiles = L.tileLayer(tilesetURL, { zoom: 0, minZoom: 0, maxZoom: "< map's max zoom level >" });
  leafletMap.addLayer(tiles);
}

api.map.Get({ venue: "< your venue name >"}, function (maps) {
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

// Get locations within your venue
api.location.Get({ venue: "< your venue >" }, function (locations) {
  for (var i = 0; i < locations.length; i++) {
    for (var j = 0 ; j < locations[i].nodes.length; j++) {
      if (locations[i].nodes[j].map === map.id) {
        api.node.Get({ id: locations[i].nodes[j].id }, function (node) {
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
api.directions.toNode({ 
  origin: "< origin node ID >", 
  destination: "< destination node ID >",
  venue: MI.slug, 
}, displayDirections);
```

## API v1 Documentation

[Get V1 documentation here](v1.md)















    	   
    	   