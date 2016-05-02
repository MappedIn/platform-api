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
	this.cameraElevation = new THREE.Object3D()
	this.cameraElevation.add(this.camera)
	this.cameraOrbit = new THREE.Object3D()
	this.cameraOrbit.add(this.cameraElevation)
	this.scene.add(this.cameraOrbit)
	this.currentMap = null
	this.maps = {}
	this.font = {}

	var fontLoader = new THREE.FontLoader();
	fontLoader.load('externals/droid_sans_regular.typeface.js', function (response) {
		this.font = response;

	}.bind(this))


	this._clock = new THREE.Clock(true)
	this._markerSlop = .5;
	this._markerBuffer = 5

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
	this.directionalLight = new THREE.DirectionalLight( 0xffffff, 1.0);
	this.directionalLight.position.set( 0, 0, .2);
	//directionalLight.castShadow = true
	this.scene.add( this.directionalLight );

	this.camera.position.z = 1000;

	//this.raycaster.near = 0
	//this.raycaster.far = 10000

	this.controls = new MappedIn.CameraControls(this.camera, this.canvas)
	//controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
	this.controls.enableDamping = true;
 	this.controls.dampingFactor = 0.25;
	this.controls.enableZoom = true;

	// Set the default angle
	this.cameraElevation.rotation.x = .6
	//this.controls.update()
	
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
	this.engine.timing.timeScale = 1


	var wallOptions = {
		isStatic: true
	}

	var wallWidth = 100

	var walls = [
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, -wallWidth, this.canvas.offsetWidth, wallWidth * 2, wallOptions),
		Matter.Bodies.rectangle(-wallWidth, this.canvas.offsetHeight / 2, wallWidth * 2, this.canvas.offsetHeight, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth / 2, this.canvas.offsetHeight + wallWidth, this.canvas.offsetWidth, wallWidth * 2, wallOptions),
		Matter.Bodies.rectangle(this.canvas.offsetWidth + wallWidth, this.canvas.offsetHeight / 2, wallWidth * 2, this.canvas.offsetHeight, wallOptions)
	]

	Matter.World.add(this.engine.world, walls)
	//Matter.Events.on(this.engine, "collisionStart", this.onMakerCollisionStart.bind(this))
	//Matter.Events.on(this.engine, "collisionEnd", this.onMakerCollisionStop.bind(this))

	Matter.Events.on(this.engine, "collisionActive", function (event) {
		for (pair of event.pairs) {
			if (this.constraints[pair.bodyA.id]&& this.constraints[pair.bodyB.id]) {
				if (this.constraints[pair.bodyA.id].stiffness > 0.01) {
				//this.constraints[pair.bodyA.id].length *= 1.1
				this.constraints[pair.bodyA.id].stiffness *= .5
				//console.log(this.constraints[pair.bodyA.id])
			//this.constraints[pair.bodyB.id].length++
				}
				if (this.constraints[pair.bodyB.id].stiffness > 0.01) {
					this.constraints[pair.bodyB.id].stiffness *= .5
				//this.constraints[pair.bodyA.id].length *= 1.1
				}
			}
		}
	}.bind(this))

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

	var shadowElement = Matter.Bodies.rectangle(0, 0, element.offsetWidth + (this._markerBuffer * 2), element.offsetHeight + (this._markerBuffer * 2) , {
		density: 0.1,
		slop: this._markerSlop,
		//restitution: .1,
		inertia: Infinity,
		sleepThreshold: 1,
		frictionAir: 0.2,
		frictionStatic: 0.1
	})

	element._mShadowElement = shadowElement
	Matter.World.add(this.engine.world, [anchor, shadowElement])
	var constraint = Matter.Constraint.create({
		bodyA: anchor,
		bodyB: shadowElement,
		stiffness: 0.7,
		length: 1

	})
	this.constraints[shadowElement.id] = constraint
	Matter.World.add(this.engine.world, [constraint])
	this._updateMarkerPosition(element)
	Matter.Body.translate(element._mShadowElement, Matter.Vector.sub(element._mAnchor.position, Matter.Vector.create(1,1)))
}

