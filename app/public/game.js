import * as THREE from '/three.module.js';
import {tinhGocMay} from './goc-may.js';
import {CSS3DRenderer,CSS3DObject} from '/css3d.js';

import {banTho} from './ban-tho.js';

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
scene.fog = new THREE.Fog('#c5b0c1', 120, 240);
const canhRadio=new THREE.Scene();
const veRadio=new CSS3DRenderer();
veRadio.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';
document.querySelector('.world-wrap').append(veRadio.domElement);
const bangRadio=new CSS3DObject(document.querySelector('#radio-panel'));
bangRadio.position.set(-13.5,2,-12.7);
bangRadio.scale.setScalar(.014);
canhRadio.add(bangRadio);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 240);
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
  sprite.material.depthTest = true;
  sprite.position.set(x, 2.35, z);
  sprite.scale.set(3.8, .92, 1);
  scene.add(sprite);
}

let wcDoor = null;
const cuaHop=new Map();
let wcDoorTimer = null;

function enclosedRoom(xMin, xMax, zMin, zMax, title, doorX) {
  const vatLieu = title==='WC' ? mat('#fff3bd') : new THREE.MeshStandardMaterial({color:'#f0f0f0',transparent:true,opacity:.18,roughness:.2,depthWrite:false,side:THREE.DoubleSide});
  const truocVach=scene.children.length;
  const wallHeight = 2.6;
  const wallY = wallHeight / 2;
  const wallWidth = .26;
  const doorWidth = 1.55;
  box(scene, wallWidth, wallHeight, zMax - zMin, vatLieu, xMin, wallY, (zMin + zMax) / 2);
  box(scene, wallWidth, wallHeight, zMax - zMin, vatLieu, xMax, wallY, (zMin + zMax) / 2);
  box(scene, xMax - xMin, wallHeight, wallWidth, vatLieu, (xMin + xMax) / 2, wallY, zMin);
  const leftWidth = doorX - doorWidth / 2 - xMin;
  const rightWidth = xMax - (doorX + doorWidth / 2);
  if (leftWidth > 0) box(scene, leftWidth, wallHeight, wallWidth, vatLieu, xMin + leftWidth / 2, wallY, zMax);
  if (rightWidth > 0) box(scene, rightWidth, wallHeight, wallWidth, vatLieu, doorX + doorWidth / 2 + rightWidth / 2, wallY, zMax);
  for(const o of scene.children.slice(truocVach))if(title!=='WC')o.castShadow=false;
  box(scene, .14, wallHeight, .16, mats.trim, doorX - doorWidth / 2, wallY, zMax);
  box(scene, .14, wallHeight, .16, mats.trim, doorX + doorWidth / 2, wallY, zMax);
  box(scene, doorWidth + .14, .16, .16, mats.trim, doorX, wallHeight - .08, zMax);
  const door = new THREE.Group();
  door.position.set(doorX - doorWidth / 2 + .08, 0, zMax + .03);
  scene.add(door);
  box(door, doorWidth - .16, 2.28, .12, vatLieu, (doorWidth - .16) / 2, 1.14, 0);
  box(door, .06, .13, .06, mats.dark, doorWidth * .34, 1.12, -.08);
  if (title === 'WC') wcDoor = door;else cuaHop.set(title,door);
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
  taoBanTho();
  conferenceRoom(14.5, -8.5);
  conferenceRoom(14.5, 5.1);
  for (const [index, z] of [11.4,.4,2.6,4.8,7,9.2].entries()) workTable(z,`desk-${index+1}`);
  for (const [x,z] of [[-18.8,-5.7],[-16.8,-5.7],[12.2,-4.2],[18.8,-4.2],[12.2,8.9],[18.8,8.9],[-18.5,11.8],[18.5,11.8]]) plant(x,z);
  box(scene, .12, .85, 5.2, mats.wallLight, -6.8, .17, -8.3);
  box(scene, .12, .85, 5.2, mats.wallLight, 6.8, .17, -8.3);
  for (let x=-3.5;x<=3.5;x+=2.3) stool(x, 8.2);
  const sign=box(scene,3,.85,.14,mats.purple,0,1.7,-12.83);
  sign.material=mat('#665379');
  makeRoomLabel('VP SỜ MỜ LỜ', 0, -12.2);
}

function taoBanTho() {
  const ke = new THREE.Group();
  ke.position.set(banTho.x, 0, banTho.z);
  scene.add(ke);
  const go = mat('#863e29');
  const son = mat('#aa4731');
  const vang = mat('#eec55d');
  box(ke, 2.8, .25, 1.5, go, 0, .125, .05);
  box(ke, 2.65, .95, 1.35, son, 0, .7, .05);
  box(ke, 2.9, .15, 1.55, vang, 0, 1.24, .05);
  box(ke, 2.6, 1.25, .16, go, 0, 1.91, -.55);
  for (const x of [-1.2, 1.2]) {
    box(ke, .16, 1.25, .2, son, x, 1.91, -.48);
    box(ke, .12, .26, .12, son, x, 1.45, .56);
    sphere(ke, x, 1.62, .56, .065, .11, .065, vang, 8);
  }
  box(ke, 2.85, .2, .95, son, 0, 2.62, -.22);
  for (const x of [-.59, .59]) {
    sphere(ke, x, 1.65, -.2, .27, .34, .23, son, 12);
    sphere(ke, x, 2.02, -.2, .19, .2, .18, mats.cream, 12);
    sphere(ke, x, 2.19, -.2, .21, .07, .19, vang, 12);
  }
  const batHuong = new THREE.Mesh(new THREE.CylinderGeometry(.19,.15,.2,12), mats.cream);
  batHuong.position.set(0,1.42,.53);
  ke.add(batHuong);
  for (const x of [-.07, 0, .07]) box(ke,.02,.29,.02,son,x,1.62,.53);
  for (const x of [-.68,.68]) sphere(ke,x,1.43,.57,.13,.13,.13,vang,10);
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
    let fontSize=seconds>=1000?68:seconds<100?126:92;context.font=`900 ${fontSize}px Nunito, sans-serif`;
    while(context.measureText(text).width>canvas.width-20&&fontSize>34){fontSize-=3;context.font=`900 ${fontSize}px Nunito, sans-serif`;}
    context.fillStyle='#8ef2c1';context.textAlign='center';context.textBaseline='middle';context.fillText(text,canvas.width/2,canvas.height/2);
  }
  display.texture.needsUpdate=true;
}

