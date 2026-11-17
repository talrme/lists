const CACHE='lists-shell-offline-2';
const BASE=new URL('./',self.location.href);
const SDK='https://www.gstatic.com/firebasejs/13.3.0/';
const FILES=['','index.html','config.js','shared/app.js','shared/firebase.js','shared/device-store.js','shared/core.js','shared/task-fields.js','shared/households.js','shared/admin.js','shared/testing.js','shared/playground.js','shared/notices.js','shared/gestures.js','shared/motion.js','shared/styles.css','shared/gallery.css','shared/vendor/sortable.min.js','shared/vendor/lucide.min.js','shared/vendor/qrcode.min.js','shared/vendor/marked-18.2.1.js','shared/vendor/purify-3.4.18.min.js','assets/icon-32.png','assets/apple-touch-icon.png','assets/icon-192.png','assets/icon-512.png',...Array.from({length:10},(_,i)=>`staging/${String(i+1).padStart(2,'0')}/`).flatMap(path=>[path+'index.html',path+'manifest.webmanifest'])];
const URLS=[...FILES.map(path=>new URL(path,BASE).href),...['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(path=>SDK+path)];
const allowed=new Set(URLS);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(URLS.map(async url=>{const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('Offline files unavailable');await cache.put(url,response);}));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('lists-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);url.search='';url.hash='';
 if(url.origin===BASE.origin&&url.pathname.endsWith('/'))url.pathname+='index.html';
 if(!allowed.has(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(url.href);return saved||fetch(event.request);})());
});
