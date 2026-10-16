import {connectRepository} from './api-repository.js';
import {unpackBackup} from './import-backup.js';
const banner=document.createElement('div');banner.setAttribute('role','status');banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#fff8dc;color:#5c3824;padding:8px 20px;display:flex;gap:12px;align-items:center;font:14px system-ui';document.body.append(banner);
const message=document.createElement('span');message.textContent='팀 기록을 불러오는 중…';banner.append(message);
const download=(data,name)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let departing=false;
try{
 const repo=await connectRepository({onStatus:({pending,error})=>{message.textContent=error||(pending?`서버 저장 중 (${pending}) — 화면을 닫지 마세요`:'서버 저장 완료');message.setAttribute('role',error?'alert':'status');const saved=document.querySelector('#saved');if(saved)saved.textContent=error||(pending?'서버 저장 중':'서버 저장 완료');},onAuth:status=>{departing=true;document.querySelector('#content')?.replaceChildren();document.querySelector('#grid')?.replaceChildren();if(status===403){location.replace('/login?denied=1')}else location.replace('/login');}});
 message.textContent=`${repo.identity.login} · 팀 서버 연결됨`;
 function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action()}catch(e){message.textContent=e.message;message.setAttribute('role','alert')}};banner.append(b);}
 button('백업 다운로드',()=>download(repo.backup(),'hwaiq-backup.json'));
 if(repo.identity.role==='admin')button('백업 가져오기',()=>{const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const backup=JSON.parse(await input.files[0].text());const data=unpackBackup(backup);const login=prompt(`현재 로그인: ${repo.identity.login}\n가져올 기록 ${data.games?.length||0}경기 / ${data.players?.length||0}명.\n현재 팀 기록 전체를 교체합니다. 먼저 현재 백업을 내려받으세요.\n본인 GitHub 로그인명을 입력하세요.`);if(login!==repo.identity.login)return;if(!confirm('본인 소유 기록이며 팀 서버를 이 백업으로 교체하는 데 동의합니까?'))return;download(repo.backup(),'hwaiq-before-import.json');await repo.importData(data,login);location.reload();}catch(e){message.textContent='가져오기 실패: '+e.message;}};input.click();});
 button('기존 브라우저 백업',()=>{const v2=localStorage.getItem('volleyball-system-v2'),v1=localStorage.getItem('volleyball-record-v1');if(!v2&&!v1)throw Error('이 주소의 브라우저 기록이 없습니다. 기존 데모 주소에서 이관 도구를 사용하세요.');download({format:'hwaiq-local-export-v1',v2:v2?JSON.parse(v2):null,v1:v1?JSON.parse(v1):null},'hwaiq-local-original.json');});
 button('로그아웃',async()=>{try{await repo.logout()}catch(e){if(confirm(e.message+'\n미저장 백업을 다운로드하고 로그아웃합니까?')){download(repo.backup(),'hwaiq-unsaved.json');await repo.logout(true);}}});
 addEventListener('beforeunload',e=>{if(!departing&&(repo.isPending()||repo.getError())){e.preventDefault();e.returnValue='미저장 기록이 있습니다.';}});
 document.addEventListener('click',async e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||a.target||e.ctrlKey||e.metaKey)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname)return;e.preventDefault();try{await repo.flush();location.href=a.href}catch(err){message.textContent=err.message;}},true);
 document.querySelector('.aside-bottom')?.replaceChildren(document.createTextNode('기록 저장: 화이큐 팀 서버'));
 const footer=document.querySelector('footer');if(footer&&!document.querySelector('#selection'))footer.textContent='팀 서버에 저장됩니다. 전적과 누적 통계는 종료 경기를 기준으로 합니다.';
 // Refresh on return from another device/tab; never replace an active recording page.
 addEventListener('focus',async()=>{if(!location.pathname.includes('record'))try{if(await repo.refresh())dispatchEvent(new HashChangeEvent('hashchange'));}catch(e){message.textContent=e.message;}});
 setInterval(()=>repo.checkSession().catch(e=>message.textContent=e.message),60000);
 const app=document.querySelector('script[data-app]').dataset.app;await import(`./${app}`);
}catch(e){message.textContent='연결 실패: '+e.message;document.querySelector('#content')?.replaceChildren();document.querySelector('#grid')?.replaceChildren();}
