export const TAM_BAN_MA_SOI = Object.freeze({x:0,z:-7.2});
export const BAN_KINH_GHE_MA_SOI = 3.35;
export const BAN_KINH_VUNG_MA_SOI = 5.2;
export const SO_GHE_TOI_DA_MA_SOI = 15;

export function taoViTriGheMaSoi(soThuTu,tongSoNguoi){
  if(!Number.isInteger(soThuTu)||!Number.isInteger(tongSoNguoi)||tongSoNguoi<1||tongSoNguoi>SO_GHE_TOI_DA_MA_SOI||soThuTu<0||soThuTu>=tongSoNguoi)return null;
  const goc=2*Math.PI*soThuTu/tongSoNguoi-Math.PI/2;
  const dx=Math.cos(goc),dz=Math.sin(goc);
  return {x:TAM_BAN_MA_SOI.x+BAN_KINH_GHE_MA_SOI*dx,z:TAM_BAN_MA_SOI.z+BAN_KINH_GHE_MA_SOI*dz,yaw:Math.atan2(dx,dz)};
}

export function trongVungBanMaSoi(x,z){
  return Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-TAM_BAN_MA_SOI.x,z-TAM_BAN_MA_SOI.z)<=BAN_KINH_VUNG_MA_SOI;
}