function setAura(player,auraUntil,scale=1){
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
    player.auraSprite.position.set(0,1.25,.02);player.auraSprite.renderOrder=2;player.group.add(player.auraSprite);
    player.auraRing=new THREE.Mesh(new THREE.TorusGeometry(.78,.035,8,40),new THREE.MeshBasicMaterial({color:'#ffe682',transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
    player.auraRing.rotation.x=Math.PI/2;player.auraRing.position.y=.09;player.auraRing.renderOrder=2;player.group.add(player.auraRing);
  }
  player.auraSprite.scale.set(2.8*scale,2.8*scale,1);
  player.auraRing.scale.setScalar(scale);
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

function taoCanhTay(than, chatLieu, ben, ngang, cao, sau, dai, rong, doXoe) {
  const tyLe = [[0,-1.12],[.58,-1.1],[.94,-1.03],[1,-.94],[.93,-.85],[.74,-.72],[.73,-.53],[.8,-.31],[.87,-.12],[.79,.04],[.53,.12],[0,.16]];
  const matCat = tyLe.map(([banKinh, viTri])=>new THREE.Vector2(banKinh*rong,viTri*dai));
  const tay = new THREE.Mesh(new THREE.LatheGeometry(matCat,16),chatLieu);
  tay.position.set(ben*ngang,cao,sau);
  tay.rotation.z=ben*doXoe;
  tay.userData.tay=true;
  than.add(tay);
  return tay;
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
    body.userData.thanCuon=body.children.slice();
    body.userData.longRan=fur;
    body.userData.caoDauRan=-headShift;
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
    for(const ben of [-1,1]) {
      const tay=taoCanhTay(body,fur,ben,.41,.87,.02,.72,.126,.13);
      for(let i=0;i<3;i++) {
        const mong=new THREE.Mesh(new THREE.ConeGeometry(.029,.13,7),mat('#e8ddbd'));
        mong.position.set((i-1)*.055,-.79,-.025);
        mong.rotation.x=Math.PI;
        tay.add(mong);
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
    for(const ben of [-1,1])taoCanhTay(body,fur,ben,.425,.99,-.035,.54,.14,.31);
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
    for(const ben of [-1,1])taoCanhTay(body,fur,ben,.455,.99,-.045,.53,.15,.35);
  }
  if(type!=='snake') for(const x of [-.3,.3]) {
    const tall=type==='cow'||type==='leopard';
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(tall?.12:.1,tall?.14:.13,tall?.44:.34,8),type==='sloth'?fur:dark);
    leg.userData.chan=true;leg.position.set(x,tall?.21:.15,.05); leg.castShadow=true; body.add(leg);
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
  root.userData.chan=body.children.filter(o=>o.userData.chan);
  root.userData.body = body;
  return root;
}

office();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let targetWorld = null;
const nguoiBatKhoiWc=new Set();
let cotKhoiWc=[];
let vatLieuKhoiWc;
function capNhatKhoiWc(id,bat){
  if(bat)nguoiBatKhoiWc.add(id);
  else nguoiBatKhoiWc.delete(id);
  if(nguoiBatKhoiWc.size&&!cotKhoiWc.length){
    const mau=taoHinhChichDien('fish',true);
    vatLieuKhoiWc=mau.material;
    vatLieuKhoiWc.color.set('#68ef25');
    const anh=vatLieuKhoiWc.map.image;
    const ve=anh.getContext('2d');
    ve.globalCompositeOperation='source-in';
    ve.fillStyle='#8aff39';
    ve.fillRect(0,0,anh.width,anh.height);
    vatLieuKhoiWc.map.needsUpdate=true;
    for(let hang=0;hang<3;hang++){
      for(let cot=0;cot<5;cot++){
        const khoi=new THREE.Sprite(vatLieuKhoiWc);
        khoi.renderOrder=106;
        khoi.scale.set(.72,1.65,1);
        scene.add(khoi);
        cotKhoiWc.push(khoi);
      }
    }
  }
  for(const khoi of cotKhoiWc)khoi.visible=nguoiBatKhoiWc.size>0;
}
socket.on('khoi-wc',event=>capNhatKhoiWc(event.id,event.bat));
function veKhoiWc(now){
  if(!nguoiBatKhoiWc.size)return;
  for(const [i,khoi] of cotKhoiWc.entries()){
    const pha=(now/2400+i*.137)%1;
    khoi.position.set(-19.14+(i%5)*.67+Math.sin(pha*Math.PI*2)*.13,3.17+pha*.8,-10.05+Math.floor(i/5)*1.34);
    khoi.scale.set(.63+pha*.29,1.38+pha*.5,1);
  }
}
let thaoTacGanNhat=-Infinity;
function guiThaoTac(){
  if(!hasJoinedRoom||!socket.connected)return;
  const now=performance.now();
  if(now-thaoTacGanNhat<300)return;
  thaoTacGanNhat=now;
  socket.emit('thao-tac');
}
document.addEventListener('pointerdown',guiThaoTac,true);
document.addEventListener('keydown',guiThaoTac,true);
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
  const entry={...data,group,body:group.userData.body,nameSprite:name,bubbleSprite:null,target:new THREE.Vector3(data.x||0,0,data.z||0),poseUntil:0,working:Boolean(data.working),workSeatId:data.workSeatId||'',workStartedAt:data.workStartedAt||0,meditating:false,auraUntil:0,auraSprite:null,auraRing:null};
  players.set(data.id,entry);
  if(data.khoiWc)capNhatKhoiWc(data.id,true);
  if(data.batDauMuaVo)batDauMuaVo(entry,data.batDauMuaVo);
  if(data.id!==selfId){const opt=document.createElement('option');opt.value=data.id;opt.textContent=data.name;document.querySelector('#target-select').append(opt);}
  if(entry.working&&data.bubbleUntil>Date.now())setBubble(data.id,data.bubble,data.bubbleUntil-Date.now());
  if(data.auraUntil>Date.now())setAura(entry,data.auraUntil,2);
  else if(data.workGlow&&data.working)setAura(entry,Infinity);
  if(data.pose==='dance'&&data.poseUntil>Date.now()){
    const ketThuc=performance.now()+data.poseUntil-Date.now();
    batDauNhay(entry,data.dieuNhay,ketThuc-3000,ketThuc);
  }
  return entry;
}

function setBubble(id,text,thoiGian=6500) {
  const p=players.get(id); if(!p)return;
  clearTimeout(p.bubbleTimer);
  if(!text){
    if(p.bubbleSprite){p.bubbleSprite.visible=false;p.bubbleSprite.material.map?.dispose();p.bubbleSprite.material.dispose();p.group.remove(p.bubbleSprite);p.bubbleSprite=null;}
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
  p.bubbleTimer=setTimeout(()=>{p.bubbleSprite.visible=false;},thoiGian);
}

function removePlayer(id) {
  const p=players.get(id); if(!p)return;
  clearAura(p);
  capNhatKhoiWc(id,false);
  dungMuaVo(p);
  donChichDien(p);
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
  if(action==='meditate'||action==='toilet'||action==='money'||action==='dance'){socket.emit('self-action',action);return;}
  if(action==='meeting'){socket.emit('urgent-meeting');return;}
  if(action==='work'){socket.emit('work');return;}
  if(!selectedId&&action!=='bow'&&action!=='shock')return toast('Chạm vào một người chơi khác để chọn họ nhé.');
  socket.emit('act',{target:selectedId,action,item});
}));
const actionKeys={KeyZ:'bonk',KeyX:'punch',KeyC:'smirk',KeyB:'bow',KeyV:'shock',KeyM:'meditate',KeyN:'toilet'};
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

const bangAnhHung=document.createElement('div');
bangAnhHung.className='bang-anh-hung';
bangAnhHung.setAttribute('aria-live','polite');
document.querySelector('.world-wrap').append(bangAnhHung);
function ghimAnhHung(hero){
  const conLai=hero.until-Date.now();
  if(conLai<=0)return;
  const dong=document.createElement('div');
  dong.textContent=`🏆 ANH HÙNG LAO ĐỘNG ${hero.name} · 9999s`;
  bangAnhHung.append(dong);
  setTimeout(()=>dong.remove(),conLai);
}
socket.on('work-hero',ghimAnhHung);

socket.on('joined',data=>{
  bangAnhHung.replaceChildren();
  for(const hero of data.heroes||[])ghimAnhHung(hero);
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
  if(event.working){p.meditating=false;p.pose='';p.body.scale.set(1,1,1);p.body.position.y=0;setBubble(event.id,event.text||'kiếp trâu ngựa',Math.max(0,(event.bubbleUntil||p.workStartedAt+10000)-Date.now()));}
  else{
    setBubble(event.id,'');
    if(p.auraUntil===Infinity)clearAura(p);
  }
});
socket.on('work-milestone',event=>{
  if(event.seconds===999){
    const p=players.get(event.id);
    if(p?.working&&!(p.auraUntil>Date.now()&&p.auraUntil!==Infinity))setAura(p,Infinity);
  }
  if(!event.final)addFeed(`${event.name} đã làm việc được ${event.seconds}s`,'work');
});
socket.on('work-complete',event=>{
  const p=players.get(event.id);if(!p)return;
  p.workSeatId='';p.working=false;p.workStartedAt=0;p.meditating=false;p.pose='';setBubble(p.id,'');
  const destination=new THREE.Vector3(event.x,0,event.z);
  p.runMotion={points:[p.group.position.clone(),destination],started:performance.now(),duration:event.duration,jump:true};
  p.target.copy(destination);
  p.khoaDen=performance.now()+event.duration;
  if(p.id===selfId)targetWorld=null;
  setAura(p,event.auraUntil,2);
});
socket.on('urgent-meeting',event=>{
  targetWorld=null;
  for(const cua of [...cuaHop.values(),wcDoor].filter(Boolean)){cua.rotation.y=Math.PI/2;clearTimeout(cua.userData.dong);cua.userData.dong=setTimeout(()=>{cua.rotation.y=0;renderer.shadowMap.needsUpdate=true;},event.duration+500);}
  renderer.shadowMap.needsUpdate=true;
  for(const data of event.players||[]){
    const p=players.get(data.id);if(!p)continue;
    p.workSeatId='';p.working=false;p.meditating=false;p.pose='';setBubble(p.id,'');
    if(p.nhay)p.nhay.ketThuc=0;
    p.khoaDen=performance.now()+(data.duration||event.duration);
    p.runMotion={points:[p.group.position.clone(),...(data.path||[{x:data.x,z:data.z}]).map(v=>new THREE.Vector3(v.x,0,v.z))],started:performance.now(),duration:data.duration||event.duration,jump:false};
    p.target.set(data.x,0,data.z);
  }
});
socket.on('act',event=>{
  const from=players.get(event.from),to=players.get(event.to);
  if(!from||(!to&&!event.altar))return;
  const cau={punch:'vừa đấm vào',bonk:'vừa kí đầu',smirk:'vừa cười khinh vào',bow:'vừa quỳ lạy trước',shock:'vừa chích điện'};
  if(event.action==='shock'&&from===to)addFeed(`⚡ ${from.name} tự chích điện`);
  else addFeed(event.action==='throw'?`${event.fromName} vừa ném ${event.item} cho ${event.targetName}`:`${event.fromName} ${cau[event.action]} ${event.altar?"bàn thần tài":event.targetName}`);
  const now=performance.now();
  if(event.approach){
    from.khoaDen=now+event.approach+event.duration;
    if(to)to.khoaDen=from.khoaDen;
    if(from.id===selfId||to?.id===selfId)targetWorld=null;
    from.runMotion={points:[from.group.position.clone(),new THREE.Vector3(event.x,0,event.z)],started:now,duration:event.approach,jump:false};
    from.hanhDong={loai:event.action,batDau:now+event.approach,ketThuc:now+event.approach+(event.action==='shock'?420:event.duration),yaw:event.yaw};
    from.yaw=event.yaw;
  }
  if(event.altar){
    taoThoiVang(from,now+event.approach);
    setTimeout(()=>{
      if(players.get(from.id)===from&&event.line)hienLoiBanThanTai(event.line);
    },event.approach);
  }
  if(event.action==='throw')taoVatNem(from,to,event.item,now);
});
socket.on('act-impact',event=>{
  const to=players.get(event.to);if(!to)return;
  const tuChich=event.action==='shock'&&event.from===event.to;
  setBubble(event.to,tuChich?'':event.line);
  if(event.action==='shock')batDauChichDien(to,event.duration);
  if(['punch','bonk'].includes(event.action)){
    to.hanhDong={loai:'nga',batDau:performance.now(),ketThuc:performance.now()+2000};
    to.khoaDen=performance.now()+2000;
    if(to.choang){to.group.remove(to.choang);to.choang.material.map.dispose();to.choang.material.dispose();}
    to.choang=taoIcon('💫');to.choang.position.set(0,1.3,0);to.group.add(to.choang);
  }
});
function taoHinhChichDien(loai, laKhoi=false){
  const anh=document.createElement('canvas');
  anh.width=anh.height=256;
  const ve=anh.getContext('2d');
  const oval=(x,y,rx,ry,mau)=>{
    ve.fillStyle=mau;
    ve.beginPath();
    ve.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    ve.fill();
  };
  const net=(diem,mau,rong)=>{
    ve.strokeStyle=mau;
    ve.lineWidth=rong;
    ve.lineCap=ve.lineJoin='round';
    ve.beginPath();
    diem.forEach(([x,y],i)=>i?ve.lineTo(x,y):ve.moveTo(x,y));
    ve.stroke();
  };
  const trang='#fff9df', den='#171725';
  if(laKhoi){
    const anhKhoi=ve.createImageData(256,256);
    for(let y=0;y<256;y++){
      const cao=1-y/255;
      const tam=128+21*Math.sin(cao*8)-8*Math.sin(cao*17);
      const rong=9+48*cao;
      const mo=Math.min(1,cao*14,(1-cao)*3);
      for(let x=0;x<256;x++){
        const ngang=(x-tam)/rong;
        const nhieu=.14*Math.sin(x*.09+y*.12)+.08*Math.sin(x*.23-y*.17);
        const dam=Math.max(0,1-ngang*ngang+nhieu)*mo;
        const i=(y*256+x)*4;
        anhKhoi.data[i]=40+34*cao;
        anhKhoi.data[i+1]=41+35*cao;
        anhKhoi.data[i+2]=49+39*cao;
        anhKhoi.data[i+3]=Math.min(230,235*dam*dam);
      }
    }
    ve.putImageData(anhKhoi,0,0);
  }else{
    const ran=loai==='snake', ca=loai==='fish', luoi=loai==='sloth', bo=loai==='cow';
    const y=ca?126:77;
    const xuong=ran?[[128,108],[126,144],[158,156],[173,177],[162,198],[126,203],[89,195],[74,176],[93,159],[139,169],[151,190],[138,214],[96,225],[63,212]]:ca?[[105,127],[162,129],[202,128]]:[[128,107],[128,145],[128,179]];
    const chi=ran?[]:ca?[[[166,130],[209,101]],[[166,130],[211,153]],[[131,131],[146,163]]]:[
      [[117,122],[luoi?67:86,147],[luoi?48:63,luoi?190:154]],
      [[139,122],[luoi?189:170,147],[luoi?208:193,luoi?190:154]],
      [[115,168],[99,197],[83,211]],[[141,168],[157,197],[173,211]]
    ];
    if(!ran&&!ca)oval(128,145,39,44,den);
    for(const nhanh of [xuong,...chi]){net(nhanh,den,ran?25:22);net(nhanh,trang,ran?10:8);}
    if(!ran&&!ca){
      for(const [yy,rr] of [[127,24],[140,27],[153,21]])net([[128-rr,yy],[128,yy+8],[128+rr,yy]],trang,5);
      if(loai==='leopard'){net([[148,170],[181,183],[207,169],[214,149]],den,15);net([[148,170],[181,183],[207,169],[214,149]],trang,6);}
    }
    const x=ca?91:128;
    if(bo)for(const ben of [-1,1]){net([[x+ben*29,y-22],[x+ben*49,y-39],[x+ben*48,y-50]],den,15);net([[x+ben*29,y-22],[x+ben*49,y-39],[x+ben*48,y-50]],trang,7);}
    if(loai==='leopard')for(const ben of [-1,1]){oval(x+ben*35,y-30,14,15,den);oval(x+ben*35,y-30,8,9,trang);}
    oval(x,y,ca?43:45,ca?36:41,den);
    oval(x,y,ca?35:37,ca?29:34,trang);
    oval(x-13,y-4,luoi?12:9,11,den);oval(x+13,y-4,luoi?12:9,11,den);
    oval(x,y+10,4,5,den);
    net([[x-13,y+20],[x+13,y+20]],den,4);
    for(const dx of [-8,0,8])net([[x+dx,y+16],[x+dx,y+24]],den,3);
    for(const tia of [[[30,52],[45,74],[30,78],[50,99]],[[207,44],[191,68],[208,69],[193,92]],[[34,139],[22,152],[36,163],[22,176]],[[228,135],[214,153],[229,157],[214,178]]])net(tia,'#ff9d13',7);
  }
  const vatLieu=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(anh),transparent:true,depthTest:false,depthWrite:false});
  const hinh=new THREE.Sprite(vatLieu);
  hinh.renderOrder=106;
  return hinh;
}
function donChichDien(p){
  if(!p.chichDien)return;
  const {xuong,khoi,khoiHaiBen}=p.chichDien;
  xuong.material.map.dispose();
  khoi.material.map.dispose();
  for(const hinh of [xuong,khoi,...khoiHaiBen]){
    p.group.remove(hinh);
    hinh.material.dispose();
  }
  p.body.visible=true;
  p.chichDien=null;
}
function batDauChichDien(p,thoiGian){
  donChichDien(p);
  const now=performance.now();
  p.khoaDen=now+thoiGian;
  if(p.id===selfId)targetWorld=null;
  const xuong=taoHinhChichDien(p.avatar);
  const khoi=taoHinhChichDien(p.avatar,true);
  xuong.position.y=p.avatar==='fish'?.68:1.06;
  xuong.scale.setScalar(p.avatar==='fish'?2:2.65);
  khoi.visible=false;
  const khoiHaiBen=[-1,1].map(()=>{
    const cot=khoi.clone();
    cot.material=khoi.material.clone();
    return cot;
  });
  p.group.add(xuong,khoi,...khoiHaiBen);
  p.chichDien={batDau:now,xuong,khoi,khoiHaiBen,huongNgang:new THREE.Vector3()};
  veChichDien(p,now);
}
function veChichDien(p,now){
  const {batDau,xuong,khoi,khoiHaiBen,huongNgang}=p.chichDien;
  const tuoi=now-batDau;
  if(tuoi>=3000){donChichDien(p);return;}
  const chop=tuoi<500||(tuoi>=590&&tuoi<1000);
  xuong.visible=chop;
  p.body.visible=!chop;
  xuong.material.rotation=chop?Math.sin(tuoi*.06)*.08:0;
  khoi.visible=tuoi>=1000;
  for(const cot of khoiHaiBen)cot.visible=khoi.visible;
  if(khoi.visible){
    const t=(tuoi-1000)/2000;
    const caoDau=p.avatar==='fish'?1:p.avatar==='snake'?1.86:1.66;
    khoi.position.set(Math.sin(t*10)*.16,caoDau+.61+t*.51,0);
    khoi.scale.set(1.22+t*.4,1.65+t*.44,1);
    khoi.material.opacity=Math.min(1,(1-t)*3);
    huongNgang.set(1,0,0).applyQuaternion(camera.quaternion)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP,-p.group.rotation.y);
    for(const [i,cot] of khoiHaiBen.entries()){
      const ben=i===0?-1:1;
      cot.position.copy(khoi.position).addScaledVector(huongNgang,ben*(.37+t*.14));
      cot.position.y-=.14;
      cot.scale.set(khoi.scale.x*.8,khoi.scale.y*.85,1);
      cot.material.rotation=ben*.14;
      cot.material.opacity=khoi.material.opacity;
    }
  }
}
let bongBongThanTai;
let henAnLoiThanTai;
function hienLoiBanThanTai(loi){
  clearTimeout(henAnLoiThanTai);
  if(bongBongThanTai){
    scene.remove(bongBongThanTai);
    bongBongThanTai.material.map.dispose();
    bongBongThanTai.material.dispose();
  }
  const bongBong=speechBubble(loi,'#6b3b15');
  bongBong.position.set(banTho.x,2.85+bongBong.scale.y/2,banTho.z+.62);
  scene.add(bongBong);
  bongBongThanTai=bongBong;
  henAnLoiThanTai=setTimeout(()=>{bongBong.visible=false;},5500);
}
function taoIcon(icon){
  const c=document.createElement('canvas');c.width=c.height=96;
  const ctx=c.getContext('2d');
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  if(icon==='KPI'){
    ctx.fillStyle='#b4232b';
    ctx.beginPath();
    ctx.roundRect(4,17,88,62,10);
    ctx.fill();
    ctx.fillStyle='#fff';
    ctx.font='bold 36px sans-serif';
  }else ctx.font='64px sans-serif';
  ctx.fillText(icon,48,48);
  const tex=new THREE.CanvasTexture(c);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(.9,.9,1);sprite.renderOrder=105;return sprite;
}
function taoVatNem(nguoi, dich, icon, now){
  if(vatNem.length>=24)return;
  const sprite=taoIcon(icon);scene.add(sprite);
  vatNem.push({vat:sprite,dich:dich.id,tu:nguoi.group.position.clone().add(new THREE.Vector3(0,1.1,0)),batDau:now,thoiGian:2000,doCao:1.1,doVom:2});
}
function taoThoiVang(nguoi,batDau){
  if(vatNem.length>24)return;
  const cacDich=[
    {doCao:.24,doLui:0,vaoDau:true},
    {doCao:.82,doLui:.26,vaoDau:false},
    {doCao:.2,doLui:1.38,vaoDau:false}
  ];
  for(const [thuTu,dich] of cacDich.entries()){
    const vat=new THREE.Group();
    const chatVang=new THREE.MeshStandardMaterial({color:0xffb51c,emissive:0xb96300,emissiveIntensity:.4,roughness:.26});
    const vo=new THREE.SphereGeometry(1,28,14,0,Math.PI*2,Math.PI/2,Math.PI/2);
    const diem=vo.attributes.position;
    for(let i=0;i<diem.count;i++){
      const x=diem.getX(i);
      diem.setXYZ(i,x*.55,diem.getY(i)*.23+.31*x*x,diem.getZ(i)*.29);
    }
    vo.computeVertexNormals();
    const longThuyen=new THREE.Mesh(vo,chatVang);
    longThuyen.material.side=THREE.DoubleSide;
    vat.add(longThuyen);
    const num=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),chatVang);
    num.scale.set(.34,.28,.24);
    vat.add(num);
    vat.rotation.set(.33,-.42,0);
    vat.visible=false;
    scene.add(vat);
    vatNem.push({vat,dich:nguoi.id,tu:new THREE.Vector3(banTho.x,1.46,banTho.z+.66),batDau:batDau+thuTu*280,thoiGian:820,doVom:1.15,...dich});
  }
}
function hoatAnh(p,now){
  const hd=p.hanhDong;if(!hd||now<hd.batDau)return;
  if(['bow','shock'].includes(hd.loai)&&Number.isFinite(hd.yaw))p.group.rotation.y=hd.yaw;
  const t=(now-hd.batDau)/(hd.ketThuc-hd.batDau);
  const dau=p.group.userData.dau;
  if(t>=1){if(p.choang){p.group.remove(p.choang);p.choang.material.map.dispose();p.choang.material.dispose();p.choang=null;}p.body.rotation.set(0,0,0);p.body.position.y=0;if(dau)dau.rotation.z=0;for(const tay of p.group.userData.tay||[])tay.rotation.x=0;p.hanhDong=null;return;}
  if(hd.loai==='nga'){
    const nga=Math.min(1,t*6);p.body.rotation.x=-Math.PI/2*nga;p.body.position.y=.28*nga;
    if(dau)dau.rotation.z=Math.PI/4;else p.body.rotation.z=Math.PI/4;
    if(p.choang){p.choang.position.x=Math.sin(now*.008)*.35;p.choang.material.rotation=Math.sin(now*.005)*.3;}
  }else if(hd.loai==='shock'){
    const cham=Math.sin(t*Math.PI);
    p.body.rotation.x=.23*cham;
    const tay=p.group.userData.tay?.[0];
    if(tay)tay.rotation.x=1.45*cham;
  }else if(hd.loai==='bow'){
    const nhip=Math.sin((t*2%1)*Math.PI);p.body.rotation.x=-Math.PI/2*Math.min(1,nhip*2);p.body.position.y=.22*nhip;
  }else{
    const danh=Math.sin(Math.min(1,t*5)*Math.PI);p.body.rotation.z=.2*danh;
    const tay=p.group.userData.tay?.[0];if(tay)tay.rotation.x=-Math.PI/2*danh;
  }
}
const dieuNhayNhanVat={
  snake:[[2,1],[1,1],[4,1.2],[3,1.2],[2,1.1]],
  fish:[[3,.8],[2,.85],[5,1.1],[4,1.3],[3,.95]],
  sloth:[[1,.7],[1,.9],[3,.7],[2,.75],[2,1.3]],
  cow:[[2,.9],[1,1.1],[5,1.2],[2,1.05],[3,1.25]],
  leopard:[[3,1.1],[2,1.2],[6,1.3],[3,1.45],[4,1.2]]
};
function batDauNhay(p,kieu,batDau,ketThuc){
  if(!Number.isInteger(kieu)||kieu<0||kieu>4)return;
  p.khoaDen=ketThuc;
  p.runMotion=null;
  p.moneyUntil=0;
  p.moneyAgainAt=0;
  p.pose='';
  p.meditating=false;
  p.group.position.y=0;
  const co=p.id===selfId?1.08:1;
  p.body.scale.setScalar(co);
  p.nhay={kieu,batDau,ketThuc};
  if(p.id===selfId)targetWorld=null;
}
function bungLoXo(p, bung, nhip, duoi=0){
  const than=p.body;
  const dau=p.group.userData.dau;
  const dangBung=bung>.09;
  for(const khoanh of than.userData.thanCuon)khoanh.visible=!dangBung;
  let loXo=than.userData.loXo;
  if(!loXo&&dangBung){
    const duongMau=new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(0,1,0));
    const hinh=new THREE.TubeGeometry(duongMau,48,.1,10);
    hinh.attributes.position.setUsage(THREE.DynamicDrawUsage);
    hinh.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    loXo=new THREE.Mesh(hinh,than.userData.longRan);
    loXo.frustumCulled=false;
    loXo.userData.tam=Array.from({length:49},()=>new THREE.Vector3());
    than.add(loXo);
    than.userData.loXo=loXo;
  }
  if(loXo)loXo.visible=dangBung;
  if(!dangBung){
    dau.position.y=than.userData.caoDauRan;
    return;
  }
  const diem=loXo.geometry.attributes.position;
  const cao=1.38+bung*(.62+.38*nhip);
  const banKinh=.62-bung*(.12+.07*nhip);
  const tam=loXo.userData.tam;
  for(let i=0;i<=48;i++){
    const tiLe=i/48;
    const goc=tiLe*Math.PI*5;
    const thuon=Math.min(1,(1-tiLe)*5);
    const luon=Math.sin((1-tiLe)*Math.PI*3+nhip)*.52*thuon;
    tam[i].set(
      THREE.MathUtils.lerp(Math.cos(goc)*banKinh*thuon,luon,duoi),
      .12+cao*tiLe,
      .03+(1-duoi)*Math.sin(goc)*banKinh*thuon-.11*tiLe
    );
  }
  const tiepTuyen=new THREE.Vector3(), ngang=new THREE.Vector3(), dung=new THREE.Vector3();
  for(let i=0;i<=48;i++){
    tiepTuyen.subVectors(tam[Math.min(48,i+1)],tam[Math.max(0,i-1)]).normalize();
    ngang.crossVectors(tiepTuyen,THREE.Object3D.DEFAULT_UP).normalize();
    dung.crossVectors(tiepTuyen,ngang).normalize();
    const day=.025+.125*Math.min(1,i/8);
    for(let j=0;j<=10;j++){
      const goc=j*Math.PI*2/10;
      const x=-Math.cos(goc)*day, y=Math.sin(goc)*day;
      diem.setXYZ(i*11+j,tam[i].x+ngang.x*x+dung.x*y,tam[i].y+ngang.y*x+dung.y*y,tam[i].z+ngang.z*x+dung.z*y);
    }
  }
  diem.needsUpdate=true;
  loXo.geometry.computeVertexNormals();
  dau.position.y=tam[48].y-1.73;
}

