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
const avatars = new Set(['snake', 'fish', 'sloth', 'cow', 'leopard']);
const defaultLines = {
  snake: ['chị khổ lắm em', 'chị lạy em', 'chị hứa mai chị gửi', 'em ơi', 'ủa em', 'alo em'],
  fish: ['thần thiếp không làm được', 'thần thiếp có tội', 'thần thiếp đi làm ngay', 'mấy giờ rồi', 'lên link trà chiều đi chị em', 'không phải em đâu', 'tất cả tại thằng bò'],
  sloth: ['Hảaa?', 'Àaaa...', 'tôi cần đi toilet 30p', 'qua tết nghỉ làm', 'đang lướt tóp tóp vui lòng không làm phiền'],
  cow: ['a di đà lạt - Bần Đò có biết gì đâu', 'lào gì cũng tôn', 'là sao nữa', 'nếu người khác làm được - thì để họ làm', 'cái gì đổ tại người khác được thì không phải tại mình', 'a di đà lạt - không biết không có tội'],
  leopard: ['em xin lỗi', 'chị ơi...', 'anh ơi...', 'cú bé', 'ta thà báo cả thiên hạ chứ không báo sếp', 'em mới pass thử việc ạ', 'e thề e chưa làm gì cả', 'công ty là gia đình 🎼🎼']
};
const actions = new Set(['punch', 'bonk', 'smirk', 'bow', 'run', 'meditate', 'sleep', 'throw']);
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
    const nextX = Math.max(-12, Math.min(12, Number(data.x) || 0));
    const nextZ = Math.max(-9, Math.min(9, Number(data.z) || 0));
    if (Math.hypot(nextX - player.x, nextZ - player.z) > .12) {
      player.lastActivity = Date.now();
      scheduleIdleLine(code, player);
    }
    player.x = nextX;
    player.z = nextZ;
    player.yaw = Number(data.yaw) || 0;
    socket.to(code).volatile.emit('move', { id: socket.id, x: player.x, z: player.z, yaw: player.yaw });
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
    room.delete(socket.id);
    socket.to(code).emit('player-left', socket.id);
    io.to(code).emit('feed', { text: `${name} đã rời văn phòng`, kind: 'leave' });
    if (!room.size) rooms.delete(code);
  });
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, '0.0.0.0', () => console.log(`SỜ MỜ LỜ đang chạy tại cổng ${port}`));
