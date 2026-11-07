import * as THREE from '/three.module.js';

const socket = io({ transports: ['websocket', 'polling'] });
const canvas = document.querySelector('#world');
const modal = document.querySelector('#join-modal');
const feed = document.querySelector('#feed');
const messages = document.querySelector('#messages');
const avatarIcons = { snake: '🐍', fish: '🐟', sloth: '🦥', cow: '🐮', leopard: '🐆' };
const avatarColors = { snake: '#399466', fish: '#247da9', sloth: '#73523d', cow: '#39343a', leopard: '#9e5b21' };
const selectionLines = { snake: 'tôi khổ quá mà', fish: 'thần thiếp không làm được', sloth: 'hả?', cow: 'là sao nữa...', leopard: 'cú bé' };
let selfId = '';
let roomCode = '';
let myName = '';
let myAvatar = 'snake';
let selectedId = '';
let hasJoinedRoom = false;
const vatNem = [];
let trangThaiNhac = null;
let trinhPhat = null;
let sanSangNhac = false;
const players = new Map();
const keys = new Set();
const moneyBills = [];
const workDisplays = new Map();
let moneyTexture = null;
let auraTexture = null;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c5b0c1');
scene.fog = new THREE.Fog('#c5b0c1', 32, 65);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 16, 16);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
scene.add(new THREE.HemisphereLight('#fff4dc', '#776579', 2.1));
const sun = new THREE.DirectionalLight('#fff1d4', 3.0);
sun.position.set(-8, 18, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
scene.add(sun);

const mat = (color, roughness = .86) => new THREE.MeshStandardMaterial({ color, roughness });
const mats = {
  floor: mat('#808389'), tile: mat('#808389'), wall: new THREE.MeshBasicMaterial({ color: '#ffffff' }), wallLight: mat('#e4e5e7'), trim: mat('#555a60'), door: mat('#b8bbc0'),
  wood: mat('#d6a84f'), woodLight: mat('#f2cf75'), purple: mat('#716184'), cream: mat('#fff0d0'), plant: mat('#5f9c6e'),
  pink: mat('#ed8fa0'), white: mat('#fffaf0'), black: mat('#29242c'), dark: mat('#413348'), gray: mat('#a3a1a4'), metal: mat('#758993')
};

function box(parent, w, h, d, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, x, y, z, sx, sy, sz, material, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1)), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function label(text, color = '#493650') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 512;
  c.height = 128;
  ctx.fillStyle = '#fff3dd';
  ctx.strokeStyle = '#725b73';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 30);
  ctx.fill();
  ctx.stroke();
  ctx.font = '900 52px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(String(text ?? ''), 256, 64, 460);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.8, .7, 1);
  return sprite;
}

function nameLabel(text, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = '1000 48px Nunito, sans-serif';
  const width = Math.max(150, Math.min(720, Math.ceil(ctx.measureText(text).width + 50)));
  c.width = width;
  c.height = 100;
  ctx.font = '1000 48px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#fff8ed';
  ctx.strokeText(text, width / 2, 50);
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, 50);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(width / 160, .64, 1);
  return sprite;
}

function speechBubble(text, color = '#37293e') {
  const fontSize = 44;
  const lineHeight = 52;
  const maxTextWidth = 560;
  const padX = 30;
  const padY = 20;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `900 ${fontSize}px Nunito, sans-serif`;
  const lines = [];
  for (const paragraph of String(text ?? '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxTextWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (context.measureText(word).width <= maxTextWidth) {
        line = word;
        continue;
      }
      let part = '';
      for (const character of word) {
        const next = part + character;
        if (context.measureText(next).width > maxTextWidth && part) {
          lines.push(part);
          part = character;
        } else part = next;
      }
      line = part;
    }
    if (line) lines.push(line);
  }
  if (!lines.length) lines.push(' ');
  const contentWidth = Math.max(110, ...lines.map(line => context.measureText(line).width));
  canvas.width = Math.ceil(contentWidth + padX * 2);
  canvas.height = lines.length * lineHeight + padY * 2;
  context.font = `900 ${fontSize}px Nunito, sans-serif`;
  context.fillStyle = '#fff3dd';
  context.strokeStyle = '#725b73';
  context.lineWidth = 6;
  context.beginPath();
  context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 24);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => context.fillText(line, canvas.width / 2, padY + lineHeight * index + lineHeight / 2, maxTextWidth));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(canvas.width / 160, canvas.height / 160, 1);
  return sprite;
}

