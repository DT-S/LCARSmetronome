let connection;
export async function db() {
  if(connection) return connection;
  connection=await new Promise((resolve,reject)=>{const r=indexedDB.open('lcars-metronome',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  return connection;
}
export async function read() {const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('data').objectStore('data').get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function write(value) {const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('data','readwrite');t.objectStore('data').put(structuredClone(value),'state');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
export function download(name,content,type='application/json') {const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
