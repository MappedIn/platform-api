(function () {
	var $ = id => document.getElementById(id);

	var venue;

	var mapList = $("mapList");
	var debug;
	var mapView;
	var selectedPolygons = [];
	var showIcons;
	var labelLocations;
	var multiline;
	var multifloorNavigationStartEl;
	var multifloorNavigationEndEl;
	var multifloorMapTilt;
	var multifloorMapRotation;
	var multifloorMapSpacing;
	var multifloorStartPosition;
	var expandOptions;
	var highlightLocations;

	var polygonsToAnimateTo = [];

	var nodesToAnimateTo = [];

	var pathableLocations = [];

	var polygonedLocations = [];

	var schema = {
		type: 'object',
		properties: {
			client_id: {
				type: 'string',
			},
			client_secret: {
				type: 'string',
			},
			venue_slug: {
				type: 'string'
			},
			padding_left: {
				type: 'string',
				default: '0'
			},
			padding_top: {
				type: 'string',
				default: '0'
			},
			padding_bottom: {
				type: 'string',
				default: '0'
			},
			padding_right: {
				type: 'string',
				default: '0'
			},
			perspective: {
				type: 'string',
				default: 'Website'
			},
			pin_settings: {
				type: 'boolean',
				default: true
			},
			accessible_path: {
				type: 'boolean',
				default: false
			},
			show_icons: {
				type: 'boolean'
			},
			highlight_locations: {
				type: 'boolean',
				default: false
			},
			show_labels: {
				type: 'boolean',
				default: true
			},
			multiline: {
				type: 'boolean',
				default: true
			},
			multifloor: {
				type: 'boolean',
				default: true
			},
			multifloor_navigation_start: {
				type: 'string',
				default: ''
			},
			multifloor_navigation_end: {
				type: 'string',
				default: ''
			},
			multifloor_map_rotation: {
				type: 'string',
				default: '0'
			},
			multifloor_start_position: {
				type: 'string',
				default: 'top'
			},
			multifloor_map_tilt: {
				type: 'string',
				default: 30
			},
			multifloor_map_spacing: {
				type: 'string',
				default: 1000
			},
		},
		required: [
			'venue_slug',
			'client_id',
			'client_secret'
		]
	};


	function parseSettings() {
		var settings = {};
		var fragment = window.location.hash.substring(1);
		var pairs = fragment.split('&');
		for (var i = 0, iLen = pairs.length; i < iLen; ++i) {
			var pair = pairs[i].split('=');
			var key = decodeURIComponent(pair[0]);
			var setting = schema.properties[key];
			if (setting != null) {
				var value = decodeURIComponent(pair[1]);
				switch (setting.type) {
					case 'boolean':
						value = value === 'true';
						break;
				}
			}
			settings[key] = value;
		}
		var keys = Object.keys(schema.properties);
		for (i = 0, iLen = keys.length; i < iLen; ++i) {
			key = keys[i];
			setting = schema.properties[key];
			if (setting.default !== undefined
			&& settings[key] === undefined) {
				settings[key] = setting.default;
			}
		}
		return settings;
	}

	function parsePadding(settings) {
		return {
			top: parseInt(settings.padding_top.trim() || 0, 10),
			left: parseInt(settings.padding_left.trim() || 0, 10),
			right: parseInt(settings.padding_right.trim() || 0, 10),
			bottom: parseInt(settings.padding_bottom.trim() || 0, 10),
			type: 'pixels'
		};
	}

	function parseMultifloorNavigation() {
		if (multifloorNavigationStartEl.value != '') {
			selectedPolygons[0] = multifloorNavigationStartEl.value;
			highlightPolygonId(selectedPolygons[0]);
		}
		if (multifloorNavigationEndEl.value != '') {
			selectedPolygons[1] = multifloorNavigationEndEl.value;
			highlightPolygonId(selectedPolygons[1], 'green');
		}

		if (selectedPolygons[0] != null && selectedPolygons[1] != null) {
			navigate();
		}
	}

	function updatePaddingOutline(padding) {
		var paddingOutline = document.getElementById('padding_outline');
		if (paddingOutline) {
			paddingOutline.style.top = padding.top + 'px';
			paddingOutline.style.right = padding.right + 'px';
			paddingOutline.style.bottom = padding.bottom + 'px';
			paddingOutline.style.left = padding.left + 'px';
			if (padding.top || padding.right || padding.bottom || padding.left) {
				paddingOutline.style.display = 'block';
			} else {
				paddingOutline.style.display = 'none';
			}
		}
	}

	var preInit = function () {
		'use strict';

		function whenReady(fn) {
			if (document.readyState !== 'loading') {
				fn();
			} else {
				document.addEventListener('DOMContentLoaded', fn);
			}
		}

		function init() {
			var settings = parseSettings();

			var keys = Object.keys(schema.properties);
			for (var i = 0, iLen = keys.length; i < iLen; ++i) {
				var key = keys[i];
				var setting = schema.properties[key];
				var value = settings[key];
				var input = document.getElementById(key);

				if (input) {
					switch (setting.type) {
						case 'boolean':
							input.checked = value;
							break;
						case 'radio':
							var radio =  document.getElementById(key + "-" + value);
							radio.checked = true;
							break;
						default:
							input.value = value !== undefined ? value : '';
							break;
					}
				}
			}

			var settingsAreMissing = false;
			for (i = 0, iLen = schema.required.length; i < iLen; ++i) {
				key = schema.required[i];

				if (settings[key] == null) {
					settingsAreMissing = true;
					break;
				}
			}

			var doInit = function () {
				if (!settingsAreMissing) {
					if (!settings.pin_settings) {
						document.getElementById('settings').className = ' hidden';
					} else {
						document.getElementById('settings').className = 'pinned';
					}
					var canvas = document.getElementById('mapView');

					multifloorNavigationStartEl = $('multifloor_navigation_start');
					multifloorNavigationEndEl = $('multifloor_navigation_end');

					showIcons = settings.show_icons;
					labelLocations = settings.show_labels;
					multiline = settings.multiline;
					multifloorMapRotation = settings.multifloor_map_rotation;
					multifloorMapTilt = settings.multifloor_map_tilt;
					multifloorMapSpacing = settings.multifloor_map_spacing;
					multifloorStartPosition = settings.multifloor_start_position;
					highlightLocations = settings.highlight_locations;

					var venueOptions = {
						clientId: settings.client_id,
						clientSecret: settings.client_secret,
						perspective: settings.perspective || undefined,
						things: {
							venue: ['slug', 'name'],
							locations: ['name', 'type', 'description', 'icon', 'logo', 'externalId'],
							categories: ['name'],
							maps: ['name', 'elevation', 'shortName'],
							polygons: ['externalId'],
							mapGroups: ['name']
						},
						venue: "mappedin-demo-mall",
						venue: settings.venue_slug
					};

					var padding = parsePadding(settings);
					updatePaddingOutline(padding);

					var settingsPanel = document.getElementById('settings');

					if (settings.pin_settings) {
						settingsPanel.className += ' ';
					}

					var pinSettingsCb = document.getElementById('pin_settings');
					pinSettingsCb.onchange = function () {
						settingsPanel.className = pinSettingsCb.checked ? 'pinned' : 'hidden';
					};

					var mapviewOptions = {
						debug: settings.debug_mapview,
						antialias: "AUTO",
						alpha: true,
						backgroundColor: 0x333333,
						mode: settings.mode,
						onFirstMapLoaded: function () {
							console.info("First map fully loaded");
						},
						padding: padding,
					};

					mapviewOptions.onDataLoaded = initPostMapLoaded.bind(null, mapviewOptions);

					var options = {
						mapview: mapviewOptions,
						venue: venueOptions,
						firstMapSelector: function (venue) {
							return venue.defaultMap;
						}
					};

					expandOptions = {
						mapSpacing: parseInt(multifloorMapSpacing, 10),
						rotation: parseInt(multifloorMapRotation, 10),
						padding: mapviewOptions.padding,
						start: multifloorStartPosition,
						//len: 3,
						//dir: 'down',
						mapTilt: parseInt(multifloorMapTilt, 10),
						debug: mapviewOptions.debug
					};

					Mappedin.initialize(options, canvas)
						.then(function (data) {
							mapView = data.mapview;
							venue = data.venue;
							addEventListeners();
						})
						.catch(function (error) {
							console.error(error);
						});
				}
			};
			doInit();
		}

		window.updateSettings = function (event) {
			event.preventDefault();
			var fragment = '#';
			var keys = Object.keys(schema.properties);
			for (var i = 0, iLen = keys.length; i < iLen; ++i) {
				var key = keys[i];
				var setting = schema.properties[key];
				var input = document.getElementById(key);
				if (input) {
					var value;
					switch (setting.type) {
						case 'boolean':
							value = input.checked;
							break;
						case 'radio':
							var radio = document.querySelectorAll('input[name="' + key + '-radio"]:checked')[0];
							value = radio.value;
							break;
						default:
							value = input.value;
							break;
					}
					if (i > 0) {
						fragment += '&';
					}
					fragment += encodeURIComponent(key) + '=' + encodeURIComponent(value);
				}
			}
			window.location.hash = fragment;
			window.location.reload();
			return false;
		};

		whenReady(init);
	};
	// if ('serviceWorker' in navigator) {
	// 	window.addEventListener('load', function() {
	// 		navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
	// 			// Registration was successful
	//     	  	console.log('ServiceWorker registration successful with scope: ', registration.scope);
	//       		preInit();
	// 		}).catch(function(err) {
	// 			// registration failed :(
	// 			console.log('ServiceWorker registration failed: ', err);
	// 			preInit();
	// 		});
	// 	})
	// } else {
	preInit();
	//}

	function initPostMapLoaded(options) {
		mapView.onPolygonClicked = onPolygonClicked;
		mapView.onMapClicked = onMapClicked;
		var locations = venue.locations;
		for (var j = 0, jLen = locations.length; j < jLen; ++j) {
			var location = locations[j];

			if (location.nodes.length > 0) {
				pathableLocations.push(location);
				if (location.polygons.length === 0) {
					for (var k = 0, kLen = location.nodes.length; k < kLen; ++k) {
						nodesToAnimateTo.push({
							node: location.nodes[k],
							logo: location.logo
						});
					}
				}
			}

			if (location.polygons.length > 0) {
				polygonedLocations.push(location);
			}

			var locationPolygons = location.polygons;
			for (var l = 0, lLen = locationPolygons.length; l < lLen; ++l) {
				var polygon = locationPolygons[l];
				mapView.addInteractivePolygon(polygon);
				polygonsToAnimateTo.push(polygon);
			}
		}

		var maps = venue.maps;
		for (var m = 0, mLen = maps.length; m < mLen; ++m) {
			var map = maps[m];
			var mapId = map.id;
			var item = document.createElement("option");
			item.text = map.shortName;
			item.value = map.id;
			item.id = map.id;
			if (mapId == mapView.currentMap) {
				item.selected = true;
			}

			// Check to make highlighting works on a fast floor switch
			if (highlightLocations && m == mLen - 1) {
				mapView.setMap(map);
				item.selected = true;
			}

			mapList.add(item);
		}

		if (showIcons) {
			showAmenityIcons();
		}


		if (labelLocations) {
			options = {
				excludeTypes: ['amenity'],
				multiline: multiline,
				heightMargin: multiline ? undefined : 0,
				activeColor: 'red',
				inactiveColor: 'grey',
				markerSize: 20
			};
			mapView.labelAllLocations(options);
		}

		mapView.enableImageFlippingForAllLocations();

		if (highlightLocations) {
			highlightAllPolygons();
		}
		showCompass();

		parseMultifloorNavigation();

		if (selectedPolygons[0] == null && selectedPolygons[1] == null) {
			try {
				expandMaps(expandOptions);
			} catch (e) {
				console.error(e);
			}
		}
	}

	function updateMaps() {
		let multiFloorView = mapView.mapManager.multiFloorView;
		if (debug) {
			multiFloorView.removeMapBoundingBoxes();
		}
		multiFloorView.removeMaps();
		multiFloorView.positionMaps();
		multiFloorView.addMaps(mapView.mapManager.multiFloorView.maps);
		if (debug) {
			multiFloorView.addMapBoundingBoxes();
		}
		mapView.tryRendering();
	}

	function addEventListeners() {

		$('multifloor_navigation_navigate').addEventListener('click', function (e) {
			e.preventDefault();
			parseMultifloorNavigation();
		});
		$('multifloor_navigation_reset').addEventListener('click', function (e) {
			e.preventDefault();
			resetNavigation();
		});

		$('multifloor_navigation_start').addEventListener('change', (e) => {
			const poly = venue.getCollectionItemById('POLYGON', e.target.value);
			if (poly != undefined) {
				selectedPolygons[0] = e.target.value;
				highlightPolygonId(selectedPolygons[0]);
			} else {
				selectedPolygons[0] = '';
			}
		});

		$('multifloor_navigation_end').addEventListener('change', (e) => {
			const poly = venue.getCollectionItemById('POLYGON', e.target.value);
			if (poly != undefined) {
				selectedPolygons[1] = e.target.value;
				highlightPolygonId(selectedPolygons[1], 'green');
			} else {
				selectedPolygons[1] = '';
			}
		});
		$('multifloor_navigation_showhideoverview').addEventListener('click', function(e) {
			e.preventDefault();
			showHideOverview();
		});

		$('multifloor_map_rotation_slider').addEventListener('input', function (e) {
			$('multifloor_map_rotation').value = parseInt(e.target.value, 10);
			mapView.mapManager.multiFloorView.rotation = e.target.value;
			mapView.mapManager.multiFloorView.positionMaps();
			updateMaps();
		});

		$('multifloor_map_tilt_slider').addEventListener('input', function (e) {
			$('multifloor_map_tilt').value = parseInt(e.target.value, 10);
			mapView.mapManager.multiFloorView.mapTiltDegrees = e.target.value;
			updateMaps();
		});

		$('multifloor_map_spacing_slider').addEventListener('input', function (e) {
			//console.log('multifloorMapSpacing_slider', e.target.value);
			$('multifloor_map_spacing').value = parseInt(e.target.value, 10);
			mapView.mapManager.multiFloorView.mapSpacing = parseInt(e.target.value, 10);
			updateMaps();
		});
	}

	function onMapClicked (mapId) {
		//console.log('clicked on map: ', mapId);
		if (mapView.navigator.overviewVisible === true) {
			mapView.navigator.zoomIn(mapId);
			$('multifloor_navigation_showhideoverview').disabled = false;
			return false;
		}
		return true;
	}

	function highlightPolygonId(polygonId, color = null) {
		if (polygonId == null) {
			return;
		}
		const poly = venue.polygons.find(p => p.id === polygonId);
		mapView.setPolygonColor(poly, color);
	}

	function onPolygonClicked (polygonId) {
		if ((selectedPolygons[0] === '') || (selectedPolygons[0] == undefined)) {
			selectedPolygons[0] = polygonId;
		} else {
			if (selectedPolygons.length === 2) {
				resetNavigation();
				resetSelectedPolygons();
			} else {
				selectedPolygons.push(polygonId);
			}
		}
		multifloorNavigationStartEl.value = selectedPolygons[0] || '';
		multifloorNavigationEndEl.value = selectedPolygons[1] || '';

		mapView.clearAllPolygonColors();
		highlightPolygonId(selectedPolygons[0]);
		highlightPolygonId(selectedPolygons[1], 'green');
		$('multifloor_navigation_reset').disabled = false;
	}

	function highlightAllPolygons() {
		polygonsToAnimateTo.forEach(function (polygon) {
			mapView.setPolygonColor(polygon);
		});
	}

	function showAmenityIcons() {
		var locations = venue.locations;
		for (var i = 0, iLen = locations.length; i < iLen; ++i) {
			var location = locations[i];
			var type = location.type.toLowerCase();
			if ((type == "amenity" || type == "amenities") && location.logo && (location.name.includes("Restroom") || location.name.includes("Washroom"))) {
				var markerString = "<img src='" + location.logo.original + "' width = '24' height = '24'>";
				if (location.polygons.length == -1) {
				// Amenities don't generally have polygons, but we could add this in if we want
				} else {
					var nodes = location.nodes;
					for (var j = 0, jLen = nodes.length; j < jLen; ++j) {
						var node = nodes[j];
						mapView.createMarker(markerString, mapView.getPositionNode(node.id), "", node.map);
					}
				}
			}
		}
	}

	function showCompass() {
		var compass = document.getElementById("compass");
		compass.style.visibility = "visible";
		mapView.lockNorth(compass);
	}

	function expandMaps(options = {}) {
		//console.log('expandMaps:options', options);
		mapView.expandMaps(venue.maps.map(m => m.id), options)
			.then(({ projections }) => {
				const mapTilt = mapView.mapManager.multiFloorView.mapTiltDegrees;
				$('multifloor_map_tilt_slider').value = mapTilt;
				$('multifloor_map_tilt').value = parseInt(mapTilt, 10);
				$('multifloor_map_spacing_slider').value = multifloorMapSpacing;// mapView.mapManager.multiFloorView.mapSpacing;
				$('multifloor_map_spacing').value = multifloorMapSpacing;// parseInt(mapView.mapManager.multiFloorView.mapSpacing, 10);
				$('multifloor_map_rotation_slider').value = multifloorMapRotation;// mapView.mapManager.multiFloorView.mapRotation;
				$('multifloor_map_rotation').value = multifloorMapRotation;//parseInt(mapView.mapManager.multiFloorView.mapRotation, 10);
			});
	}


	/*eslint-disable no-unused-vars*/
	// Keep this around for testing
	function removeMarkers() {
		mapView.removeAllMarkers();
	}
	/*eslint-enable no-unused-vars*/

	var idleRotationFunction = function() {
		mapView.controls.animateCamera({
			rotation: mapView.controls.getRotation() - 1,
			doNotAutoStart: false
		}, 10000, Mappedin.Easing.Linear.None, idleRotationFunction);
	};

	function showHideOverview() {
		if (mapView.navigator.overviewVisible === false) {
			mapView.navigator.zoomOut();
			$('multifloor_navigation_showhideoverview').disabled = true;
		}
	}

	function resetSelectedPolygons() {
		$('multifloor_navigation_navigate').disabled = false;
		$('multifloor_navigation_reset').disabled = true;
		$('multifloor_navigation_showhideoverview').disabled = true;
		multifloorNavigationStartEl.value = '';
		multifloorNavigationEndEl.value = '';
	}

	function resetNavigation() {
		resetSelectedPolygons();
		selectedPolygons = [];
		mapView.clearAllPolygonColors();
		mapView.navigator.hideOverview()
			.then(() => expandMaps(expandOptions));
	}

	function navigate() {
		const startPolygon = venue.polygons.find(p => p.id === selectedPolygons[0]);
		const endPolygon = venue.polygons.find(p => p.id === selectedPolygons[1]);

		// Bad venue, no locations you can path to
		if (pathableLocations.length == 0
			|| startPolygon == null
			|| endPolygon == null
			|| startPolygon.locations.length === 0
			|| endPolygon.locations.length === 0) {
			return;
		}

		$('multifloor_navigation_navigate').disabled = true;
		$('multifloor_navigation_reset').disabled = false;

		startPolygon.directionsTo(endPolygon, { directionsProvider: 'offline' }, function (error, directions) {
			mapView.clearAllPolygonColors();
			highlightPolygonId(startPolygon.id);
			highlightPolygonId(endPolygon.id, 'green');
			if (error != null || directions.error) {
				console.error(error || directions.error.message);
				resetNavigation();
				return;
			}
			try {
				mapView.navigator.setScale(1);
				const expandOptions = {
					mapSpacing: parseInt(multifloorMapSpacing, 10),
					rotation: parseInt(multifloorMapRotation, 10),
					mapTilt: parseInt(multifloorMapTilt, 10)
				};
				mapView.navigator.showOverview(directions, { debug, expandOptions })
					.catch(e => console.error(e));
			} catch (e) {
				console.error(e);
			}
		});
	}
}());
