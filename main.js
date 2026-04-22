import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { N8AOPass } from "n8ao";
import * as CANNON from "cannon-es";


//console.log("imageSrc =", faceTex, typeof faceTex);
//console.log("testImg =", testImg, typeof testImg); // Should be a string URL

let maploaded = false;
let map = [];

let lastTime = 0.0;

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // m/s²

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let cameraLookaroundAngle = 0;
let targetcameraLookaroundAngle = 0;
let cameraLookaroundAngleX = 0;

let socket = new WebSocket("wss://blockplexserver.onrender.com");

let otherPlayers = {};

socket.onopen = () => {
  console.log("Connected to multiplayer server");
};

function radToDeg(radians) {
    // Validate input
    console.log(radians);
    if (typeof radians !== 'number' || isNaN(radians)) {
        //throw new TypeError('Input must be a valid number.');
    }
    return radians * (180 / Math.PI);
}

let myId = null;

class CollisionBox {
    constructor(width, height, length, x, y, z, whenCollide, color, masss = 0, nophysics = false, rx, ry, rz) {
        this.width = width;
        this.height = height;
        this.length = length;
        this.x = x;
        this.y = y;
        this.z = z;
        this.rx = rx;
        this.ry = ry;
        this.rz = rz;
        this.whenCollide = whenCollide;
        this.partGeo = new THREE.BoxGeometry();
        this.partMat = new THREE.MeshStandardMaterial({color: color, wireframe: false})
        this.part = new THREE.Mesh(this.partGeo, this.partMat);
        this.part.castShadow = true;
        this.part.receiveShadow = true;
        this.part.position.set(x, y, z);
        this.part.scale.set(width, height, length);
        this.part.rotation.set(new THREE.Vector3(rx, ry, rz));
        if(!nophysics) {
            this.physics = new CANNON.Body({
                mass: masss,
                shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2)),
                position: new CANNON.Vec3(x, y, z)
            });
            world.addBody(this.physics);
        }
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

socket.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if(data.type === "id") {
    myId = data.id;
  }else if (data.type === "state"){
      if(maploaded) {
        let arraybox = map;
  if (data.boxes) {
    for (let i = 0; i < data.boxes.length; i++) {
      const b = data.boxes[i];
      const mesh = arraybox[i].part;

      mesh.position.set(b.x, b.y, b.z);
      mesh.quaternion.set(b.qx, b.qy, b.qz, b.qw);
      //arraybox[i].physics.position.set(b.x, b.y, b.z);
      //  arraybox[i].physics.quaternion.set(b.qx, b.qy, b.qz, b.qw);
    }
  }
      }
  if(data.players) {
    otherPlayers = data.players;
  }
  }else if(data.type === "chat") {
    console.log("Chat message from " + data.sender + ": " + data.message);
    if(currentScene === chatScene) {
        let newText = new Text(0.025, 0.77 + (0.03 * (currentScene.uielements.length - 3)), data.message, "15px Arial", "#FFFFFF", false, 0.03);
        currentScene.uielements.push(newText);
    }
  }else if(data.type === "map") {

    for (let i = 0; i < data.data.length; i++) {
        const block = data.data[i];

let col = new CollisionBox(
    block.size.x,
    block.size.y,
    block.size.z,
    block.pos.x,
    block.pos.y,
    block.pos.z,
    () => {},
    `rgb(${block.color.r}, ${block.color.g}, ${block.color.b})`,
    0,
    false,
    block.rotation.x,
    block.rotation.y,
    block.rotation.z
);

        map.push(col);
    }
    maploaded = true;

    console.log(data.data);
    console.log("map data loaded!!");
  }
};

let selected = -1;
let behindorc = 0;

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

window.addEventListener("gamepadconnected", (e) => {
    console.log("Controller connected:", e.gamepad);
});

function sendPlayerState() {
    //console.log(myId);
    if (socket.readyState === WebSocket.OPEN && myId) {
        socket.send(JSON.stringify({
        type: "input",
        x: plr.x,
        y: plr.y,
        z: plr.z,
        angle: cameraLookaroundAngle
        }));
        //console.log("Sent player state");
    }
}
setInterval(sendPlayerState, 33); // 30 FPS networking

