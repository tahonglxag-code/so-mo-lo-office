import express from 'express';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
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
  { id: 'desk-2', x: -15.45, z: .4 },
  { id: 'desk-3', x: -15.45, z: 2.6 },
  { id: 'desk-4', x: -15.45, z: 4.8 },
  { id: 'desk-5', x: -15.45, z: 7 },
  { id: 'desk-6', x: -15.45, z: 9.2 }
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
const avatars = new Set(['snake', 'fish', 'sloth', 'cow', 'leopard']);
const defaultLines = {
  snake: ['chị khổ lắm em', 'chị lạy em', 'chị hứa mai chị gửi', 'em ơi', 'ủa em', 'alo em'],
  fish: ['thần thiếp không làm được', 'thần thiếp có tội', 'thần thiếp đi làm ngay', 'mấy giờ rồi', 'lên link trà chiều đi chị em', 'không phải em đâu', 'tất cả tại thằng bò'],
  sloth: ['Hảaa?', 'Àaaa...', 'tôi cần đi toilet 30p', 'qua tết nghỉ làm', 'đang lướt tóp tóp vui lòng không làm phiền'],
  cow: ['a di đà lạt - Bần Đò có biết gì đâu', 'lào gì cũng tôn', 'là sao nữa', 'nếu người khác làm được - thì để họ làm', 'cái gì đổ tại người khác được thì không phải tại mình', 'a di đà lạt - không biết không có tội'],
  leopard: ['em xin lỗi', 'chị ơi...', 'anh ơi...', 'cú bé', 'ta thà báo cả thiên hạ chứ không báo sếp', 'em mới pass thử việc ạ', 'e thề e chưa làm gì cả', 'công ty là gia đình 🎼🎼']
};
const actions = new Set(['punch', 'bonk', 'smirk', 'bow', 'throw']);
const items = new Set(['❤️', '🧋', '💸', '📋', '⏰', '💩']);
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
    workSeatId: player.workSeatId,
    working: player.working,
    workStartedAt: player.workStartedAt,
    auraUntil: player.auraUntil,
    lockedUntil: player.lockedUntil || 0
  };
}

function randomLine(avatar) {
  const choices = defaultLines[avatar] || defaultLines.snake;
  return choices[randomInt(choices.length)];
}

