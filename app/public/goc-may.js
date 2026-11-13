import {TAM_BAN_MA_SOI} from './ma-soi-layout.js';

export function tinhGocMay(x,z,fov,tyLe){
  const khoangCach=innerWidth<760?16:12;
  const lechZ=Math.min(4,Math.max(0,(z+13.4)*.18));
  const tam={x:x*.75,y:1.5,z:z-lechZ};
  return {tam,viTri:{x,y:khoangCach,z:z+khoangCach}};
}

export function tinhGocMayMaSoi(){
  const tam={x:TAM_BAN_MA_SOI.x,y:1.1,z:TAM_BAN_MA_SOI.z};
  return {tam,viTri:{x:TAM_BAN_MA_SOI.x,y:14.5,z:TAM_BAN_MA_SOI.z+12}};
}