socket.onclose = () => {
    console.log("Socket closed, reconnecting...");
    setTimeout(() => {
        socket = new WebSocket("wss://blockplexserver.onrender.com");
    }, 1000);
};


UIcanvas.width = window.innerWidth;
UIcanvas.height = window.innerHeight;


const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
)
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const otherPlayerMeshes = {};

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
    if(selectIndex != -1) {
        selected = selectIndex;
        if(behindorc == 1) {
            behindScene.uielements[selectIndex].onclick();
        }else {
            currentScene.uielements[selectIndex].onclick();
        }
    }
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
    }
});

let texture = loader.load(
    "faceTex",
    (tex) => {
        texture = tex;
        // Ensure materials using this texture update
        scene.traverse((obj) => {
            if (obj.isMesh && obj.material && obj.material.map === tex) {
                obj.material.needsUpdate = true;
            }
        });
    },
    undefined,
    (err) => {
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
    constructor(x, y, width, height, properties) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.properties = properties;
    }

    update() {

    }

    prepare(ctx) {
        let width = UIcanvas.width;
        let height = UIcanvas.height;
        this.draw(ctx, this.x * width, this.y * height, this.width * width, this.height * height);
    }

    draw(ctx, x, y, width, height) {

    }

    onhover() {

    }

    onunhover() {
    }

    onclick() {
    }

    onkeydown(type) {

    }
}

class Panel extends Element {
    constructor(x, y, width, height, color, outlinecolor, outline) {
        super(x, y, width, height, {});
        this.color = color;
        this.outlinecolor = outlinecolor;
        this.outline = outline;
    }

    update() {
    }

    draw(ctx, x, y, width, height) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, width, height);
        if(this.outline) {
            ctx.strokeStyle = this.outlinecolor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }
    }
    keydown(type) {
    }
    onhover() {

    }

    onunhover() {
    }
}

class Button extends Element {
    constructor(x, y, width, height, color, outlinecolor, text, onclick, hovercolor, properties) {
        super(x, y, width, height, properties);
        this.color = color;
        this.outlinecolor = outlinecolor;
        this.text = text;
        this.hover = false;
        this.hovercolor = hovercolor;
        this.onclick = onclick;
    }
    update() {
    }
    draw(ctx, x, y, width, height) {
        ctx.fillStyle = this.color;
        if(this.hover) {
            ctx.fillStyle = this.hovercolor;
        }
        let width2 = width;
        let height2 = height;
        if(this.properties.xAspect) {
            height2 = width;
        }
        ctx.fillRect(x, y, width2, height2);
        ctx.strokeStyle = this.outlinecolor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "#000000";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.text, x + width / 2, y + height / 2 + 7);
    }

    onhover() {
        this.hover = true;
    }

    onunhover() {
        this.hover = false;
    }

    onclick() {
        console.log("Button clicked: " + this.text);
    }
    keydown(type) {
    }
}

function loadAnimations(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    let animations = {};
    let currentAnim = null;
    let inpivot = false;
    let currentFrame = null;

    for (let line of lines) {
      /*
        if(line.startsWith("PIVOT")) {
          inpivot = true;
        }

        if(inpivot && line.startsWith("}")) {
          inpivot = false;
        }

        if(inpivot) {
          continue;
        }
      */

        if (!currentAnim) {
            // animation name
            currentAnim = { name: line, frames: [], pivots: []};
            animations[line] = currentAnim;
            continue;
        }

        if (!currentFrame && !line.startsWith("}")) {
            // new frame number
            currentFrame = {};
            continue;
        }

        if (line === "}") {
            if (currentFrame) {
                currentAnim.frames.push(currentFrame);
                currentFrame = null;
            } else {
                // end of animation
                currentAnim = null;
            }
            continue;
        }

        // USE keyword
        if (line.startsWith("USE")) {
            const frameIndex = parseInt(line.split(" ")[1]) - 1;
            currentFrame = { ...currentAnim.frames[frameIndex] };
            continue;
        }

        // body part line
        const [part, x, y, z, rx, ry] = line.split(" ");
        currentFrame[part] = {
            x: parseFloat(x),
            y: parseFloat(y),
            z: parseFloat(z),
            rx: parseFloat(rx),
            ry: parseFloat(ry)
        };
    }

    return animations;
}


