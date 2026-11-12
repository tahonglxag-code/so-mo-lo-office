import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port=40593,origin=`http://127.0.0.1:${port}`,server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const event=(socket,name,timeout=35000,predicate=()=>true)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(name,listener);reject(new Error(`Timeout ${name}`));},timeout);
  const listener=value=>{if(!predicate(value))return;clearTimeout(timer);socket.off(name,listener);resolve(value);};socket.on(name,listener);
});
const ack=(socket,name,...args)=>new Promise((resolve,reject)=>{
  const callback=(error,result)=>error?reject(error):resolve(result);
  socket.timeout(10000).emit(name,...args,callback);
});
const avatar=i=>['snake','fish','sloth','cow','leopard'][i%5];
let running=false;

async function join(socket,room,index){
  await event(socket,'connect',10000);
  const joined=event(socket,'joined');
  const result=await ack(socket,'join',{room,name:`Người ${index}`,avatar:avatar(index)});
  if(!result?.ok)throw new Error(`Join error: ${JSON.stringify(result)}`);
  return joined;
}

async function runLevel(size){
  const room=`W${size}X${Date.now().toString(36).slice(-5)}`.toUpperCase(),clients=[],disconnects=[];
  let maxAckMs=0,publicLeaks=0,blockedMoves=0,freeMoves=0,officeChat=0,blockedTarget=0,movedAwayFromTable=0;
  try{
    const joins=[];
    for(let i=0;i<size;i++){
      const socket=io(origin,{transports:['websocket'],reconnection:false});clients.push(socket);
      socket.on('disconnect',reason=>{if(running&&reason!=='io client disconnect')disconnects.push(reason);});
      socket.on('wolf-public',state=>{if(JSON.stringify(state).includes('"vai":"wolf"'))publicLeaks++;});
      joins.push(join(socket,room,i));
    }
    const snapshots=await Promise.all(joins);
    const host=clients[0],participants=clients.slice(0,15),outside=clients.slice(15);
    let roomPlayerCount=0;
    for(const player of clients){const started=Date.now();const info=await ack(player,'room-check');maxAckMs=Math.max(maxAckMs,Date.now()-started);if(!info.ok||info.players.length<size)throw new Error('Room check mismatch.');roomPlayerCount=Math.max(roomPlayerCount,info.players.length);}
    const started=event(outside[0],'wolf-start',30000);
    for(const target of clients.slice(1,15))target.on('wolf-invite',()=>target.emit('wolf-answer','yes'));
    for(const socket of participants)socket.on('wolf-private',()=>{});
    const cardResults=Promise.all(participants.map(socket=>event(socket,'wolf-private',30000,data=>data.loai==='card')));
    host.emit('wolf-create',clients.slice(1,15).map(socket=>socket.id));
    await started;
    const cards=await cardResults;
    if(cards.length!==15)throw new Error('Could not receive all 15 private role cards.');
    const wolfCount=cards.filter(card=>card.vai==='wolf').length;
    if(wolfCount!==3)throw new Error(`15-player deck expected 3 wolves; got ${wolfCount}.`);
    const observer=outside[0],observedMoves=[];
    const postStart=await ack(observer,'room-check');
    movedAwayFromTable=postStart.players.filter(player=>!player.maSoi&&Math.hypot(player.x+1.8,player.z+7.2)<5.2).length===0?1:0;
    observer.on('moves',updates=>observedMoves.push(...updates));
    participants[0].emit('move',{x:4.2,z:1.1,yaw:.5});
    await wait(260);
    blockedMoves=observedMoves.filter(move=>move.id===participants[0].id).length;
    const newX=8.3,newZ=4.4,moveEvent=event(host,'moves',3000,updates=>updates.some(item=>item.id===observer.id));
    observer.emit('move',{x:newX,z:newZ,yaw:1});await moveEvent;freeMoves++;
    const chatEvent=event(host,'chat',3000,data=>data.id===observer.id);
    observer.emit('chat',`Người ngoài vẫn chat ở mức ${size}`);await chatEvent;officeChat++;
    const acts=[];for(const socket of clients)socket.on('act',value=>acts.push(value));
    observer.emit('act',{action:'throw',item:'❤️',target:participants[0].id});await wait(400);
    blockedTarget=acts.some(value=>value.to===participants[0].id)?0:1;
    if(blockedMoves!==0||!freeMoves||!officeChat||!blockedTarget||!movedAwayFromTable||publicLeaks||disconnects.length)throw new Error(JSON.stringify({blockedMoves,freeMoves,officeChat,blockedTarget,movedAwayFromTable,publicLeaks,disconnects}));
    return {level:size,connections:roomPlayerCount,werewolfPlayers:15,outsidePlayers:size-15,roleCards:cards.length,wolves:wolfCount,blockedMoves,freeMoves,officeChat,blockedTarget,movedAwayFromTable,publicRoleLeaks:publicLeaks,unexpectedDisconnects:disconnects.length,maxRoomCheckAckMs:maxAckMs,renderCpuRam:'not measured locally'};
  }finally{clients.forEach(socket=>socket.disconnect());await wait(250);}
}

try{
  for(let attempt=0;attempt<40;attempt++){try{if((await fetch(origin+'/healthz')).ok)break;}catch{}await wait(150);}
  running=true;
  const results=[];
  for(const size of [20,30,50])results.push(await runLevel(size));
  console.log(JSON.stringify({result:'PASS_PROTOCOL',server:origin,levels:results},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{running=false;server.kill('SIGTERM');}
