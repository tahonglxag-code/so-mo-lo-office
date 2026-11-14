import assert from 'node:assert/strict';
import { buocDiAnToan,diemDiDuoc,doanDiDuoc,taoLoTrinh } from '../public/office-navigation.js';

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
const catVach=(path,zVach,xCua=14.5)=>path.some((diem,index)=>index&&((path[index-1].z-zVach)*(diem.z-zVach)<=0)&&Math.abs(path[index-1].z-diem.z)>.001&&Math.abs(path[index-1].x+(diem.x-path[index-1].x)*(zVach-path[index-1].z)/(diem.z-path[index-1].z)-xCua)<.8);
const catVachDoc=(path,xVach,zCua)=>path.some((diem,index)=>index&&((path[index-1].x-xVach)*(diem.x-xVach)<=0)&&Math.abs(path[index-1].x-diem.x)>.001&&Math.abs(path[index-1].z+(diem.z-path[index-1].z)*(xVach-path[index-1].x)/(diem.x-path[index-1].x)-zCua)<.8);

const vachPhai=kiemTraLoTrinh({x:0,z:-8.3},{x:12,z:-8.3});
assert.ok(vachPhai.some(diem=>diem.z>-5.5));
const vaoPhongSep=kiemTraLoTrinh({x:0,z:-8},{x:14.5,z:-7.5});
assert.ok(catVach(vaoPhongSep,-4.7));
const vaoPhongHop=kiemTraLoTrinh({x:0,z:5},{x:14.5,z:5});
assert.ok(catVach(vaoPhongHop,8.6));
const viTriBanThanTai={x:0,z:8.2};
const tuBanThanTaiDenPhongSep=[viTriBanThanTai,...kiemTraLoTrinh(viTriBanThanTai,{x:14.5,z:-7.15})];
assert.ok(catVach(tuBanThanTaiDenPhongSep,-4.7));
const viTriPhongHop={x:14.5,z:5};
const tuPhongHopDenBanLamViec=[viTriPhongHop,...kiemTraLoTrinh(viTriPhongHop,{x:-15.45,z:1.4})];
assert.ok(catVach(tuPhongHopDenBanLamViec,8.6));
const vaoToilet=[{x:14.5,z:5},...taoLoTrinh({x:14.5,z:5},{x:-16,z:-11.3})];
vaoToilet.push({x:-17.1,z:-11.3},{x:-18.2,z:-11.3});
let truoc={x:14.5,z:5};
for(const diem of vaoToilet){assert.ok(diemDiDuoc(diem.x,diem.z));assert.ok(doanDiDuoc(truoc,diem));truoc=diem;}
assert.ok(catVachDoc(vaoToilet,-16.49,-11.3));
assert.equal(diemDiDuoc(-6.8,-8.3),false);
assert.equal(diemDiDuoc(10.4,-7.5),false);
assert.equal(diemDiDuoc(14.5,-5.35),true);
assert.deepEqual(buocDiAnToan({x:0,z:-8.3},{x:.8,z:-8.3}),{x:.8,z:-8.3});
console.log(JSON.stringify({divider: vachPhai.length,bossDoor:vaoPhongSep.length,conferenceDoor:vaoPhongHop.length,altarToBossDoor:tuBanThanTaiDenPhongSep.length,conferenceToDesk:tuPhongHopDenBanLamViec.length,toiletDoor:vaoToilet.length,allSegmentsClear:true},null,2));
