// Rhythm PADD V2 / P6 – state-triggered visual motion only.
// Never called by the audio frame, scheduler or chart value calculations.
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
 for(const page of pages){
  page.addEventListener('animationend',event=>{
   if(event.target===page&&event.animationName==='lcars-page-build')clear(page,'lcars-page-enter');
  });
  page.addEventListener('animationcancel',event=>{
   if(event.target===page)clear(page,'lcars-page-enter');
  });
 }
 let lastPage=pages.find(p=>!p.hidden)?.id||'metronome';
 function page(nextId){
  if(!shouldTransition(lastPage,nextId))return false;
  const next=root.getElementById(nextId);
  if(!next||next.hidden)return false;
  lastPage=nextId;
  for(const item of pages)if(item!==next)clear(item,'lcars-page-enter');
  run(next,'lcars-page-enter');
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
 return {page,view,mode,status};
}
