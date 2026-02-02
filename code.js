import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { degToRad } from 'three/src/math/MathUtils.js';
import faceTex from "./textures/test.jpg";
import { Vector3 } from 'three';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const loader = new THREE.TextureLoader();

//mouse dragging
let isDragging = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;

// When mouse button is pressed
document.addEventListener('mousedown', function (e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    document.getElementById('status').textContent = "Dragging started...";
});

document.addEventListener('mousemove', function (e) {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let direction = "";
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? "Right" : "Left";
      } else {
        direction = dy > 0 ? "Down" : "Up";
      }

      console.log(`Dragging ${direction}: dx=${dx}, dy=${dy}`);
      if(Math.abs(dx) > 0) {
        cameraLookaroundAngle += (lastX - e.clientX) * 0.5;
      }
      if(Math.abs(dy) > 0) {
        cameraLookaroundAngleX += (lastY - e.clientY) * 0.5;
      }
      lastY = e.clientY;
      lastX = e.clientX;
    }
});

  // When mouse button is released
document.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      document.getElementById('status').textContent = "Drag ended";
    }
});

let texture = loader.load(
    faceTex,
    (tex) => {
        texture = tex;
        console.log("Texture loaded:", faceTex, tex);
        if (typeof THREE.SRGBColorSpace !== 'undefined') {
            tex.colorSpace = THREE.SRGBColorSpace;
        } else if (typeof THREE.sRGBEncoding !== 'undefined') {
            tex.encoding = THREE.sRGBEncoding;
        }
        // Ensure materials using this texture update
        scene.traverse((obj) => {
            if (obj.isMesh && obj.material && obj.material.map === tex) {
                obj.material.needsUpdate = true;
            }
        });
    },
    undefined,
    (err) => {
        console.error("Texture failed to load:", faceTex, err);
    }
);

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

class Player {
    constructor(scene, x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.rx = 0;
        this.ry = 0;
        this.rz = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.parts = [new PlayerPart(3, 5, 5, 0, 0, 0, scene, 0, 0), new PlayerPart(3, 5, 3, 0, 0, (5 / 2) + 1.5, scene, 0, 1),
            new PlayerPart(3, 5, 3, 0, 0, -((5 / 2) + 1.5), scene, 0, 1),
            new PlayerPart(2, 3, 2, 0, ((5 / 2) + 1.5), 0, scene, 1, 2),
            new PlayerPart(3, 5, 3, 0, -((5 / 2) + 2.5), 1.5, scene, 0, 3),
            new PlayerPart(3, 5, 3, 0, -((5 / 2) + 2.5), -1.5, scene, 0, 3),
            new PlayerPart(3, 3, 3, 2, 4, 0, scene, 2, 3)
        ]
        this.offsets = [{x:0, y:0, z:0}, {x:0, y:0, z:(5 / 2) + 1.5}, {x:0, y:0, z:-((5 / 2) + 1.5)},
            {x:0, y:(5 / 2) + 1.5, z:0}, {x:0, y:-((5 / 2) + 2.5), z:1.5},
            {x:0, y:-((5 / 2) + 2.5), z:-1.5}, {x:2, y:4, z:0}
        ]
    }   

    detectCollision(boxes) {
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            if (box.detectCollision(this.x, this.y, this.z)) {
                return [box.height, box.width, box.length, box.x, box.y, box.z, i];
            }
            if (box.detectCollision(this.x, this.y + 7.5, this.z)) {
                return [box.height, box.width, box.length, box.x, box.y, box.z, i];
            }
            if (box.detectCollision(this.x, this.y - 7.5, this.z)) {
                return [box.height, box.width, box.length, box.x, box.y, box.z, i];
            }
        }
        return [0, 0, 0, 0, 0, 0, 0];
    }

    updatePosition() {
        //update parts
        this.parts.forEach((part, i) => {
            part.x = this.x;
            part.y = this.y + this.offsets[i].y;
            part.z = this.z;

            //also apply player rotation to parts
            part.x += Math.cos(degToRad(this.ry)) * this.offsets[i].x - Math.sin(degToRad(this.ry)) * this.offsets[i].z;
            part.z += Math.sin(degToRad(this.ry)) * this.offsets[i].x + Math.cos(degToRad(this.ry)) * this.offsets[i].z;

            part.rx = this.rx;
            part.ry = -this.ry;
            part.rz = this.rz;

            //math.degtorad doesn't work here for some reason

            part.part.position.set(part.x, part.y, part.z);
            part.part.rotation.set(degToRad(part.rx), degToRad(part.ry), degToRad(part.rz));
        });

    }
}