function hoatAnhNhay(p,now){
  const {kieu,batDau,ketThuc}=p.nhay;
  const tay=p.group.userData.tay;
  if(now>=ketThuc){
    p.body.rotation.set(0,0,0);
    p.body.position.set(0,0,0);
    if(p.avatar==='snake')bungLoXo(p,0,0);
    for(const nhan of [p.nameSprite,p.bubbleSprite])if(nhan){nhan.position.x=0;nhan.position.z=0;}
    for(const canh of tay)canh.rotation.x=0;
    p.nhay=null;
    return;
  }
  const [soNhip,bienDo]=dieuNhayNhanVat[p.avatar][kieu];
  const t=THREE.MathUtils.clamp((now-batDau)/(ketThuc-batDau),0,1);
  const pha=t*Math.PI*2*soNhip;
  const vaoRa=Math.min(1,t*8,(1-t)*8);
  const lac=Math.sin(pha)*bienDo*vaoRa;
  const bat=Math.abs(Math.sin(pha/2))*bienDo*vaoRa;
  if(p.avatar==='snake'){
    bungLoXo(p,vaoRa,Math.sin(pha));
    p.body.rotation.set(0,kieu===0?t*Math.PI*2:0,.17*lac);
    p.body.position.y=(kieu===3?.32:.12)*bat;
    return;
  }
  if(p.avatar==='fish'&&kieu===0){
    const goc=t*Math.PI*2;
    const banKinh=1.45*vaoRa;
    const x=Math.sin(goc)*banKinh,z=-Math.cos(goc)*banKinh;
    p.body.position.set(x,.15*bat,z);
    p.body.rotation.set(.08*lac,-goc-Math.PI/2,.14*lac);
    for(const nhan of [p.nameSprite,p.bubbleSprite])if(nhan){nhan.position.x=x;nhan.position.z=z;}
    return;
  }
  if(kieu===0){
    p.body.rotation.set(0,t*Math.PI*2*soNhip,lac*.15);
    p.body.position.y=.22*bat;
  }else if(kieu===1){
    const doc=Math.min(1,t*5,(1-t)*5);
    const cao={snake:1.94,fish:1.68,sloth:1.89,cow:2.03,leopard:1.91}[p.avatar];
    p.body.rotation.set(Math.PI*doc,t*Math.PI*2*soNhip,.13*lac);
    p.body.position.y=cao*Math.sin(doc*Math.PI/2);
  }else if(kieu===2){
    p.body.rotation.set(.1*bat,.23*lac,.29*lac);
    p.body.position.y=.19*bat;
  }else if(kieu===3){
    p.body.rotation.set(-.36*bat,.12*lac,.15*lac);
    p.body.position.y=.53*bat;
  }else{
    p.body.rotation.set(.34*lac,.38*lac,.25*Math.cos(pha)*vaoRa);
    p.body.position.y=.13*bat;
  }
  for(const [i,canh] of tay.entries())canh.rotation.x=kieu===1?-1.12*vaoRa:(i%2?-1:1)*lac*(kieu===4?1.3:.72);
}
const theVo=[
  {tay:[[.74,-.16],[.74,-.16]],chan:[[.19,.24],[-.13,.24]],than:[0,0,0],viTri:[0,.02,0]},
  {tay:[[1.61,.05],[.61,-.33]],chan:[[.78,.16],[-.57,.42]],than:[-.79,.16,-.08],viTri:[-.56,.02,-.58]},
  {tay:[[.61,-.16],[.76,-.28]],chan:[[1.87,.05],[-.13,.08]],than:[-.72,-.27,-.14],viTri:[-.43,.39,-.69]},
  {tay:[[.88,-.24],[2.36,.37]],chan:[[-.35,.35],[.55,.29]],than:[.67,-.08,.13],viTri:[.37,.04,-.24]},
  {tay:[[1.08,1.01],[1.08,1.01]],chan:[[.57,.83],[.57,.83]],than:[0,.16,0],viTri:[0,-.16,.22]},
  {tay:[[1.22,.78],[.57,-.14]],chan:[[1.84,1.07],[-.1,.13]],than:[-1.56,-.19,-.3],viTri:[-.72,.35,.08]},
  {tay:[[.63,-.18],[1.53,.52]],chan:[[-.17,.08],[1.94,.68]],than:[1.68,-.22,.27],viTri:[.57,.45,-.37]},
  {tay:[[1.64,.07],[1.64,.07]],chan:[[.68,.22],[-.6,.37]],than:[.56,.29,0],viTri:[.55,.04,-.83]},
  {tay:[[2.58,.41],[.48,-.36]],chan:[[.52,.35],[-.45,.43]],than:[-.94,-.14,-.17],viTri:[-.46,.12,-.48]},
  {tay:[[.15,.24],[1.17,-.29]],chan:[[.69,.5],[-.47,.35]],than:[-.71,.56,.17],viTri:[-.47,-.04,-.39]},
  {tay:[[.15,1.46],[.15,1.46]],chan:[[.08,.52],[.08,.52]],than:[0,0,0],viTri:[0,.19,.16]},
  {tay:[[2.5,.72],[2.5,.72]],chan:[[0,.06],[0,.06]],than:[0,-.13,0],viTri:[0,.04,0]}
];
const theRan=[
  [.66,.23,.13,0,0,0,0],
  [.95,.86,.48,.14,-.78,-.53,-.58],
  [1,.18,.39,-.14,-.55,-.4,-.7],
  [.87,.12,.25,.28,.66,.34,-.22],
  [1,1.44,.43,0,0,0,.22],
  [.91,1.17,.47,-.19,-1.53,-.68,.08],
  [1,.97,.59,.26,1.66,.55,-.37],
  [.79,.75,.37,.12,.55,.51,-.81],
  [.91,.02,.7,-.14,-.87,-.43,-.45],
  [1,1.29,.44,.19,-.67,-.42,-.34],
  [.43,.23,.41,0,0,0,.15],
  [.64,.08,.29,0,0,0,0]
];
const nhanVatMuaVo={
  fish:{tay:.97,chan:.85,nghieng:1.4,nhip:.9},
  sloth:{tay:.79,chan:.51,nghieng:.72,nhip:.88},
  cow:{tay:.91,chan:.79,nghieng:.91,nhip:1},
  leopard:{tay:1,chan:1,nghieng:1,nhip:1.12}
};

