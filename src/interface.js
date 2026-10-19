export const UI_SCALES=[.7,.8,.9,1,1.1];
export const defaultInterfaceScale = isCompactViewport => isCompactViewport ? .9 : 1;
export function activationSound(control){
 if(control.dataset.tab)return control.classList.contains('active')?'buttonpress':'switchingmenus';
 if(control.dataset.mode)return control.getAttribute('aria-pressed')==='true'?'buttonpress':'switchingmenus';
 return 'buttonpress';
}
export function installFeedback(root,{unlock,audio,state}){
 const selector='button,summary,label.file-button,.sound-drop,input[type=checkbox],label:has(input[type=checkbox]),[role=button]';
 const controlFor=target=>{const c=target.closest?.(selector);return c&&!c.disabled&&c.getAttribute('aria-disabled')!=='true'?c:null;};
 let press=null,hoverAt=0,labelClick=null;
 const clear=()=>{press?.control?.classList.remove('touch-pressed');press=null;};
 root.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const c=controlFor(e.target);clear();
  const token={id:e.pointerId,control:c,x:e.clientX,y:e.clientY};press=token;
  if(c&&e.pointerType!=='mouse')c.classList.add('touch-pressed');
  // Resume in the original gesture; don't play a late hover after release/scroll.
  unlock().then(()=>audio.loading).then(()=>{if(press===token&&c&&e.pointerType!=='mouse'&&state().hoverEnabled)audio.ui('hoversound',state());}).catch(()=>{});
 },{capture:true});
 root.addEventListener('pointerup',clear,{capture:true});root.addEventListener('pointercancel',clear,{capture:true});
 root.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)clear();},{passive:true});
 root.addEventListener('pointerover',e=>{const c=controlFor(e.target);if(e.pointerType==='mouse'&&c&&!c.contains(e.relatedTarget)&&state().hoverEnabled&&performance.now()-hoverAt>100){hoverAt=performance.now();audio.ui('hoversound',state());}});
 root.addEventListener('click',e=>{
  const c=controlFor(e.target);if(!c)return;
  // Labels generate another click on their input; sound only once.
  if(c.tagName==='LABEL'){if(e.target.tagName==='INPUT'&&labelClick?.control===c&&performance.now()-labelClick.time<80){labelClick=null;return;}if(e.target.tagName!=='INPUT')labelClick={control:c,time:performance.now()};}
  if(c.tagName==='LABEL'&&c.querySelector('input[type=checkbox]'))return;
  if(c.closest('.sound-choices'))return; // These buttons already preview the instrument.
  const sound=activationSound(c); // Capture before tab/mode handlers mutate state.
  unlock().then(()=>audio.loading).then(()=>audio.ui(sound,state())).catch(()=>{});
  if(state().haptic)globalThis.navigator?.vibrate?.(8);
 },{capture:true});
 return {clear};
}
