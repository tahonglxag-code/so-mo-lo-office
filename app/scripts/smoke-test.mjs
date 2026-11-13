import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 40581;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const expectEvent = (socket, event, timeout = 4000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
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
  if (!page.includes('ĐI LÀM CÔNG TY') || !page.includes('wolf-create-modal') || !page.includes('wolf-history-panel') || !page.includes('world') || !page.includes('avatar-quote') || !page.includes('data-avatar="sloth"') || !page.includes('data-avatar="leopard"') || !page.includes('BÁO THỦ') || !page.includes('window.__smlJoinReady=false') || !page.includes('event.stopImmediatePropagation()') || !page.includes('id="game-module"')) throw new Error('Game page did not load expected app markup or join fallback');
  const jsResponse = await fetch(`${origin}/game.js`);
  const cameraResponse = await fetch(`${origin}/goc-may.js`);
  const threeResponse = await fetch(`${origin}/three.module.js`);
  const threeCoreResponse = await fetch(`${origin}/three.core.js`);
  if (!jsResponse.ok || !cameraResponse.ok || !threeResponse.ok || !threeCoreResponse.ok) throw new Error('Game assets did not load');
  const gameSource = await jsResponse.text();
  if (!gameSource.includes('window.__smlJoinReady=true')) throw new Error('Game join controls did not finish initialization');
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
  const moved = expectEvent(second, 'moves');
  first.emit('move', { x: 2, z: -1, yaw: 0.8 });
  const movement = (await moved).find(item => item.id === firstInfo.id);
  if (!movement || movement.x !== 2 || movement.z !== -1) throw new Error('Player movement did not sync');
  const ran = expectEvent(second, 'self-action');
  first.emit('self-action', 'run');
  const runAction = await ran;
  if (runAction.id !== firstInfo.id || runAction.action !== 'run' || runAction.duration !== 900 || runAction.path[0].x === movement.x && runAction.path[0].z === movement.z) throw new Error('Self-run action did not sync');
  const meditated = expectEvent(second, 'self-action');
  first.emit('self-action', 'meditate');
  const meditation = await meditated;
  if (meditation.id !== firstInfo.id || meditation.action !== 'meditate' || meditation.line !== 'lương bất biến giữa dòng deadline vạn biến') throw new Error('Meditation action or phrase did not sync');
  const workMove = expectEvent(second, 'work-move');
  const workResult = expectEvent(first, 'work-result');
  first.emit('work');
  const assignedSeat = await workResult;
  const workAssignment = await workMove;
  if (!assignedSeat.ok || assignedSeat.seat.id !== workAssignment.seat.id) throw new Error('Work desk assignment did not sync');
  const startedWorking = expectEvent(second, 'work-state');
  await wait(100);
  first.emit('move', { x: assignedSeat.seat.x, z: assignedSeat.seat.z, yaw: 0 });
  const workingState = await startedWorking;
  if (!workingState.working || workingState.text !== 'kiếp trâu ngựa' || !workingState.startedAt) throw new Error('Working status, start time or persistent phrase did not sync');
  const milestone = expectEvent(second, 'work-milestone', 11000);
  await wait(9200);
  if ((await milestone).seconds !== 9) throw new Error('First work-time milestone did not sync');
  const stoppedWorking = expectEvent(second, 'work-state');
  first.emit('move', { x: assignedSeat.seat.x + 1, z: assignedSeat.seat.z, yaw: 0 });
  if ((await stoppedWorking).working) throw new Error('Moving away did not release the work desk');
  const meeting = expectEvent(second, 'urgent-meeting');
  first.emit('urgent-meeting');
  const meetingEvent = await meeting;
  if (meetingEvent.players.length !== 2 || meetingEvent.players.some(player => player.x < 10 || player.z < 1)) throw new Error('Urgent meeting did not move all players into room B');
  await wait(meetingEvent.duration + 120);
  const money = expectEvent(second, 'self-action');
  first.emit('self-action', 'money');
  const moneyEvent = await money;
  if (moneyEvent.action !== 'money' || moneyEvent.duration !== 5000 || moneyEvent.line !== 'LÚA VỀ') throw new Error('Money action did not sync');
  const toileted = expectEvent(second, 'self-action');
  first.emit('self-action', 'toilet');
  const toiletAction = await toileted;
  if (toiletAction.action !== 'toilet' || toiletAction.x !== -18.4 || toiletAction.z !== -11.3 || toiletAction.path.length !== 3) throw new Error('Toilet action did not move the character into the WC');
  await wait(toiletAction.duration + 120);
  const chatted = expectEvent(second, 'chat');
  first.emit('chat', 'Xin chào phòng!');
  if ((await chatted).text !== 'Xin chào phòng!') throw new Error('Chat did not sync');
  const acted = expectEvent(second, 'act');
  first.emit('act', { action: 'throw', item: '🧋', target: secondInfo.id });
  const action = await acted;
  if (action.item !== '🧋' || action.to !== secondInfo.id || action.line !== 'em bị tổn thưn') throw new Error('Targeted action phrase did not sync');
  first.disconnect();
  second.disconnect();
  console.log(JSON.stringify({ page: 'ok', assets: 'ok', customRoom: firstInfo.room, players: 2, movement: 'synced', selfRun: 'synced', meditation: meditation.line, workDesk: 'assigned, timer started, first milestone synced and released', urgentMeeting: 'synced for both players', money: 'synced for five seconds', toilet: 'moved into WC', chat: 'synced', defaultPhrases: 'synced', interactionPhrase: action.line }, null, 2));
} finally {
  server.kill('SIGTERM');
}
