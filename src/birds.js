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

  addBirds(scene, bounds, drawPath=false) {
    loadObjects(BIRDS).then(r => {
      const obj = r.bird.obj.scene.clone();
      scene.add(obj);

      const points = this.createPath(bounds)
      this.birds.push({
        'obj': obj,
        'path': points,
        'i': 0, // waypoint counter
      });
 
      if (drawPath) {
        const geometry = new three.BufferGeometry().setFromPoints( points );
        const material = new three.LineBasicMaterial( { color: 0xff0000 } );
        const curveObject = new three.Line( geometry, material );
        scene.add(curveObject)
      }
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
    const curve = new three.CatmullRomCurve3(points, true, 'centripetal', 0.1);
    return curve.getSpacedPoints(waypoints);
  }

  update() {
    for (const bird of this.birds) {
      bird.i = bird.i % bird.path.length;
      let next = (bird.i + 1) % bird.path.length;

      bird.obj.position.copy(bird.path[bird.i]);
      bird.obj.lookAt(bird.path[next]);

      bird.i++;
    }
  }
}