function patternMaterial(baseColor, pattern, region) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (pattern === 'cow') {
    const headSpots = [[.25,.12,.075,.13],[.12,.27,.05,.1],[.38,.29,.05,.1],[.24,.48,.06,.09],[.04,.38,.05,.1],[.46,.39,.05,.1]];
    const bodySpots = [[.04,.16,.065,.14],[.16,.35,.075,.18],[.27,.18,.095,.16],[.39,.72,.08,.17],[.52,.3,.07,.16],[.64,.19,.08,.16],[.76,.42,.09,.17],[.9,.22,.075,.18],[.98,.36,.06,.16]];
    const spots = region === 'head' ? headSpots : bodySpots;
    for (const [u, v, rx, ry] of spots) {
      const cx = u * canvas.width;
      const cy = v * canvas.height;
      context.fillStyle = '#262329';
      context.beginPath();
      context.moveTo(cx - rx * canvas.width * .7, cy - ry * canvas.height * .25);
      context.bezierCurveTo(cx - rx * canvas.width, cy - ry * canvas.height, cx - rx * canvas.width * .35, cy - ry * canvas.height * 1.1, cx + rx * canvas.width * .25, cy - ry * canvas.height * .72);
      context.bezierCurveTo(cx + rx * canvas.width * 1.05, cy - ry * canvas.height * .35, cx + rx * canvas.width * .85, cy + ry * canvas.height * .55, cx + rx * canvas.width * .25, cy + ry * canvas.height * .88);
      context.bezierCurveTo(cx - rx * canvas.width * .3, cy + ry * canvas.height * 1.12, cx - rx * canvas.width * 1.05, cy + ry * canvas.height * .55, cx - rx * canvas.width * .7, cy - ry * canvas.height * .25);
      context.fill();
    }
  } else {
    const rows = region === 'head' ? [.12,.32,.54,.75,.88] : [.1,.29,.48,.67,.84];
    const columns = region === 'head' ? [.08,.25,.42,.58,.75,.92] : [.04,.16,.28,.4,.52,.64,.76,.88,.98];
    for (let row = 0; row < rows.length; row++) {
      for (let column = 0; column < columns.length; column++) {
        const u = columns[column] + (row % 2 ? .035 : 0);
        if (u > 1) continue;
        const cx = u * canvas.width;
        const cy = rows[row] * canvas.height;
        const rx = region === 'head' ? 26 : 30;
        const ry = region === 'head' ? 22 : 26;
        context.strokeStyle = '#593d2e';
        context.lineWidth = 11;
        context.beginPath();
        context.ellipse(cx, cy, rx, ry, .18 * ((row + column) % 3 - 1), .2, Math.PI * 1.85);
        context.stroke();
        context.fillStyle = '#593d2e';
        context.beginPath();
        context.ellipse(cx + rx * .42, cy - ry * .25, 7, 7, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map: texture, roughness: .86 });
  material.userData.generatedAnimalPattern = true;
  return material;
}

function makeRoomLabel(text, x, z) {
  const sprite = label(text, '#493650');
  sprite.position.set(x, 2.35, z);
  sprite.scale.set(3.8, .92, 1);
  scene.add(sprite);
}

let wcDoor = null;
let wcDoorTimer = null;

function enclosedRoom(xMin, xMax, zMin, zMax, title, doorX) {
  const wallHeight = 2.6;
  const wallY = wallHeight / 2;
  const wallWidth = .26;
  const doorWidth = 1.55;
  box(scene, wallWidth, wallHeight, zMax - zMin, mats.wall, xMin, wallY, (zMin + zMax) / 2);
  box(scene, wallWidth, wallHeight, zMax - zMin, mats.wall, xMax, wallY, (zMin + zMax) / 2);
  box(scene, xMax - xMin, wallHeight, wallWidth, mats.wall, (xMin + xMax) / 2, wallY, zMin);
  const leftWidth = doorX - doorWidth / 2 - xMin;
  const rightWidth = xMax - (doorX + doorWidth / 2);
  if (leftWidth > 0) box(scene, leftWidth, wallHeight, wallWidth, mats.wall, xMin + leftWidth / 2, wallY, zMax);
  if (rightWidth > 0) box(scene, rightWidth, wallHeight, wallWidth, mats.wall, doorX + doorWidth / 2 + rightWidth / 2, wallY, zMax);
  box(scene, .14, wallHeight, .16, mats.trim, doorX - doorWidth / 2, wallY, zMax);
  box(scene, .14, wallHeight, .16, mats.trim, doorX + doorWidth / 2, wallY, zMax);
  box(scene, doorWidth + .14, .16, .16, mats.trim, doorX, wallHeight - .08, zMax);
  const door = new THREE.Group();
  door.position.set(doorX - doorWidth / 2 + .08, 0, zMax + .03);
  scene.add(door);
  box(door, doorWidth - .16, 2.28, .12, mats.door, (doorWidth - .16) / 2, 1.14, 0);
  box(door, .06, .13, .06, mats.dark, doorWidth * .34, 1.12, -.08);
  if (title === 'WC') wcDoor = door;
  makeRoomLabel(title, (xMin + xMax) / 2, (zMin + zMax) / 2);
}

function office() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(40, .42, 26), mats.floor);
  base.position.y = -.3;
  base.receiveShadow = true;
  scene.add(base);
  for (let x = -18.75; x <= 18.75; x += 2.5) {
    for (let z = -12.5; z <= 12.5; z += 2.5) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(2.48, 2.48), mats.tile);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, -.075, z);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }
  box(scene, 40, 2.1, .55, mats.wall, 0, .75, -13.2);
  box(scene, .55, 2.1, 26, mats.wall, -20.2, .75, 0);
  box(scene, .55, 2.1, 26, mats.wall, 20.2, .75, 0);
  box(scene, 40, .5, .55, mats.trim, 0, -.04, 13.2, false);
  for (const z of [-8, -3, 2, 7]) {
    box(scene, .16, .12, .16, mats.wallLight, -19.5, -.01, z, false);
    box(scene, .16, .12, .16, mats.wallLight, 19.5, -.01, z, false);
  }
  enclosedRoom(10.4, 18.6, -10.7, -4.7, 'PHÒNG HỌP A', 14.5);
  enclosedRoom(10.4, 18.6, 1.2, 8.6, 'PHÒNG HỌP B', 14.5);
  enclosedRoom(-19.5, -16.1, -10.7, -6.1, 'WC', -17.8);
  box(scene, 1.0, .78, .54, mats.dark, -18.8, .16, -4.3);
  box(scene, .42, .2, .35, mats.white, -18.6, .66, -4.26);
  makeRoomLabel('QUẦY CÀ PHÊ', -13.5, -9.1);
  makeRoomLabel('SẢNH CHUNG', 0, 7.9);
  box(scene, 4.6, .72, 1.1, mats.wood, -13.5, .22, -8.6);
  box(scene, 4.7, .13, 1.2, mats.woodLight, -13.5, .65, -8.6);
  box(scene, 1.05, .36, .75, mats.dark, -14.8, .9, -8.6);
  for (const x of [-15.2, -11.8]) box(scene, .12, .3, .12, mats.dark, x, .04, -8.4);
  for (const [x, z] of [[-10.9,-7.8],[-10.1,-7.8],[-10.9,-9.1],[-10.1,-9.1]]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.2,12), mats.cream);
    cup.position.set(x,.84,z); cup.castShadow = true; scene.add(cup);
    sphere(scene,x,.97,z,.025,.07,.025,mats.wood,8);
  }
  conferenceRoom(14.5, -8.5);
  conferenceRoom(14.5, 5.1);
  for (const [index, z] of [11.4,.4,2.6,4.8,7,9.2].entries()) workTable(z,`desk-${index+1}`);
  for (const [x,z] of [[-18.8,-5.7],[-16.8,-5.7],[12.2,-4.2],[18.8,-4.2],[12.2,8.9],[18.8,8.9],[-18.5,11.8],[18.5,11.8]]) plant(x,z);
  box(scene, .12, .85, 5.2, mats.wallLight, -6.8, .17, -8.3);
  box(scene, .12, .85, 5.2, mats.wallLight, 6.8, .17, -8.3);
  for (let x=-3.5;x<=3.5;x+=2.3) stool(x, 8.2);
  const sign=box(scene,3,.85,.14,mats.purple,0,1.7,-12.83);
  sign.material=mat('#665379');
  box(scene,5.4,3.2,.14,mats.dark,0,2.7,-12.5);
  makeRoomLabel('VP SỜ MỜ LỜ · RADIO', 0, -12.2);
}

function workTable(z, seatId) {
  const x = -17.35;
  box(scene, 2.55, .14, .92, mats.woodLight, x, .88, z);
  for (const dx of [-1.1, 1.1]) for (const dz of [-.34, .34]) box(scene, .12, .84, .12, mats.wood, x + dx, .4, z + dz);
  stool(-15.55, z);
  box(scene, .7, .055, .48, mats.dark, x - .12, .98, z);
  box(scene, .1, .54, .5, mats.dark, x - .38, 1.25, z);
  box(scene, .025, .46, .42, mats.metal, x - .435, 1.25, z);
  createWorkDisplay(seatId,x-.38,1.3,z);
}

function createWorkDisplay(seatId,x,y,z){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const context=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.set(x,y,z);sprite.scale.set(.98,.48,1);sprite.renderOrder=100;scene.add(sprite);
  const display={canvas,context,texture,sprite,seconds:-1};
  workDisplays.set(seatId,display);paintWorkDisplay(display,null);
}

