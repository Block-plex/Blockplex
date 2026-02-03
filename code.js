import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import faceTex from "./textures/test.jpg";
import { Vector3 } from 'three';
import * as CANNON from 'cannon-es';

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // m/s²

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

let UIcanvas = document.getElementById('UI');
if(!UIcanvas) {
    UIcanvas = document.createElement('canvas');

    UIcanvas.width = window.innerWidth;
    UIcanvas.height = window.innerHeight;
    UIcanvas.id = "UI";
    document.body.appendChild(UIcanvas);
}

const UIctx = UIcanvas.getContext('2d');

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    UIcanvas.width = window.innerWidth;
    UIcanvas.height = window.innerHeight;
});

UIcanvas.width = window.innerWidth;
UIcanvas.height = window.innerHeight;

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

function createCapsule(radius, height) {
    const sphereShape = new CANNON.Sphere(radius);
    const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);

    // Rotate cylinder to stand upright
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(Math.PI / 2, 0, 0);
    const translation = new CANNON.Vec3(0, 0, 0);

    const compound = new CANNON.Body({ mass: 1 });

    // Add cylinder
    compound.addShape(cylinderShape, translation, quat);

    // Add top sphere
    compound.addShape(sphereShape, new CANNON.Vec3(0, height / 2, 0));

    // Add bottom sphere
    compound.addShape(sphereShape, new CANNON.Vec3(0, -height / 2, 0));

    return compound;
}

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

class Element {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update() {

    }

    draw(ctx) {

    }
}

class Panel extends Element {
    constructor(x, y, width, height, color) {
        super(x, y, width, height);
        this.color = color;
    }

    update() {
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
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

        this.physics = createCapsule(1.5, 12); // radius, height
        this.physics.position.set(x, y, z);
        world.addBody(this.physics);
        this.physics.fixedRotation = true;
        this.physics.updateMassProperties();
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

            part.part.position.set(part.x, part.y, part.z);
            part.part.rotation.set(degToRad(-part.rx), degToRad(-part.ry), degToRad(-part.rz));
        });

    }
}

let keysPressed = {w: false, s: false, a: false, d: false};

