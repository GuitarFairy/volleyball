/** Non-interactive overlay: never intercept record clicks or context menus. */
export function attachPlayerHover(grid,wrap){
 const hint=document.createElement('div');hint.id='playerHover';hint.className='player-hover';hint.hidden=true;hint.setAttribute('aria-hidden','true');document.body.append(hint);
 let highlighted=null;
 const hide=()=>{hint.hidden=true;highlighted?.classList.remove('hover-player');highlighted=null;};
 const move=e=>{if(hint.hidden)return;const width=hint.offsetWidth,height=hint.offsetHeight;hint.style.left=Math.max(4,Math.min(e.clientX+14,window.innerWidth-width-8))+'px';hint.style.top=Math.max(4,e.clientY+height+22>window.innerHeight?e.clientY-height-12:e.clientY+18)+'px';};
 grid.addEventListener('pointerover',e=>{const cell=e.target.closest('td[data-row]'),row=cell?.closest('[data-player-row]');if(!row){hide();return;}if(highlighted!==row){highlighted?.classList.remove('hover-player');highlighted=row;row.classList.add('hover-player');}const name=row.querySelector('.player-name')?.textContent||'',position=row.querySelector('[data-position]')?.value||'';hint.textContent=position?`${name} · ${position}`:name;hint.hidden=false;move(e);});
 grid.addEventListener('pointermove',move);grid.addEventListener('pointerleave',hide);grid.addEventListener('focusin',hide);wrap.addEventListener('scroll',hide,{passive:true});window.addEventListener('blur',hide);window.addEventListener('resize',hide);new MutationObserver(hide).observe(grid,{childList:true});
}
