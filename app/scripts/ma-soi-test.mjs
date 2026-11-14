import assert from 'node:assert/strict';
import { taoDanhSachVaiTro, taoQuanLyMaSoi } from '../ma-soi.js';
import { taoViTriGheMaSoi } from '../public/ma-soi-layout.js';

let clock=100000;
let nextTimer=1;
const timers=new Map();
const originalSetTimeout=globalThis.setTimeout;
const originalClearTimeout=globalThis.clearTimeout;
const originalNow=Date.now;
globalThis.setTimeout=(fn,ms=0)=>{const timer={id:nextTimer++,at:clock+Math.max(0,Number(ms)||0),fn,cancelled:false,unref(){}};timers.set(timer.id,timer);return timer;};
globalThis.clearTimeout=timer=>{if(timer)timer.cancelled=true;};
Date.now=()=>clock;

function advance(ms){
  const end=clock+ms;
  for(;;){
    const next=[...timers.values()].filter(t=>!t.cancelled&&t.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];
    if(!next)break;
    timers.delete(next.id);clock=next.at;next.fn();
  }
  clock=end;
}

const sockets=new Map();
const connectionHandlers=new Map();
const io={
  on:(name,fn)=>connectionHandlers.set(name,fn),
  to:destination=>({emit:(event,data)=>{
    const targets=destination==='WOLFTEST'? [...sockets.values()].filter(socket=>socket.data.room===destination):[sockets.get(destination)].filter(Boolean);
    for(const socket of targets)socket.inbox.push({event,data});
  }})
};
const room=new Map();room.pendingMoves=new Map();
const roomId='WOLFTEST';
const locked=new Set();
for(let i=0;i<8;i++){
  const id=`player-${i}`;
  room.set(id,{id,name:`Nguoi ${i}`,avatar:['snake','fish','sloth','cow','leopard'][i%5],x:i,z:i,yaw:0,sessionId:`session-${i}`});
  const handlers=new Map();
  const socket={id,data:{room:roomId},inbox:[],on:(name,fn)=>handlers.set(name,fn),fire:(name,data)=>handlers.get(name)?.(data)};
  sockets.set(id,socket);
}
const manager=taoQuanLyMaSoi(io,new Map([[roomId,room]]),{
  lockPlayer:(id,on,pos)=>{if(on)locked.add(id);else locked.delete(id);const player=room.get(id);if(player&&pos)Object.assign(player,pos);},
  clearArea:()=>{}
});
for(const socket of sockets.values())connectionHandlers.get('connection')(socket);

