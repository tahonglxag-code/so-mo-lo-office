import express from 'express';
import { banTho } from './public/ban-tho.js';
import { taoChoHopGap } from './hop-gap-layout.js';
import { TAM_BAN_MA_SOI, trongVungBanMaSoi } from './public/ma-soi-layout.js';
import { taoQuanLyMaSoi } from './ma-soi.js';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true }, maxHttpBufferSize: 1e5 });
const rooms = new Map();
const maxX = 18.4;
const maxZ = 11.5;
const workSeats = [
  { id: 'desk-1', x: -15.45, z: 11.4 },
  { id: 'desk-3', x: -15.45, z: 1.4 },
  { id: 'desk-4', x: -15.45, z: 3.9 },
  { id: 'desk-5', x: -15.45, z: 6.4 },
  { id: 'desk-6', x: -15.45, z: 8.9 }
];
const workMilestones = [9, 69, 99, 199, 299, 399, 499, 599, 699, 799, 899];
setInterval(() => {
  for (const [code, room] of rooms) {
    if (!room.pendingMoves?.size) continue;
    const moves = [...room.pendingMoves.values()];
    room.pendingMoves.clear();
    if (room.size > 1) io.to(code).volatile.emit('moves', moves);
  }
}, 100).unref();
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const choDaDung = new Set([...room.values()].map(player => player.choMuaVo));
    let cho = 0;
    for (const player of room.values()) {
      if (player.maSoi || player.choMuaVo !== undefined || player.hoatCanh || player.workSeatId || now < (player.lockedUntil || 0) || now - player.lastActivity < 60000) continue;
      while (choDaDung.has(cho)) cho++;
      tatKhoiWc(code, player);
      player.choMuaVo = cho;
      choDaDung.add(cho);
      const hang = Math.floor(cho / 10);
      const cot = cho % 10;
      const x = -.05 + Math.ceil(cot / 2) * (cot % 2 ? -2.1 : 2.1);
      const z = 5.6 - hang * 1.85;
      const duration = Math.max(350, Math.hypot(x - player.x, z - player.z) / 7 * 1000);
      player.x = x;
      player.z = z;
      player.yaw = Math.PI;
      player.pose = '';
      player.poseUntil = 0;
      player.batDauMuaVo = now + duration;
      room.pendingMoves.delete(player.id);
      io.to(code).emit('mua-vo', { id: player.id, x, z, yaw: player.yaw, duration, cho, batDau: player.batDauMuaVo });
    }
  }
},1000).unref();

function tatKhoiWc(code, player) {
  player.buongWc = null;
  if (!player.khoiWc) return;
  player.khoiWc = false;
  io.to(code).emit('khoi-wc', { id: player.id, bat: false });
}

function roomKhoiWc(code, player) {
  player.khoiWc = player.buongWc;
  io.to(code).emit('khoi-wc', { id: player.id, bat: player.khoiWc });
}

function ghiThaoTac(code, player) {
  player.lastActivity = Date.now();
  if (player.hoatCanh?.loai === 'boss' && Date.now() >= player.lockedUntil) {
    player.hoatCanh = null;
    io.to(code).emit('het-hoat-canh', player.id);
  }
  tatKhoiWc(code, player);
  if (player.choMuaVo === undefined) return;
  player.choMuaVo = undefined;
  player.batDauMuaVo = 0;
  io.to(code).emit('mua-vo', { id: player.id, batDau: 0 });
}

const avatars = new Set(['snake', 'fish', 'sloth', 'cow', 'leopard']);
const defaultLines = {
  snake: ['chị khổ lắm em', 'chị lạy em', 'chị hứa mai chị gửi', 'em ơi', 'ủa em', 'alo em'],
  fish: ['thần thiếp không làm được', 'thần thiếp có tội', 'thần thiếp đi làm ngay', 'mấy giờ rồi', 'lên link trà chiều đi chị em', 'không phải em đâu', 'tất cả tại thằng bò'],
  sloth: ['Hảaa?', 'Àaaa...', 'tôi cần đi toilet 30p', 'qua tết nghỉ làm', 'đang lướt tóp tóp vui lòng không làm phiền'],
  cow: ['a di đà lạt - Bần Đò có biết gì đâu', 'lào gì cũng tôn', 'là sao nữa', 'nếu người khác làm được - thì để họ làm', 'cái gì đổ tại người khác được thì không phải tại mình', 'a di đà lạt - không biết không có tội'],
  leopard: ['em xin lỗi', 'chị ơi...', 'anh ơi...', 'cú bé', 'ta thà báo cả thiên hạ chứ không báo sếp', 'em mới pass thử việc ạ', 'e thề e chưa làm gì cả', 'công ty là gia đình 🎼🎼']
};
const loiBanThanTai = [
  'Ta ban cho con tiền đầy túi',
  'Ta sẽ giúp con ngừng nhận deadline',
  'Tháng này con sẽ hoàn thành kpi',
  'Mua trà sữa ún cho tỉnh đi con',
  'Có lạy nữa cũng không hết task đâu con',
  'Có phúc thì hưởng có họa mới kiếm ta'
];
const actions = new Set(['punch', 'bonk', 'smirk', 'bow', 'throw', 'shock']);
const items = new Set(['❤️', '🧋', '💸', '🍻', 'KPI', '💩']);
const interactionLines = {
  snake: 'chị hứa chị chừa',
  fish: 'bệ hạ tha tội',
  sloth: 't méc sếp m',
  cow: 'em đã làm gì đâu',
  leopard: 'em bị tổn thưn'
};

