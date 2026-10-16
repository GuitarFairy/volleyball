import {readData,writeData} from './data.js';
const cookieName='__Host-hwaiq';
const oauthCookie='__Host-hwaiq-oauth';
const now=()=>Date.now();
const random=()=>crypto.randomUUID()+crypto.randomUUID();
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const cookie=(req,name)=>req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
const setCookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const json=(value,status=200)=>Response.json(value,{status});
const deny=(status,message)=>{throw new Response(message,{status})};
function origin(req,env){if(new URL(req.url).origin!==env.APP_ORIGIN)deny(400,'운영 주소 설정이 일치하지 않습니다.');}
async function session(req,env){
 const token=cookie(req,cookieName);if(!token)return null;
 const s=await env.DB.prepare('SELECT s.user_id,s.csrf,s.expires_at,u.login FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').bind(await hash(token)).first();
 if(!s||s.expires_at<=now())return null;
 const membership=await env.DB.prepare('SELECT role FROM memberships WHERE team_id=? AND user_id=?').bind(env.TEAM_ID,s.user_id).first();
 return {userId:s.user_id,login:s.login,csrf:s.csrf,role:membership?.role};
}
async function login(req,env){
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)deny(503,'GitHub OAuth 설정이 필요합니다.');
 const state=random(),verifier=random(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await env.DB.batch([env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(now()),env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),env.DB.prepare('INSERT INTO oauth_states(state_hash,verifier,expires_at) VALUES(?,?,?)').bind(await hash(state),verifier,now()+600000)]);
 const url=new URL('https://github.com/login/oauth/authorize');url.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:env.APP_ORIGIN+'/api/auth/callback',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'});
 return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':setCookie(oauthCookie,state,600)}});
}
async function callback(req,env){
 const url=new URL(req.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
 if(!state||state!==cookie(req,oauthCookie)||!code)deny(400,'로그인 확인 실패. 다시 로그인하세요.');
 const row=await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING verifier').bind(await hash(state),now()).first();
 if(!row)deny(400,'로그인 요청이 만료되었거나 이미 사용됐습니다.');
 const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:env.APP_ORIGIN+'/api/auth/callback',code_verifier:row.verifier})});
 const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)deny(401,'GitHub 로그인 실패');
 const who=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/vnd.github+json','User-Agent':'hwaiq-volleyball'}});
 const user=await who.json();if(!who.ok||!Number.isSafeInteger(user.id)||typeof user.login!=='string')deny(401,'사용자 확인 실패');
 const userId=String(user.id),opaque=random(),csrf=random(),old=cookie(req,cookieName);
 const statements=[env.DB.prepare('INSERT INTO users(id,login) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login').bind(userId,user.login)];
 if(old)statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(old)));
 statements.push(env.DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await hash(opaque),userId,csrf,now()+8*3600000));
 await env.DB.batch(statements);
 const membership=await env.DB.prepare('SELECT role FROM memberships WHERE team_id=? AND user_id=?').bind(env.TEAM_ID,userId).first();
 const headers=new Headers({Location:membership?'/':'/login?denied=1'});headers.append('Set-Cookie',setCookie(cookieName,opaque,8*3600));headers.append('Set-Cookie',setCookie(oauthCookie,'',0));
 return new Response(null,{status:302,headers});
}
async function handle(req,env){
 origin(req,env);const path=new URL(req.url).pathname,method=req.method;
 if(path==='/login'&&method==='GET')return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>화이큐 로그인</title><body style="background:#f6f3ee;color:#5c3824;font:18px system-ui;padding:10vh 12vw"><h1>화이큐 배구 기록</h1><p id="loginInfo">허용된 팀 계정으로 로그인하세요.</p><a href="/api/auth/login">GitHub로 로그인</a><script type="module" src="/login.js"></script></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
 if(path==='/login.js'&&method==='GET')return env.ASSETS.fetch(req);
 if(path==='/api/auth/login'&&method==='GET')return login(req,env);
 if(path==='/api/auth/callback'&&method==='GET')return callback(req,env);
 const s=await session(req,env);
 if(!s){if(!path.startsWith('/api/')&&method==='GET')return new Response(null,{status:302,headers:{Location:'/login'}});deny(401,'로그인이 필요합니다.');}
 if(!['GET','HEAD'].includes(method)){
  if(req.headers.get('Origin')!==env.APP_ORIGIN||req.headers.get('X-CSRF-Token')!==s.csrf)deny(403,'요청 확인 실패');
  if(req.headers.get('Sec-Fetch-Site')==='cross-site')deny(403,'외부 요청 거부');
 }
 if(path==='/api/auth/logout'&&method==='POST'){
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(req,cookieName))).run();return new Response(null,{status:204,headers:{'Set-Cookie':setCookie(cookieName,'',0)}});
 }
 if(path==='/api/auth/status'&&method==='GET')return json({userId:s.userId,login:s.login,csrf:s.csrf});
 if(!s.role)deny(403,'화이큐 팀 접근 승인이 필요합니다. 관리자에게 GitHub 계정을 알려주세요.');
 if(path==='/api/session'&&method==='GET')return json(s);
 if(path==='/api/data'&&method==='GET')return json(await readData(env));
 if(path==='/api/backup'&&method==='GET')return json({format:'hwaiq-backup-v1',exportedAt:new Date().toISOString(),teamId:env.TEAM_ID,...await readData(env)});
 if((path==='/api/data'||path==='/api/import')&&method==='PUT'){
  if(Number(req.headers.get('Content-Length'))>8*1024*1024)deny(413,'백업은 8MB 이하로 나눠주세요.');
  const text=await req.text();if(new TextEncoder().encode(text).length>8*1024*1024)deny(413,'데이터가 너무 큽니다.');
  let body;try{body=JSON.parse(text)}catch{deny(400,'JSON 형식 오류')}
  if(!Number.isSafeInteger(body.revision)||body.revision<0)deny(400,'버전 누락');
  if(path==='/api/import'&&(s.role!=='admin'||body.confirmLogin!==s.login))deny(403,'관리자 본인 확인이 필요합니다.');
  return json(await writeData(env,s,body.revision,body.data,path==='/api/import'?'explicit-import':'save'));
 }
 if(path.startsWith('/api/'))deny(404,'API를 찾을 수 없습니다.');
 if(!['GET','HEAD'].includes(method))deny(405,'지원하지 않는 요청');
 return env.ASSETS.fetch(req);
}
export default {async fetch(req,env){let res;try{res=await handle(req,env)}catch(e){res=e instanceof Response?e:new Response('서버 처리에 실패했습니다. 저장 상태를 확인하세요.',{status:500});}const headers=new Headers(res.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");return new Response(res.body,{status:res.status,headers});}};
