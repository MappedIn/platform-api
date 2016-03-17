MappedIn.MapView = function(canvas, venue) {
	this.venue = venue
	this.canvas = canvas
	this.lastHover = null

	this.highlightedPolygons = {}
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
	//this.cameraOrbit = new THREE.Object3D()
	this.map = null
	

 	this.mouse = new THREE.Vector2();
	this.raycaster = new THREE.Raycaster();

	this.renderer = new THREE.WebGLRenderer({canvas: canvas, "antialias": true})


	
	//document.body.appendChild( renderer.domElement );
	window.addEventListener( 'mousemove', this.onMouseMove.bind(this), false );
	window.addEventListener( 'click', this.onMouseClick.bind(this), false);

	this.renderer.setClearColor(colors.backgroundColor)
	this.renderer.setSize( canvas.width, canvas.height);

	//THREE.ImageUtils.crossOrigin = '*'
	this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	this.directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	this.scene.add( this.directionalLight );

	this.camera.position.z = 1000;

	this.raycaster.near = 0
	this.raycaster.far = 10000

	this.controls = new THREE.OrbitControls(this.camera, this.canvas)
	//controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
	this.controls.enableDamping = true;
 	this.controls.dampingFactor = 0.25;
	this.controls.enableZoom = true;

	// Set the default angle
	this.controls.minPolarAngle = Math.PI - .6
	this.controls.update()
	
	// Set camera contstraints
	this.controls.maxPolarAngle = Math.PI - .2
	this.controls.minPolarAngle = .2
	this.controls.maxAzimuthAngle = Math.PI / 2 - .2
	this.controls.minAzimuthAngle = .2 - Math.PI / 2
	this.controls.minDistance = 100
	this.controls.maxDistance = 2000

	
	//Need to handle multi-maps
	var mapId = Object.keys(this.venue.maps)[0]
	var mtl = this.venue.maps[mapId].scene.mtl
	

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	//mtlLoader.setBaseUrl( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	//mtlLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.scene = this.scene
	mtlLoader.load( mtl, this.mtlLoaded.bind(this));
	
	this.render()
}

MappedIn.MapView.prototype.mtlLoaded = function (materials) {

	materials.preload();
	var mapId = Object.keys(this.venue.maps)[0]
	var obj = this.venue.maps[mapId].scene.obj
	var objLoader = new THREE.OBJLoader();
	objLoader.setMaterials( materials );
	objLoader.load( obj, this.objLoaded.bind(this), console.log, console.log)
}

MappedIn.MapView.prototype.objLoaded = function (object) {
	//this.map = object
	this.scene.add( object );
}

MappedIn.MapView.prototype.calculateMouseCoordinates = function() {
	this.mouse.x = ( event.clientX / this.renderer.domElement.width ) * 2 - 1;
	this.mouse.y = - ( event.clientY / this.renderer.domElement.height ) * 2 + 1;
}

MappedIn.MapView.prototype.onMouseMove = function( event ) {
	event.preventDefault();
	this.calculateMouseCoordinates()
}

MappedIn.MapView.prototype.onMouseClick = function(event) { 
	event.preventDefault();
	this.calculateMouseCoordinates()

	var polygon = this.detectPolygonUnderMouse()

	this.clearAllPolygonColors()
	if (polygon) {
		this.onPolygonClick(polygon)
	}

}

MappedIn.MapView.prototype.setPolygonColor = function(polygon, color, keepUntilCleared) {
	if (!polygon._MIOriginalMaterial) {
		polygon._MIOriginalMaterial = polygon.material.clone()
	}

	polygon._MIKeepColorUntilCleared = keepUntilCleared
	polygon.material.color.set(color)
}

MappedIn.MapView.prototype.clearPolygonColor = function(polygon) {
	polygon._MIKeepColorUntilCleared = false

	if (polygon._MIOriginalMaterial) {
		polygon.material = polygon._MIOriginalMaterial.clone()
	}
}

MappedIn.MapView.prototype.clearAllPolygonColors = function() {
	for (var id of Object.keys(this.highlightedPolygons)) {
		this.clearPolygonColor(this.highlightedPolygons[id])
	}
	this.highlightedPolygons = {}
}

MappedIn.MapView.prototype.detectPolygonUnderMouse = function() {
	this.raycaster.setFromCamera(this.mouse, this.camera );
	var intersects = this.raycaster.intersectObjects(this.scene.children, true);
	return intersects.length && this.venue.polygons[intersects[0].object.name] && this.venue.polygons[intersects[0].object.name].entrances ? intersects[0].object : null
}


MappedIn.MapView.prototype.onPolygonMouseOver = function(polygon) {
	if (polygon._MIKeepColorUntilCleared) {
		return
	}

	this.setPolygonColor(polygon, colors.hover, false)
}

MappedIn.MapView.prototype.onPolygonMouseOut = function(polygon) {
	if (polygon._MIKeepColorUntilCleared) {
		return
	}

	this.clearPolygonColor(polygon)
}

MappedIn.MapView.prototype.onPolygonClick = function(polygon) {
	this.clearPolygonColor(polygon)
	this.highlightedPolygons[polygon.name] = polygon
	this.setPolygonColor(polygon, colors.select, true)
}

MappedIn.MapView.prototype.render = function() {
	requestAnimationFrame( this.render.bind(this) );

	// Check if we are hovering over a polygon
	var polygon = this.detectPolygonUnderMouse()


	if (polygon != this.lastHover) {
		if (this.lastHover) {
			this.onPolygonMouseOut(this.lastHover)
			this.lastHover = null 
		}

		if (polygon) {
			this.lastHover = polygon
			this.onPolygonMouseOver(polygon)
		}
	}
	

	this.renderer.render( this.scene, this.camera );

}