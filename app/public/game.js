import * as THREE from '/three.module.js';

const socket = io({ transports: ['websocket', 'polling'] });
const canvas = document.querySelector('#world');
const modal = document.querySelector('#join-modal');
const feed = document.querySelector('#feed');
const messages = document.querySelector('#messages');
const names = { snake: 'XÀ', fish: 'CÁ 2 MANG', sloth: 'LƯỜI', cow: 'BẦN ĐÒ', leopard: 'BÁO THỦ' };
const avatarIcons = { snake: '🐍', fish: '🐟', sloth: '🦥', cow: '🐮', leopard: '🐆' };
const selectionLines = { snake: 'tôi khổ quá mà', fish: 'thần thiếp không làm được', sloth: 'hả?', cow: 'là sao nữa...', leopard: 'cú bé' };
const lines = {
  punch: ['Ối, ai vừa bấm KPI vậy?', 'Báo HR nha!', 'Cú này tính là teamwork nhé.'],
  bonk: ['Cho tỉnh ngủ nè!', 'Đã ghi biên bản.', 'Gõ nhẹ thôi, còn họp.'],
  smirk: ['Deadline gọi tên bạn kìa.', 'Tự tin dữ ha!', 'Ủa tưởng hay lắm?'],
  bow: ['Em xin nhận task ạ.', 'Sếp nói gì cũng đúng!', 'Dạ vâng, em hiểu rồi ạ.'],
  run: ['Deadline tới rồi, chạy!', 'Tôi chưa thấy gì hết!', 'Xin phép out meeting.'],
  meditate: ['Hít vào… thở ra…', 'Bình tĩnh, còn 8 tiếng nữa.', 'Tâm bất biến giữa dòng task.'],
  toilet: ['Xin phép đi toilet!', 'Đi toilet một chút nha.', 'WC đang gọi…'],
  throw: ['Ném quà qua nè!', 'Bắt lấy!', 'Gửi chút động lực!']
};
let selfId = '';
let roomCode = '';
let myName = '';
let myAvatar = 'snake';
let selectedId = '';
const players = new Map();
const keys = new Set();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c5b0c1');
scene.fog = new THREE.Fog('#c5b0c1', 32, 65);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 19, 19);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
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
  floor: mat('#edcf9e'), tile: mat('#f2dcb7'), wall: mat('#78677c'), wallLight: mat('#99869d'), trim: mat('#ba9bad'),
  wood: mat('#b67958'), woodLight: mat('#e1ae76'), purple: mat('#716184'), cream: mat('#fff0d0'), plant: mat('#5f9c6e'),
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
  ctx.fillText(text.slice(0, 22), 256, 64, 460);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.8, .7, 1);
  return sprite;
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
  box(scene, .14, wallHeight, .16, mats.wood, doorX - doorWidth / 2, wallY, zMax);
  box(scene, .14, wallHeight, .16, mats.wood, doorX + doorWidth / 2, wallY, zMax);
  box(scene, doorWidth + .14, .16, .16, mats.wood, doorX, wallHeight - .08, zMax);
  const door = new THREE.Group();
  door.position.set(doorX - doorWidth / 2 + .08, 0, zMax + .03);
  scene.add(door);
  box(door, doorWidth - .16, 2.28, .12, mats.woodLight, (doorWidth - .16) / 2, 1.14, 0);
  box(door, .06, .13, .06, mats.dark, doorWidth * .34, 1.12, -.08);
  if (title === 'WC') wcDoor = door;
  makeRoomLabel(title, (xMin + xMax) / 2, (zMin + zMax) / 2);
}

