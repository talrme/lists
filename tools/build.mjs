import {mkdir,writeFile} from 'node:fs/promises';
const designs=[
 ['Clear Day','Quiet, crisp, and green. A familiar daily list.','#edf5ee'],
 ['Ticket Office','Bold yellow paper, punchy type, tear-off tasks.','#f8e36d'],
 ['High Tide','Airy blue, generous rows, a floating daily panel.','#d9eef1'],
 ['The Edit','Black ink, serif type, almost no decoration.','#f8f8f4'],
 ['Little Wins','Soft multicolor notes with a playful rhythm.','#f8dedc'],
 ['Command Line','A compact, dark, keyboard-era checklist.','#1d2922'],
 ['Daybook','Ruled paper and a handwritten-ledger feeling.','#e6e9e3'],
 ['Metro','Tasks as stops on a simple blue line.','#e2ebf8'],
 ['Block Party','Chunky outlines, offset shadows, bright colors.','#c8e4f7'],
 ['After Hours','Warm dark surfaces, peach highlights, quieter type.','#2b272e'],
];
await mkdir('assets',{recursive:true});
for(let i=0;i<designs.length;i++){
 const number=String(i+1).padStart(2,'0');await mkdir(`staging/${number}`,{recursive:true});
 await writeFile(`staging/${number}/index.html`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="${designs[i][2]}"><meta name="description" content="Private and shared lists for Tal and Sophie."><title>Lists · ${designs[i][0]}</title><link rel="icon" type="image/png" href="../../assets/icon-32.png"><link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="../../shared/styles.css?v=1"><script defer src="../../shared/vendor/lucide.min.js"></script><script defer src="../../shared/vendor/qrcode.min.js"></script><script type="module" src="../../shared/app.js?v=2"></script></head><body data-design="${i+1}"><div id="app"></div><noscript>Enable JavaScript to use Lists.</noscript></body></html>\n`);
 await writeFile(`staging/${number}/manifest.webmanifest`,JSON.stringify({name:'Lists',short_name:'Lists',id:`./?mode=live`,start_url:'./?mode=live',scope:'./',display:'standalone',background_color:designs[i][2],theme_color:designs[i][2],icons:[{src:'../../assets/icon-192.png',sizes:'192x192',type:'image/png'},{src:'../../assets/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]},null,2)+'\n');
}
await writeFile('index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#eef5f0"><title>Lists · Pick a design</title><link rel="icon" href="assets/icon-32.png"><link rel="apple-touch-icon" href="assets/apple-touch-icon.png"><link rel="stylesheet" href="shared/gallery.css"></head><body><main><header><img src="assets/icon-192.png" width="40" height="40" alt=""><h1>Lists</h1></header><p class="intro">Ten directions. One shared life.</p><p class="notice">Each preview uses clearly labeled sample tasks saved on this device. Firebase sign-in is separate and stays locked until configured.</p><div class="design-grid">${designs.map(([name,description,color],i)=>{const n=String(i+1).padStart(2,'0');return `<article><a class="preview design-${i+1}" href="staging/${n}/" style="--preview:${color}" aria-label="Try ${name}"><span class="preview-top">Lists <small>${n}</small></span><strong>${i===4?'Little wins.':i===5?'> today':i===3?'To do, today.':'Today'}</strong><span class="preview-row"><b></b><em></em></span><span class="preview-row"><b></b><em></em></span><span class="preview-row short"><b></b><em></em></span><span class="preview-nav">✓ &nbsp; ◇ &nbsp; ▷ &nbsp; ≡</span></a><div class="caption"><span class="number">${n}</span><h2>${name}</h2></div><p>${description}</p><div class="links"><a href="staging/${n}/">Try sandbox <span>↗</span></a><a href="staging/${n}/?mode=live">Google sign-in</a></div></article>`;}).join('')}</div><footer><a href="https://github.com/talrme/lists/blob/main/FIREBASE_SETUP.md">Firebase setup, step by step</a><span>Tal & Sophie</span></footer></main></body></html>\n`);
console.log('Built ten staging apps, manifests and design chooser.');