function paintWorkDisplay(display,seconds){
  if(display.seconds===seconds)return;
  display.seconds=seconds;
  const {canvas,context}=display;
  context.clearRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#172a34';context.fillRect(0,0,canvas.width,canvas.height);
  if(seconds!==null){
    const text=`${seconds}s`;
    let fontSize=seconds<100?126:92;context.font=`900 ${fontSize}px Nunito, sans-serif`;
    while(context.measureText(text).width>canvas.width-20&&fontSize>34){fontSize-=3;context.font=`900 ${fontSize}px Nunito, sans-serif`;}
    context.fillStyle='#8ef2c1';context.textAlign='center';context.textBaseline='middle';context.fillText(text,canvas.width/2,canvas.height/2);
  }
  display.texture.needsUpdate=true;
}

function setAura(player,auraUntil){
  player.auraUntil=auraUntil;
  if(!auraTexture){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');
    const gradient=context.createRadialGradient(128,128,12,128,128,124);
    gradient.addColorStop(0,'rgba(255,231,129,.62)');gradient.addColorStop(.45,'rgba(255,211,97,.28)');gradient.addColorStop(1,'rgba(255,190,64,0)');
    context.fillStyle=gradient;context.fillRect(0,0,256,256);
    auraTexture=new THREE.CanvasTexture(canvas);auraTexture.colorSpace=THREE.SRGBColorSpace;
  }
  if(!player.auraSprite){
    player.auraSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:auraTexture,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));
    player.auraSprite.position.set(0,1.25,.02);player.auraSprite.scale.set(2.8,2.8,1);player.auraSprite.renderOrder=2;player.group.add(player.auraSprite);
    player.auraRing=new THREE.Mesh(new THREE.TorusGeometry(.78,.035,8,40),new THREE.MeshBasicMaterial({color:'#ffe682',transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
    player.auraRing.rotation.x=Math.PI/2;player.auraRing.position.y=.09;player.auraRing.renderOrder=2;player.group.add(player.auraRing);
  }
}

function clearAura(player){
  player.auraUntil=0;
  if(player.auraSprite){player.group.remove(player.auraSprite);player.auraSprite.material.dispose();player.auraSprite=null;}
  if(player.auraRing){player.group.remove(player.auraRing);player.auraRing.geometry.dispose();player.auraRing.material.dispose();player.auraRing=null;}
}

function conferenceRoom(x,z) {
  box(scene, 4.5, .25, 1.25, mats.woodLight, x, .24, z);
  for (const dx of [-1.6, 0, 1.6]) {
    stool(x+dx,z-1.2); stool(x+dx,z+1.2);
  }
  for (const dx of [-1.8,1.8]) for (const dz of [-.35,.35]) box(scene,.1,.26,.1,mats.wood,x+dx,.04,z+dz);
}

function stool(x,z) {
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.16,24),mats.gray);
  seat.position.set(x,.48,z); seat.castShadow=true; scene.add(seat);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.43,12),mats.trim);
  leg.position.set(x,.2,z); leg.castShadow=true; scene.add(leg);
}

function plant(x,z) {
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.22,.48,12),mats.woodLight);
  pot.position.set(x,.16,z); pot.castShadow=true; scene.add(pot);
  for(let i=0;i<5;i++) sphere(scene,x+Math.sin(i*2.4)*.24,.69+(i%2)*.14,z+Math.cos(i*2.4)*.24,.22,.42,.2,mats.plant,10);
}

