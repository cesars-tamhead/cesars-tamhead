/** Rebuild the autoplay profile GIF. Requires Node 20+, npm install, and ffmpeg. */
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const THREE=await import(process.env.INTRO_THREE_MODULE||'three');
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const WIDTH=860,HEIGHT=544,FPS=10,DURATION=14;
GlobalFonts.registerFromPath(join(ROOT,'assets/archivo-black.woff2'),'Cesar Intro Archivo');
const geometryData=JSON.parse(readFileSync(join(ROOT,'assets/intro-geometry.json'),'utf8'));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,WIDTH/HEIGHT,.05,100);
const neuronCamera=new THREE.PerspectiveCamera(35,WIDTH/HEIGHT,.05,100);
const brain=new THREE.Group(),neuron=new THREE.Group(),surface=new THREE.Group();
scene.add(brain,neuron);neuron.add(surface);surface.position.set(.43,-3.99,.05);
neuron.rotation.z=Math.PI/2;neuron.position.set(-2.3,-8,0);
neuronCamera.position.set(0,-8,9.8);neuronCamera.lookAt(0,-8,0);
const pulses=[];
class IntroCanvasRenderer {
      constructor(){this.domElement=createCanvas(WIDTH,HEIGHT);this.context=this.domElement.getContext('2d');this.ratio=1;}
      setPixelRatio(value){this.ratio=Math.min(value,1.25);}
      setClearColor(){}
      setSize(width,height){this.width=width;this.height=height;this.domElement.width=Math.round(width*this.ratio);this.domElement.height=Math.round(height*this.ratio);}
      clear(){this.context.setTransform(this.ratio,0,0,this.ratio,0,0);this.context.clearRect(0,0,this.width,this.height);}
      clearDepth(){}
      dispose(){}
      render(world,view){
        world.updateMatrixWorld(true);view.updateMatrixWorld(true);
        const context=this.context,width=this.width,height=this.height,triangles=[],specks=[];
        const projection=new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse);
        world.traverseVisible(object=>{
          if(!object.isMesh&&!object.isPoints)return;
          const geometry=object.geometry,positions=geometry.attributes.position.array;
          const matrix=new THREE.Matrix4().multiplyMatrices(projection,object.matrixWorld).elements;
          const projected=new Float32Array(positions.length);
          const viewMatrix=new THREE.Matrix4().multiplyMatrices(view.matrixWorldInverse,object.matrixWorld);
          const normalMatrix=new THREE.Matrix3().getNormalMatrix(viewMatrix).elements;
          for(let i=0;i<positions.length;i+=3){
            const x=positions[i],y=positions[i+1],z=positions[i+2];
            const w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
            projected[i]=((matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w*.5+.5)*width;
            projected[i+1]=(-(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w*.5+.5)*height;
            projected[i+2]=(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w;
          }
          if(object.isPoints){for(let i=0;i<projected.length;i+=3)if(projected[i+2]>-1&&projected[i+2]<1)specks.push([projected[i],projected[i+1]]);return;}
          const indices=geometry.index.array,normals=geometry.attributes.normal.array,colors=geometry.attributes.color?.array,signal=geometry.attributes.axonProgress?.array;
          const base=object.material.color,signalPosition=object.material.userData.signalUniform?.value??-2;
          for(let j=0;j<indices.length;j+=3){
            const a=indices[j]*3,b=indices[j+1]*3,c=indices[j+2]*3;
            const depth=(projected[a+2]+projected[b+2]+projected[c+2])/3;
            if(depth< -1||depth>1)continue;
            const x1=projected[a],y1=projected[a+1],x2=projected[b],y2=projected[b+1],x3=projected[c],y3=projected[c+1];
            if(Math.max(x1,x2,x3)<0||Math.min(x1,x2,x3)>width||Math.max(y1,y2,y3)<0||Math.min(y1,y2,y3)>height)continue;
            const nx=(normals[a]+normals[b]+normals[c])/3,ny=(normals[a+1]+normals[b+1]+normals[c+1])/3,nz=(normals[a+2]+normals[b+2]+normals[c+2])/3;
            let vx=normalMatrix[0]*nx+normalMatrix[3]*ny+normalMatrix[6]*nz,vy=normalMatrix[1]*nx+normalMatrix[4]*ny+normalMatrix[7]*nz,vz=normalMatrix[2]*nx+normalMatrix[5]*ny+normalMatrix[8]*nz;
            if(vz<0){vx=-vx;vy=-vy;vz=-vz;}
            const shade=.24+.76*Math.max(0,(-vx*.38+vy*.52+vz*.76)/Math.max(.01,Math.hypot(vx,vy,vz)));
            let r=base.r,g=base.g,blue=base.b;
            if(colors){r*=(colors[a]+colors[b]+colors[c])/3;g*=(colors[a+1]+colors[b+1]+colors[c+1])/3;blue*=(colors[a+2]+colors[b+2]+colors[c+2])/3;}
            let glow=0;if(signal){const progress=(signal[indices[j]]+signal[indices[j+1]]+signal[indices[j+2]])/3;glow=Math.pow(Math.max(0,1-Math.abs(progress-signalPosition)/.13),2);}
            r=Math.min(255,Math.round(255*Math.pow(Math.max(0,r*shade),.48)+glow*180));
            g=Math.min(255,Math.round(255*Math.pow(Math.max(0,g*shade),.48)+glow*220));
            blue=Math.min(255,Math.round(255*Math.pow(Math.max(0,blue*shade),.48)+glow*255));
            triangles.push([depth,x1,y1,x2,y2,x3,y3,`rgb(${r},${g},${blue})`]);
          }
        });
        context.fillStyle='rgba(45,94,158,.3)';for(const [x,y]of specks)context.fillRect(x,y,1,1);
        triangles.sort((a,b)=>b[0]-a[0]);
        for(const t of triangles){context.beginPath();context.moveTo(t[1],t[2]);context.lineTo(t[3],t[4]);context.lineTo(t[5],t[6]);context.closePath();context.fillStyle=t[7];context.fill();}
      }
    }
async function makeMesh(item,isBrain,index){
      const bytes=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0));
      const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      let offset=0;
      const quant=new Uint16Array(decoded,offset,item.vertices*3);offset+=item.vertices*6;
      const position=new Float32Array(quant.length);
      for(let i=0;i<quant.length;i++)position[i]=item.low[i%3]+quant[i]/65535*item.span[i%3];
      const indices=new Uint16Array(decoded,offset,item.indices);offset+=item.indices*2;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
      geometry.setIndex(new THREE.BufferAttribute(indices,1));
      geometry.computeVertexNormals();
      if(item.colors){
        const colors=new Uint8Array(decoded,offset,item.vertices*3);offset+=item.vertices*3;
        const linear=new Float32Array(colors.length);
        for(let i=0;i<colors.length;i++)linear[i]=Math.pow(colors[i]/255,2.2);
        geometry.setAttribute('color',new THREE.BufferAttribute(linear,3));
      }
      const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...item.base),roughness:isBrain?.4:.38,metalness:.08,side:THREE.DoubleSide,vertexColors:item.colors});
      if(item.signal){
        const signalUniform={value:-.25};pulses.push(signalUniform);material.userData.signalUniform=signalUniform;
        const view=new DataView(decoded,offset,item.vertices*2);
        const signal=new Float32Array(item.vertices);
        for(let i=0;i<signal.length;i++)signal[i]=view.getUint16(i*2,true)/65535;
        geometry.setAttribute('axonProgress',new THREE.BufferAttribute(signal,1));
        material.onBeforeCompile=shader=>{
          const uniform={value:-.25};pulses.push(uniform);shader.uniforms.signalPosition=uniform;
          shader.vertexShader='attribute float axonProgress; varying float vAxon;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAxon=axonProgress;');
          shader.fragmentShader='uniform float signalPosition; varying float vAxon;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat lead=pow(max(0.0,1.0-abs(vAxon-signalPosition)/0.12),2.0);\nfloat trail=pow(max(0.0,1.0-abs(vAxon-(signalPosition-0.19))/0.16),2.0);\ntotalEmissiveRadiance+=vec3(0.65,0.9,1.0)*lead*5.0+vec3(0.02,0.22,1.0)*trail*3.0;');
        };
      }
      const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
      if(!isBrain&&index===0){
        const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x255da8,size:.015,transparent:true,opacity:.42,depthWrite:false}));surface.add(points);
      }
      (isBrain?brain:surface).add(mesh);
      return mesh;
    }

