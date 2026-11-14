import * as THREE from '/three.module.js';
import {tinhGocMay,tinhGocMayMaSoi} from './goc-may.js';
import {dinhDangLichSuMaSoi} from './ma-soi-lich-su.js';
import {TAM_BAN_MA_SOI,SO_GHE_TOI_DA_MA_SOI,taoViTriGheMaSoi} from './ma-soi-layout.js';
import {laDemMaSoi,laNguoiChoiMaSoi,laThanhVienVanMaSoi} from './ma-soi-anh-sang.js';
import {CSS3DRenderer,CSS3DObject} from '/css3d.js';

import {banTho} from './ban-tho.js';

const socket = io({ transports: ['websocket', 'polling'] });
const sessionId=(()=>{let id=localStorage.getItem('somlo-session');if(!id){id=crypto.randomUUID();localStorage.setItem('somlo-session',id);}return id;})();
const canvas = document.querySelector('#world');
const modal = document.querySelector('#join-modal');
const feed = document.querySelector('#feed');
const messages = document.querySelector('#messages');
const avatarIcons = { snake: 'ðŸ', fish: 'ðŸŸ', sloth: 'ðŸ¦¥', cow: 'ðŸ®', leopard: 'ðŸ†' };
const avatarColors = { snake: '#399466', fish: '#247da9', sloth: '#73523d', cow: '#39343a', leopard: '#9e5b21' };
const selectionLines = { snake: 'tÃ´i khá»• quÃ¡ mÃ ', fish: 'tháº§n thiáº¿p khÃ´ng lÃ m Ä‘Æ°á»£c', sloth: 'háº£?', cow: 'lÃ  sao ná»¯a...', leopard: 'cÃº bÃ©' };
let selfId = '';
let roomCode = '';
let myName = '';
let myAvatar = 'snake';
let selectedId = '';
let hasJoinedRoom = false;

function startGame(event) {
  event.preventDefault();
  const joinButton=document.querySelector('#join-form .primary');
  const joinError=document.querySelector('#join-error');
  joinError.textContent='';
  if(!socket.connected){joinError.textContent='ChÆ°a káº¿t ná»‘i Ä‘Æ°á»£c mÃ¡y chá»§. Vui lÃ²ng thá»­ láº¡i sau vÃ i giÃ¢y.';return;}
  myName=document.querySelector('#name').value.trim().slice(0,18)||'Báº¡n má»›i';
  myAvatar=document.querySelector('.avatar.selected')?.dataset.avatar||'snake';
  const requested=document.querySelector('#room').value.trim().toUpperCase()||new URLSearchParams(location.search).get('room')||'';
  joinButton.disabled=true;
  joinButton.textContent='Äang káº¿t ná»‘iâ€¦';
  try{localStorage.setItem('smlName',myName);}catch{}
  socket.timeout(8000).emit('join',{name:myName,avatar:myAvatar,room:requested,sessionId},(error,result)=>{
    joinButton.disabled=false;
    joinButton.textContent='VÃ o phÃ²ng thÃ´i â†’';
    if(error){joinError.textContent='MÃ¡y chá»§ chÆ°a pháº£n há»“i. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i rá»“i thá»­ láº¡i.';return;}
    if(result?.error){joinError.textContent=result.error;return;}
    if(!result?.ok){joinError.textContent='KhÃ´ng vÃ o Ä‘Æ°á»£c phÃ²ng. Vui lÃ²ng thá»­ láº¡i.';return;}
    joinError.textContent='';
    modal.classList.add('hidden');
  });
}
document.querySelector('#join-form').addEventListener('submit',startGame);
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
const anhSangTroi=new THREE.Color('#c5b0c1');
const anhSangDem=new THREE.Color('#30394d');
const mauSuongTroi=new THREE.Color('#c5b0c1');
const mauSuongDem=new THREE.Color('#30394d');
const mauMatTroiTroi=new THREE.Color('#fff1d4');
const mauMatTroiDem=new THREE.Color('#a9b9ef');
const denTroi=new THREE.HemisphereLight('#fff4dc', '#776579', 2.1);
scene.add(denTroi);
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
  const scale = 2;
  c.width = 1024;
  c.height = 256;
  ctx.scale(scale, scale);
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
  const scale = 2;
  c.width = width * scale;
  c.height = 100 * scale;
  ctx.scale(scale, scale);
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
  const mobileScale = innerWidth < 760 ? 1.35 : 1;
  sprite.scale.set(width / 160 * mobileScale, .64 * mobileScale, 1);
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
  const logicalWidth = Math.ceil(contentWidth + padX * 2);
  const logicalHeight = lines.length * lineHeight + padY * 2;
  const scale = 2;
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  context.scale(scale, scale);
  context.font = `900 ${fontSize}px Nunito, sans-serif`;
  context.fillStyle = '#fff3dd';
  context.strokeStyle = '#725b73';
  context.lineWidth = 6;
  context.beginPath();
  context.roundRect(4, 4, logicalWidth - 8, logicalHeight - 8, 24);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => context.fillText(line, logicalWidth / 2, padY + lineHeight * index + lineHeight / 2, maxTextWidth));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  const mobileScale = innerWidth < 760 ? 1.18 : 1;
  sprite.scale.set(logicalWidth / 160 * mobileScale, logicalHeight / 160 * mobileScale, 1);
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
  const mobileScale = innerWidth < 760 ? 1.25 : 1;
  sprite.scale.set(3.8 * mobileScale, .92 * mobileScale, 1);
  scene.add(sprite);
}

const cuaWc=new Map();
const cuaHop=new Map();


function enclosedRoom(xMin, xMax, zMin, zMax, title, doorX) {
  const vatLieu = new THREE.MeshStandardMaterial({color:'#f0f0f0',transparent:true,opacity:.18,roughness:.2,depthWrite:false,side:THREE.DoubleSide});
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
  for(const o of scene.children.slice(truocVach))o.castShadow=false;
  box(scene, .14, wallHeight, .16, mats.trim, doorX - doorWidth / 2, wallY, zMax);
  box(scene, .14, wallHeight, .16, mats.trim, doorX + doorWidth / 2, wallY, zMax);
  box(scene, doorWidth + .14, .16, .16, mats.trim, doorX, wallHeight - .08, zMax);
  const door = new THREE.Group();
  door.position.set(doorX - doorWidth / 2 + .08, 0, zMax + .03);
  scene.add(door);
  box(door, doorWidth - .16, 2.28, .12, vatLieu, (doorWidth - .16) / 2, 1.14, 0);
  box(door, .06, .13, .06, mats.dark, doorWidth * .34, 1.12, -.08);
  cuaHop.set(title,door);
  if(title==='PHÃ’NG Sáº¾P'){
    const mauBien=label(title,'#493650');
    const bien=new THREE.Mesh(
      new THREE.PlaneGeometry(1.48,.34),
      new THREE.MeshBasicMaterial({map:mauBien.material.map,transparent:true})
    );
    mauBien.material.dispose();
    bien.position.set(doorX,wallHeight+.04,zMax+.09);
    scene.add(bien);
  }else makeRoomLabel(title,(xMin+xMax)/2,(zMin+zMax)/2);
}

const buongWc = {
  don: {dau:-12.925,cuoi:-9.35,cua:-11.3},
  doi: {dau:-9.35,cuoi:-5.15,cua:-6.95}
};