let keysPressed = {w: false, s: false};

document.addEventListener('keydown', function(event) {
   console.log('Key pressed: ' + event.key);
   if (event.key === ' ') {
       //only jump if on ground (vy == 0)
        if (plr.vy == 0) {
            plr.vy = 0.3;
        }
   }
    if (event.key === 'w') {
        keysPressed.w = true;
    }
    if (event.key === 's') {
        keysPressed.s = true;
        plr.vz = 0.1 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.vx = 0.1 * Math.sin(degToRad(cameraLookaroundAngle));
    }

});

document.addEventListener('keyup', function(event) {
    console.log('Key released: ' + event.key);
    if (event.key === 'w') {
        keysPressed.w = false;
    }
    if (event.key === 's') {
        keysPressed.s = false;
    }
});

let zoom = 1;

//scroll wheel to zoom in/out
document.addEventListener('wheel', function(event) {
    if (event.deltaY < 0) {
        zoom *= 0.9;
    } else {
        zoom *= 1.1;
    }
});

class PlayerPart {
    constructor(width, height, length, x, y, z, scene, shape, parttype) {
        this.width = width;
        this.height = height;
        this.length = length;
        this.x = x;
        this.y = y;
        this.z = z;
        this.rx = 0;
        this.ry = 0;
        this.rz = 0;
        this.partGeo = new THREE.BoxGeometry();
        if(shape == 1) {
            this.partGeo = new THREE.CylinderGeometry();
        }
        if(shape == 2) {
            this.partGeo = new THREE.PlaneGeometry();
            this.partGeo.rotateY(degToRad(90));
            this.partGeo.computeVertexNormals();
        }
        this.partMat = new THREE.MeshStandardMaterial({color: 0xAACCBB})
        if(parttype == 1) {
            this.partMat = new THREE.MeshStandardMaterial({color: 0xDDDD00})
        }else if(parttype == 2) {
            this.partMat = new THREE.MeshStandardMaterial({color: 0xEEEEAA})
        }else if(parttype == 3) {
            this.partMat = new THREE.MeshStandardMaterial({color: 0x55FF33})
        }
        if(shape == 2) {
            this.partMat = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
            });
        }
        this.part = new THREE.Mesh(this.partGeo, this.partMat);
        this.part.position.set(x, y, z);
        this.part.scale.set(width, height, length);
        scene.add(this.part);
    }
}

class CollisionBox {
    constructor(width, height, length, x, y, z, whenCollide, color) {
        this.width = width;
        this.height = height;
        this.length = length;
        this.x = x;
        this.y = y;
        this.z = z;
        this.whenCollide = whenCollide;
        this.partGeo = new THREE.BoxGeometry();
        this.partMat = new THREE.MeshStandardMaterial({color: color, wireframe: false})
        this.part = new THREE.Mesh(this.partGeo, this.partMat);
        this.part.position.set(x, y, z);
        this.part.scale.set(width, height, length);
        scene.add(this.part);
    }

    detectCollision(x, y, z) {
        if (x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
            y > this.y - this.height / 2 && y < this.y + this.height / 2 &&
            z > this.z - this.length / 2 && z < this.z + this.length / 2) {
            return true;
        }
        return false;
    }
}

const plr = new Player(scene, 0, 0, 0);

const axisHelper = new THREE.AxesHelper(3000);
scene.add(axisHelper)

const boxG = new THREE.TorusGeometry();
const boxM = new THREE.MeshStandardMaterial({color: 0x00FF00});
const box = new THREE.Mesh(boxG, boxM);

const planeG = new THREE.PlaneGeometry();
const planeM = new THREE.MeshStandardMaterial({color: 0x00FF00});
const plane = new THREE.Mesh(planeG, planeM);
plane.position.set(10, 0, 0);
scene.add(plane);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

