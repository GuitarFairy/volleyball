import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const [action,login,role='recorder']=process.argv.slice(2);
if(!['allow','revoke'].includes(action)||!login||!/^[a-zA-Z0-9-]{1,39}$/.test(login)||!['admin','recorder'].includes(role))throw Error('Usage: node scripts/team-admin.mjs allow|revoke GitHubLogin [admin|recorder]');
const res=await fetch('https://api.github.com/users/'+encodeURIComponent(login),{headers:{'User-Agent':'hwaiq-team-admin'}});const user=await res.json();
if(!res.ok||!Number.isSafeInteger(user.id))throw Error('GitHub 계정을 확인하지 못했습니다.');
const sql=action==='allow'?`INSERT INTO memberships(team_id,user_id,role) VALUES ('hwaiq','${user.id}','${role}') ON CONFLICT(team_id,user_id) DO UPDATE SET role=excluded.role;`:`DELETE FROM memberships WHERE team_id='hwaiq' AND user_id='${user.id}'; DELETE FROM sessions WHERE user_id='${user.id}';`;
console.log(`${action}: ${user.login} (${user.id}), ${role}`);
const r=spawnSync(process.execPath,[fileURLToPath(new URL('cloudflare.mjs',import.meta.url)),'d1','execute','hwaiq-volleyball','--remote','--command',sql],{stdio:'inherit'});process.exit(r.status??1);
