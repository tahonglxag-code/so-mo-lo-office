export function tinhGocMay(x,z,fov,tyLe){
  const can=Math.SQRT1_2;
  const tam={x:(Math.min(-7,x-1.2)+Math.max(7,x+1.2))/2,y:1.5,z:(-13.4+Math.max(-13.4,z+1.2))/2};
  const tan=Math.tan(fov*Math.PI/360);
  const diem=[[-7,0,-13.4],[7,0,-13.4],[-7,4,-13.4],[7,4,-13.4]];
  for(const dx of [-1.2,1.2])for(const y of [0,3])for(const dz of [-1.2,1.2])diem.push([x+dx,y,z+dz]);
  let xa=14;
  for(const p of diem){
    const dx=p[0]-tam.x,dy=p[1]-tam.y,dz=p[2]-tam.z;
    const doc=(dy+dz)*can,cao=(dy-dz)*can;
    xa=Math.max(xa,doc+Math.abs(dx)/(tan*Math.max(.2,tyLe)*.84),doc+Math.abs(cao)/(tan*.82));
  }
  return {tam,viTri:{x:tam.x,y:tam.y+xa*can,z:tam.z+xa*can}};
}
