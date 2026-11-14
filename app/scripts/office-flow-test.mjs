import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { taoChoHopGap } from '../hop-gap-layout.js';
import { doanDiDuoc, taoLoTrinh } from '../public/office-navigation.js';

const port = 40583;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const doiSuKien = (socket, event, timeout = 9000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
  socket.once(event, value => { clearTimeout(timer); resolve(value); });
});
const guiXacNhan = (socket, event, value) => new Promise((resolve, reject) => {
  socket.timeout(5000).emit(event, value, (error, response) => error ? reject(error) : resolve(response));
});
const sockets = [];
const positions = new Map();

try {
  let response;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { response = await fetch(origin); if (response.ok) break; } catch {}
    await wait(120);
  }
  assert.ok(response?.ok, 'HTTP server did not start');
  const page = await response.text();
  assert.ok(page.includes('id="boss-rebel-button"'));
  const viTri50 = taoChoHopGap(50);
  assert.equal(viTri50.length, 50);
  assert.equal(new Set(viTri50.map(cho => `${cho.x.toFixed(3)},${cho.z.toFixed(3)}`)).size, 50);
  assert.equal(viTri50.filter(cho => cho.dangNgoi).length, 6);
  assert.ok(viTri50.slice(6).every(cho => !cho.dangNgoi));

  let roomCode = '';
  for (let index = 0; index < 8; index++) {
    const socket = io(origin, { transports: ['websocket'] });
    sockets.push(socket);
    await doiSuKien(socket, 'connect');
    const joined = doiSuKien(socket, 'joined');
    const ack = await guiXacNhan(socket, 'join', { name: `Hop ${index + 1}`, avatar: ['snake', 'fish', 'sloth', 'cow', 'leopard'][index % 5], room: roomCode || 'HOPTEST26' });
    const info = await joined;
    assert.ok(ack.ok);
    roomCode = info.room;
    positions.set(socket.id, info.players.find(player => player.id === socket.id));
  }

  let viTri = positions.get(sockets[0].id);
  for (const point of taoLoTrinh(viTri,{x:14.5,z:5})) {
    sockets[0].emit('move',{x:point.x,z:point.z,yaw:0});
    viTri=point;
    await wait(100);
  }
  await wait(100);
  const workResult = doiSuKien(sockets[0], 'work-result');
  const workMove = doiSuKien(sockets[1], 'work-move');
  sockets[0].emit('work');
  const work = await workResult;
  const workEvent = await workMove;
  assert.ok(work.ok && work.path.length);
  assert.deepEqual(workEvent.path, work.path);
  let workPrevious = {x:14.5,z:5};
  for (const point of work.path) {
    assert.ok(doanDiDuoc(workPrevious, point));
    workPrevious = point;
  }
  assert.ok(Math.hypot(workPrevious.x-work.seat.x, workPrevious.z-work.seat.z)<.7);

  const altarAction = doiSuKien(sockets[1], 'act');
  sockets[0].emit('act',{action:'bow'});
  const altar = await altarAction;
  assert.ok(altar.altar && altar.approach>0 && altar.path.length);
  let altarPrevious = work.seat;
  for (const point of altar.path) {
    assert.ok(doanDiDuoc(altarPrevious,point));
    altarPrevious=point;
  }
  assert.ok(Math.hypot(altarPrevious.x-8.6,altarPrevious.z+9.65)<.7);
  await wait(altar.approach+altar.duration+150);

  const hopGap = doiSuKien(sockets[0], 'urgent-meeting');
  sockets[0].emit('urgent-meeting');
  const hop = await hopGap;
  assert.equal(hop.players.length, 8);
  assert.equal(hop.players.filter(player => player.dangNgoi).length, 6);
  assert.ok(hop.players.slice(0, 6).every(player => player.dangNgoi));
  assert.ok(hop.players.slice(6).every(player => !player.dangNgoi));
  assert.equal(new Set(hop.players.map(player => `${player.x.toFixed(3)},${player.z.toFixed(3)}`)).size, 8);
  assert.ok(hop.players.every(player => player.path.length && player.yaw !== undefined));
  await wait(hop.duration + 150);

  const hopRieng = doiSuKien(sockets[0], 'hoat-canh');
  sockets[0].emit('hoat-canh', { loai: 'boss', target: sockets[1].id });
  const canh = await hopRieng;
  const loTrinh = canh.nguoi.find(player => player.id === sockets[1].id);
  assert.ok(loTrinh);
  assert.ok(loTrinh.path.length >= 1);
  assert.ok(loTrinh.duration >= 700);
  assert.ok(loTrinh.batDau >= Date.now() - 100);
  let bossPrevious = hop.players.find(player=>player.id===sockets[1].id);
  for (const point of [...loTrinh.path,{x:14.5,z:-7.15}]) {
    assert.ok(doanDiDuoc(bossPrevious,point));
    bossPrevious=point;
  }
  await wait(Math.max(0, loTrinh.batDau - Date.now()) + 100);

  const batSep = doiSuKien(sockets[0], 'boss-rebel');
  const feedBatSep = doiSuKien(sockets[0], 'feed');
  sockets[1].emit('boss-rebel');
  const rebel = await batSep;
  const thongBao = await feedBatSep;
  assert.equal(rebel.id, sockets[1].id);
  assert.equal(rebel.duration, 6000);
  assert.ok(rebel.from.x >= 10.4 && rebel.from.x <= 18.6);
  assert.ok(rebel.from.z >= -10.7 && rebel.from.z <= -4.7);
  assert.deepEqual(rebel.cua, { x: 14.5, z: -5.25 });
  assert.ok(rebel.batDauDiCua < rebel.batDauQuatCua);
  assert.ok(rebel.batDauQuatCua < rebel.batDauMoCua);
  assert.ok(rebel.batDauMoCua < rebel.batDauDiTho);
  assert.ok(rebel.batDauDiTho + rebel.thoiGianDiTho < rebel.duration);
  assert.ok(rebel.path.length >= 3);
  let rebelPrevious = {x:14.5,z:-3.55};
  for (const point of rebel.path) {
    assert.ok(doanDiDuoc(rebelPrevious,point));
    rebelPrevious=point;
  }
  assert.ok(Math.abs(rebel.x - 8.6) < .01 && Math.abs(rebel.z + 10.15) < .01);
  assert.equal(thongBao.text, '🔥 Hop 2 bật SẾP');
  const end = await doiSuKien(sockets[0], 'boss-rebel-end', 7500);
  assert.equal(end.id, sockets[1].id);

  const normalAction = doiSuKien(sockets[0], 'self-action');
  sockets[1].emit('self-action', 'meditate');
  assert.equal((await normalAction).action, 'meditate');
  console.log(JSON.stringify({ layout: '50 unique positions, six chairs plus alternating standing spaces', work: 'player leaves the conference room and reaches the desk through the door route', altarBow: 'player moves from the desk to the altar before bowing', urgentMeeting: 'eight players seated and standing around the conference table', privateMeeting: 'target walks through the boss-room doorway', bossRebel: 'authorized player completes six-second event and returns to normal actions' }, null, 2));
} finally {
  for (const socket of sockets) socket.disconnect();
  server.kill('SIGTERM');
}
