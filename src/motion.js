// Rhythm PADD V2 / P6 – state-triggered visual motion only.
// Never called by the audio frame, scheduler or chart value calculations.
export const LCARS_BOOT_DURATION_MS=1450;
export const LCARS_PAGE_BUILD_DURATION_MS=1200;
export function shouldLaunchBoot({reducedMotion=false,metronomeVisible=true}={}){
 return !reducedMotion&&metronomeVisible;
}
export function shouldTransition(previous,next){
 return typeof next==='string'&&next.length>0&&previous!==next;
}
export function createMotionController(root=document){
 const pages=[...root.querySelectorAll('.page')];
 const clear=(node,cssClass)=>node?.classList.remove(cssClass);
 const run=(node,cssClass)=>{
  if(!node)return;
  // Restart on a genuine state change, not on frames or incidental render().
  node.classList.remove(cssClass);
  void node.offsetWidth; // only one layout flush per explicit user transition
  node.classList.add(cssClass);
 };
 // Page build is a staggered multi-element sequence, not a single 210ms
 // animationend. A timer owns cleanup after the FINAL detail comes online.
 const pageTimers=new Map();
 const shell=root.querySelector('.app-shell');
 const finishPage=node=>{
  const timer=pageTimers.get(node);
  if(timer!==undefined){clearTimeout(timer);pageTimers.delete(node);}
  clear(node,'lcars-page-enter');
  // Global rails/headers must finish alongside the destination page.
  if(pageTimers.size===0)shell?.classList.remove('lcars-page-building');
 };
 let bootStarted=false,bootTimer=null;
 function finishBoot(){
  if(bootTimer!==null){clearTimeout(bootTimer);bootTimer=null;}
  shell?.classList.remove('lcars-booting');
 }
 // Called after the initial stored state has been validated and rendered.
 // An ordinary page switch or rerender never replays the boot choreography.
 function boot(){
  if(bootStarted)return false;
  bootStarted=true;
  const metronome=root.getElementById('metronome');
  const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!shell||!shouldLaunchBoot({reducedMotion:reduce,metronomeVisible:!!metronome&&!metronome.hidden}))return false;
  shell.classList.add('lcars-booting');
  bootTimer=setTimeout(finishBoot,LCARS_BOOT_DURATION_MS);
  return true;
 }
  let lastPage=pages.find(p=>!p.hidden)?.id||'metronome';
 function page(nextId){
  if(!shouldTransition(lastPage,nextId))return false;
  const next=root.getElementById(nextId);
  if(!next||next.hidden)return false;
  lastPage=nextId;
  finishBoot(); // User-initiated navigation cancels any remaining launch choreography.
  for(const item of pages)finishPage(item);
  // Respect OS motion preference for every switch, not only initial boot.
  const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce){
   run(next,'lcars-page-enter');
   shell?.classList.add('lcars-page-building');
   pageTimers.set(next,setTimeout(()=>finishPage(next),LCARS_PAGE_BUILD_DURATION_MS));
  }
  return true;
 }
 function view(next){
  if(!next||next.hidden)return;
  run(next,'lcars-view-enter');
  const finish=e=>{
   if(e.target!==next)return;
   next.classList.remove('lcars-view-enter');
   next.removeEventListener('animationend',finish);
   next.removeEventListener('animationcancel',finish);
  };
  next.addEventListener('animationend',finish);
  next.addEventListener('animationcancel',finish);
 }
 function mode(button){
  if(!button)return;
  button.classList.remove('lcars-mode-ack');
  void button.offsetWidth;
  button.classList.add('lcars-mode-ack');
  const end=e=>{
   if(e.target!==button)return;
   button.classList.remove('lcars-mode-ack');
   button.removeEventListener('animationend',end);
   button.removeEventListener('animationcancel',end);
  };
  button.addEventListener('animationend',end);
  button.addEventListener('animationcancel',end);
 }
 function status(button){
  if(!button)return;
  run(button,'lcars-status-confirm');
  const end=e=>{
   if(e.target!==button)return;
   button.classList.remove('lcars-status-confirm');
   button.removeEventListener('animationend',end);
   button.removeEventListener('animationcancel',end);
  };
  button.addEventListener('animationend',end);
  button.addEventListener('animationcancel',end);
 }
 return {page,view,mode,status,boot,finishBoot};
}
