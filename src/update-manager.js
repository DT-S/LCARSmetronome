// Offline app updates are an explicit action, not a button that only works
// during the brief moment a service worker happens to be "waiting".
export function waitForActivation(worker,timeout=8000){
 if(worker.state==='activated')return Promise.resolve(true);
 if(worker.state==='redundant')return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);worker.removeEventListener?.('statechange',onChange);resolve(ok);};
  const onChange=()=>{if(worker.state==='activated')finish(true);else if(worker.state==='redundant')finish(false);};
  worker.addEventListener('statechange',onChange);
  const timer=setTimeout(()=>finish(worker.state==='activated'),timeout);
  onChange();
 });
}

export function installUpdateManager({serviceWorker,button,status,notify,isBusy,reload,online}){
 if(!serviceWorker){
  button.hidden=true;
  status.textContent='Service workers unavailable in this browser.';
  return {ready:Promise.resolve(null)};
 }
 let registration=null,checking=false,needsReload=false,reloading=false;
 const reloadOnce=()=>{if(reloading)return;reloading=true;reload();};
 const draw=()=>{
  button.hidden=false;
  button.disabled=checking;
  button.textContent=checking?'CHECKING FOR UPDATES…':needsReload?'RELOAD TO APPLY':
   registration?.waiting?'INSTALL UPDATE & RELOAD':'CHECK FOR UPDATES / RELOAD';
 };
 const tracked=new WeakSet();
 const track=worker=>{
  if(!worker||tracked.has(worker))return;
  tracked.add(worker);
  worker.addEventListener('statechange',()=>{
   if(worker.state==='activated')needsReload=true;
   draw();
  });
 };
 const activate=async worker=>{
  track(worker);
  try{worker.postMessage('ACTIVATE');}
  catch{notify('Could not activate the update. Close and reopen the app.','Warningsound');return;}
  if(await waitForActivation(worker)){
   needsReload=true;
   reloadOnce();
  }else{
   notify('Update could not activate. Close other app windows and try again.','Warningsound');
  }
 };
 serviceWorker.addEventListener('controllerchange',()=>{
  needsReload=true;
  draw();
  // Never reload automatically during practice or while editing a session.
 });
 draw();
 const ready=serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async r=>{
  registration=r;
  track(r.waiting);
  track(r.installing);
  r.addEventListener('updatefound',()=>{track(r.installing);draw();});
  draw();
  try{
   await serviceWorker.ready;
   status.textContent='Offline resources cached. Installed under this URL.';
  }catch{status.textContent='Offline resources unavailable. Check the connection.';}
  // Do not wait up to 24 hours for the browser's periodic update check.
  if(online())r.update().catch(()=>{});
  return r;
 }).catch(()=>{
  status.textContent='Offline installation failed. Use HTTPS or localhost and reload online.';
  notify('Update service unavailable. Check your connection.','Warningsound');
  return null;
 });
 button.onclick=async()=>{
  if(isBusy())return notify('Stop playback or imports before updating.','Warningsound');
  const r=registration||await ready;
  if(!r)return notify('Update service unavailable. Try again online.','Warningsound');
  if(needsReload)return reloadOnce();
  if(!online())return notify('Connect to the internet to check for updates.','Warningsound');
  if(checking)return;
  checking=true;draw();
  try{
   if(r.waiting){await activate(r.waiting);return;}
   await r.update();
   if(r.waiting){await activate(r.waiting);return;}
   const worker=r.installing;
   if(worker){
    track(worker);
    // A freshly found worker may still be downloading the offline files.
    const activated=await waitForActivation(worker);
    if(r.waiting){await activate(r.waiting);return;}
    if(activated||needsReload){needsReload=true;reloadOnce();}
    else notify('Update still installing. Retry in a moment.','Warningsound');
    return;
   }
   // This also fixes the formerly inert button when the new worker is already
   // active but the currently displayed HTML/JS has not been reloaded.
   notify('Update check finished. Reloading the app.');
   reloadOnce();
  }catch{
   notify('Update check failed. Check your internet connection.','Warningsound');
  }finally{checking=false;draw();}
 };
 return {ready};
}
