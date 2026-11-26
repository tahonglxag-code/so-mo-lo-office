import assert from 'node:assert/strict';
import { buocDiAnToan,diemDiDuoc,doanDiDuoc,taoLoTrinh } from '../public/office-navigation.js';
import { banTho } from '../public/ban-tho.js';

const kiemTraLoTrinh=(dau,cuoi)=>{
  const path=taoLoTrinh(dau,cuoi);
  assert.ok(path.length>0);
  let truoc=dau;
  for(const diem of path){
    assert.ok(diemDiDuoc(diem.x,diem.z));
    assert.ok(doanDiDuoc(truoc,diem));
    truoc=diem;
  }
  assert.ok(Math.hypot(truoc.x-cuoi.x,truoc.z-cuoi.z)<.7);
  return path;
};
const catVachDoc=(path,xVach,zCua)=>path.some((diem,index)=>index&&((path[index-1].x-xVach)*(diem.x-xVach)<=0)&&Math.abs(path[index-1].x-diem.x)>.001&&Math.abs(path[index-1].z+(diem.z-path[index-1].z)*(xVach-path[index-1].x)/(diem.x-path[index-1].x)-zCua)<.8);
const catVachNgang=(path,zVach,xCua)=>path.some((diem,index)=>index&&((path[index-1].z-zVach)*(diem.z-zVach)<=0)&&Math.abs(path[index-1].z-diem.z)>.001&&Math.abs(path[index-1].x+(diem.x-path[index-1].x)*(zVach-path[index-1].z)/(diem.z-path[index-1].z)-xCua)<.8);
const kiemTraCua=(dau,cuoi,kiemTra)=>{
  const path=[dau,...kiemTraLoTrinh(dau,cuoi)];
  assert.ok(kiemTra(path));
  return path;
};

const giuaSanh={x:0,z:0};
const giuaHop={x:15.6,z:-9.7};
const trongPhongSep={x:-10,z:-9};
const cuaHop=kiemTraCua(giuaSanh,giuaHop,path=>catVachDoc(path,11.5,-11.7));
const cuaSep=kiemTraCua(giuaSanh,trongPhongSep,path=>catVachNgang(path,-6.7,-12.8));
kiemTraCua(banTho,trongPhongSep,path=>catVachNgang(path,-6.7,-12.8));
kiemTraCua(giuaHop,giuaSanh,path=>catVachDoc(path,11.5,-11.7));

const gheLamViec=[11.4,1.4,3.9,6.4,8.9].map(z=>({x:-15.45,z}));
for(const ghe of gheLamViec){
  kiemTraLoTrinh(giuaHop,ghe);
  kiemTraLoTrinh(ghe,giuaHop);
}
const dichBia={x:0,z:0};
for(const ghe of gheLamViec){
  kiemTraLoTrinh(ghe,dichBia);
  kiemTraLoTrinh(dichBia,ghe);
}

const cuaWc={x:-16,z:-11.3};
const vaoToilet=[giuaHop,...kiemTraLoTrinh(giuaHop,cuaWc),{x:-17.1,z:-11.3},{x:-18.2,z:-11.3}];
let truoc=vaoToilet[0];
for(const diem of vaoToilet.slice(1)){
  assert.ok(diemDiDuoc(diem.x,diem.z));
  assert.ok(doanDiDuoc(truoc,diem));
  truoc=diem;
}
assert.ok(catVachDoc(vaoToilet,-16.49,-11.3));
assert.equal(diemDiDuoc(11.5,-8),false);
assert.equal(diemDiDuoc(10.4,-7.5),true);
assert.equal(diemDiDuoc(14.5,-5.35),true);
assert.deepEqual(buocDiAnToan({x:0,z:-8.3},{x:.8,z:-8.3}),{x:.8,z:-8.3});
console.log(JSON.stringify({meetingDoor:'both directions',bossDoor:'from lobby and altar',workSeats:'all five reachable in both directions',toiletDoor:'reachable with clear segments',blockedWall:'respected',allSegmentsClear:true},null,2));