function taperedTube(parent, points, radiusStart, radiusEnd, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const segments = 36;
  const sides = 12;
  const frames = curve.computeFrenetFrames(segments, false);
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const smooth = t * t * (3 - 2 * t);
    const radius = radiusStart + (radiusEnd - radiusStart) * smooth;
    const center = curve.getPointAt(t);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const normal = frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle));
      vertices.push(center.x + normal.x * radius, center.y + normal.y * radius, center.z + normal.z * radius);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function triangleFin(parent, points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function faceLine(parent, points, material, radius = .018) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 6, false), material);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function animal(type, tint = null) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = tint ? mat(tint) : ({ snake: mat('#64bc83'), fish: mat('#57a9d8'), sloth: mat('#92745b'), cow: mat('#fffaf0'), leopard: mat('#d7a353') }[type]);
  const cowBodyFur = type === 'cow' ? patternMaterial('#fffaf0', 'cow', 'body') : fur;
  const cowHeadFur = type === 'cow' ? patternMaterial('#fffaf0', 'cow', 'head') : fur;
  const leopardBodyFur = type === 'leopard' ? patternMaterial('#d7a353', 'leopard', 'body') : fur;
  const leopardHeadFur = type === 'leopard' ? patternMaterial('#d7a353', 'leopard', 'head') : fur;
  const blush = mat('#f39a9c');
  const eye = mat('#24212b');
  const dark = mat('#34303a');
  if (type === 'snake') {
    for (const [radius, y, thickness] of [[.74,.16,.13],[.59,.3,.12],[.44,.43,.105]]) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 10, 36), fur);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(0, y, .05);
      body.add(coil);
    }
    taperedTube(body,[[.66,.17,.08],[.84,.17,.18],[1.06,.23,.3]],.13,.012,fur);
    const middleHeight = .77;
    const shortenedHeight = middleHeight * 2 / 3;
    const headShift = middleHeight - shortenedHeight;
    const connection = new THREE.Mesh(new THREE.CylinderGeometry(.14,.44,.8,20),fur);
    connection.position.set(0,.55,-.02);
    connection.castShadow = true;
    body.add(connection);
    sphere(body,0,1.11-headShift/2,-.02,.145,shortenedHeight,.15,fur,20);
    const snakeHead = new THREE.Group();
    snakeHead.position.y = -headShift;
    body.add(snakeHead);
    sphere(snakeHead,0,1.91,-.08,.43,.39,.39,fur,20);
    for(const x of [-.17,.17]) {
      sphere(snakeHead,x,1.98,-.405,.064,.085,.035,eye,12);
      sphere(snakeHead,x-.014,2.01,-.434,.016,.022,.01,mats.white,8);
    }
    sphere(snakeHead,-.04,1.83,-.45,.018,.022,.012,dark,8);
    sphere(snakeHead,.04,1.83,-.45,.018,.022,.012,dark,8);
    faceLine(snakeHead,[[-.09,1.76,-.435],[0,1.73,-.45],[.09,1.76,-.435]],dark,.014);
  } else if (type === 'fish') {
    const finMat = new THREE.MeshStandardMaterial({color:'#3297c7',side:THREE.DoubleSide,roughness:.8});
    const gillMat = mat('#e78388');
    sphere(body,0,.57,.04,.7,.43,.68,fur,20);
    triangleFin(body,[[0,.59,.72],[-.37,.82,1.03],[0,.58,1.08]],finMat);
    triangleFin(body,[[0,.58,1.08],[.37,.82,1.03],[0,.59,.72]],finMat);
    triangleFin(body,[[0,.9,.1],[-.28,1.19,.35],[.25,.91,.43]],finMat);
    triangleFin(body,[[0,.26,-.05],[-.22,-.02,.18],[.2,.25,.35]],finMat);
    triangleFin(body,[[-.5,.48,-.12],[-.86,.32,.08],[-.58,.75,.15]],finMat);
    triangleFin(body,[[.5,.48,-.12],[.86,.32,.08],[.58,.75,.15]],finMat);
    for(const x of [-.52,.52]) {
      sphere(body,x,.56,-.13,.095,.25,.11,gillMat,12);
      sphere(body,x*.73,.69,-.49,.07,.09,.035,mats.white,12);
      sphere(body,x*.73,.69,-.52,.032,.054,.018,eye,10);
    }
    faceLine(body,[[-.11,.47,-.65],[0,.44,-.675],[.11,.47,-.65]],dark,.018);
  } else if (type === 'sloth') {
    sphere(body,0,.56,.02,.55,.53,.48,fur,18);
    sphere(body,0,1.02,-.16,.48,.47,.42,fur,18);
    sphere(body,0,1.03,-.52,.35,.31,.12,mat('#d7bd91'),16);
    for(const x of [-.17,.17]) {
      sphere(body,x,1.08,-.625,.12,.16,.045,mat('#654d3c'),12);
      sphere(body,x,1.08,-.668,.047,.065,.025,eye,10);
    }
    sphere(body,0,.91,-.635,.09,.06,.045,dark,10);
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,6,12,Math.PI),dark); smile.position.set(0,.85,-.66); smile.rotation.z=Math.PI; body.add(smile);
    for(const x of [-.43,.43]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.86,10),fur);
      arm.userData.tay=true; arm.position.set(x*1.12,.48,.02); arm.rotation.z=x<0?-.08:.08; body.add(arm);
      for(let i=0;i<3;i++) {
        const claw=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,7),mat('#e8ddbd'));
        claw.position.set(x*1.12+(i-1)*.07,.055,.02); claw.rotation.x=Math.PI; body.add(claw);
      }
    }
  } else if (type === 'leopard') {
    sphere(body,0,.68,.02,.52,.66,.44,leopardBodyFur,18);
    sphere(body,0,1.38,-.15,.48,.46,.4,leopardHeadFur,18);
    sphere(body,0,.64,-.385,.28,.39,.075,mat('#f2d8a5'),14);
    for(const x of [-.36,.36]) {
      sphere(body,x,1.67,-.08,.16,.18,.1,fur,12);
    }
    for(const x of [-.18,.18]) {
      sphere(body,x,1.43,-.525,.062,.085,.028,eye,12);
      sphere(body,x-.012,1.46,-.548,.016,.022,.01,mats.white,8);
    }
    const leopardNose = new THREE.Mesh(new THREE.ConeGeometry(.105,.13,3),dark);
    leopardNose.position.set(0,1.27,-.562);
    leopardNose.rotation.x=-Math.PI/2;
    body.add(leopardNose);
    faceLine(body,[[0,1.21,-.557],[0,1.16,-.555],[-.075,1.13,-.545],[0,1.105,-.55],[.075,1.13,-.545]],dark,.014);
    for(const x of [-1,1]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,.55,10),fur);
      arm.userData.tay=true; arm.position.set(x*.53,.73,-.03); arm.rotation.z=x*.14; body.add(arm);
      sphere(body,x*.61,.43,-.08,.13,.12,.13,fur,10);
    }
    const tail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.42,.38,.25),new THREE.Vector3(.75,.35,.5),new THREE.Vector3(.82,.55,.72)]),16,.075,8,false),fur);
    body.add(tail);
    sphere(body,.82,.55,.72,.12,.12,.12,mat('#593d2e'),10);
  } else {
    sphere(body,0,.68,0,.55,.62,.44,cowBodyFur,18);
    sphere(body,0,1.36,-.16,.49,.47,.42,cowHeadFur,18);
    for(const x of [-.45,.45]) {
      sphere(body,x,1.31,-.15,.17,.11,.1,fur,12);
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.1,.27,8),mats.cream); horn.position.set(x*.72,1.8,-.13); horn.rotation.z=x<0?.2:-.2; body.add(horn);
    }
    sphere(body,-.2,1.42,-.52,.07,.09,.05,eye,10); sphere(body,.2,1.42,-.52,.07,.09,.05,eye,10);
    sphere(body,0,1.17,-.6,.28,.19,.12,blush,14);
    sphere(body,-.09,1.17,-.7,.035,.055,.025,dark,8); sphere(body,.09,1.17,-.7,.035,.055,.025,dark,8);
    for(const x of [-1,1]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.57,10),fur);
      arm.userData.tay=true; arm.position.set(x*.61,.78,-.04); arm.rotation.z=x*.15; body.add(arm);
      sphere(body,x*.68,.48,-.08,.14,.12,.13,fur,10);
    }
  }
  if(type!=='snake') for(const x of [-.3,.3]) {
    const tall=type==='cow'||type==='leopard';
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(tall?.12:.1,tall?.14:.13,tall?.44:.34,8),type==='sloth'?fur:dark);
    leg.position.set(x,tall?.21:.15,.05); leg.castShadow=true; body.add(leg);
  }
  body.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  let dau;
  if(type==='snake') dau=body.children.find(o=>o.isGroup);
  else if(type!=='fish'){
    dau=new THREE.Group();dau.position.y=1.3;body.add(dau);
    for(const o of [...body.children])if(o!==dau&&o.position.y>=1){body.remove(o);o.position.y-=1.3;dau.add(o);}
  }
  root.userData.dau=dau;
  root.userData.tay=[];body.traverse(o=>{if(o.userData.tay)root.userData.tay.push(o);});
  root.userData.body = body;
  return root;
}

office();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let targetWorld = null;
canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...players.values()].map(p=>p.group), true);
  const hit = hits.find(h=>h.object.userData.playerId);
  if(hit) selectPlayer(hit.object.userData.playerId);
  else {
    const floorHit=raycaster.intersectObject(ground,false)[0];
    if(floorHit) targetWorld=floorHit.point.clone();
  }
});

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40,26),new THREE.MeshBasicMaterial({visible:false}));
ground.rotation.x=-Math.PI/2; ground.position.y=-.05; scene.add(ground);

function createPlayer(data) {
  if(players.has(data.id)) return players.get(data.id);
  const group=animal(data.avatar);
  group.position.set(data.x||0,0,data.z||0);
  group.rotation.y=data.yaw||0;
  group.userData.playerId=data.id;
  group.traverse(o=>{o.userData.playerId=data.id;o.castShadow=false;o.receiveShadow=false;});
  const name=nameLabel(data.name,avatarColors[data.avatar]||'#493650');
  name.position.set(0,2.45,0); group.add(name);
  scene.add(group);
  const entry={...data,group,body:group.userData.body,nameSprite:name,bubbleSprite:null,bubbleSticky:Boolean(data.working),target:new THREE.Vector3(data.x||0,0,data.z||0),poseUntil:0,working:Boolean(data.working),workSeatId:data.workSeatId||'',workStartedAt:data.workStartedAt||0,meditating:false,auraUntil:0,auraSprite:null,auraRing:null};
  players.set(data.id,entry);
  if(data.id!==selfId){const opt=document.createElement('option');opt.value=data.id;opt.textContent=data.name;document.querySelector('#target-select').append(opt);}
  if(entry.working)setBubble(data.id,'kiếp trâu ngựa',true);
  if(data.auraUntil>Date.now())setAura(entry,data.auraUntil);
  return entry;
}

