import { loadObjects } from './utils';
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

      const [left, bottom, right, top] = bounds;
      const height = 150;
      obj.position.set(right, height, bottom);
      obj.rotation.y = Math.PI * 1.5;
      scene.add(obj);
      this.birds.push(obj);
    });
  }

  update() {
    for (const bird of this.birds) {
      // TODO: implement realistic trajectories
      // please see https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3
      bird.translateX(-1);
      bird.translateZ(2);
    }
  }
}
