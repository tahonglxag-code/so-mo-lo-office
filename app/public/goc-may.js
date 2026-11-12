export function tinhGocMay(x,z,fov,tyLe){
  const khoangCach=innerWidth<760?16:12;
  const lechZ=Math.min(4,Math.max(0,(z+13.4)*.18));
  const tam={x:x*.75,y:1.5,z:z-lechZ};
  return {tam,viTri:{x,y:khoangCach,z:z+khoangCach}};
}

export function tinhGocMayMaSoi(){
  const tam={x:-1.8,y:1.1,z:-7.2};
  return {tam,viTri:{x:-1.8,y:14.5,z:4.8}};
}