app.use(express.static(path.join(root, 'public')));
app.get('/css3d.js', (_req, res) => res.sendFile(path.join(root, 'node_modules/three/examples/jsm/renderers/CSS3DRenderer.js')));
app.get('/three.module.js', (_req, res) => res.sendFile(path.join(root, 'node_modules/three/build/three.module.js')));
app.get('/three.core.js', (_req, res) => res.sendFile(path.join(root, 'node_modules/three/build/three.core.js')));
app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, room) => n + room.size, 0), uptime: Math.floor(process.uptime()) }));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'public/index.html')));

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    x: player.x,
    z: player.z,
    yaw: player.yaw,
    bubble: player.bubble,
    bubbleUntil: player.bubbleUntil,
    pose: player.pose,
    poseUntil: player.poseUntil,
    dieuNhay: player.pose === 'dance' ? player.dieuNhay : undefined,
    hoatCanh: player.hoatCanh,
    workSeatId: player.workSeatId,
    working: player.working,
    workStartedAt: player.workStartedAt,
    auraUntil: player.auraUntil,
    workGlow: Boolean(player.workGlow),
    khoiWc: player.khoiWc || false,
    batDauMuaVo: player.batDauMuaVo || 0,
    choMuaVo: player.choMuaVo,
    lockedUntil: player.lockedUntil || 0,
    maSoi: Boolean(player.maSoi)
  };
}

function randomLine(avatar) {
  const choices = defaultLines[avatar] || defaultLines.snake;
  return choices[randomInt(choices.length)];
}

function scheduleIdleLine(code, player) {
  clearTimeout(player.idleTimer);
  if(player.maSoi)return;
  player.idleTimer = setTimeout(() => {
    const room = rooms.get(code);
    if (!room?.has(player.id)) return;
    if (Date.now() - player.lastActivity < 30000) return scheduleIdleLine(code, player);
    const text = randomLine(player.avatar);
    player.bubble = text;
    player.bubbleUntil = Date.now() + 6500;
    io.to(code).emit('default-line', { id: player.id, text });
    scheduleIdleLine(code, player);
  }, 30000);
}

function releaseWorkSeat(code, player) {
  if (!player?.workSeatId) return;
  for (const timer of player.workTimers || []) clearTimeout(timer);
  player.workTimers = [];
  player.workSeatId = '';
  player.working = false;
  player.workStartedAt = 0;
  player.bubble = '';
  player.bubbleUntil = 0;
  player.workGlow = false;
  io.to(code).emit('work-state', { id: player.id, working: false });
  scheduleIdleLine(code, player);
}

function startWorkTimer(code, player) {
  player.workStartedAt = Date.now();
  player.workTimers = workMilestones.map(seconds => setTimeout(() => {
    if (!rooms.get(code)?.has(player.id) || !player.working || !player.workSeatId) return;
    io.to(code).emit('work-milestone', { id: player.id, name: player.name, seconds, final: false });
  }, seconds * 1000));
  player.workTimers.push(setTimeout(() => {
    if (!rooms.get(code)?.has(player.id) || !player.working || !player.workSeatId) return;
    player.workGlow = true;
    io.to(code).emit('work-milestone', { id: player.id, name: player.name, seconds: 999, final: false });
  }, 999000));
  player.workTimers.push(setTimeout(() => {
    const room = rooms.get(code);
    if (!room?.has(player.id) || !player.working || !player.workSeatId) return;
    releaseWorkSeat(code, player);
    player.x = 0;
    player.z = 0;
    player.lastActivity = Date.now();
    player.lockedUntil = player.lastActivity + 1800;
    player.auraUntil = player.lastActivity + 300000;
    room.pendingMoves.delete(player.id);
    const hero = { id: player.id, name: player.name, until: player.auraUntil };
    room.heroes = [...activeHeroes(room), hero];
    io.to(code).emit('work-complete', { id: player.id, x: player.x, z: player.z, duration: 1800, auraUntil: player.auraUntil });
    io.to(code).emit('work-hero', hero);
  }, 9999000));
}

function activeHeroes(room) {
  room.heroes = (room.heroes || []).filter(hero => hero.until > Date.now());
  return room.heroes;
}