MappedIn.MapView.prototype.getPositionPolygon = function (polygonId) {
	var target = this.maps[this.currentMap].objectsDictionary[polygonId]
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

MappedIn.MapView.prototype._updateMarkerPosition = function (marker) {

	var projection = marker._mPosition.clone().project(this.camera)

	var origin = Matter.Vector.sub(marker._mShadowElement.bounds.min, marker._mShadowElement.position)

	var width = (marker.offsetWidth + this._markerBuffer * 2) / 2
	var height = (marker.offsetWidth + this._markerBuffer * 2) / 2

	var left = (projection.x + 1)  / 2 * this.canvas.offsetWidth// - width
	var top = (-projection.y + 1) / 2 * this.canvas.offsetHeight// - height

	if (left < -this.canvas.offsetWidth * .20 || left > this.canvas.offsetWidth * 1.2 || top < -this.canvas.offsetHeight * .20 || top > this.canvas.offsetHeight * 1.2) {
		//marker.style.visibility = "hidden"
		if (!marker._oldOpacity) {
			marker._oldOpacity = marker.style.opacity
			marker.style.opacity = 0
		}
		return
	} else if (marker.style.opacity == 0) {
		//marker.style.visibility = "visible"
		marker.style.opacity = marker._oldOpacity
		marker._oldOpacity = null

	}

	var target = Matter.Vector.create(left, top)
	if (this.constraints[marker._mShadowElement.id].length > 1) {
		this.constraints[marker._mShadowElement.id].length *= .9
	}
	if (this.constraints[marker._mShadowElement.id].stiffness < .7) {
		this.constraints[marker._mShadowElement.id].stiffness *= 1.5
	}
	

	//Matter.Body.setPosition(marker._mAnchor, {x: left, y: top})
	//Matter.Body.setVelocity(marker._mAnchor, {x: 0, y: 0})
	Matter.Body.translate(marker._mAnchor, Matter.Vector.sub(target, marker._mAnchor.bounds.min))
	Matter.Body.setAngularVelocity(marker._mShadowElement, 0)
	//marker._mAnchorP.left = left

	//if (marker._lastPosition)
	marker.style.transform = "translate(" + (marker._mShadowElement.position.x - (marker.offsetWidth / 2)) + "px, " + (marker._mShadowElement.position.y - (marker.offsetHeight /2)) + "px)"
}

MappedIn.MapView.prototype.displayTitle = function (location) {
	for (polygon of location.polygons) {
		this.drawText(venue.polygons[polygon.id], location.name)
	}
}

MappedIn.MapView.prototype.drawText = function (polygon, text) {
	// Find longest side
	var max = this.findNodeEntrance(polygon)
		//console.log(text + " :" + max.angle)
		// create text, anchor to center of line
		var textGeo = {}
	    var textGeo = new THREE.TextGeometry( "  " + text + "  ", {
	        font: this.font,
	        size: 20, // font size
	        height: 1, // how much extrusion (how thick / deep are the letters)
	        curveSegments: 1,
	        bevelThickness: 0,
	        bevelSize: 0,
	        bevelEnabled: true
	    });
   		textGeo.computeBoundingBox();

		var textMaterial = new THREE.MeshBasicMaterial( { color: 0x000000} );

		var textMesh = new THREE.Mesh(textGeo,textMaterial)


		//textMesh.position = THREE.Vector3(max.a.x - (venue.maps[this.currentMap].width / 2), -max.a.y + (venue.maps[this.currentMap].height / 2), polygon.geometry.scale.z * 6.5)
		
		var bounds = textMesh.geometry.boundingBox
		var size = new THREE.Vector3(0, 0, 0) 
		size.copy(bounds.max)
		size.sub(bounds.min)

		textMesh.translateX(max.mid.x - (venue.maps[this.currentMap].width / 2))
		textMesh.translateY(-max.mid.y + (venue.maps[this.currentMap].height / 2))
		textMesh.translateZ(polygon.geometry.scale.z * 6.5)
		textMesh.rotation.z = max.angle

		// console.log(max.nodeAngle)
		// console.log((Math.PI / 4))
		// console.log((Math.PI * .75))
		// if (max.nodeAngle < (Math.PI * -.75) || max.nodeAngle > (Math.PI * .75)) {
		// 	//console.log("Sliders")
		// 	if (max.angle < 0) {
		// 		textMesh.rotation.z = max.angle + (Math.PI)
		// 	}
		// 	textMesh.translateX(-size.x - 30)
		// }

		// if (max.nodeAngle < (Math.PI * .5) && max.nodeAngle > 0 && max.angle > 0) {
		// 	//console.log("Alt sliiders")
		// 	textMesh.translateX(-size.x - 30)
		// }
		this.scene.add(textMesh)

		console.log(text)
		console.log(max)

		//textMesh.updateMatrix()

		// loop:
			// Are we still in the polygon?
				// scale corners out in both directions
			// Take last points
			// Scale text
			// Place text

			var material = new THREE.LineBasicMaterial({
				color: 0x0000ff,
				linewidth: 10
			});

			var geometry = new THREE.Geometry();
			geometry.vertices.push(
			 	new THREE.Vector3(max.a.x - (venue.maps[this.currentMap].width / 2), -max.a.y + (venue.maps[this.currentMap].height / 2), polygon.geometry.scale.z * 6.5),
			 	new THREE.Vector3(max.b.x - (venue.maps[this.currentMap].width / 2), -max.b.y + (venue.maps[this.currentMap].height / 2), polygon.geometry.scale.z * 6.5)
			);
			// for (vertex of polygon.vertexes) {
			// 	console.log(polygon.geometry.scale.z)
			// 	geometry.vertices.push(new THREE.Vector3(vertex.x - (venue.maps[this.currentMap].width / 2), -vertex.y + (venue.maps[this.currentMap].height / 2), polygon.geometry.scale.z * 6.5))
			// }

			var line = new THREE.Line( geometry, material );
			this.scene.add( line );

}

MappedIn.MapView.prototype.findLongestSide = function (polygon) {
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
MappedIn.MapView.prototype.findNodeEntrance = function (polygon) {
	var min = {
		length: 1000000, 
		a: new THREE.Vector2(0, 0), 
		b: new THREE.Vector2(0, 0),
		mid: new THREE.Vector2(0, 0),
		node: new THREE.Vector2(0,0),
		face: new THREE.Vector2(0, 0),
		angle: 0,
		nodeAngle: 0
	}
	//console.log(polygon)
	//console.log(this.venue.nodes[polygon.entrances[0].id])
	if (!polygon.entrances) {
		console.log("No entrances on " + polygon.id)
		return min
	}

	if (!this.venue.nodes[polygon.entrances[0].id]) {
		console.log("No node " + polygon.entrances[0].id)
		return min
	}

	if (!this.venue.nodes[polygon.entrances[0].id].paths[0]) {
		console.log("No path on " + this.venue.nodes[polygon.entrances[0].id].id)
		return min
	}

	var node = this.venue.nodes[this.venue.nodes[polygon.entrances[0].id].paths[0].node]

	//console.log(node)

	if (!node) {
		console.log("No link to path from " + this.venue.nodes[polygon.entrances[0].id].paths[0].node)
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
	//console.log(min.a)
	//console.log(min.b)
	// console.log(-Math.PI)
	// console.log(min.angle > -Math.PI)
	// console.log("Node angle: " + min.nodeAngle)
	// //console.log("Face Angle: " + Matter.Vector.angle(min.b, min.a))
	// console.log("Angle: " + min.angle)
	return min
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