function office() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(31, .42, 23), mats.floor);
  base.position.y = -.3;
  base.receiveShadow = true;
  scene.add(base);
  for (let x = -15; x <= 15; x += 2.5) {
    for (let z = -11; z <= 11; z += 2.5) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(2.48, 2.48), mats.tile);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, -.075, z);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }
  box(scene, 31, 2.1, .55, mats.wall, 0, .75, -11.4);
  box(scene, .55, 2.1, 23, mats.wall, -15.4, .75, 0);
  box(scene, .55, 2.1, 23, mats.wall, 15.4, .75, 0);
  box(scene, 31, .5, .55, mats.trim, 0, -.04, 11.4, false);
  for (const z of [-8, -3, 2, 7]) {
    box(scene, .16, .12, .16, mats.wallLight, -15, -.01, z, false);
    box(scene, .16, .12, .16, mats.wallLight, 15, -.01, z, false);
  }
  enclosedRoom(7.1, 14.7, -10.7, -4.7, 'PHÒNG HỌP A', 10.9);
  enclosedRoom(7.1, 14.7, 1.2, 8.6, 'PHÒNG HỌP B', 10.9);
  enclosedRoom(-14.9, -11.5, -10.7, -6.1, 'WC', -13.2);
  box(scene, 1.0, .78, .54, mats.dark, -14.4, .16, -4.3);
  box(scene, .42, .2, .35, mats.white, -14.2, .66, -4.26);
  makeRoomLabel('QUẦY CÀ PHÊ', -10.2, -9.1);
  makeRoomLabel('SẢNH CHUNG', 0, 7.9);
  box(scene, 4.6, .72, 1.1, mats.wood, -9.8, .22, -8.6);
  box(scene, 4.7, .13, 1.2, mats.woodLight, -9.8, .65, -8.6);
  box(scene, 1.05, .36, .75, mats.dark, -11.1, .9, -8.6);
  for (const x of [-11.5, -8.1]) box(scene, .12, .3, .12, mats.dark, x, .04, -8.4);
  for (const [x, z] of [[-7.2,-7.8],[-6.4,-7.8],[-7.2,-9.1],[-6.4,-9.1]]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.2,12), mats.cream);
    cup.position.set(x,.84,z); cup.castShadow = true; scene.add(cup);
    sphere(scene,x,.97,z,.025,.07,.025,mats.wood,8);
  }
  conferenceRoom(10.5, -8.5);
  conferenceRoom(10.5, 5.1);
  sofa(-2.3, -1.7); sofa(2.3, -1.7); sofa(-2.3, 1.1); sofa(2.3, 1.1);
  coffeeTable(0, -.2);
  for (const [x,z] of [[-12.5,4.5],[13.5,-1],[6.8,8.8],[-5.8,8.5]]) plant(x,z);
  box(scene, .12, .85, 5.2, mats.wallLight, -4.7, .17, -8.3);
  box(scene, .12, .85, 5.2, mats.wallLight, 4.7, .17, -8.3);
  for (let x=-3.5;x<=3.5;x+=2.3) stool(x, 6.3);
  const sign=box(scene,3,.85,.14,mats.purple,0,1.7,-11.03);
  sign.material=mat('#665379');
  makeRoomLabel('VP SỜ MỜ LỜ', 0, -10.5);
}

function conferenceRoom(x,z) {
  box(scene, 4.5, .25, 1.25, mats.woodLight, x, .24, z);
  for (const dx of [-1.6, 0, 1.6]) {
    stool(x+dx,z-1.2); stool(x+dx,z+1.2);
  }
  for (const dx of [-1.8,1.8]) for (const dz of [-.35,.35]) box(scene,.1,.26,.1,mats.wood,x+dx,.04,z+dz);
}

function sofa(x,z) {
  box(scene, 3.4, .45, .92, mats.purple, x, .25, z);
  box(scene, 3.45, .8, .18, mats.purple, x, .64, z+.38);
  for (const dx of [-1.45,1.45]) box(scene,.32,.66,.95,mats.purple,x+dx,.28,z);
}

function coffeeTable(x,z) {
  box(scene, 2.5, .18, 1.2, mats.woodLight, x, .42, z);
  for(const dx of [-1,1]) for(const dz of [-.4,.4]) box(scene,.12,.4,.12,mats.wood,x+dx,.1,z+dz);
}

