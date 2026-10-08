import * as THREE from './assets/three.module.js';
export const bounds={x:500,z:350};
export const wash=z=>-120+65*Math.sin(z/130)+.26*z;
export function height(x,z){
 const g=(cx,cz,sx,sz,a)=>a*Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2));
 const hills=g(-265,-100,180,215,175)+g(185,-185,210,150,202)+g(350,120,170,200,135)+g(-365,295,140,150,60);
 const cut=24*Math.exp(-(((x-wash(z))/28)**2));
 return Math.max(4,18+hills+6*Math.sin(x/110)*Math.cos(z/145)-cut);
}
export const navStart={x:-320,z:250};
export const target={x:navStart.x+600*Math.sin(Math.PI/3),z:navStart.z-600*Math.cos(Math.PI/3)};
let randomSeed=88;function rng(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
const toMap=(x,z,w,h)=>[(x+500)/1000*w,(z+350)/700*h];
export function contours(w=740,h=480){
 let out='';const n=72,m=50,dx=1000/n,dz=700/m;
 for(let level=20;level<=220;level+=20){let path='';for(let j=0;j<m;j++)for(let i=0;i<n;i++){
 const x=-500+i*dx,z=-350+j*dz,p=[[x,z],[x+dx,z],[x+dx,z+dz],[x,z+dz]],v=p.map(q=>height(...q));const crossings=[];
 for(let e=0;e<4;e++){const k=(e+1)%4;if((v[e]<level)!==(v[k]<level)){const t=(level-v[e])/(v[k]-v[e]);crossings.push(toMap(p[e][0]+t*(p[k][0]-p[e][0]),p[e][1]+t*(p[k][1]-p[e][1]),w,h));}}
 for(let k=0;k+1<crossings.length;k+=2){path+=`M${crossings[k][0].toFixed(1)},${crossings[k][1].toFixed(1)}L${crossings[k+1][0].toFixed(1)},${crossings[k+1][1].toFixed(1)}`;}}
 out+=`<path d="${path}" fill="none" stroke="#5B7C5C" stroke-opacity="${level%100===0?.85:.5}" stroke-width="${level%100===0?1.6:.8}"/>`;}
 return out;
}
export function mapBase(w=740,h=480){let channel='';for(let z=-350;z<=350;z+=10){const p=toMap(wash(z),z,w,h);channel+=(z===-350?'M':'L')+p.join(',');}return `<rect width="${w}" height="${h}" fill="#FDFBF3"/>${contours(w,h)}<path d="${channel}" fill="none" stroke="#C9A56B" stroke-width="4"/><path d="${channel}" fill="none" stroke="#FDFBF3" stroke-width="1.2"/><g stroke="#5B7C5C" stroke-width="1.5" transform="translate(${w-28},18)"><path d="M0 32V4m-5 8 5-8 5 8" fill="none"/><text x="0" y="47" text-anchor="middle" class="map-text" font-size="14">צ</text></g><g transform="translate(20,${h-20})"><path d="M0 0H${w/10}" stroke="#38432E" stroke-width="3"/><path d="M0-5V5M${w/10}-5V5" stroke="#38432E"/><text x="${w/20}" y="-10" text-anchor="middle" class="map-text" font-size="12">100 מ׳</text></g>`;}
export function mapSvg(content='',w=740,h=480,label='מפה טופוגרפית של אותו שטח סינתטי'){return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${mapBase(w,h)}${content}</svg>`;}
export function mapPoint(x,z,label,w=740,h=480,color='#D97E2B'){const p=toMap(x,z,w,h);return `<g transform="translate(${p.join(',')})"><circle r="10" fill="white" stroke="${color}" stroke-width="2"/><text x="0" y="5" text-anchor="middle" class="map-text" font-size="14" font-weight="700">${label}</text></g>`;}
export function lineMap(a,b,w=740,h=480,color='#D97E2B',dash=''){const p=toMap(a.x,a.z,w,h),q=toMap(b.x,b.z,w,h);return `<path d="M${p}L${q}" stroke="${color}" stroke-width="3" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`;}
export function initTerrain(canvas,hotspotRoot){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#FDFBF3');scene.fog=new THREE.Fog('#FDFBF3',800,2000);
 scene.add(new THREE.HemisphereLight('#FDFBF3','#5a6b4a',1.1));const sun=new THREE.DirectionalLight('#FDFBF3',2.1);sun.position.set(-350,800,220);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-750;sun.shadow.camera.right=750;sun.shadow.camera.top=650;sun.shadow.camera.bottom=-650;sun.shadow.normalBias=2;scene.add(sun);
 const geo=new THREE.PlaneGeometry(1000,700,150,105);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,col=[];const sage=new THREE.Color('#749C75'),sand=new THREE.Color('#c2a26b'),rock=new THREE.Color('#FDFBF3'),dark=new THREE.Color('#5a6b4a');
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=height(x,z);pos.setY(i,y);const slope=Math.hypot(height(x+3,z)-height(x-3,z),height(x,z+3)-height(x,z-3))/6;const grain=(Math.sin(x*1.91+z*1.17)+Math.cos(x*.68-z*1.88))*.022;const dry=Math.max(0,1-Math.abs(x-wash(z))/35);const c=sage.clone().lerp(sand,.08+grain).lerp(rock,Math.min(.65,slope*.5)).lerp(rock,dry*.9).lerp(dark,Math.max(0,Math.sin(x*.019)*Math.sin(z*.021))*.12);col.push(c.r,c.g,c.b);}
 const groundTexture=new THREE.TextureLoader().load('./assets/ground.jpg',()=>render());groundTexture.colorSpace=THREE.SRGBColorSpace;groundTexture.wrapS=groundTexture.wrapT=THREE.RepeatWrapping;groundTexture.repeat.set(22,15);groundTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,bumpMap:groundTexture,bumpScale:.45,roughness:1,metalness:0}));ground.receiveShadow=true;scene.add(ground);
 const sides=[];function skirt(a,b){const ya=height(...a),yb=height(...b);sides.push(a[0],ya,a[1],b[0],yb,b[1],a[0],-12,a[1],b[0],yb,b[1],b[0],-12,b[1],a[0],-12,a[1]);}for(let i=0;i<150;i++){const x=-500+i*1000/150;skirt([x,-350],[x+1000/150,-350]);skirt([x+1000/150,350],[x,350]);}for(let j=0;j<105;j++){const z=-350+j*700/105;skirt([500,z],[500,z+700/105]);skirt([-500,z+700/105],[-500,z]);}const sideGeo=new THREE.BufferGeometry();sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sideGeo.computeVertexNormals();scene.add(new THREE.Mesh(sideGeo,new THREE.MeshStandardMaterial({color:'#DCCDB2',roughness:1,side:THREE.DoubleSide})));
 const trunkMat=new THREE.MeshStandardMaterial({color:'#8A6F4D',roughness:1});const crownMats=['#5a6b4a','#5B7C5C','#7a8a3f'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));const rockMat=new THREE.MeshStandardMaterial({color:'#DCCDB2',roughness:1});
 for(let i=0;i<160;i++){const x=(rng()-.5)*960,z=(rng()-.5)*670;if(Math.abs(x-wash(z))<38||height(x,z)>190)continue;const s=1.4+rng()*2;const tree=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,s*1.3,5),trunkMat);trunk.position.y=s*.65;tree.add(trunk);for(let k=0;k<6;k++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(s*.75,1),crownMats[(i+k)%3]);crown.scale.set(1,.65,.85);crown.position.set((rng()-.5)*s*1.8,s*(.8+rng()*.5),(rng()-.5)*s*1.8);crown.castShadow=true;tree.add(crown);}tree.position.set(x,height(x,z),z);scene.add(tree);}
 for(let i=0;i<150;i++){const x=(rng()-.5)*1000,z=(rng()-.5)*700;const r=new THREE.Mesh(new THREE.IcosahedronGeometry(1+rng()*3,0),rockMat);r.scale.set(1.8,.6,1);r.rotation.y=rng()*Math.PI;r.position.set(x,height(x,z)+1,z);r.castShadow=true;scene.add(r);}
 const camera=new THREE.PerspectiveCamera(44,1,1,4000);const routeGroup=new THREE.Group();scene.add(routeGroup);let current='association';let markerData=[];
 function routes(points,color='#D97E2B'){for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],coords=[];for(let k=0;k<=20;k++){const t=k/20,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;coords.push(new THREE.Vector3(x,height(x,z)+3,z));}const curve=new THREE.CatmullRomCurve3(coords);const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,30,2,5,false),new THREE.MeshBasicMaterial({color}));routeGroup.add(tube);}}
 function markers(data){markerData=data;hotspotRoot.innerHTML=data.map((d,i)=>`<button class="hotspot" data-landmark="${i}" style="--x:50%;--y:50%">${d.label}</button>`).join('');}
 function positionMarkers(){markerData.forEach((d,i)=>{const p=new THREE.Vector3(d.x,height(d.x,d.z)+8,d.z).project(camera);const el=hotspotRoot.children[i];if(el){el.style.setProperty('--x',`${Math.max(12,Math.min(88,100-(p.x*.5+.5)*100))}%`);el.style.setProperty('--y',`${Math.max(15,Math.min(77,(-p.y*.5+.5)*100))}%`);el.hidden=p.z>1||p.x>1||p.x< -1||p.y>1||p.y< -1;}});}
 function render(){if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);positionMarkers();}
 function setMode(mode,route=0,progress=4){current=mode;while(routeGroup.children.length){const mesh=routeGroup.children[0];routeGroup.remove(mesh);mesh.geometry?.dispose();mesh.material?.dispose();}
 if(mode==='association'){camera.position.set(-310,height(-310,235)+30,235);camera.lookAt(50,92,-230);markers([{x:-250,z:-120,label:'1 · רכס משמאל'},{x:15,z:-120,label:'2 · אוכף מלפנים'},{x:wash(130),z:130,label:'3 · ערוץ מתחת לרכס'}]);}
 else if(mode==='handrail'){camera.position.set(480,530,690);camera.lookAt(0,55,0);const pts=route===0?[navStart,{x:wash(180),z:180},{x:wash(0),z:0},{x:wash(-180),z:-180},{x:15,z:-120}]:[navStart,{x:-230,z:-70},{x:-30,z:-160},{x:15,z:-120}];routes(pts.slice(0,progress+1));markers([{...navStart,label:'מוצא ידוע'},{x:wash(0),z:0,label:'עצירת השוואה'},{x:15,z:-120,label:'האוכף'}]);}
 else{const x=navStart.x+progress*Math.sin(Math.PI/3),z=navStart.z-progress*Math.cos(Math.PI/3),y=height(x,z)+18;camera.position.set(x,y,z);camera.lookAt(x+200*Math.sin(Math.PI/3),y,z-200*Math.cos(Math.PI/3));markers([]);}render();}
 new ResizeObserver(render).observe(canvas);return{setMode,render,focus(index){Array.from(hotspotRoot.children).forEach((el,i)=>{el.dataset.focus=String(index===-1||index===i);});}};
}



