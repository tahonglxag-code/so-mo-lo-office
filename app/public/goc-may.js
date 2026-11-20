import {TAM_BAN_MA_SOI} from './ma-soi-layout.js';

export function tinhGocMay(x,z,fov,tyLe){
  const khoangCach=innerWidth<760?16:12;
  const doCao=innerWidth<760?8:7.1;
  const lechZ=Math.min(4,Math.max(0,(z+13.4)*.18));
  const tam={x,y:1.2,z};
  return {tam,viTri:{x,y:doCao,z:z+khoangCach}};
}

export function tinhGocMayMaSoi(){
  const tam={x:TAM_BAN_MA_SOI.x,y:innerWidth<760 ? .25 : 1.1,z:TAM_BAN_MA_SOI.z};
  return {tam,viTri:{x:TAM_BAN_MA_SOI.x,y:8,z:TAM_BAN_MA_SOI.z+12}};
}