const quanLyMaSoi=taoQuanLyMaSoi(io,rooms,{
  lockPlayer:(id,locked,position)=>{
    for(const [code,room] of rooms){
      const player=room.get(id);if(!player)continue;
      if(locked){
        releaseWorkSeat(code,player);ghiThaoTac(code,player);clearTimeout(player.idleTimer);player.maSoi=true;
        if(position){player.x=position.x;player.z=position.z;player.yaw=position.yaw;}
        player.pose='wolf-seat';player.poseUntil=Date.now()+86400000;player.bubble='';player.bubbleUntil=0;
        player.hoatCanh=null;player.choMuaVo=undefined;player.batDauMuaVo=0;
      }else{
        player.maSoi=false;player.maSoiSpectator=false;player.pose='';player.poseUntil=0;player.lockedUntil=0;
        if(position){player.x=position.x;player.z=position.z;player.yaw=position.yaw;}
        scheduleIdleLine(code,player);
      }
      room.pendingMoves.delete(id);
      io.to(code).emit('wolf-lock',{id,locked,x:player.x,z:player.z,yaw:player.yaw,avatar:player.avatar,name:player.name});
      io.to(code).emit('moves',[{id,x:player.x,z:player.z,yaw:player.yaw}]);
      return;
    }
  },
  clearArea:(code,accepted)=>{
    const room=rooms.get(code);if(!room)return;
    const center=TAM_BAN_MA_SOI;
    const occupied=[...room.values()].filter(player=>accepted.has(player.id)||!trongVungBanMaSoi(player.x,player.z)).map(player=>({x:player.x,z:player.z}));
    for(const player of room.values()){
      if(accepted.has(player.id)||!trongVungBanMaSoi(player.x,player.z))continue;
      let spot=null;
      for(const radius of [6,7.2,8.4,9.6])for(let index=0;index<24&&!spot;index++){
        const angle=2*Math.PI*index/24;
        const candidate={x:center.x+radius*Math.cos(angle),z:center.z+radius*Math.sin(angle)};
        if(candidate.x < -maxX||candidate.x>maxX||candidate.z < -maxZ||candidate.z>maxZ)continue;
        if(occupied.some(other=>Math.hypot(candidate.x-other.x,candidate.z-other.z)<1.2))continue;
        spot=candidate;
      }
      if(!spot)continue;
      player.x=spot.x;player.z=spot.z;player.lastActivity=Date.now();occupied.push(spot);
      room.pendingMoves.delete(player.id);
      io.to(code).emit('wolf-relocate',{id:player.id,x:player.x,z:player.z,yaw:player.yaw});
    }
  }
});