const brainMeshes=await Promise.all(geometryData.brain.map((d,i)=>makeMesh(d,true,i)));
await Promise.all(geometryData.neuron.map((d,i)=>makeMesh(d,false,i)));
const renderer=new IntroCanvasRenderer();renderer.setPixelRatio(1);renderer.setSize(WIDTH,HEIGHT);
const context=renderer.context;
const clamp=v=>Math.min(1,Math.max(0,v));const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const keyframes=[[1,-.25],[30,-.25],[42,0],[138,1.16],[160,1.5],[192,1.5]];
function signalAt(seconds){const f=1+(seconds%8)/8*191;for(let i=1;i<keyframes.length;i++){const a=keyframes[i-1],b=keyframes[i];if(f<=b[0])return THREE.MathUtils.lerp(a[1],b[1],(f-a[0])/(b[0]-a[0]));}return 1.5;}
function spacedText(text,fontSize,spacing,x,y,scaleX=1,scaleY=1,alpha=1){
 context.save();context.globalAlpha=alpha;context.fillStyle='#f6f3ec';context.font=`${fontSize}px "Cesar Intro Archivo"`;context.textBaseline='top';context.translate(x,y);context.scale(scaleX,scaleY);
 let offset=0;for(const letter of text){context.fillText(letter,offset,0);offset+=context.measureText(letter).width+spacing;}context.restore();
}
function textWidth(text,size,spacing){context.font=`${size}px "Cesar Intro Archivo"`;return [...text].reduce((width,ch)=>width+context.measureText(ch).width,0)+(text.length-1)*spacing;}
const temporary=mkdtempSync(join(tmpdir(),'cesar-intro-'));
try{
 for(let index=0;index<FPS*DURATION;index++){
  const elapsed=index/FPS,p=clamp((elapsed-1.5)/6.5);
  const exit=ease(p/.16),turn=ease((p-.035)/.27),split=ease((p-.29)/.2),travel=ease((p-.46)/.35),show=ease((p-.37)/.17);
  renderer.clear();context.fillStyle='#080a0e';context.fillRect(0,0,WIDTH,HEIGHT);
  if(exit<1){
   const size=WIDTH*.18,spacing=-.05*size,total=textWidth('WELCOME',size,spacing);
   context.font=`${size}px "Cesar Intro Archivo"`;
   const cCenter=textWidth('WEL',size,spacing)+spacing+context.measureText('C').width/2;
   const delta=(cCenter-total/2)*.88;
   spacedText('WELCOME',size,spacing,WIDTH/2-delta-total*.88/2,HEIGHT*.35-exit*HEIGHT,.88,1.8,1-exit);
  }
  const target=new THREE.Vector3(0,-8*travel,0),angle=turn*(1-travel)*Math.PI/2;
  const front=3.84/(.27*camera.aspect*2*Math.tan(THREE.MathUtils.degToRad(17.5)));
  const distance=THREE.MathUtils.lerp(THREE.MathUtils.lerp(front,8.4,turn),9.8,travel);
  camera.position.set(target.x,target.y+Math.sin(angle)*distance,target.z+Math.cos(angle)*distance);
  camera.up.set(0,Math.cos(angle),-Math.sin(angle));camera.lookAt(target);
  brainMeshes[0].position.x=-split*8;brainMeshes[1].position.x=split*8;
  for(const uniform of pulses)uniform.value=signalAt(Math.max(0,elapsed-5));
  if(split>.01){brain.visible=false;neuron.visible=true;renderer.render(scene,neuronCamera);}
  neuron.visible=false;brain.visible=travel<.99;renderer.render(scene,camera);
  if(show>0){
   const size=WIDTH*.156,spacing=-.055*size,right=WIDTH*.96;
   // Match the right-aligned block, with both lines sharing their left edge.
   const x=right-Math.max(textWidth('CESAR',size,spacing),textWidth('SIERRA',size,spacing));
   spacedText('CESAR',size,spacing,x,HEIGHT*.18,1,1,show);
   spacedText('SIERRA',size,spacing,x,HEIGHT*.18+size*1.08,1,1,show);
  }
  context.save();context.font='13px monospace';context.textAlign='center';context.fillStyle='#c3c8d1';context.fillText('NEUROSCIENCE / DATA SCIENCE',WIDTH/2,HEIGHT-21);context.restore();
  writeFileSync(join(temporary,`frame-${String(index).padStart(4,'0')}.png`),renderer.domElement.toBuffer('image/png'));
  if(index===0||index===80||index===FPS*DURATION-1)writeFileSync(join(ROOT,'assets',`intro-check-${index}.png`),renderer.domElement.toBuffer('image/png'));
  if(index%20===0)console.log(`Rendered ${index}/${FPS*DURATION} frames`);
 }
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(FPS),'-i',join(temporary,'frame-%04d.png'),'-filter_complex','[0:v]split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none','-loop','-1',join(ROOT,'assets/welcome-neuron.gif')],{stdio:'inherit'});
 console.log('Created assets/welcome-neuron.gif');
}finally{rmSync(temporary,{recursive:true,force:true});}
