const gioiHan={minX:-18.35,maxX:18.35,minZ:-11.45,maxZ:11.45,bang:.4,dem:.34};
const tuong=[
  [-15.25,-10.17,-15.09,-7.13],
  [-6.92,-10.92,-6.68,-5.68],
  [6.68,-10.92,6.92,-5.68],
  [10.27,-10.84,10.53,-4.56],[18.47,-10.84,18.73,-4.56],[10.27,-10.84,18.73,-10.56],
  [10.27,-4.84,13.60,-4.56],[15.40,-4.84,18.73,-4.56],
  [10.27,.96,10.53,8.74],[18.47,.96,18.73,8.74],[10.27,.96,18.73,1.44],
  [10.27,8.36,13.60,8.74],[15.40,8.36,18.73,8.74],
  [-19.99,-9.45,-16.32,-9.25],[-19.99,-5.25,-16.32,-5.05],
  [-20,-12.99,-19.84,-5.05],[-16.49,-12.99,-16.32,-11.98],[-16.49,-10.62,-16.32,-7.63],[-16.49,-6.27,-16.32,-5.05]
];
const key=(x,z)=>`${Math.round(x/gioiHan.bang)},${Math.round(z/gioiHan.bang)}`;
const unpack=value=>value.split(',').map(Number);
export function diemDiDuoc(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<gioiHan.minX||x>gioiHan.maxX||z<gioiHan.minZ||z>gioiHan.maxZ)return false;
  return !tuong.some(([x1,z1,x2,z2])=>x>=x1-gioiHan.dem&&x<=x2+gioiHan.dem&&z>=z1-gioiHan.dem&&z<=z2+gioiHan.dem);
}
export function doanDiDuoc(a,b){
  const buoc=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
  for(let i=0;i<=buoc;i++){const t=i/buoc;if(!diemDiDuoc(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}
  return true;
}
function diemGanNhat(point){
  if(diemDiDuoc(point.x,point.z))return point;
  for(let r=1;r<=18;r++)for(let i=0;i<r*8;i++){
    const angle=i/(r*8)*Math.PI*2,x=point.x+Math.cos(angle)*r*gioiHan.bang,z=point.z+Math.sin(angle)*r*gioiHan.bang;
    if(diemDiDuoc(x,z))return{x,z};
  }
  return{x:0,z:0};
}
export function taoLoTrinh(dau,cuoi){
  const start=diemGanNhat(dau),goal=diemGanNhat(cuoi);
  if(doanDiDuoc(start,goal))return[{x:goal.x,z:goal.z}];
  const toaDoLuoi=(value,min,max)=>Math.max(Math.ceil(min/gioiHan.bang),Math.min(Math.floor(max/gioiHan.bang),Math.round(value/gioiHan.bang)))*gioiHan.bang;
  const gridStart={x:toaDoLuoi(start.x,gioiHan.minX,gioiHan.maxX),z:toaDoLuoi(start.z,gioiHan.minZ,gioiHan.maxZ)},gridGoal={x:toaDoLuoi(goal.x,gioiHan.minX,gioiHan.maxX),z:toaDoLuoi(goal.z,gioiHan.minZ,gioiHan.maxZ)},startKey=key(gridStart.x,gridStart.z),goalKey=key(gridGoal.x,gridGoal.z),[sx,sz]=unpack(startKey),[gx,gz]=unpack(goalKey),open=new Map([[startKey,{...gridStart,g:0,f:Math.hypot(gridStart.x-gridGoal.x,gridStart.z-gridGoal.z)}]]),came=new Map(),cost=new Map([[startKey,0]]),closed=new Set();
  const neighbors=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(open.size){
    let currentKey='',current;
    for(const [k,v] of open)if(!current||v.f<current.f){currentKey=k;current=v;}
    if(currentKey===goalKey){
      const cells=[];let cursor=currentKey;
      while(cursor!==startKey){const [ix,iz]=unpack(cursor);cells.push({x:ix*gioiHan.bang,z:iz*gioiHan.bang});const prev=came.get(cursor);if(!prev)break;cursor=prev;}
      cells.reverse();
      const nodes=[start,gridStart,...cells,goal];
      const smooth=[nodes[0]];let i=0;
      while(i<nodes.length-1){let j=nodes.length-1;while(j>i+1&&!doanDiDuoc(nodes[i],nodes[j]))j--;smooth.push(nodes[j]);i=j;}
      return smooth.slice(1);
    }
    open.delete(currentKey);closed.add(currentKey);
    for(const[dx,dz]of neighbors){const x=current.x+dx*gioiHan.bang,z=current.z+dz*gioiHan.bang,k=key(x,z);if(closed.has(k)||!diemDiDuoc(x,z)||!doanDiDuoc(current,{x,z}))continue;
      const g=current.g+Math.hypot(dx,dz)*gioiHan.bang;if(g>=(cost.get(k)??Infinity))continue;came.set(k,currentKey);cost.set(k,g);open.set(k,{x,z,g,f:g+Math.hypot(goal.x-x,goal.z-z)});
    }
  }
  return[{x:start.x,z:start.z}];
}
export function buocDiAnToan(dau,cuoi){
  if(doanDiDuoc(dau,cuoi))return{x:Math.max(gioiHan.minX,Math.min(gioiHan.maxX,cuoi.x)),z:Math.max(gioiHan.minZ,Math.min(gioiHan.maxZ,cuoi.z))};
  const xOnly={x:cuoi.x,z:dau.z},zOnly={x:dau.x,z:cuoi.z};
  if(doanDiDuoc(dau,xOnly))return{x:xOnly.x,z:xOnly.z};
  if(doanDiDuoc(dau,zOnly))return{x:zOnly.x,z:zOnly.z};
  return{x:dau.x,z:dau.z};
}