function taoKhuWc(){
  const vach=mat('#fff3bd');
  const trai=-19.925,phai=-16.4,cao=1.8;
  for(const z of [-9.35,-5.15])box(scene,phai-trai,cao,.15,vach,(trai+phai)/2,cao/2,z);
  for(const [ten,{dau,cuoi,cua}] of Object.entries(buongWc)){
    const rong=1.35;
    for(const [tu,den] of [[dau,cua-rong/2],[cua+rong/2,cuoi]]){
      box(scene,.16,cao,den-tu,vach,phai,cao/2,(tu+den)/2);
    }
    const canh=new THREE.Group();
    canh.position.set(phai,0,cua-rong/2);
    scene.add(canh);
    box(canh,.12,1.53,rong-.05,mats.trim,0,.765,rong/2);
    box(canh,.12,.07,.07,mats.white,.095,.88,rong-.16);
    cuaWc.set(ten,canh);
    const soCho=ten==='doi'?2:1;
    box(scene,.68,.72,soCho===2?1.88:.88,mats.white,-19.24,.64,cua);
    box(scene,.74,.08,soCho===2?1.96:.96,mats.cream,-19.24,1.04,cua);
    for(let i=0;i<soCho;i++){
      const z=cua+(i-(soCho-1)/2)*.94;
      sphere(scene,-18.51,.21,z,.29,.25,.31,mats.white);
      sphere(scene,-18.43,.44,z,.52,.22,.49,mats.white);
      sphere(scene,-18.41,.60,z,.52,.06,.49,mats.cream);
    }
  }
  const mauBien=label('WC','#493650');const bien=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.39),new THREE.MeshBasicMaterial({map:mauBien.material.map,transparent:true,side:THREE.DoubleSide}));mauBien.material.dispose();bien.rotation.y8ï]¹¶‰žËkºwµçQ”µ½±Õµ¹ÌèÅ™Èí…ÀèáÁàíÁ…‘‘¥¹œèáÁà€åÁàµ…à áÁà±•¹Ø¡Í…™”µ…É•„µ¥¹Í•Ðµ‰½ÑÑ½´¤¤íµ¥¸µ¡•¥¡ÐèÌÀÁÁáô¹¡…Ñ‰½áíµ¥¸µ¡•¥¡ÐèÄÀÑÁáô¹µ•ÍÍ…•Ííµ…àµ¡•¥¡ÐèÐÑÁáô¹…Ñ¥½¹Íí…ÀèÑÁáô¹…Ñ¥½¸µÉ¥‘íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌéÉ•Á•…Ð Ð±µ¥¹µ…à À°Å™È¤¤í…ÀèÕÁáô¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÅÁàíÁ…‘‘¥¹œèáÁà€ÉÁàíÝ¡¥Ñ”µÍÁ…”é¹½Éµ…°í±¥¹”µ¡•¥¡ÐèÄ¸ÄÕô¹Ñ¡É½Üµ½¹ÑÉ½±í…ÀèÍÁáô¹Ñ¡É½Üµ½¹ÑÉ½°Í•±•ÑíÝ¥‘Ñ èÌáÁàí™½¹ÐµÍ¥é”èÄÙÁàíÁ…‘‘¥¹œèÍÁáô¹Ñ½…ÍÑí™½¹ÐµÍ¥é”èÄÍÁàíÁ…‘‘¥¹œèáÁà€ÄÁÁáô¹Ñ…É•Ðµ±¥¹•í™½¹ÐµÍ¥é”èÄÉÁáô¹¡•±ÁíÉ¥¡ÐèÙÁàíÑ½ÀèÙÁáô¹¡•±ÀÍÁ…¹í™½¹ÐµÍ¥é”èÄÅÁàíÁ…‘‘¥¹œèÍÁà€ÝÁáô¹™••‘íÝ¥‘Ñ èÌáÙÜí±•™ÐèÝÁàí‰½ÑÑ½´èÝÁáô¹™••‘¥Ùí™½¹ÐµÍ¥é”èÄÅÁàíÁ…‘‘¥¹œèÑÁà€áÁáô¹É½½´µÑ…í™½¹ÐµÍ¥é”èåÁàíÁ…‘‘¥¹œèÑÁà€ÙÁáô¹µ½‰¥±”µÁ…‘í‘¥ÍÁ±…äé™±•áô¹©½¥¸µ…É‘íÁ…‘‘¥¹œèÈÁÁà€ÈÁÁà€ÄÝÁáô¹©½¥¸µ…É Åí™½¹ÐµÍ¥é”èÌÁÁáõõµ•‘¥„¡µ…àµÝ¥‘Ñ èÌàÁÁà¥ì¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÁÁáô¹É½½´µ¥¹™¼Íµ…±±íÁ…‘‘¥¹œèÍÁà€ÙÁáô¹‰É…¹ÍÑÉ½¹í™½¹ÐµÍ¥é”èÄÑÁáõô((É…‘¥¼µÁ…¹•±íÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”íèµ¥¹‘•àèÈíÝ¥‘Ñ èÌÈÁÁàí‰…­É½Õ¹è™™˜á•”í‰½É‘•ÈèÕÁàÍ½±¥€ŒÌäÌÐÍ„í‰½É‘•ÈµÉ…‘¥ÕÌèáÁàíÁ…‘‘¥¹œèÕÁàí‰½àµÍ¡…‘½ÜèÀ€ÕÁà€ÄÕÁà€ŒÀÀÀÐí™½¹ÐµÍ¥é”èÄÅÁàíÑ•áÐµ…±¥¸é•¹Ñ•ÈíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÔÀ”°´ÔÀ”¥ôå½ÕÑÕ‰”µÁ±…å•ÉíÝ¥‘Ñ èÌÀÁÁàí¡•¥¡ÐèÈÀÁÁàí‰…­É½Õ¹èŒÈÐÈÐÈÑôÉ…‘¥¼µÁ…¹•°¥™É…µ•í‘¥ÍÁ±…äé‰±½¬íÝ¥‘Ñ èÌÀÁÁàí¡•¥¡ÐèÈÀÁÁáôÉ…‘¥¼µÁ…¹•°™½Éµí‘¥ÍÁ±…äé™±•àí…ÀèÑÁàíµ…É¥¸èÕÁà€ÁôµÕÍ¥ŒµÕÉ±íÝ¥‘Ñ èÄØÁÁàíµ¥¸µÝ¥‘Ñ èÀí‰½É‘•ÈèÅÁàÍ½±¥€‰‰ˆí‰½É‘•ÈµÉ…‘¥ÕÌèÕÁàíÁ…‘‘¥¹œèÑÁáôÉ…‘¥¼µÁ…¹•°‰ÕÑÑ½¹íÁ…‘‘¥¹œèÑÁà€ÙÁàí™½¹ÐµÍ¥é”èÄÁÁàíµ…É¥¸èÉÁáôÉ…‘¥¼µÁ…¹•°Íµ…±±í‘¥ÍÁ±…äé‰±½­ôÉ…‘¥¼µÁ…¹•°é¹½Ð ¹¡…ÌµµÕÍ¥Œ¤€å½ÕÑÕ‰”µÁ±…å•Éí¡•¥¡ÐèÈÑÁáôÉ…‘¥¼µÁ…¹•°é¹½Ð ¹¡…ÌµµÕÍ¥Œ¤€å½ÕÑÕ‰”µÁ±…å•Èé…™Ñ•Éí½¹Ñ•¹Ðè‰7¸£±¹ ¡Õ¹œƒ
Ü¹£†êµÀ±¥¹¬ƒG†îÁ£…Ð‰ô((Ñ…É•ÐµÍ•±•Ñíµ…àµÝ¥‘Ñ èÄàÁÁàí‰…­É½Õ¹è™™˜á•”í½±½ÈèŒÌàÉˆÐÀí‰½É‘•ÈèÅÁàÍ½±¥€‘‘í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí™½¹ÐµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÍÁà€ÙÁáô((éÉ½½Ñì´µ‘½¬µ¡•¥¡ÐèÄÔÑÁáô…ÁÁí‰…­É½Õ¹èÁÁÁô¹Ý½É±µÝÉ…Áí‰½ÑÑ½´éÙ…È ´µ‘½¬µ¡•¥¡Ð¥ô¹‘½­í¡•¥¡ÐéÙ…È ´µ‘½¬µ¡•¥¡Ð¤íµ¥¸µ¡•¥¡ÐèÀíÁ…‘‘¥¹œèÝÁà€ÄÉÁàí‰…­É½Õ¹éÉ‰„ ÄÔÀ°ÄÔÀ°ÄÔÀ°¸Ô¤í‰½É‘•ÈµÑ½ÀèÉÁàÍ½±¥€™™™™™˜ØÀí…ÀèÄÁÁáô¹¡…Ñ‰½áíµ¥¸µ¡•¥¡ÐèÀíÁ…‘‘¥¹œèÕÁà€áÁáô¹µ•ÍÍ…•Ííµ…àµ¡•¥¡ÐèÔÍÁáô¹…Ñ¥½¹Íí…ÀèÑÁáô¹…Ñ¥½¸µÉ¥‘í…ÀèÕÁáô¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹íÁ…‘‘¥¹œèÕÁà€ÙÁàí™½¹ÐµÍ¥é”èÄÉÁáô¹Ñ…É•Ðµ±¥¹•í™½¹ÐµÍ¥é”èÄÉÁàí½±½ÈèŒÌÌÌíÑ•áÐµÍ¡…‘½Üé¹½¹•ô¹Ñ…É•Ðµ±¥¹”ÍÑÉ½¹í½±½ÈèŒÌÌÍô¹¡…Ñ‰½à™½É´¥¹ÁÕÑíÁ…‘‘¥¹œèÙÁà€ÄÁÁáô¹¡…Ðµ¡•…‘í™½¹ÐµÍ¥é”èÄÑÁáõµ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ìéÉ½½Ñì´µ‘½¬µ¡•¥¡ÐèÈÀÁÁáô¹‘½­íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌèÜÙÁà€Å™Èí…ÀèÑÁàíÁ…‘‘¥¹œèÙÁà€áÁáô¹µ•ÍÍ…•Ííµ…àµ¡•¥¡ÐèÈÉÁáô¹¡…Ðµ¡•…‘í™½¹ÐµÍ¥é”èÄÉÁáô¹¡…Ðµ¡•…ÍÁ…¹í™½¹ÐµÍ¥é”èÄÁÁáô¹¡…Ñ‰½áíÁ…‘‘¥¹œèÍÁà€ÙÁáô¹¡…Ñ‰½à™½É´¥¹ÁÕÑíÁ…‘‘¥¹œèÑÁà€áÁáô¹…Ñ¥½¹Íí…ÀèÉÁáô¹…Ñ¥½¸µÉ¥‘í…ÀèÑÁáô¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÁÁàíÁ…‘‘¥¹œèÑÁà€ÉÁáô¹Ñ…É•Ðµ±¥¹•í™½¹ÐµÍ¥é”èÄÅÁáõô((¹Ñ½Á‰…Éí¡•¥¡ÐèÔÉÁàíÁ…‘‘¥¹œèÀ€ÄÑÁàí…ÀèÄÙÁáô¹Ý½É±µÝÉ…ÁíÑ½ÀèÔÉÁáô¹‰É…¹‘íµ¥¸µÝ¥‘Ñ èÄàÁÁáô¹‰É…¹ÍÑÉ½¹í™½¹ÐµÍ¥é”èÈÁÁáô¹‰É…¹€¹ÍÕ¹í™½¹ÐµÍ¥é”èÈÕÁáô¹É½½´µ¥¹™½í™½¹ÐµÍ¥é”èÄÑÁáô¹Ñ¥­•Éí™½¹ÐµÍ¥é”èÄÙÁáô¹¥¹Ù¥Ñ•íÁ…‘‘¥¹œèÝÁà€ÄÑÁàí™½¹ÐµÍ¥é”èÄÉÁáõµ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì¹Ñ½Á‰…Éí¡•¥¡ÐèÐÍÁàíÁ…‘‘¥¹œèÀ€áÁàí…ÀèÝÁáô¹Ý½É±µÝÉ…ÁíÑ½ÀèÐÍÁáô¹‰É…¹‘íµ¥¸µÝ¥‘Ñ èÁô¹‰É…¹ÍÑÉ½¹í™½¹ÐµÍ¥é”èÄÙÁáô¹‰É…¹€¹ÍÕ¹í™½¹ÐµÍ¥é”èÈÁÁáô¹É½½´µ¥¹™½í™½¹ÐµÍ¥é”èÄÅÁáô¹¥¹Ù¥Ñ•í™½¹ÐµÍ¥é”èÄÁÁàíÁ…‘‘¥¹œèÙÁà€åÁáõô((É…‘¥¼µÁ…¹•±í±•™ÐèÀíÑ½ÀèÀíÁ½¥¹Ñ•Èµ•Ù•¹ÑÌé…ÕÑ¼íÑÉ…¹Í™½É´é¹½¹•ô((¹‰…¹œµ…¹ µ¡Õ¹íÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”íèµ¥¹‘•àèÔíÑ½ÀèÄÁÁàí±•™ÐèÔÀ”íÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ•` ´ÔÀ”¤íÝ¥‘Ñ éµ¥¸ äÀ”°ÜÈÁÁà¤íµ…àµ¡•¥¡ÐèÌÔ”í½Ù•É™±½Üé…ÕÑ¼íÑ•áÐµ…±¥¸é•¹Ñ•ÈíÁ½¥¹Ñ•Èµ•Ù•¹ÑÌé¹½¹•ô(¹‰…¹œµ…¹ µ¡Õ¹œù‘¥Ùíµ…É¥¸èÀ€À€ÙÁàíÁ…‘‘¥¹œèáÁà€ÄÑÁàí‰½É‘•ÈèÅÁàÍ½±¥€‘‘ˆÈÔÐí‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàí‰…­É½Õ¹è™™˜Áˆäí½±½ÈèŒØÔÌàÄÈí‰½àµÍ¡…‘½ÜèÀ€ÑÁà€ÄáÁà€”á…ÔÜàÀí™½¹ÐµÍ¥é”é±…µÀ ÄÑÁà°È¸ÉÙÜ°ÈÙÁà¤í™½¹ÐµÝ•¥¡ÐèäÀÀí…¹¥µ…Ñ¥½¸é…¹ µ¡Õ¹œµ¹¼€¸ÐÕÌ•…Í”µ½ÕÑô)­•å™É…µ•Ì…¹ µ¡Õ¹œµ¹½í™É½µíÑÉ…¹Í™½É´éÍ…±” ¸ØÔ¤í½Á…¥ÑäèÁõÑ½íÑÉ…¹Í™½É´éÍ…±” Ä¤í½Á…¥ÑäèÅõô)µ•‘¥„¡ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éÉ•‘Õ”¥ì¹‰…¹œµ…¹ µ¡Õ¹œù‘¥Ùí…¹¥µ…Ñ¥½¸é¹½¹•õô((¹…Ñ¥½¸µÉ¥‘íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌéÉ•Á•…Ð Ô±µ¥¹µ…à À°Å™È¤¥ô(¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¸°¹Ñ¡É½Üµ½¹ÑÉ½±íµ¥¸µÝ¥‘Ñ èÁô(¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹íÝ¡¥Ñ”µÍÁ…”é¹½Éµ…±ô(¹Ñ¡É½Üµ½¹ÑÉ½°Í•±•ÑíÝ¥‘Ñ èÈ¸É•´íµ¥¸µÝ¥‘Ñ èÀíÁ…‘‘¥¹œµ¥¹±¥¹”èÉÁáô(¹¡…Ñ‰½áí…±¥¸µÍ•±˜é•¹í¡•¥¡ÐéÙ…È ´µ¡…Ðµ¡•¥¡Ð¤í‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð¡Ñ¼Ñ½À°™™˜Ù”à€ÔÀ”±ÑÉ…¹ÍÁ…É•¹Ð€ÔÀ”¥ô(¹¡…Ðµ¡•…°¹µ•ÍÍ…•Íí½±½ÈèŒÌÔÈÄÌäíÑ•áÐµÍ¡…‘½ÜèÀ€À€ÍÁà€™™˜°À€À€ÕÁà€™™™ô(…ÁÁì´µ¡…Ðµ¡•¥¡Ðé…±Œ ¡Ù…È ´µ‘½¬µ¡•¥¡Ð¤€´€ÄáÁà¤¨È¤ì´µ™••µ‰½ÑÑ½´é…±Œ¡Ù…È ´µ¡…Ðµ¡•¥¡Ð¤€´Ù…È ´µ‘½¬µ¡•¥¡Ð¤€¬€ÄÝÁà¥ô(¹µ•ÍÍ…•Ííµ…àµ¡•¥¡Ðé¹½¹”íµ¥¸µ¡•¥¡ÐèÀí½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô(¹µ•ÍÍ…•Ì€ø€¹µ•ÍÍ…•í™±•àµÍ¡É¥¹¬èÁô(¹µ•ÍÍ…•Ì€ø€¹µ•ÍÍ…”é™¥ÉÍÐµ¡¥±‘íµ…É¥¸µÑ½Àé…ÕÑ½ô(¹™••‘í‰½ÑÑ½´éÙ…È ´µ™••µ‰½ÑÑ½´¥ô(¹™••‘¥Ùí…¹¥µ…Ñ¥½¸é¹½¹•ô(é¥Ì ÉÔµ¹¡…Ô°‘¤µÝŒ¥íµ…àµÝ¥‘Ñ éµ¥¸ ÌØÁÁà°äÁÙÜ¤í‰½É‘•ÈèÀí‰½É‘•ÈµÉ…‘¥ÕÌèÄÙÁàí‰…­É½Õ¹è™™˜Ù”àí½±½ÈèŒÌàÉˆÐÀíÁ…‘‘¥¹œèÄáÁáô(é¥Ì ÉÔµ¹¡…Ô°‘¤µÝŒ¤èé‰…­‘É½Áí‰…­É½Õ¹èŒÈàÅ”ÌÕ„Íô(é¥Ì ‰…¸µ¹¡…Ô°‰…¸µÝŒ¥íµ…àµ¡•¥¡ÐèÐÕÙ í½Ù•É™±½Üé…ÕÑ¼íµ…É¥¸èÄÁÁà€Áô(é¥Ì ‰…¸µ¹¡…Ô°‰…¸µÝŒ¤±…‰•±í‘¥ÍÁ±…äé‰±½¬íÁ…‘‘¥¹œèÑÁáô(é¥Ì ÉÔµ¹¡…Ô°‘¤µÝŒ¤‰ÕÑÑ½¹íÁ…‘‘¥¹œèÙÁà€ÄÉÁàíµ…É¥¸µÉ¥¡ÐèÙÁáô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì…ÁÁì´µ¡…Ðµ¡•¥¡ÐèÄÔÉÁàì´µ™••µ‰½ÑÑ½´èÜáÁáô¹…Ñ¥½¸µÉ¥‰ÕÑÑ½¹íÁ…‘‘¥¹œµ¥¹±¥¹”èÉÁáõô((¹‘½­íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°Å™È¥ô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì¹‘½­íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌèÜÙÁàµ¥¹µ…à À°Å™È¥õô(¹Ý½±˜µÕ¥íÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”íèµ¥¹‘•àèàí±•™ÐèÄÙÁàíÑ½ÀèÄÙÁàíÝ¥‘Ñ éµ¥¸ ÌàÁÁà±…±Œ ÄÀÁÙÜ€´€ÌÉÁà¤¤íµ…àµ¡•¥¡Ðé…±Œ ÄÀÀ”€´€ÌÉÁà¤í½Ù•É™±½Üé…ÕÑ¼íÁ…‘‘¥¹œèÄÉÁàí‰…­É½Õ¹è™™˜Ù”å˜Èí‰½É‘•ÈèÉÁàÍ½±¥€ŒÜÐÕ”ÝŒí‰½É‘•ÈµÉ…‘¥ÕÌèÄáÁàí‰½àµÍ¡…‘½ÜèÀ€áÁà€ÈáÁà€ŒÈÀÄÜÈÔÜÀí½±½ÈèŒÌàÉˆÐÁô¹Ý½±˜µÕ¥m¡¥‘‘•¹uí‘¥ÍÁ±…äé¹½¹•ô¹Ý½±˜µÕ¤¡•…‘•Éí‘¥ÍÁ±…äé™±•àí©ÕÍÑ¥™äµ½¹Ñ•¹ÐéÍÁ…”µ‰•ÑÝ••¸í…±¥¸µ¥Ñ•µÌé•¹Ñ•Éô¹Ý½±˜µÕ¤¡•…‘•È‰ÕÑÑ½¸°¹Ý½±˜µÕ¤‰ÕÑÑ½¹íÁ…‘‘¥¹œèÙÁà€ÄÁÁáô¹Ý½±˜µÕ¤¡•…‘•È‰ÕÑÑ½¹í‰…­É½Õ¹è”åá•‘ô¹Ý½±˜µÕ¤Áíµ…É¥¸èÝÁà€Áô¹Ý½±˜µ±½íµ…àµ¡•¥¡ÐèÈÌÁÁàí½Ù•É™±½Üé…ÕÑ¼íµ…É¥¸µÑ½ÀèáÁàíÁ…‘‘¥¹œèÙÁàí‰…­É½Õ¹è˜Õ•‰˜Ðí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí™½¹ÐµÍ¥é”èÄÍÁáô¹Ý½±˜µ±½œ‘¥ÙíÁ…‘‘¥¹œèÉÁà€Áô¹Ý½±˜µÕ¤¥¹ÁÕÐ°¹Ý½±˜µÕ¤Í•±•Ñíµ…àµÝ¥‘Ñ èÄÀÀ”í‰½É‘•ÈèÅÁàÍ½±¥€ŒåˆáŒí‰½É‘•ÈµÉ…‘¥ÕÌèåÁàíÁ…‘‘¥¹œèÝÁáô¹Ý½±˜µÕ¤™½Éµí‘¥ÍÁ±…äé™±•àí…ÀèÙÁàíµ…É¥¸µÑ½ÀèÝÁáô¹Ý½±˜µÕ¤™½É´¥¹ÁÕÑí™±•àèÄíµ¥¸µÝ¥‘Ñ èÁô¹Ý½±˜µ…Ñ¥½¹Íí‘¥ÍÁ±…äé™±•àí™±•àµÝÉ…ÀéÝÉ…Àí…ÀèÙÁàíµ…É¥¸µÑ½ÀèáÁáô¹Ý½±˜µ¡½¥•í‘¥ÍÁ±…äéÉ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌèÅ™È€Å™Èí…ÀèÙÁàíµ…É¥¸µÑ½ÀèÝÁáô¹Ý½±˜µ¡½¥”±…‰•±í™½¹ÐµÍ¥é”èÄÍÁáô¹Ý½±˜µ‘•…‘í™¥±Ñ•ÈéÉ…åÍ…±” Ä¤í½Á…¥Ñäè¸áô¹Ý½±˜µÁ…ÉÑ¥¥Á…¹Ð€¹…Ñ¥½¹Íí½Á…¥Ñäè¸ÔÕô¹Ý½±˜µÁ…ÉÑ¥¥Á…¹Ð€¹…Ñ¥½¸µÉ¥‘íÁ½¥¹Ñ•Èµ•Ù•¹ÑÌé¹½¹•ô¹Ý½±˜µÁ…ÉÑ¥¥Á…¹Ð€¹Ñ…É•Ðµ±¥¹•í½Á…¥Ñäè¸ÔÕô)‘¥…±½œÝ½±˜µÉ•…Ñ”µµ½‘…°±‘¥…±½œÝ½±˜µ¥¹½µ¥¹œµµ½‘…±í‰½É‘•ÈèÉÁàÍ½±¥€ŒÜÐÕ”ÝŒí‰½É‘•ÈµÉ…‘¥ÕÌèÄáÁàíµ…àµÝ¥‘Ñ éµ¥¸ ÔØÁÁà°äÑÙÜ¤íÝ¥‘Ñ éµ¥¸ ÔØÁÁà°äÑÙÜ¤íµ…àµ¡•¥¡ÐèàÙÙ í½±½ÈèŒÌàÉˆÐÀí‰…­É½Õ¹è™™˜Ù”äí‰½àµÍ¡…‘½ÜèÀ€ÄÉÁà€ÐÑÁà€ŒÈÀÄÜÈÔÜÁõ‘¥…±½œÝ½±˜µÉ•…Ñ”µµ½‘…°èé‰…­‘É½À±‘¥…±½œÝ½±˜µ¥¹½µ¥¹œµµ½‘…°èé‰…­‘É½Áí‰…­É½Õ¹èŒÈÐÅ„Éàáõ‘¥…±½œÝ½±˜µÉ•…Ñ”µµ½‘…°™½É´±‘¥…±½œÝ½±˜µ¥¹½µ¥¹œµµ½‘…°™½Éµí‘¥ÍÁ±…äé™±•àí™±•àµÝÉ…ÀéÝÉ…Àí…ÀèáÁáôÝ½±˜µ¥¹Ù¥Ñ”µ±¥ÍÑíÝ¥‘Ñ èÄÀÀ”íµ…àµ¡•¥¡ÐèÐÉÙ í½Ù•É™±½Üé…ÕÑ¼í‘¥ÍÁ±…äéÉ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌèÅ™È€Å™Èí…ÀèÕÁáôÝ½±˜µ¥¹Ù¥Ñ”µ±¥ÍÐ±…‰•±íÁ…‘‘¥¹œèÕÁàí‰…­É½Õ¹è™™˜í‰½É‘•ÈµÉ…‘¥ÕÌèåÁáôÝ½±˜µ¥¹½µ¥¹œµµ½‘…°ÍÑÉ½¹œ°Ý½±˜µ¥¹½µ¥¹œµµ½‘…°ÁíÝ¥‘Ñ èÄÀÀ•ôÝ½±˜µ¡¥ÍÑ½Éäµ½¹Ñ•¹ÑíÝ¥‘Ñ èÄÀÀ”íµ…àµ¡•¥¡ÐèÔáÙ í½Ù•É™±½Üé…ÕÑ¼íÝ¡¥Ñ”µÍÁ…”éÁÉ”µÝÉ…Àí‰…­É½Õ¹è™™˜í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàíÁ…‘‘¥¹œèÄÁÁàí™½¹ÐµÍ¥é”èÄÍÁáôÝ½±˜µ¡¥ÍÑ½ÉäµÑ¥µ•Éíµ…É¥¸é…ÕÑ¼€À…ÕÑ¼…ÕÑ¼í½±½ÈèŒÝÕˆàÀí™½¹ÐµÝ•¥¡ÐèàÀÁô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì¹Ý½±˜µÕ¥í±•™ÐèÙÁàíÑ½ÀèÙÁàíÝ¥‘Ñ éµ¥¸ ÌÔÁÁà±…±Œ ÄÀÁÙÜ€´€ÄÉÁà¤¤íµ…àµ¡•¥¡Ðé…±Œ ÄÀÀ”€´€ÄÉÁà¤íÁ…‘‘¥¹œèåÁáô¹Ý½±˜µ±½íµ…àµ¡•¥¡ÐèÄÐÁÁáôÝ½±˜µ¥¹Ù¥Ñ”µ±¥ÍÑíÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌèÅ™Éõô((Ý½±˜µ¡¥ÍÑ½Éäµ½¹Ñ•¹Ñí™½¹ÐµÍ¥é”èÄÑÁàí±¥¹”µ¡•¥¡ÐèÄ¸ÔÔí½Ù•É™±½ÜµÝÉ…Àé…¹åÝ¡•É”í½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô((É½½´µ¡…Ñm¡¥‘‘•¹t°É½½´µ…Ñ¥½¹Ím¡¥‘‘•¹t°Ý½±˜µÕ¥m¡¥‘‘•¹t°Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•±m¡¥‘‘•¹uí‘¥ÍÁ±…äé¹½¹•ô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹‘½­íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à ÈÌÁÁà°ÌÈ”¤µ¥¹µ…à À°Å™È¥ô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€É½½´µ¡…ÑíÉ¥µ½±Õµ¸èÄí¡•¥¡ÐèÄÀÀ”í…±¥¸µÍ•±˜éÍÑÉ•Ñ íµ¥¸µ¡•¥¡ÐèÁô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€É½½´µ…Ñ¥½¹Íí‘¥ÍÁ±…äé¹½¹•ô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÕ¥íÉ¥µ½±Õµ¸èÈí‘¥ÍÁ±…äéÉ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤µ¥¹µ…à À°É™È¤í…ÀèÄÁÁàíµ¥¸µÝ¥‘Ñ èÀíµ¥¸µ¡•¥¡ÐèÀíÁ½Í¥Ñ¥½¸éÍÑ…Ñ¥ŒíÝ¥‘Ñ é…ÕÑ¼íµ…àµ¡•¥¡Ðé¹½¹”í½Ù•É™±½Üé¡¥‘‘•¸íÁ…‘‘¥¹œèÀí‰…­É½Õ¹éÑÉ…¹ÍÁ…É•¹Ðí‰½É‘•ÈèÀí‰½É‘•ÈµÉ…‘¥ÕÌèÀí‰½àµÍ¡…‘½Üé¹½¹”í½±½ÈèŒÌàÉˆÐÁô(¹Ý½±˜µÉ½±”µÁ…¹•°°¹Ý½±˜µ¡…ÐµÁ…¹•°°¹Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•±íµ¥¸µÝ¥‘Ñ èÀíµ¥¸µ¡•¥¡ÐèÀí‰…­É½Õ¹è™™˜Ù”å•í‰½É‘•ÈèÅÁàÍ½±¥€ŒÜÐÕ”ÝŒí‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàíÁ…‘‘¥¹œèÝÁà€åÁàí‰½àµÍ¡…‘½ÜèÀ€ÉÁà€ÕÁà€ŒÌàÉˆÐÀÌÀí½Ù•É™±½Üé¡¥‘‘•¹ô(¹Ý½±˜µÉ½±”µÁ…¹•°°¹Ý½±˜µ¡…ÐµÁ…¹•±í‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…ÀèÑÁáô(¹Ý½±˜µÉ½±”µÁ…¹•°ùÍÑÉ½¹œ°¹Ý½±˜µ¡…ÐµÁ…¹•°ùÍÑÉ½¹œ°¹Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•°¡•…‘•Éí™½¹ÐµÍ¥é”èÄÍÁàí™½¹ÐµÝ•¥¡ÐèÄÀÀÀí½±½ÈèŒÑÌàÔÑô(Ý½±˜µÍÑ…ÑÕÍí™½¹ÐµÍ¥é”èÄÉÁàí™½¹ÐµÝ•¥¡ÐèäÀÀí½±½ÈèŒØÜÑˆØäí±¥¹”µ¡•¥¡ÐèÄ¸Ìí½Ù•É™±½ÜµÝÉ…Àé…¹åÝ¡•É•ô(Ý½±˜µÁÉ¥Ù…Ñ•í™±•àèÄíµ¥¸µ¡•¥¡ÐèÀí½Ù•É™±½Üé…ÕÑ¼í™½¹ÐµÍ¥é”èÄÉÁàí±¥¹”µ¡•¥¡ÐèÄ¸ÌÔí½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô(Ý½±˜µÁÉ¥Ù…Ñ”Áíµ…É¥¸èÍÁà€Áô(Ý½±˜µÁÉ¥Ù…Ñ”Í•±•ÑíÝ¥‘Ñ èÄÀÀ”íµ…É¥¸èÉÁà€ÀíÁ…‘‘¥¹œèÕÁàí™½¹ÐµÍ¥é”èÄÉÁáô(Ý½±˜µ…Ñ¥½¹Íí‘¥ÍÁ±…äé™±•àí™±•àµÝÉ…ÀéÝÉ…Àí…ÀèÕÁàí…±¥¸µ¥Ñ•µÌé•¹Ñ•Éô(Ý½±˜µ…Ñ¥½¹Ì‰ÕÑÑ½¹íÁ…‘‘¥¹œèÙÁà€åÁàí™½¹ÐµÍ¥é”èÄÉÁáô(¹Ý½±˜µ±½í™±•àèÄíµ¥¸µ¡•¥¡ÐèÀíµ…àµ¡•¥¡Ðé¹½¹”í½Ù•É™±½Üé…ÕÑ¼íµ…É¥¸èÀíÁ…‘‘¥¹œèÕÁà€ÝÁàí‰…­É½Õ¹è˜Õ•‰˜Ðí‰½É‘•ÈµÉ…‘¥ÕÌèåÁàí™½¹ÐµÍ¥é”èÄÍÁàí½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô(¹Ý½±˜µ±½œ‘¥ÙíÁ…‘‘¥¹œèÉÁà€Àí½Ù•É™±½ÜµÝÉ…Àé…¹åÝ¡•É•ô(¹Ý½±˜µ¡…ÐµÁ…¹•°™½Éµí‘¥ÍÁ±…äé™±•àí…ÀèÙÁàíµ…É¥¸èÁô(¹Ý½±˜µ¡…ÐµÁ…¹•°™½É´¥¹ÁÕÑí™±•àèÄíµ¥¸µÝ¥‘Ñ èÀíÁ…‘‘¥¹œèÙÁà€åÁàí™½¹ÐµÍ¥é”èÄÍÁáô(¹Ý½±˜µ¡…ÐµÁ…¹•°™½É´‰ÕÑÑ½¹íÁ…‘‘¥¹œèÕÁà€ÄÁÁáô(…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€¹‘½­íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°Å™È¥ô(…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€É½½´µ¡…Ð°…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€É½½´µ…Ñ¥½¹Ì°…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€Ý½±˜µÕ¥í‘¥ÍÁ±…äé¹½¹•ô(…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•±íÉ¥µ½±Õµ¸èÄí‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…ÀèÙÁàíµ¥¸µÝ¥‘Ñ èÀíµ¥¸µ¡•¥¡ÐèÀíÁ…‘‘¥¹œèáÁà€ÄÉÁáô(¹Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•°¡•…‘•Éí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹ÐéÍÁ…”µ‰•ÑÝ••¸í…ÀèáÁáô(Ý½±˜µ¡¥ÍÑ½ÉäµÑ¥µ•Éí™±•àèÀ€À…ÕÑ¼íµ…É¥¸µ±•™Ðé…ÕÑ¼í½±½ÈèŒÝÕˆàÀí™½¹ÐµÍ¥é”èÄÉÁàí™½¹ÐµÝ•¥¡ÐèäÀÁô(Ý½±˜µ¡¥ÍÑ½Éäµ½¹Ñ•¹Ñí™±•àèÄíµ¥¸µ¡•¥¡ÐèÀíµ…àµ¡•¥¡Ðé¹½¹”í½Ù•É™±½Üé…ÕÑ¼íÝ¡¥Ñ”µÍÁ…”éÁÉ”µÝÉ…Àí½Ù•É™±½ÜµÝÉ…Àé…¹åÝ¡•É”í‰…­É½Õ¹è™™˜í‰½É‘•ÈµÉ…‘¥ÕÌèåÁàíÁ…‘‘¥¹œèÝÁà€åÁàí™½¹ÐµÍ¥é”èÄÍÁàí±¥¹”µ¡•¥¡ÐèÄ¸Ðí½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹‘½­íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌèØÑÁàµ¥¹µ…à À°Å™È¥ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€É½½´µ¡…ÑíÉ¥µ½±Õµ¸èÄí¡•¥¡ÐèÄÀÀ”í…±¥¸µÍ•±˜éÍÑÉ•Ñ¡ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÕ¥íÉ¥µ½±Õµ¸èÄíÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤µ¥¹µ…à À°É™È¤í…ÀèÕÁáô(€€¹Ý½±˜µÉ½±”µÁ…¹•°°¹Ý½±˜µ¡…ÐµÁ…¹•±íÁ…‘‘¥¹œèÕÁàí…ÀèÍÁáô(€€¹Ý½±˜µÉ½±”µÁ…¹•°ùÍÑÉ½¹œ°¹Ý½±˜µ¡…ÐµÁ…¹•°ùÍÑÉ½¹í™½¹ÐµÍ¥é”èÄÅÁáô(€€Ý½±˜µÍÑ…ÑÕÌ°Ý½±˜µÁÉ¥Ù…Ñ•í™½¹ÐµÍ¥é”èÄÁÁáô(€€Ý½±˜µÁÉ¥Ù…Ñ”Í•±•Ñí™½¹ÐµÍ¥é”èÄÁÁàíÁ…‘‘¥¹œèÍÁáô(€€Ý½±˜µ…Ñ¥½¹Íí…ÀèÍÁáô(€€Ý½±˜µ…Ñ¥½¹Ì‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÁÁàíÁ…‘‘¥¹œèÑÁà€ÙÁáô(€€¹Ý½±˜µ±½í™½¹ÐµÍ¥é”èÄÅÁàíÁ…‘‘¥¹œèÑÁáô(€€¹Ý½±˜µ¡…ÐµÁ…¹•°™½É´¥¹ÁÕÑí™½¹ÐµÍ¥é”èÄÅÁàíÁ…‘‘¥¹œèÑÁà€ÙÁáô(€€¹Ý½±˜µ¡…ÐµÁ…¹•°™½É´‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÁÁàíÁ…‘‘¥¹œèÑÁà€ÝÁáô(€€…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€¹Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•±íÁ…‘‘¥¹œèÙÁáô(€€Ý½±˜µ¡¥ÍÑ½Éäµ½¹Ñ•¹Ñí™½¹ÐµÍ¥é”èÄÅÁàí±¥¹”µ¡•¥¡ÐèÄ¸Íô)ô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€É½½´µ¡…Ñí‰…­É½Õ¹è™™˜Ù”áô((¹Ý½±˜µ‘•…°µÍÉ••¹íÁ½Í¥Ñ¥½¸é™¥á•í¥¹Í•ÐèÀíèµ¥¹‘•àèÌÀí‘¥ÍÁ±…äéÉ¥íÁ±…”µ¥Ñ•µÌé•¹Ñ•ÈíÁ…‘‘¥¹œèÄÙÁàí‰…­É½Õ¹èŒÈÐÅ„É‘Œí‰…­‘É½Àµ™¥±Ñ•Èé‰±ÕÈ ÍÁà¥ô(¹Ý½±˜µ‘•…°µÍÉ••¹m¡¥‘‘•¹uí‘¥ÍÁ±…äé¹½¹•ô(¹Ý½±˜µ‘•…°µÁ…¹•±íÝ¥‘Ñ éµ¥¸ ÜØÁÁà°äÙÙÜ¤íÁ…‘‘¥¹œé±…µÀ ÄÙÁà°ÍÙÜ°ÈáÁà¤í‰½É‘•ÈèÉÁàÍ½±¥€˜Å˜Üàí‰½É‘•ÈµÉ…‘¥ÕÌèÈÉÁàí‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð ÄÐÕ‘•œ°™™˜å•°˜É”Õ˜Ä¤í‰½àµÍ¡…‘½ÜèÀ€ÄáÁà€ÜÁÁà€ŒÄÀÁ„ÄÙ„àíÑ•áÐµ…±¥¸é•¹Ñ•Èí½±½ÈèŒÌàÉˆÐÁô(¹Ý½±˜µ‘•…°µÁ…¹•°ùÍÑÉ½¹í™½¹ÐµÍ¥é”é±…µÀ ÈÁÁà°ÑÙÜ°ÌÁÁà¤í™½¹ÐµÝ•¥¡ÐèÄÀÀÁô(¹Ý½±˜µ‘•…°µÑ…‰±•íÁ½Í¥Ñ¥½¸éÉ•±…Ñ¥Ù”í‘¥ÍÁ±…äéÉ¥íÁ±…”µ¥Ñ•µÌé•¹Ñ•Èíµ¥¸µ¡•¥¡Ðé±…µÀ ÄàÁÁà°ÌÉÙ °ÈÜÁÁà¤íµ…É¥¸èÄÑÁà€À€áÁàí‰½É‘•ÈµÉ…‘¥ÕÌèÄáÁàí‰…­É½Õ¹éÉ…‘¥…°µÉ…‘¥•¹Ð¡•±±¥ÁÍ”°”áÙ…ˆ€À°ÍŒÉ„à€ÐÔ”°ˆÁ„Ù„À€ÄÀÀ”¤í½Ù•É™±½Üé¡¥‘‘•¹ô(¹Ý½±˜µ‘•­íÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í±•™ÐèÔÀ”íÑ½ÀèÔÀ”íÝ¥‘Ñ èÜÙÁàí¡•¥¡ÐèÄÀáÁàí‘¥ÍÁ±…äéÉ¥íÁ±…”µ¥Ñ•µÌé•¹Ñ•Èí‰½É‘•ÈèÍÁàÍ½±¥€™™˜Õ‘ˆí‰½É‘•ÈµÉ…‘¥ÕÌèÄÉÁàí‰…­É½Õ¹éÉ•Á•…Ñ¥¹œµ±¥¹•…ÈµÉ…‘¥•¹Ð ÄÌÕ‘•œ°ŒØÀÌØÑ”€À€áÁà°ŒÜÀÐÔÕ€áÁà€ÄÙÁà¤í‰½àµÍ¡…‘½ÜèÀ€ÝÁà€À€ŒÍ˜ÈäÌä°À€ÄÑÁà€ÈÑÁà€ŒÌÀÈØÌÌààí½±½Èè™™”Äå„í™½¹ÐµÍ¥é”èÌÑÁàíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÔÀ”°´ÔÀ”¤í…¹¥µ…Ñ¥½¸éÝ½±˜µÍ¡Õ™™±”€¸ÔÕÌ•…Í”µ¥¸µ½ÕÐ¥¹™¥¹¥Ñ”…±Ñ•É¹…Ñ•ô(¹Ý½±˜µ‘•¬èé‰•™½É”°¹Ý½±˜µ‘•¬èé…™Ñ•Éí½¹Ñ•¹ÐèˆˆíÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ÐèÑÁàí‰½É‘•ÈèÅÁàÍ½±¥€˜á‘‘„Àí‰½É‘•ÈµÉ…‘¥ÕÌèáÁàíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÕÁà°´ÑÁà¤íèµ¥¹‘•àè´Äí‰…­É½Õ¹èŒØàÐÀÔÝô¹Ý½±˜µ‘•¬èé…™Ñ•ÉíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´åÁà°´áÁà¥ô(¹Ý½±˜µ‘•…°µ…É‘ÍíÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í¥¹Í•ÐèÄÉÁàí‘¥ÍÁ±…äéÉ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌéÉ•Á•…Ð¡…ÕÑ¼µ™¥Ð±µ¥¹µ…à ÐÉÁà°Å™È¤¤í…±¥¸µ½¹Ñ•¹Ðé•¹Ñ•Èí©ÕÍÑ¥™äµ¥Ñ•µÌé•¹Ñ•Èí…ÀèáÁáô(¹Ý½±˜µ‘•…°µ…É‘íÝ¥‘Ñ éµ¥¸ ÄÀÀ”°ØáÁà¤í¡•¥¡Ðé±…µÀ ØÙÁà°ÄÁÙÜ°àáÁà¤í‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ðé•¹Ñ•Èí…ÀèÉÁàíÁ…‘‘¥¹œèÑÁà€ÉÁàí‰½É‘•ÈèÉÁàÍ½±¥€™™˜ÅŒàí‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁàí‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð ÄÔÕ‘•œ°™™˜Ù‘˜°”áÑ‰Œ¤í‰½àµÍ¡…‘½ÜèÀ€ÑÁà€åÁà€ŒÌÀÈØÌÌÜÀí½±½ÈèŒÐäÌÌÐÐí½Á…¥ÑäèÀíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ•d ÐáÁà¤Í…±” ¸ÐÔ¤É½Ñ…Ñ” ´ÄÉ‘•œ¤í‰½É‘•ÈµÉ…‘¥ÕÌèÄÁÁáô(¹Ý½±˜µ‘•…°µÍÉ••¸¹¥Ìµ‘•…±¥¹œ€¹Ý½±˜µ‘•…°µ…É‘í…¹¥µ…Ñ¥½¸éÝ½±˜µ…Éµ‘•…°€¸ÐÙÌÕ‰¥Œµ‰•é¥•È ¸Äà°¸à°¸ÈÈ°Ä¤™½ÉÝ…É‘Ìí…¹¥µ…Ñ¥½¸µ‘•±…äéÙ…È ´µ‘•…°µ‘•±…ä¥ô(¹Ý½±˜µ‘•…°µÍÉ••¸¹¥Ìµ‘•…±¥¹œ€¹Ý½±˜µ‘•­í‘¥ÍÁ±…äé¹½¹•ô(¹Ý½±˜µ‘•…°µ…Éé‘¥Í…‰±•‘íÕÉÍ½Èé‘•™…Õ±Ðí½Á…¥ÑäèÄíÑÉ…¹Í™½É´é¹½¹”í™¥±Ñ•ÈéÍ…ÑÕÉ…Ñ” ¸ÜØ¤í‰½àµÍ¡…‘½ÜèÀ€ÉÁà€ÕÁà€ŒÌÀÈØÌÌÔÕô(¹Ý½±˜µ‘•…°µ…É¹¥Ìµ½Ý¸µÁ¥­í‰½É‘•Èµ½±½ÈèŒÜáÙ„Ðí‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð ÄÔÕ‘•œ°˜É™™˜Ô°Œå˜ÅÐ¤í‰½àµÍ¡…‘½ÜèÀ€À€À€ÍÁà€ŒÔá‰ÝŒÔÔ°À€ÑÁà€åÁà€ŒÌÀÈØÌÌÜÁô(¹Ý½±˜µ‘•…°µ…É¹¥ÌµÁ•¹‘¥¹í‰½É‘•Èµ½±½Èè”Ý‰ŒÕ˜í™¥±Ñ•Èé‰É¥¡Ñ¹•ÍÌ Ä¸Àà¥ô(¹Ý½±˜µ…Éµ…ÉÑí‘¥ÍÁ±…äéÉ¥íÁ±…”µ¥Ñ•µÌé•¹Ñ•ÈíÝ¥‘Ñ é±…µÀ ÌÑÁà°ÕÙÜ°ÐÝÁà¤í¡•¥¡Ðé±…µÀ ÌáÁà°ÙÙÜ°ÔÉÁà¥ô(¹Ý½±˜µ…Éµ…ÉÐÍÙíÝ¥‘Ñ èÄÀÀ”í¡•¥¡ÐèÄÀÀ”í½Ù•É™±½ÜéÙ¥Í¥‰±•ô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ•…Éí™¥±°èŒÙÐÜÍˆíÍÑÉ½­”èŒÍŒÈäÌÀíÍÑÉ½­”µÝ¥‘Ñ èÈ¸ÔíÍÑÉ½­”µ±¥¹•©½¥¸éÉ½Õ¹‘ô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ¡•…‘í™¥±°èˆààÜÕŒíÍÑÉ½­”èŒÍŒÈäÌÀíÍÑÉ½­”µÝ¥‘Ñ èÈ¸ÔíÍÑÉ½­”µ±¥¹•©½¥¸éÉ½Õ¹‘ô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ‰É½Ü°¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µµ½ÕÑ¡í™¥±°é¹½¹”íÍÑÉ½­”èŒÍŒÈäÌÀíÍÑÉ½­”µÝ¥‘Ñ èÌíÍÑÉ½­”µ±¥¹•…ÀéÉ½Õ¹íÍÑÉ½­”µ±¥¹•©½¥¸éÉ½Õ¹‘ô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ•å•í™¥±°è˜Ù”áŒÐíÍÑÉ½­”èŒÍŒÈäÌÀíÍÑÉ½­”µÝ¥‘Ñ èÄ¸Õô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µµÕéé±•í™¥±°è˜Í‘™‰ˆíÍÑÉ½­”èŒÍŒÈäÌÀíÍÑÉ½­”µÝ¥‘Ñ èÉô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ¹½Í•í™¥±°èŒÌÔÈÐÉ‘ô(¹Ý½±˜µ…Éµ…ÉÐ€¹Ý½±˜µ™…¹í™¥±°è™™˜á”ÜíÍÑÉ½­”èŒÐäÌÄÍˆíÍÑÉ½­”µÝ¥‘Ñ èÄíÍÑÉ½­”µ±¥¹•©½¥¸éÉ½Õ¹‘ô(¹Ý½±˜µ…Éµ¹…µ•íµ…àµÝ¥‘Ñ èÄÀÀ”í½Ù•É™±½Üé¡¥‘‘•¸íÑ•áÐµ½Ù•É™±½Üé•±±¥ÁÍ¥ÌíÝ¡¥Ñ”µÍÁ…”é¹½ÝÉ…Àí½±½ÈèŒÐäÌÌÐÐí™½¹ÐµÍ¥é”é±…µÀ áÁà°Ä¸ÉÙÜ°ÄÅÁà¤í™½¹ÐµÝ•¥¡ÐèÄÀÀÀí±¥¹”µ¡•¥¡ÐèÄ¸ÀÕô(¹Ý½±˜µÉ½±”µ…É‘íÁ½Í¥Ñ¥½¸é…‰Í½±ÕÑ”í±•™ÐèÔÀ”íÑ½ÀèÔÀ”íÝ¥‘Ñ éµ¥¸ ÈØÁÁà°ØÉÙÜ¤íµ¥¸µ¡•¥¡ÐèÄÐÕÁàí‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí©ÕÍÑ¥™äµ½¹Ñ•¹Ðé•¹Ñ•Èí…ÀèÕÁàíÁ…‘‘¥¹œèÄÙÁàí‰½É‘•ÈèÍÁàÍ½±¥€˜ÝÜÜäí‰½É‘•ÈµÉ…‘¥ÕÌèÄÙÁàí‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð ÄÔÁ‘•œ°™™˜á‘˜°”ÙÍ”ä¤í‰½àµÍ¡…‘½ÜèÀ€áÁà€ÈÕÁà€ŒÈäÅÌÄààí½±½ÈèŒÌàÉˆÐÀí½Á…¥ÑäèÀíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÔÀ”°´ÔÀ”¤É½Ñ…Ñ•d äÁ‘•œ¤Í…±” ¸Ü¥ô(¹Ý½±˜µ‘•…°µÍÉ••¸¹¥ÌµÉ•Ù•…±•€¹Ý½±˜µ‘•¬°¹Ý½±˜µ‘•…°µÍÉ••¸¹¥ÌµÉ•Ù•…±•€¹Ý½±˜µ‘•…°µ…É‘Íí½Á…¥ÑäèÀíÑÉ…¹Í¥Ñ¥½¸é½Á…¥Ñä€¸ÉÍô(¹Ý½±˜µ‘•…°µÍÉ••¸¹¥ÌµÉ•Ù•…±•€¹Ý½±˜µÉ½±”µ…É‘í…¹¥µ…Ñ¥½¸éÝ½±˜µ…Éµ™±¥À€¸ÔÕÌÕ‰¥Œµ‰•é¥•È ¸È°¸à°¸È°Ä¤™½ÉÝ…É‘Íô(¹Ý½±˜µÉ½±”µ…É‘m¡¥‘‘•¹uí‘¥ÍÁ±…äé¹½¹•ô(¹Ý½±˜µÉ½±”µ…ÉÍÑÉ½¹í™½¹ÐµÍ¥é”èÈÉÁáô¹Ý½±˜µÉ½±”µ…ÉÍÁ…¹í™½¹ÐµÝ•¥¡ÐèäÀÀí½±½ÈèŒáˆÕÉ…ô¹Ý½±˜µÉ½±”µ…ÉÁíµ…É¥¸èÀí™½¹ÐµÍ¥é”èÄÑÁàí±¥¹”µ¡•¥¡ÐèÄ¸Ñô(Ý½±˜µ‘•…°µµ•ÍÍ…•íµ¥¸µ¡•¥¡ÐèÄ¸Õ•´íµ…É¥¸èáÁà€À€Àí™½¹ÐµÍ¥é”èÄÕÁàí™½¹ÐµÝ•¥¡ÐèäÀÀí½±½ÈèŒØÜÑˆØåô)­•å™É…µ•ÌÝ½±˜µÍ¡Õ™™±•í™É½µíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÔÐ”°´ÔÀ”¤É½Ñ…Ñ” ´Ý‘•œ¥õÑ½íÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÐØ”°´ÔÀ”¤É½Ñ…Ñ” Ý‘•œ¥õô)­•å™É…µ•ÌÝ½±˜µ…Éµ‘•…±íÑ½í½Á…¥ÑäèÄíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ•d À¤Í…±” Ä¤É½Ñ…Ñ” À¥õô)­•å™É…µ•ÌÝ½±˜µ…Éµ™±¥ÁíÑ½í½Á…¥ÑäèÄíÑÉ…¹Í™½É´éÑÉ…¹Í±…Ñ” ´ÔÀ”°´ÔÀ”¤É½Ñ…Ñ•d À¤Í…±” Ä¥õô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÔÈÁÁà¥ì¹Ý½±˜µ‘•…°µ…É‘ÍíÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌéÉ•Á•…Ð¡…ÕÑ¼µ™¥Ð±µ¥¹µ…à ÌáÁà°Å™È¤¤í…ÀèÕÁáô¹Ý½±˜µ‘•…°µ…É‘íÝ¥‘Ñ éµ¥¸ ÄÀÀ”°ÐáÁà¤í¡•¥¡ÐèØÉÁàíÁ…‘‘¥¹œèÍÁà€ÅÁáô¹Ý½±˜µ…Éµ…ÉÑíÝ¥‘Ñ èÌÙÁàí¡•¥¡ÐèÐÁÁáô¹Ý½±˜µ‘•…°µÑ…‰±•íµ¥¸µ¡•¥¡ÐèÈÄÁÁáõô()µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì(€€¹É½½´µÑ…í™½¹ÐµÍ¥é”èÄÉÁàí™½¹ÐµÝ•¥¡ÐèÄÀÀÀí½±½Èè™™˜í‰…­É½Õ¹èŒÌàÉˆÐÁ•í‰½É‘•ÈèÉÁàÍ½±¥€™™˜á•íÑ•áÐµÍ¡…‘½ÜèÀ€ÅÁà€ÉÁà€ŒÈÀÄÜÈÔí‰½àµÍ¡…‘½ÜèÀ€ÉÁà€ÕÁà€ŒÈÀÄÜÈÔàÁô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù•ì´µ‘½¬µ¡•¥¡ÐèÔáÙ¡ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½É±µÝÉ…Áí‰½ÑÑ½´èÁô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹‘½­í¡•¥¡ÐéÙ…È ´µ‘½¬µ¡•¥¡Ð¤íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°È¸Ù™È¤µ¥¹µ…à ÄÄáÁà°Å™È¤í‰…­É½Õ¹é±¥¹•…ÈµÉ…‘¥•¹Ð ÄàÁ‘•œ±ÑÉ…¹ÍÁ…É•¹Ð€À”±É‰„ ÄÔÀ°ÄÔÀ°ÄÔÀ°¸Äà¤€ÐÈ”±É‰„ ÄÀÀ°àÀ°ÄÄÀ°¸ÈÔ¤€ÄÀÀ”¤í‰½É‘•ÈµÑ½ÀèÁô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€É½½´µ¡…Ñí‘¥ÍÁ±…äé¹½¹•ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÕ¥íÉ¥µ½±Õµ¸èÄíÉ¥µÉ½ÜèÄíÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°È¸Ù™È¤µ¥¹µ…à ÄÄáÁà°Å™È¤í¡•¥¡ÐèÄÀÀ”í…ÀèÕÁáô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µ¡…ÐµÁ…¹•±íÉ¥µ½±Õµ¸èÄíÉ¥µÉ½ÜèÄí‰…­É½Õ¹éÉ‰„ ÈÔÔ°ÈÐØ°ÈÌÌ°¸ÜØ¤í‰…­‘É½Àµ™¥±Ñ•Èé‰±ÕÈ ÅÁà¥ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µÉ½±”µÁ…¹•±íÉ¥µ½±Õµ¸èÄíÉ¥µÉ½ÜèÈí‰…­É½Õ¹éÉ‰„ ÈÔÔ°ÈÐØ°ÈÌÌ°¸ä¥ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µ±½íµ…àµ¡•¥¡Ðé¹½¹”í‰…­É½Õ¹éÉ‰„ ÈÐÔ°ÈÌÔ°ÈÐÐ°¸ÜØ¤íÑ•áÐµÍ¡…‘½ÜèÀ€ÅÁà€ÅÁà€™™™ô)ô((…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹‘½­í¡•¥¡Ðéµ¥¸ ÌÉÙ °ÌÈÁÁà¤íµ¥¸µ¡•¥¡ÐèÈÌÁÁàíÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°Å™È¥ô(…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÕ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Í™È¤µ¥¹µ…à À°É™È¤µ¥¹µ…à À°Ñ™È¥ô(¹Ý½±˜µÉ½±”µ‘•ÍÉ¥ÁÑ¥½¸µÁ…¹•±í‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…ÀèÕÁàíµ¥¸µÝ¥‘Ñ èÀíµ¥¸µ¡•¥¡ÐèÀí½Ù•É™±½Üé…ÕÑ¼í‰…­É½Õ¹è™™˜Ù”å•í‰½É‘•ÈèÅÁàÍ½±¥€ŒÜÐÕ”ÝŒí‰½É‘•ÈµÉ…‘¥ÕÌèÄÑÁàíÁ…‘‘¥¹œèÝÁà€åÁàí‰½àµÍ¡…‘½ÜèÀ€ÉÁà€ÕÁà€ŒÌàÉˆÐÀÌÀí™½¹ÐµÍ¥é”èÄÉÁàí±¥¹”µ¡•¥¡ÐèÄ¸Ðí½Ù•ÉÍÉ½±°µ‰•¡…Ù¥½Èé½¹Ñ…¥¹ô(¹Ý½±˜µÉ½±”µ‘•ÍÉ¥ÁÑ¥½¸µÁ…¹•°ùÍÑÉ½¹í™½¹ÐµÍ¥é”èÄÍÁàí™½¹ÐµÝ•¥¡ÐèÄÀÀÀí½±½ÈèŒÑÌàÔÑô(Ý½±˜µÉ½±”µ‘•ÍÉ¥ÁÑ¥½¸Áíµ…É¥¸èÑÁà€Àí½Ù•É™±½ÜµÝÉ…Àé…¹åÝ¡•É•ô(Ý½±˜µÁÉ¥Ù…Ñ•í‘¥ÍÁ±…äé™±•àí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í©ÕÍÑ¥™äµ½¹Ñ•¹Ðé•¹Ñ•Èí…ÀèÕÁáô(Ý½±˜µ…Ñ¥½¹Íí™±•àèÀ€À…ÕÑ½ô(…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€¹‘½­í¡•¥¡Ðéµ¥¸ ÜÉ‘Ù °ÜØÁÁà¤íµ¥¸µ¡•¥¡Ðéµ¥¸ ÌÀÁÁà°Ôá‘Ù ¥ô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹‘½­í¡•¥¡Ðéµ¥¸ ÔÑ‘Ù °ÔÈÁÁà¤íµ¥¸µ¡•¥¡ÐèÀíÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°Å™È¤íÁ…‘‘¥¹œèÕÁà€áÁàµ…à ÕÁà±•¹Ø¡Í…™”µ…É•„µ¥¹Í•Ðµ‰½ÑÑ½´¤¥ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÕ¥íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìéµ¥¹µ…à À°Å™È¤íÉ¥µÑ•µÁ±…Ñ”µÉ½ÝÌéµ¥¹µ…à À°Ä¸É™È¤µ¥¹µ…à ÄÔÕÁà°¸á™È¤í¡•¥¡ÐèÄÀÀ”í…ÀèÕÁáô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µ¡…ÐµÁ…¹•±íÉ¥µ½±Õµ¸èÄíÉ¥µÉ½ÜèÅô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µÉ½±”µÁ…¹•±íÉ¥µ½±Õµ¸èÄíÉ¥µÉ½ÜèÉô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µÉ½±”µ‘•ÍÉ¥ÁÑ¥½¸µÁ…¹•±í‘¥ÍÁ±…äé¹½¹•ô(€€…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹µ½‰¥±”µÁ…‘í‘¥ÍÁ±…äé¹½¹•ô(€€Ý½±˜µÍÑ…ÑÕÌ°Ý½±˜µÁÉ¥Ù…Ñ•í™½¹ÐµÍ¥é”èÄÉÁáô(€€Ý½±˜µÁÉ¥Ù…Ñ”Í•±•Ñí™½¹ÐµÍ¥é”èÄÍÁàíÁ…‘‘¥¹œèÝÁáô(€€Ý½±˜µ…Ñ¥½¹Ì‰ÕÑÑ½¹í™½¹ÐµÍ¥é”èÄÉÁàíÁ…‘‘¥¹œèÙÁà€åÁáô(€€…ÁÀ¹µ„µÍ½¤µ™¥¹¥Í¡•€¹‘½­í¡•¥¡Ðéµ¥¸ ØÙ‘Ù °ØàÁÁà¤íµ¥¸µ¡•¥¡Ðéµ¥¸ ÈÜÁÁà°ÔÁ‘Ù ¥ô)ô(Ý½±˜µ¡¥ÍÑ½ÉäµÁ…¹•°¡•…‘•Èù‘¥Ùí‘¥ÍÁ±…äé™±•àí…±¥¸µ¥Ñ•µÌé•¹Ñ•Èí…ÀèåÁáô(Ý½±˜µ•á¥Ðµ‰ÕÑÑ½¹í™±•àèÀ€À…ÕÑ¼íÁ…‘‘¥¹œèÙÁà€ÄÉÁàí‰…­É½Õ¹è˜ÑÁàí™½¹ÐµÍ¥é”èÄÉÁáô(¹Ý½±˜µ½Ý¸µÉ½±•í‘¥ÍÁ±…äé‰±½¬í½±½ÈèŒÔÔÍÕŒí™½¹ÐµÍ¥é”èÄÍÁàí™½¹ÐµÝ•¥¡ÐèÄÀÀÀí±¥¹”µ¡•¥¡ÐèÄ¸ÈÕô)µ•‘¥„¡µ…àµÝ¥‘Ñ èÜØÁÁà¥ì…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€¹Ý½±˜µ±½í‰…­É½Õ¹éÉ‰„ ÈÐÔ°ÈÌÔ°ÈÐÐ°¸Ôà¥ô…ÁÀ¹µ„µÍ½¤µ…Ñ¥Ù”€Ý½±˜µÁÉ¥Ù…Ñ•íµ¥¸µ¡•¥¡ÐèÀíµ…àµ¡•¥¡Ðé¹½¹”í½Ù•É™±½Üé…ÕÑ½ôÝ½±˜µ¡¥ÍÑ½ÉäµÁ…¹•°¡•…‘•Éí…±¥¸µ¥Ñ•µÌé™±•àµÍÑ…ÉÑôÝ½±˜µ¡¥ÍÑ½ÉäµÁ…¹•°¡•…‘•Èù‘¥Ùí™±•àµ‘¥É•Ñ¥½¸é½±Õµ¸í…±¥¸µ¥Ñ•µÌé™±•àµ•¹í…ÀèÑÁáõô(