function scheduleIdleLine(code, player) {
  clearTimeout(player.idleTimer);
  if (player.workSeatId) return;
  player.idleTimer = setTimeout(() => {
    const room = rooms.get(code);
    if (!room?.has(player.id)) return;
    if (player.workSeatId) return;
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
    releaseWorkSeat(code, player);
    player.x = 0;
    player.z = 0;
    player.lastActivity = Date.now();
    player.auraUntil = Date.now() + 300000;
    io.to(code).emit('work-complete', { id: player.id, x: player.x, z: player.z, duration: 1800, auraUntil: player.auraUntil });
    io.to(code).emit('work-milestone', { id: player.id, name: player.name, seconds: 999, final: true });
    io.to(code).emit('feed', { text: `${player.name} đã làm việc được 999s, hãy chiêm ngưỡng hào quang của ${player.name}` });
  }, 999000));
}

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
      socket.emit('joined', { room: code, id: socket.id, players: [...room.values()].map(publicPlayer), music: room.music });
      return reply({ ok: true, room: code });
    }
    if (room.size >= 50) return reply({ error: 'Phòng đã đủ 50 người.' });
    const player = {
      id: socket.id,
      name,
      avatar,
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
    socket.emit('joined', { room: code, id: socket.id, players: [...room.values()].map(publicPlayer), music: room.music });
    socket.to(code).emit('player-joined', publicPlayer(player));
    io.to(code).emit('feed', { text: `${name} vừa vào văn phòng`, kind: 'join' });
    io.to(code).emit('default-line', { id: player.id, text: player.bubble });
    scheduleIdleLine(code, player);
    reply({ ok: true, room: code });
  });

  socket.on('move', data => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (!player || !data) return;
    const now = Date.now();
    if (now < (player.lockedUntil || 0) || now - player.lastMoveAt < 80) return;
    player.lastMoveAt = now;
    const nextX = Math.max(-maxX, Math.min(maxX, Number(data.x) || 0));
    const nextZ = Math.max(-maxZ, Math.min(maxZ, Number(data.z) || 0));
    const nextYaw = Number(data.yaw) || 0;
    const changed = Math.hypot(nextX - player.x, nextZ - player.z) > .01 || Math.abs(nextYaw - player.yaw) > .01;
    if (Math.hypot(nextX - player.x, nextZ - player.z) > .12) {
      player.lastActivity = Date.now();
    }
    if (player.workSeatId) {
        const seat = workSeats.find(item => item.id === player.workSeatId);
        const distance = seat ? Math.hypot(nextX - seat.x, nextZ - seat.z) : Infinity;
        if (player.working && distance > .82) releaseWorkSeat(code, player);
        else if (!player.working && seat && distance < .55) {
          player.working = true;
          player.bubble = 'kiếp trâu ngựa';
          player.bubbleUntil = 0;
          startWorkTimer(code, player);
          io.to(code).emit('work-state', { id: player.id, working: true, seatId: player.workSeatId, startedAt: player.workStartedAt, text: player.bubble });
        }
    }
    player.x = nextX;
    player.z = nextZ;
    player.yaw = nextYaw;
    if (changed) rooms.get(code).pendingMoves.set(socket.id, { id: socket.id, x: player.x, z: player.z, yaw: player.yaw });
  });

  socket.on('self-action', action => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (player && Date.now() < (player.lockedUntil || 0)) return;
    if (!player || !['run', 'meditate', 'toilet', 'money'].includes(action)) return;
    if (action === 'money' || action === 'run' || action === 'toilet') releaseWorkSeat(code, player);
    const duration = action === 'run' ? 900 : action === 'toilet' ? 2600 : action === 'money' ? 5000 : 4000;
    let line = '';
    let path = [];
    if (action === 'run') {
      const distance = 5.6;
      player.x = Math.max(-maxX, Math.min(maxX, player.x - Math.sin(player.yaw) * distance));
      player.z = Math.max(-maxZ, Math.min(maxZ, player.z - Math.cos(player.yaw) * distance));
      path = [{ x: player.x, z: player.z }];
    } else if (action === 'toilet') {
      path = [{ x: -17.8, z: -5.2 }, { x: -17.8, z: -8.15 }];
      player.x = -17.8;
      player.z = -8.15;
      line = 'đang đi toilet...';
      player.bubble = line;
      player.bubbleUntil = Date.now() + 6500;
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
    if (!player || Date.now() < (player.lockedUntil || 0)) return;
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

  socket.on('urgent-meeting', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room?.has(socket.id)) return;
    if(Date.now()<(room.meetingUntil||0))return socket.emit('feed',{text:'Mọi người đang di chuyển vào phòng họp B.'});
    const players = [...room.values()].map((player, index) => {
      releaseWorkSeat(code, player);
      const x=11.2+(index%8)*.8,z=2+Math.floor(index/8)*.8;
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
      player.x=x;player.z=z;player.yaw=0;
      player.lockedUntil=Date.now()+duration;
      player.lastActivity=Date.now();player.bubble='';player.bubbleUntil=0;
      room.pendingMoves.delete(player.id);
      scheduleIdleLine(code,player);
      return {id:player.id,x,z,yaw:0,path,duration};
    });
    const duration=Math.max(...players.map(p=>p.duration));
    room.meetingUntil=Date.now()+duration;
    io.to(code).emit('urgent-meeting', { players, duration });
    io.to(code).emit('feed', { text: '🚨 HỌP GẤP: cả phòng đã được gọi vào phòng họp B' });
  });

  socket.on('chat', value => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    const text = cleanText(value, 160);
    if (!player || !text) return;
    player.bubble = text;
    player.bubbleUntil = Date.now() + 6500;
    player.lastActivity = Date.now();
    scheduleIdleLine(code, player);
    io.to(code).emit('chat', { id: socket.id, name: player.name, text, at: Date.now() });
  });

  socket.on('act', data => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (!player || !actions.has(data?.action)) return;
    if (data.action === 'throw' && !items.has(data?.item)) return;
    const target = rooms.get(code)?.get(cleanText(data?.target, 40));
    if (!target || target.id === player.id) return;
    const now = Date.now();
    if (now < (player.lockedUntil || 0) || now < (target.lockedUntil || 0) || now - (player.lastActAt || 0) < 500) return;
    player.lastActAt = now;
    const line = interactionLines[target.avatar] || 'Ủa, gì vậy?';
    const event = { from: player.id, fromName: player.name, to: target.id, targetName: target.name, action: data.action, item: data.action === 'throw' ? data.item : '', line, at: now, approach: 0, duration: data.action === 'bow' ? 3000 : data.action === 'throw' ? 2000 : 2500 };
    if (['punch', 'bonk', 'bow'].includes(data.action)) {
      releaseWorkSeat(code, player);
      const x = Math.max(-maxX, Math.min(maxX, target.x - Math.sin(target.yaw) * 1.4));
      const z = Math.max(-maxZ, Math.min(maxZ, target.z - Math.cos(target.yaw) * 1.4));
      event.approach = Math.min(5000, Math.max(200, Math.hypot(x - player.x, z - player.z) / 7 * 1000));
      event.x = x; event.z = z;
      event.yaw = Math.atan2(-(target.x - x), -(target.z - z));
      player.x = x; player.z = z; player.yaw = event.yaw;
      player.lockedUntil = now + event.approach + event.duration;
      target.lockedUntil = player.lockedUntil;
      rooms.get(code).pendingMoves.delete(player.id);
    }
    player.lastActivity = now;
    target.lastActivity = now;
    io.to(code).emit('act', event);
    const delay = event.approach + (data.action === 'throw' ? 2000 : ['punch', 'bonk'].includes(data.action) ? 350 : 0);
    setTimeout(() => {
      if (rooms.get(code)?.get(player.id) !== player || rooms.get(code)?.get(target.id) !== target) return;
      if (['punch', 'bonk'].includes(data.action)) releaseWorkSeat(code, target);
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
