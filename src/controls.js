import * as three from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

function saveCoordinateToStorage(target, prefix) {
  localStorage.setItem(prefix + ".x", target.x)
  localStorage.setItem(prefix + ".y", target.y)
  localStorage.setItem(prefix + ".z", target.z)
}

function loadCoordinateFromStorage(target, prefix) {
  target.set(
    parseFloat(localStorage.getItem(prefix + ".x")),
    parseFloat(localStorage.getItem(prefix + ".y")),
    parseFloat(localStorage.getItem(prefix + ".z")),
  )
}

export default class Controls {
    constructor(camera, domElement) {
        this.camera = camera;

        this.controls_move = new MapControls(this.camera, domElement);
        this.controls_move.enableDamping = true;
        this.controls_move.dampingFactor = 0.05;
        this.controls_move.screenSpacePanning = false;
        this.controls_move.enableZoom = false;
        this.controls_move.rotateSpeed = 0.5;
        this.controls_move.maxPolarAngle = 0.495 * Math.PI;
        this.controls_move.enablePan = true;

        this.controls_zoom = new TrackballControls(this.camera, domElement);
        this.controls_zoom.noRotate = true;
        this.controls_zoom.noPan = true;
        this.controls_zoom.noZoom = false;
        this.controls_zoom.zoomSpeed = 0.4;
        this.controls_zoom.dynamicDampingFactor = 0.05; // set dampening factor
        this.controls_zoom.minDistance = 10;
        this.controls_zoom.maxDistance = 1000;

        this.loadCameraLocation();
    }

    saveCameraLocation() {
        saveCoordinateToStorage(this.controls_move.target, "target")
        saveCoordinateToStorage(this.camera.position, "camera.position")
        saveCoordinateToStorage(this.camera.rotation, "camera.rotation")
    }

    loadCameraLocation() {
        if (
            localStorage.getItem("camera.position.x") !== null &&
            localStorage.getItem("camera.rotation.x") !== null &&
            localStorage.getItem("target.x") !== null
        ) {
            loadCoordinateFromStorage(this.camera.position, "camera.position")
            loadCoordinateFromStorage(this.camera.rotation, "camera.rotation")
            loadCoordinateFromStorage(this.controls_move.target, "target")
        } else { 
            this.camera.position.set(-50, 200, -50)
            this.controls_move.target.set(150, 0, -100);
            this.controls_move.update();
        }
    }

    update() {
        // synchronize movement and zooming controllers
        let target = new three.Vector3();
        target = this.controls_move.target;
        this.controls_zoom.target.set(target.x, target.y, target.z);

        this.controls_zoom.update();
        this.controls_move.update()

        this.saveCameraLocation();
    }
}
