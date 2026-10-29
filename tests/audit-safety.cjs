// Regression checks: real temporary folders, synthetic data only. Requires Node 24.
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {stripTypeScriptTypes}=require('node:module');
const source=async(r,f)=>fs.readFile(path.join(__dirname,'..',f),'utf8');
const missing=()=>Object.assign(Error('synthetic missing file'),{name:'NotFoundError'});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
class Dir{
 constructor(p,io={}){this.p=p;this.name=path.basename(p);this.kind='directory';this.io=io;}
 async queryPermission(){return 'granted';}
 async getDirectoryHandle(n,o={}){const p=path.join(this.p,n);try{if(!(await fs.stat(p)).isDirectory())throw Object.assign(Error('not directory'),{name:'TypeMismatchError'});}catch(e){if(e.code!=='ENOENT')throw e;if(!o.create)throw missing();await fs.mkdir(p,{recursive:true});}return new Dir(p,this.io);}
 async getFileHandle(n,o={}){
  const p=path.join(this.p,n),io=this.io;if(io.beforeGet)await io.beforeGet(p,o);
  try{if(!(await fs.stat(p)).isFile())throw Object.assign(Error('not file'),{name:'TypeMismatchError'});}catch(e){if(e.code!=='ENOENT')throw e;if(!o.create)throw missing();await fs.writeFile(p,'',{flag:'a'});}
  return{name:n,kind:'file',getFile:async()=>{if(io.beforeRead)await io.beforeRead(p);const b=await fs.readFile(p),s=await fs.stat(p);return new File([b],n,{lastModified:s.mtimeMs});},createWritable:async(o={})=>{
   if(io.beforeOpen)await io.beforeOpen(p);let buf=o.keepExistingData?await fs.readFile(p):Buffer.alloc(0);
   return{write:async v=>{if(io.beforeWrite)await io.beforeWrite(p,v);let val=v&&v.type==='write'?v.data:v;let b=val instanceof Blob?Buffer.from(await val.arrayBuffer()):Buffer.from(val);if(io.transform)b=await io.transform(p,b);if(v&&v.type==='write'){const out=Buffer.alloc(Math.max(buf.length,v.position+b.length));buf.copy(out);b.copy(out,v.position);buf=out;}else buf=b;},close:async()=>{if(io.beforeClose)await io.beforeClose(p);await fs.writeFile(p,buf);if(io.afterClose)await io.afterClose(p);},abort:async()=>{}};
  }};
 }
 async *values(){for(const e of await fs.readdir(this.p,{withFileTypes:true}))yield e.isDirectory()?new Dir(path.join(this.p,e.name),this.io):await this.getFileHandle(e.name);}
 async *entries(){for await(const h of this.values())yield[h.name,h];}
 async removeEntry(n){const p=path.join(this.p,n);if(this.io.beforeRemove)await this.io.beforeRemove(p);const s=await fs.stat(p);if(s.isDirectory())await fs.rmdir(p);else await fs.unlink(p);}
}
function context(extra={}){return vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,File,Blob,console,setTimeout,clearTimeout,Date,navigator:{},...extra});}
function part(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,`source anchors ${a} / ${b}`);return s.slice(i,j);}
async function fixture(fn){const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'spektron-audit-'));try{return await fn(tmp);}finally{await fs.rm(tmp,{recursive:true,force:true});}}
async function put(root,n,v){const p=path.join(root,n);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,typeof v==='string'?v:JSON.stringify(v));}
async function exists(p){return fs.access(p).then(()=>true,()=>false);}

(async()=>{
 await fixture(async tmp=>{

 const html=await source('','index.html'),code=part(html,'const jsonStaende=[];','async function schnellSpeichern(){'),c=context();vm.runInContext(code,c);
 const d=new Dir(tmp),name='99.9001_2026-10-29_Daten.json';await put(tmp,name,'{"synthetic":"OLD"}');c.jsonStandMerken(d,name,'{"synthetic":"OLD"}');
 await put(tmp,name,'{"synthetic":"NEW"}');await assert.rejects(()=>c.sicherSpeichern(d,name,'{"synthetic":"STALE"}'),/anderweitig geändert/);assert.equal(await fs.readFile(path.join(tmp,name),'utf8'),'{"synthetic":"NEW"}');
 const old='99.9001_U\u0308bergabe.XLS';await put(tmp,old,'SYNTHETIC EXTERNAL');const saved=await c.sicherSpeichern(d,'99.9001_Übergabe.xls','SYNTHETIC NEW');assert.notEqual(saved,'99.9001_Übergabe.xls');assert.equal(await fs.readFile(path.join(tmp,old),'utf8'),'SYNTHETIC EXTERNAL');
 const fresh='99.9001_2026-10-30_Daten.json';await c.sicherSpeichern(d,fresh,'{"synthetic":1}');await c.sicherSpeichern(d,fresh,'{"synthetic":2}');assert.equal(await fs.readFile(path.join(tmp,fresh),'utf8'),'{"synthetic":2}');

 });console.log('OK safety: stale JSON saves fail; existing exports survive case and Unicode aliases');
 await fixture(async tmp=>{

 const html=await source('','index.html'),hit=defer(),go=defer(),elements=new Map(),pa=path.join(tmp,'99.9001 Synthetic A'),pb=path.join(tmp,'99.9002 Synthetic B');
 await put(pa,'Laboraufträge/a_Daten.json',{projekt:{nr:'99.9001'},proben:[{z2:'Synthetic A'}]});await put(pb,'Laboraufträge/b_Daten.json',{projekt:{nr:'99.9002'},proben:[{z2:'Synthetic B'}]});
 const c=context({state:{proj:null,pj:null},permission:async()=>true,maPersonenAus:async()=>[],archiv:async()=>null,parse:n=>({nr:n.slice(0,7),ort:'Synthetic'}),subdir:async(d,n)=>d.getDirectoryHandle(n),LAB_DIR:'Laboraufträge',proben:[],chloridProben:[],asbestProben:[],sonstigeProben:[],brandgeruchProben:[],pn98Proben:[],feldprotokolle:[],projektStatus:{dirty:false},window:{},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{value:''});return elements.get(id);}},projektZuordnungPruefen:()=>true,ladePj:async()=>{},updateProjekt:()=>{},kuerzelAuswahl:()=>{},fbeKuerzel:()=> 'AA',markSaved:()=>{},zeigen:()=>{},PROJEKT_URL:{setzen:()=>{}},flash:()=>{},alert:()=>{},confirm:()=>true,jsonStandMerken:()=>{}});
 c.applyProjektData=(data,nr)=>{c.proben=JSON.parse(JSON.stringify(data.proben));c.document.getElementById('proj-nr').value=nr;};
 vm.runInContext(part(html,'  async function neuesteDaten(lab){','  async function ausZentrale(name){'),c);
 const pending=c.oeffnen(new Dir(pa,{beforeRead:async f=>{if(f.endsWith('/a_Daten.json')){hit.resolve();await go.promise;}}}));await hit.promise;await c.oeffnen(new Dir(pb));c.proben[0].z2='Synthetic unsaved B';c.projektStatus.dirty=true;go.resolve();await pending;
 assert.equal(c.state.proj.nr,'99.9002');assert.equal(c.proben[0].z2,'Synthetic unsaved B');

 });console.log('OK safety: late project opens cannot replace a later project edit');
})().catch(e=>{console.error(e);process.exitCode=1;});
