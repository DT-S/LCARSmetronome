// P4 shared LCARS gesture ladder. This is display-only; the existing
// beat / tempo / number controls remain the sole owners of state changes.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function ladderSteps(value,min,max,radius=6){
 const center=clamp(Math.round(value),min,max);
 return Array.from({length:radius*2+1},(_,i)=>{
  const offset=radius-i,v=center+offset;
  return {value:v,offset,available:v>=min&&v<=max,active:offset===0,major:offset%5===0};
 });
}
export function ladderPlacement(rect,viewportWidth,viewportHeight,guideWidth=104,guideHeight=260){
 const gap=12,edge=8;
 let x=rect.right+gap;
 if(x+guideWidth>viewportWidth-edge)x=rect.left-gap-guideWidth;
 x=clamp(x,edge,Math.max(edge,viewportWidth-guideWidth-edge));
 const y=clamp(rect.top+rect.height/2-guideHeight/2,edge,
   Math.max(edge,viewportHeight-guideHeight-edge));
 return {left:x,top:y};
}
export function createGestureGuide(doc=document){
 const root=doc.createElement('div');root.className='gesture-guide';root.setAttribute('aria-hidden','true');
 const title=doc.createElement('div');title.className='gesture-guide-heading';
 const value=doc.createElement('output');value.className='gesture-guide-value';
 const ladder=doc.createElement('div');ladder.className='gesture-guide-rungs';
 const rows=Array.from({length:13},()=>{
  const item=doc.createElement('div');item.className='gesture-guide-rung';
  const line=doc.createElement('span');line.className='gesture-guide-tick';
  const number=doc.createElement('span');number.className='gesture-guide-number';
  item.append(line,number);ladder.append(item);
  return {item,number};
 });
 root.append(title,value,ladder);doc.body.append(root);
 let active=false,min=0,max=20,units='',lastValue=null;
 const update=n=>{
  if(!active)return;
  lastValue=Math.round(n);
  value.textContent=units==='BPM'?`${lastValue} BPM`:`${lastValue}`;
  const values=ladderSteps(lastValue,min,max);
  values.forEach((tick,i)=>{
   const row=rows[i];
   row.item.hidden=!tick.available;
   row.item.classList.toggle('is-current',tick.active);
   row.item.classList.toggle('is-major',tick.major);
   row.number.textContent=tick.available && (tick.active||tick.major) ? String(tick.value):'';
  });
 };
 const hide=()=>{active=false;root.classList.remove('is-visible');};
 const show=(anchor,n,minimum,maximum,label='VALUE',unit='')=>{
  if(!anchor?.isConnected)return;
  min=minimum;max=maximum;units=unit;title.textContent=label;
  const rect=anchor.getBoundingClientRect();
  if(!rect.width&&!rect.height)return;
  const p=ladderPlacement(rect,window.innerWidth,window.innerHeight);
  root.style.left=`${p.left}px`;root.style.top=`${p.top}px`;
  active=true;root.classList.add('is-visible');update(n);
 };
 window.addEventListener('blur',hide);
 return {show,update,hide,element:root};
}
