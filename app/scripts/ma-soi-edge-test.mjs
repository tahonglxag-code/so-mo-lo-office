import assert from 'node:assert/strict';
import { taoQuanLyMaSoi } from '../ma-soi.js';
import { dinhDangLichSuMaSoi } from '../public/ma-soi-lich-su.js';

let clock=500000;
let nextTimer=1;
const timers=new Map();
const oldSetTimeout=globalThis.setTimeout;
const oldClearTimeout=globalThis.clearTimeout;
const oldNow=Date.now;
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

function createGame(size,roomId){
  const sockets=new Map(),connections=new Map(),room=new Map();room.pendingMoves=new Map();
  const io={on:(name,fn)=>connections.set(name,fn),to:destination=>({emit:(event,data)=>{
    const recipients=destination===roomId?[...sockets.values()].filter(socket=>socket.data.room===destination):[sockets.get(destination)].filter(Boolean);
    for(const socket of recipients)socket.inbox.push({event,data});
  }})};
  for(let index=0;index<size;index++){
    const id=`${roomId}-${index}`;
    room.set(id,{id,name:`Nguoi ${index}`,avatar:'fish',x:index,z:0,yaw:0,sessionId:`${roomId}-session-${index}`});
    const handlers=new Map(),socket={id,data:{room:roomId},inbox:[],on:(name,fn)=>handlers.set(name,fn),fire:(name,data)=>handlers.get(name)?.(data)};
    sockets.set(id,socket);
  }
  const manager=taoQuanLyMaSoi(io,new Map([[roomId,room]]),{lockPlayer:()=>{},clearArea:()=>{}});
  for(const socket of sockets.values())connections.get('connection')(socket);
  const players=[...sockets.values()];
  players[0].fire('wolf-create',players.slice(1).map(socket=>socket.id));
  for(const player of players.slice(1))player.fire('wolf-answer','yes');
  advance(15000);
  advance(3200+Math.max(0,size-5)*160);
  const cards=players.map(socket=>({socket,role:socket.inbox.find(event=>event.event==='wolf-private'&&event.data.loai==='card')?.data.vai}));
  assert.equal(cards.filter(card=>card.role).length,size);
  return {room,sockets,players,cards,game:room.werewolf,manager};
}

function triggerDiscussionVote(testGame){
  const living=[...testGame.game.nguoi.values()].filter(player=>player.song);
  for(const player of living)testGame.sockets.get(player.id).fire('wolf-stop-discussion');
  assert.equal(testGame.game.giaiDoan,'vote');
}

function voteFor(testGame,targetId){
  const living=[...testGame.game.nguoi.values()].filter(player=>player.song);
  for(const player of living)testGame.sockets.get(player.id).fire('wolf-vote',targetId);
  advance(15000);
}

function skipToDiscussion(testGame,firstNight){
  if(firstNight){advance(10000);assert.equal(testGame.game.vaiDangGoi,'cupid');advance(10000);assert.equal(testGame.game.vaiDangGoi,'guard');}
  advance(10000);
  const wolves=testGame.cards.filter(card=>card.role==='wolf').map(card=>card.socket);
  const target=[...testGame.game.nguoi.values()].find(player=>player.song&&player.vai==='villager');
  assert.ok(target);
  const livingWolves=wolves.filter(wolf=>testGame.game.nguoi.get(wolf.id).song);
  if(livingWolves.length>1){
    assert.equal(testGame.game.giaiDoan,'wolf-chat');
    advance(30000);
    assert.equal(testGame.game.giaiDoan,'wolf-choice');
    for(const wolf of livingWolves)wolf.fire('wolf-wolf-target',target.id);
    livingWolves[0].fire('wolf-wolf-confirm');
    assert.notEqual(testGame.game.giaiDoan,'wolf-choice');
  }else{
    assert.equal(testGame.game.giaiDoan,'night-role');
    livingWolves[0].fire('wolf-night-action',{target:target.id});
  }
  advance(10000);
  if(testGame.game.vaiDangGoi==='witch')advance(10000);
  assert.equal(testGame.game.giaiDoan,'discussion');
  assert.equal(testGame.game.nguoi.get(target.id).song,false);
}

try{
  const one=createGame(5,'ONEWOLF');
  advance(10000);
  assert.equal(one.game.vaiDangGoi,'guard');
  advance(10000);
  assert.equal(one.game.vaiDangGoi,'wolf');
  advance(10000);
  assert.equal(one.game.giaiDoan,'night-role');
  assert.equal(one.game.vaiDangGoi,'seer');
  advance(10000);
  assert.equal(one.game.giaiDoan,'discussion');
  assert.ok(one.game.boQuaChiTiet.some(item=>item.vai==='wolf'&&item.lyDo==='het-thoi-gian'));
  assert.ok(!one.game.luaChon.has('wolf')||one.game.luaChon.get('wolf')==='');
  triggerDiscussionVote(one);
  const wolf=one.game.nguoi.values().find(player=>player.vai==='wolf');
  voteFor(one,wolf.id);
  const oneFinished=one.players[0].inbox.filter(event=>event.event==='wolf-finished').at(-1)?.data;
  assert.equal(oneFinished?.ketQua,'villagers');
  assert.ok(oneFinished.lichSu.some(item=>item.loai==='dem'&&item.soi===''));
  assert.ok(dinhDangLichSuMaSoi(oneFinished.lichSu).includes('V. KẾT QUẢ CUỐI CÙNG'));

  const three=createGame(12,'THREEWOLVES');
  assert.equal(three.cards.filter(card=>card.role==='wolf').length,3);
  let firstNight=true;
  while(three.game.giaiDoan!=='finished'){
    skipToDiscussion(three,firstNight);
    firstNight=false;
    triggerDiscussionVote(three);
    const wolf=three.game.nguoi.values().find(player=>player.song&&player.vai==='wolf');
    voteFor(three,wolf.id);
  }
  const threeFinished=three.players[0].inbox.filter(event=>event.event==='wolf-finished').at(-1)?.data;
  assert.equal(threeFinished?.ketQua,'villagers');
  assert.equal(threeFinished.lichSu.filter(item=>item.loai==='ket-qua-dem').length,3);
  assert.equal(threeFinished.lichSu.filter(item=>item.loai==='vote').length,3);
  const formatted=dinhDangLichSuMaSoi(threeFinished.lichSu);
  assert.ok(formatted.includes('ĐÊM 1'));
  assert.ok(formatted.includes('ĐÊM 2'));
  assert.ok(formatted.includes('ĐÊM 3'));
  assert.ok(formatted.includes('KẾT QUẢ CUỐI CÙNG'));
  console.log(JSON.stringify({result:'PASS',singleWolfNoTarget:'10-second timeout skips attack; seer wakes; discussion and vote can finish with history',threeWolves:'unanimous choice works for 3 wolves; three nights and votes finish; full history emitted and formatted'},null,2));
}finally{
  globalThis.setTimeout=oldSetTimeout;
  globalThis.clearTimeout=oldClearTimeout;
  Date.now=oldNow;
}
