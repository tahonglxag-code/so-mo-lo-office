import { randomInt } from 'node:crypto';
import { taoViTriGheMaSoi } from './public/ma-soi-layout.js';

const vaiTro = {
  wolf: { ten: 'Ma Sói', phe: 'Sói', moTa: 'Mỗi đêm, chọn một người không phải Sói để cắn.' },
  seer: { ten: 'Tiên tri', phe: 'Dân', moTa: 'Mỗi đêm, soi một người còn sống để biết họ có phải Sói không.' },
  guard: { ten: 'Bảo vệ', phe: 'Dân', moTa: 'Mỗi đêm, bảo vệ một người còn sống. Không bảo vệ cùng người hai đêm liên tiếp.' },
  witch: { ten: 'Phù thủy', phe: 'Dân', moTa: 'Có một bình cứu và một bình độc cho cả ván. Mỗi đêm chỉ dùng tối đa một bình.' },
  hunter: { ten: 'Thợ săn', phe: 'Dân', moTa: 'Nếu bị Sói cắn và thực sự chết, được bắn một người.' },
  cupid: { ten: 'Cupid', phe: 'Dân', moTa: 'Trong đêm đầu, ghép hai người. Một người chết thì người kia chết theo.' },
  villager: { ten: 'Dân làng', phe: 'Dân', moTa: 'Ban ngày thảo luận và bỏ phiếu tìm Sói.' }
};

const bangVai = {
  5: [1,1,1,0,0,0,2], 6: [1,1,1,0,0,0,3], 7: [1,1,1,1,0,0,3],
  8: [2,1,1,1,1,0,2], 9: [2,1,1,1,1,1,2], 10: [2,1,1,1,1,1,3],
  11: [2,1,1,1,1,1,4], 12: [3,1,1,1,1,1,4], 13: [3,1,1,1,1,1,5],
  14: [3,1,1,1,1,1,6], 15: [3,1,1,1,1,1,7]
};

const thuTuVai = ['wolf','seer','guard','witch','hunter','cupid','villager'];
const now = () => Date.now();
const layNguoi = (game, id) => game.nguoi.get(id);

function guiRieng(io, id, event, data) { io.to(id).emit(event, data); }
function congKhai(io, roomId, event, data) { io.to(roomId).emit(event, data); }
function conSong(game) { return [...game.nguoi.values()].filter(p => p.song && p.dangKetNoi); }
function songTheoVai(game, role) { return conSong(game).filter(p => p.vai === role); }
function congKhaiNguoi(game) { return [...game.nguoi.values()].map(p => ({ id:p.id, ten:p.ten, avatar:p.avatar, ghe:p.ghe, song:p.song, dangKetNoi:p.dangKetNoi, x:p.x, z:p.z, yaw:p.yaw })); }
function congKhaiTrangThai(game, id) {
  const own=layNguoi(game,id);
  return {
    roomId:game.roomId, maTran:game.maTran, giaiTanLuc:game.giaiTanLuc||0,
    giaiDoan:game.giaiDoan, ngay:game.ngay, mocKetThuc:game.mocKetThuc||0,
    lichSu:game.giaiDoan==='finished'?game.lichSu:undefined,
    vaiDangGoi:game.vaiDangGoi||'', danhSach:congKhaiNguoi(game),
    soLa:game.giaiDoan==='dealing'?game.nguoi.size:0,
    laDaChon:game.giaiDoan==='dealing'?[...game.chonLa].map(([la,playerId])=>({la,id:playerId,ten:layNguoi(game,playerId)?.ten||'Người chơi'})):[],
    daDungNgung:[...game.ngung], tongNguoiSong:conSong(game).length,
    daBoPhieu:[...game.boPhieu.keys()], phieu:Object.fromEntries(game.phieu),
    moi:game.moi?{chu:game.moi.chu, ketThuc:game.moi.ketThuc, danhSach:[...game.moi.phanHoi].map(([playerId,phanHoi])=>({id:playerId,phanHoi}))}:null,
    ketQua:game.ketQua||null,
    rieng:own&&game.giaiDoan!=='dealing'?{vai:own.vai, vaiMoTa:vaiTro[own.vai], tinhYeu:false, daHieu:game.daHieu.has(id), vayMoi:own.vai==='witch'?{cuu:game.thuocCuu,doc:game.thuocDoc}:null}:null
  };
}