function stool(x,z) {
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.28,.3,.16,12),mats.purple);
  seat.position.set(x,.48,z); seat.castShadow=true; scene.add(seat);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.43,8),mats.dark);
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
  const fur = tint ? mat(tint) : ({ snake: mat('#64bc83'), fish: mat('#57a9d8'), sloth: mat('#92745b'), cow: mat('#fffaf0'), leopard: mat('#d7a353') }[type]);
  const blush = mat('#f39a9c');
  const eye = mat('#24212b');
  const dark = mat('#34303a');
  if (type === 'snake') {
    taperedTube(root,[[0,.1,1.62],[-.3,.1,1.35],[-.48,.1,1.04],[-.42,.1,.72],[-.15,.1,.54],[.2,.1,.55],[.43,.1,.79],[.38,.1,1.05],[.14,.1,1.18],[-.14,.1,1.08],[-.2,.12,.83],[-.1,.2,.58],[0,.48,.32],[0,.77,.12]],.012,.3,fur);
    sphere(root,0,1.05,-.13,.52,.48,.43,fur,20);
    for(const x of [-.2,.2]) {
      sphere(root,x,1.16,-.505,.075,.095,.04,eye,12);
      sphere(root,x-.018,1.19,-.539,.018,.025,.012,mats.white,8);
      faceLine(root,[[x-.075,.88,-.54],[x,.84,-.565],[x+.075,.88,-.54]],blush,.025);
    }
    sphere(root,-.045,.98,-.558,.018,.022,.012,dark,8);
    sphere(root,.045,.98,-.558,.018,.022,.012,dark,8);
    faceLine(root,[[-.105,.91,-.555],[0,.875,-.571],[.105,.91,-.555]],dark,.014);
  } else if (type === 'fish') {
    const finMat = new THREE.MeshStandardMaterial({color:'#3297c7',side:THREE.DoubleSide,roughness:.8});
    const gillMat = mat('#e78388');
    sphere(root,0,.57,.04,.7,.43,.68,fur,20);
    triangleFin(root,[[0,.59,.72],[-.37,.82,1.03],[0,.58,1.08]],finMat);
    triangleFin(root,[[0,.58,1.08],[.37,.82,1.03],[0,.59,.72]],finMat);
    triangleFin(root,[[0,.9,.1],[-.28,1.19,.35],[.25,.91,.43]],finMat);
    triangleFin(root,[[0,.26,-.05],[-.22,-.02,.18],[.2,.25,.35]],finMat);
    triangleFin(root,[[-.5,.48,-.12],[-.86,.32,.08],[-.58,.75,.15]],finMat);
    triangleFin(root,[[.5,.48,-.12],[.86,.32,.08],[.58,.75,.15]],finMat);
    for(const x of [-.52,.52]) {
      sphere(root,x,.56,-.13,.095,.25,.11,gillMat,12);
      sphere(root,x*.73,.69,-.49,.07,.09,.035,mats.white,12);
      sphere(root,x*.73,.69,-.52,.032,.054,.018,eye,10);
    }
    faceLine(root,[[-.11,.47,-.65],[0,.44,-.675],[.11,.47,-.65]],dark,.018);
  } else if (type === 'sloth') {
    sphere(root,0,.56,.02,.55,.53,.48,fur,18);
    sphere(root,0,1.02,-.16,.48,.47,.42,fur,18);
    sphere(root,0,1.03,-.52,.35,.31,.12,mat('#d7bd91'),16);
    for(const x of [-.17,.17]) {
      sphere(root,x,1.08,-.625,.12,.16,.045,mat('#654d3c'),12);
      sphere(root,x,1.08,-.668,.047,.065,.025,eye,10);
    }
    sphere(root,0,.91,-.635,.09,.06,.045,dark,10);
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,6,12,Math.PI),dark); smile.position.set(0,.85,-.66); smile.rotation.z=Math.PI; root.add(smile);
    for(const x of [-.43,.43]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.86,10),fur);
      arm.position.set(x*1.12,.48,.02); arm.rotation.z=x<0?-.08:.08; root.add(arm);
      for(let i=0;i<3;i++) {
        const claw=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,7),mat('#e8ddbd'));
        claw.position.set(x*1.12+(i-1)*.07,.055,.02); claw.rotation.x=Math.PI; root.add(claw);
      }
    }
  } else if (type === 'leopard') {
    const spots = mat('#593d2e');
    const rosetteMat = new THREE.MeshStandardMaterial({color:'#593d2e',side:THREE.DoubleSide,roughness:.85});
    const rosette = (x,y,z,r) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r*.68,r*.2,6,14),rosetteMat);
      ring.position.set(x,y,z);
      ring.scale.set(1,1,.55);
      root.add(ring);
      sphere(root,x,y,z-.012,r*.2,r*.2,.018,fur,8);
    };
    sphere(root,0,.68,.02,.52,.66,.44,fur,18);
    sphere(root,0,1.38,-.15,.48,.46,.4,fur,18);
    sphere(root,0,.64,-.385,.28,.39,.075,mat('#f2d8a5'),14);
    for(const x of [-.36,.36]) {
      sphere(root,x,1.67,-.08,.16,.18,.1,fur,12);
      sphere(root,x,1.68,-.145,.09,.105,.035,spots,10);
    }
    for(const [x,y,z,r] of [[-.3,1.2,-.45,.1],[.3,1.2,-.45,.1],[-.2,1.58,-.42,.09],[.2,1.58,-.42,.09],[-.34,.57,-.28,.12],[.34,.57,-.28,.12],[-.31,.91,-.3,.11],[.31,.91,-.3,.11],[-.17,.34,-.36,.1],[.17,.34,-.36,.1],[-.47,.72,-.06,.1],[.47,.72,-.06,.1]]) rosette(x,y,z,r);
    for(const x of [-.18,.18]) {
      sphere(root,x,1.43,-.525,.062,.085,.028,eye,12);
      sphere(root,x-.012,1.46,-.548,.016,.022,.01,mats.white,8);
    }
    const leopardNose = new THREE.Mesh(new THREE.ConeGeometry(.105,.13,3),dark);
    leopardNose.position.set(0,1.27,-.562);
    leopardNose.rotation.x=-Math.PI/2;
    root.add(leopardNose);
    faceLine(root,[[0,1.21,-.557],[0,1.16,-.555],[-.075,1.13,-.545],[0,1.105,-.55],[.075,1.13,-.545]],dark,.014);
    for(const x of [-1,1]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,.55,10),fur);
      arm.position.set(x*.53,.73,-.03); arm.rotation.z=x*.14; root.add(arm);
      sphere(root,x*.61,.43,-.08,.13,.12,.13,fur,10);
      for(let i=0;i<2;i++) sphere(root,x*(.56+i*.1),.45,-.17,.035,.055,.025,spots,8);
    }
    const tail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.42,.38,.25),new THREE.Vector3(.75,.35,.5),new THREE.Vector3(.82,.55,.72)]),16,.075,8,false),fur);
    root.add(tail);
    sphere(root,.82,.55,.72,.12,.12,.12,spots,10);
  } else {
    sphere(root,0,.68,0,.55,.62,.44,fur,18);
    sphere(root,0,1.36,-.16,.49,.47,.42,fur,18);
    for(const [x,y,z,s] of [[-.3,.77,-.36,.18],[.29,.59,-.38,.17],[.34,.91,-.34,.13],[-.36,.45,-.34,.12]]) sphere(root,x,y,z,s,.19,s*.42,mat('#28252c'),10);
    for(const x of [-.45,.45]) {
      sphere(root,x,1.31,-.15,.17,.11,.1,fur,12);
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.1,.27,8),mats.cream); horn.position.set(x*.72,1.8,-.13); horn.rotation.z=x<0?.2:-.2; root.add(horn);
    }
    sphere(root,-.2,1.42,-.52,.07,.09,.05,eye,10); sphere(root,.2,1.42,-.52,.07,.09,.05,eye,10);
    sphere(root,0,1.17,-.6,.28,.19,.12,blush,14);
    sphere(root,-.09,1.17,-.7,.035,.055,.025,dark,8); sphere(root,.09,1.17,-.7,.035,.055,.025,dark,8);
    for(const x of [-1,1]) {
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.57,10),fur);
      arm.position.set(x*.61,.78,-.04); arm.rotation.z=x*.15; root.add(arm);
      sphere(root,x*.68,.48,-.08,.14,.12,.13,fur,10);
    }
  }
  for(const x of [-.3,.3]) {
    const tall=type==='cow'||type==='leopard';
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(tall?.12:.1,tall?.14:.13,tall?.44:.34,8),type==='snake'||type==='sloth'?fur:dark);
    leg.position.set(x,tall?.21:.15,.05); leg.castShadow=true; root.add(leg);
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
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

