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
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
