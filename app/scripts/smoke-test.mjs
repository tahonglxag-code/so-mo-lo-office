import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 40581;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const expectEvent = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), 4000);
  socket.once(event, value => { clearTimeout(timer); resolve(value); });
});
const emitAck = (socket, event, value) => new Promise((resolve, reject) => {
  socket.timeout(4000).emit(event, value, (error, response) => error ? reject(error) : resolve(response));
});

try {
  let response;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { response = await fetch(origin); if (response.ok) break; } catch {}
    await wait(150);
  }
  if (!response?.ok) throw new Error('HTTP server did not start');
  const page = await response.text();
  if (!page.includes('SỜ MỜ LỜ') || !page.includes('world') || !page.includes('avatar-quote') || !page.includes('data-avatar="sloth"') || !page.includes('data-avatar="leopard"') || !page.includes('BÁO THỦ')) throw new Error('Game page did not load expected app markup');
  const jsResponse = await fetch(`${origin}/game.js`);
  const threeResponse = await fetch(`${origin}/three.module.js`);
  const threeCoreResponse = await fetch(`${origin}/three.core.js`);
  if (!jsResponse.ok || !threeResponse.ok || !threeCoreResponse.ok) throw new Error('Game assets did not load');
  const first = io(origin, { transports: ['websocket'] });
  const second = io(origin, { transports: ['websocket'] });
  await Promise.all([expectEvent(first, 'connect'), expectEvent(second, 'connect')]);
  const joinedFirst = expectEvent(first, 'joined');
  const firstLine = expectEvent(first, 'default-line');
  const firstAck = await emitAck(first, 'join', { name: 'Rắn thử', avatar: 'snake', room: 'VPTEST26' });
  const firstInfo = await joinedFirst;
  if (!(await firstLine).text) throw new Error('Character default phrase did not sync on room entry');
  const joinedSecond = expectEvent(second, 'joined');
  const secondLine = expectEvent(first, 'default-line');
  const secondAck = await emitAck(second, 'join', { name: 'Báo thử', avatar: 'leopard', room: firstInfo.room });
  const secondInfo = await joinedSecond;
  if (!(await secondLine).text) throw new Error('New player default phrase did not sync to the room');
  if (!firstAck.ok || !secondAck.ok || firstInfo.room !== 'VPTEST26' || firstInfo.room !== secondInfo.room || secondInfo.players.length !== 2 || !secondInfo.players.some(player => player.avatar === 'leopard')) throw new Error('Custom room join or two-player snapshot failed');
  const moved = expectEvent(second, 'move');
  first.emit('move', { x: 2, z: -1, yaw: 0.8 });
  const movement = await moved;
  if (movement.id !== firstInfo.id || movement.x !== 2 || movement.z !== -1) throw new Error('Player movement did not sync');
  const chatted = expectEvent(second, 'chat');
  first.emit('chat', 'Xin chào phòng!');
  if ((await chatted).text !== 'Xin chào phòng!') throw new Error('Chat did not sync');
  const acted = expectEvent(second, 'act');
  first.emit('act', { action: 'throw', item: '🧋', target: secondInfo.id });
  const action = await acted;
  if (action.item !== '🧋' || action.to !== secondInfo.id || action.line !== 'em bị tổn thưn') throw new Error('Targeted action phrase did not sync');
  first.disconnect();
  second.disconnect();
  console.log(JSON.stringify({ page: 'ok', assets: 'ok', customRoom: firstInfo.room, players: 2, movement: 'synced', chat: 'synced', defaultPhrases: 'synced', interactionPhrase: action.line }, null, 2));
} finally {
  server.kill('SIGTERM');
}