async function loadAnimationFile(path) {
    const res = await fetch(path);
    const text = await res.text();
    return loadAnimations(text); // your parser
}

class Text extends Element {
    constructor(x, y, text, font = "20px Arial", color = "#000000", centered = false, relative = 0.1, fonttype = "Verdana") {
        super(x, y, 0, 0, {});
        this.text = text;
        this.font = font;
        this.relative = relative;
        this.color = color;
        this.fonttype = fonttype;
        this.centered = centered;
    }
    update() {
    }
    draw(ctx, x, y, width, height) {
        ctx.fillStyle = this.color;
        let size = parseInt(this.relative * window.innerHeight);
        ctx.font = size + "px " + this.fonttype
        console.log(size + "px " + this.fonttype);
        if(this.centered) {
            ctx.textAlign = "center";
            ctx.fillText(this.text, x + width / 2, y + height / 2 + 7);
        } else {
            ctx.textAlign = "left";
            ctx.fillText(this.text, x, y);
        }
    }
    keydown(type) {
    }
    onhover() {

    }

    onunhover() {
    }
}

class TextBox extends Element {
    constructor(x, y, width, height, text, font = "20px Arial", color = "#000000", outlinecolor = "#000000", outline = true, centered = false) {
        super(x, y, width, height, {});
        this.text = text;
        this.font = font;
        this.color = color;
        this.outlinecolor = outlinecolor;
        this.outline = outline;
        this.input = text;
        this.centered = centered;
    }

    update() {
    }

    draw(ctx, x, y, width, height) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, width, height);
        if(this.outline) {
            ctx.strokeStyle = this.outlinecolor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }
        ctx.fillStyle = "#000000";
        ctx.font = this.font;
        if(this.centered) {
            ctx.textAlign = "center";
            ctx.fillText(this.input, x + width / 2, y + height / 2 + 7);
        } else {
            ctx.textAlign = "left";
            ctx.fillText(this.input, x, y + height / 2 + 7);
        }
    }

    keydown(type) {
        if(type === "Backspace") {
            this.input = this.input.slice(0, -1);
        } else {
            if(type.length === 1) {
                this.input = this.input + type;
            }
        }
    }
    onhover() {

    }

    onunhover() {
    }
}

class ImageElement extends Element {
    constructor(x, y, width, height, imageSrc, properties) {
        super(x, y, width, height, properties);
        this.imageSrc = imageSrc;
        this.img = null; // Start as null, not the string
                    
        const imgC = new Image();
        imgC.src = this.imageSrc;
        imgC.onload = () => {
            this.img = imgC;
            console.log("Image loaded successfully:", this.imageSrc);
        };
        imgC.onerror = () => {
            console.error("FAILED TO LOAD IMAGE:", this.imageSrc);
        };
    }

    draw(ctx, x, y, width, height) {
        let width2 = width;
        let height2 = height;
        if(this.properties.xAspect) {
            height2 = width2;
        }
        if(this.properties.yAspect) {
            width2 = height2;
        }
        if(this.img && this.img instanceof Image) {
            ctx.drawImage(this.img, x, y, width2, height2);
        } else if (!this.img) {
            console.log("Image still loading:", this.imageSrc);
        }
    }
    onhover() {

    }

    onunhover() {
    }
}

function detectUsername(username) {

    if(username[0] == "_" || username[username.length - 1] == "_") {
        return "Usernames cannot start or end with underscores!";
    }

    if(username.length < 3 || username.length > 16) {
        return "Usernames must be between 3 and 16 characters long!";
    }

    for (let i = 0; i < username.length; i++) {
        if(username[i] === " ") {
            return "Usernames cannot contain spaces!";
        }
        if(username[i] === "@" || username[i] === "#" || username[i] === "$" || username[i] === "%" || username[i] === "^" || username[i] === "&" || username[i] === "*" || username[i] === "(" || username[i] === ")" || username[i] === "+" || username[i] === "=" || username[i] === "{" || username[i] === "}" || username[i] === "[" || username[i] === "]" || username[i] === "|" || username[i] === "\\" || username[i] === "/" || username[i] === "<" || username[i] === ">" || username[i] === "~" || username[i] === "`") {
            return "Usernames cannot contain symbols except underscores!";
        }
    }

    return "";
}