function taoChiCa(p){
  const chatLieu=new THREE.MeshBasicMaterial({color:'#133e50'});
  const chi=[];
  for(const [cao,ngang,dai,doXoe] of [[.62,.6,.53,.67],[.24,.31,.4,.36]]){
    for(const ben of [-1,1]){
      const hinh=new THREE.CapsuleGeometry(.028,dai-.056,3,6);
      hinh.translate(0,-dai/2,0);
      const que=new THREE.Mesh(hinh,chatLieu);
      que.position.set(ben*ngang,cao,-.22);
      que.rotation.z=ben*doXoe;
      p.body.add(que);
      chi.push(que);
    }
  }
  return chi;
}

function batDauMuaVo(p,batDau){
  if(p.nhay){
    p.nhay.ketThuc=0;
    hoatAnhNhay(p,performance.now());
  }
  p.runMotion=null;
  p.pose='';
  p.meditating=false;
  p.moneyUntil=0;
  p.moneyAgainAt=0;
  p.khoaDen=0;
  p.body.scale.set(1,1,1);
  const chi=p.avatar==='fish'?taoChiCa(p):[];
  if(chi.length)for(const chan of p.group.userData.chan)chan.visible=false;
  const tay=chi.length?chi.slice(0,2):p.group.userData.tay;
  const chan=chi.length?chi.slice(2):p.group.userData.chan;
  p.muaVo={batDau,chi,tay,chan,gocTay:tay.map(canh=>canh.rotation.clone()),gocChan:chan.map(chi=>chi.rotation.clone())};
}