function phatTrangThai(io, game) {
  for(const id of game.nguoi.keys())guiRieng(io,id,'wolf-state',congKhaiTrangThai(game,id));
  congKhai(io,game.roomId,'wolf-public',congKhaiTrangThai(game,''));
}

function phatSuKien(io, game, text, extra={}) {
  congKhai(io,game.roomId,'wolf-event',{text,at:now(),...extra});
}

function themLichSu(game, event) { game.lichSu.push({at:now(),...event}); }

function ghiBoQua(game,vai,lyDo) {
  game.boQua.push(vai);
  game.boQuaChiTiet.push({vai,lyDo});
}

function huyHen(game) {
  for(const timer of game.timers)clearTimeout(timer);
  game.timers=[];
}

function hen(game, fn, ms) {
  const timer=setTimeout(()=>{game.timers=game.timers.filter(t=>t!==timer);fn();},Math.max(0,ms));
  timer.unref?.(); game.timers.push(timer); return timer;
}

function chiaVai(game) {
  const roles=taoDanhSachVaiTro(game.nguoi.size);
  for(let i=roles.length-1;i>0;i--){const j=randomInt(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
  game.vaiTheoLa=roles;
}

export function taoDanhSachVaiTro(soNguoi){
  const counts=bangVai[soNguoi];if(!counts)return [];
  return counts.flatMap((count,index)=>Array.from({length:count},()=>thuTuVai[index]));
}

function ketThucGame(io, game, winner) {
  if(game.giaiDoan==='finished')return;
  game.giaiDoan='finished'; game.vaiDangGoi=''; game.ketQua=winner;
  game.mocKetThuc=now()+180000; game.giaiTanLuc=game.mocKetThuc;
  for(const p of game.nguoi.values())p.hangGhe=true;
  themLichSu(game,{loai:'phan-vai',nguoi:[...game.nguoi.values()].map(p=>({ten:p.ten,vai:vaiTro[p.vai].ten,phe:vaiTro[p.vai].phe})),capDoi:[...game.capDoi].filter(([id])=>id<game.capDoi.get(id)).map(([id,partner])=>[layNguoi(game,id)?.ten,layNguoi(game,partner)?.ten])});
  const winningPlayers=conSong(game).filter(p=>winner==='wolves'?p.vai==='wolf':winner==='villagers'?p.vai!=='wolf':false),winners=winningPlayers.map(p=>p.ten);
  themLichSu(game,{loai:'ket-qua',pheThang:winner,soNgay:game.ngay,nguoiThang:winners,nguoiThua:conSong(game).filter(p=>!winningPlayers.some(w=>w.id===p.id)).map(p=>p.ten),nguoiSong:conSong(game).map(p=>p.ten),nguoiChet:[...game.nguoi.values()].filter(p=>!p.song).map(p=>p.ten)});
  phatSuKien(io,game,winner==='draw'?'⚖️ Ván Ma Sói kết thúc hòa!':winner==='wolves'?'🐺 Phe Ma Sói chiến thắng!':'🏆 Phe Dân làng chiến thắng!',{ketQua:winner});
  congKhai(io,game.roomId,'wolf-finished',{ketQua:winner,danhSach:congKhaiNguoi(game),vaiTro:[...game.nguoi.values()].map(p=>({id:p.id,vai:p.vai,song:p.song})),lichSu:game.lichSu,giaiTanLuc:game.giaiTanLuc});
  phatTrangThai(io,game);
  hen(game,()=>giaiTan(io,game),180000);
}

function kiemTraThang(io,game) {
  const alive=conSong(game),wolves=alive.filter(p=>p.vai==='wolf').length,others=alive.length-wolves;
  if(!alive.length){ketThucGame(io,game,'draw');return true;}
  if(wolves===0){ketThucGame(io,game,'villagers');return true;}
  if(wolves>=others){ketThucGame(io,game,'wolves');return true;}
  return false;
}

function danhDauChet(io,game,ids,reason) {
  const pending=ids.map(id=>({id,reason})), dead=[];
  while(pending.length){
    const item=pending.shift(),p=layNguoi(game,item.id);
    if(!p||!p.song)continue;
    p.song=false;p.nguyenNhan=item.reason;dead.push(p);
    const partner=game.capDoi.get(p.id);
    if(partner){const q=layNguoi(game,partner);if(q?.song)pending.push({id:q.id,reason:'cupid'});}
  }
  if(dead.length){
    congKhai(io,game.roomId,'wolf-deaths',{nguoi:dead.map(p=>({id:p.id,ten:p.ten,avatar:p.avatar,ghe:p.ghe,ketNoi:p.dangKetNoi,x:p.x,z:p.z,yaw:p.yaw})),at:now()});
    themLichSu(game,{loai:'chet',nguoi:dead.map(p=>({ten:p.ten,nguyenNhan:p.nguyenNhan}))});
  }
  return dead;
}

function ketThucDem(io,game) {
  const ten=id=>layNguoi(game,id)?.ten||'';
  const dich = game.luaChon.get('wolf') || '';
  const witchChoice=game.luaChon.get('witch');
  let biCan=dich;
  if(biCan&&game.luaChon.get('guard')===biCan)biCan='';
  let saveWorked=false;
  if(witchChoice?.loai==='save'&&witchChoice.target===biCan){biCan='';game.thuocCuu=false;saveWorked=true;}
  else if(witchChoice?.loai==='save')game.thuocCuu=false;
  const kills=[];
  if(biCan)kills.push({id:biCan,reason:'wolf'});
  if(witchChoice?.loai==='poison'&&witchChoice.target) {kills.push({id:witchChoice.target,reason:'poison'});game.thuocDoc=false;}
  const hunter=layNguoi(game,game.luaChon.get('hunter'));
  if(hunter&&hunter.song&&kills.some(k=>k.id===hunter.id&&k.reason==='wolf')&&game.luaChon.get('hunterShot'))kills.push({id:game.luaChon.get('hunterShot'),reason:'hunter'});
  game.lichSu.push({at:now(),loai:'dem',ngay:game.ngay,cupid:(game.luaChon.get('cupid')||[]).map(ten),baoVe:ten(game.luaChon.get('guard')),soi:ten(dich),soiDongThuan:Boolean(dich),luaChonSoi:game.luuLuaChonSoi.map(([wolf,target])=>({soi:ten(wolf),mucTieu:ten(target)})),tienTri:ten(game.luaChon.get('seer')),ketQuaSoi:game.ketQuaSoi||null,phuThuy:witchChoice?{loai:witchChoice.loai,nguoi:ten(witchChoice.target),hieuQua:witchChoice.loai==='save'?saveWorked:witchChoice.loai==='poison'&&Boolean(witchChoice.target)}:null,thuocCuu:saveWorked,thoSan:ten(game.luaChon.get('hunter')),thoSanBan:ten(game.luaChon.get('hunterShot')),boQua:[...game.boQua],boQuaChiTiet:[...game.boQuaChiTiet]});
  const order=[]; for(const k of kills)if(!order.includes(k.id))order.push(k.id);
  const deaths=[];
  for(const id of order){const reason=kills.find(k=>k.id===id)?.reason;deaths.push(...danhDauChet(io,game,[id],reason));}
  themLichSu(game,{loai:'ket-qua-dem',chet:deaths.map(p=>p.ten)});
  const names=deaths.map(p=>p.ten);
  phatSuKien(io,game,names.length===0?'☀️ Đêm qua an toàn. Không có ai bị loại.':names.length===1?`☀️ Đêm qua ${names[0]} đã bị loại.`:`☀️ Đêm qua có ${names.length} người bị loại: ${names.join(', ')}.`,{nguoiChet:deaths.map(p=>p.id)});
  if(kiemTraThang(io,game))return;
  game.giaiDoan='discussion';game.vaiDangGoi='';game.mocKetThuc=now()+180000;game.ngung.clear();game.phieu.clear();game.boPhieu.clear();
  phatSuKien(io,game,'💬 Thảo luận – 180 giây',{giaiDoan:'discussion',mocKetThuc:game.mocKetThuc});
  phatTrangThai(io,game);
  hen(game,()=>batDauVote(io,game),180000);
}

function goiLuot(io,game,index=0) {
  if(game.luotHen){clearTimeout(game.luotHen);game.timers=game.timers.filter(t=>t!==game.luotHen);game.luotHen=null;}
  const sequence=game.ngay===1?['cupid','guard','wolf','hunter','seer','witch']:['guard','wolf','hunter','seer','witch'];
  if(index>=sequence.length)return ketThucDem(io,game);
  const role=sequence[index];
  const active=songTheoVai(game,role);
  game.viTriLuot=index;game.vaiDangGoi=role;
  if(!active.length){ghiBoQua(game,role,'khong-co-nguoi-con-song');return goiLuot(io,game,index+1);}
  if(role==='hunter'){
    const likely=active.filter(p=>game.luaChon.get('wolf')===p.id);
    if(!likely.length){ghiBoQua(game,'hunter','khong-bi-soi-can');phatSuKien(io,game,'Thợ săn chưa thể sử dụng chức năng.');return goiLuot(io,game,index+1);}
    game.luaChon.set('hunter',likely[0].id);
  }
  const wolves=role==='wolf'?active:[];
  if(role==='wolf'&&wolves.length>1){
    game.giaiDoan='wolf-chat';game.mocKetThuc=now()+30000;
    for(const p of wolves)guiRieng(io,p.id,'wolf-private',{loai:'wolf-chat',mocKetThuc:game.mocKetThuc,dongDoi:wolves.filter(q=>q.id!==p.id).map(q=>q.ten),danhSach:conSong(game).filter(q=>q.vai!=='wolf').map(q=>({id:q.id,ten:q.ten}))});
    phatSuKien(io,game,'Sói đã thức dậy.');phatTrangThai(io,game);
    game.luotHen=hen(game,()=>{
      game.giaiDoan='wolf-choice';game.mocKetThuc=now()+5000;game.dichSoi.clear();
      for(const p of songTheoVai(game,'wolf'))guiRieng(io,p.id,'wolf-private',{loai:'wolf-choice',mocKetThuc:game.mocKetThuc,dongDoi:songTheoVai(game,'wolf').filter(q=>q.id!==p.id).map(q=>q.ten),danhSach:conSong(game).filter(q=>q.vai!=='wolf').map(q=>({id:q.id,ten:q.ten})),luaChon:[...game.dichSoi],wolfCount:songTheoVai(game,'wolf').length});
      phatTrangThai(io,game);
      game.luotHen=hen(game,()=>{const chosen=[...game.dichSoi.values()];game.luuLuaChonSoi=[...game.dichSoi];const allAgree=chosen.length===songTheoVai(game,'wolf').length&&chosen.every(id=>id===chosen[0]);if(!allAgree)ghiBoQua(game,'wolf','soi-khong-thong-nhat');game.luaChon.set('wolf',allAgree?chosen[0]:'');game.dichSoi.clear();goiLuot(io,game,index+1);},5000);
    },30000);
    return;
  }
  game.giaiDoan='night-role';
  const end=now()+10000;game.mocKetThuc=end;phatSuKien(io,game,`${vaiTro[role].ten} đã thức dậy.`,{giaiDoan:'night-role',mocKetThuc:end});
  for(const p of active){
    guiRieng(io,p.id,'wolf-private',{loai:'role',vai:role,moTa:vaiTro[role],mocKetThuc:end,dongDoi:role==='wolf'?active.filter(q=>q.id!==p.id).map(q=>q.ten):[],danhSach:conSong(game).filter(q=>q.id!==p.id&&!(role==='wolf'&&q.vai==='wolf')).map(q=>({id:q.id,ten:q.ten})),thuoc:role==='witch'?{cuu:game.thuocCuu,doc:game.thuocDoc}:null,biSoi:role==='seer'?game.ketQuaSoi:null});
  }
  phatTrangThai(io,game);
  game.luotHen=hen(game,()=>{if(!game.daXacNhan.has(role))ghiBoQua(game,role,'het-thoi-gian');game.daXacNhan.delete(role);goiLuot(io,game,index+1);},10000);
}

function batDauDem(io,game) {
  if(kiemTraThang(io,game))return;
  game.giaiDoan='night';game.ngay+=1;game.luaChon.clear();game.dichSoi.clear();game.luuLuaChonSoi=[];game.daXacNhan.clear();game.boQua=[];game.boQuaChiTiet=[];game.ketQuaSoi=null;
  if(game.ngay===1)game.capDoi.clear();
  game.giaiDoan='night-role';game.mocKetThuc=now();
  phatSuKien(io,game,'🌙 Đêm đã xuống. Tất cả nhắm mắt.',{giaiDoan:'night'});
  goiLuot(io,game,0);
}

function batDauVote(io,game) {
  if(game.giaiDoan!=='discussion')return;
  game.giaiDoan='vote';game.mocKetThuc=now()+15000;game.phieu.clear();game.boPhieu.clear();
  phatSuKien(io,game,'🗳️ Bỏ phiếu loại – 15 giây',{giaiDoan:'vote',mocKetThuc:game.mocKetThuc});
  phatTrangThai(io,game);
  hen(game,()=>{
    if(game.giaiDoan!=='vote')return;
    const counts=new Map();for(const target of game.phieu.values())if(target)counts.set(target,(counts.get(target)||0)+1);
    const max=Math.max(0,...counts.values());const leaders=[...counts].filter(([,n])=>n===max&&max>0).map(([id])=>id);
    let dead=[];
    if(leaders.length===1)dead=danhDauChet(io,game,[leaders[0]],'vote');
    const names=dead.map(p=>p.ten);const votes=[...game.phieu].map(([from,to])=>({from:layNguoi(game,from)?.ten||from,to:to?layNguoi(game,to)?.ten||to:'Trắng'}));
    themLichSu(game,{loai:'vote',ngay:game.ngay,phieu:votes,chet:names.length?names:[],hoa:leaders.length>1});
    phatSuKien(io,game,leaders.length===1?`${names[0]||'Người chơi'} đã bị loại với ${max} phiếu.`:leaders.length>1?'Phiếu cao nhất bị hòa, không ai bị loại.':'Toàn bộ phiếu trắng, không ai bị loại.',{phiếu:Object.fromEntries(game.phieu)});
    if(kiemTraThang(io,game))return;
    batDauDem(io,game);
  },15000);
}

function batDauChiaVai(io,game) {
  if(game.giaiDoan!=='dealing')return;
  game.giaiDoan='cards';game.mocKetThuc=now()+10000;
  for(const [la,id] of game.chonLa){const p=layNguoi(game,id);if(p)p.vai=game.vaiTheoLa[la];}
  for(const p of game.nguoi.values())guiRieng(io,p.id,'wolf-private',{loai:'card',vai:p.vai,moTa:vaiTro[p.vai],mocKetThuc:game.mocKetThuc});
  phatTrangThai(io,game);hen(game,()=>batDauDem(io,game),10000);
}

function batDauGame(io,game,ids) {
  const unique=[...new Set(ids)].slice(0,15);
  if(unique.length<5||unique.some(id=>!game.online.has(id)))return false;
  game.maTran+=1;
  game.clearArea?.(game.roomId,new Set(unique));
  game.nguoi.clear();game.capDoi.clear();game.ngay=0;game.lichSu=[];game.phieu.clear();game.boPhieu.clear();game.ngung.clear();game.thuocCuu=true;game.thuocDoc=true;
  unique.forEach((id,index)=>{
    const player=game.getPlayer(id);
    const old={x:player.x,z:player.z,yaw:player.yaw};
    const seat=taoViTriGheMaSoi(index,unique.length);
    game.nguoi.set(id,{id,session:player.sessionId||'',ten:player.name,avatar:player.avatar,ghe:index,song:true,dangKetNoi:true,x:seat.x,z:seat.z,yaw:seat.yaw,viTriCu:old,vai:'',nguyenNhan:''});
    game.lockPlayer(id,true,seat);
  });
  chiaVai(game);game.chonLa=new Map();game.giaiDoan='dealing';game.mocKetThuc=0;game.chu=unique[0];
  congKhai(io,game.roomId,'wolf-start',{nguoi:congKhaiNguoi(game),soLa:unique.length,laDaChon:[],maTran:game.maTran});
  phatTrangThai(io,game);return true;
}

function giaiTan(io,game) {
  huyHen(game);
  for(const p of game.nguoi.values())if(p.dangKetNoi)game.lockPlayer(p.id,false,p.viTriCu);
  for(const id of game.spectators)game.lockPlayer(id,false);
  congKhai(io,game.roomId,'wolf-dissolved',{roomId:game.roomId});
  game.room.werewolf=null;
}

export function taoQuanLyMaSoi(io,rooms,helpers) {
  function taoGame(roomId,room) {
    return {roomId,room,getPlayer:id=>room.get(id),online:new Map([...room.keys()].map(id=>[id,true])),nguoi:new Map(),timers:[],giaiDoan:'idle',ngay:0,maTran:0,mocKetThuc:0,giaiTanLuc:0,chu:'',moi:null,chonLa:new Map(),vaiTheoLa:[],daHieu:new Set(),ngung:new Set(),phieu:new Map(),boPhieu:new Set(),luaChon:new Map(),dichSoi:new Map(),luuLuaChonSoi:[],daXacNhan:new Set(),boQua:[],boQuaChiTiet:[],lichSu:[],capDoi:new Map(),thuocCuu:true,thuocDoc:true,baoVeGanNhat:'',spectators:new Set(),lockPlayer:helpers.lockPlayer,clearArea:helpers.clearArea};
  }
  function getGame(socket) {const room=rooms.get(socket.data.room);return room?.werewolf||null;}
  function validPlayer(game,socket) {const p=game&&layNguoi(game,socket.id);return p?.dangKetNoi?p:null;}
  function sendState(socket) {const game=getGame(socket);if(game)guiRieng(io,socket.id,'wolf-state',congKhaiTrangThai(game,socket.id));}
  function ketThucLoiMoi(game) {
    if(!game?.moi||game.room.werewolf!==game)return;
    const accepted=[...game.moi.phanHoi].filter(([,answer])=>answer==='yes').map(([id])=>id);
    game.moi=null;
    if(accepted.length<5){phatSuKien(io,game,'Không đủ 5 người tham gia. Ván Ma Sói đã được hủy.');return giaiTan(io,game);}
    if(!batDauGame(io,game,accepted)){phatSuKien(io,game,'Không thể bắt đầu ván.');giaiTan(io,game);}
  }
  function onJoin(socket,room) {
    const game=room.werewolf;
    if(!game)return;
    game.online.set(socket.id,true);
    if(game.moi){
      const player=room.get(socket.id);
      const oldInvite=[...game.moi.duocMoi].find(([id,session])=>id!==socket.id&&session&&session===player?.sessionId);
      if(oldInvite){
        const [oldId]=oldInvite,answer=game.moi.phanHoi.get(oldId);
        game.moi.duocMoi.delete(oldId);game.moi.duocMoi.set(socket.id,player.sessionId);game.moi.phanHoi.delete(oldId);
        if(answer)game.moi.phanHoi.set(socket.id,answer);
        game.online.delete(oldId);
        congKhai(io,game.roomId,'wolf-invite-state',{chu:game.moi.chu,ketThuc:game.moi.ketThuc,phanHoi:[...game.moi.phanHoi].map(([id,phanHoi])=>({id,phanHoi}))});
      }
    }
    const existing=game.nguoi.get(socket.id)||[...game.nguoi.values()].find(p=>p.session&&p.session===room.get(socket.id)?.sessionId);
    if(existing&&existing.id!==socket.id){
      const player=room.get(socket.id);if(player){player.maSoi=true;player.maSoiSpectator=true;game.spectators.add(socket.id);}
      game.lockPlayer(socket.id,true,{x:1.8,z:-11.1,yaw:0});
    }else if(existing&&existing.id===socket.id&&existing.song){
      existing.dangKetNoi=true;
      game.lockPlayer(socket.id,true,{x:existing.x,z:existing.z,yaw:existing.yaw});
    }
    sendState(socket);
  }
  function onDisconnect(socket,room) {
    const game=room?.werewolf;if(!game)return;
    if(game.moi?.chu===socket.id){huyHen(game);phatSuKien(io,game,'Người tạo đã rời phòng, lời mời Ma Sói đã bị hủy.');congKhai(io,game.roomId,'wolf-dissolved',{roomId:game.roomId});room.werewolf=null;return;}
    game.online.delete(socket.id);
    if(game.moi?.duocMoi.has(socket.id)){
      game.moi.duocMoi.delete(socket.id);game.moi.phanHoi.delete(socket.id);
      congKhai(io,game.roomId,'wolf-invite-state',{chu:game.moi.chu,ketThuc:game.moi.ketThuc,phanHoi:[...game.moi.phanHoi].map(([id,phanHoi])=>({id,phanHoi}))});
      if(game.moi.phanHoi.size>=game.moi.duocMoi.size+1)ketThucLoiMoi(game);
    }
    const p=game.nguoi.get(socket.id);game.online.delete(socket.id);
    if(!p||!p.song||game.giaiDoan==='finished')return;
    p.dangKetNoi=false;
    const deaths=danhDauChet(io,game,[p.id],'disconnect');
    phatSuKien(io,game,`${p.ten} đã bị loại khỏi ván Ma Sói.`,{nguoiChet:deaths.map(q=>q.id)});
    if(kiemTraThang(io,game))return;
    phatTrangThai(io,game);
  }
  io.on('connection',socket=>{
    socket.on('wolf-create',ids=>{
      const room=rooms.get(socket.data.room);if(!room||room.werewolf)return socket.emit('wolf-error',{text:'Phòng đã có ván Ma Sói.'});
      const creator=room.get(socket.id);if(!creator)return;
      const inviteIds=[...new Set(Array.isArray(ids)?ids:[])].filter(id=>room.has(id)&&id!==socket.id&&!room.get(id).maSoi).slice(0,14);
      if(inviteIds.length<4)return socket.emit('wolf-error',{text:'Chọn từ 4 đến 14 người để mời.'});
      const game=taoGame(socket.data.room,room);room.werewolf=game;game.online.set(socket.id,true);game.giaiDoan='invite';
      game.moi={chu:socket.id,ketThuc:now()+15000,phanHoi:new Map([[socket.id,'yes']]),duocMoi:new Map(inviteIds.map(id=>[id,room.get(id).sessionId||'']))};
      for(const id of inviteIds){const player=room.get(id);guiRieng(io,id,'wolf-invite',{chu:creator.name,avatar:creator.avatar,ketThuc:game.moi.ketThuc});}
      congKhai(io,game.roomId,'wolf-invite-state',{chu:socket.id,ketThuc:game.moi.ketThuc,phanHoi:[{id:socket.id,phanHoi:'yes'}]});
      hen(game,()=>{
        ketThucLoiMoi(game);
      },15000);
    });
    socket.on('wolf-answer',answer=>{
      const game=getGame(socket);if(!game?.moi||now()>game.moi.ketThuc||!['yes','no'].includes(answer))return;
      if(!game.online.has(socket.id)||!game.moi.duocMoi.has(socket.id)||game.moi.phanHoi.has(socket.id)||!game.room.has(socket.id))return;
      game.moi.phanHoi.set(socket.id,answer);
      congKhai(io,game.roomId,'wolf-invite-state',{chu:game.moi.chu,ketThuc:game.moi.ketThuc,phanHoi:[...game.moi.phanHoi].map(([id,phanHoi])=>({id,phanHoi}))});
      if(game.moi.phanHoi.size>=game.moi.duocMoi.size+1){ketThucLoiMoi(game);return;}
      phatTrangThai(io,game);
    });
    socket.on('wolf-sync',()=>{
      const game=getGame(socket);if(!game)return;
      const p=validPlayer(game,socket);
      if(game.giaiDoan==='dealing'){sendState(socket);return;}
      if(game.giaiDoan==='cards'&&p?.vai){guiRieng(io,socket.id,'wolf-private',{loai:'card',vai:p.vai,moTa:vaiTro[p.vai],mocKetThuc:game.mocKetThuc});return;}
      sendState(socket);
    });
    socket.on('wolf-pick-card',la=>{
      const game=getGame(socket),p=validPlayer(game,socket);
      if(!game||!p||!p.song||game.giaiDoan!=='dealing'||!Number.isInteger(la)||la<0||la>=game.nguoi.size||[...game.chonLa.values()].includes(socket.id)||game.chonLa.has(la))return;
      game.chonLa.set(la,socket.id);
      congKhai(io,game.roomId,'wolf-card-pick-update',{la,id:socket.id,ten:p.ten,soDaChon:game.chonLa.size,soLa:game.nguoi.size});
      phatTrangThai(io,game);
      if(game.chonLa.size===game.nguoi.size)batDauChiaVai(io,game);
    });
    socket.on('wolf-ready',()=>{const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||game.giaiDoan!=='cards'||game.daHieu.has(socket.id))return;game.daHieu.add(socket.id);});
    socket.on('wolf-night-action',data=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||!data||game.giaiDoan!=='night-role'||now()>game.mocKetThuc)return;
      const role=game.vaiDangGoi;if(p.vai!==role)return;
      const target=layNguoi(game,data.target);
      if(['cupid','guard','seer','hunter'].includes(role)&&(!target||!target.song||target.id===p.id&&!['guard','cupid'].includes(role)))return;
      if(role==='cupid'){
        if(game.ngay!==1)return;
        const second=layNguoi(game,data.second);if(!second||!second.song||second.id===target.id)return;
        game.capDoi.set(target.id,second.id);game.capDoi.set(second.id,target.id);game.luaChon.set(role,[target.id,second.id]);
      } else if(role==='guard'){
        if(target.id===game.baoVeGanNhat)return;
        game.luaChon.set('guard',target.id);game.baoVeGanNhat=target.id;
      } else if(role==='seer'){
        game.luaChon.set('seer',target.id);game.ketQuaSoi=target.vai==='wolf'?'SÓI':'KHÔNG PHẢI SÓI';guiRieng(io,p.id,'wolf-private-result',{loai:'seer',ketQua:game.ketQuaSoi});
      } else if(role==='hunter')game.luaChon.set('hunterShot',target.id);
      else if(role==='witch'){
        const kind=data.loai;
        if(kind==='save'&&!game.thuocCuu)return;
        if(kind==='poison'&&!game.thuocDoc)return;
        if(!['save','poison','skip'].includes(kind))return;
        if(['save','poison'].includes(kind)&&(!target||!target.song))return;
        game.luaChon.set('witch',{loai:kind,target:kind==='skip'?'':data.target||''});
      } else if(role==='wolf'&&game.giaiDoan==='night-role'){game.luaChon.set('wolf',target.id);game.luuLuaChonSoi=[[p.id,target.id]];}
      game.daXacNhan.add(role);
      phatSuKien(io,game,`${vaiTro[role].ten} đã chọn xong.`);goiLuot(io,game,game.viTriLuot+1);
    });
    socket.on('wolf-wolf-chat',text=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||p.vai!=='wolf'||game.giaiDoan!=='wolf-chat'||now()>game.mocKetThuc)return;
      const safe=String(text||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,160);if(!safe)return;
      for(const wolf of songTheoVai(game,'wolf'))guiRieng(io,wolf.id,'wolf-chat-message',{name:p.ten,text:safe,at:now()});
      themLichSu(game,{loai:'wolf-chat',ten:p.ten,text:safe});
    });
    socket.on('wolf-wolf-target',id=>{
      const game=getGame(socket);const p=validPlayer(game,socket);const target=layNguoi(game,id);
      if(!p||!p.song||p.vai!=='wolf'||game.giaiDoan!=='wolf-choice'||now()>game.mocKetThuc||!target?.song||target.vai==='wolf')return;
      game.dichSoi.set(socket.id,id);
      for(const wolf of songTheoVai(game,'wolf'))guiRieng(io,wolf.id,'wolf-private',{loai:'wolf-choice',mocKetThuc:game.mocKetThuc,dongDoi:songTheoVai(game,'wolf').filter(q=>q.id!==wolf.id).map(q=>q.ten),danhSach:conSong(game).filter(q=>q.vai!=='wolf').map(q=>({id:q.id,ten:q.ten})),luaChon:[...game.dichSoi],wolfCount:songTheoVai(game,'wolf').length});
    });
    socket.on('wolf-wolf-confirm',()=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||p.vai!=='wolf'||game.giaiDoan!=='wolf-choice'||now()>game.mocKetThuc)return;
      const wolves=songTheoVai(game,'wolf'),targets=[...game.dichSoi.values()];
      if(targets.length!==wolves.length||!targets.every(id=>id===targets[0]))return;
      game.luaChon.set('wolf',targets[0]);game.luuLuaChonSoi=[...game.dichSoi];game.daXacNhan.add('wolf');
      goiLuot(io,game,game.viTriLuot+1);
    });
    socket.on('wolf-discussion',text=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||game.giaiDoan!=='discussion')return;
      const safe=String(text||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,160);if(!safe)return;
      if(now()-(p.lastWolfChat||0)<350)return;p.lastWolfChat=now();
      congKhai(io,game.roomId,'wolf-discussion-message',{id:p.id,name:p.ten,text:safe,at:now()});
    });
    socket.on('wolf-stop-discussion',()=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||game.giaiDoan!=='discussion')return;
      game.ngung.add(p.id);phatTrangThai(io,game);
      if(game.ngung.size>conSong(game).length/2){huyHen(game);batDauVote(io,game);}
    });
    socket.on('wolf-vote',(id)=>{
      const game=getGame(socket);const p=validPlayer(game,socket);if(!p||!p.song||game.giaiDoan!=='vote'||now()>game.mocKetThuc||game.boPhieu.has(p.id))return;
      const target=id?layNguoi(game,id):null;if(id&&(!target?.song||target.id===p.id))return;
      game.boPhieu.add(p.id);game.phieu.set(p.id,id||'');
      congKhai(io,game.roomId,'wolf-vote-update',{from:p.id,to:id||'',name:p.ten,counts:Object.fromEntries([...game.phieu.values()].reduce((m,v)=>{if(v)m.set(v,(m.get(v)||0)+1);return m;},new Map()))});
      phatTrangThai(io,game);
    });
  });
  return {onJoin,onDisconnect,isPlayer:(room,id)=>Boolean(room?.werewolf?.nguoi.get(id)?.dangKetNoi),filterTargets:(room,players)=>players.filter(p=>!room?.werewolf?.nguoi.get(p.id)?.dangKetNoi),sendState};
}
