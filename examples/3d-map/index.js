// Set Three.js scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
var cameraOrbit = new THREE.Object3D()

var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
var map, controls

var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var renderer = new THREE.WebGLRenderer({"antialias": true});

var polygons = {}
var nodes = {}
var maps = {}
var locations = {}
var categories = {}

var venueId

function init(venueId) {
	MappedIn.api.Get('node', {venue: venueId}, initNodes)
	MappedIn.api.Get('polygon', {venue: venueId}, initPolygons)
	MappedIn.api.Get('location', {venue: venueId}, initLocations)

	//initMapView()
}

function initNodes(results) {
	for (var node of results) {
		nodes[node.id] = node
	}
	console.log(nodes)
}

function initPolygons(results) {
	//return
	for (var polygon of results) {
		polygons[polygon.id] = polygon
	}
	console.log(polygons)
}

function initLocations(results) {
	for (var location of results) {
		locations[location.id] = location
	}
	console.log(locations)
}

function initMapView() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'mousemove', onMouseMove, false );

	renderer.setClearColor(0xffffff)
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight);

	//THREE.ImageUtils.crossOrigin = '*'
	directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	scene.add( directionalLight );

	var container = document.getElementById( 'container' );
	container.appendChild( renderer.domElement );

	camera.position.z = 1000;
	//cameraOrbit.add(camera)
	scene.add(cameraOrbit)
	//cameraOrbit.rotation.x = .6

	raycaster.near = 0
	raycaster.far = 10000

	controls = new THREE.OrbitControls(camera, container)
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

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	mtlLoader.setBaseUrl( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.load( '56e854c2eeed12201c34bb7e.mtl', function( materials ) {

		materials.preload();

		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
		//objLoader.crossOrigin='*'
		objLoader.load( '56e854c4d31f092f0d9668bc.obj', function ( object ) {
			//object.position.y = 0;
			map = object
			scene.add( object );
		}, onProgress, onError );

	});

	render();
}

function onProgress(progress) {
	console.log(progress)
}

function onError(error) {
	console.log(error)
}

function onMouseMove( event ) {
	event.preventDefault();
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

var lastHighlight
var lastHighlightMaterial
function render() {
	requestAnimationFrame( render );

	// find intersections
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children, true);
	//console.log(intersects)
	if (intersects.length > 0) {
		if (lastHighlight != intersects[0]) {
			if (lastHighlight) {
				lastHighlight.material = lastHighlightMaterial
			} 
			lastHighlight = intersects[0].object
			delete lastHighlightMaterial
			lastHighlightMaterial = lastHighlight.material.clone()
			intersects[0].object.material.color.set( 0x0000ff );
		}
	}

	renderer.render( scene, camera );

}
