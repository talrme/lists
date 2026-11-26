const CACHE='lists-shell-production-35';
const BASE=new URL('./',self.location.href);
const SDK='https://www.gstatic.com/firebasejs/13.3.0/';
const FILES=['','index.html','manifest.webmanifest','config.js','shared/app.js','shared/groceries.js','shared/groceries.css','shared/grocery-catalog.js','shared/grocery-core.js','shared/grocery-store.js','shared/guide.js','shared/updates.js','shared/mobile-ui.js','shared/day-groups.js','shared/search.js','shared/day-wheel.js','shared/visibility.js','shared/firebase.js','shared/device-store.js','shared/organizer.js','shared/asana-import.js','shared/asana-import-core.js','shared/asana-review.js','shared/asana-review-core.js','shared/vendor/papaparse-5.7.0.min.js','shared/tag-field.js','shared/core.js','shared/task-fields.js','shared/households.js','shared/admin.js','shared/testing.js','shared/playground.js','shared/notices.js','shared/completion-press.js','shared/gestures.js','shared/motion.js','shared/styles.css','shared/vendor/sortable.min.js','shared/vendor/lucide.min.js','shared/vendor/qrcode.min.js','shared/vendor/marked-18.2.1.js','shared/vendor/purify-3.4.18.min.js','assets/icon-32.png','assets/apple-touch-icon.png','assets/icon-192.png','assets/icon-512.png'];
FILES.push('shared/desktop-search.js','shared/waiting-board.js','shared/column-order.js');
const URLS=[...FILES.map(path=>new URL(path,BASE).href),...['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(path=>SDK+path)];
const allowed=new Set(URLS);
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
});
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
 if(event.request.mode==='navigate'&&url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname+'staging/')){const target=new URL(BASE);target.search=new URL(event.request.url).search;event.respondWith(Response.redirect(target.href,302));return;}
 if(url.origin===BASE.origin&&url.pathname.endsWith('/'))url.pathname+='index.html';
 if(!allowed.has(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(url.href);return saved||fetch(event.request);})());
});
