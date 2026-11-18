import assert from 'node:assert/strict';
import {taoQuanLyMaSoi,taoDanhSachVaiTro} from '../ma-soi.js';

let clock=100000,nextTimer=1;
const timers=new Map(),originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout,originalNow=Date.now;
globalThis.setTimeout=(fn,ms=0)=>{const timer={id:nextTimer++,at:clock+Math.max(0,Number(ms)||0),fn,cancelled:false,unref(){}};timers.set(timer.id,timer);return timer;};
globalThis.clearTimeout=timer=>{if(timer)timer.cancelled=true;};
Date.now=()=>clock;

function advance(ms){
  const end=clock+ms;
  for(;;){
    const next=[...timers.values()].filter(timer=>!timer.cancelled&&timer.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];
    if(!next)break;
    timers.delete(next.id);clock=next.at;next.fn();
  }
  clock=end;
}

const sockets=new Map(),handlers=new Map(),room=new Map(),roomId='BOTTEST';
const io={on:(name,fn)=>handlers.set(name,fn),to:destination=>({emit:(event,data)=>{
  const targets=destination===roomId?[...sockets.values()]:[sockets.get(destination)].filter(Boolean);
  for(const socket of targets)socket.inbox.push({event,data});
}})};
for(let index=0;index<2;index++){
  const id=`human-${index}`,player={id,name:`Người ${index+1}`,avatar:'snake',x:index,z:0,yaw:0,sessionId:`session-${index}`};
  room.set(id,player);
  const events=new Map(),socket={id,data:{room:roomId},inbox:[],on:(name,fn)=>events.set(name,fn),fire:(name,data)=>events.get(name)?.(data)};
  sockets.set(id,socket);
}
const manager=taoQuanLyMaSoi(io,new Map([[roomId,room]]),{lockPlayer:()=>{},clearArea:()=>{}});
for(const socket of sockets.values())handlers.get('connection')(socket);

try{
  assert.equal(taoDanhSachVaiTro(4).length,4);
  const host=sockets.get('human-0');
  host.fire('wolf-create',{ids:[],bots:3});
  assert.equal(room.werewolf.giaiDoan,'dealing');
  assert.equal(room.werewolf.nguoi.size,4);
  assert.equal(room.werewolf.chonLa.size,3);
  const firstRoundId=host.inbox.find(event=>event.event==='wolf-start').data.idVong;
  assert.ok(firstRoundId);
  assert.deepEqual([...room.werewolf.may.values()].map(player=>player.name),['Máy 1','Máy 2','Máy 3']);
  assert.equal(host.inbox.some(event=>event.event==='wolf-invite'),false);
  const occupied=[...room.werewolf.chonLa.keys()];
  const free=taoDanhSachVaiTro(4).findIndex((_,index)=>!occupied.includes(index));
  host.fire('wolf-pick-card',free);
  const game=room.werewolf;
  assert.equal(game.giaiDoan,'cards');
  assert.equal([...game.nguoi.values()].filter(player=>player.bot).length,3);
  assert.equal([...game.nguoi.values()].filter(player=>player.vai==='wolf').length,1);
  assert.equal([...game.nguoi.values()].filter(player=>player.vai==='seer').length,1);
  assert.equal([...game.nguoi.values()].filter(player=>player.vai==='guard').length,1);
  assert.equal([...game.nguoi.values()].filter(player=>player.vai==='villager').length,1);
  for(const player of game.nguoi.values())if(player.bot)player.vai=player.id==='bot:1'?'wolf':player.id==='bot:2'?'guard':'seer';
  game.nguoi.get(host.id).vai='villager';
  advance(30000);
  assert.equal(game.giaiDoan,'discussion');
  for(const player of game.nguoi.values())player.song=true;
  game.giaiDoan='discussion';game.ngung.clear();game.mocKetThuc=clock+180000;
  host.fire('wolf-discussion','Chào mọi người');
  const message=host.inbox.filter(event=>event.event==='wolf-discussion-message').at(-1);
  assert.equal(message.data.name,'Người 1');
  assert.equal(host.inbox.some(event=>event.event==='wolf-discussion-message'&&event.data.bot),false);
  assert.equal(game.ngung.size,0);
  host.fire('wolf-stop-discussion');
  assert.equal(game.giaiDoan,'vote');
  assert.equal(game.ngung.size,1);
  advance(6000);
  assert.equal([...game.boPhieu].filter(id=>id.startsWith('bot:')).length,[...game.nguoi.values()].filter(player=>player.bot&&player.song).length);
  for(let round=0;round<8&&game.giaiDoan!=='finished';round++)advance(300000);
  assert.equal(game.giaiDoan,'finished');
  assert.ok(game.lichSu.some(event=>event.loai==='ket-qua'));
  assert.ok(host.inbox.some(event=>event.event==='wolf-finished'));
  host.fire('wolf-leave');
  assert.equal(room.werewolf,null);
  host.fire('wolf-create',{ids:[],bots:3});
  const secondGame=room.werewolf,secondRoundId=host.inbox.filter(event=>event.event==='wolf-start').at(-1).data.idVong;
  assert.equal(secondGame.maTran,1);
  assert.notEqual(secondRoundId,firstRoundId);
  console.log(JSON.stringify({result:'PASS',soloWithThreeBots:'starts immediately at four players',botCards:'three random unique cards and one human card',botNames:['Máy 1','Máy 2','Máy 3'],nightActions:'automatically resolved',discussion:'bots stay silent; one of one living real players can end discussion',voting:'all living bots cast a vote',gameEnd:'automated round proceeds to winner and history',consecutiveGames:'new round identifier remains unique when maTran resets to 1'},null,2));
}finally{
  for(const timer of timers.values())timer.cancelled=true;
  timers.clear();globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout;Date.now=originalNow;
}
