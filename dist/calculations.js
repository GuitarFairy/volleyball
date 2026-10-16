export const calculatedKeys=['B','F','G','N','O','T','U','V','W','AC','AH','AI','AJ','AK'];
const ratio=(a,b)=>b ? a/b*100 : null;
export function calculate(raw,team={},sets=1){
 const s=Object.fromEntries(Array.from({length:48},(_,i)=>[col(i+1),0]));Object.assign(s,raw);
 s.B=s.C+s.E; s.F=ratio(s.D-s.E,s.B);s.G=ratio(s.B,team.B);s.N=ratio(s.H,s.H+s.I);s.O=s.H/sets;
 s.T=ratio(s.P-s.R-s.S,s.P);s.U=ratio(s.Q,s.P);s.V=ratio(s.Q-s.R-s.S,s.P);s.W=ratio(s.P,team.P);
 s.AC=s.AD+s.AE+s.AF+s.AG;s.AH=ratio(s.AD+s.AE+s.AF,s.AC);s.AI=ratio(s.AD+s.AE+s.AF-s.AG,s.AC);s.AJ=ratio(s.AE+s.AF-s.AG,s.AC);s.AK=s.AL+s.AM;return s;
}
function col(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
export function teamTotal(rows,sets=1){const raw={};for(const r of rows)for(const [k,v]of Object.entries(r))if(!calculatedKeys.includes(k))raw[k]=(raw[k]||0)+v;return calculate(raw,{},sets)}