document.addEventListener('keydown', function(event) {
   console.log('Key pressed: ' + event.key);
   if (event.key === ' ') {
       //only jump if on ground (vy == 0)
        if (plr.physics.velocity.y < 0.1 && plr.physics.velocity.y > -0.1) {
            plr.physics.velocity.y = 10;
        }
   }
    if (event.key === 'w') {
        keysPressed.w = true;
    }
    if (event.key === 's') {
        keysPressed.s = true;
    }
    if(event.key === 'a') {
        keysPressed.a = true;
    }
    if(event.key === 'd') {
        keysPressed.d = true;
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
    if(event.key === 'a') {
        keysPressed.a = false;
    }
    if(event.key === 'd') {
        keysPressed.d = false;
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
    constructor(width, height, length, x, y, z, whenCollide, color, masss = 0) {
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
        this.physics = new CANNON.Body({
            mass: masss,
            shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2)),
            position: new CANNON.Vec3(x, y, z)
        });
        world.addBody(this.physics);
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
}, 0xFF0000);
const boxCol9 = new CollisionBox(5, 5, 5, 57, 30, 8, function() {}, 0xFF00FF, 1);
const boxCol10 = new CollisionBox(5, 5, 5, 57, 40, 8, function() {}, 0xFF00FF, 1);
const boxCol11 = new CollisionBox(5, 5, 5, 57, 50, 8, function() {}, 0xFF00FF, 1);
const boxCol12 = new CollisionBox(5, 5, 5, 57, 60, 8, function() {}, 0xFF00FF, 1);
const boxCol13 = new CollisionBox(5, 5, 5, 57, 70, 8, function() {}, 0xFF00FF, 1);
const boxCol14 = new CollisionBox(10, 25, 10, 120, -30, 0, function() {
    plr.x = 0;
    plr.y = 0;
    plr.z = 0;
}, 0x00FF00);
const boxCol15 = new CollisionBox(40, 0.5, 1, 100, 70, 0, function() {}, 0xFF00FF, 1);

const lastTime = 0.0;

let fixedTimeStep = 1.0 / 60.0; // seconds

function quaternionToEuler(q) {
    const x = q.x, y = q.y, z = q.z, w = q.w;

    const t0 = 2 * (w * x + y * z);
    const t1 = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(t0, t1);

    let t2 = 2 * (w * y - z * x);
    t2 = Math.max(-1, Math.min(1, t2));
    const pitch = Math.asin(t2);

    const t3 = 2 * (w * z + x * y);
    const t4 = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(t3, t4);

    return { x: roll, y: pitch, z: yaw };
}

function animate(time) {
    box.rotation.x = time / 10000;
    box.rotation.y = time / 20000;
    const delta = (time - lastTime) / 1000; // seconds lastTime = now;

    //plr.y += plr.vy;
    //plr.x += plr.vx;
    //plr.z += plr.vz;

    let arraybox = [boxCol, boxCol2, boxCol3, boxCol4, boxCol5, boxCol6, boxCol7, boxCol8, boxCol9, boxCol10, boxCol11, boxCol12, boxCol13, boxCol14, boxCol15];

    world.step(fixedTimeStep, delta, 3);

    
    for (let i = 0; i < arraybox.length; i++) {
        const box = arraybox[i];
        if (box.physics) {
            box.part.position.copy(box.physics.position);
            box.part.quaternion.copy(box.physics.quaternion);
            box.x = box.physics.position.x;
            box.y = box.physics.position.y;
            box.z = box.physics.position.z;
        }
    }
    
    plr.x = plr.physics.position.x;
    plr.y = plr.physics.position.y;
    plr.z = plr.physics.position.z;
    const euler = quaternionToEuler(plr.physics.quaternion);
    plr.rx = euler.x * (180 / Math.PI);
    plr.ry = euler.y * (180 / Math.PI);
    plr.rz = euler.z * (180 / Math.PI);
    plr.updatePosition();
    /*
    Removing this in favor of cannon-es physics engine
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
    */

    if(keysPressed.w) {
        plr.physics.velocity.z = -10 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.x = -10 * Math.sin(degToRad(cameraLookaroundAngle));
        //let target = -cameraLookaroundAngle - 90;
        //let diff = target - plr.ry;
        //plr.ry += diff * 0.1;
    }
    if(keysPressed.s) {
        plr.physics.velocity.z = 10 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.x = 10 * Math.sin(degToRad(cameraLookaroundAngle));
    }
    if(keysPressed.a) {
        plr.physics.velocity.x = -10 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.z = 10 * Math.sin(degToRad(cameraLookaroundAngle));
    }
    if(keysPressed.d) {
        plr.physics.velocity.x = 10 * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.z = -10 * Math.sin(degToRad(cameraLookaroundAngle));
    }



    //plr.updatePosition();

    camera.position.set(plr.x + 20, plr.y + 5, plr.z);

     //also rotate x and z based on cameraLookaroundAngleX
    const radius = zoom * 20; // Distance from player
        camera.position.x = plr.x + radius * Math.sin(degToRad(cameraLookaroundAngle)) * Math.cos(degToRad(cameraLookaroundAngleX));
        camera.position.z = plr.z + radius * Math.cos(degToRad(cameraLookaroundAngle)) * Math.cos(degToRad(cameraLookaroundAngleX));
    camera.position.y = plr.y + 10 + radius * Math.sin(degToRad(cameraLookaroundAngleX));

    camera.lookAt(plr.x, plr.y, plr.z);

    renderer.render(scene, camera);

    UIctx.clearRect(0, 0, UIcanvas.width, UIcanvas.height);

// Example: draw a crosshair
UIctx.strokeStyle = "white";
UIctx.lineWidth = 2;

const cx = UIcanvas.width / 2;
const cy = UIcanvas.height / 2;

UIctx.beginPath();
UIctx.moveTo(cx - 10, cy);
UIctx.lineTo(cx + 10, cy);
UIctx.moveTo(cx, cy - 10);
UIctx.lineTo(cx, cy + 10);
UIctx.stroke();

// Example: draw player coordinates
UIctx.fillStyle = "white";
UIctx.font = "20px Arial";
UIctx.fillText(`X: ${plr.x.toFixed(2)}`, 20, 30);
UIctx.fillText(`Y: ${plr.y.toFixed(2)}`, 20, 55);
UIctx.fillText(`Z: ${plr.z.toFixed(2)}`, 20, 80);
}


renderer.setAnimationLoop(animate);
