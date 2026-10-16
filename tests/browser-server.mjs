// Isolated browser fixture. Not imported into the production Worker.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import worker,{hash} from '../server/worker.js';
import {database} from './d1-adapter.js';
import {makePlayer,makeGame} from '../dist/services.js';
import {writeData} from '../server/data.js';
const origin='http://localhost:8765',DB=database();
await DB.prepare('INSERT INTO users VALUES(?,?)').bind('fixture','FixtureRecorder').run();
await DB.prepare('INSERT INTO memberships VALUES(?,?,?)').bind('hwaiq','fixture','admin').run();
await DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash('fixture'),'fixture','fixture-csrf',Date.now()+3600000).run();
const env={DB,APP_ORIGIN:origin,TEAM_ID:'hwaiq',ASSETS:{async fetch(req){const file=decodeURIComponent(new URL(req.url).pathname).replace(/^\//,'')||'index.html';if(file.includes('..'))return new Response('',{status:400});try{const content=await fs.readFile(new URL('../dist/'+file,import.meta.url));const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'}[path.extname(file)]||'text/plain';return new Response(content,{headers:{'Content-Type':mime}})}catch{return new Response('Not found',{status:404})}}}};
const players=Array.from({length:12},(_,i)=>makePlayer({name:'검증선수'+(i+1),position:i?'L':'S',number:i+1}));const game=makeGame({date:'2026-10-16',opponent:'검증 상대',competition:'격리 브라우저 검증',format:'best_of_3'},players,players.map(p=>p.id));await writeData(env,{userId:'fixture'},0,{version:2,players,games:[game]});
http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const headers=new Headers(req.headers);headers.set('Cookie','__Host-hwaiq=fixture');const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('fixture failure');}}).listen(8765,'127.0.0.1',()=>console.log('Isolated fixture '+origin+' /record.html?game='+game.id));
