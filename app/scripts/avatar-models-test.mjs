import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';

const source=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const start=source.indexOf('const CK = (() => {');
const end=source.indexOf('\nfunction taoTaiNghe',start);
assert.ok(start>=0&&end>start,'Avatar model code is missing');
const {animal}=new Function('THREE',`${source.slice(start,end)}\nreturn {animal};`)(THREE);
const types=['cow','snake','fish','sloth','leopard','capybara','panda'];
const results=[];
for(const type of types){
  const root=animal(type);
  const again=animal(type);
  const meshes=[];
  root.traverse(object=>{if(object.isMesh)meshes.push(object);});
  assert.ok(meshes.length>0,`${type} has no visible geometry`);
  assert.ok(root.userData.body,`${type} is missing the body hook`);
  assert.equal((root.userData.tay||[]).filter(arm=>!arm.userData.inner||!arm.userData.khuYu).length,0,`${type} has broken arm animation hooks`);
  assert.equal((root.userData.chan||[]).filter(leg=>!leg.userData.goi).length,0,`${type} has broken leg animation hooks`);
  let vertices=0,invalid=0,eyeHooks=0;
  for(const mesh of meshes){
    const position=mesh.geometry?.attributes?.position;
    if(position){
      vertices+=position.count;
      for(let index=0;index<position.count*3;index++)if(!Number.isFinite(position.array[index])){invalid++;break;}
    }
    if(mesh.userData.eyeOpen)eyeHooks++;
  }
  assert.ok(vertices>0,`${type} has no vertices`);
  assert.equal(invalid,0,`${type} has invalid coordinates`);
  if(type!=='sloth')assert.ok(eyeHooks>0,`${type} is missing eye animation hooks`);
  const cachedGeometry=meshes.find(mesh=>mesh.geometry?.attributes?.position)?.geometry;
  let sameGeometry=false;
  again.traverse(object=>{if(object.isMesh&&object.geometry===cachedGeometry)sameGeometry=true;});
  assert.ok(sameGeometry,`${type} does not reuse cached geometry`);
  results.push({type,meshes:meshes.length,vertices,eyeHooks});
}
console.log(JSON.stringify({result:'PASS_AVATAR_GEOMETRY_AND_ANIMATION_HOOKS',results},null,2));
