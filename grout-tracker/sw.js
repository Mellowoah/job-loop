// Grout Tracker offline cache. Bump VERSION when you upload a changed index.html.
const VERSION='grout-v1';
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(async c=>{await c.addAll(SHELL);try{await c.add(new Request(XLSX_URL,{mode:'cors'}))}catch(_){}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
 // Serve from the phone first so it opens with no signal; refresh the copy in the background.
 e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(r,{ignoreSearch:true});
  const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  const res=await net;if(res)return res;
  if(r.mode==='navigate'){const idx=await c.match('index.html');if(idx)return idx}
  return new Response('',{status:504})}))});
