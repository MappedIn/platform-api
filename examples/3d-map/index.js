var colors = {
	hover: 0xcccccc,
	select: 0x0000ff
}

// Set Three.js scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
var cameraOrbit = new THREE.Object3D()

var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
var map, controls

var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var renderer;

var polygons = {}
var nodes = {}
var maps = {}
var locations = {}
var categories = {}
var venue = {}

var venueId

var highlightedPolygons = {}

var numAPICalls = 6

// This doesn't handle errors at all right now
function init(venueId) {
	MappedIn.api.Get('venue', {slug: venueId}, loadVenue)
	MappedIn.api.Get('node', {venue: venueId}, loadNodes)
	MappedIn.api.Get('polygon', {venue: venueId}, loadPolygons)
	MappedIn.api.Get('location', {venue: venueId}, loadLocations)
	MappedIn.api.Get('category', {venue: venueId}, loadCategories)
	MappedIn.api.Get('map', {venue: venueId}, loadMaps)

	//initMapView()
}

function loadVenue(results) {
	venue = results[0]
	initPostAPI()
}

function loadNodes(results) {
	for (var node of results) {
		nodes[node.id] = node
	}
	initPostAPI()
}

function loadPolygons(results) {
	for (var polygon of results) {
		polygons[polygon.id] = polygon
	}
	initPostAPI()
}

function loadLocations(results) {
	for (var location of results) {
		locations[location.id] = location
	}
	initPostAPI()
}

function loadCategories(results) {
	for (var category of results) {
		categories[category.id] = category
	}
	initPostAPI()
}

function loadMaps(results) {
	results.sort(function (a, b) {
		return a.elevation - b.elevation
	})

	for (var map of results) {
		maps[map.id] = map
	}
	initPostAPI()
}

function initPostAPI() {
	numAPICalls--
	if (numAPICalls > 0) {
		return
	}

	var canvas = document.getElementById( 'mapView' );
	initMapView(canvas)
}

function initMapView(canvas) {
	renderer = new THREE.WebGLRenderer({canvas: canvas, "antialias": true})


	
	//document.body.appendChild( renderer.domElement );
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'click', onMouseClick, false);

	renderer.setClearColor(0xffffff)
	//renderer.setPixelRatio( window.devicePixelRatio );

	//renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setSize( canvas.width, canvas.height);

	//THREE.ImageUtils.crossOrigin = '*'
	directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	scene.add( directionalLight );

	//var container = document.getElementById( 'container' );
	//canvas.appendChild( renderer.domElement );

	camera.position.z = 1000;
	//cameraOrbit.add(camera)
	//scene.add(cameraOrbit)
	//cameraOrbit.rotation.x = .6

	raycaster.near = 0
	raycaster.far = 10000

	controls = new THREE.OrbitControls(camera, canvas)
	//controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
	controls.enableDamping = true;
 	controls.dampingFactor = 0.25;
	controls.enableZoom = true;

	// Set the default angle
	controls.minPolarAngle = Math.PI - .6
	controls.update()
	
	// Set camera contstraints
	controls.maxPolarAngle = Math.PI - .2
	controls.minPolarAngle = .2
	controls.maxAzimuthAngle = Math.PI / 2 - .2
	controls.minAzimuthAngle = .2 - Math.PI / 2
	controls.minDistance = 100
	controls.maxDistance = 2000

	//controls.rotateUp(.6)
	var mapId = Object.keys(maps)[0]
	var mtl = maps[mapId].scene.mtl
	var obj = maps[mapId].scene.obj

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	//mtlLoader.setBaseUrl( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	//mtlLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.load( mtl, function( materials ) {

		materials.preload();

		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		//objLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
		//objLoader.crossOrigin='*'
		objLoader.load( obj, function ( object ) {
			//object.position.y = 0;
			map = object
			scene.add( object );
		}, onProgress, onError );

	});
	
	render()
}

function onProgress(progress) {
	console.log(progress)
}

function onError(error) {
	console.log(error)
}

function calculateMouseCoordinates() {
	mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
	mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
}

function onMouseMove( event ) {
	event.preventDefault();
	calculateMouseCoordinates()
}

function onMouseClick(event) { 
	event.preventDefault();
	calculateMouseCoordinates()

	var polygon = detectPolygonUnderMouse()

	clearAllPolygonColors()
	if (polygon) {
		onPolygonClick(polygon)
	}

}

function onMouseDown(event) {
	var polygon = detectPolygonUnderMouse()
}

function onPolygonMouseOver(polygon) {
	if (polygon._MIKeepColorUntilCleared) {
		return
	}

	setPolygonColor(polygon, colors.hover, false)
}

function onPolygonMouseOut(polygon) {
	if (polygon._MIKeepColorUntilCleared) {
		return
	}

	clearPolygonColor(polygon)
}

function onPolygonClick(polygon) {
	clearPolygonColor(polygon)
	highlightedPolygons[polygon.name] = polygon
	setPolygonColor(polygon, colors.select, true)
}

function setPolygonColor(polygon, color, keepUntilCleared) {
	if (!polygon._MIOriginalMaterial) {
		polygon._MIOriginalMaterial = polygon.material.clone()
	}

	polygon._MIKeepColorUntilCleared = keepUntilCleared
	polygon.material.color.set(color)
}

function clearPolygonColor(polygon) {
	polygon._MIKeepColorUntilCleared = false

	if (polygon._MIOriginalMaterial) {
		polygon.material = polygon._MIOriginalMaterial.clone()
	}
}

function clearAllPolygonColors() {
	for (var id of Object.keys(highlightedPolygons)) {
		clearPolygonColor(highlightedPolygons[id])
	}
	highlightedPolygons = {}
}

function detectPolygonUnderMouse() {
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children, true);
	return intersects.length && polygons[intersects[0].object.name] && polygons[intersects[0].object.name].entrances ? intersects[0].object : null
}

var lastHover = null
function render() {
	requestAnimationFrame( render );

	// Check if we are hovering over a polygon
	var polygon = detectPolygonUnderMouse()


	if (polygon != lastHover) {
		if (lastHover) {
			onPolygonMouseOut(lastHover)
			lastHover = null 
		}

		if (polygon) {
			lastHover = polygon
			onPolygonMouseOver(polygon)
		}
	}
	

	renderer.render( scene, camera );

}
