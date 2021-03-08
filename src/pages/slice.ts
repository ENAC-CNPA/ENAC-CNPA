import { inject } from 'aurelia-framework';
import { Global } from 'global';
import { getLogger } from 'aurelia-logging';
import { ThreeCustomElement, ThreeSliceTool } from 'aurelia-three';
import * as THREE from 'three';
import { AureliaBcf } from 'aurelia-bcf';
import { ThreeToolsService } from 'aurelia-three';
import 'three/examples/js/math/ConvexHull';
import 'three/examples/js/geometries/ConvexGeometry';

const log = getLogger('slice');

@inject(Global, AureliaBcf, ThreeToolsService)
export class Viewer {    

  private three: ThreeCustomElement;

  private searchOpened: boolean = false;
  private themesOpened: boolean = false;
  private filtersOpened: boolean = false;
  private bcfOpened: boolean = false;
  private zoneSelectorOpened: boolean = false;

  public toolsService: ThreeToolsService;
  public slice: ThreeSliceTool;
  
  constructor(private global: Global, private bcf: AureliaBcf) {

  }

  public activate() {

  }

  public attached() {
    this.toolsService = new ThreeToolsService(this.three);
    this.slice = new ThreeSliceTool(this.toolsService);
    setTimeout(() => {
      this.init();
    }, 200);
  }

  public plane: THREE.Plane = new THREE.Plane(new THREE.Vector3(1, 0, 0));

  public init() {
    (this.three.getRenderer() as THREE.WebGLRenderer).setClearColor('#000', 1);
    this.three.getScene().background = new THREE.Color('#000');
    const planeHelper = new THREE.PlaneHelper(this.plane, 100);
    (this.three.getRenderer() as THREE.WebGLRenderer).clippingPlanes = [this.plane];
    this.three.getScene().add(planeHelper);

    const cubeGeometry = new THREE.BoxBufferGeometry(10, 10, 10);
    const cube1 = new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial({color: 'red', opacity: 0.5, transparent: true}));
    const cube2 = new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial({color: 'green', opacity: 0.5, transparent: true}));
    cube2.position.setX(2);
    cube2.position.setY(15);
    const sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(8), new THREE.MeshBasicMaterial({color: 'white', opacity: 0.5, transparent: true, wireframe: true}));
    sphere.position.setZ(18);

    const torusGeometry = new THREE.TorusKnotBufferGeometry( 10, 3, 100, 16 );
    const torusMaterial = new THREE.MeshBasicMaterial( { color: 'lightblue', opacity: 0.5, transparent: true } );
    const torusKnot = new THREE.Mesh( torusGeometry, torusMaterial );
    torusKnot.position.setZ(-18);

    this.three.getScene().add(cube1);
    this.three.getScene().add(cube2);
    this.three.getScene().add(sphere);
    this.three.getScene().add(torusKnot);

    setTimeout(() => {
      this.generateClosures();


      let toffset = 0.1;
      let tnb = 0;
      let roffset = 0.01;
      let rnb = 0;
      setInterval(() => {
        this.removeClosures();
        this.plane.translate(new THREE.Vector3(toffset, 0, 0));
        this.plane.normal.applyAxisAngle(new THREE.Vector3(0, 0, 1), roffset);
        this.generateClosures();
        tnb++;
        rnb++;
        if (tnb > 150) {
          toffset *= -1;
          tnb = -150;
        }
        if (rnb > 200) {
          roffset *= -1;
          rnb = -200;
        }
      }, 10);

    }, 200);

    

  }

  

  public removeClosures() {
    const objToRemove: Array<THREE.Object3D> = [];
    this.three.getScene().traverse((obj) => {
      if (obj.userData.__isSliceClosure) {
        objToRemove.push(obj);
      }
    });
    for (let obj of objToRemove) {
      this.three.getScene().remove(obj);
    }
  }

  public generateClosures() {
    const tool = new SliceTool();
    this.three.getScene().traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData.__isSliceClosure) {
        if (obj.parent && obj.parent instanceof THREE.PlaneHelper) {
          return;
        }
        const closures = tool.generateClosure(obj, this.plane);
        if (closures.length) {
          this.three.getScene().add(...closures);
          this.three.requestRendering();
        }
      }
    });
  }


  public toggleFilters() {
    this.themesOpened = false;
    this.searchOpened = false;
    this.bcfOpened = false;
    this.zoneSelectorOpened = false;
    this.filtersOpened = !this.filtersOpened;

  }
}

export interface OpenPath {
  points: Array<THREE.Vector3>;
  idA: string;
  idB: string;
}

export class SliceTool {