const ground = new THREE.Mesh(new THREE.PlaneGeometry(30,22),new THREE.MeshBasicMaterial({visible:false}));
ground.rotation.x=-Math.PI/2; ground.position.y=-.05; scene.add(ground);

function createPlayer(data) {
  if(players.has(data.id)) return players.get(data.id);
  const group=animal(data.avatar);
  group.position.set(data.x||0,0,data.z||0);
  group.rotation.y=data.yaw||0;
  group.userData.playerId=data.id;
  group.traverse(o=>{o.userData.playerId=data.id;});
  const name=label(`${avatarIcons[data.avatar]||'🙂'} ${data.name}`);
  name.position.set(0,2.2,0); name.scale.set(2.8,.7,1); group.add(name);
  const bubble=label(data.bubble||'', '#37293e');
  bubble.position.set(0,2.76,0); bubble.scale.set(3.2,.8,1); bubble.visible=Boolean(data.bubble); group.add(bubble);
  scene.add(group);
  const entry={...data,group,nameSprite:name,bubbleSprite:bubble,target:new THREE.Vector3(data.x||0,0,data.z||0),poseUntil:0};
  players.set(data.id,entry);
  return entry;
}

function setBubble(id,text) {
  const p=players.get(id); if(!p)return;
  p.bubbleSprite.material.map.dispose();
  const fresh=label(text,'#37293e');
  p.bubbleSprite.material.map=fresh.material.map;
  p.bubbleSprite.material.needsUpdate=true;
  p.bubbleSprite.visible=true;
  clearTimeout(p.bubbleTimer);
  p.bubbleTimer=setTimeout(()=>p.bubbleSprite.visible=false,6500);
}

