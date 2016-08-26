/*global Mappedin,L,$,_*/

(function (exports) {
  // We will be using the Leaflet (http://leafletjs.com/) map library to render
  // the Mappedin map and data. You are free to choose any other map rendering
  // library for your web based projects.
  var leafletMap = null;
  var leafletLayers = {};
  var tileLayer = null;

  var markerLayerGroup = L.LayerGroup.collision({ margin: 0 });
  var defaultZoom = 2;

  // Predefined styles used to create hover effects and highlight polygons Feel
  // free to add your own and use them in highlightPoygon, or change the
  // existing ones.
  var polygonStyles = {
    invisible: {
      fillOpacity: 0.0,
      stroke: false
    },
    hover: {
      fillOpacity: 0.5,
      fillColor: "white",
      stroke: true,
      color: "white",
      opacity: 1.0,
      lineJoin: "miter",
      weight: 3
    },
    highlight: {
      fillOpacity: 0.5,
      fillColor: "blue",
      stroke: true,
      color: "white",
      opacity: 1.0,
      lineJoin: "miter",
      weight: 3
    }
  };

  // We will be rendering the venue you specified in sample.html
  var cache;
  var map;
  var categoryId;

  // Special value that means to show every location in the "category" dropdown
  var ALL_LOCATIONS = "ALL";

  /**
  * Simple initialization function to get the map data for our current venue and
  * start the map loading process.
  * */
  function init(options, cb) {
    options.things = Mappedin.LEAFLET_POLYGONS;
    Mappedin.init(options, function (err, mappedin) {
      if (err) return alert(err);

      cache = mappedin;

      // Getting the first map returned by Mappedin API
      map = cache.maps[0];

      // Initializing the leaflet map
      changeMap();

      // Initializing the floor menu
      _.sortBy(cache.maps, 'elevation').forEach(initFloor);

      cb();
    });
  }

  /**
  * This is our main function for initializing and changing the Leaflet map.
  * Here we tell Leaflet the URL for the map tiles to load and display. We also
  * tell Leaflet how much it should allow a user to scroll and pan the map.
  *
  * NOTE: As previously mentioned, you can use Mappedin API with any other map
  * library that can display custom map tiles. Using Leaflet in your web
  * projects is not required to be able to use Mappedin API.
  **/
  function changeMap() {

    clearLocationMarkers();

    leafletLayers = {};

    var tiles = map.tiles;

    if (tileLayer) {
      leafletMap.removeLayer(tileLayer);
    }

    if (leafletMap) {
      leafletMap.remove();
    }

    // Prepare tiles URL for use in Leaflet
    var url = tiles + ((tiles.substr(tiles.length - 1, 1) !== '/') ? '/' : '') + "{z}/{x}_{y}.png";

    // Here we are calculating the maximum zoom level available for our
    // currently select map perspective. The maximum zoom level is same as the
    // maximum tile layer {z} available from our servers.
    var maxZoom = Math.ceil(Math.log((Math.max(map.height, map.width))) / Math.log(2)) - 8;

    leafletMap = L.map('map', {
      crs: L.CRS.Simple,
      zoom: 0,
      minZoom: 0,
      maxZoom: maxZoom,
      center: [0, 0]
    });

    // Setting up the max bounds for the map since our venue is not as bug as
    // the world
    var maxBounds = getMaxBounds();
    leafletMap.setMaxBounds(maxBounds);
    leafletMap.setZoom(defaultZoom);

    tileLayer = new L.tileLayer(url, {
      zoomOffset: 8,
      zoom: defaultZoom,
      minZoom: 0,
      maxZoom: maxZoom,
      noWrap: true,
      continuousWorld: true,
      bounds: maxBounds
    });

    leafletMap.addLayer(tileLayer);

    // Set up some internal data for polygons to use
    cache.polygons.forEach(function (polygon) {
      polygon._highlighted = false;
      polygon._markers = {};
    });

    // Dynamically creating a dropdown for you to switch between different
    // category marker layers in Leaflet
    var categoryListDiv = $('#category-list');
    categoryListDiv.empty();

    // Make a special option to show all locations
    var link = $('<a/>', {
      role: "menuitem",
      tabindex: "-1",
      text: ALL_LOCATIONS,
      href: "#",
      value: ALL_LOCATIONS,
      click: onClickCategory
    });
    var listItem = $('<li/>', { role: "presentation", html: link });
    categoryListDiv.append(listItem);

    // Make an option to show all locations in each category
    cache.categories.forEach(function (category) {
      var link = $('<a/>', {
        role: "menuitem",
        tabindex: "-1",
        text: category.name,
        href: "#",
        value: category.id,
        click: onClickCategory
      });

      listItem = $('<li/>', { role: "presentation", html: link });
      categoryListDiv.append(listItem);
    });

    initMapInteraction();
    changeCategoryById(categoryId);

    // Create the base highlight polygons for all polygons on a location
    map.polygons.filter(function (polygon) {
      return polygon.locations.length >= 1;
    }).forEach(function (polygon) {
      var leafletPolygon = createPolygon(polygon);
      leafletMap.addLayer(leafletPolygon);
      polygon.locations.forEach(function (location) {
        createLabelMarker(location, polygon);
      });
    });
  }

  function onClickCategory() {
    categoryId = $(this).attr("value");
    changeCategoryById(categoryId);
    $('#categoriesDropdown').html($(this).text() + ' <span class="caret"></span>');
    return true;
  }

  function onClickFloor() {
    var floorId = $(this).attr("value");
    map = _.find(cache.maps, { id: floorId });
    changeMap();
    return true;
  }

  /**
  * Initalizes a floor for use
  */
  function initFloor(floor) {
    var floorsDiv = $('#floors');
    var floorEl = $('<div/>', {
      class: 'col-md-4 floor',
      value: floor.id,
      click: onClickFloor,
      html: '<div class="row floor-name">' + floor.name + '</div><div class="row floor-image" style="background-image: url(' + floor.original + ')"></div>'
    });
    floorsDiv.append(floorEl);
  }

  /**
  *  This function removeds all location markers from the map
  **/
  function clearLocationMarkers() {
    markerLayerGroup.clearLayers();
    Object.keys(leafletLayers).forEach(function (layer) {
      leafletMap.removeLayer(leafletLayers[layer]);
    });
  }
  /**
   * A simple icon extding DivIcon that doesn't set the margin/size,
   * which made it difficult to center text labels on their markers. Use
   * this with a CSS class like localtion-label.
   */
  L.FillIcon = L.DivIcon.extend({
    options: {
      iconSize: [12, 12], // also can be set through CSS
      className: 'leaflet-div-icon',
      html: false
    },
    _setIconStyles: function (img, name) {
      var options = this.options,
        size = L.point(options[name + 'Size']),
        anchor;

      if (name === 'shadow') {
        anchor = L.point(options.shadowAnchor || options.iconAnchor);
      } else {
        anchor = L.point(options.iconAnchor);
      }

      if (!anchor && size) {
        anchor = size.divideBy(2, true);
      }

      img.className = 'leaflet-marker-' + name + ' ' + options.className;
    }
  });

  L.fillIcon = function (options) {
    return new L.FillIcon(options);
  };

  function createLabelMarker(location, polygon) {
    // Place labels in the true center of the polygons
    var coordinates = getCentroid(polygon.polygon);
    var locationIcon = L.fillIcon({ className: '', html: "<div class='location-label'>" + location.name + "</div>" });
    var marker = L.marker(coordinates, { icon: locationIcon });

    marker.mLocation = location;
    marker.mPolygon = polygon.id;
    marker.on("click", onLabelMarkerClick);

    polygon._markers[location.id] = marker;
  }

  /**
  * This function contains sample code to show how to setup click events on a
  * Leaflet map and markers.
  * */
  function initMapInteraction() {
    // Clear the map if we click on nothing
    leafletMap.on('click', function () {
      clearLocationProfile();
      clearHighlightPolygons();
      clearLocationMarkers();
    });
  }

  /**
  * This function sets a polygon to a certain visual style that won't be
  * overridden by the mouseover effect. Remove it with the
  * clearHighlightPolygons function. Used mostly on mouse click, but you could
  * highlight things with your own styles for other reasons.
  */
  function highlightPolygon(id, style) {
    var polygon = _.find(cache.polygons, { id: id });
    polygon._highlighted = true;
    polygon.polygon.setStyle(style);
  }

  /**
  * Takes Mappedin Polygon data creates the corrisponding Leaflet polygon in the
  * map's frame of reference. Each Mappedin polygon should only have one Leaflet
  * polygon. Use highlightPolygon to change the styles.
  */
  function createPolygon(polyData) {
    var vertexes = polyData.vertexes.map(function (vertex) {
      return leafletMap.unproject([vertex.x, vertex.y], leafletMap.getMaxZoom());
    });

    var polygon = L.polygon(vertexes, { color: "white", stroke: false, fillOpacity: 0.0 });
    polyData["polygon"] = polygon;
    polygon["mId"] = polyData.id;

    polygon.on("mouseover", onPolygonMouseover);
    polygon.on("mouseout", onPolygonMouseout);
    polygon.on("click", onPolygonClick);
    return polygon;
  }

  /**
  * Give a subtle hover effect when the mouse goes over a polygon
  */
  function onPolygonMouseover(event) {
    var polygon = _.find(cache.polygons, { id: event.target.mId });
    if (!polygon._highlighted) {
      event.target.setStyle(polygonStyles.hover);
    }
  }

  /**
  * If we were hovering over a polygon, turn off the highlight when the mouse
  * leaves.
  */
  function onPolygonMouseout(event) {
    var polygon = _.find(cache.polygons, { id: event.target.mId });
    if (!polygon._highlighted) {
      event.target.setStyle(polygonStyles.invisible);
    }
  }

  /**
  * Handle clicking on a polygon by highlighting it and displaying the
  * location's information
  */
  function onPolygonClick(event) {
    clearHighlightPolygons();
    var polygon = _.find(cache.polygons, { id: event.target.mId });
    highlightPolygon(event.target.mId, polygonStyles.highlight);
    // If your venue has multiple polygons with multiple locations, it's up to
    // you to determine which location a user is interested in when they click
    // on a polygon. Otherwise, they will always want the first (and only) one
    if (polygon.locations.length > 0) {
      showLocationProfile(polygon.locations[0]);
    }
  }

  /**
  * Handle the user clicking on a label marker for a specific location by
  * behaving as though the polygon for that location was clicked on.
  */
  function onLabelMarkerClick(event) {
    clearHighlightPolygons();

    showLocationProfile(event.target.mLocation);
    highlightPolygon(event.target.mPolygon, polygonStyles.highlight);

    clearLocationMarkers();
  }

  /**
  * Clears the highlight effect from all polygons.
  */
  function clearHighlightPolygons() {
    cache.polygons.forEach(function (polygon) {
      if (polygon._highlighted && polygon.polygon) {
        polygon._highlighted = false;
        polygon.polygon.setStyle(polygonStyles.invisible);
      }
    });
  }

  /**
  * This function looks at all logo image sizes and determines which size to
  * use.
  * */
  function getLogoURL(logo) {
    return logo.small || logo['140x140'] || logo.xsmall || logo['66x66'] || logo.original;
  }

  /**
  * Displays the information for a given location at the bottom of the page
  */
  function showLocationProfile(location) {
    var locationProfileDiv = $('#location-profile');
    locationProfileDiv.removeClass('fade-in');

    setTimeout(function () {

      locationProfileDiv.empty();

      if (location.logo) {
        locationProfileDiv.append('<div class="col-md-4 col-md-offset-2 location-logo" style="background-color: ' + (location.color && location.color.rgba || '#fff') + '; background-image: url(' + getLogoURL(location.logo) + ')"></div>');
      } else {
        locationProfileDiv.append('<div class="col-md-4 col-md-offset-2 location-logo" ></div>');
      }

      locationProfileDiv.append('<div class="col-md-6"><div class="row"><div class="row location-name">' + location.name + '</div><div class="row location-description">' + (location.description ? location.description : "") + '</div></div></div>');
      locationProfileDiv.addClass('fade-in');
    }, 500);
  }

  /**
  * Clears any previously displayed location information
  */
  function clearLocationProfile() {
    var locationProfileDiv = $('#location-profile');
    locationProfileDiv.removeClass('fade-in');
  }

  /**
  * Function to quickly switch between different category marker layers in
  * Leaflet
  * */
  function changeCategoryById(id) {
    clearLocationMarkers();
    clearHighlightPolygons();
    clearLocationProfile();

    // Add markers for all locations in the relevant categories to our
    // markerLayerGroup
    var locations;
    if (id === ALL_LOCATIONS) {
      locations = cache.locations;
    } else if (id) {
      locations = _.find(cache.categories, { id: id }).locations;
    } else {
      locations = [];
    }

    locations.forEach(function (location) {
      location.polygons.forEach(function (polygon) {
        // Retrieve the existing marker
        var marker = polygon._markers[location.id];
        if (marker) {
          markerLayerGroup.addLayer(marker);
        }
      });
    });

    leafletMap.addLayer(markerLayerGroup);
  }

  /**
  * Simple utility function to calculate the maximum scroll bounds for our map so Leaflet
  * does not scroll outside the map bounds
  **/
  function getMaxBounds() {
    var southWest = leafletMap.unproject([1, map.height - 1], leafletMap.getMaxZoom());
    var northEast = leafletMap.unproject([map.width - 1, 1], leafletMap.getMaxZoom());
    return new L.LatLngBounds(southWest, northEast);
  }


  // Polygon centroid algorithm from http://stackoverflow.com/a/22796806/2283791
  function getCentroid(polygon) {
    var twoTimesSignedArea = 0;
    var cxTimes6SignedArea = 0;
    var cyTimes6SignedArea = 0;

    var points = polygon.getLatLngs();
    var length = points.length;

    var x = function (i) { return points[i % length].lat; };
    var y = function (i) { return points[i % length].lng; };

    for (var i = 0; i < length; i++) {
      var twoSA = x(i) * y(i + 1) - x(i + 1) * y(i);
      twoTimesSignedArea += twoSA;
      cxTimes6SignedArea += (x(i) + x(i + 1)) * twoSA;
      cyTimes6SignedArea += (y(i) + y(i + 1)) * twoSA;
    }
    var sixSignedArea = 3 * twoTimesSignedArea;
    return [cxTimes6SignedArea / sixSignedArea, cyTimes6SignedArea / sixSignedArea];
  }

  exports.init = init;
} (window));