try{
  for(let size=5;size<=15;size++){
    const roles=taoDanhSachVaiTro(size);assert.equal(roles.length,size);
    assert.equal(roles.filter(role=>role==='wolf').length,size<=7?1:size<=11?2:3);
    assert.equal(roles.includes('cupid'),size>=9);
  }
  const host=sockets.get('player-0');
  const invited=['player-1','player-2','player-3','player-4'];
  host.fire('wolf-create',invited);
  assert.equal(sockets.get('player-1').inbox.some(e=>e.event==='wolf-invite'),true);
  assert.equal(sockets.get('player-5').inbox.some(e=>e.event==='wolf-invite'),false);
  for(const id of invited)sockets.get(id).fire('wolf-answer','yes');
  advance(15000);
  [host,...invited.map(id=>sockets.get(id))].forEach((socket,index)=>socket.fire('wolf-pick-card',index));
  advance(3200);
  const roleCards=[host,...invited.map(id=>sockets.get(id))].map(socket=>socket.inbox.find(e=>e.event==='wolf-private'&&e.data.loai==='card')?.data);
  assert.equal(roleCards.filter(Boolean).length,5);
  const roles=roleCards.map(card=>card.vai);
  assert.equal(roles.filter(role=>role==='wolf').length,1);
  assert.equal(roles.filter(role=>role==='seer').length,1);
  assert.equal(roles.filter(role=>role==='guard').length,1);
  assert.equal(roles.filter(role=>role==='villager').length,2);
  assert.equal(sockets.get('player-5').inbox.some(e=>e.event==='wolf-private'),false);
  assert.equal(locked.size,5);
  for(let index=0;index<5;index++){
    const viTri=taoViTriGheMaSoi(index,5),player=room.get(`player-${index}`);
    assert.ok(Math.abs(player.x-viTri.x)<1e-9);
    assert.ok(Math.abs(player.z-viTri.z)<1e-9);
    assert.ok(Math.abs(player.yaw-viTri.yaw)<1e-9);
  }
  for(const socket of [host,...invited.map(id=>sockets.get(id))]){
    const publicState=socket.inbox.filter(e=>e.event==='wolf-public').at(-1)?.data;
    assert.equal(JSON.stringify(publicState).includes('"vai":"wolf"'),false);
  }
  advance(10000);
  const guardId=roleCards.findIndex(card=>card.vai==='guard');
  const guardSocket=[host,...invited.map(id=>sockets.get(id))][guardId];
  assert.equal(guardSocket.inbox.some(e=>e.event==='wolf-private'&&e.data.loai==='role'&&e.data.vai==='guard'),true);
  assert.equal(sockets.get('player-5').inbox.some(e=>e.event==='wolf-private'&&e.data.vai==='guard'),false);
  const guardTarget=guardSocket.inbox.filter(e=>e.event==='wolf-private'&&e.data.loai==='role'&&e.data.vai==='guard').at(-1).data.danhSach[0].id;
  guardSocket.fire('wolf-night-action',{target:guardTarget});
  assert.equal(guardSocket.inbox.some(e=>e.event==='wolf-event'&&e.data.text==='Bảo vệ đã chọn xong.'),true);
  const roundSockets=[host,...invited.map(id=>sockets.get(id))];
  const wolfId=roundSockets[roles.indexOf('wolf')].id;
  const seerSocket=roundSockets[roles.indexOf('seer')];
  const wolfSocket=roundSockets[roles.indexOf('wolf')];
  const victimId=roundSockets.filter((socket,index)=>roles[index]==='villager'&&socket.id!==guardTarget)[0].id;
  wolfSocket.fire('wolf-night-action',{target:victimId});
  seerSocket.fire('wolf-night-action',{target:wolfId});
  assert.equal(seerSocket.inbox.filter(e=>e.event==='wolf-private-result').at(-1).data.ketQua,'SÓI');
  assert.equal(host.inbox.filter(e=>e.event==='wolf-deaths').flatMap(e=>e.data.nguoi).some(player=>player.id===victimId),true);
  assert.equal(host.inbox.filter(e=>e.event==='wolf-state').some(e=>e.data.giaiDoan==='discussion'),true);
  for(const timer of timers.values())timer.cancelled=true;timers.clear();
  const sockets8=new Map(),connections8=new Map(),room8=new Map();room8.pendingMoves=new Map();
  const io8={on:(name,fn)=>connections8.set(name,fn),to:destination=>({emit:(event,data)=>{
    const targets=destination==='WOLF8'?[...sockets8.values()].filter(socket=>socket.data.room===destination):[sockets8.get(destination)].filter(Boolean);
    for(const socket of targets)socket.inbox.push({event,data});
  }})};
  for(let i=0;i<10;i++){
    const id=`eight-${i}`;room8.set(id,{id,name:`Eight ${i}`,avatar:'fish',x:i,z:0,yaw:0,sessionId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`});
    const handlers=new Map(),socket={id,data:{room:'WOLF8'},inbox:[],on:(name,fn)=>handlers.set(name,fn),fire:(name,data)=>handlers.get(name)?.(data)};sockets8.set(id,socket);
  }
  const locked8=new Set();
  const manager8=taoQuanLyMaSoi(io8,new Map([['WOLF8',room8]]),{lockPlayer:(id,on,pos)=>{const player=room8.get(id);if(on){locked8.add(id);if(player)player.maSoi=true;}else{locked8.delete(id);if(player)player.maSoi=false;}if(player&&pos)Object.assign(player,pos);},clearArea:()=>{}});
  for(const socket of sockets8.values())connections8.get('connection')(socket);
  sockets8.get('eight-0').fire('wolf-create',[...sockets8.keys()].slice(1,8));
  for(const socket of [...sockets8.values()].slice(1,8))socket.fire('wolf-answer','yes');
  advance(15000);
  [...sockets8.values()].slice(0,8).forEach((socket,index)=>socket.fire('wolf-pick-card',index));
  advance(3680);
  const eightCards=[...sockets8.values()].map(socket=>({socket,card:socket.inbox.find(e=>e.event==='wolf-private'&&e.data.loai==='card')?.data}));
  assert.equal(eightCards.filter(entry=>entry.card).length,8);
  assert.equal(eightCards.filter(entry=>entry.card?.vai==='wolf').length,2);
  assert.equal(room8.get('eight-8').maSoi||false,false);
  assert.equal(room8.get('eight-9').maSoi||false,false);
  assert.equal(locked8.has('eight-8'),false);
  assert.equal(locked8.has('eight-9'),false);
  advance(10000);
  const guard8=eightCards.find(entry=>entry.card?.vai==='guard').socket;
  guard8.fire('wolf-night-action',{target:guard8.inbox.find(e=>e.event==='wolf-private'&&e.data.loai==='role'&&e.data.vai==='guard').data.danhSach[0].id});
  const wolves8=eightCards.filter(entry=>entry.card?.vai==='wolf').map(entry=>entry.socket);
  advance(30000);
  const nonWolves=eightCards.filter(entry=>entry.card?.vai!=='wolf').map(entry=>entry.socket.id);
  wolves8[0].fire('wolf-wolf-target',nonWolves[0]);
  wolves8[1].fire('wolf-wolf-target',nonWolves[1]);
  wolves8[0].fire('wolf-wolf-confirm');
  assert.equal(wolves8[0].inbox.some(e=>e.event==='wolf-event'&&e.data.text==='Tiên tri đã thức dậy.'),false);
  advance(5000);
  assert.equal(wolves8[0].inbox.some(e=>e.event==='wolf-event'&&e.data.text==='Tiên tri đã thức dậy.'),true);
  assert.equal([...sockets8.values()].some(socket=>socket.inbox.some(e=>e.event==='wolf-deaths')),false);
  const seer8=eightCards.find(entry=>entry.card?.vai==='seer').socket;
  seer8.fire('wolf-night-action',{target:wolves8[0].id});
  assert.equal(seer8.inbox.filter(e=>e.event==='wolf-private-result').at(-1).data.ketQua,'SÓI');
  const witch8=eightCards.find(entry=>entry.card?.vai==='witch').socket;
  const poisonTarget=[...room8.werewolf.nguoi.values()].find(player=>player.vai==='villager'&&player.id!==room8.werewolf.luaChon.get('guard'));
  witch8.fire('wolf-night-action',{target:poisonTarget.id,loai:'poison'});
  assert.equal(room8.werewolf.nguoi.get(poisonTarget.id).nguyenNhan,'poison');
  assert.equal(room8.werewolf.giaiDoan,'discussion');
  const discussionId=[...room8.werewolf.nguoi.values()].find(player=>player.song).id;
  const discussionPlayer=sockets8.get(discussionId);
  discussionPlayer.fire('wolf-discussion','Mọi người nghe rõ không?');
  for(const socket of sockets8.values())assert.equal(socket.inbox.some(e=>e.event==='wolf-discussion-message'&&e.data.id===discussionPlayer.id&&e.data.text==='Mọi người nghe rõ không?'),true);
  assert.equal(manager8.filterTargets(room8,[...room8.values()]).some(player=>player.id==='eight-8'),true);
  assert.equal(manager8.filterTargets(room8,[...room8.values()]).some(player=>player.id==='eight-0'),false);
  const villager=eightCards.find(entry=>entry.card?.vai==='villager'),oldPlayer=room8.get(villager.socket.id);
  manager8.onDisconnect(villager.socket,room8);
  room8.delete(villager.socket.id);
  assert.equal(room8.werewolf.nguoi.get(villager.socket.id).song,false);
  const reconnectId='eight-reconnect',rejoined={id:reconnectId,name:oldPlayer.name,avatar:oldPlayer.avatar,x:0,z:0,yaw:0,sessionId:oldPlayer.sessionId};
  room8.set(reconnectId,rejoined);
  const reconnectHandlers=new Map(),reconnectSocket={id:reconnectId,data:{room:'WOLF8'},inbox:[],on:(name,fn)=>reconnectHandlers.set(name,fn),fire:(name,data)=>reconnectHandlers.get(name)?.(data)};
  sockets8.set(reconnectId,reconnectSocket);connections8.get('connection')(reconnectSocket);manager8.onJoin(reconnectSocket,room8);
  assert.equal(rejoined.maSoi,true);
  assert.equal(reconnectSocket.inbox.filter(e=>e.event==='wolf-state').at(-1).data.rieng,null);
  room8.werewolf.giaiDoan='finished';
  for(const player of room8.werewolf.nguoi.values())if(!player.dangKetNoi)room8.werewolf.raVan.add(player.id);
  const finishedGame=room8.werewolf;
  assert.equal(finishedGame.raVan.has(villager.socket.id),true);
  const exiting=eightCards.find(entry=>entry.card?.vai==='seer').socket;
  exiting.fire('wolf-leave');
  assert.equal(locked8.has(exiting.id),false);
  assert.equal(room8.get(exiting.id).maSoi,false);
  assert.equal(exiting.inbox.at(-1).event,'wolf-exited');
  assert.equal(room8.werewolf.raVan.has(exiting.id),true);
  assert.equal(sockets8.get('eight-8').inbox.some(e=>e.event==='wolf-public'&&e.data.giaiDoan==='finished'),true);
  for(const socket of sockets8.values())assert.equal(socket.inbox.some(e=>e.event==='wolf-player-exited'&&e.data.id===exiting.id),true);
  const disconnectAfterEnd=eightCards.find(entry=>entry.card?.vai==='wolf').socket;
  manager8.onDisconnect(disconnectAfterEnd,room8);
  room8.delete(disconnectAfterEnd.id);
  assert.equal(finishedGame.raVan.has(disconnectAfterEnd.id),true);
  assert.equal(sockets8.get('eight-8').inbox.some(e=>e.event==='wolf-player-exited'&&e.data.id===disconnectAfterEnd.id),true);
  for(const entry of eightCards)if(room8.has(entry.socket.id)&&!finishedGame.raVan.has(entry.socket.id))entry.socket.fire('wolf-leave');
  assert.equal(room8.werewolf,null);
  assert.equal([...locked8].some(id=>room8.has(id)),false);
  assert.equal([...sockets8.values()].every(socket=>socket.inbox.some(e=>e.event==='wolf-dissolved')),true);
  console.log(JSON.stringify({result:'PASS',invites:'selected players only',roleDistribution:'5–15-player tables valid',privateRoles:'not broadcast',gameLocks:locked.size,singleWolf:'target killed after night resolves',earlyNightAction:'advanced immediately',multiWolfDisagreement:'no bite after 30s chat and 5s choice; seer and witch actions continue',publicDiscussion:'reaches all room members',outsiders:'remain unlocked and available as interaction targets during the game',historyExit:'leaves the ended game and unlocks the player without clearing room history',earlyDissolution:'all participants leaving ends history immediately, clears room effect and unlocks spectators',disconnect:'dead seat retained; same-session reconnect is locked out as spectator'},null,2));
}finally{
  globalThis.setTimeout=originalSetTimeout;
  globalThis.clearTimeout=originalClearTimeout;
  Date.now=originalNow;
}
