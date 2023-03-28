import * as three from 'three';
import { getRandomInt, loadObjects } from './utils';
import bird from './models/stork.glb';

const BIRDS = {
  'bird': { url: bird, scale: 0.2 },
}

export default class Birds {
  constructor(scene, bounds ) {
    this.birds = [];
    this.addBirds(scene, bounds);
  }

  addBirds(scene, bounds) {
    loadObjects(BIRDS).then(r => {
      const obj = r.bird.obj.scene.clone();
      scene.add(obj);

      this.birds.push({
        'obj': obj,
        'path': this.createPath(bounds),
        'i': 0, // counter
      });
    });
  }

  createPath(bounds, curvePoints=5, waypoints=500) {
    const [left, bottom, right, top] = bounds;
    const heightMin = 100;
    const heightMax = 150;

    const points = [];
    for (let i = 0; i < curvePoints; i++) {
      points.push(new three.Vector3(
        getRandomInt(left, right),
        getRandomInt(heightMin, heightMax),
        getRandomInt(bottom, top),
      ))
    }

    // create a closed wavey loop
    const curve = new three.CatmullRomCurve3(points, true);
    return curve.getPoints(waypoints);
  }

  update() {
    for (const bird of this.birds) {
      if (bird.i >= bird.path.length) {
        bird.i = 0;
      }
      bird.obj.position.copy(bird.path[bird.i]);
      bird.i++;
    }
  }
}
