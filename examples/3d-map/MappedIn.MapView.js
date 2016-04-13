MappedIn.Marker = function (element, shadowElement, anchor) {
	this.element = element
	this.shadowElement = shadowElement
	this.anchor = anchor
}

MappedIn.MapView = function(canvas, venue, callback) {
	this.venue = venue
	this.canvas = canvas
	this.lastHover = null
	this._mapLoadedCallback = callback

	this.highlightedPolygons = {}
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 40, canvas.offsetWidth / canvas.offsetHeight, 10, 20000 );
	//this.cameraOrbit = new THREE.Object3D()
	this.currentMap = null
	this.maps = {}

	this._clock = new THREE.Clock(true)
	this.markerSlop = 5;

	this.markers = []
	this.constraints = {}

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
	this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8);
	this.directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	this.scene.add( this.directionalLight );

	this.camera.position.z = 1000;

	//this.raycaster.near = 0
	//this.raycaster.far = 10000

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
	this.controls.maxDistance = 15000

	//Need to handle multi-maps
	this.currentMap = Object.keys(this.venue.maps)[0]
	this.maps[this.currentMap] = new MappedIn.Map(this.currentMap)
	var mtl = this.venue.maps[this.currentMap].scene.mtl
	console.log(mtl)
	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	mtlLoader.scene = this.scene
	// Set this dynamically later
	mtlLoader.setBaseUrl( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	//mtlLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.load( mtl, this.mtlLoaded.bind(this));


	// Set up physics
	this.engine = Matter.Engine.create({
		render: {
			element: canvas,
		
      		options: {
	            width: canvas.offsetWidth,
	            height: canvas.offsetHeight,
	            background: '#fafafa',
	            wireframeBackground: '#222',
	            hasBounds: false,
	            enabled: true,
	            wireframes: true,
	            showSleeping: true,
	            showDebug: false,
	            showBroadphase: false,
	            showBounds: false,
	            showVelocity: false,
	            showCollisions: false,
	            showAxes: false,
	            showPositions: false,
	            showAngleIndicator: false,
	            showIds: false,
	            showShadows: false
	        }
		}
	})

	this.engine.world.gravity.y = 0
	this.engine.enableSleeping = true
	this.engine.positionIterations = 1 // Costs accuracy, but fix the jiiters when a label is stuck somewhere it doesn't really fit
	//this.engine.timing.timeScale = 0.8

	var wallOptions = {
		isStatic: true
	}

	var walls = [
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, -50, this.canvas.offsetWidth, 100, wallOptions),
		Matter.Bodies.rectangle(-50, this.canvas.offsetHeight / 2, 100, this.canvas.offsetHeight, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, this.canvas.offsetHeight + 50, this.canvas.offsetWidth, 100, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth + 50, this.canvas.offsetHeight / 2, 100, this.canvas.offsetHeight, wallOptions)
	]

	Matter.World.add(this.engine.world, walls)
	//Matter.Events.on(this.engine, "collisionStart", this.onMakerCollisionStart.bind(this))
	//Matter.Events.on(this.engine, "collisionEnd", this.onMakerCollisionStop.bind(this))

	// run the engine
	Matter.Engine.run(this.engine);

	this.render()
}

MappedIn.MapView.prototype.onMakerCollisionStart = function(event) {
	for (pair of event.pairs) {
		console.log(this.constraints[pair.bodyA])
		this.constraints[pair.bodyA].stiffness = .1
		this.constraints[pair.bodyA].length = 20
		this.constraints[pair.bodyB].stiffness = .1
		this.constraints[pair.bodyB].length = 20

	}
}

MappedIn.MapView.prototype.onMakerCollisionStop = function(event) {
	for (pair of event.pairs) {
		console.log(this.constraints[pair.bodyA])
		this.constraints[pair.bodyA].stiffness = 1.0
		this.constraints[pair.bodyA].length = .01
		this.constraints[pair.bodyB].stiffness = 1.0
		this.constraints[pair.bodyB].length = .01
	}
}

