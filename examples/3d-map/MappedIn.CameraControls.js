MappedIn.CameraControls = function (camera, canvas) {
	this.camera = camera
	this.canvas = canvas
	this.elevation = camera.parent
	this.orbit = this.elevation.parent

	this.zoomSpeed = 0.5
	this.rotateSpeed = 100

	this.enabled = true
	this.enableZoom = true
	this.enablePan = true
	this.enableRotate = true

	this.minZoom = 100
	this.maxZoom = 10000

	this.minAzimuthAngle = .1
	this.maxAzimuthAngle = 1

	this.mouseButtons = { ORBIT: THREE.MOUSE.RIGHT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.LEFT };
	var scope = this

	var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var rotateScale = new THREE.Vector3();
	var rotateTranslation = new THREE.Vector3();
	var rotateQuaternion = new THREE.Quaternion();

	var rotateDeltaQuaternion = new THREE.Quaternion();
	var rotateDeltaEuler = new THREE.Euler(0, 0, 0, 'XYZ')

	var rotateAxis = new THREE.Vector3();

	var panYScale = 1
	var panXScale = 1

	var clock = new THREE.Clock(true)
	var lastWheelTime = 0

	this.CAMERA_EVENTS = {}
	this.CAMERA_EVENTS.CHANGE_EVENT = { type: 'change' };
	
	//var panning = false
	this.CAMERA_EVENTS.PAN_START_EVENT = { type: 'panStart' };
	this.CAMERA_EVENTS.PAN_END_EVENT = { type: 'panEnd' };

	//var rotating = false
	this.CAMERA_EVENTS.ROTATE_START_EVENT = { type: 'rotateStart' };
	this.CAMERA_EVENTS.ROTATE_END_EVENT = { type: 'rotateEnd' };

	//var zooming = false
	this.CAMERA_EVENTS.ZOOM_START_EVENT = { type: 'zoomStart' };
	this.CAMERA_EVENTS.ZOOM_END_EVENT = { type: 'zoomEnd' };

	var changeEvent = this.CAMERA_EVENTS.CHANGE_EVENT
	var panStartEvent = this.CAMERA_EVENTS.PAN_START_EVENT
	var panEndEvent = this.CAMERA_EVENTS.PAN_END_EVENT
	var rotateStartEvent = this.CAMERA_EVENTS.ROTATE_START_EVENT
	var rotateEndEvent = this.CAMERA_EVENTS.ROTATE_END_EVENT
	var zoomStartEvent = this.CAMERA_EVENTS.ZOOM_START_EVENT
	var zoomEndEvent = this.CAMERA_EVENTS.ZOOM_END_EVENT

	// Public camera manipulation functions
	var pan = function(right, down) {
		if (state ==  STATE.NONE) {
			scope.dispatchEvent(panStartEvent)
		}

		scope.orbit.position.x += right
		scope.orbit.position.y += down

		if (state == STATE.NONE) {
			scope.dispatchEvent(panEndEvent)
		}
	}

	var setPosition = function(x, y) {
		if (state ==  STATE.NONE) {
			scope.dispatchEvent(panStartEvent)
		}

		scope.orbit.position.x = x
		scope.orbit.position.y = y

		if (state ==  STATE.NONE) {
			scope.dispatchEvent(panEndEvent)
		}
	}

	var rotate = function (radians) {
		if (state == STATE.NONE) {
			scope.dispatchEvent(rotateStartEvent)
		}

		scope.orbit.rotation.z += radians

		if (state == STATE.NONE) {
			scope.dispatchEvent(rotateEndEvent)
		}
	}

	var tilt = function(radians) {

		if (state ==  STATE.NONE) {
			scope.dispatchEvent(rotateStartEvent)
		}

		scope.elevation.rotation.x += radians

		if (state == STATE.NONE) {
			scope.dispatchEvent(rotateEndEvent)
		}
	}

	var zoom = function (zoom) {
		//console.log(zoom)

		if (isNaN(zoom)) {
			return
		}

		if (state ==  STATE.NONE) {
			scope.dispatchEvent(zoomStartEvent)
		}

		scope.camera.position.z = Math.min(Math.max(zoom, scope.minZoom), scope.maxZoom)

		if (state == STATE.NONE) {
			scope.dispatchEvent(zoomEndEvent)
		}
	}

	function handleMouseDownRotate( event ) {

		//console.log( 'handleMouseDownRotate' );

		rotateStart.set( event.clientX, event.clientY );

		//scope.rotating = true
		//scope.state = STATE.ROTATE
		scope.dispatchEvent(rotateStartEvent)

	}

	function handleMouseDownDolly( event ) {

		//console.log( 'handleMouseDownDolly' );

		dollyStart.set( event.clientX, event.clientY );

		//scope.zooming = true
		//scope.state = STATE.ZOOM
		scope.dispatchEvent(zoomStartEvent)

	}

	function handleMouseDownPan( event ) {

		//console.log( 'handleMouseDownPan' );
		var mouse = mouseToScene(event)

		panStart.set( mouse.x, mouse.y );

		//scope.panning = true
		//scope.state = STATE.PAN
		scope.dispatchEvent(panStartEvent)

		calculatePanScale()

	}

	function handleMouseMoveRotate( event ) {

		//console.log( 'handleMouseMoveRotate' );

		rotateEnd.set( event.clientX, event.clientY );
		rotateDelta.subVectors( rotateEnd, rotateStart );

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		//rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
		//scope.orbit.rotation.y += -rotateDelta.x / scope.rotateSpeed
		// rotating up and down along whole screen attempts to go 360, but limited to 180
		//rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );
		//scope.orbit.rotation.z += rotateDelta.y / scope.rotateSpeed

		rotate(-rotateDelta.x / scope.rotateSpeed)
		tilt(-rotateDelta.y / scope.rotateSpeed)

		rotateStart.copy( rotateEnd );

		//scope.update();

		scope.dispatchEvent(changeEvent)

	}

	function handleMouseMoveDolly( event ) {

		//console.log( 'handleMouseMoveDolly' );

		dollyEnd.set( event.clientX, event.clientY );

		dollyDelta.subVectors( dollyEnd, dollyStart );

		zoom(dollyDelta.y * scope.zoomSpeed)
		//console.log(dollyDelta)
		dollyStart.copy( dollyEnd );

		//scope.update();

		scope.dispatchEvent(changeEvent)

	}

	function handleMouseMovePan( event ) {

		//console.log( 'handleMouseMovePan' );
		var mouse = mouseToScene(event)
		panEnd.set( mouse.x, mouse.y );

		panDelta.subVectors( panEnd, panStart );

		var angle = scope.orbit.rotation.z
		var x = -panDelta.x * Math.cos(angle) - panDelta.y * Math.sin( angle )
		var y = -panDelta.x * Math.sin(angle) + panDelta.y * Math.cos( angle )


		pan(x / panXScale, y / panYScale)
		//pan(-panDelta.x / panXScale, panDelta.y / panYScale)
		//setPosition(-panDelta.x / panXScale, panDelta.y / panYScale)

		panStart.copy( panEnd );

		//scope.update();

		scope.dispatchEvent(changeEvent)

	}

	function handleMouseWheel( event ) {


		var delta = 0;

		if ( event.wheelDelta !== undefined ) {

			// WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) {

			// Firefox

			delta = - event.detail;

		}
		//console.log("Delta: " + delta)
		//console.log("Zooming to: " + (scope.camera.position.z - (delta * scope.zoomSpeed)))
		zoom(scope.camera.position.z - (delta * scope.zoomSpeed))
		//scope.update();
		scope.dispatchEvent(changeEvent)

	}


	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		if (state == STATE.ZOOM) {
			lastWheel = 0
			scope.dispatchEvent(zoomEndEvent)
		}

		if ( event.button === scope.mouseButtons.ORBIT ) {

			if ( scope.enableRotate === false ) return;

			handleMouseDownRotate( event );

			state = STATE.ROTATE;

		} else if ( event.button === scope.mouseButtons.ZOOM ) {

			if ( scope.enableZoom === false ) return;

			handleMouseDownDolly( event );

			state = STATE.DOLLY;

		} else if ( event.button === scope.mouseButtons.PAN ) {

			if ( scope.enablePan === false ) return;

			handleMouseDownPan( event );

			state = STATE.PAN;

		}

		if ( state !== STATE.NONE ) {

			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			document.addEventListener( 'mouseout', onMouseUp, false );

			//scope.dispatchEvent( startEvent );

		}

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		if ( state === STATE.ROTATE ) {

			if ( scope.enableRotate === false ) return;

			handleMouseMoveRotate( event );

		} else if ( state === STATE.DOLLY ) {

			if ( scope.enableZoom === false ) return;

			handleMouseMoveDolly( event );

		} else if ( state === STATE.PAN ) {

			if ( scope.enablePan === false ) return;

			handleMouseMovePan( event );

		}

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;

		//handleMouseUp( event );

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		document.removeEventListener( 'mouseout', onMouseUp, false );

		//scope.dispatchEvent( endEvent );
		switch (state) {
			case STATE.PAN:
				scope.dispatchEvent(scope.CAMERA_EVENTS.PAN_END_EVENT)
				break
			case STATE.ZOOM:
				scope.dispatchEvent(scope.CAMERA_EVENTS.ZOOM_END_EVENT)
				break
			case STATE.ROTATE:
				scope.dispatchEvent(scope.CAMERA_EVENTS.ROTATE_END_EVENT)
				break
		}

		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ZOOM)) return;

		event.preventDefault();
		event.stopPropagation();
		
		lastWheelTime = clock.startTime
		//console.log( 'handleMouseWheel' );
		if (state != STATE.ZOOM) {
			state = STATE.ZOOM
			scope.dispatchEvent(zoomStartEvent)
		}
		
		handleMouseWheel( event );

	}



	function onTouchStart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: pan

				if ( scope.enableRotate === false ) return;

				//handleTouchStartPan( event );

				state = STATE.TOUCH_PAN;

				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.enableZoom === false ) return;

				//handleTouchStartDolly( event );

				state = STATE.TOUCH_DOLLY;

				break;

			case 3: // three-fingered touch: pan

				if ( scope.enablePan === false ) return;

				//handleTouchStartRotate( event );

				state = STATE.TOUCH_ROTATE;

				break;

			default:

				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) {

			//scope.dispatchEvent( startEvent );

		}

	}

	function onTouchMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.enableRotate === false ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

				handleTouchMoveRotate( event );

				break;

			case 2: // two-fingered touch: dolly

				if ( scope.enableZoom === false ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

				handleTouchMoveDolly( event );

				break;

			case 3: // three-fingered touch: pan

				if ( scope.enablePan === false ) return;
				if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

				handleTouchMovePan( event );

				break;

			default:

				state = STATE.NONE;

		}

	}

	function onTouchEnd( event ) {

		if ( scope.enabled === false ) return;

		handleTouchEnd( event );

		//scope.dispatchEvent( endEvent );

		state = STATE.NONE;

	}

	function onContextMenu( event ) {
		event.preventDefault();

	}

	function calculatePanScale() {

		var sliderScale = 1000
		var originPoint = scope.orbit.position.clone()
		var xPoint = originPoint.clone()
		xPoint.x += sliderScale

		var yPoint = originPoint.clone()
		yPoint.y += sliderScale
		
		//console.log(originPoint)
		//console.log(xPoint)
		//originPoint.project(scope.camera)
		//xPoint.project(scope.camera)
		//yPoint.project(scope.camera)

		vectorToScreen(originPoint)
		vectorToScreen(xPoint)
		vectorToScreen(yPoint)

		//console.log(originPoint)
		//console.log(xPoint)
		
		panXScale = xPoint.distanceTo(originPoint) / (sliderScale)
		panYScale = yPoint.distanceTo(originPoint) / (sliderScale)

		//panXScale = 1
		//panYScale = 1

		//console.log("Scale: " + panXScale + ", " + panYScale)
	}

	function vectorToScreen(vector) {
		vector.project(scope.camera)
		//console.log(vector)

		vector.x =  vector.x * scope.canvas.offsetWidth / 2 - 1;
		vector.y = -vector.y * scope.canvas.offsetHeight / 2 + 1;
		vector.z = 0;
	}

	// This doesn't really do anything anymore
	function mouseToScene(event) {
		var mouse = {}
		//mouse.x = ( event.clientX / scope.canvas.offsetWidth ) * 2 - 1;
		//mouse.y = - ( event.clientY / scope.canvas.offsetHeight ) * 2 + 1;

		mouse.x = event.clientX
		mouse.y = event.clientY
		return mouse
	}

	// Anything we need to do on scene render
	this.update = function() {

		if (lastWheelTime > 0 && state == STATE.ZOOM && clock.startTime - lastWheelTime > 300) {
			lastWheelTime = 0
			state = STATE.NONE
			scope.dispatchEvent(zoomEndEvent)
		}
	}

	this.dispose = function() {

		scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
		scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
		scope.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

		scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		document.removeEventListener( 'mouseout', onMouseUp, false );

		//window.removeEventListener( 'keydown', onKeyDown, false );

		//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

	};

	this.canvas.addEventListener( 'contextmenu', onContextMenu, false );

	this.canvas.addEventListener( 'mousedown', onMouseDown, false );
	this.canvas.addEventListener( 'mousewheel', onMouseWheel, false );
	this.canvas.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

	this.canvas.addEventListener( 'touchstart', onTouchStart, false );
	this.canvas.addEventListener( 'touchend', onTouchEnd, false );
	this.canvas.addEventListener( 'touchmove', onTouchMove, false );
}
MappedIn.CameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );
MappedIn.CameraControls.prototype.constructor = MappedIn.CameraControls;
