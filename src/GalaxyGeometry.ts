import * as THREE from "three";
export class GalaxyGeometry extends THREE.BufferGeometry {
  constructor(totalPoints: number) {
    super();
    this.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(totalPoints * 3), 3)
    );
    this.setAttribute(
      "a_index",
      new THREE.BufferAttribute(new Float32Array(totalPoints), 1)
    );
    const positions = this.getAttribute("position");
    const indices = this.getAttribute("a_index");
    for (let i = 0; i < totalPoints; i++) {
      positions.setXYZ(i, 0, 0, 0);
      indices.setX(i, i);
    }
    this.computeBoundingSphere();
  }
}