function removePlayer(id) {
  const p=players.get(id); if(!p)return;
  scene.remove(p.group);
  p.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  players.delete(id);
  if(selectedId===id){selectedId='';document.querySelector('#target-name').textContent='chưa chọn ai';}
}

function selectPlayer(id) {
  if(id===selfId)return toast('Chọn một người chơi khác để tương tác nhé.');
  selectedId=id;
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
  myName=document.querySelector('#name').value.trim().slice(0,18)||'Bạn mới';
  myAvatar=document.querySelector('.avatar.selected')?.dataset.avatar||'snake';
  const requested=document.querySelector('#room').value.trim().toUpperCase()||new URLSearchParams(location.search).get('room')||'';
  socket.emit('join',{name:myName,avatar:myAvatar,room:requested},result=>{
    if(result?.error){document.querySelector('#join-error').textContent=result.error;return;}
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
  if(action==='run'||action==='meditate'||action==='toilet'){socket.emit('self-action',action);return;}
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
  selfId=data.id;roomCode=data.room;
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
socket.on('move',data=>{
  const p=players.get(data.id);if(!p)return;
  p.target.set(data.x,0,data.z);p.yaw=data.yaw;
});
socket.on('chat',data=>{
  addMessage(data.name,data.text,data.id===selfId);
  setBubble(data.id,data.text);
});
socket.on('default-line',data=>setBubble(data.id,data.text));
socket.on('feed',data=>addFeed(data.text,data.kind));
socket.on('act',event=>{
  const from=players.get(event.from),to=players.get(event.to);
  addFeed(`${avatarIcons[from?.avatar]||'🙂'} ${event.fromName} ${event.action==='throw'?`ném ${event.item} cho`: 'tương tác với'} ${event.targetName}`);
  setBubble(event.to,`${event.item?event.item+' ':''}${event.line}`);
  if(to){
    const start=performance.now();to.poseUntil=start+900;
    const base=to.group.scale.x;
    const pose=()=>{const now=performance.now();if(now>to.poseUntil){to.group.scale.setScalar(to.id===selfId?1.08:1);to.group.position.y=0;return;}
      const elapsed=(now-start)/900;to.group.scale.setScalar(base*(1+.2*Math.sin(elapsed*Math.PI*6)));to.group.position.y=.1*Math.abs(Math.sin(elapsed*Math.PI*6));requestAnimationFrame(pose);};pose();
  }
  if(event.action==='throw'&&from&&to){
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),new THREE.MeshStandardMaterial({color:'#ffbf68',emissive:'#cd6a44',emissiveIntensity:.7}));
    orb.position.copy(from.group.position).add(new THREE.Vector3(0,1.1,0));scene.add(orb);
    const a=orb.position.clone(),b=to.group.position.clone().add(new THREE.Vector3(0,1.1,0)),start=performance.now();
    const fly=()=>{const t=Math.min(1,(performance.now()-start)/500);orb.position.lerpVectors(a,b,t);orb.position.y+=Math.sin(t*Math.PI)*1.3;if(t<1)requestAnimationFrame(fly);else scene.remove(orb);};fly();
  }
});
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
    p.pose='meditate';p.poseUntil=performance.now()+event.duration;
    setBubble(p.id,event.line);
  }
  const actionLabel={run:'bỏ chạy',meditate:'ngồi thiền',toilet:'đi toilet'}[event.action]||event.action;
  addFeed(`${avatarIcons[p.avatar]||'🙂'} ${p.name} ${actionLabel}`);
});
socket.on('connect_error',()=>toast('Đang thử kết nối lại…'));