class Scene {
    constructor(uielements, vx, vy, vwidth, vheight) {
        this.uielements = uielements;
        this.vx = vx;
        this.vy = vy;
        this.vwidth = vwidth;
        this.vheight = vheight;
    }

    drawUI(ctx) {
        this.uielements.forEach(element => {
            element.prepare(ctx);
        });
    }
}

let cId = 0;

class Item {
    constructor(name) {
        this.id = cId;
        this.name = name;
        cId++;
    }

    update() {

    }
}

let username = "";

class Part extends Item {
    constructor(name, x, y, z, width, height, length) {
        super(name);
        this.x = x; this.y = y; this.z = z; this.width = width; this.height = height; this.length = length;
        this.box = new CollisionBox(width, height, length, x, y, z, function() {}, "rgb(128, 255, 128)", 0, false);
    }

    update() {

    }
}

class GameStorage {
    constructor() {
        this.items = [new Part("Baseplate", 0, -5, 0, 5, 5, 5)];
    }
}

let uielements = [];

//add element
//uielements.push(new Panel(0.1, 0.1, 0.1, 0.1, 'rgba(0, 0, 0, 1.0)', '#FFFFFF', true));
//uielements.push(new Button(0.1, 0.2, 0.1, 0.1, 'rgba(200, 200, 200, 1.0)', '#000000', 'Click Me', function() {
//    console.log("Button was clicked!");
//}));
//uielements.push(new Text(0.1, 0.3, "Hello World!", "30px Arial", "#FF0000"));
//uielements.push(new TextBox(0.1, 0.4, 0.1, 0.1, "", "20px Arial", "#FFFFFF", "#FFFFFF", true));

uielements.push(new Panel(0, 0, 1, 1, 'rgb(20, 20, 20, 1.0)', '#FFFFFF', false));
uielements.push(new Text(0.5, 0.3, "Welcome to Blockplex!", "30px Verdana", "#FFFFFF", true, true, 0.08));

uielements.push(new Panel(0.4, 0.35, 0.2, 0.5, "rgb(50, 50, 50)", '#BBBBBB', true));
uielements.push(new Text(0.5, 0.39, "Type name here: ", "20px Arial", "#FFFFFF", true, true, 0.04, "Arial"));
uielements.push(new TextBox(0.45, 0.41, 0.1, 0.05, "xbox_untype", "20px Arial", "#AAAAAA", "#FFFFFF", true));

uielements.push(new Text(0.5, 0.47, "Press W/A/S/D to move, Space to jump, and use mouse to look around!", "11px Arial", "#FFFFFF", true, 0.012, "Arial"));
uielements.push(new Text(0.5, 0.49, "This is a demo of the UI system. Click the text box and type something!", "11px Arial", "#FFFFFF", true, 0.012, "Arial"));
uielements.push(new Text(0.5, 0.51, "Click below to play:", "11px Arial", "#FFFFFF", true, 0.012, "Arial"));

uielements.push(new Button(0.45, 0.53, 0.1, 0.05, 'rgb(40, 245, 15)', '#225522', 'Play', function() {
    let usernameT = uielements[4].input;
    let error = detectUsername(usernameT);
    if(error !== "") {
        uielements[9].text = error;
    } else {
        uielements[9].text = "";
        console.log("Playing as: " + usernameT);
        currentScene = pickScene;
        username = usernameT;
        //socket.send(JSON.stringify({type: "setUsername", username: username}));
    }
}, 'rgb(40, 205, 15)', {}));

uielements.push(new Text(0.5, 0.6, "", "11px Arial", "#FF0000", true, true, 0.015, "Arial"));

let s = new Scene(uielements, 0, 0, window.innerWidth, window.innerHeight);

let chatuielements = [];