  public closureMaterial: THREE.Material = new THREE.MeshBasicMaterial({color: 'pink', side: THREE.DoubleSide});
  public offsetClosureFromPlane = 0.01;
  public multiplier = 10000;
  public refNormal: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  public xProp = 'x';
  public yProp = 'y';

  private round(v: THREE.Vector3): THREE.Vector3 {
    v.x = Math.round(v.x * this.multiplier) / this.multiplier;
    v.y = Math.round(v.y * this.multiplier) / this.multiplier;
    v.z = Math.round(v.z * this.multiplier) / this.multiplier;
    return v;
  }

  public generateClosure(object: THREE.Mesh, plane: THREE.Plane) {
    const slicePathComposer = new SlicePathComposer();
    let geometry: THREE.BufferGeometry = object.geometry instanceof THREE.BufferGeometry
                        ? object.geometry
                        : new THREE.BufferGeometry().fromGeometry(object.geometry);
    if (geometry.index !== null) {
      geometry = geometry.toNonIndexed();
    }

    const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];
    const length = geometry.attributes.position.array.length;
    const array = geometry.attributes.position.array;
    
    for (let index = 0; index < length; index += 9) {
      let v1: THREE.Vector3 = this.round(new THREE.Vector3(array[index], array[index + 1], array[index + 2]));
      let v2: THREE.Vector3 = this.round(new THREE.Vector3(array[index + 3], array[index + 4], array[index + 5]));
      let v3: THREE.Vector3 = this.round(new THREE.Vector3(array[index + 6], array[index + 7], array[index + 8]));
      v1 = object.localToWorld(v1);
      v2 = object.localToWorld(v2);
      v3 = object.localToWorld(v3);
      faces.push([v1, v2, v3]);
    }
    for (let face of faces) {
      const l1 = new THREE.Line3(face[0], face[1]);
      const l2 = new THREE.Line3(face[1], face[2]);
      const l3 = new THREE.Line3(face[2], face[0]);

      const intersect1 = plane.intersectLine(l1, new THREE.Vector3);
      const intersect2 = plane.intersectLine(l2, new THREE.Vector3);
      const intersect3 = plane.intersectLine(l3, new THREE.Vector3);

      const pathPoints: Array<{
        point: THREE.Vector3,
        p1: THREE.Vector3,
        p2: THREE.Vector3
      }> = [];

      if (intersect1) {
        pathPoints.push({
          point: intersect1,
          p1: l1.start,
          p2: l1.end
        });
      }
      if (intersect2) {
        pathPoints.push({
          point: intersect2,
          p1: l2.start,
          p2: l2.end
        });
      }
      if (intersect3) {
        pathPoints.push({
          point: intersect3,
          p1: l3.start,
          p2: l3.end
        });
      }

      if (pathPoints.length === 3) {
        let distance0 = plane.distanceToPoint(face[0]);
        let distance1 = plane.distanceToPoint(face[1]);
        let distance2 = plane.distanceToPoint(face[2]);
        if (distance0 !== 0 && distance1 === 0 && distance2 === 0) {
          slicePathComposer.addDoublePoints(pathPoints[0].point, pathPoints[0].p1, pathPoints[0].p2, pathPoints[2].point, pathPoints[2].p1, pathPoints[2].p2);
        } else if (distance1 !== 0 && distance0 === 0 && distance2 === 0) {
          slicePathComposer.addDoublePoints(pathPoints[0].point, pathPoints[0].p1, pathPoints[0].p2, pathPoints[1].point, pathPoints[1].p1, pathPoints[1].p2);
        } else if (distance2 !== 0 && distance1 === 0 && distance0 === 0) {
          slicePathComposer.addDoublePoints(pathPoints[2].point, pathPoints[2].p1, pathPoints[2].p2, pathPoints[1].point, pathPoints[1].p1, pathPoints[1].p2);
        }
      }

      if (pathPoints.length === 2) {
        slicePathComposer.addDoublePoints(pathPoints[0].point, pathPoints[0].p1, pathPoints[0].p2, pathPoints[1].point, pathPoints[1].p1, pathPoints[1].p2);
      }
    }

    const meshs: Array<THREE.Mesh> = [];
    for (let path of slicePathComposer.paths) {
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(this.refNormal, plane.normal);
      const matrix = new THREE.Matrix4();
      matrix.makeRotationFromQuaternion(quaternion);
      const pathPoints = path.map((point) => {
        const newPoint = this.round(point.clone().applyMatrix4(matrix));
        return new THREE.Vector2(newPoint[this.xProp], newPoint[this.yProp]);
      });
      const shape = new THREE.Shape(pathPoints);
      const shapeGeometry = new THREE.ShapeBufferGeometry(shape);
      matrix.getInverse(matrix);
      shapeGeometry.applyMatrix(matrix);
      const shapeMesh = new THREE.Mesh(shapeGeometry, this.closureMaterial);
      shapeMesh.userData.__isSliceClosure = true;
      shapeMesh.userData.__originalObject = object;
      shapeMesh.translateOnAxis(plane.normal, plane.constant * -1);
      shapeMesh.translateOnAxis(plane.normal, this.offsetClosureFromPlane);
      meshs.push(shapeMesh);
    }
    return meshs;
  }

}