MappedIn.MapView.prototype.mtlLoaded = function (materials) {

	console.log(this.venue.maps[this.currentMap].scene.obj)
	materials.preload();
	var mapId = Object.keys(this.venue.maps)[0]
	var obj = this.venue.maps[this.currentMap].scene.obj
	var objLoader = new THREE.OBJLoader();
	objLoader.setMaterials( materials );
	objLoader.load( obj, this.objLoaded.bind(this), this.onDownloadEvent, this.onDownloadEvent)
}

MappedIn.MapView.prototype.onDownloadEvent = function (event) {

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
	element.style.position = 'absolute'

	element._mPosition = position
	element.style.top = "0px"
	element.style.left = "0px"
	//

	this.canvas.appendChild(element)
	this.markers.push(element)

	var anchor = Matter.Bodies.rectangle(0, 0, 10, 10, {
		friction: 1.0,
		frictionStatic: 1,
		frictionAir: 1,
		density: 1000,
		//
		collisionFilter: {
			group: -1,
			mask: 0
		}
	})
	element._mAnchor = anchor

	var shadowElement = Matter.Bodies.rectangle(0, 0, element.offsetWidth + (this.markerSlop * 2), element.offsetHeight + (this.markerSlop * 2) , {
		density: 0.1,
		slop: this.markerSlop,
		//restitution: .1,
		inertia: Infinity,
		sleepThreshold: 1,
		frictionAir: 0.9
		//frictionStatic: 0.8
	})

	element._mShadowElement = shadowElement
	Matter.World.add(this.engine.world, [anchor, shadowElement])
	var constraint = Matter.Constraint.create({
		bodyA: anchor,
		bodyB: shadowElement,
		stiffness: 0.1,
		length: .001

	})
	this.constraints[shadowElement] = constraint
	Matter.World.add(this.engine.world, [constraint])
	this._updateMarkerPosition(element)
}

MappedIn.MapView.prototype.getPositionPolygon = function (polygonId) {
	var target = this.maps[this.currentMap].objectsDictionary[polygonId]
	if(target) {
		// Not true center
		target.geometry.computeBoundingBox()
		console.log(target)
		var box = target.geometry.boundingBox
		return new THREE.Vector3(
			box.min.x + (box.max.x - box.min.x) / 2,
			box.min.y + (box.max.y - box.min.y) / 2,
			box.max.z) // Or min or the middle again
	} else {
		return null
	}
}

MappedIn.MapView.prototype._updateMarkerPosition = function (marker) {

	var projection = marker._mPosition.clone().project(this.camera)

	var origin = Matter.Vector.sub(marker._mShadowElement.bounds.min, marker._mShadowElement.position)

	var width = (marker.offsetWidth + this.markerSlop * 2) / 2
	var height = (marker.offsetWidth + this.markerSlop * 2) / 2

	var left = (projection.x + 1)  / 2 * this.canvas.offsetWidth// - width
	var top = (-projection.y + 1) / 2 * this.canvas.offsetHeight// - height

	if (left < -this.canvas.offsetWidth * .75 || left > this.canvas.offsetWidth * 1.25 || top < -this.canvas.offsetHeight * .75 || top > this.canvas.offsetHeight * 1.25) {
		marker.style.visibility = "hidden"
		return
	} else if (marker.style.visibility == "hidden") {
		marker.style.visibility = "visible"
	}

	var target = Matter.Vector.create(left, top)

	//Matter.Body.setPosition(marker._mAnchor, {x: left, y: top})
	//Matter.Body.setVelocity(marker._mAnchor, {x: 0, y: 0})
	Matter.Body.translate(marker._mAnchor, Matter.Vector.sub(target, marker._mAnchor.bounds.min))
	Matter.Body.setAngularVelocity(marker._mShadowElement, 0)
	//marker._mAnchorP.left = left

	//if (marker._lastPosition)
	marker.style.transform = "translate(" + (marker._mShadowElement.position.x - (marker.offsetWidth / 2)) + "px, " + (marker._mShadowElement.position.y - (marker.offsetHeight /2)) + "px)"
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

	//Matter.Engine.update(this.engine, this._clock.getDelta())

	this.renderer.render( this.scene, this.camera );

}