chatuielements.push(new Panel(0.02, 0.73, 0.25, 0.25, 'rgb(64, 64, 64, 0.7)', '#FFFFFF', false));
chatuielements.push(new TextBox(0.025, 0.95, 0.2, 0.03, "", "15px Arial", "rgb(200, 200, 200, 0.9)", "#FFFFFF", true, false));
chatuielements.push(new Button(0.23, 0.95, 0.04, 0.03, 'rgb(100, 200, 100)', '#004400', 'Send', function() {
    let message = chatuielements[1].input;
    if(message.length > 0) {
        console.log("Sending message: " + message);
        sendChatMessage(message);
        chatuielements[1].input = "";
    }
}, 'rgb(80, 160, 80)', {}));

let chatScene = new Scene(chatuielements, 0, 0, window.innerWidth, window.innerHeight);

//color, outlinecolor, text, onclick, hovercolor

let menuType = 6;
let serverIn = 0;

let pickScene = new Scene([
    new Panel(0, 0, 0.05, 1, 'rgb(220, 220, 220, 1.0)', '#FFFFFF', false),
    new Panel(0, 0, 1, 0.07, 'rgb(220, 220, 220, 1.0)', '#FFFFFF', false),
    new Text(0, 0.06, "Blockplex", "55px Verdana", "rgb(0, 0, 0, 1.0)", false, 0.05, "Verdana"),
    new Button(0, 0.08, 0.05, 0.1, "rgb(220, 220, 220, 1.0)", "rgb(220, 220, 220, 1.0)", "", function() {menuType = 0}, "rgb(240, 240, 240, 1.0)", {xAspect: true}),
    new ImageElement(0, 0.08, 0.05, 0.2, "./home.png", {xAspect: true}),
    new Button(0, 0.28, 0.05, 0.1, "rgb(220, 220, 220, 1.0)", "rgb(220, 220, 220, 1.0)", "", function() {menuType = 1}, "rgb(240, 240, 240, 1.0)", {xAspect: true}),
    new ImageElement(0, 0.28, 0.05, 0.2, "./search.png", {xAspect: true}),
    new Button(0, 0.48, 0.05, 0.1, "rgb(220, 220, 220, 1.0)", "rgb(220, 220, 220, 1.0)", "", function() {menuType = 2}, "rgb(240, 240, 240, 1.0)", {xAspect: true}),
    new ImageElement(0, 0.48, 0.05, 0.2, "./create.png", {xAspect: true}),
    new Button(0, 0.68, 0.05, 0.1, "rgb(220, 220, 220, 1.0)", "rgb(220, 220, 220, 1.0)", "", function() {menuType = 3}, "rgb(240, 240, 240, 1.0)", {xAspect: true}),
    new ImageElement(0, 0.68, 0.05, 0.2, "./avatar.png", {xAspect: true}),
], 0, 0, window.innerWidth, window.innerHeight);

let homeScene = new Scene([
    new Panel(0, 0, 1, 1, 'rgb(20, 20, 20, 1.0)', '#FFFFFF', false),
    new Text(0.07, 0.14, "Welcome, {unreferenced varible, please use after init}"+"!", "", "rgb(230, 230, 230, 1.0)", false, 0.05, "Verdana"),
    new Button(0.08, 0.16, 0.08, 0.2, "rgb(90, 90, 90, 1.0)", "rgb(90, 90, 90, 1.0)", "", function() {menuType = 4}, "rgb(110, 110, 110, 1.0)", {}),
    new ImageElement(0.08, 0.16, 0.08, 0.2, "./game.png", {xAspect: true}),
    new Text(0.08, 0.36, "Test", "", "rgb(255, 255, 255, 1.0)", false, 0.04, "Arial")
], 0, 0, window.innerWidth, window.innerHeight);

let searchScene = new Scene([
    new Panel(0, 0, 1, 1, 'rgb(20, 20, 20, 1.0)', '#FFFFFF', false),
    new Text(0.07, 0.14, "This tab is still in beta!", "", "rgb(230, 230, 230, 1.0)", false, 0.05, "Verdana"),
], 0, 0, window.innerWidth, window.innerHeight);

let createScene = new Scene([
    new ImageElement(0, 0, 1, 1, "./create_tab.png", {}),
    new Text(0.5, 0.3, "Start creating games now", "", "rgb(255, 255, 255, 1.0)", true, 0.1, "Verdana"),
    new Button(0.5 - 0.1, 0.5 - 0.05, 0.2, 0.1, "rgb(0, 200, 50, 1.0)", "", "Start", function() {}, "rgb(0, 150, 25, 1.0)", {})
], 0, 0, window.innerWidth, window.innerHeight);

