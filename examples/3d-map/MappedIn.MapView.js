MappedIn.MapView = function(canvas, venue, callback) {
	this.venue = venue
	this.canvas = canvas
	this.lastHover = null
	this._mapLoadedCallback = callback

	this.highlightedPolygons = {}
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 40, canvas.offsetWidth / canvas.offsetHeight, 0.1, 10000 );
	//this.cameraOrbit = new THREE.Object3D()
	this.currentMap = null
	this.maps = {}

	this.markers = []
	

 	this.mouse = new THREE.Vector2();
	this.raycaster = new THREE.Raycaster();

	this.renderer = new THREE.WebGLRenderer({"antialias": true})
	this._projector = new THREE.Projector()
	
	canvas.appendChild( this.renderer.domElement );

	window.addEventListener( 'mousemove', this.onMouseMove.bind(this), false );
	window.addEventListener( 'click', this.onMouseClick.bind(this), false);

	this.renderer.setClearColor(colors.backgroundColor)
	this.renderer.setSize( canvas.offsetWidth, canvas.offsetHeight );
	//this.renderer.setSize( 500, 500);
	//this.renderer.setPixelRatio( window.devicePixelRatio );

	//THREE.ImageUtils.crossOrigin = '*'
	this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	this.directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	this.scene.add( this.directionalLight );

	this.camera.position.z = 2000;

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
	this.controls.maxDistance = 4000

	//Need to handle multi-maps
	this.currentMap = Object.keys(this.venue.maps)[0]
	this.maps[this.currentMap] = new MappedIn.Map(this.currentMap)
	var mtl = this.venue.maps[this.currentMap].scene.mtl
	

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	mtlLoader.scene = this.scene
	mtlLoader.load( mtl, this.mtlLoaded.bind(this));

	this.render()
}

MappedIn.MapView.prototype.mtlLoaded = function (materials) {

	materials.preload();
	var mapId = Object.keys(this.venue.maps)[0]
	var obj = this.venue.maps[this.currentMap].scene.obj
	var objLoader = new THREE.OBJLoader();
	objLoader.setMaterials( materials );
	objLoader.load( obj, this.objLoaded.bind(this), console.log, console.log)
}

MappedIn.MapView.prototype.objLoaded = function (object) {
	this.scene.add( object );
	//this.maps[this.currentMap].objectsDictionary = {}
	for (child of object.children) {
		this.maps[this.currentMap].objectsDictionary[child.name] = child
	}

	this.maps[this.currentMap].map = object
	this._mapLoadedCallback()
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
		console.log(polygon)
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

MappedIn.MapView.prototype.createMarker = function(text, position, className) {
	var element = document.createElement('div')
	element.className = className
	element.innerHTML = text
	element.style.zIndex = 10
	element.style.position = 'absolute'

	var target = this.maps[this.currentMap].objectsDictionary["56e6cde3c753ca085e000008"]

	// Not true center
	target.geometry.computeBoundingBox()
	var box = target.geometry.boundingBox
	element._mAnchor = new THREE.Vector3(
		box.min.x + (box.max.x - box.min.x) / 2,
		box.min.y + (box.max.y - box.min.y) / 2,
		box.max.z) // Or min or the middle again

	this._updateMarkerPosition(element)

	this.canvas.appendChild(element)
	this.markers.push(element)
}

MappedIn.MapView.prototype._updateMarkerPosition = function (marker) {
	//var projection = this._projector.projectVector(marker._mAnchor, this.camera)
	var projection = marker._mAnchor.project(this.camera)

	var left = ((projection.x + 1) / 2) * this.canvas.offsetWidth
	var top = ((-projection.y + 1) / 2) * this.canvas.offsetHeight

	marker.style.left = left + "px"
	marker.style.top = top + "px"

	console.log(projection)
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

	for (marker of this.markers) {
		this._updateMarkerPosition(marker)
	}


	this.renderer.render( this.scene, this.camera );

}