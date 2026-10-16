import {createRepository} from './repository.js';
export function unpackBackup(backup){
 if(backup?.format==='hwaiq-local-export-v1'){
  if(backup.v2)return backup.v2;
  if(!backup.v1?.sets?.length)throw Error('기존 백업에 경기 기록이 없습니다.');
  const values=new Map([['volleyball-record-v1',JSON.stringify(backup.v1)]]);
  const repo=createRepository({getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)});
  if(repo.getError())throw Error(repo.getError());return repo.read();
 }
 return backup?.data||backup;
}
