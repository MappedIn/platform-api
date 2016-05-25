MappedIn.Marker = function (element, shadowElement, anchor) {
	this.element = element
	this.shadowElement = shadowElement
	this.anchor = anchor
}

MappedIn.MapView = function(canvas, venue, callback) {
	var scope = this
	this.venue = venue
	this.canvas = canvas
	var lastHover = null
	var mapLoadedCallback = callback

	this.highlightedPolygons = {}
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 40, this.canvas.offsetWidth / this.canvas.offsetHeight, 10, 20000 );
	
	var cameraElevation = new THREE.Object3D()
	cameraElevation.add(this.camera)
	
	var cameraOrbit = new THREE.Object3D()
	cameraOrbit.add(cameraElevation)
	this.scene.add(cameraOrbit)
	
	this.currentMap = null
	this.maps = {}
	this.font = {}

	var markerSlop = .5;
	var markerBuffer = 5

	var markers = []
	var constraints = {}

	var mouse = new THREE.Vector2();
	var raycaster = new THREE.Raycaster();

	var renderer = new THREE.WebGLRenderer({"antialias": true})
	var projector = new THREE.Projector()


	var onMakerCollisionStart = function(event) {
		for (pair of event.pairs) {
			//console.log(this.constraints[pair.bodyA])
			scope.constraints[pair.bodyA].stiffness = .1
			scope.constraints[pair.bodyA].length = 20
			scope.constraints[pair.bodyB].stiffness = .1
			scope.constraints[pair.bodyB].length = 20

		}
	}

	var onMakerCollisionStop = function(event) {
		for (pair of event.pairs) {
			//console.log(this.constraints[pair.bodyA])
			scope.constraints[pair.bodyA].stiffness = 1.0
			scope.constraints[pair.bodyA].length = .01
			scope.constraints[pair.bodyB].stiffness = 1.0
			scope.constraints[pair.bodyB].length = .01
		}
	}

	var mtlLoaded = function (materials) {

		//console.log(this.venue.maps[this.currentMap].scene.obj)
		materials.preload();
		var mapId = Object.keys(scope.venue.maps)[0]
		var obj = scope.venue.maps[scope.currentMap].scene.obj
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.load( obj, objLoaded, onDownloadEvent, onDownloadEvent)
	}

	var onDownloadEvent = function (event) {

	}

	var objLoaded = function (object) {
		scope.scene.add( object );
		//this.maps[this.currentMap].objectsDictionary = {}
		for (child of object.children) {
			scope.maps[scope.currentMap].objectsDictionary[child.name] = child
			child.material.side = THREE.DoubleSide
			//console.log(child)
		}

		scope.maps[scope.currentMap].map = object
		scope.tryRendering();
		mapLoadedCallback()
	}

	var calculateMouseCoordinates = function() {
		mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
		mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
	}

	var onMouseMove = function( event ) {
		event.preventDefault();
		calculateMouseCoordinates()
		scope.tryRendering();
	}

	var onMouseClick = function(event) { 
		event.preventDefault();
		calculateMouseCoordinates()

		var polygon = detectPolygonUnderMouse()

		scope.clearAllPolygonColors()
		if (polygon) {
			onPolygonClick(polygon)
			//console.log(polygon)
		}

	}

	this.setPolygonColor = function(polygon, color, keepUntilCleared) {
		if (!polygon._MIOriginalMaterial) {
			polygon._MIOriginalMaterial = polygon.material.clone()
		}

		polygon._MIKeepColorUntilCleared = keepUntilCleared
		polygon.material.color.set(color)
		scope.tryRendering();
	}

	this.clearPolygonColor = function(polygon) {
		polygon._MIKeepColorUntilCleared = false

		if (polygon._MIOriginalMaterial) {
			polygon.material = polygon._MIOriginalMaterial.clone()
		}
		scope.tryRendering();
	}

	this.clearAllPolygonColors = function() {
		for (var id of Object.keys(scope.highlightedPolygons)) {
			scope.clearPolygonColor(scope.highlightedPolygons[id])
		}
		highlightedPolygons = {}
		scope.tryRendering();
	}

	var detectPolygonUnderMouse = function() {
		raycaster.setFromCamera(mouse, scope.camera );
		var intersects = raycaster.intersectObjects(scope.scene.children, true);
		return intersects.length && scope.venue.polygons[intersects[0].object.name] && scope.venue.polygons[intersects[0].object.name].entrances ? intersects[0].object : null
	}


	var onPolygonMouseOver = function(polygon) {
		if (polygon._MIKeepColorUntilCleared) {
			return
		}

		scope.setPolygonColor(polygon, colors.hover, false)
	}

	var onPolygonMouseOut = function(polygon) {
		if (polygon._MIKeepColorUntilCleared) {
			return
		}

		scope.clearPolygonColor(polygon)
	}

	var onPolygonClick = function(polygon) {
		scope.clearPolygonColor(polygon)
		scope.highlightedPolygons[polygon.name] = polygon
		scope.setPolygonColor(polygon, colors.select, true)
	}

	var getNodeById = function(polygonId) {
		return scope.scene.getObjectByName(polygonId)
	}

	this.createMarker = function(text, position, className) {
		var element = document.createElement('div')
		element.className = className
		element.innerHTML = text
		element.style.position = 'absolute'

		element._mPosition = position
		element.style.top = "0px"
		element.style.left = "0px"
		//

		scope.canvas.appendChild(element)
		markers.push(element)

		var anchor = Matter.Bodies.rectangle(0, 0, 10, 10, {
			friction: 1.0,
			frictionStatic: 1,
			frictionAir: 1,
			density: 10000,
			//
			collisionFilter: {
				group: -1,
				mask: 0
			}
		})
		element._mAnchor = anchor

		var shadowElement = Matter.Bodies.rectangle(0, 0, element.offsetWidth + (markerBuffer * 2), element.offsetHeight + (markerBuffer * 2) , {
			density: 0.1,
			slop: markerSlop,
			//restitution: .1,
			inertia: Infinity,
			sleepThreshold: 1,
			frictionAir: 0.2,
			frictionStatic: 0.1
		})

		element._mShadowElement = shadowElement
		Matter.World.add(physics.world, anchor)
		var constraint = Matter.Constraint.create({
			bodyA: anchor,
			bodyB: shadowElement,
			stiffness: 0.7,
			length: 1

		})
		element._mConstraint = constraint
		constraints[shadowElement.id] = constraint
		//Matter.World.add(physics.world, [constraint])
		element._mHidden = true
		showMarker(element)
	}

	var showMarker = function(marker) {

		if (marker._mCameraHidden != true && marker._mOffScreen != true && marker._mHidden) {
			marker._mHidden = false
			Matter.World.add(physics.world, marker._mShadowElement)
			Matter.World.add(physics.world, marker._mConstraint)
			//Matter.Body.translate(marker._mShadowElement, Matter.Vector.sub(marker._mAnchor.position, marker._mShadowElement.position))
			updateMarkerPosition(marker)

			Matter.Body.update(marker._mShadowElement, 2.0, 1.0, 0.0)
			
			//Matter.Body.applyForce(marker._mShadowElement, marker._mShadowElement.position, 10000.0)
			marker.style.opacity = 0.8 //marker._oldOpacity
		}
	}

	var hideMarker = function (marker) {
		//console.log(physics.world.bodies)
		if (marker._mHidden != true) {
			marker._mHidden = true
			console.log("Hiding " + marker)
			Matter.World.remove(physics.world, marker._mConstraint)
			Matter.World.remove(physics.world, marker._mShadowElement)
			marker._oldOpacity = marker.style.opacity
			marker.style.opacity = 0
		}
	}

	var onCameraMovementEnd = function() {
		console.log("Showing all markers")
		for (marker of markers) {
			marker._mCameraHidden = false
			showMarker(marker)
		}
	}

	var onCameraMovementStart = function () {
		console.log("Hiding all markers")
		for (marker of markers) {
			marker._mCameraHidden = true
			hideMarker(marker)
		}
	}

	var constraintsFrozen = false
	// Make the contstraints attaching a marker to it's anchor very ridged for tight panning
	var freezeMarkers = function () {
		constraintsFrozen = true
		for (key of Object.keys(constraints)) {
			constraints[key]._oldStiffness = constraints[key].stiffness
			constraints[key].stiffness = 1.0

		}
	}

	// Reset the constraint rigidity
	var thawMarkers = function () {
		constraintsFrozen = false
		for (key of Object.keys(constraints)) {
			constraints[key].stiffness = constraints[key]._oldStiffness

		}
	}

	this.getPositionPolygon = function (polygonId) {
		var target = scope.maps[scope.currentMap].objectsDictionary[polygonId]
		if(target) {
			// Not true center
			target.geometry.computeBoundingBox()
			//console.log(target)
			var box = target.geometry.boundingBox
			return new THREE.Vector3(
				box.min.x + (box.max.x - box.min.x) / 2,
				box.min.y + (box.max.y - box.min.y) / 2,
				box.max.z) // Or min or the middle again
		} else {
			return null
		}
	}

	var updateMarkerPosition = function (marker) {

		var projection = marker._mPosition.clone().project(scope.camera)

		var origin = Matter.Vector.sub(marker._mShadowElement.bounds.min, marker._mShadowElement.position)

		var width = (marker.offsetWidth + markerBuffer * 2) / 2
		var height = (marker.offsetWidth + markerBuffer * 2) / 2

		var left = (projection.x + 1)  / 2 * scope.canvas.offsetWidth// - width
		var top = (-projection.y + 1) / 2 * scope.canvas.offsetHeight// - height

		if (left < -scope.canvas.offsetWidth * .20 || left > scope.canvas.offsetWidth * 1.2 || top < -scope.canvas.offsetHeight * .20 || top > scope.canvas.offsetHeight * 1.2) {
			//marker.style.visibility = "hidden"
			if (!marker._mOffScreen) {
				// marker._oldOpacity = marker.style.opacity
				// marker.style.opacity = 0
				marker._mOffScreen = true
				hideMarker(marker)
			}
			return
		} else if (marker._mOffScreen) {
			//marker.style.visibility = "visible"
			// marker.style.opacity = marker._oldOpacity
			// marker._oldOpacity = null
			marker._mOffScreen = false
			showMarker(marker)

		}

		var target = Matter.Vector.create(left, top)
		if (constraintsFrozen == false) {
			if (constraints[marker._mShadowElement.id].length > 1) {
				constraints[marker._mShadowElement.id].length *= .9
			}
			if (constraints[marker._mShadowElement.id].stiffness < .7) {
				constraints[marker._mShadowElement.id].stiffness *= 1.5
			}
		}
		

		//Matter.Body.setPosition(marker._mAnchor, {x: left, y: top})
		//Matter.Body.setVelocity(marker._mAnchor, {x: 0, y: 0})
		Matter.Body.translate(marker._mAnchor, Matter.Vector.sub(target, marker._mAnchor.bounds.min))
		Matter.Body.setAngularVelocity(marker._mShadowElement, 0)
		//marker._mAnchorP.left = left

		//if (marker._lastPosition)
		marker.style.transform = "translate(" + (marker._mShadowElement.position.x - (marker.offsetWidth / 2)) + "px, " + (marker._mShadowElement.position.y - (marker.offsetHeight /2)) + "px)"
	}

	this.displayTitle = function (location) {
		for (polygon of location.polygons) {
			scope.drawText(venue.polygons[polygon.id], location.name)
		}
	}

	this.drawText = function (polygon, text) {
		// Find longest side
		var max = findNodeEntrance(polygon)

		if (max.length == 0) {
			console.log("Could not draw " + text)
			return
		}
		//console.log(text + " :" + max.angle)
		// create text, anchor to center of line
		var textGeo = {}
		var textGeo = new THREE.TextGeometry(text, {
			font: scope.font,
	        size: 16, // font size
	        height: 1, // how much extrusion (how thick / deep are the letters)
	        curveSegments: 1,
	        bevelThickness: 0,
	        bevelSize: 0,
	        bevelEnabled: true
	    });
		textGeo.computeBoundingBox();

		var textMaterial = new THREE.MeshBasicMaterial( { color: colors.text} );

		var textMesh = new THREE.Mesh(textGeo,textMaterial)

		var bounds = textMesh.geometry.boundingBox
		//console.log(bounds)
		var size = new THREE.Vector3(0, 0, 0) 
		size.copy(bounds.max)
		size.sub(bounds.min)

		textMesh.translateX(max.mid.x - (venue.maps[scope.currentMap].width / 2))
		textMesh.translateY(-max.mid.y + (venue.maps[scope.currentMap].height / 2))
		textMesh.translateZ(polygon.geometry.scale.z * 6.5)

		console.log(text)
		//console.log(max.angle)

		if (max.angle > Math.PI / 2 && max.angle < Math.PI * 1.25 || max.angle < - Math.PI / 2 && max.angle > -Math.PI * 1.25) {
			textMesh.rotation.z = max.angle + (Math.PI)
			textMesh.translateX(-size.x - 20)
			textMesh.translateY(-size.y / 2)
		} else {
			textMesh.rotation.z = max.angle
			textMesh.translateY(-size.y / 2)
			textMesh.translateX(20)
		}

		textMesh.updateMatrix()
		var material = new THREE.LineBasicMaterial({
			color: 0x0000ff,
			linewidth: 10
		});

		var materialBad = new THREE.MeshBasicMaterial( { color: 0xff0000} ); 


		scope.scene.add(textMesh)

		//console.log(textMesh.rotation)
		var rayDirection = new THREE.Vector3(1, 0, 0)
		var rayPosition = new THREE.Vector3(0, 0, 0)
		textMesh.localToWorld(rayPosition.copy(textMesh.position))
		rayPosition.z = 5

		rayDirection.applyQuaternion(textMesh.quaternion)
		var raycaster = new THREE.Raycaster(rayPosition, rayDirection, textMesh.rotation)
		var intersects = raycaster.intersectObject(scope.maps[scope.currentMap].objectsDictionary[polygon.id])

		var distance = size.x + 40

		if (intersects.length > 0) {
			distance = intersects[0].distance
			//console.log("Hit: " + intersects[0].distance)
		} else {
			scope.scene.remove(textMesh)
			//console.log("No intersection")
		}

		if (distance < size.x) {
			//console.log(distance + " too small for " + text + " (" + size.x + ")")
			textMesh.material = materialBad
			scope.scene.remove(textMesh)
		}

	}

	var findLongestSide = function (polygon) {
		var max = {
			length: -1, 
			a: Matter.Vector.create(0, 0), 
			b: Matter.Vector.create(0, 0),
			angle: 0
		}

		for (var i = 0; i < polygon.vertexes.length; i++) {
			var vertex1 = polygon.vertexes[i]
			var vertex2 = polygon.vertexes[(i + 1) %  polygon.vertexes.length]

			var vector1 = Matter.Vector.create(vertex1.x, vertex1.y)
			var vector2 = Matter.Vector.create(vertex2.x, vertex2.y)

			var length = Matter.Vector.magnitude(Matter.Vector.sub(vector2, vector1))
			if (length > max.length) {
				max.length = length
				max.a = Matter.Vector.clone(vector1)
				max.b = Matter.Vector.clone(vector2)
				max.angle = Matter.Vector.angle(vector2, vector1)
			}
		}

		return max
	}
	var twoPi = Math.PI * 2
	var findNodeEntrance = function (polygon) {
		var min = {
			length: 1000000, 
			a: new THREE.Vector2(0, 0), 
			b: new THREE.Vector2(0, 0),
			mid: new THREE.Vector2(0, 0),
			node: new THREE.Vector2(0,0),
			face: new THREE.Vector2(0, 0),
			angle: 0,
			nodeAngle: 0,
			geometry: new THREE.Geometry()
		}
		//console.log(polygon)
		//console.log(this.venue.nodes[polygon.entrances[0].id])

		var polyName = "Nil"
		// try {
		// 	 polyName = this.venue.locations[polygon.locations[0]].name
		// } catch (e) {

		// }

		if (!polygon.entrances) {
			console.log("MAP ERROR: No entrances on " + polygon.id + " (" + polyName + ")")
			//this.setPolygonColor(this.getNodeById(polygon.id), 0xff5000, true) // Orange
			return min
		}

		if (!scope.venue.nodes[polygon.entrances[0].id]) {
			console.log("MAP ERROR: Entrance node " + polygon.entrances[0].id + " on polygon " + polygon.id + " (" + polyName + ") does not exist")
			//this.setPolygonColor(this.getNodeById(polygon.id), 0xffdd00, true) // Yellow
			return min
		}

		if (!scope.venue.nodes[polygon.entrances[0].id].paths[0]) {
			console.log("MAP ERROR: No nodes in path for entrance node " + scope.venue.nodes[polygon.entrances[0].id].id + " on polygon " + polygon.id + " (" + polyName + ")")
			//this.setPolygonColor(this.getNodeById(polygon.id), 0xff28a5, true) // Pink
			return min
		}

		var node = scope.venue.nodes[scope.venue.nodes[polygon.entrances[0].id].paths[0].node]

		//console.log(node)

		if (!node) {
			//this.setPolygonColor(this.getNodeById(polygon.id), 0x00fb7a, true) // Green
			console.log("MAP ERROR: Entrance " + polygon.entrances[0].id + " links to invalid node " + scope.venue.nodes[polygon.entrances[0].id].paths[0].node + " on " + polygon.id + " (" + polyName + ")")
			return min
		}
		var vectorNode = new THREE.Vector2(node.x, node.y)
		var vectorMid = new THREE.Vector2(0, 0)
		var delta = new THREE.Vector2(0, 0)
		//var face = new THREE.Vector2(0, 0)

		var testVector = new THREE.Vector2(0, 0)

		for (var i = 0; i < polygon.vertexes.length; i++) {
			var vertex1 = polygon.vertexes[i]
			var vertex2 = polygon.vertexes[(i + 1) %  polygon.vertexes.length]

			var vector1 = new THREE.Vector2(vertex1.x, vertex1.y)
			var vector2 = new THREE.Vector2(vertex2.x, vertex2.y)

			min.geometry.vertices.push(new THREE.Vector3(vector1.x, vector1.y, polygon.geometry.scale.z * 6))
			
			vectorMid.copy(vector1).add(vector2).divideScalar(2)
			//console.log(vectorMid.divideScalar(2))
			delta.subVectors(vectorMid, vectorNode)
			var length = delta.length(delta)

			if (length < min.length) {
				min.length = length
				min.a.copy(vector1)
				min.b.copy(vector2)
				min.mid.copy(vectorMid)
				min.node.copy(vectorNode)
				//min.nodeAngle = face.subVectors(vectorNode, vectorMid).angle()
				min.face.subVectors(vector2, vector1) // - (Math.PI / 2)
				min.angle = Math.atan2(min.face.x, min.face.y)

				testVector.subVectors(vectorNode, vector1)
				min.nodeAngle = Math.atan2(testVector.x, testVector.y)


			}
		}

		if ((min.angle < min.nodeAngle && (min.angle - min.nodeAngle > -(Math.PI))) || (min.nodeAngle - min.angle < -(Math.PI)  && min.angle > min.nodeAngle )) {	
			min.angle = min.angle - Math.PI	
		} 

		return min
	}

	var render = function() {
		//console.log("Runner: " + runner.enabled)
		console.log("render")
		//requestAnimationFrame( this.render.bind(this) );

		scope.controls.update()

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

		for (marker of markers) {
			updateMarkerPosition(marker)
		}

		//Matter.Engine.update(physics, this._clock.getDelta())

		renderer.render( scope.scene, scope.camera );
		//requestAnimationFrame(this.doRender.bind(this));
		renderFrames--
		if (renderFrames > 0) {
			requestAnimationFrame(render)
		}
	}

	var bonusFrames = 300 // Render this many frames after the last tryRender call to account for physics
	this.tryRendering = function () {
		if (renderFrames <= 0) {
			renderFrames = bonusFrames
			requestAnimationFrame(render)
			return
		} else if (renderFrames < bonusFrames){
			renderFrames = bonusFrames
		}
		
	}

	var fontLoader = new THREE.FontLoader();
	fontLoader.load('externals/droid_sans_regular.typeface.js', function (response) {
		scope.font = response;

	})

	var onCollisionActive = function (event) {
		for (pair of event.pairs) {
			if (constraints[pair.bodyA.id]&& constraints[pair.bodyB.id]) {
				if (constraints[pair.bodyA.id].stiffness > 0.01) {
					//this.constraints[pair.bodyA.id].length *= 1.1
					constraints[pair.bodyA.id].stiffness *= .5
					//console.log(this.constraints[pair.bodyA.id])
					//this.constraints[pair.bodyB.id].length++
				}
			}
			if (constraints[pair.bodyB.id].stiffness > 0.01) {
				constraints[pair.bodyB.id].stiffness *= .5
				//this.constraints[pair.bodyA.id].length *= 1.1	
			}
		}
		//scope.tryRendering()
	}


	//_clock = new THREE.Clock(true)

	
	canvas.appendChild(renderer.domElement );

	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'click', onMouseClick, false);

	renderer.setClearColor(colors.backgroundColor)
	renderer.setSize( canvas.offsetWidth, canvas.offsetHeight );
	//this.renderer.setSize( 500, 500);
	//this.renderer.setPixelRatio( window.devicePixelRatio );

	//THREE.ImageUtils.crossOrigin = '*'
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.3);
	directionalLight.position.set( -150, -150, 350);
	//this.directionalLight.castShadow = true
	this.scene.add( directionalLight );
	
	var hemisphericalLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.77)
	this.scene.add(hemisphericalLight)

	this.camera.position.z = 1000;
	var renderFrames = 0

	//this.raycaster.near = 0
	//this.raycaster.far = 10000

	this.controls = new MappedIn.CameraControls(this.camera, this.canvas)

	this.controls.enableDamping = true;
	this.controls.dampingFactor = 0.25;
	this.controls.enableZoom = true;

	// Set the default angle
	cameraElevation.rotation.x = .6
	//this.controls.update()
	
	// Set camera contstraints
	this.controls.maxPolarAngle = Math.PI - .2
	this.controls.minPolarAngle = .2
	this.controls.maxAzimuthAngle = Math.PI / 2 - .2
	this.controls.minAzimuthAngle = .2 - Math.PI / 2
	this.controls.minDistance = 100
	this.controls.maxDistance = 15000

	this.controls.addEventListener( this.controls.CAMERA_EVENTS.CHANGE_EVENT.type, scope.tryRendering );

	this.controls.addEventListener(this.controls.CAMERA_EVENTS.ZOOM_START_EVENT.type, onCameraMovementStart)
	this.controls.addEventListener(this.controls.CAMERA_EVENTS.ROTATE_START_EVENT.type, onCameraMovementStart)
	this.controls.addEventListener(this.controls.CAMERA_EVENTS.PAN_START_EVENT.type, onCameraMovementStart)
	this.controls.addEventListener(this.controls.CAMERA_EVENTS.ZOOM_END_EVENT.type, onCameraMovementEnd)
	this.controls.addEventListener(this.controls.CAMERA_EVENTS.ROTATE_END_EVENT.type, onCameraMovementEnd)
	this.controls.addEventListener(this.controls.CAMERA_EVENTS.PAN_END_EVENT.type, onCameraMovementEnd)

	//this.controls.addEventListener(this.controls.CAMERA_EVENTS.PAN_START_EVENT.type, freezeMarkers)
	//this.controls.addEventListener(this.controls.CAMERA_EVENTS.PAN_END_EVENT.type, thawMarkers)


	//Need to handle multi-maps
	this.currentMap = Object.keys(this.venue.maps)[0]
	this.maps[this.currentMap] = new MappedIn.Map(this.currentMap)
	var mtl = this.venue.maps[this.currentMap].scene.mtl
	//console.log(mtl)
	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.crossOrigin='*'
	mtlLoader.scene = this.scene
	// Set this dynamically later
	mtlLoader.setBaseUrl( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	//mtlLoader.setPath( 'https://d3j72de684fey1.cloudfront.net/uploads/' );
	mtlLoader.load( mtl, mtlLoaded);


	// Set up physics
	var physics = Matter.Engine.create({
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

	physics.world.gravity.y = 0
	physics.enableSleeping = true
	physics.positionIterations = 1 // Costs accuracy, but fix the jiiters when a label is stuck somewhere it doesn't really fit
	physics.timing.timeScale = 1


	var wallOptions = {
		isStatic: true
	}

	var wallWidth = 100

	// Need to make this responsive
	var walls = [
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, -wallWidth, this.canvas.offsetWidth, wallWidth * 2, wallOptions),
		Matter.Bodies.rectangle(-wallWidth, this.canvas.offsetHeight / 2, wallWidth * 2, this.canvas.offsetHeight, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, this.canvas.offsetHeight + wallWidth, this.canvas.offsetWidth, wallWidth * 2, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth + wallWidth, this.canvas.offsetHeight / 2, wallWidth * 2, this.canvas.offsetHeight, wallOptions)
	]

	Matter.World.add(physics.world, walls)
	//Matter.Events.on(physics, "collisionStart", this.onMakerCollisionStart.bind(this))
	//Matter.Events.on(physics, "collisionEnd", this.onMakerCollisionStop.bind(this))

	Matter.Events.on(physics, "collisionActive", onCollisionActive)
	//Matter.Events.on(physics, "afterTick", scope.tryRendering)
	
	// run the engine
	// Tie this into the render loop someday, if we can
	var runner = Matter.Engine.run(physics);

	this.tryRendering();
}