// F1: echte Importfunktionen, ausschließlich synthetische Dateien und Ordner.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function between(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return html.slice(i,j);}
const code=between('function importProjektJSON(e){','function clearAll(){')+
  between('function projektUiStateAnwenden(data){','// ── ZENTRALE PROJEKTDATEN')+
  between('function projektArchivOeffnen(idx){','function projektArchivLoeschen(nr){')+
  between('let oeffnenLauf=0;','async function ausZentrale(name){');
let checks=0;
function fixture(data,approval=false){
  const elements=new Map(['proj-nr','probe-startnr'].map(k=>[k,{value:k==='proj-nr'?'26.0101':''}]));
  elements.set('modal-archiv',{classList:{remove(){}}});
  const events=[],alerts=[],prompts=[];
  const previous={name:'26.0101 Muster',nr:'26.0101'},state={proj:previous,pj:{objekt:'Bisheriger Stand'}};
  const file={name:'26.0999_Daten.json',text:async()=>JSON.stringify(data)};
  const c={console,state,PROJEKTORDNER:{state},LAB_DIR:'Laboraufträge',speicherKontextRevision:10,
    proben:[{id:9,z2:'BISHERIGE PROBE'}],chloridProben:[],asbestProben:[],sonstigeProben:[],brandgeruchProben:[],pn98Proben:[],feldprotokolle:[],pn98Projekt:{},projektStatus:{dirty:false},
    document:{getElementById:k=>elements.get(k)||null},confirm:m=>{prompts.push(m);return m.includes('keine Projektnummer')?approval:true;},alert:m=>alerts.push(m),
    permission:async()=>true,parse:()=>({nr:'26.0101',ort:'Muster'}),archiv:async()=>null,maPersonenAus:async()=>null,kuerzelAuswahl:()=>{},namenAuswahl:()=>{},kuerzelVorschlag:()=>'',fbeKuerzel:()=>'XY',fbeKuerzelSetzen:()=>{},subdir:async()=>({name:'Laboraufträge'}),neuesteDaten:async()=>file,
    jsonStandMerken:()=>{},undoSnapshot:()=>events.push('undo'),markSaved:()=>events.push('saved'),flash:()=>{},zeigen:()=>{},ladePj:()=>{},
    localStorage:{getItem:()=>JSON.stringify([{nr:'26.0101',data:JSON.stringify(data)}])},buildProjektSaveData:()=>({filename:'Muster_Daten.json'}),
    FileReader:class{readAsText(){this.onload({target:{result:JSON.stringify(data)}});}}};
  for(const n of ['setPn98ProjektFelderUi','updateProjekt','renummerieren','renderTable','renderChloridTable','renderAsbestTable','renderSonstigeTable','renderBrandgeruchTable','renderBrandgeruchExport','renderPn98Cards','renderPn98Export','fbeRender'])c[n]=()=>{};
  vm.createContext(c);vm.runInContext(code,c);
  return{c,elements,events,alerts,prompts,previous};
}
async function run(route,data,approval,accepted,promptCount){
  const f=fixture(data,approval),old=f.c.proben,oldPj=f.c.state.pj;
  if(route==='folder')await f.c.oeffnen({name:'26.0101 Muster'});
  if(route==='manual')f.c.importProjektJSON({target:{files:[{}],value:'selected'}});
  if(route==='archive')f.c.projektArchivOeffnen(0);
  assert.equal(f.prompts.filter(m=>m.includes('keine Projektnummer')).length,promptCount,route);
  if(accepted){assert.equal(f.c.proben[0].z2,'FREMDES PROJEKT');assert.equal(f.elements.get('proj-nr').value.trim(),String(data.projekt?.nr??'').trim()||'26.0101');assert.ok(f.events.includes('saved'));assert.equal(f.c.speicherKontextRevision,11);assert.deepEqual(f.alerts,[]);}
  else{assert.equal(f.c.proben,old);assert.equal(f.c.state.proj,f.previous);assert.equal(f.c.state.pj,oldPj);assert.equal(f.elements.get('proj-nr').value,'26.0101');assert.equal(f.c.speicherKontextRevision,10);assert.deepEqual(f.events,[]);}
  if(data.projekt?.nr==='26.0999'){assert.equal(f.alerts.length,1);assert.match(f.alerts[0],/blockiert/);assert.match(f.alerts[0],/26\.0999/);assert.match(f.alerts[0],/26\.0101/);}
  checks++;
}
(async()=>{
 for(const route of ['folder','manual','archive']){
  const data=nr=>({version:'4.30.10',projekt:{nr},proben:[{id:1,_nr:1,z2:'FREMDES PROJEKT',matrix:'Wischprobe'}]});
  await run(route,data('26.0101'),false,true,0);
  await run(route,data(' 26.0101 '),false,true,0);
  // Adresse im Feld „Projektnummer“ (ältere Projekte): gleiche Nummer wird geöffnet, andere Nummer bleibt blockiert.
  await run(route,data('26.0101 Stegerwaldstraße Leverkusen'),false,true,0);
  await run(route,data('26.0101_Stegerwaldstraße_Leverkusen'),false,true,0);
  await run(route,data('26.0999 Stegerwaldstraße Leverkusen'),true,false,0);
  await run(route,data('26.01010'),true,false,0);
  await run(route,data('PAK'),true,false,0);
  // Selbst ein pauschales OK darf eine bekannte fremde Nummer nicht freigeben.
  await run(route,data('26.0999'),true,false,0);
  for(const legacy of [data(''),data('   '),{proben:data('').proben}]){
   await run(route,legacy,false,false,1);
   await run(route,legacy,true,true,1);
  }
 }
 // Bestätigte alte Datei überschreibt keine andere, in der Oberfläche verbliebene Nummer.
 const legacy=fixture({proben:[{id:1,z2:'ALTDATEI'}]},true);legacy.elements.get('proj-nr').value='26.0888';
 legacy.c.importProjektJSON({target:{files:[{}],value:''}});assert.equal(legacy.elements.get('proj-nr').value,'26.0101');checks++;
 // Ohne verbundenen Projektordner bleiben eigenständige JSON-Dateien lesbar.
 const standalone=fixture({projekt:{nr:'26.0999'},proben:[{id:1}]});standalone.c.state.proj=null;
 standalone.c.importProjektJSON({target:{files:[{}],value:''}});assert.equal(standalone.elements.get('proj-nr').value,'26.0999');assert.equal(standalone.prompts.length,1);checks++;
 // Ein bislang ordnerloser Altstand darf auch beim Verbinden mit einem leeren Ordner nicht still zugeordnet werden.
 for(const approval of [false,true]){
  const f=fixture({},approval),old=f.c.proben;f.c.neuesteDaten=async()=>null;f.elements.get('proj-nr').value='';
  await f.c.oeffnen({name:'26.0101 Muster'});assert.equal(f.prompts.length,1);assert.match(f.prompts[0],/keine Projektnummer/);assert.equal(f.c.proben,old);
  assert.equal(f.elements.get('proj-nr').value,approval?'26.0101':'');assert.equal(f.c.state.proj===f.previous,!approval);checks++;
 }
 // Beim ausdrücklich gewählten Neustart im leeren Zielordner bleibt keine fremde Nummer stehen.
 const empty=fixture({},true);empty.c.neuesteDaten=async()=>null;empty.elements.get('proj-nr').value='26.0999';
 await empty.c.oeffnen({name:'26.0101 Muster'});assert.equal(empty.c.proben.length,0);assert.equal(empty.elements.get('proj-nr').value,'26.0101');checks++;
 console.log(`OK F1: ${checks} Projektzuordnungs-Prüfungen (Ordner, JSON, Archiv)`);
})().catch(e=>{console.error(e);process.exitCode=1;});
