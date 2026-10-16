export const linkedSettingKeys=['AL','AM'];
export function addSettingAttack(set,setterId,key,attackerId){
 if(setterId===attackerId)throw Error('자기 자신에게는 토스를 연결할 수 없습니다.');
 if(!linkedSettingKeys.includes(key)||!set.players[setterId]||!set.players[attackerId])throw Error('연결할 선수와 항목을 확인하세요.');
 const source=set.players[setterId],target=set.players[attackerId];source[key]=(source[key]||0)+1;target.P=(target.P||0)+1;
 set.settingLinks??={};set.settingLinks[setterId]??={};(set.settingLinks[setterId][key]??=[]).push(attackerId);
}
export function removeSettingAttack(set,setterId,key){
 const source=set.players[setterId];if(!source||!(source[key]>0))return false;
 source[key]--;const links=set.settingLinks?.[setterId]?.[key],attackerId=links?.pop();if(attackerId&&set.players[attackerId])set.players[attackerId].P=Math.max(0,(set.players[attackerId].P||0)-1);return true;
}
export function clearSettingLinks(set,setterId,key){if(set.settingLinks?.[setterId])delete set.settingLinks[setterId][key];}