function setBubble(id,text,sticky=false) {
  const p=players.get(id); if(!p)return;
  if(p.working&&!sticky)return;
  clearTimeout(p.bubbleTimer);
  if(!text){
    if(p.bubbleSprite){p.bubbleSprite.visible=false;p.bubbleSprite.material.map?.dispose();p.bubbleSprite.material.dispose();p.group.remove(p.bubbleSprite);p.bubbleSprite=null;}
    p.bubbleSticky=false;
    return;
  }
  if(!p.bubbleSprite){p.bubbleSprite=speechBubble(text,'#37293e');p.group.add(p.bubbleSprite);}
  else {
    p.bubbleSprite.material.map?.dispose();
    const fresh=speechBubble(text,'#37293e');
    p.bubbleSprite.material.map=fresh.material.map;
    p.bubbleSprite.scale.copy(fresh.scale);
    fresh.material.dispose();
  }
  p.bubbleSprite.position.set(0,2.62+p.bubbleSprite.scale.y/2,0);
  p.bubbleSprite.material.needsUpdate=true;
  p.bubbleSprite.visible=true;
  p.bubbleSticky=sticky;
  if(!sticky)p.bubbleTimer=setTimeout(()=>{if(!p.bubbleSticky&&p.bubbleSprite)p.bubbleSprite.visible=false;},6500);
}

function removePlayer(id) {
  const p=players.get(id); if(!p)return;
  clearAura(p);
  scene.remove(p.group);
  p.group.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    for(const material of materials){
      if(material.userData.generatedAnimalPattern){
        material.map?.dispose();
        material.dispose();
      }
    }
  });
  for(const sprite of [p.nameSprite,p.bubbleSprite]){
    sprite?.material?.map?.dispose();
    sprite?.material?.dispose();
  }
  players.delete(id);
  for(const opt of document.querySelector('#target-select').options)if(opt.value===id){opt.remove();break;}
  if(selectedId===id){selectedId='';document.querySelector('#target-name').textContent='chưa chọn ai';}
}

function selectPlayer(id) {
  if(id===selfId)return toast('Chọn một người chơi khác để tương tác nhé.');
  selectedId=id;
  document.querySelector('#target-select').value=id;
  const p=players.get(id);
  document.querySelector('#target-name').textContent=p?.name||'người chơi';
  for(const entry of players.values()) entry.group.scale.setScalar(entry.id===id?1.14:1);
}

function toast(text) {
  const el=document.querySelector('#toast'); el.textContent=text; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2400);
}

function addFeed(text,kind='') {
  const line=document.createElement('div'); line.textContent=text; if(kind)line.classList.add(kind);
  feed.prepend(line); setTimeout(()=>line.remove(),8500);
  while(feed.children.length>5)feed.lastElementChild.remove();
}

function addMessage(name,text,self=false) {
  const line=document.createElement('div'); line.className='message';
  const who=document.createElement('b'); who.textContent=`${name}: `;
  line.append(who,document.createTextNode(text)); messages.append(line); messages.scrollTop=messages.scrollHeight;
  while(messages.children.length>40)messages.firstElementChild.remove();
}

function startGame(event) {
  event.preventDefault();
  const joinButton=document.querySelector('#join-form .primary');
  const joinError=document.querySelector('#join-error');
  joinError.textContent='';
  if(!socket.connected){joinError.textContent='Chưa kết nối được máy chủ. Vui lòng thử lại sau vài giây.';return;}
  myName=document.querySelector('#name').value.trim().slice(0,18)||'Bạn mới';
  myAvatar=document.querySelector('.avatar.selected')?.dataset.avatar||'snake';
  const requested=document.querySelector('#room').value.trim().toUpperCase()||new URLSearchParams(location.search).get('room')||'';
  joinButton.disabled=true;
  joinButton.textContent='Đang kết nối…';
  socket.timeout(8000).emit('join',{name:myName,avatar:myAvatar,room:requested},(error,result)=>{
    joinButton.disabled=false;
    joinButton.textContent='Vào phòng thôi →';
    if(error){joinError.textContent='Máy chủ chưa phản hồi. Hãy bấm vào phòng lại; nếu vẫn lỗi, tải lại trang.';return;}
    if(result?.error){joinError.textContent=result.error;return;}
    if(!result?.ok){joinError.textContent='Không vào được phòng. Vui lòng thử lại.';return;}
    joinError.textContent='';
    modal.classList.add('hidden');
  });
}