let creatorScene = new Scene([
    new Panel(0, 0, 1, 0.05, "rgb(64, 64, 64)", "", false),
    new Panel(0, 0.05, 0.2, 0.95, "rgb(128, 128, 128)", "", false),
    new Panel(0.865, 0.05, 0.5, 0.95, "rgb(128, 128, 128)", "", false),
    new Panel(0.2, 0.8, 0.665, 0.2, "rgb(140, 140, 140)", "", false)
], window.innerWidth / 5, (window.innerHeight / 5), window.innerWidth / 1.5, window.innerHeight / 1.25);

let game = new GameStorage();

let behindScene = homeScene;
let currentScene = s;

let animations = await loadAnimationFile("player.anbpx");

let pivots = {"body": {"x":0, "y":0, "z":0}, "arm1": {"x":0, "y":-2, "z":0}, "arm2": {"x":0, "y":-2, "z":0}, 
              "leg1": {"x":0, "y":-2, "z":0}, "leg2": {"x":0, "y":-2, "z":0}, "head": {"x":0, "y":-1, "z":0}}

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
        ]
        this.orioffsets = [
            {x:0, y:0, z:0}, 
            {x:0, y:0, z:(5 / 2) + 1.5}, {x:0, y:0, z:-((5 / 2) + 1.5)},
            {x:0, y:(5 / 2) + 1.5, z:0}, 
            {x:0, y:-((5 / 2) + 2.5), z:1}, {x:0, y:-((5 / 2) + 2.5), z:-1}
        ]
        this.offsets = [{x:0, y:0, z:0}, 
            {x:0, y:0, z:(5 / 2) + 1.5}, {x:0, y:0, z:-((5 / 2) + 1.5)},
            {x:0, y:(5 / 2) + 1.5, z:0}, 
            {x:0, y:-((5 / 2) + 2.5), z:1}, {x:0, y:-((5 / 2) + 2.5), z:-1}
        ]

        this.physics = createCapsule(1.5, 12); // radius, height
        this.physics.position.set(x, y, z);
        world.addBody(this.physics);
        this.physics.fixedRotation = true;
        this.physics.updateMassProperties();

        this.currentAnimation = "walk";
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 0.4; // seconds per frame
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
    this.x = this.physics.position.x;
    this.y = this.physics.position.y;
    this.z = this.physics.position.z;

    const anim = animations[this.currentAnimation];
    const partNames = ["body", "arm1", "arm2", "head", "leg1", "leg2"];

    const playerYaw = degToRad(this.ry);
    const cameraYaw = degToRad(targetcameraLookaroundAngle - 90);

    for (let i = 0; i < this.parts.length; i++) {
        const part = this.parts[i];
        const partName = partNames[i];
        let body = anim.frames[this.currentFrame][partNames[i]]

        // 1. local offset
        let lx = this.orioffsets[i].x + this.offsets[i].x;
        let ly = this.orioffsets[i].y + this.offsets[i].y;
        let lz = this.orioffsets[i].z + this.offsets[i].z;

        // 3. apply animation rotations (local space)
        const v = new THREE.Vector3(lx, ly, lz);

        const rx = degToRad(part.rx);
        const ry = degToRad(part.ry);
        const rz = degToRad(part.rz);

        // 5. rotate whole player (playerYaw + cameraYaw)
        v.applyAxisAngle(new THREE.Vector3(0,1,0), playerYaw + cameraYaw);

        // 6. convert to world space
        const worldX = this.x + v.x;
        const worldY = this.y + v.y;
        const worldZ = this.z + v.z;

        part.part.position.set(worldX, worldY + body.y, worldZ);

        // 7. mesh rotation (visual only)
        part.part.rotation.set(
            -rx,
            -(ry + playerYaw - cameraYaw),
            -rz
        );
    }
}





    changeAnimation(newani) {
      this.currentFrame = 0;
      this.currentAnimation = newani;
      this.frameTime = 0;
    }

    updateAnimation(delta) {
    const anim = animations[this.currentAnimation];
    if (!anim) return;

    console.log(this.frameTime, this.frameDuration)

    this.frameTime += delta;

    if (this.frameTime >= this.frameDuration) {
        console.log(this.frameTime, " ", this.frameDuration)

        this.frameTime = 0;
        this.currentFrame = (this.currentFrame + 1) % anim.frames.length;
    }

    const frame = anim.frames[this.currentFrame];

    // apply frame to parts
    for (let i = 0; i < this.parts.length; i++) {
        const partName = ["body", "arm1", "arm2", "head", "leg1", "leg2"][i];
        const data = frame[partName];
        if (!data) continue;

        this.parts[i].rx = data.rx;
        this.parts[i].ry = data.ry;
        this.parts[i].rz = 0;

        this.offsets[i].x = data.x;
        this.offsets[i].y = data.y;
        this.offsets[i].z = data.z;
    }
}
}