let lastMove=0;
let lastFrame=performance.now();
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
    if(!running&&(dx||dz)){const mag=Math.hypot(dx,dz);dx/=mag;dz/=mag;me.group.position.x=THREE.MathUtils.clamp(me.group.position.x+dx*5.2*dt,-13.4,13.4);me.group.position.z=THREE.MathUtils.clamp(me.group.position.z+dz*5.2*dt,-9.7,9.7);me.group.rotation.y=Math.atan2(-dx,-dz);}
    if(now-lastMove>55){socket.volatile.emit('move',{x:me.group.position.x,z:me.group.position.z,yaw:me.group.rotation.y});lastMove=now;}
    const look=new THREE.Vector3(me.group.position.x,0,me.group.position.z);
    const distance=innerWidth<760?25:19;
    camera.position.lerp(new THREE.Vector3(look.x,distance,look.z+distance),.06);camera.lookAt(look);
  }
  for(const p of players.values()){
    if(p.pose==='meditate'){
      if(now<p.poseUntil){const base=p.id===selfId?1.08:1;p.group.scale.set(base,.76*base,base);p.group.position.y=-.12;}
      else{p.pose='';p.group.scale.setScalar(p.id===selfId?1.08:1);p.group.position.y=0;}
    }
    if(p.id!==selfId){const running=animateRun(p,now);if(!running)p.group.position.lerp(p.target,Math.min(1,dt*11));if(Number.isFinite(p.yaw))p.group.rotation.y=THREE.MathUtils.lerp(p.group.rotation.y,p.yaw,.15);}
  }
  renderer.render(scene,camera);
}

function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.fov=innerWidth<760?54:40;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);

const query=new URLSearchParams(location.search);
if(query.get('room'))document.querySelector('#room').value=query.get('room');
document.querySelector('#name').value=localStorage.getItem('smlName')||'';
document.querySelector('#join-form').addEventListener('submit',()=>localStorage.setItem('smlName',document.querySelector('#name').value.trim()));
