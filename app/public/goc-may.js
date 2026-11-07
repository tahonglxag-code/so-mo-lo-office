export function tinhGocMay(x,z,fov,tyLe){
  const khoangCach=innerWidth<760?16:12;
  const tam={x:x*.5,y:1.5,z:(z-13.4)/2};
  return {tam,viTri:{x,y:khoangCach,z:z+khoangCach}};
}
