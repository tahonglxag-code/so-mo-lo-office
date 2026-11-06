import * as THREE from '/three.module.js';

const socket = io({ transports: ['websocket', 'polling'] });
const canvas = document.querySelector('#world');
const modal = document.querySelector('#join-modal');
const feed = document.querySelector('#feed');
const messages = document.querySelector('#messages');
const names = { snake: 'Rắn gian xảo', fish: 'Cá hai mang', pig: 'Lợn', cow: 'Bò sữa' };
const avatarIcons = { snake: '🐍', fish: '🐟', pig: '🐷', cow: '🐮' };
const lines = {
  punch: ['Ối, ai vừa bấm KPI vậy?', 'Báo HR nha!', 'Cú này tính là teamwork nhé.'],
  bonk: ['Cho tỉnh ngủ nè!', 'Đã ghi biên bản.', 'Gõ nhẹ thôi, còn họp.'],
  smirk: ['Deadline gọi tên bạn kìa.', 'Tự tin dữ ha!', 'Ủa tưởng hay lắm?'],
  bow: ['Em xin nhận task ạ.', 'Sếp nói gì cũng đúng!', 'Dạ vâng, em hiểu rồi ạ.'],
  run: ['Deadline tới rồi, chạy!', 'Tôi chưa thấy gì hết!', 'Xin phép out meeting.'],
  meditate: ['Hít vào… thở ra…', 'Bình tĩnh, còn 8 tiếng nữa.', 'Tâm bất biến giữa dòng task.'],
  sleep: ['Ngủ 5 phút thôi nha.', 'Đang cập nhật năng lượng…', 'Zzz…'],
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
const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
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
  ctx.font = '900 43px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text.slice(0, 22), 256, 64, 460);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.1, .52, 1);
  return sprite;
}

function makeRoomLabel(text, x, z) {
  const sprite = label(text, '#fffaf0');
  sprite.position.set(x, .14, z);
  sprite.scale.set(1.9, .46, 1);
  sprite.rotation.x = -Math.PI / 2;
  scene.add(sprite);
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
  box(scene, 3.9, 2.1, .28, mats.wall, 7.8, .77, -6.1);
  box(scene, 3.9, 2.1, .28, mats.wall, 11.9, .77, -6.1);
  box(scene, .28, 2.1, 5.0, mats.wall, 13.9, .77, -3.5);
  box(scene, 3.8, 2.1, .28, mats.wall, 7.5, .77, 1.5);
  box(scene, 4.2, 2.1, .28, mats.wall, 11.8, .77, 1.5);
  box(scene, .28, 2.1, 5.0, mats.wall, 13.9, .77, 4.1);
  box(scene, 3.5, 1.9, .28, mats.wall, -13.2, .7, -6.2);
  box(scene, .28, 1.9, 3.8, mats.wall, -11.5, .7, -4.2);
  box(scene, 1.0, .78, .54, mats.dark, -14.4, .16, -4.3);
  box(scene, .42, .2, .35, mats.white, -14.2, .66, -4.26);
  makeRoomLabel('KHU WC', -13.2, -7.2);
  makeRoomLabel('QUẦY CÀ PHÊ', -10.2, -9.1);
  makeRoomLabel('PHÒNG HỌP A', 10.5, -7.2);
  makeRoomLabel('PHÒNG HỌP B', 10.5, 2.2);
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
  makeRoomLabel('SỜ MỜ LỜ · TỰ DO ĐI LẠI', 0, -10.5);
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

function animal(type, tint = null) {
  const root = new THREE.Group();
  const fur = tint ? mat(tint) : ({ snake: mat('#64bc83'), fish: mat('#57a9d8'), pig: mat('#f29bad'), cow: mat('#fffaf0') }[type]);
  const blush = mat('#f39a9c');
  const eye = mat('#24212b');
  const dark = mat('#34303a');
  if (type === 'snake') {
    for(let i=0;i<4;i++) sphere(root, 0,.12+i*.1,.35+i*.22,.25,.22,.36-i*.035,fur,14);
    sphere(root,0,.67,-.12,.51,.48,.45,fur,18);
    sphere(root,0,.78,-.46,.48,.25,.25,fur,16);
    sphere(root,-.2,.86,-.62,.065,.08,.05,eye,10); sphere(root,.2,.86,-.62,.065,.08,.05,eye,10);
    sphere(root,0,.68,-.7,.16,.035,.08,mat('#e56773'),10);
    for(const x of [-.28,.28]) sphere(root,x,1.05,-.15,.095,.21,.1,fur,10);
  } else if (type === 'fish') {
    sphere(root,0,.55,0,.57,.7,.43,fur,18);
    for(const x of [-.4,.4]) {
      sphere(root,x,.57,-.02,.2,.32,.16,mat('#e58a7c'),12);
      for(let i=0;i<3;i++) box(root,.025,.34,.03,mat('#b86f72'),x+(x<0?.1:-.1)+i*.07,.55,-.18);
    }
    sphere(root,0,.58,-.43,.2,.1,.08,blush,12);
    sphere(root,-.27,.88,-.29,.16,.19,.12,mats.white,14); sphere(root,.27,.88,-.29,.16,.19,.12,mats.white,14);
    sphere(root,-.29,.87,-.39,.07,.09,.05,eye,10); sphere(root,.29,.87,-.39,.07,.09,.05,eye,10);
    const fin=new THREE.Mesh(new THREE.ConeGeometry(.25,.55,8),mat('#e99683'));
    fin.position.set(0,.58,.55); fin.rotation.x=Math.PI/2; root.add(fin);
  } else if (type === 'pig') {
    sphere(root,0,.44,.03,.57,.45,.52,fur,18);
    sphere(root,0,.91,-.18,.49,.47,.43,fur,18);
    for(const x of [-.34,.34]) {
      const ear=sphere(root,x,1.28,-.12,.16,.28,.11,fur,12); ear.rotation.z=x<0?.32:-.32;
      sphere(root,x,.99,-.58,.07,.08,.05,eye,10);
    }
    sphere(root,0,.78,-.64,.29,.22,.12,blush,14);
    sphere(root,-.1,.78,-.74,.035,.07,.03,dark,8); sphere(root,.1,.78,-.74,.035,.07,.03,dark,8);
    const curl=new THREE.Mesh(new THREE.TorusGeometry(.12,.035,8,16),fur); curl.position.set(.48,.34,.26); curl.rotation.y=.8; root.add(curl);
  } else {
    sphere(root,0,.48,0,.61,.5,.52,fur,18);
    sphere(root,0,.97,-.16,.49,.48,.42,fur,18);
    for(const [x,z,s] of [[-.3,.12,.18],[.27,.2,.17],[.34,-.1,.13],[-.36,-.03,.12]]) sphere(root,x,.61,z,s,.23,s,mat('#28252c'),10);
    for(const x of [-.45,.45]) {
      sphere(root,x,.93,-.15,.17,.11,.1,fur,12);
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.1,.27,8),mats.cream); horn.position.set(x*.72,1.45,-.13); horn.rotation.z=x<0?.2:-.2; root.add(horn);
    }
    sphere(root,-.2,1.02,-.52,.07,.09,.05,eye,10); sphere(root,.2,1.02,-.52,.07,.09,.05,eye,10);
    sphere(root,0,.78,-.6,.28,.19,.12,blush,14);
    sphere(root,-.09,.78,-.7,.035,.055,.025,dark,8); sphere(root,.09,.78,-.7,.035,.055,.025,dark,8);
  }
  for(const x of [-.3,.3]) {
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,.34,8),type==='snake'?fur:dark);
    leg.position.set(x,.15,.05); leg.castShadow=true; root.add(leg);
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return root;
}