console.log("Texture URL:", faceTex);

let cameraLookaroundAngle = 0;
let cameraLookaroundAngleX = 0;

const boxCol = new CollisionBox(15, 5, 15, 0, -30, 0, function() {}, 0x00FF00);
const boxCol2 = new CollisionBox(10, 5, 10, 20, -30, 0, function() {}, 0x00FF00);
const boxCol3 = new CollisionBox(10, 5, 10, 40, -30, 0, function() {}, 0x00FF00);
const boxCol4 = new CollisionBox(10, 7, 10, 60, -30, 0, function() {}, 0x00FF00);
const boxCol5 = new CollisionBox(10, 25, 10, 80, -30, 0, function() {
    plr.x = 0;
    plr.y = 0;
    plr.z = 0;
}, 0xFFAA00);
const boxCol6 = new CollisionBox(10, 25, 10, 60, -30, 15, function() {}, 0x00FF00);
const boxCol7 = new CollisionBox(10, 25, 10, 60, -30, -15, function() {}, 0x00FF00);
const boxCol8 = new CollisionBox(250, 5, 250, 0, -60, 0, function() {
    plr.x = 0;
    plr.y = 0;
    plr.z = 0;
}, 0xFF00000);

const lastTime = 0.0;

function animate(time) {
    box.rotation.x = time / 10000;
    box.rotation.y = time / 20000;
    const delta = (time - lastTime) / 1000; // seconds lastTime = now;

    plr.vy -= 0.01;
    plr.y += plr.vy;
    plr.x += plr.vx;
    plr.z += plr.vz;

    plr.vx *= 0.6;
    plr.vz *= 0.6;

    let arraybox = [boxCol, boxCol2, boxCol3, boxCol4, boxCol5, boxCol6, boxCol7, boxCol8];

    let col = plr.detectCollision(
        arraybox
    );

    if (col[0] != 0) {
        let heightgoup = col[0] / 2 + 7.5;
        let diff = (col[4] + heightgoup) - plr.y;
        console.log("Collision detected! Height to go up: " + heightgoup + " Diff: " + diff);
        if(diff < 5) {
            plr.vy = 0;
            plr.y = col[4] + heightgoup; // Adjust player position to be on top of the box
        }else {
            //go out of block though other sides (left, right, front, back)
            if(plr.x < col[3] - col[1] / 5) {
                plr.vx = 0;
                plr.x = col[3] - col[1] / 2;
            }
            if(plr.x > col[3] + col[1] / 5) {
                plr.vx = 0;
                plr.x = col[3] + col[1] / 2;
            }
            if(plr.z < col[5] - col[2] / 5) {
                plr.vz = 0;
                plr.z = col[5] - col[2] / 2;
            }
            if(plr.z > col[5] + col[2] / 5) {
                plr.vz = 0;
                plr.z = col[5] + col[2] / 2;
            }
            //plr.vx = 0;
            //plr.x = col[3] - col[1] / 2;
        }
        arraybox[col[6]].whenCollide();
    }

    if(keysPressed.w) {
        plr.vz = -0.3 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.vx = -0.3 * Math.sin(degToRad(cameraLookaroundAngle));
        let target = -cameraLookaroundAngle - 90;
        let diff = target - plr.ry;
        plr.ry += diff * 0.1;
    }
    if(keysPressed.s) {
        plr.vz = 0.3 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.vx = 0.3 * Math.sin(degToRad(cameraLookaroundAngle));
    }

    plr.updatePosition();

    camera.position.set(plr.x + 20, plr.y + 5, plr.z);

     //also rotate x and z based on cameraLookaroundAngleX
    const radius = zoom * 20; // Distance from player
        camera.position.x = plr.x + radius * Math.sin(degToRad(cameraLookaroundAngle)) * Math.cos(degToRad(cameraLookaroundAngleX));
        camera.position.z = plr.z + radius * Math.cos(degToRad(cameraLookaroundAngle)) * Math.cos(degToRad(cameraLookaroundAngleX));
    camera.position.y = plr.y + 10 + radius * Math.sin(degToRad(cameraLookaroundAngleX));

    camera.lookAt(plr.x, plr.y, plr.z);

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);