function dungMuaVo(p){
  if(!p.muaVo)return;
  const {chi,tay,chan,gocTay,gocChan}=p.muaVo;
  chan.forEach((boPhan,i)=>boPhan.rotation.copy(gocChan[i]));
  tay.forEach((canh,i)=>canh.rotation.copy(gocTay[i]));
  for(const que of chi){
    p.body.remove(que);
    que.geometry.dispose();
  }
  if(chi.length)chi[0].material.dispose();
  for(const boPhan of [...p.group.userData.tay,...p.group.userData.chan]){
    boPhan.rotation.x=0;
    boPhan.visible=true;
  }
  p.body.rotation.set(0,0,0);
  p.body.position.set(0,0,0);
  if(p.avatar==='snake')bungLoXo(p,0,0);
  p.muaVo=null;
}

function veMuaVo(p){
  const ran=p.avatar==='snake';
  const kieu=nhanVatMuaVo[p.avatar];
  const thuVien=ran?theRan:theVo;
  const nhip=Math.max(0,Date.now()-p.muaVo.batDau)/820*(kieu?.nhip||1);
  const i=Math.floor(nhip)%thuVien.length;
  const pha=nhip%1;
  const {tay,chan,gocTay,gocChan}=p.muaVo;
  const dangXoay=i===10;
  const raDon=Math.min(1,pha/(dangXoay?.88:p.avatar==='fish'?.78:.63));
  const muot=raDon*raDon*(3-2*raDon);
  const tu=thuVien[i],den=thuVien[(i+1)%thuVien.length];
  const noi=(dau,cuoi)=>THREE.MathUtils.lerp(dau,cuoi,muot);
  const xoayVong=dangXoay?muot*Math.PI*2:0;
  const cungXoay=Math.sin(xoayVong)*.37;
  if(ran){
    const [duoi,nga,nhun,nghieng,huong,ngang,truoc]=tu.map((giaTri,j)=>noi(giaTri,den[j]));
    bungLoXo(p,.77,Math.sin(nhip*Math.PI*2),duoi);
    p.body.rotation.set(-nga,huong+xoayVong,nghieng);
    p.body.position.set(ngang+cungXoay,nhun,truoc);
    return;
  }
  for(let j=0;j<2;j++){
    const ben=j===0?-1:1;
    const [duaTruoc,moNgang]=tu.tay[j].map((giaTri,k)=>noi(giaTri,den.tay[j][k]));
    tay[j].rotation.set(duaTruoc*kieu.tay,0,gocTay[j].z+ben*moNgang*kieu.tay,'ZXY');
    const [da,buocNgang]=tu.chan[j].map((giaTri,k)=>noi(giaTri,den.chan[j][k]));
    chan[j].rotation.set(da*kieu.chan,0,gocChan[j].z+ben*buocNgang*kieu.chan,'ZXY');
  }
  const [xoay,cui,nghieng]=tu.than.map((giaTri,j)=>noi(giaTri,den.than[j]));
  const [ngang,cao,truoc]=tu.viTri.map((giaTri,j)=>noi(giaTri,den.viTri[j]));
  const vong=thuVien.length;
  const ca=p.avatar==='fish';
  const luon=ca?Math.sin(nhip/vong*Math.PI*4):0;
  p.body.position.set(ngang+cungXoay+luon*.13,cao+(ca?.13:0),truoc);
  p.body.rotation.set(cui*kieu.nghieng,xoay+xoayVong,nghieng*kieu.nghieng+luon*.2);
}