office();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let targetWorld = null;
canvas.addEventListener('pointerdown', event => {
  pointer.x = event.clientX / innerWidth * 2 - 1;
  pointer.y = -(event.clientY - 68) / Math.max(1, canvas.clientHeight) * 2 + 1;
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
  name.position.set(0,2.08,0); group.add(name);
  const bubble=label(data.bubble||'', '#37293e');
  bubble.position.set(0,2.68,0); bubble.visible=Boolean(data.bubble); group.add(bubble);
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
  if(!selectedId)return toast('Chạm vào một người chơi khác để chọn họ nhé.');
  const action=button.dataset.action; const item=document.querySelector('#item').value;
  socket.emit('act',{target:selectedId,action,item});
}));
const actionKeys={KeyZ:'bonk',KeyX:'punch',KeyC:'smirk',KeyB:'bow',KeyV:'run',KeyM:'meditate',KeyN:'sleep'};
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
  if(event.buttons!==1||event.clientX>innerWidth*.46)return;
  pointer.x=event.clientX/innerWidth*2-1;
  pointer.y=-(event.clientY-68)/Math.max(1,canvas.clientHeight)*2+1;
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
socket.on('connect_error',()=>toast('Đang thử kết nối lại…'));

let lastMove=0;
let lastFrame=performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  const me=players.get(selfId);
  if(me) {
    let dx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    let dz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
    if(targetWorld){const tx=targetWorld.x-me.group.position.x,tz=targetWorld.z-me.group.position.z;const d=Math.hypot(tx,tz);if(d>.35){dx=tx/d;dz=tz/d;}else targetWorld=null;}
    if(dx||dz){const mag=Math.hypot(dx,dz);dx/=mag;dz/=mag;me.group.position.x=THREE.MathUtils.clamp(me.group.position.x+dx*5.2*dt,-13.4,13.4);me.group.position.z=THREE.MathUtils.clamp(me.group.position.z+dz*5.2*dt,-9.7,9.7);me.group.rotation.y=Math.atan2(-dx,-dz);}
    if(now-lastMove>55){socket.volatile.emit('move',{x:me.group.position.x,z:me.group.position.z,yaw:me.group.rotation.y});lastMove=now;}
    const look=new THREE.Vector3(me.group.position.x,0,me.group.position.z);
    camera.position.lerp(new THREE.Vector3(look.x,19,look.z+19),.06);camera.lookAt(look);
  }
  for(const p of players.values())if(p.id!==selfId){p.group.position.lerp(p.target,Math.min(1,dt*11));if(Number.isFinite(p.yaw))p.group.rotation.y=THREE.MathUtils.lerp(p.group.rotation.y,p.yaw,.15);}
  renderer.render(scene,camera);
}

function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);

const query=new URLSearchParams(location.search);
if(query.get('room'))document.querySelector('#room').value=query.get('room');
document.querySelector('#name').value=localStorage.getItem('smlName')||'';
document.querySelector('#join-form').addEventListener('submit',()=>localStorage.setItem('smlName',document.querySelector('#name').value.trim()));
