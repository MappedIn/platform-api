MappedIn.CameraControls = function (camera, canvas) {
	this.camera = camera
	this.canvas = canvas
	this.elevation = camera.parent
	this.orbit = this.elevation.parent

	this.zoomSpeed = 1
	this.rotateSpeed = 100

	this.enabled = true
	this.enableZoom = true
	this.enablePan = true
	this.enableRotate = true

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


	// Public camera manipulation functions
	var pan = function(right, down) {
		scope.orbit.position.x += right
		scope.orbit.position.y += down
	}

	var rotate = function (radians) {

		scope.orbit.rotation.z += radians
	}

	var tilt = function(radians) {
		scope.elevation.rotation.x += radians
	}

	var zoom = function (zoomIncrease) {
		scope.camera.position.z += zoomIncrease
	}

	function handleMouseDownRotate( event ) {

		//console.log( 'handleMouseDownRotate' );

		rotateStart.set( event.clientX, event.clientY );

	}

	function handleMouseDownDolly( event ) {

		//console.log( 'handleMouseDownDolly' );

		dollyStart.set( event.clientX, event.clientY );

	}

	function handleMouseDownPan( event ) {

		//console.log( 'handleMouseDownPan' );

		panStart.set( event.clientX, event.clientY );

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

	}

	function handleMouseMoveDolly( event ) {

		//console.log( 'handleMouseMoveDolly' );

		dollyEnd.set( event.clientX, event.clientY );

		dollyDelta.subVectors( dollyEnd, dollyStart );

		zoom(dollyDelta.y * scope.zoomSpeed)
		//console.log(dollyDelta)
		dollyStart.copy( dollyEnd );

		//scope.update();

	}

	function handleMouseMovePan( event ) {

		//console.log( 'handleMouseMovePan' );

		panEnd.set( event.clientX, event.clientY );

		panDelta.subVectors( panEnd, panStart );

		pan(-panDelta.x, panDelta.y)

		panStart.copy( panEnd );

		//scope.update();

	}


	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

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

		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		//handleMouseWheel( event );
		handleMouseMoveDolly(event)

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

	this.canvas.addEventListener( 'contextmenu', onContextMenu, false );

	this.canvas.addEventListener( 'mousedown', onMouseDown, false );
	this.canvas.addEventListener( 'mousewheel', onMouseWheel, false );
	this.canvas.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

	this.canvas.addEventListener( 'touchstart', onTouchStart, false );
	this.canvas.addEventListener( 'touchend', onTouchEnd, false );
	this.canvas.addEventListener( 'touchmove', onTouchMove, false );
}