export class SlicePathComposer {
  
  private openPaths: Array<OpenPath> = [];
  private closedPaths: Array<Array<THREE.Vector3>> = [];

  public get paths(): Array<Array<THREE.Vector3>> {
    return this.closedPaths;
  }

  private idFromPoints(p1: THREE.Vector3, p2: THREE.Vector3) {
    let onefirst: boolean = false;
    if (p1.x < p2.x 
        || p1.x === p2.x && p1.y < p2.y
        || p1.x === p2.x && p1.y === p2.y && p1.z < p2.z) {
          onefirst = true;
    }
    return onefirst
            ? `${p1.x},${p1.y},${p1.z}:${p2.x},${p2.y},${p2.z}`
            : `${p2.x},${p2.y},${p2.z}:${p1.x},${p1.y},${p1.z}`;
  }

  public addDoublePoints(pointA: THREE.Vector3, A1: THREE.Vector3, A2: THREE.Vector3, pointB: THREE.Vector3, B1: THREE.Vector3, B2: THREE.Vector3) {
    const idA = this.idFromPoints(A1, A2);
    const idB = this.idFromPoints(B1, B2);

    let addedToPath: OpenPath | null = null;
    for (let path of this.openPaths) {
      if (path.idA === idA) {
        // add the point B at the beginning
        this.addToPath(path, pointB, 'A', idB);
        addedToPath = path;
        break;
      } else if (path.idA === idB) {
        // add the point A at the beginning
        this.addToPath(path, pointA, 'A', idA);
        addedToPath = path;
        break;
      } else if (path.idB === idA) {
        // add the point B at the end
        this.addToPath(path, pointB, 'B', idB);
        addedToPath = path;
        break;
      } else if (path.idB === idB) {
        // add the point A at the end
        this.addToPath(path, pointA, 'B', idA);
        addedToPath = path;
        break;
      }
    }
    if (addedToPath === null) {
      // create a new OpenPath with these points
      const newPath: OpenPath = {
        points: [pointA, pointB],
        idA,
        idB
      };
      this.openPaths.push(newPath);
    } else {
      // try to close the path
      this.tryToClosePath(addedToPath);
    }
  }

  private addToPath(path: OpenPath, point: THREE.Vector3, position: 'A' | 'B', newId: string) {
    if (position === 'A') {
      path.points.unshift(point);
      path.idA = newId;
    } else if (position === 'B') {
      path.points.push(point);
      path.idB = newId;
    }
  }

  private tryToClosePath(path: OpenPath) {

    // first we try to join this path with another from the openPaths array
    let joinedToPath: OpenPath | null = null;
    for (let otherPath of this.openPaths) {
      if (otherPath === path) {
        continue;
      }
      const points = [].concat(...path.points);
      if (otherPath.idA === path.idA) {
        // add a reversed path to the begining of otherPath
        points.shift();
        points.reverse();
        otherPath.points.unshift(...points.reverse());
        otherPath.idA = path.idB;
        joinedToPath = otherPath;
      } else if (otherPath.idA === path.idB) {
        // add path to the beginning of otherPath
        points.pop();
        otherPath.points.unshift(...points);
        otherPath.idA = path.idA;
        joinedToPath = otherPath;
      } else if (otherPath.idB === path.idA) {
        // add path to the end of otherPath
        points.shift();
        otherPath.points.push(...points);
        otherPath.idB = path.idB;
        joinedToPath = otherPath;
      } else if (otherPath.idB === path.idB) {
        // add a reversed path to the end of otherPath
        points.pop();
        otherPath.points.push(...points.reverse());
        otherPath.idB = path.idA;
        joinedToPath = otherPath;
      }
    }

    if (joinedToPath) {
      // remove the joined path
      const index = this.openPaths.indexOf(path);
      if (index !== -1) {
        this.openPaths.splice(index, 1);
      }
      // try to join the otherPath
      return this.tryToClosePath(joinedToPath);
    }

    if (path.idA === path.idB) {
      const index = this.openPaths.indexOf(path);
      if (index !== -1) {
        this.openPaths.splice(index, 1);
        this.closedPaths.push(path.points);
      }
    }
  }
}
