'use strict';
const CACHE='habit-buddy-shell-e67cdae983d9';
const FILES=['productivity.html','productivity.css','goal-map.css','personal-app.css','productivity-model.js','goal-map-model.js','goal-map.js','personal-data.js','personal-app.js','productivity.js','pwa.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
const root=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{
  // An optional icon failure must not prevent the app from opening online.
  await Promise.allSettled(FILES.map(async file=>{
    const url=new URL(file,root).href,response=await fetch(url,{cache:'reload'});
    if(!response.ok||response.redirected)throw Error('Could not cache '+file);
    await cache.put(url,response);
  }));
})));
// Do not force an update into an open session. Closing all app windows activates it safely.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('habit-buddy-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==root.origin)return;
  if(!url.pathname.startsWith(root.pathname))return;
  const name=url.pathname.slice(root.pathname.length),navigation=event.request.mode==='navigate'&&(name===''||name==='index.html'||name==='productivity.html');
  if(!navigation&&!FILES.includes(name))return;
  const key=new URL(navigation?'productivity.html':name,root).href;
  if(navigation){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok&&!response.redirected&&response.headers.get('content-type')?.includes('text/html'))caches.open(CACHE).then(cache=>cache.put(key,response.clone())).catch(()=>{});
      return response;
    }).catch(async()=>{
      const cached=await caches.match(key);if(cached)return cached;
      return new Response('Habit Buddy is offline. Reconnect once, then try again.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
    return;
  }
  event.respondWith(caches.match(key).then(cached=>cached||fetch(event.request)));
});
