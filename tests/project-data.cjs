const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('/* F7-READER-START'),end=html.indexOf('/* F7-READER-ENDE */');
if(start<0||end<start)throw Error('F7 reader missing');
const context={File,TextDecoder,setTimeout,clearTimeout};
vm.runInNewContext(html.slice(start,end)+'\nthis.api={createProjectDataReader,projectDataWarning};',context);
require('./project-data-cases.cjs')(context.api.createProjectDataReader,context.api.projectDataWarning).catch(e=>{console.error(e);process.exitCode=1;});
