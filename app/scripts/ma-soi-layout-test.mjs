import assert from 'node:assert/strict';
import {BAN_KINH_GHE_MA_SOI, BAN_KINH_VUNG_MA_SOI, TAM_BAN_MA_SOI, taoViTriGheMaSoi, trongVungBanMaSoi} from '../public/ma-soi-layout.js';

for(let tongSoNguoi=5;tongSoNguoi<=15;tongSoNguoi++){
  const ghe=Array.from({length:tongSoNguoi},(_,index)=>taoViTriGheMaSoi(index,tongSoNguoi));
  assert.equal(ghe.length,tongSoNguoi);
  for(let i=0;i<ghe.length;i++){
    const viTri=ghe[i];
    const dx=viTri.x-TAM_BAN_MA_SOI.x;
    const dz=viTri.z-TAM_BAN_MA_SOI.z;
    const khoangCach=Math.hypot(dx,dz);
    assert.ok(Math.abs(khoangCach-BAN_KINH_GHE_MA_SOI)<1e-9);
    const huongX=-Math.sin(viTri.yaw);
    const huongZ=-Math.cos(viTri.yaw);
    const huongVaoX=-dx/khoangCach;
    const huongVaoZ=-dz/khoangCach;
    assert.ok(huongX*huongVaoX+huongZ*huongVaoZ>0.999999);
    for(let j=0;j<i;j++)assert.ok(Math.hypot(viTri.x-ghe[j].x,viTri.z-ghe[j].z)>.1);
  }
}
assert.equal(trongVungBanMaSoi(TAM_BAN_MA_SOI.x,TAM_BAN_MA_SOI.z),true);
assert.equal(trongVungBanMaSoi(TAM_BAN_MA_SOI.x+BAN_KINH_VUNG_MA_SOI,TAM_BAN_MA_SOI.z),true);
assert.equal(trongVungBanMaSoi(TAM_BAN_MA_SOI.x+BAN_KINH_VUNG_MA_SOI+.01,TAM_BAN_MA_SOI.z),false);
assert.equal(taoViTriGheMaSoi(15,15),null);
assert.equal(taoViTriGheMaSoi(0,16),null);
console.log('PASS: ghe va nhan vat dung cung toa do, xoay mat vao ban tu 5 den 15 nguoi');