io.on('connection', socket => {
  socket.on('join', (data, reply = () => {}) => {
    const name = cleanText(data?.name, 18) || 'Bạn mới';
    const avatar = avatars.has(data?.avatar) ? data.avatar : 'snake';
    const requested = cleanText(data?.room, 10).toUpperCase();
    if (requested && !/^[A-Z0-9]{3,10}$/.test(requested)) return reply({ error: 'Mã phòng chỉ dùng 3–10 chữ cái hoặc chữ số.' });
    const code = requested || roomCode();
    if (!rooms.has(code)) {
      const newRoom = new Map();
      newRoom.pendingMoves = new Map();
      newRoom.music = { videoId: '', playing: false, position: 0, changedAt: Date.now() };
      rooms.set(code, newRoom);
    }
    const room = rooms.get(code);
    if (room.has(socket.id)) {
      socket.emit('joined', { room: code, id: socket.id, players: [...room.values()].map(publicPlayer), music: room.music, heroes: activeHeroes(room) });
      quanLyMaSoi.onJoin(socket,room);
      return reply({ ok: true, room: code });
    }
    if (room.size >= 50) return reply({ error: 'Phòng đã đủ 50 người.' });
    const player = {
      id: socket.id,
      name,
      avatar,
      sessionId:/^[a-f0-9-]{36}$/i.test(String(data?.sessionId||''))?String(data.sessionId):randomUUID(),
      x: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 9,
      yaw: 0,
      bubble: '',
      bubbleUntil: 0,
      pose: '',
      poseUntil: 0,
      workSeatId: '',
      working: false,
      workStartedAt: 0,
      auraUntil: 0,
      lastActivity: Date.now()
    };
    Object.defineProperties(player, {
      idleTimer: { value: null, writable: true },
      workTimers: { value: [], writable: true },
      lastMoveAt: { value: 0, writable: true }
    });
    player.bubble = randomLine(avatar);
    player.bubbleUntil = Date.now() + 6500;
    socket.data.room = code;
    socket.data.name = name;
    socket.join(code);
    room.set(socket.id, player);
    socket.emit('joined', { room: code, id: socket.id, players: [...room.values()].map(publicPlayer), music: room.music, heroes: activeHeroes(room) });
    socket.to(code).emit('player-joined', publicPlayer(player));
    io.to(code).emit('feed', { text: `${name} vừa vào văn phòng`, kind: 'join' });
    io.to(code).emit('default-line', { id: player.id, text: player.bubble });
    quanLyMaSoi.onJoin(socket,room);
    scheduleIdleLine(code, player);
    reply({ ok: true, room: code });
  });

  socket.on('thao-tac', () => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (player&&!player.maSoi&&(!player.buongWc || Date.now() >= player.lockedUntil)) ghiThaoTac(code, player);
  });

  socket.on('move', data => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (!player || !data || player.maSoi) return;
    const now = Date.now();
    if (now < (player.lockedUntil || 0) || now < (player.batDauMuaVo || 0) || now - player.lastMoveAt < 80) return;
    player.lastMoveAt = now;
    const nextX = Math.max(-maxX, Math.min(maxX, Number(data.x) || 0));
    const nextZ = Math.max(-maxZ, Math.min(maxZ, Number(data.z) || 0));
    const nextYaw = Number(data.yaw) || 0;
    const daDiChuyen = Math.hypot(nextX - player.x, nextZ - player.z) > .01;
    if (player.choMuaVo !== undefined && !daDiChuyen) return;
    const lechGoc = Math.atan2(Math.sin(nextYaw - player.yaw), Math.cos(nextYaw - player.yaw));
    const changed = daDiChuyen || Math.abs(lechGoc) > .01;
    if (changed) ghiThaoTac(code, player);
    if (player.workSeatId) {
        const seat = workSeats.find(item => item.id === player.workSeatId);
        const distance = seat ? Math.hypot(nextX - seat.x, nextZ - seat.z) : Infinity;
        if (player.working && distance > .82) releaseWorkSeat(code, player);
        else if (!player.working && seat && distance < .55) {
          player.working = true;
          player.bubble = 'kiếp trâu ngựa';
          startWorkTimer(code, player);
          player.lastActivity = player.workStartedAt;
          player.bubbleUntil = player.workStartedAt + 10000;
          scheduleIdleLine(code, player);
          io.to(code).emit('work-state', { id: player.id, working: true, seatId: player.workSeatId, startedAt: player.workStartedAt, text: player.bubble, bubbleUntil: player.bubbleUntil });
        }
    }
    player.x = nextX;
    player.z = nextZ;
    player.yaw = nextYaw;
    if (changed) rooms.get(code).pendingMoves.set(socket.id, { id: socket.id, x: player.x, z: player.z, yaw: player.yaw });
  });

  function diWc(idBan) {
    const code = socket.data.room;
    const room = rooms.get(code);
    const nguoi = room?.get(socket.id);
    const ban = idBan && idBan !== socket.id ? room?.get(idBan) : null;
    const lucDi = Date.now();
    if (!nguoi || nguoi.maSoi || lucDi < (nguoi.lockedUntil || 0)) return;
    if (idBan && (!ban || ban.maSoi || lucDi < (ban.lockedUntil || 0) || ban.buongWc)) {
      return socket.emit('feed', { text: 'Người được chọn đang bận hoặc đã rời phòng.' });
    }
    const buong = ban ? 'doi' : 'don';
    const nhom = ban ? [nguoi, ban] : [nguoi];
    if ([...room.values()].some(p => p.buongWc === buong && !nhom.includes(p))) {
      return socket.emit('feed', { text: 'Buồng này đang có người.' });
    }
    const duration = 2600;
    const cuaZ = ban ? -6.95 : -11.3;
    for (const [i,p] of nhom.entries()) {
      ghiThaoTac(code,p);
      releaseWorkSeat(code,p);
      p.buongWc = buong;
      p.x = -18.4;
      p.z = cuaZ + (ban ? (i-.5)*.94 : 0);
      p.yaw = -Math.PI/2;
      p.lockedUntil = lucDi + duration;
      p.pose = 'toilet';
      p.poseUntil = p.lockedUntil;
      p.bubble = 'đang đi toilet...';
      p.bubbleUntil = lucDi + 6500;
      room.pendingMoves.delete(p.id);
      const path = [{x:-16,z:cuaZ},{x:-17.1,z:cuaZ},{x:p.x,z:p.z}];
      io.to(code).emit('self-action', {id:p.id,action:'toilet',buong,x:p.x,z:p.z,yaw:p.yaw,path,line:p.bubble,duration,at:lucDi});
      setTimeout(() => {
        if (room.get(p.id) === p && p.buongWc === buong && p.lockedUntil === lucDi + duration) roomKhoiWc(code,p);
      },duration).unref();
      scheduleIdleLine(code,p); if(i===0)io.to(code).emit('feed',{text:ban?`🚽 ${nguoi.name} rủ ${ban.name} cùng đi toilet`:`🚽 ${nguoi.name} đi toilet`});
    }
  }
  socket.on('di-wc', data => diWc(typeof data?.ban === 'string' ? data.ban : ''));

  socket.on('self-action', action => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (player && (player.maSoi || Date.now() < (player.lockedUntil || 0))) return;
    if (!player || !['run', 'meditate', 'toilet', 'money', 'dance'].includes(action)) return;
    if (action === 'toilet') return diWc('');
    ghiThaoTac(code, player);
    if (action === 'dance') {
      releaseWorkSeat(code, player);
      const at = Date.now();
      const duration = 3000;
      player.lockedUntil = at + duration;
      player.lastActivity = at;
      if (player.pose === 'meditate') {
        player.bubble = '';
        player.bubbleUntil = 0;
      }
      player.pose = action;
      player.poseUntil = player.lockedUntil;
      player.dieuNhay = ((player.dieuNhay ?? -1) + 1) % 5;
      scheduleIdleLine(code, player);
      io.to(code).emit('self-action', { id: player.id, action, x: player.x, z: player.z, yaw: player.yaw, duration, at, dieuNhay: player.dieuNhay });
      return;
    }
    if (action === 'money' || action === 'run') releaseWorkSeat(code, player);
    const duration = action === 'run' ? 900 : action === 'money' ? 5000 : 4000;
    let line = '';
    let path = [];
    if (action === 'run') {
      const distance = 5.6;
      player.x = Math.max(-maxX, Math.min(maxX, player.x - Math.sin(player.yaw) * distance));
      player.z = Math.max(-maxZ, Math.min(maxZ, player.z - Math.cos(player.yaw) * distance));
      path = [{ x: player.x, z: player.z }];
    } else if (action === 'meditate') {
      line = 'lương bất biến giữa dòng deadline vạn biến';
      player.bubble = line;
      player.bubbleUntil = Date.now() + 6500;
    } else {
      line = 'LÚA VỀ';
    }
    player.pose = action;
    player.poseUntil = Date.now() + duration;
    player.lastActivity = Date.now();
    if (!player.workSeatId) scheduleIdleLine(code, player);
    io.to(code).emit('self-action', { id: player.id, action, x: player.x, z: player.z, yaw: player.yaw, path, line, duration, at: Date.now() });
  });

  socket.on('work', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    const player = room?.get(socket.id);
    if (!player || player.maSoi || Date.now() < (player.lockedUntil || 0)) return;
    ghiThaoTac(code, player);
    if (player.workSeatId) return socket.emit('work-result', { error: 'Bạn đang giữ một chỗ làm việc. Hãy di chuyển khỏi bàn để nhả chỗ.' });
    const occupied = new Set([...room.values()].map(item => item.workSeatId).filter(Boolean));
    const seat = workSeats.find(item => !occupied.has(item.id));
    if (!seat) return socket.emit('work-result', { error: 'Hết chỗ rồi, không thể làm việc, đây chính là thông điệp dũ chụ' });
    player.workSeatId = seat.id;
    player.working = false;
    player.lastActivity = Date.now();
    clearTimeout(player.idleTimer);
    socket.emit('work-result', { ok: true, seat });
    io.to(code).emit('work-move', { id: player.id, seat, duration: Math.max(700, Math.hypot(player.x - seat.x, player.z - seat.z) / 5.2 * 1000) });
  });

  socket.on('hoat-canh', data => {
    const code = socket.data.room;
    const room = rooms.get(code);
    const nguoiGoi = room?.get(socket.id);
    const now = Date.now();
    const loai = data?.loai;
    if (!nguoiGoi || nguoiGoi.maSoi || now < (nguoiGoi.lockedUntil || 0) || !['inspect','boss','drink'].includes(loai)) return;
    if (loai === 'inspect' && now < (room.thanhTraDen || 0)) return;
    if (loai!=='inspect' && [...room.values()].some(p=>p.hoatCanh?.loai===loai)) {
      return socket.emit('feed',{text:loai==='boss'?'Phòng Sếp đang có người.':'Dãy ghế đang có người nhậu.'});
    }
    const ids = Array.isArray(data.ids) ? [...new Set(data.ids)].filter(id=>typeof id==='string'&&id!==socket.id).slice(0,3) : [];
    const khach = loai === 'inspect' ? [...room.values()].filter(p=>!p.maSoi) : loai === 'boss'
      ? [data.target ? room.get(data.target) : nguoiGoi].filter(Boolean)
      : [nguoiGoi,...ids.map(id=>room.get(id)).filter(p=>p&&!p.maSoi)];
    if(loai==='boss'&&khach.some(p=>p.maSoi))return socket.emit('feed',{text:'Người chơi đang tham gia Ma Sói.'});
    if (!khach.length || (loai==='drink' && khach.length<2)) return;
    if (loai!=='inspect' && khach.some(p=>now<(p.lockedUntil||0)||p.hoatCanh?.loai==='boss')) {
      return socket.emit('feed',{text:'Người chơi đang bận.'});
    }
    const batDau=now+900;
    const ketThuc=loai==='inspect'?batDau+5000:loai==='drink'?batDau+2000:0;
    const khoaDen=loai==='boss'?now+30000:ketThuc||(batDau+3000);
    const tamBia={x:-.05,z:8.2};
    const gheNhau=loai==='drink'?khach.map((_,i)=>{
      const goc=2*Math.PI*i/khach.length+(khach.length===4?Math.PI/4:0);
      const banKinh=khach.length===2?1:khach.length===3?1.18:1.4;
      return {x:tamBia.x+banKinh*Math.cos(goc),z:tamBia.z+banKinh*Math.sin(goc),yaw:Math.PI/2-goc};
    }):null;
    const boTri=gheNhau?{tamBia,gheNhau}:{};
    const nguoi=khach.map((p,i)=>{
      if(p.hoatCanh)io.to(code).emit('het-hoat-canh',p.id);
      p.hoatCanh=null;
      releaseWorkSeat(code,p);
      ghiThaoTac(code,p);
      const x=loai==='inspect'?(i%10- (Math.min(khach.length,10)-1)/2)*1.6:gheNhau?gheNhau[i].x:14.5;
      const z=loai==='inspect'?3.5-Math.floor(i/10)*1.35:gheNhau?gheNhau[i].z:-7.15;
      const yaw=gheNhau?gheNhau[i].yaw:loai==='boss'?0:Math.PI;
      let path=[];
      let thoiGianDi=0;
      if(loai==='boss'&&p.x>10.4&&p.x<18.6&&p.z>1.2){
        path=[{x:14.5,z:9.8},{x:8.9,z:9.8},{x:8.9,z:-3.55},{x:14.5,z:-3.55},{x,z}];
      }else if(loai==='boss'&&!(p.x>10.4&&p.x<18.6&&p.z>-10.7&&p.z<-4.7)){
        path=[{x:14.5,z:-3.55},{x:14.5,z:-5.35},{x,z}];
      }else if(loai==='boss')path=[{x,z}];
      if(loai==='boss'){
        let truoc=p;
        let quangDuong=0;
        for(const diem of path){quangDuong+=Math.hypot(diem.x-truoc.x,diem.z-truoc.z);truoc=diem;}
        thoiGianDi=Math.max(700,quangDuong/5.2*1000);
      }
      p.x=x;
      p.z=z;
      p.yaw=yaw;
      p.pose='';
      p.poseUntil=0;
      const thoiDiemBatDau=loai==='boss'?now+thoiGianDi:batDau;
      const thoiDiemKhoa=loai==='boss'?thoiDiemBatDau+30000:khoaDen;
      p.lockedUntil=thoiDiemKhoa;
      p.hoatCanh={loai,batDau:thoiDiemBatDau,ketThuc,khoaDen:thoiDiemKhoa,x,z,yaw,path,duration:thoiGianDi,...boTri};
      room.pendingMoves.delete(p.id);
      if(ketThuc)setTimeout(()=>{
        if(p.hoatCanh?.batDau!==batDau)return;
        p.hoatCanh=null;
        io.to(code).emit('het-hoat-canh',p.id);
      },ketThuc-now).unref();
      return {id:p.id,x,z,yaw,path,duration:thoiGianDi,batDau:thoiDiemBatDau,khoaDen:thoiDiemKhoa};
    });
    if(loai==='inspect')room.thanhTraDen=ketThuc+900;
    const batDauThuc=loai==='boss'?Math.max(...nguoi.map(p=>p.batDau)):batDau;
    io.to(code).emit('hoat-canh',{loai,batDau:batDauThuc,ketThuc,khoaDen,nguoi,...boTri});
    const ten=loai==='inspect'?'🚨 Thanh tra':loai==='boss'?'📋 Họp riêng':'🍻 Rủ nhậu';
    io.to(code).emit('feed',{text:loai==='inspect'?`🚨 ${nguoiGoi.name} gọi thanh tra đến`:loai==='boss'?`📋 ${khach[0]?.name||nguoiGoi.name} họp riêng với SẾP`:`${ten} · ${khach.map(p=>p.name).join(', ')}`});
  });

  socket.on('boss-rebel', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    const player = room?.get(socket.id);
    const now = Date.now();
    if (!player || player.maSoi || player.hoatCanh?.loai !== 'boss' || now < player.hoatCanh.batDau || player.pose === 'boss-rebel') return;
    const duration = 6000;
    const x = banTho.x;
    const z = banTho.z + 1.5;
    const from = {x:player.x,z:player.z,yaw:player.yaw};
    const cua = {x:14.5,z:-5.25};
    const path = [{x:14.5,z:-3.55},{x:11.9,z:-3.55},{x:9.7,z:-5.7},{x:8.6,z:-8.35},{x,z}];
    const batDauDiCua = 1200;
    const thoiGianDenCua = Math.max(500,Math.hypot(cua.x-from.x,cua.z-from.z)/5.8*1000);
    const batDauQuatCua = batDauDiCua + thoiGianDenCua + 180;
    const batDauMoCua = batDauQuatCua + 300;
    const batDauDiTho = batDauMoCua + 350;
    const thoiGianDiTho = 1800;
    player.hoatCanh = null;
    player.lockedUntil = now + duration;
    player.pose = 'boss-rebel';
    player.poseUntil = player.lockedUntil;
    room.pendingMoves.delete(player.id);
    io.to(code).emit('boss-rebel', {id:player.id,startedAt:now,duration,from,cua,path,batDauDiCua,thoiGianDenCua,batDauQuatCua,batDauMoCua,batDauDiTho,thoiGianDiTho,x,z,yaw:0});
    io.to(code).emit('feed', {text:`🔥 ${player.name} bật SẾP rồi chạy`});
    setTimeout(() => {
      if (room.get(player.id) !== player || player.pose !== 'boss-rebel' || player.poseUntil !== now + duration) return;
      player.x = x;
      player.z = z;
      player.yaw = 0;
      player.pose = '';
      player.poseUntil = 0;
      player.lockedUntil = 0;
      io.to(code).emit('boss-rebel-end', {id:player.id,x,z,yaw:0});
    }, duration).unref();
  });

  socket.on('urgent-meeting', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room?.has(socket.id) || room.get(socket.id).maSoi) return;
    if(Date.now()<(room.get(socket.id).lockedUntil||0))return;
    if(Date.now()<(room.meetingUntil||0))return socket.emit('feed',{text:'Mọi người đang di chuyển vào phòng họp.'});
    const nguoiHop=[...room.values()].filter(player=>!player.maSoi);
    const gheHop=taoChoHopGap(nguoiHop.length);
    const players = nguoiHop.map((player, index) => {
      if(player.hoatCanh)io.to(code).emit('het-hoat-canh',player.id);
      player.hoatCanh=null;
      releaseWorkSeat(code, player);
      const {x,z,yaw,dangNgoi}=gheHop[index];
      const path=[];
      if(!(player.x>10.4&&player.x<18.6&&player.z>1.2&&player.z<8.6)){
        if(player.x>10.4&&player.z<-4.7){path.push({x:14.5,z:-5.6},{x:14.5,z:-3.7});}
        if(player.x<-16.1&&player.z<-6.1){path.push({x:-17.8,z:-6.8},{x:-17.8,z:-5.1});}
        const last=path.at(-1)||player;
        if(last.z<8.6)path.push({x:8.9,z:last.z},{x:8.9,z:9.8});
        path.push({x:14.5,z:9.8},{x:14.5,z:7.7});
      }
      path.push({x,z});
      let distance=0,previous=player;
      for(const point of path){distance+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
      const duration=Math.max(700,distance/7*1000);
      player.x=x;player.z=z;player.yaw=yaw;
      player.lockedUntil=Date.now()+duration;
      ghiThaoTac(code, player);
      player.bubble='';player.bubbleUntil=0;
      room.pendingMoves.delete(player.id);
      scheduleIdleLine(code,player);
      return {id:player.id,x,z,yaw,path,duration,dangNgoi};
    });
    const duration=Math.max(...players.map(p=>p.duration));
    room.meetingUntil=Date.now()+duration;
    io.to(code).emit('urgent-meeting', { players, duration });
    io.to(code).emit('feed', { text: '🚨 HỌP GẤP: cả phòng đã được gọi vào phòng họp' });
  });

  socket.on('chat', value => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    const text = cleanText(value, 160);
    if (!player || player.maSoi || !text || (player.hoatCanh && Date.now()<player.lockedUntil)) return;
    ghiThaoTac(code, player);
    player.bubble = text;
    player.bubbleUntil = Date.now() + 6500;
    player.lastActivity = Date.now();
    scheduleIdleLine(code, player);
    io.to(code).emit('chat', { id: socket.id, name: player.name, text, at: Date.now() });
  });

  socket.on('act', data => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (!player || player.maSoi || !actions.has(data?.action)) return;
    if (data.action === 'throw' && !items.has(data?.item)) return;
    const targetId = cleanText(data?.target, 40);
    const layBanTho = data.action === 'bow' && !targetId;
    const tuChich = data.action === 'shock' && !targetId;
    const target = tuChich ? player : layBanTho ? { ...banTho, yaw: Math.PI, name: banTho.ten } : rooms.get(code)?.get(targetId);
    if (!target || target.maSoi || (target.id === player.id && !tuChich)) return;
    const now = Date.now();
    if (now < (player.lockedUntil || 0) || now < (target.lockedUntil || 0) || now - (player.lastActAt || 0) < 500) return;
    player.lastActAt = now;
    const line = layBanTho ? loiBanThanTai[randomInt(loiBanThanTai.length)] : interactionLines[target.avatar] || 'Ủa, gì vậy?';
    const event = { from: player.id, fromName: player.name, to: target.id, targetName: target.name, altar: layBanTho, action: data.action, item: data.action === 'throw' ? data.item : '', line, at: now, approach: 0, duration: ['bow', 'shock'].includes(data.action) ? 3000 : data.action === 'throw' ? 2000 : 2500 };
    if (tuChich) player.lockedUntil = now + event.duration;
    if (!tuChich && ['punch', 'bonk', 'bow', 'shock'].includes(data.action)) {
      releaseWorkSeat(code, player);
      const huong = data.action === 'shock' ? Math.atan2(target.x - player.x, target.z - player.z) : target.yaw;
      const cach = data.action === 'shock' ? .98 : layBanTho ? 2 : 1.4;
      const x = Math.max(-maxX, Math.min(maxX, target.x - Math.sin(huong) * cach));
      const z = Math.max(-maxZ, Math.min(maxZ, target.z - Math.cos(huong) * cach));
      event.approach = Math.min(5000, Math.max(200, Math.hypot(x - player.x, z - player.z) / 7 * 1000));
      event.x = x; event.z = z;
      event.yaw = Math.atan2(-(target.x - x), -(target.z - z));
      player.x = x; player.z = z; player.yaw = event.yaw;
      player.lockedUntil = now + event.approach + event.duration;
      if (!layBanTho) target.lockedUntil = player.lockedUntil;
      rooms.get(code).pendingMoves.delete(player.id);
    }
    ghiThaoTac(code, player);
    if (!layBanTho && ['punch','bonk','bow','shock'].includes(data.action)) ghiThaoTac(code,target);
    io.to(code).emit('act', event);
    if (layBanTho) {
      scheduleIdleLine(code, player);
      return;
    }
    const delay = event.approach + (data.action === 'throw' ? 2000 : ['punch', 'bonk'].includes(data.action) ? 350 : 0);
    setTimeout(() => {
      if (rooms.get(code)?.get(player.id) !== player || rooms.get(code)?.get(target.id) !== target) return;
      if (['punch', 'bonk', 'shock'].includes(data.action)) releaseWorkSeat(code, target);
      target.bubble = line; target.bubbleUntil = Date.now() + 4500;
      io.to(code).emit('act-impact', event);
      scheduleIdleLine(code, player); scheduleIdleLine(code, target);
    }, delay);
  });

  socket.on('room-check', (reply) => {
    const room = rooms.get(socket.data.room);
    if (typeof reply === 'function') reply({ ok: Boolean(room?.has(socket.id)), players: room ? [...room.values()].map(publicPlayer) : [] });
  });

  socket.on('music', (data, reply = () => {}) => {
    const room = rooms.get(socket.data.room);
    const player = room?.get(socket.id);
    if (!player) return reply({ error: 'Bạn chưa vào phòng.' });
    if(player.maSoi)return reply({error:'Bạn đang tham gia ván Ma Sói.'});
    ghiThaoTac(socket.data.room, player);
    if(data?.action==='stop'){room.music={videoId:'',playing:false,position:0,changedAt:Date.now()};io.to(socket.data.room).emit('music-state',room.music);return reply({ok:true});}
    if (Date.now() - (player.lastMusicAt || 0) < 800) return reply({ error: 'Đợi một chút trước khi đổi nhạc.' });
    player.lastMusicAt = Date.now();
    const old = room.music;
    const position = old.position + (old.playing ? (Date.now() - old.changedAt) / 1000 : 0);
    let videoId = old.videoId;
    if (data?.url) {
      try {
        const url = new URL(String(data.url));
        const host = url.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') videoId = url.pathname.slice(1);
        else if (['youtube.com', 'm.youtube.com'].includes(host)) videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
        else throw new Error();
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error();
      } catch { return reply({ error: 'Link YouTube chưa hợp lệ.' }); }
    }
    if (!videoId) return reply({ error: 'Hãy nhập link bài hát trước.' });
    room.music = { videoId, playing: data?.action !== 'pause', position: data?.url ? 0 : position, changedAt: Date.now() };
    io.to(socket.data.room).emit('music-state', room.music);
    reply({ ok: true });
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;
    const name = room.get(socket.id)?.name || 'Người chơi';
    quanLyMaSoi.onDisconnect(socket,room);
    clearTimeout(room.get(socket.id)?.idleTimer);
    for (const timer of room.get(socket.id)?.workTimers || []) clearTimeout(timer);
    room.pendingMoves?.delete(socket.id);
    room.delete(socket.id);
    socket.to(code).emit('player-left', socket.id);
    io.to(code).emit('feed', { text: `${name} đã rời văn phòng`, kind: 'leave' });
    if (!room.size) rooms.delete(code);
  });
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, '0.0.0.0', () => console.log(`SỜ MỜ LỜ đang chạy tại cổng ${port}`));