renderer.setViewport(currentScene.vx, currentScene.vy, currentScene.vwidth, currentScene.vheight);

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

    console.log("Selected UI Element Index: ", selected);
    if(selected != -1) {
        currentScene.uielements[selected].keydown(event.key);
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


const plr = new Player(scene, 0, 15, 0);

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
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.castShadow = true;
scene.add(sun);

const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);


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

function handleGamepad(gp) {
    const deadzone = 0.2;

    // Left stick
    const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

    // Right stick
    const rx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;

    // Buttons
    const A = gp.buttons[0].pressed;   // Xbox A / PS Cross
    const B = gp.buttons[1].pressed;   // Xbox B / PS Circle
    const X = gp.buttons[2].pressed;   // Xbox X / PS Square
    const Y = gp.buttons[3].pressed;   // Xbox Y / PS Triangle

    const LB = gp.buttons[4].pressed;
    const RB = gp.buttons[5].pressed;

    const LT = gp.buttons[6].value; // analog
    const RT = gp.buttons[7].value; // analog

    const start = gp.buttons[9].pressed;

    let dir = Math.atan2(ly, lx);
    dir += degToRad(cameraLookaroundAngle);

    // Movement example
    if(Math.abs(lx) > deadzone || Math.abs(ly) > deadzone) {
        plr.physics.velocity.x = -Math.cos(-dir) * 10;
        plr.physics.velocity.z = -Math.sin(-dir) * 10;
    }
    // Jump
    if (A && Math.abs(plr.physics.velocity.y) < 0.1) {
        plr.physics.velocity.y = 10;
    }

    console.log("Controller Info: ", lx, ly, rx, ry, A, B, X, Y, LB, RB, LT, RT, start);

    // Camera rotation
    cameraLookaroundAngle += -rx * 2;
    cameraLookaroundAngleX += ry * 2;
}

let mouseX = 0;
let mouseY = 0;

let selectIndex = -1;

document.addEventListener('mousemove', function(event) {
   var x = event.clientX;
   var y = event.clientY;
    mouseX = x;
    mouseY = y;
});

function sendChatMessage(text) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "chat",
      message: text,
      sender: username
    }));
  }
}

const composer = new EffectComposer(renderer);


const aoPass = new N8AOPass(
  scene,
  camera,
  window.innerWidth,
  window.innerHeight
);
aoPass.halfRes = true;
aoPass.aoSamples = 1;
aoPass.radius = 0.1;
aoPass.intensity = 1;
aoPass.temporal = false;

composer.addPass(aoPass);

