// Echte LabelKit-Oberfläche, synthetische Handles; läuft auch ohne native Ordner-API.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const playwright=require('playwright'),engine=process.argv[2]||'chromium';
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'));
 const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await playwright[engine].launch();
  for(const [nr,approve,accepted] of [['26.0999',true,false],['26.0101',false,true],['',false,false],['',true,true],[null,true,true]]){
   const context=await browser.newContext(),page=await context.newPage(),errors=[],dialogs=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});if(d.type()==='alert'||approve)await d.accept();else await d.dismiss();});
   await context.addInitScript(()=>localStorage.setItem('willkommen-gelesen','1'));
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   const result=await page.evaluate(async nr=>{
    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    applyProjektData({projekt:{nr:'26.0101'},proben:[{id:9,z2:'BISHERIGE PROBE',matrix:'Wischprobe'}]});markSaved('alt_Daten.json','Laboraufträge');
    const data={proben:[{id:1,z2:'FREMDES PROJEKT',matrix:'Wischprobe'}]};if(nr!==null)data.projekt={nr};
    const file=new File([JSON.stringify(data)],'26.0999_Daten.json',{lastModified:1});
    const lab={name:'Laboraufträge',async *values(){yield{kind:'file',name:file.name,getFile:async()=>file};}};
    const dir={name:'26.0101 Muster',getDirectoryHandle:async()=>lab,getFileHandle:async()=>{throw new DOMException('synthetisch','NotFoundError');}};
    const previous={nr:'26.0101',name:dir.name,lab,dir};PROJEKTORDNER.state.proj=previous;
    const snapshot=()=>{const d=JSON.parse(buildProjektSaveData().content);delete d.gespeichertAm;return JSON.stringify(d);};
    const before=snapshot(),revision=speicherKontextRevision;
    await PROJEKTORDNER.oeffnen(dir);
    return{descs:proben.map(p=>p.z2),nr:document.getElementById('proj-nr').value,unchanged:snapshot()===before,revisionUnchanged:speicherKontextRevision===revision,priorFolder:PROJEKTORDNER.state.proj===previous};
   },nr);
   assert.equal(result.nr,'26.0101');assert.deepEqual(result.descs,[accepted?'FREMDES PROJEKT':'BISHERIGE PROBE']);
   if(!accepted){assert.equal(result.unchanged,true);assert.equal(result.revisionUnchanged,true);assert.equal(result.priorFolder,true);}
   if(nr==='26.0999'){assert.equal(dialogs.length,1);assert.equal(dialogs[0].type,'alert');assert.match(dialogs[0].message,/blockiert.*26\.0999.*26\.0101/);}
   if(!nr){assert.equal(dialogs.length,1);assert.match(dialogs[0].message,/keine Projektnummer/);}
   if(nr==='26.0101')assert.equal(dialogs.length,0);
   assert.deepEqual(errors,[]);console.log(`OK F1 (${engine}): ${nr||'ohne Nummer'}, OK=${approve}, übernommen=${accepted}`);await context.close();
  }
  // 4.43.0: Rückgängig über einen Projektwechsel hinweg holte Projekt A zurück, Strg+S schrieb es in die Laboraufträge von B
  {
   const context=await browser.newContext(),page=await context.newPage(),errors=[],dialogs=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
   await context.addInitScript(()=>localStorage.setItem('willkommen-gelesen','1'));
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   const r=await page.evaluate(async()=>{
    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    const mkLab=files=>{const written={};return{name:'Laboraufträge',written,
      async *values(){for(const f of files)yield{kind:'file',name:f.name,getFile:async()=>f};},
      async getFileHandle(n){return{getFile:async()=>new File([written[n]||''],n),createWritable:async()=>({write:async c=>{written[n]=c;},close:async()=>{}})};}};};
    const mkDir=(name,lab)=>({name,getDirectoryHandle:async()=>lab,getFileHandle:async()=>{throw new DOMException('synthetisch','NotFoundError');},async *values(){}});
    const labA=mkLab([new File([JSON.stringify({projekt:{nr:'26.0101'},proben:[{id:1,z2:'KÜCHE A',matrix:'Wischprobe'}]})],'26.0101_01.10.2026_Daten.json',{lastModified:1})]);
    const labB=mkLab([new File([JSON.stringify({projekt:{nr:'26.0202'},proben:[{id:1,z2:'BAD B',matrix:'Wischprobe'}]})],'26.0202_01.10.2026_Daten.json',{lastModified:1})]);
    await PROJEKTORDNER.oeffnen(mkDir('26.0101 Muster',labA));
    undoSnapshot();proben.push({id:2,z2:'FLUR A',matrix:'Wischprobe'});markUnsaved();
    await PROJEKTORDNER.oeffnen(mkDir('26.0202 Beispiel',labB));
    const nachWechsel=proben.map(p=>p.z2);
    undoLetzteAktion();
    const nachUndo={z2:proben.map(p=>p.z2),nr:document.getElementById('proj-nr').value};
    // Projektnummer von Hand auf ein anderes Projekt geändert → Speichern in den Ordner von B wird abgelehnt
    document.getElementById('proj-nr').value='26.0101';
    await schnellSpeichern();
    const abgelehnt={written:Object.keys(labB.written),status:document.getElementById('header-save-status').textContent};
    document.getElementById('proj-nr').value='26.0202';
    await schnellSpeichern();
    return{nachWechsel,nachUndo,abgelehnt,written:Object.entries(labB.written).map(([k,v])=>[k,JSON.parse(v).projekt.nr,JSON.parse(v).proben.map(p=>p.z2)])};
   });
   assert.deepEqual(r.nachWechsel,['BAD B']);
   assert.deepEqual(r.nachUndo,{z2:['BAD B'],nr:'26.0202'},'Rückgängig holt kein anderes Projekt zurück');
   assert.deepEqual(r.abgelehnt.written,[],'nichts in den Ordner eines anderen Projekts geschrieben');
   assert.match(r.abgelehnt.status,/Nicht gespeichert.*26\.0101.*26\.0202 Beispiel/);
   assert.ok(dialogs.some(m=>/Nicht gespeichert[\s\S]*26\.0101[\s\S]*26\.0202/.test(m)));
   assert.equal(r.written.length,1);assert.equal(r.written[0][1],'26.0202');assert.deepEqual(r.written[0][2],['BAD B']);
   assert.deepEqual(errors,[]);console.log(`OK Projektwechsel (${engine}): Rückgängig bleibt im Projekt, kein Speichern in fremden Projektordner`);await context.close();
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
