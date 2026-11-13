import assert from 'node:assert/strict';
import {laDemMaSoi,laNguoiChoiMaSoi} from '../public/ma-soi-anh-sang.js';

const cacGiaiDoanDem=['night','night-role','wolf-chat','wolf-choice'];
const cacGiaiDoanNgay=['dealing','cards','discussion','vote','finished','invite'];

for(const giaiDoan of cacGiaiDoanDem)assert.equal(laDemMaSoi(true,giaiDoan),true,`${giaiDoan} phải tối với người đang chơi`);
for(const giaiDoan of cacGiaiDoanDem)assert.equal(laDemMaSoi(false,giaiDoan),false,`${giaiDoan} phải sáng với khán giả`);
for(const giaiDoan of cacGiaiDoanNgay){
  assert.equal(laDemMaSoi(true,giaiDoan),false,`${giaiDoan} phải sáng với người đang chơi`);
  assert.equal(laDemMaSoi(false,giaiDoan),false,`${giaiDoan} phải sáng với khán giả`);
}

const danhSach=[{id:'choi-1'},{id:'choi-2'}];
for(const giaiDoan of [...cacGiaiDoanDem,...cacGiaiDoanNgay.filter(giaiDoan=>giaiDoan!=='finished'&&giaiDoan!=='invite')]){
  assert.equal(laNguoiChoiMaSoi(danhSach,'choi-1',giaiDoan),true,`${giaiDoan} người tham gia thấy khung Ma Sói`);
  assert.equal(laNguoiChoiMaSoi(danhSach,'xem-1',giaiDoan),false,`${giaiDoan} khán giả giữ bảng tương tác phòng`);
}
assert.equal(laNguoiChoiMaSoi(danhSach,'choi-1','finished'),false);
assert.equal(laNguoiChoiMaSoi(danhSach,'choi-1','invite'),false);

console.log(JSON.stringify({ketQua:'PASS',giaiDoanDem:cacGiaiDoanDem,khachXem:'luon giu anh sang binh thuong va bang tuong tac phong',giaiDoanNgay:cacGiaiDoanNgay},null,2));
