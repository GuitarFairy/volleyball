import {rawKeys} from '../dist/repository.js';
import {completeGame} from '../dist/services.js';
const bad=message=>{throw new Response(message,{status:400})};
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(v);
const unique=(xs,key)=>new Set(xs.map(x=>x[key])).size===xs.length;
export function validateData(input){
 if(!input||input.version!==2||!Array.isArray(input.players)||!Array.isArray(input.games))bad('백업 데이터 형식이 올바르지 않습니다.');
 const db=structuredClone(input);
 if(!unique(db.players,'id')||!unique(db.games,'id'))bad('중복 ID를 확인하세요.');
 for(const p of db.players)if(!id(p.id)||typeof p.name!=='string'||!p.name.trim())bad('선수 정보가 올바르지 않습니다.');
 for(const g of db.games){
  if(!id(g.id)||![1,3,5].includes(g.maxSets)||!Array.isArray(g.roster)||!Array.isArray(g.sets)||g.sets.length!==g.maxSets||!unique(g.roster,'playerId'))bad('경기 정보가 올바르지 않습니다.');
  const ids=new Set(g.roster.map(p=>p.playerId));
  if([...ids].some(x=>!id(x)))bad('선수 ID가 올바르지 않습니다.');
  for(const roster of [g.roster,...(g.setRosters||[])]){if(!Array.isArray(roster)||!unique(roster,'playerId')||roster.some(p=>!ids.has(p.playerId)))bad('세트 명단이 올바르지 않습니다.');const court=roster.filter((p,i)=>p.role?p.role==='court':i<9);if(court.length>9)bad('코트는 최대 9명입니다.');const positions=court.map(p=>p.courtPosition).filter(x=>x!==undefined&&x!==null);if(new Set(positions).size!==positions.length)bad('코트 위치가 중복됩니다.');}
  for(const s of g.sets){
   if(!s.players||!Array.isArray(s.score)||s.score.length!==2||!Array.isArray(s.opponent)||s.opponent.length!==7||[...s.score,...s.opponent].some(v=>!Number.isSafeInteger(v)||v<0))bad('점수 형식이 올바르지 않습니다.');
   for(const [pid,raw]of Object.entries(s.players)){if(!ids.has(pid)||!raw||typeof raw!=='object')bad('기록 선수가 명단에 없습니다.');for(const [key,value]of Object.entries(raw)){if(!rawKeys.includes(key)){delete raw[key];continue;}if(!Number.isSafeInteger(value)||value<0)bad('기록은 0 이상의 정수여야 합니다.');}}
   for(const [setter,links]of Object.entries(s.settingLinks||{})){if(!ids.has(setter))bad('연결 선수 오류');for(const [key,targets]of Object.entries(links)){if(!['AL','AM','AN','AO','AP'].includes(key)||!Array.isArray(targets)||targets.some(t=>!ids.has(t)||t===setter))bad('토스 연결 오류');}}
  }
  if(g.status==='completed'){try{g.result=completeGame(g).result}catch(e){bad(e.message)}}
 }
 return db;
}
export async function readData(env){
 const team=env.TEAM_ID;
 // D1 batch provides one consistent transaction for revision and records.
 const [r,p,g]=await env.DB.batch([env.DB.prepare('SELECT revision FROM teams WHERE id=?').bind(team),env.DB.prepare('SELECT data FROM players WHERE team_id=? ORDER BY rowid').bind(team),env.DB.prepare('SELECT data FROM games WHERE team_id=? ORDER BY rowid').bind(team)]);
 if(!r.results.length)throw Error('Team is not provisioned');
 return {revision:r.results[0].revision,data:{version:2,players:p.results.map(x=>JSON.parse(x.data)),games:g.results.map(x=>JSON.parse(x.data))}};
}
export async function writeData(env,identity,revision,input,action='save'){
 const db=validateData(input),team=env.TEAM_ID,token=crypto.randomUUID();
 const q=(sql,...args)=>env.DB.prepare(sql).bind(...args);
 if(action!=='explicit-import'&&(input.deletePlayers||[]).length){const rows=await env.DB.batch([q('SELECT p.data FROM players p WHERE p.team_id=? AND p.id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM game_players gp WHERE gp.team_id=p.team_id AND gp.player_id=p.id)',team,JSON.stringify(input.deletePlayers))]);for(const row of rows[0].results){const p=JSON.parse(row.data);if(!db.players.some(x=>x.id===p.id))db.players.push({...p,active:false,deletedAt:new Date().toISOString()});}}
 const guard='EXISTS(SELECT 1 FROM teams WHERE id=? AND write_token=?)';
 const statements=[q('UPDATE teams SET revision=revision+1,write_token=? WHERE id=? AND revision=?',token,team,revision)];
 for(const [table,deleted]of [['games',input.deleteGames||[]],['players',input.deletePlayers||[]]]){
  if(!Array.isArray(deleted)||deleted.some(x=>!id(x)))bad('삭제 ID 오류');
  if(action==='explicit-import')statements.push(q('DELETE FROM '+table+' WHERE team_id=? AND '+guard,team,team,token));
  else {const ids=[...new Set([...deleted,...db[table].map(x=>x.id)])];if(ids.length)statements.push(q('DELETE FROM '+table+' WHERE team_id=? AND id IN (SELECT value FROM json_each(?)) AND '+guard,team,JSON.stringify(ids),team,token));}
 }
 // JSON table inserts keep 12-player/5-set games within Free-plan query limits.
 // Split large imports into bounded parameters while retaining ONE atomic batch.
 const insertRows=(table,cols,rows)=>{let chunk=[],size=2;const flush=()=>{if(!chunk.length)return;const select=cols.map((_,i)=>"json_extract(j.value,'$["+i+"]')").join(',');statements.push(q('INSERT INTO '+table+' ('+cols.join(',')+') SELECT '+select+' FROM json_each(?) j WHERE '+guard,JSON.stringify(chunk),team,token));chunk=[];size=2;};for(const row of rows){const bytes=new TextEncoder().encode(JSON.stringify(row)).length;if(bytes>1900000)bad('단일 기록이 D1 저장 한도를 초과합니다. 백업을 분리하세요.');if(size+bytes>1000000)flush();chunk.push(row);size+=bytes+1;}flush();};
 insertRows('players',['team_id','id','data'],db.players.map(p=>[team,p.id,JSON.stringify(p)]));
 insertRows('games',['team_id','id','data'],db.games.map(g=>[team,g.id,JSON.stringify(g)]));
 insertRows('game_players',['team_id','game_id','player_id','data'],db.games.flatMap(g=>g.roster.map(p=>[team,g.id,p.playerId,JSON.stringify(p)])));
 insertRows('sets',['team_id','game_id','set_index','data'],db.games.flatMap(g=>g.sets.map((s,i)=>{const {players,...meta}=s;return [team,g.id,i,JSON.stringify({...meta,roster:g.setRosters?.[i]||g.roster,note:g.setNotes?.[i]||''})]})));
 insertRows('player_set_stats',['team_id','game_id','set_index','player_id','raw'],db.games.flatMap(g=>g.sets.flatMap((s,i)=>Object.entries(s.players).map(([pid,raw])=>[team,g.id,i,pid,JSON.stringify(raw)]))));
 insertRows('audit',['id','team_id','user_id','revision','action','created_at'],[[crypto.randomUUID(),team,identity.userId,revision+1,action,Date.now()]]);
 const result=await env.DB.batch(statements);
 if(result[0].meta.changes!==1)throw new Response('다른 기기에서 수정했습니다. 미저장 백업을 내려받고 새로고침 후 다시 적용하세요.',{status:409});
 return {revision:revision+1};
}
