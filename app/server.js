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
  { id: 'desk-1', x: -15.45, z: -4.82 }, { id: 'desk-2', x: -15.45, z: -4.18 },
  { id: 'desk-3', x: -15.45, z: -2.62 }, { id: 'desk-4', x: -15.45, z: -1.98 },
  { id: 'desk-5', x: -15.45, z: -.42 }, { id: 'desk-6', x: -15.45, z: .22 },
  { id: 'desk-7', x: -15.45, z: 1.78 }, { id: 'desk-8', x: -15.45, z: 2.42 },
  { id: 'desk-9', x: -15.45, z: 4.3 }, { id: 'desk-10', x: -15.45, z: 6.5 }
];
const workMilestones = [9, 69, 99, 199, 299, 399, 499, 599, 699, 799, 899];
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
app.get('/three.module.js', (_req, res) => res.sendFile(path.join(root, 'node_modules/three/build/three.module.js')));
app.get('/three.core.js', (_req, res) => res.sendFile(path.join(root, 'node_modules/three/build/three.core.js')));
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
    if (!rooms.has(code)) rooms.set(code, new Map());
    const room = rooms.get(code);
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
      workTimers: [],
      auraUntil: 0,
      lastActivity: Date.now()
    };
    Object.defineProperty(player, 'idleTimer', { value: null, writable: true });
    player.bubble = randomLine(avatar);
    player.bubbleUntil = Date.now() + 6500;
    socket.data.room = code;
    socket.data.name = name;
    socket.join(code);
    room.set(socket.id, player);
    socket.emit('joined', { room: code, id: socket.id, players: [...room.values()] });
    socket.to(code).emit('player-joined', player);
    io.to(code).emit('feed', { text: `${name} vừa vào văn phòng`, kind: 'join' });
    io.to(code).emit('default-line', { id: player.id, text: player.bubble });
    scheduleIdleLine(code, player);
    reply({ ok: true, room: code });
  });

  socket.on('move', data => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
    if (!player || !data) return;
    const nextX = Math.max(-maxX, Math.min(maxX, Number(data.x) || 0));
    const nextZ = Math.max(-maxZ, Math.min(maxZ, Number(data.z) || 0));
    if (Math.hypot(nextX - player.x, nextZ - player.z) > .12) {
      player.lastActivity = Date.now();
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
      } else scheduleIdleLine(code, player);
    }
    player.x = nextX;
    player.z = nextZ;
    player.yaw = Number(data.yaw) || 0;
    socket.to(code).volatile.emit('move', { id: socket.id, x: player.x, z: player.z, yaw: player.yaw });
  });

  socket.on('self-action', action => {
    const code = socket.data.room;
    const player = rooms.get(code)?.get(socket.id);
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
    if (!player) return;
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
    const players = [...room.values()].map((player, index) => {
      releaseWorkSeat(code, player);
      const column = index % 8;
      const row = Math.floor(index / 8);
      player.x = 11.2 + column * .8;
      player.z = 2 + row * .8;
      player.lastActivity = Date.now();
      player.bubble = '';
      player.bubbleUntil = 0;
      scheduleIdleLine(code, player);
      return { id: player.id, x: player.x, z: player.z, yaw: player.yaw };
    });
    io.to(code).emit('urgent-meeting', { players, duration: 1800 });
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
    const line = interactionLines[target.avatar] || 'Ủa, gì vậy?';
    const event = {
      from: player.id,
      fromName: player.name,
      to: target.id,
      targetName: target.name,
      action: data.action,
      item: data.action === 'throw' ? data.item : '',
      line,
      at: Date.now()
    };
    target.bubble = line;
    target.bubbleUntil = Date.now() + 4500;
    player.lastActivity = Date.now();
    target.lastActivity = Date.now();
    scheduleIdleLine(code, player);
    scheduleIdleLine(code, target);
    target.pose = data.action;
    target.poseUntil = Date.now() + 1400;
    io.to(code).emit('act', event);
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;
    const name = room.get(socket.id)?.name || 'Người chơi';
    clearTimeout(room.get(socket.id)?.idleTimer);
    for (const timer of room.get(socket.id)?.workTimers || []) clearTimeout(timer);
    room.delete(socket.id);
    socket.to(code).emit('player-left', socket.id);
    io.to(code).emit('feed', { text: `${name} đã rời văn phòng`, kind: 'leave' });
    if (!room.size) rooms.delete(code);
  });
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, '0.0.0.0', () => console.log(`SỜ MỜ LỜ đang chạy tại cổng ${port}`));