document.querySelectorAll('.avatar').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.avatar').forEach(item=>item.classList.remove('selected'));
  button.classList.add('selected');
  document.querySelector('#avatar-quote').textContent=`“${selectionLines[button.dataset.avatar]}”`;
}));
document.querySelector('#join-form').addEventListener('submit',startGame);
document.querySelector('#chat-form').addEventListener('submit',event=>{
  event.preventDefault();
  const input=document.querySelector('#chat-input'); const text=input.value.trim();
  if(text){socket.emit('chat',text);input.value='';}
});
document.querySelector('#invite').addEventListener('click',async()=>{
  const link=`${location.origin}${location.pathname}?room=${roomCode}`;
  try{await navigator.clipboard.writeText(link);document.querySelector('#copy-state').textContent='✓';toast('Đã chép link mời bạn!');}
  catch{prompt('Sao chép link phòng:',link);}
  setTimeout(()=>document.querySelector('#copy-state').textContent='',2200);
});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.action; const item=document.querySelector('#item').value;
  if(action==='run'||action==='meditate'||action==='toilet'||action==='money'){socket.emit('self-action',action);return;}
  if(action==='meeting'){socket.emit('urgent-meeting');return;}
  if(action==='work'){socket.emit('work');return;}
  if(!selectedId)return toast('Chạm vào một người chơi khác để chọn họ nhé.');
  socket.emit('act',{target:selectedId,action,item});
}));
const actionKeys={KeyZ:'bonk',KeyX:'punch',KeyC:'smirk',KeyB:'bow',KeyV:'run',KeyM:'meditate',KeyN:'toilet'};
document.addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
    event.preventDefault();keys.add(({ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'})[event.code]||event.code);
  }
  if(actionKeys[event.code])document.querySelector(`[data-action="${actionKeys[event.code]}"]`)?.click();
});
document.addEventListener('keyup',event=>keys.delete(({ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'})[event.code]||event.code));
document.querySelectorAll('#mobile-pad [data-key]').forEach(button=>{
  const key={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD'}[button.dataset.key];
  button.addEventListener('pointerdown',event=>{event.preventDefault();keys.add(key);button.setPointerCapture(event.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(key));
});
canvas.addEventListener('pointermove',event=>{
  if(event.buttons!==1)return;
  const rect=canvas.getBoundingClientRect();
  pointer.x=(event.clientX-rect.left)/rect.width*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height*2-1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(ground,false)[0]; if(hit)targetWorld=hit.point.clone();
});

socket.on('joined',data=>{
  for(const id of [...players.keys()])removePlayer(id);
  selfId=data.id;roomCode=data.room;
  hasJoinedRoom=true;
  capNhatNhac(data.music);
  modal.classList.add('hidden');
  for(const player of data.players)createPlayer(player);
  const me=players.get(selfId); if(me)me.group.scale.setScalar(1.08);
  document.querySelector('#room-label').textContent=`Phòng ${roomCode}`;
  document.querySelector('#count-label').textContent=`${players.size}/50`;
  document.querySelector('#invite').disabled=false;
  document.querySelector('#chat-hint').textContent=`Mã ${roomCode} · gửi link để rủ bạn`;
  const url=new URL(location.href);url.searchParams.set('room',roomCode);history.replaceState({},'',url);
});
socket.on('player-joined',data=>{createPlayer(data);document.querySelector('#count-label').textContent=`${players.size}/50`;addFeed(`${avatarIcons[data.avatar]} ${data.name} vừa vào văn phòng`,'join');});
socket.on('player-left',id=>{const p=players.get(id);if(p)addFeed(`${p.name} đã rời văn phòng`,'leave');removePlayer(id);document.querySelector('#count-label').textContent=`${players.size}/50`;});
socket.on('moves',updates=>{
  for(const data of updates){
    const p=players.get(data.id);if(!p)continue;
    p.target.set(data.x,0,data.z);p.yaw=data.yaw;
  }
});
socket.on('chat',data=>{
  addMessage(data.name,data.text,data.id===selfId);
  setBubble(data.id,data.text);
});
socket.on('default-line',data=>setBubble(data.id,data.text));
socket.on('feed',data=>addFeed(data.text,data.kind));
socket.on('work-result',result=>{
  if(result?.error)return toast(result.error);
  const me=players.get(selfId);if(!me||!result?.seat)return;
  targetWorld=null;
  const destination=new THREE.Vector3(result.seat.x,0,result.seat.z);
  me.workSeatId=result.seat.id;me.working=false;
  me.runMotion={points:[me.group.position.clone(),destination],started:performance.now(),duration:Math.max(700,me.group.position.distanceTo(destination)/5.2*1000),jump:false};
});
socket.on('work-move',event=>{
  const p=players.get(event.id);if(!p)return;
  p.workSeatId=event.seat.id;p.working=false;
  p.runMotion={points:[p.group.position.clone(),new THREE.Vector3(event.seat.x,0,event.seat.z)],started:performance.now(),duration:event.duration,jump:false};
});
socket.on('work-state',event=>{
  const p=players.get(event.id);if(!p)return;
  p.working=event.working;p.workSeatId=event.working?event.seatId||p.workSeatId:'';
  p.workStartedAt=event.working?event.startedAt||Date.now():0;
  if(event.working){p.meditating=false;p.pose='';p.body.scale.set(1,1,1);p.body.position.y=0;setBubble(event.id,event.text||'kiếp trâu ngựa',true);}
  else setBubble(event.id,'');
});
socket.on('work-milestone',event=>{
  if(!event.final)addFeed(`${event.name} đã làm việc được ${event.seconds}s`,'work');
});
socket.on('work-complete',event=>{
  const p=players.get(event.id);if(!p)return;
  p.workSeatId='';p.working=false;p.workStartedAt=0;p.meditating=false;p.pose='';setBubble(p.id,'');
  const destination=new THREE.Vector3(event.x,0,event.z);
  p.runMotion={points:[p.group.position.clone(),destination],started:performance.now(),duration:event.duration,jump:true};
  p.target.copy(destination);
  setAura(p,event.auraUntil);
});
socket.on('urgent-meeting',event=>{
  for(const data of event.players||[]){
    const p=players.get(data.id);if(!p)continue;
    p.workSeatId='';p.working=false;p.meditating=false;p.pose='';setBubble(p.id,'');
    p.runMotion={points:[p.group.position.clone(),new THREE.Vector3(data.x,0,data.z)],started:performance.now(),duration:event.duration,jump:false};
    p.target.set(data.x,0,data.z);
  }
});
socket.on('act',event=>{
  const from=players.get(event.from),to=players.get(event.to);
  if(!from||!to)return;
  const cau={punch:'vừa đấm vào',bonk:'vừa kí đầu',smirk:'vừa cười khinh vào',bow:'vừa quỳ lạy trước'};
  addFeed(event.action==='throw'?`${event.fromName} vừa ném ${event.item} cho ${event.targetName}`:`${event.fromName} ${cau[event.action]} ${event.targetName}`);
  const now=performance.now();
  if(event.approach){
    from.khoaDen=to.khoaDen=now+event.approach+event.duration;
    if(from.id===selfId||to.id===selfId)targetWorld=null;
    from.runMotion={points:[from.group.position.clone(),new THREE.Vector3(event.x,0,event.z)],started:now,duration:event.approach,jump:false};
    from.hanhDong={loai:event.action,batDau:now+event.approach,ketThuc:now+event.approach+event.duration};
    from.yaw=event.yaw;
  }
  if(event.action==='throw')taoVatNem(from,to,event.item,now);
});
socket.on('act-impact',event=>{
  const to=players.get(event.to);if(!to)return;
  setBubble(event.to,event.line);
  if(['punch','bonk'].includes(event.action)){
    to.hanhDong={loai:'nga',batDau:performance.now(),ketThuc:performance.now()+2000};
    to.khoaDen=performance.now()+2000;
    if(to.choang){to.group.remove(to.choang);to.choang.material.map.dispose();to.choang.material.dispose();}
    to.choang=taoIcon('💫');to.choang.position.set(0,1.3,0);to.group.add(to.choang);
  }
});
function taoIcon(icon){
  const c=document.createElement('canvas');c.width=c.height=96;
  const ctx=c.getContext('2d');ctx.font='64px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,48,48);
  const tex=new THREE.CanvasTexture(c);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(.9,.9,1);sprite.renderOrder=105;return sprite;
}
function taoVatNem(nguoi, dich, icon, now){
  if(vatNem.length>=24)return;
  const sprite=taoIcon(icon);scene.add(sprite);
  vatNem.push({sprite,dich:dich.id,tu:nguoi.group.position.clone().add(new THREE.Vector3(0,1.1,0)),batDau:now});
}
function hoatAnh(p,now){
  const hd=p.hanhDong;if(!hd||now<hd.batDau)return;
  const t=(now-hd.batDau)/(hd.ketThuc-hd.batDau);
  const dau=p.group.userData.dau;
  if(t>=1){if(p.choang){p.group.remove(p.choang);p.choang.material.map.dispose();p.choang.material.dispose();p.choang=null;}p.body.rotation.set(0,0,0);p.body.position.y=0;if(dau)dau.rotation.z=0;for(const tay of p.group.userData.tay||[])tay.rotation.x=0;p.hanhDong=null;return;}
  if(hd.loai==='nga'){
    const nga=Math.min(1,t*6);p.body.rotation.x=-Math.PI/2*nga;p.body.position.y=.28*nga;
    if(dau)dau.rotation.z=Math.PI/4;else p.body.rotation.z=Math.PI/4;
    if(p.choang){p.choang.position.x=Math.sin(now*.008)*.35;p.choang.material.rotation=Math.sin(now*.005)*.3;}
  }else if(hd.loai==='bow'){
    const nhip=Math.sin((t*2%1)*Math.PI);p.body.rotation.x=-Math.PI/2*Math.min(1,nhip*2);p.body.position.y=.22*nhip;
  }else{
    const danh=Math.sin(Math.min(1,t*5)*Math.PI);p.body.rotation.z=.2*danh;
    const tay=p.group.userData.tay?.[0];if(tay)tay.rotation.x=-Math.PI/2*danh;
  }
}
socket.on('self-action',event=>{
  const p=players.get(event.id);if(!p)return;
  p.yaw=event.yaw;
  if(event.action==='run'||event.action==='toilet'){
    const from=p.group.position.clone();
    const path=(event.path?.length?event.path:[{x:event.x,z:event.z}]).map(point=>new THREE.Vector3(point.x,0,point.z));
    p.runMotion={points:[from,...path],started:performance.now(),duration:event.duration,jump:event.action==='run'};
    if(event.line)setBubble(p.id,event.line);
    if(event.action==='toilet'&&wcDoor){wcDoor.rotation.y=Math.PI/2;clearTimeout(wcDoorTimer);wcDoorTimer=setTimeout(()=>{wcDoor.rotation.y=0;},event.duration);}
  }
  if(event.action==='meditate'){
    p.pose='meditate';p.meditating=true;p.poseUntil=performance.now()+event.duration;
    setBubble(p.id,event.line);
  }
  if(event.action==='money'){
    p.moneyUntil=performance.now()+5000;
    createMoneyShower(p);
  }
  const actionLabel={run:'tốc biến',meditate:'ngồi thiền',toilet:'đi toilet',money:'lúa về'}[event.action]||event.action;
  addFeed(`${avatarIcons[p.avatar]||'🙂'} ${p.name} ${actionLabel}`);
});
socket.on('connect_error',()=>{
  if(!modal.classList.contains('hidden'))document.querySelector('#join-error').textContent='Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  toast('Đang thử kết nối lại…');
});
socket.on('disconnect',()=>{
  if(!hasJoinedRoom)return;
  document.querySelector('#invite').disabled=true;
  document.querySelector('#room-label').textContent='Đang kết nối lại…';
  document.querySelector('#count-label').textContent='…/50';
  toast('Mất kết nối phòng, đang tự nối lại…');
});
socket.on('connect',()=>{
  if(!hasJoinedRoom||!roomCode)return;
  socket.timeout(8000).emit('join',{name:myName,avatar:myAvatar,room:roomCode},(error,result)=>{
    if(error||result?.error||!result?.ok){toast(result?.error||'Chưa vào lại được phòng. Đang thử kết nối lại…');return;}
    toast('Đã kết nối lại phòng.');
  });
});

let lastMove=0;
let lastFrame=performance.now();
function createMoneyShower(player){
  if(!moneyTexture){
    const textureCanvas=document.createElement('canvas');
    textureCanvas.width=256;textureCanvas.height=128;
    const context=textureCanvas.getContext('2d');
    context.fillStyle='#7fe0a2';context.fillRect(0,0,256,128);
    context.strokeStyle='#178b58';context.lineWidth=9;context.strokeRect(8,8,240,112);
    context.fillStyle='#16834e';context.font='900 64px Nunito, sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('$',128,66);
    moneyTexture=new THREE.CanvasTexture(textureCanvas);moneyTexture.colorSpace=THREE.SRGBColorSpace;
  }
  for(let index=0;index<Math.min(16,100-moneyBills.length);index++){
    const material=new THREE.MeshBasicMaterial({map:moneyTexture,side:THREE.DoubleSide,transparent:true});
    const bill=new THREE.Mesh(new THREE.PlaneGeometry(.62,.3),material);
    bill.position.set(player.group.position.x,1.5+Math.random()*1.5,player.group.position.z);
    bill.userData.velocity=new THREE.Vector3((Math.random()-.5)*6,2+Math.random()*3,(Math.random()-.5)*6);
    bill.userData.spin=(Math.random()-.5)*7;bill.userData.expires=performance.now()+5000;
    scene.add(bill);moneyBills.push(bill);
  }
}
function animateRun(player,now){
  const motion=player.runMotion;if(!motion)return false;
  const t=Math.min(1,(now-motion.started)/motion.duration);
  const eased=t*t*(3-2*t);
  const lengths=[];let total=0;
  for(let i=0;i<motion.points.length-1;i++){const length=motion.points[i].distanceTo(motion.points[i+1]);lengths.push(length);total+=length;}
  let distance=total*eased,index=0;
  while(index<lengths.length-1&&distance>lengths[index]){distance-=lengths[index];index++;}
  const segmentLength=lengths[index]||1;
  const from=motion.points[index],to=motion.points[index+1];
  const progress=THREE.MathUtils.clamp(distance/segmentLength,0,1);
  player.group.position.lerpVectors(from,to,progress);
  player.group.rotation.y=Math.atan2(-(to.x-from.x),-(to.z-from.z));
  player.group.position.y=motion.jump?Math.sin(t*Math.PI)*.32:Math.sin(t*Math.PI*8)*.035;
  if(t>=1){player.group.position.copy(motion.points.at(-1));player.group.position.y=0;player.target.copy(motion.points.at(-1));player.runMotion=null;}
  return true;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  const me=players.get(selfId);
  if(me) {
    let dx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    let dz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
    const running=animateRun(me,now);
    if(!running&&targetWorld){const tx=targetWorld.x-me.group.position.x,tz=targetWorld.z-me.group.position.z;const d=Math.hypot(tx,tz);if(d>.35){dx=tx/d;dz=tz/d;}else targetWorld=null;}
    if(!running&&me.workSeatId&&!me.working){dx=0;dz=0;}
    if(now<(me.khoaDen||0)){dx=0;dz=0;}
    if(!running&&(dx||dz)){const mag=Math.hypot(dx,dz);dx/=mag;dz/=mag;me.group.position.x=THREE.MathUtils.clamp(me.group.position.x+dx*5.2*dt,-18.4,18.4);me.group.position.z=THREE.MathUtils.clamp(me.group.position.z+dz*5.2*dt,-11.5,11.5);me.group.rotation.y=Math.atan2(-dx,-dz);}
    if(socket.connected&&now>=(me.khoaDen||0)&&now-lastMove>100){socket.volatile.emit('move',{x:me.group.position.x,z:me.group.position.z,yaw:me.group.rotation.y});lastMove=now;}
    const look=new THREE.Vector3(me.group.position.x,0,me.group.position.z);
    const distance=innerWidth<760?16:12;
    camera.position.lerp(new THREE.Vector3(look.x,distance,look.z+distance),.06);camera.lookAt(look);
  }
  for(const p of players.values()){
    if(p.pose==='meditate'){
      if(now<p.poseUntil){const base=p.id===selfId?1.08:1;p.body.scale.set(base,.76*base,base);p.body.position.y=-.12;}
      else{p.pose='';p.meditating=false;p.body.scale.set(1,1,1);p.body.position.y=0;p.group.position.y=0;}
    }
    if(p.moneyUntil){if(now<p.moneyUntil)p.group.position.y=.8+Math.abs(Math.sin(now*.012))*.22;else{p.group.position.y=0;p.moneyUntil=0;}}
    if(p.id!==selfId){const running=animateRun(p,now);if(!running)p.group.position.lerp(p.target,Math.min(1,dt*11));if(Number.isFinite(p.yaw))p.group.rotation.y=THREE.MathUtils.lerp(p.group.rotation.y,p.yaw,.15);}
  }
  for(const p of players.values())hoatAnh(p,now);
  for(let i=vatNem.length-1;i>=0;i--){
    const v=vatNem[i],dich=players.get(v.dich),t=Math.min(1,(now-v.batDau)/2000);
    if(!dich||t>=1){scene.remove(v.sprite);v.sprite.material.map.dispose();v.sprite.material.dispose();vatNem.splice(i,1);continue;}
    const den=dich.group.position.clone().add(new THREE.Vector3(0,1.1,0));v.sprite.position.lerpVectors(v.tu,den,t);v.sprite.position.y+=Math.sin(t*Math.PI)*2;
  }
  dinhViRadio();
  const nowEpoch=Date.now();
  for(const [seatId,display] of workDisplays){
    const worker=[...players.values()].find(player=>player.working&&player.workSeatId===seatId);
    paintWorkDisplay(display,worker?Math.min(999,Math.floor(Math.max(0,nowEpoch-worker.workStartedAt)/1000)):null);
  }
  for(const p of players.values())if(p.auraUntil){
    if(nowEpoch<p.auraUntil){const pulse=.72+Math.sin(now*.004)*.12;if(p.auraSprite)p.auraSprite.material.opacity=pulse;if(p.auraRing)p.auraRing.rotation.z+=dt*.8;}
    else clearAura(p);
  }
  for(let index=moneyBills.length-1;index>=0;index--){
    const bill=moneyBills[index];bill.position.addScaledVector(bill.userData.velocity,dt);bill.userData.velocity.y-=5.4*dt;bill.rotation.z+=bill.userData.spin*dt;
    bill.material.opacity=Math.min(1,(bill.userData.expires-now)/650);
    if(now>=bill.userData.expires||bill.position.y<-.5){scene.remove(bill);bill.geometry.dispose();bill.material.dispose();moneyBills.splice(index,1);}
  }
  if(!document.hidden)renderer.render(scene,camera);
}

function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.fov=innerWidth<760?54:40;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);

const query=new URLSearchParams(location.search);
if(query.get('room'))document.querySelector('#room').value=query.get('room');
document.querySelector('#name').value=localStorage.getItem('smlName')||'';
document.querySelector('#join-form').addEventListener('submit',()=>localStorage.setItem('smlName',document.querySelector('#name').value.trim()));

function capNhatNhac(state){
  if(!state)return;trangThaiNhac=state;
  document.querySelector('#radio-panel').classList.toggle('has-music',Boolean(state.videoId));
  document.querySelector('#music-status').textContent=state.videoId?(state.playing?'Đang phát chung trong phòng':'Nhạc đang tạm dừng'):'Chưa có nhạc • mọi người cùng nghe';
  if(!state.videoId)return;
  if(!window.YT?.Player){if(!document.querySelector('#youtube-api')){const script=document.createElement('script');script.id='youtube-api';script.src='https://www.youtube.com/iframe_api';document.head.append(script);}return;}
  if(!trinhPhat){trinhPhat=new YT.Player('youtube-player',{width:300,height:200,videoId:state.videoId,playerVars:{playsinline:1,origin:location.origin},events:{onReady:()=>{sanSangNhac=true;dongBoNhac();},onAutoplayBlocked:()=>document.querySelector('#music-status').textContent='Bấm Bật âm thanh để nghe nhạc chung',onError:()=>document.querySelector('#music-status').textContent='Video không cho phép phát nhúng. Hãy chọn bài khác.'}});return;}
  dongBoNhac();
}
window.onYouTubeIframeAPIReady=()=>capNhatNhac(trangThaiNhac);
function dongBoNhac(){
  if(!sanSangNhac||!trangThaiNhac?.videoId)return;
  const n=trangThaiNhac,giay=n.position+(n.playing?(Date.now()-n.changedAt)/1000:0);
  if(trinhPhat.getVideoData()?.video_id!==n.videoId)trinhPhat.loadVideoById({videoId:n.videoId,startSeconds:giay});
  else if(Math.abs(trinhPhat.getCurrentTime()-giay)>2)trinhPhat.seekTo(giay,true);
  if(n.playing)trinhPhat.playVideo();else trinhPhat.pauseVideo();
}
function guiNhac(data){socket.timeout(8000).emit('music',data,(err,result)=>{if(err||result?.error)toast(result?.error||'Chưa gửi được yêu cầu phát nhạc.');});}
socket.on('music-state',capNhatNhac);
document.querySelector('#music-form').addEventListener('submit',e=>{e.preventDefault();guiNhac({url:document.querySelector('#music-url').value,action:'play'});});
document.querySelector('#music-pause').onclick=()=>guiNhac({action:'pause'});
document.querySelector('#music-resume').onclick=()=>guiNhac({action:'play'});
document.querySelector('#music-sound').onclick=()=>{if(trinhPhat&&sanSangNhac){trinhPhat.unMute();trinhPhat.setVolume(60);dongBoNhac();}};
setInterval(()=>{if(!document.hidden)dongBoNhac();},10000);
function dinhViRadio(){
  const diem=new THREE.Vector3(0,3,-12.4).project(camera),khung=document.querySelector('.world-wrap'),panel=document.querySelector('#radio-panel');
  const w=khung.clientWidth,h=khung.clientHeight;
  if(diem.z>1||diem.y>.65||diem.y<-.65||Math.abs(diem.x)>.7){diem.x=-1+330/w;diem.y=1-300/h;}
  panel.style.left=`${Math.max(165,Math.min(w-165,(diem.x+1)/2*w))}px`;
  panel.style.top=`${Math.max(150,Math.min(h-150,(-diem.y+1)/2*h))}px`;
}

document.querySelector('#target-select').addEventListener('change',e=>{if(e.target.value)selectPlayer(e.target.value);else{selectedId='';document.querySelector('#target-name').textContent='chưa chọn ai';}});
