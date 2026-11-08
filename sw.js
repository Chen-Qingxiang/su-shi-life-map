/* Cache public reading data and shell only; remote map tiles / APIs are network-only. */
const VERSION="2026-11-09-a";
const SHELL="su-shi-map-shell-"+VERSION;
const LEAFLET="su-shi-map-leaflet-v1";
const ROOT=new URL(self.registration.scope);
const CORE=["index.html","src/styles.css","src/wikisource-reader.css","src/workbench.css","data/su-shi-life-locations.js","data/historical-regimes-1080.js","data/historical-regime-boundaries-1080.js","data/physical-waterways.js","data/hydrorivers-major.js","data/hydrorivers-tributaries.js","data/hydrorivers-regional.js","data/named-rivers.js","data/major-mountain-systems.js","data/named-mountain-ridges.js","data/sushi-people.js","data/sushi-relations.js","data/sushi-events.js","data/sushi-works.js","data/sushi-journeys.js","data/sushi-journey-visits.js","data/sushi-journey-segments.js","data/sushi-journey-works.js","data/sushi-journeys-chapters-02-03.js","data/sushi-journey-chapter-02.js","data/sushi-journey-chapter-03.js","data/sushi-journeys-chapters-04-14.js","data/sushi-journey-chapter-04.js","data/sushi-journey-chapter-05.js","data/sushi-journey-chapter-06.js","data/sushi-journey-chapter-07.js","data/sushi-journey-chapter-08.js","data/sushi-journey-chapter-09.js","data/sushi-journey-chapter-10.js","data/sushi-journey-chapter-11.js","data/sushi-journey-chapter-12.js","data/sushi-journey-chapter-13.js","data/sushi-journey-chapter-14.js","data/sushi-knowledge.js","data/sushi-local-work-texts.js","src/config.js","src/data.js","src/knowledge.js","src/popups.js","src/sidebar.js","src/map.js","src/journey-multi.js","src/journey-chapters-04-14.js","src/journey-context.js","src/knowledge-model.js","src/workbench-hooks.js","src/wikisource-reader.js","src/main.js","src/workbench.js","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png","pwa-register.js"];
const CORE_URLS=CORE.map(x=>new URL(x,ROOT).href);
const CORE_SET=new Set(CORE_URLS);
const EXTERNAL=new Set(["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png","https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png","https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"]);
const HOME=new URL("index.html",ROOT).href;
async function networkFirst(req,cacheName,key=req){
 const cache=await caches.open(cacheName);
 try{
  const response=await fetch(req);
  if(response.ok&&response.type==="basic") await cache.put(key,response.clone());
  return response;
 }catch(error){const cached=await cache.match(key);if(cached)return cached;throw error;}
}
self.addEventListener("install",event=>event.waitUntil((async()=>{
 await (await caches.open(SHELL)).addAll(CORE_URLS);
 const cache=await caches.open(LEAFLET);
 await Promise.allSettled([...EXTERNAL].map(async url=>{
  const response=await fetch(url,{mode:"no-cors",credentials:"omit"});
  if(response.ok||response.type==="opaque") await cache.put(url,response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith("su-shi-map-shell-")&&k!==SHELL).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(EXTERNAL.has(url.href)){
   event.respondWith((async()=>{
    const cache=await caches.open(LEAFLET);
    try{const response=await fetch(req);if(response.ok||response.type==="opaque")await cache.put(req,response.clone());return response}
    catch(error){return await cache.match(req)||Response.error()}
   })());
   return;
 }
 if(url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(req.mode==="navigate"){
   if(url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+"index.html")
     event.respondWith(networkFirst(req,SHELL,HOME));
   return;
 }
 const key=new URL(url.href);key.search="";key.hash="";
 if(CORE_SET.has(key.href))event.respondWith(networkFirst(req,SHELL,key.href));
 // Intentionally skip remote OSM/Esri tiles, Wikisource content, imported files.
});