socket.on('mua-vo',event=>{
  const p=players.get(event.id);
  if(!p)return;
  if(!event.batDau){dungMuaVo(p);return;}
  dungMuaVo(p);
  p.group.position.set(event.x,0,event.z);
  p.target.copy(p.group.position);
  p.group.rotation.y=p.yaw=event.yaw;
  if(p.id===selfId)targetWorld=null;
  batDauMuaVo(p,event.batDau);
});
socket.on('self-action',event=>{
  const p=players.get(event.id);if(!p)return;
  p.yaw=event.yaw;
  if(event.action==='dance'){
    if(p.meditating)setBubble(p.id,'');
    p.group.position.set(event.x,0,event.z);
    p.target.copy(p.group.position);
    const now=performance.now();
    batDauNhay(p,event.dieuNhay,now,now+event.duration);
    addFeed(`💃 ${p.name} đang nhảy múa`);
    return;
  }
  if(event.action==='run'||event.action==='toilet'){
    const from=p.group.position.clone();
    const path=(event.path?.length?event.path:[{x:event.x,z:event.z}]).map(point=>new THREE.Vector3(point.x,0,point.z));
    p.runMotion={points:[from,...path],started:performance.now(),duration:event.duration,jump:event.action==='run'};
    if(event.line)setBubble(p.id,event.line);
    if(event.action==='toilet')p.khoaDen=performance.now()+event.duration;
    if(event.action==='toilet'&&wcDoor){wcDoor.rotation.y=Math.PI/2;clearTimeout(wcDoorTimer);wcDoorTimer=setTimeout(()=>{wcDoor.rotation.y=0;},event.duration);}
  }
  if(event.action==='meditate'){
    p.pose='meditate';p.meditating=true;p.poseUntil=performance.now()+event.duration;
    setBubble(p.id,event.line);
  }
  if(event.action==='money'){
    const now=performance.now();
    p.moneyUntil=now+event.duration;
    p.moneyAgainAt=now+event.duration/2;
    createMoneyShower(p,p.moneyUntil);
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
function createMoneyShower(player,expires){
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
    bill.userData.spin=(Math.random()-.5)*7;bill.userData.expires=expires;
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
    const goc=tinhGocMay(me.group.position.x,me.group.position.z,camera.fov,camera.aspect);
    camera.position.set(goc.viTri.x,goc.viTri.y,goc.viTri.z);camera.lookAt(goc.tam.x,goc.tam.y,goc.tam.z);
  }
  for(const p of players.values()){
    if(p.pose==='meditate'){
      if(now<p.poseUntil){const base=p.id===selfId?1.08:1;p.body.scale.set(base,.76*base,base);p.body.position.y=-.12;}
      else{p.pose='';p.meditating=false;p.body.scale.set(1,1,1);p.body.position.y=0;p.group.position.y=0;}
    }
    if(p.moneyUntil){
      if(now<p.moneyUntil){
        p.group.position.y=.8+Math.abs(Math.sin(now*.012))*.22;
        if(p.moneyAgainAt&&now>=p.moneyAgainAt){
          createMoneyShower(p,p.moneyUntil);
          p.moneyAgainAt=0;
        }
      }else{
        p.group.position.y=0;
        p.moneyUntil=0;
        p.moneyAgainAt=0;
      }
    }
    if(p.id!==selfId){const running=animateRun(p,now);if(!running)p.group.position.lerp(p.target,Math.min(1,dt*11));if(!running&&Number.isFinite(p.yaw))p.group.rotation.y=THREE.MathUtils.lerp(p.group.rotation.y,p.yaw,.15);}
  }
  for(const p of players.values()){
    hoatAnh(p,now);
    if(p.nhay)hoatAnhNhay(p,now);
    if(p.chichDien)veChichDien(p,now);
    if(p.muaVo)veMuaVo(p);
  }
  veKhoiWc(now);
  for(let i=vatNem.length-1;i>=0;i--){
    const v=vatNem[i],dich=players.get(v.dich),t=(now-v.batDau)/v.thoiGian;
    if(!dich||t>=1){
      scene.remove(v.vat);
      if(v.vat.isGroup){
        for(const phan of v.vat.children)phan.geometry.dispose();
        v.vat.children[0].material.dispose();
      }else{
        v.vat.material.map.dispose();
        v.vat.material.dispose();
      }
      vatNem.splice(i,1);
      continue;
    }
    if(t<0)continue;
    v.vat.visible=true;
    const den=dich.group.position.clone();
    if(v.vaoDau){
      const dau=dich.group.userData.dau;
      if(dau)dau.getWorldPosition(den);
      else den.y+=1.8;
    }else if(v.doLui){
      const huong=dich.group.rotation.y;
      den.x+=Math.sin(huong)*v.doLui;
      den.z+=Math.cos(huong)*v.doLui;
    }
    den.y+=v.doCao;
    v.vat.position.lerpVectors(v.tu,den,t);
    v.vat.position.y+=Math.sin(t*Math.PI)*v.doVom;
    if(v.vat.isGroup)v.vat.rotation.set(.33+t*.65,-.42+t*Math.PI*2,Math.sin(t*Math.PI)*.35);
  }
  const nowEpoch=Date.now();
  for(const [seatId,display] of workDisplays){
    const worker=[...players.values()].find(player=>player.working&&player.workSeatId===seatId);
    paintWorkDisplay(display,worker?Math.min(9999,Math.floor(Math.max(0,nowEpoch-worker.workStartedAt)/1000)):null);
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
  if(!document.hidden){renderer.render(scene,camera);veRadio.render(canhRadio,camera);}
}

function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);veRadio.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.fov=innerWidth<760?54:40;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);

const query=new URLSearchParams(location.search);
if(query.get('room'))document.querySelector('#room').value=query.get('room');
document.querySelector('#name').value=localStorage.getItem('smlName')||'';
document.querySelector('#join-form').addEventListener('submit',()=>localStorage.setItem('smlName',document.querySelector('#name').value.trim()));

function capNhatNhac(state){
  if(!state)return;trangThaiNhac=state;
  document.querySelector('#radio-panel').classList.toggle('has-music',Boolean(state.videoId));
  document.querySelector('#music-status').textContent=state.videoId?(state.playing?'Đang phát chung trong phòng':'Nhạc đang tạm dừng'):'Chưa có nhạc • mọi người cùng nghe';
  if(!state.videoId){if(sanSangNhac)trinhPhat.stopVideo();return;}
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

document.querySelector('#target-select').addEventListener('change',e=>{if(e.target.value)selectPlayer(e.target.value);else{selectedId='';document.querySelector('#target-name').textContent='chưa chọn ai';}});

document.querySelector('#music-stop').onclick=()=>guiNhac({action:'stop'});