function animate(time) {
    box.rotation.x = time / 10000;
    box.rotation.y = time / 20000;
    const delta = (time - lastTime) / 1000; // seconds lastTime = now;

    //plr.y += plr.vy;
    //plr.x += plr.vx;
    //plr.z += plr.vz;

    world.step(fixedTimeStep, delta, 3);
    
    plr.x = plr.physics.position.x;
    plr.y = plr.physics.position.y;
    plr.z = plr.physics.position.z;
    const euler = quaternionToEuler(plr.physics.quaternion);
    plr.rx = euler.x * (180 / Math.PI);
    plr.ry = 0;
    plr.rz = euler.z * (180 / Math.PI);
    plr.updatePosition();

    let speed = 50;

    if(keysPressed.w) {
        plr.physics.velocity.z = -speed * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.x = -speed * Math.sin(degToRad(cameraLookaroundAngle));
        //let target = -cameraLookaroundAngle - 90;
        //let diff = target - plr.ry;
        //plr.ry += diff * 0.1;

        targetcameraLookaroundAngle -= (targetcameraLookaroundAngle - cameraLookaroundAngle) / 8
    }
    if(keysPressed.s) {
        plr.physics.velocity.z = speed * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.x = speed * Math.sin(degToRad(cameraLookaroundAngle));
    }
    if(keysPressed.a) {
        plr.physics.velocity.x = -speed * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.z = speed * Math.sin(degToRad(cameraLookaroundAngle));
    }
    if(keysPressed.d) {
        plr.physics.velocity.x = speed * Math.cos(degToRad(cameraLookaroundAngle));
        plr.physics.velocity.z = -speed * Math.sin(degToRad(cameraLookaroundAngle));
    }

    const gamepads = navigator.getGamepads();
    //console.log(gamepads);
    for (let i = 0; i < 4; i++) {
        const gp = gamepads[i]; // first controller

        if (gp) {
            handleGamepad(gp);
        }
    }

    

for (const id in otherPlayers) {
    if (id === myId) continue; // skip your own player

    const p = otherPlayers[id];

    if (!otherPlayerMeshes[id]) {
        const geo = new THREE.BoxGeometry(4, 12, 4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        otherPlayerMeshes[id] = mesh;
    }

    const mesh = otherPlayerMeshes[id];
    mesh.position.set(p.x, p.y, p.z);

    //console.log("Updated other player:", id, p, mesh);
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
    composer.render(delta);

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
UIctx.fillText(`Blocks: ${map.length}`, 80, 160)

//update onhover, onunhover and onclick for uielements

plr.updateAnimation(delta);

selectIndex = -1;

if(menuType == 0) {
    behindScene = homeScene;
}else if(menuType == 1 || menuType == 3) {
    behindScene = searchScene;
}else if(menuType == 2) {
    behindScene = createScene;
}else if(menuType == 4) {
    behindScene = null;
    currentScene = chatScene;
}
for (let i = 0; i < currentScene.uielements.length; i++) {
    console.log(i);
    if(mouseX > currentScene.uielements[i].x * UIcanvas.width && mouseX < currentScene.uielements[i].x * UIcanvas.width + currentScene.uielements[i].width * UIcanvas.width &&
       mouseY > currentScene.uielements[i].y * UIcanvas.height && mouseY < currentScene.uielements[i].y * UIcanvas.height + currentScene.uielements[i].height * UIcanvas.height) {
        if(currentScene.uielements[i] instanceof Button || currentScene.uielements[i] instanceof TextBox) {
            selectIndex = i;
            behindorc = 0;
            currentScene.uielements[i].onhover();
        }
        console.log(currentScene.uielements[i]);
    }else {
        if(currentScene.uielements[i] instanceof Button || currentScene.uielements[i] instanceof TextBox) {
            currentScene.uielements[i].onunhover();
        }
    }
    //currentScene.uielements[i].update();
}
if(behindScene) {
    for (let i = 0; i < behindScene.uielements.length; i++) {
    if(mouseX > behindScene.uielements[i].x * UIcanvas.width && mouseX < behindScene.uielements[i].x * UIcanvas.width + behindScene.uielements[i].width * UIcanvas.width &&
       mouseY > behindScene.uielements[i].y * UIcanvas.height && mouseY < behindScene.uielements[i].y * UIcanvas.height + behindScene.uielements[i].height * UIcanvas.height) {
        if(behindScene.uielements[i] instanceof Button || behindScene.uielements[i] instanceof TextBox) {
            selectIndex = i;
            behindorc = 1;
            behindScene.uielements[i].onhover();
        }
    }else {
        if(behindScene.uielements[i] instanceof Button || behindScene.uielements[i] instanceof TextBox) {
            behindScene.uielements[i].onunhover();
        }
    }
    //behindScene.uielements[i].update();
}
    behindScene.drawUI(UIctx);
}
currentScene.drawUI(UIctx);

lastTime = time;
}

renderer.setAnimationLoop(animate);