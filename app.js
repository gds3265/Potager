const KEY='mon-potager-v3';
let state=load();
let deferredPrompt;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function load(){try{const old=JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem('mon-potager-v2'))||JSON.parse(localStorage.getItem('mon-potager-v1'));return normalize(old)}catch{return normalize({})}}
function normalize(x){return {crops:x?.crops||[],logs:x?.logs||[],water:x?.water||[],plots:x?.plots||[],seeds:x?.seeds||[],settings:{gardenWidth:12,gardenHeight:8,planYear:new Date().getFullYear(),climateZone:'southwest',...(x?.settings||{})}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function isoToday(){return new Date().toISOString().slice(0,10)}
function fmt(d){if(!d)return'—';return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}
function cropName(id){return state.crops.find(c=>c.id===id)?.name||'Culture supprimée'}
function switchView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
$$('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));
function renderAll(){renderStats();renderCrops();renderSeeds();renderLogs();renderWater();renderYield();refreshSelects();renderPlan();renderAlerts();renderCompanionship();}
function renderStats(){
 const totalYield=state.logs.filter(l=>l.type==='Récolte').reduce((s,l)=>s+(+l.weight||0),0);
 const month=new Date().toISOString().slice(0,7);const rain=state.water.filter(w=>w.type==='Pluie'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);
 const irrigation=state.water.filter(w=>w.type==='Arrosage'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);
 $('#stats').innerHTML=[
   {icon:'🌱',value:state.crops.filter(c=>c.status!=='Terminé').length,label:'Cultures actives'},
   {icon:'🧺',value:totalYield.toFixed(1)+' kg',label:'Récolté au total',quick:'harvest',title:'Ajouter une récolte'},
   {icon:'🌧️',value:rain.toFixed(1)+' mm',label:'Pluie ce mois',quick:'rain',title:'Ajouter une pluie'},
   {icon:'💧',value:irrigation.toFixed(1)+' mm',label:'Arrosage ce mois',quick:'watering',title:'Ajouter un arrosage'}
 ].map(x=>`<div class="stat quick-stat"><span>${x.icon}</span><b>${x.value}</b><span>${x.label}</span>${x.quick?`<button type="button" class="quick-plus" data-quick="${x.quick}" aria-label="${x.title}" title="${x.title}">+</button>`:''}</div>`).join('');
 const upcoming=[...state.crops].filter(c=>c.status!=='Terminé').sort((a,b)=>(a.expected||'9999').localeCompare(b.expected||'9999')).slice(0,5);
 $('#upcoming').classList.toggle('empty',!upcoming.length);$('#upcoming').innerHTML=upcoming.length?upcoming.map(c=>`<div class="list-item"><b>${esc(c.name)} ${c.variety?'- '+esc(c.variety):''}</b><span class="meta">${esc(c.status)}${c.expected?' • récolte vers le '+fmt(c.expected):''}</span></div>`).join(''):'Aucune culture enregistrée.';
 const all=[...state.logs.map(x=>({...x,kind:'log'})),...state.water.map(x=>({...x,kind:'water'}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $('#recent').classList.toggle('empty',!all.length);$('#recent').innerHTML=all.length?all.map(x=>`<div class="list-item"><b>${x.kind==='water'?x.type:cropName(x.cropId)+' • '+x.type}</b><span class="meta">${fmt(x.date)}${x.note?' • '+esc(x.note):''}</span></div>`).join(''):'Aucune activité enregistrée.';
}
function renderCrops(){const box=$('#cropCards');if(!state.crops.length){box.innerHTML='<div class="card empty">Commence par créer ta première culture.</div>';return}box.innerHTML=state.crops.map(c=>`<article class="crop-card"><div class="crop-top"><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.variety||'Variété non précisée')}</div></div><span class="status">${esc(c.status)}</span></div><p class="meta">📍 ${esc(c.place||'Emplacement non précisé')} ${c.qty?'• '+c.qty+' plant(s)':''}</p><p><b>Semis :</b> ${fmt(c.sow)}<br><b>Plantation :</b> ${fmt(c.plant)}<br><b>Récolte prévue :</b> ${fmt(c.expected)}</p>${c.notes?`<p class="meta">${esc(c.notes)}</p>`:''}<div class="crop-actions"><button class="small" onclick="editCrop('${c.id}')">Modifier</button><button class="danger" onclick="deleteCrop('${c.id}')">Supprimer</button></div></article>`).join('')}
window.editCrop=id=>{const c=state.crops.find(x=>x.id===id);if(!c)return;$('#cropId').value=c.id;$('#cropName').value=c.name;$('#cropVariety').value=c.variety||'';$('#cropPlace').value=c.place||'';$('#cropQty').value=c.qty||'';$('#cropSow').value=c.sow||'';$('#cropPlant').value=c.plant||'';$('#cropExpected').value=c.expected||'';$('#cropStatus').value=c.status;$('#cropNotes').value=c.notes||'';$('#cropDialog h3').textContent='Modifier la culture';$('#cropDialog').showModal()}
window.deleteCrop=id=>{if(confirm('Supprimer cette culture ? Les activités resteront dans le journal.')){state.crops=state.crops.filter(c=>c.id!==id);save()}}
$('#openCrop').onclick=()=>{resetCrop();$('#cropDialog').showModal()};
function resetCrop(){$('#cropForm').reset();$('#cropId').value='';$('#cropDialog h3').textContent='Nouvelle culture'}
$('#cropForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return; e.preventDefault();const id=$('#cropId').value||uid();const c={id,name:$('#cropName').value.trim(),variety:$('#cropVariety').value.trim(),place:$('#cropPlace').value.trim(),qty:$('#cropQty').value,sow:$('#cropSow').value,plant:$('#cropPlant').value,expected:$('#cropExpected').value,status:$('#cropStatus').value,notes:$('#cropNotes').value.trim()};const i=state.crops.findIndex(x=>x.id===id);i>=0?state.crops[i]=c:state.crops.push(c);$('#cropDialog').close();save()});
function refreshSelects(){const opts=state.crops.map(c=>`<option value="${c.id}">${esc(c.name)}${c.variety?' — '+esc(c.variety):''}</option>`).join('');$('#logCrop').innerHTML=opts||'<option value="">Crée d’abord une culture</option>';const current=$('#filterCrop').value;$('#filterCrop').innerHTML='<option value="">Toutes les cultures</option>'+opts;$('#filterCrop').value=current}
$('#openLog').onclick=()=>{if(!state.crops.length){alert('Crée d’abord une culture.');switchView('cultures');return}$('#logForm').reset();$('#logDate').value=isoToday();toggleLogFields();$('#logDialog').showModal()};
$('#logType').onchange=toggleLogFields;function toggleLogFields(){const t=$('#logType').value;$('#sowingFields').classList.toggle('hidden',t!=='Semis');$('#harvestFields').classList.toggle('hidden',t!=='Récolte');$('#treatmentFields').classList.toggle('hidden',t!=='Traitement');refreshSeedLogSelect()}
$('#logForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const type=$('#logType').value,seedId=$('#logSeed').value,seedUsed=+$('#logSeedQty').value||0;state.logs.push({id:uid(),cropId:$('#logCrop').value,type,date:$('#logDate').value,weight:$('#logWeight').value,count:$('#logCount').value,product:$('#logProduct').value.trim(),dose:$('#logDose').value.trim(),note:$('#logNote').value.trim(),seedId,seedUsed});if(type==='Semis'&&seedId&&seedUsed>0){const lot=state.seeds.find(x=>x.id===seedId);if(lot)lot.quantity=Math.max(0,(+lot.quantity||0)-seedUsed)}$('#logDialog').close();save()});
$('#filterType').onchange=renderLogs;$('#filterCrop').onchange=renderLogs;
function renderLogs(){const type=$('#filterType').value,crop=$('#filterCrop').value;const arr=[...state.logs].filter(l=>(!type||l.type===type)&&(!crop||l.cropId===crop)).sort((a,b)=>b.date.localeCompare(a.date));$('#logList').innerHTML=arr.length?arr.map(l=>`<div class="timeline-item"><div class="timeline-date">${fmt(l.date)}</div><div><span class="pill">${esc(l.type)}</span><b>${esc(cropName(l.cropId))}</b><div class="meta">${l.type==='Récolte'?(l.weight?l.weight+' kg ':'')+(l.count?l.count+' unité(s) ':''):''}${l.type==='Traitement'?[l.product,l.dose].filter(Boolean).map(esc).join(' • '):''}${l.note?' • '+esc(l.note):''}</div></div><button class="delete-link" onclick="deleteLog('${l.id}')">Supprimer</button></div>`).join(''):'<div class="timeline-item empty">Aucune activité.</div>'}
window.deleteLog=id=>{if(confirm('Supprimer cette activité ?')){state.logs=state.logs.filter(l=>l.id!==id);save()}}
$('#openWater').onclick=()=>{$('#waterForm').reset();$('#waterDate').value=isoToday();$('#waterDialog').showModal()};
$('#waterForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();state.water.push({id:uid(),type:$('#waterType').value,date:$('#waterDate').value,amount:$('#waterAmount').value,area:$('#waterArea').value.trim(),note:$('#waterNote').value.trim()});$('#waterDialog').close();save()});
function renderWater(){const month=new Date().toISOString().slice(0,7);const rain=state.water.filter(w=>w.type==='Pluie'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);const irr=state.water.filter(w=>w.type==='Arrosage'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);$('#waterStats').innerHTML=[['🌧️',rain.toFixed(1)+' mm','Pluie ce mois'],['🚿',irr.toFixed(1)+' mm','Arrosage ce mois'],['💦',(rain+irr).toFixed(1)+' mm','Apport total'],['📒',state.water.length,'Mesures enregistrées']].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b><span>${x[2]}</span></div>`).join('');const arr=[...state.water].sort((a,b)=>b.date.localeCompare(a.date));$('#waterList').innerHTML=arr.length?arr.map(w=>`<div class="timeline-item"><div class="timeline-date">${fmt(w.date)}</div><div><span class="pill">${esc(w.type)}</span><b>${w.amount} mm / L·m²</b><div class="meta">${esc(w.area||'Zone non précisée')}${w.note?' • '+esc(w.note):''}</div></div><button class="delete-link" onclick="deleteWater('${w.id}')">Supprimer</button></div>`).join(''):'<div class="timeline-item empty">Aucune mesure de pluie ou d’arrosage.</div>'}
window.deleteWater=id=>{if(confirm('Supprimer cette mesure ?')){state.water=state.water.filter(w=>w.id!==id);save()}}
function renderYield(){const rows=state.crops.map(c=>{const hs=state.logs.filter(l=>l.cropId===c.id&&l.type==='Récolte');return{name:c.name,kg:hs.reduce((s,l)=>s+(+l.weight||0),0),count:hs.reduce((s,l)=>s+(+l.count||0),0)}}).filter(r=>r.kg||r.count).sort((a,b)=>b.kg-a.kg);$('#yieldTable').innerHTML=rows.length?`<div class="yield-row header"><span>Culture</span><span>Poids</span><span>Quantité</span></div>`+rows.map(r=>`<div class="yield-row"><b>${esc(r.name)}</b><span>${r.kg.toFixed(2)} kg</span><span>${r.count||'—'}</span></div>`).join(''):'<p class="empty">Aucune récolte enregistrée pour le moment.</p>'}
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sauvegarde-potager-${isoToday()}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.crops||!data.logs||!data.water)throw Error();state=normalize(data);save();alert('Sauvegarde importée.')}catch{alert('Fichier de sauvegarde non valide.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Effacer définitivement toutes les données de ce potager ?')){state=normalize({});save()}};
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e});
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isAndroid(){return /android/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function openInstallDialog(){
 const ios=isIOS(), android=isAndroid();
 $('#iosInstallHelp').classList.toggle('hidden',!ios);
 $('#androidInstallHelp').classList.toggle('hidden',!android);
 $('#installNativeHelp').classList.toggle('hidden',ios||android);
 $('#nativeInstallBtn').classList.toggle('hidden',ios||(!deferredPrompt&&!android));
 $('#installDialog').showModal();
}
$('#installBtn').onclick=openInstallDialog;
$('#nativeInstallBtn').onclick=async()=>{if(!deferredPrompt){openInstallDialog();return}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installDialog').close()};
window.addEventListener('appinstalled',()=>{$('#installBtn').classList.add('hidden')});
if(isStandalone())$('#installBtn').classList.add('hidden');
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(r=>r.update()).catch(()=>{});

// PLAN INTERACTIF
function exposureIcon(v){return v==='Ombre'?'🌳':v==='Mi-ombre'?'⛅':'☀️'}
function typeIcon(v){return {'Serre':'🏡','Allée':'🟫','Compost':'♻️','Point d’eau':'💧','Arbre fruitier':'🌳','Parcelle':'🌱'}[v]||'🌱'}
function planYears(){const y=new Date().getFullYear();return [y-1,y,y+1,y+2]}
function refreshPlanControls(){
 const sel=$('#planYear'); if(!sel)return;
 const current=String(state.settings.planYear||new Date().getFullYear());
 sel.innerHTML=planYears().map(y=>`<option value="${y}">${y}</option>`).join(''); sel.value=current;
 $('#gardenWidth').value=state.settings.gardenWidth||12; $('#gardenHeight').value=state.settings.gardenHeight||8;
 const cropSel=$('#plotCrop'); const keep=cropSel.value;
 cropSel.innerHTML='<option value="">Aucune culture</option>'+state.crops.map(c=>`<option value="${c.id}">${esc(c.name)}${c.variety?' — '+esc(c.variety):''}</option>`).join(''); cropSel.value=keep;
}
function fitGardenPlan(){
 const plan=$('#gardenPlan');
 if(!plan)return;
 const gw=Math.max(2,+state.settings.gardenWidth||12), gh=Math.max(2,+state.settings.gardenHeight||8);
 const wrap=plan.closest('.garden-wrap');
 const viewportW=window.visualViewport?.width||document.documentElement.clientWidth||window.innerWidth;
 const containerW=Math.max(220,Math.min(wrap?.clientWidth||viewportW-20,viewportW-20));
 const natural=containerW*(gh/gw);
 const viewportH=window.visualViewport?.height||window.innerHeight;
 const minH=viewportW<=390?220:viewportW<=700?260:320;
 const maxH=Math.max(minH,Math.min(viewportH*.62,700));
 plan.style.width=containerW+'px';
 plan.style.maxWidth='100%';
 plan.style.minWidth='0';
 plan.style.height=Math.max(minH,Math.min(maxH,natural))+'px';
}

function renderPlan(){
 const plan=$('#gardenPlan'); if(!plan)return; refreshPlanControls(); fitGardenPlan();
 const year=String(state.settings.planYear||new Date().getFullYear()); const plots=state.plots.filter(p=>String(p.year)===year);
 if(!plots.length){plan.innerHTML='<div class="plan-empty">Ajoute une première parcelle ou un équipement.</div>';return}
 plan.innerHTML=plots.map(p=>{const crop=state.crops.find(c=>c.id===p.cropId);return `<div class="plot" data-id="${p.id}" data-type="${esc(p.type)}" data-sun="${esc(p.sun)}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%"><b>${typeIcon(p.type)} ${esc(p.name)}</b><small>${crop?esc(crop.name):esc(p.type)} • ${exposureIcon(p.sun)}</small></div>`}).join('');
 $$('.plot').forEach(el=>attachPlotDrag(el));
}
function attachPlotDrag(el){
 let startX,startY,origX,origY,moved=false;
 const down=e=>{e.preventDefault();const t=e.touches?e.touches[0]:e;startX=t.clientX;startY=t.clientY;origX=parseFloat(el.style.left);origY=parseFloat(el.style.top);moved=false;document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',up)};
 const move=e=>{e.preventDefault();const t=e.touches?e.touches[0]:e;const r=$('#gardenPlan').getBoundingClientRect();let x=origX+(t.clientX-startX)/r.width*100,y=origY+(t.clientY-startY)/r.height*100;if(Math.abs(t.clientX-startX)+Math.abs(t.clientY-startY)>5)moved=true;x=Math.max(0,Math.min(100-parseFloat(el.style.width),x));y=Math.max(0,Math.min(100-parseFloat(el.style.height),y));el.style.left=x+'%';el.style.top=y+'%'};
 const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',up);const p=state.plots.find(x=>x.id===el.dataset.id);if(p&&moved){p.x=parseFloat(el.style.left);p.y=parseFloat(el.style.top);save()}else if(!moved)editPlot(el.dataset.id)};
 el.addEventListener('mousedown',down);el.addEventListener('touchstart',down,{passive:false});
}
function resetPlot(){
 $('#plotForm').reset();$('#plotId').value='';$('#plotW').value=2;$('#plotH').value=2;$('#deletePlot').classList.add('hidden');$('#plotDialog h3').textContent='Nouvelle zone';refreshPlanControls();
}
$('#openPlot').onclick=()=>{resetPlot();$('#plotDialog').showModal()};
window.editPlot=id=>{const p=state.plots.find(x=>x.id===id);if(!p)return;$('#plotId').value=p.id;$('#plotName').value=p.name;$('#plotType').value=p.type;$('#plotSun').value=p.sun;refreshPlanControls();$('#plotCrop').value=p.cropId||'';const gw=state.settings.gardenWidth||12,gh=state.settings.gardenHeight||8;$('#plotW').value=Math.max(.5,(p.w/100*gw).toFixed(1));$('#plotH').value=Math.max(.5,(p.h/100*gh).toFixed(1));$('#plotNote').value=p.note||'';$('#deletePlot').classList.remove('hidden');$('#plotDialog h3').textContent='Modifier la zone';$('#plotDialog').showModal()};
$('#plotForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const id=$('#plotId').value||uid(),gw=state.settings.gardenWidth||12,gh=state.settings.gardenHeight||8;const old=state.plots.find(x=>x.id===id);const p={id,name:$('#plotName').value.trim(),type:$('#plotType').value,sun:$('#plotSun').value,cropId:$('#plotCrop').value,note:$('#plotNote').value.trim(),year:state.settings.planYear,x:old?.x??4,y:old?.y??4,w:Math.min(95,+$('#plotW').value/gw*100),h:Math.min(95,+$('#plotH').value/gh*100)};const i=state.plots.findIndex(x=>x.id===id);i>=0?state.plots[i]=p:state.plots.push(p);$('#plotDialog').close();save()});
$('#deletePlot').onclick=()=>{const id=$('#plotId').value;if(id&&confirm('Supprimer cette zone du plan ?')){state.plots=state.plots.filter(p=>p.id!==id);$('#plotDialog').close();save()}};
$('#planYear').onchange=e=>{state.settings.planYear=+e.target.value;save()};
$('#applyPlanSize').onclick=()=>{state.settings.gardenWidth=Math.max(2,+$('#gardenWidth').value||12);state.settings.gardenHeight=Math.max(2,+$('#gardenHeight').value||8);save()};


// ASSISTANT POTAGER V3 : ALERTES, COMPAGNONNAGE ET ROTATION
const CROP_KB={
 tomate:{family:'Solanacées',water:3,days:4,good:['basilic','carotte','oignon','persil','salade','oeillet'],bad:['pomme de terre','fenouil','chou']},
 'pomme de terre':{family:'Solanacées',water:2,days:5,good:['haricot','pois','chou','souci'],bad:['tomate','courgette','concombre']},
 poivron:{family:'Solanacées',water:3,days:4,good:['basilic','oignon','carotte'],bad:['fenouil']},
 aubergine:{family:'Solanacées',water:3,days:4,good:['haricot','basilic','souci'],bad:['fenouil']},
 carotte:{family:'Apiacées',water:2,days:5,good:['poireau','oignon','tomate','salade','pois'],bad:['aneth']},
 poireau:{family:'Amaryllidacées',water:2,days:6,good:['carotte','céleri','fraise','tomate'],bad:['haricot','pois']},
 oignon:{family:'Amaryllidacées',water:1,days:7,good:['carotte','tomate','betterave','fraise','salade'],bad:['haricot','pois']},
 ail:{family:'Amaryllidacées',water:1,days:8,good:['fraise','tomate','carotte'],bad:['haricot','pois']},
 haricot:{family:'Fabacées',water:2,days:5,good:['carotte','chou','courgette','fraise','pomme de terre'],bad:['oignon','ail','poireau','fenouil']},
 pois:{family:'Fabacées',water:2,days:5,good:['carotte','radis','concombre','chou'],bad:['oignon','ail','poireau']},
 courgette:{family:'Cucurbitacées',water:3,days:3,good:['haricot','mais','capucine','radis'],bad:['pomme de terre']},
 concombre:{family:'Cucurbitacées',water:3,days:3,good:['haricot','pois','radis','tournesol'],bad:['pomme de terre','sauge']},
 courge:{family:'Cucurbitacées',water:3,days:4,good:['haricot','mais','capucine'],bad:['pomme de terre']},
 melon:{family:'Cucurbitacées',water:2,days:4,good:['mais','tournesol'],bad:['pomme de terre']},
 salade:{family:'Astéracées',water:2,days:4,good:['carotte','radis','fraise','oignon','tomate'],bad:['persil']},
 laitue:{family:'Astéracées',water:2,days:4,good:['carotte','radis','fraise','oignon','tomate'],bad:['persil']},
 chou:{family:'Brassicacées',water:2,days:5,good:['céleri','betterave','haricot','oignon','romarin'],bad:['tomate','fraise']},
 radis:{family:'Brassicacées',water:2,days:4,good:['carotte','salade','pois','concombre'],bad:[]},
 navet:{family:'Brassicacées',water:2,days:5,good:['pois','salade'],bad:[]},
 betterave:{family:'Amaranthacées',water:2,days:5,good:['oignon','chou','salade'],bad:['haricot']},
 épinard:{family:'Amaranthacées',water:2,days:5,good:['fraise','pois','radis'],bad:[]},
 fraise:{family:'Rosacées',water:2,days:5,good:['ail','oignon','poireau','salade','épinard'],bad:['chou']},
 basilic:{family:'Lamiacées',water:2,days:4,good:['tomate','poivron','aubergine'],bad:['sauge']},
 persil:{family:'Apiacées',water:2,days:5,good:['tomate','asperge'],bad:['salade']},
 mais:{family:'Poacées',water:3,days:4,good:['haricot','courge','concombre'],bad:['tomate']},
 céleri:{family:'Apiacées',water:3,days:3,good:['poireau','tomate','chou'],bad:['carotte','persil']}
};
function normCrop(v=''){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/s$/,'').trim()}
function kbFor(name){const n=normCrop(name);const key=Object.keys(CROP_KB).find(k=>normCrop(k)===n||n.includes(normCrop(k))||normCrop(k).includes(n));return key?{key,...CROP_KB[key]}:null}
function daysSince(date){if(!date)return 999;return Math.floor((new Date(isoToday()+'T12:00:00')-new Date(date+'T12:00:00'))/86400000)}
function latestWaterDate(){const arr=state.water.filter(w=>+w.amount>0).sort((a,b)=>b.date.localeCompare(a.date));return arr[0]?.date||''}
function buildAlerts(){
 const alerts=[], today=isoToday(), lastWater=latestWaterDate();
 state.crops.filter(c=>c.status!=='Terminé').forEach(c=>{
   const kb=kbFor(c.name);
   if(c.expected){const d=Math.ceil((new Date(c.expected+'T12:00:00')-new Date(today+'T12:00:00'))/86400000);if(d>=0&&d<=7)alerts.push({level:'info',icon:'🧺',title:`Récolte proche : ${c.name}`,text:d===0?'Récolte prévue aujourd’hui.':`Récolte prévue dans ${d} jour(s), le ${fmt(c.expected)}.`});if(d<0&&d>-15)alerts.push({level:'warn',icon:'🧺',title:`Récolte à vérifier : ${c.name}`,text:`La date prévue était le ${fmt(c.expected)}.`})}
   if(kb&&kb.water>=2&&daysSince(lastWater)>kb.days)alerts.push({level:'warn',icon:'💧',title:`Arrosage à vérifier : ${c.name}`,text:`Aucune pluie ni aucun arrosage saisi depuis ${daysSince(lastWater)} jour(s). Besoin en eau : ${kb.water===3?'élevé':'modéré'}.`});
   if(c.sow&&c.status==='Prévu'&&daysSince(c.sow)>=0)alerts.push({level:'info',icon:'🌱',title:`Semis prévu : ${c.name}`,text:`Date prévue : ${fmt(c.sow)}.`});
   if(c.plant&&['Prévu','Semé'].includes(c.status)&&daysSince(c.plant)>=0)alerts.push({level:'info',icon:'🪴',title:`Plantation prévue : ${c.name}`,text:`Date prévue : ${fmt(c.plant)}.`});
 });
 const year=+(state.settings.planYear||new Date().getFullYear());
 state.plots.filter(p=>+p.year===year&&p.cropId).forEach(p=>{
   const cur=state.crops.find(c=>c.id===p.cropId), prev=state.plots.find(q=>+q.year===year-1&&q.name.trim().toLowerCase()===p.name.trim().toLowerCase()&&q.cropId);
   if(cur&&prev){const old=state.crops.find(c=>c.id===prev.cropId), a=kbFor(cur.name),b=old&&kbFor(old.name);if(a&&b&&a.family===b.family)alerts.push({level:'danger',icon:'🔄',title:`Rotation à revoir : ${p.name}`,text:`${cur.name} succède à ${old.name} : même famille (${a.family}). Une autre famille est préférable.`})}
 });
 return alerts.slice(0,12)
}
function renderAlerts(){const box=$('#smartAlerts');if(!box)return;const alerts=buildAlerts();box.innerHTML=alerts.length?alerts.map(a=>`<div class="smart-alert ${a.level}"><span>${a.icon}</span><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div></div>`).join(''):'<div class="smart-ok">✅ Aucune alerte particulière avec les données saisies.</div>'}
function rectGap(a,b){const ax2=a.x+a.w,ay2=a.y+a.h,bx2=b.x+b.w,by2=b.y+b.h;const dx=Math.max(b.x-ax2,a.x-bx2,0),dy=Math.max(b.y-ay2,a.y-by2,0);return Math.hypot(dx,dy)}
function companionPairs(){const year=String(state.settings.planYear||new Date().getFullYear()),plots=state.plots.filter(p=>String(p.year)===year&&p.cropId);const out=[];for(let i=0;i<plots.length;i++)for(let j=i+1;j<plots.length;j++){if(rectGap(plots[i],plots[j])>7)continue;const ca=state.crops.find(c=>c.id===plots[i].cropId),cb=state.crops.find(c=>c.id===plots[j].cropId);if(!ca||!cb)continue;const a=kbFor(ca.name),b=kbFor(cb.name);if(!a||!b)continue;const good=a.good.map(normCrop).includes(normCrop(b.key))||b.good.map(normCrop).includes(normCrop(a.key));const bad=a.bad.map(normCrop).includes(normCrop(b.key))||b.bad.map(normCrop).includes(normCrop(a.key));if(good||bad)out.push({good:good&&!bad,a:ca.name,b:cb.name,pa:plots[i].name,pb:plots[j].name})}return out}
function renderCompanionship(){const box=$('#companionshipResults');if(!box)return;const pairs=companionPairs();box.innerHTML=pairs.length?pairs.map(x=>`<div class="companion ${x.good?'good':'bad'}"><b>${x.good?'🟢 Bonne association':'🔴 Association à éviter'}</b><span>${esc(x.a)} (${esc(x.pa)}) + ${esc(x.b)} (${esc(x.pb)})</span></div>`).join(''):'<p class="empty">Place au moins deux cultures reconnues dans des zones proches pour analyser leur compagnonnage.</p>'}



// Fermeture fiable des formulaires, y compris sur iPhone.
document.addEventListener('click',e=>{
 const close=e.target.closest('.dialog-close,.dialog-cancel');
 if(close){const dlg=close.closest('dialog');if(dlg?.open)dlg.close();return}
 const quick=e.target.closest('[data-quick]');
 if(quick){
   const action=quick.dataset.quick;
   if(action==='harvest') openQuickHarvest();
   if(action==='rain') openQuickWater('Pluie');
   if(action==='watering') openQuickWater('Arrosage');
 }
});
$$('dialog').forEach(dlg=>{
 dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
 dlg.addEventListener('cancel',e=>{e.preventDefault();dlg.close()});
});
function openQuickWater(type){
 $('#waterForm').reset();$('#waterDate').value=isoToday();$('#waterType').value=type;
 $('#waterDialog h3').textContent=type==='Pluie'?'Ajouter une pluie':'Ajouter un arrosage';
 $('#waterDialog').showModal();
}
function openQuickHarvest(){
 if(!state.crops.length){alert('Crée d’abord une culture avant d’enregistrer une récolte.');switchView('cultures');return}
 $('#logForm').reset();$('#logDate').value=isoToday();$('#logType').value='Récolte';toggleLogFields();
 $('#logDialog h3').textContent='Ajouter une récolte';$('#logDialog').showModal();
}
window.addEventListener('resize',fitGardenPlan);
window.addEventListener('orientationchange',()=>setTimeout(fitGardenPlan,150));
window.visualViewport?.addEventListener('resize',fitGardenPlan);
if('ResizeObserver' in window){new ResizeObserver(fitGardenPlan).observe($('#gardenPlan').parentElement)}

// V3.5 — STOCK DE GRAINES ET CALENDRIER DE SEMIS
const SEED_CALENDAR={
 tomate:{indoor:[2,4],outdoor:[5,5],plant:[5,6],harvest:[7,10],life:4},
 poivron:{indoor:[1,3],outdoor:null,plant:[5,6],harvest:[7,10],life:4},
 aubergine:{indoor:[1,3],outdoor:null,plant:[5,6],harvest:[7,10],life:4},
 carotte:{indoor:null,outdoor:[2,7],plant:null,harvest:[5,11],life:3},
 poireau:{indoor:[1,4],outdoor:[3,5],plant:[5,7],harvest:[8,3],life:2},
 oignon:{indoor:[1,3],outdoor:[2,4],plant:[3,5],harvest:[7,9],life:2},
 ail:{indoor:null,outdoor:[10,3],plant:null,harvest:[6,8],life:2},
 haricot:{indoor:null,outdoor:[4,7],plant:null,harvest:[6,10],life:3},
 pois:{indoor:null,outdoor:[2,5],plant:null,harvest:[5,8],life:3},
 courgette:{indoor:[3,5],outdoor:[5,6],plant:[5,6],harvest:[6,10],life:5},
 concombre:{indoor:[3,5],outdoor:[5,6],plant:[5,6],harvest:[6,9],life:8},
 courge:{indoor:[3,5],outdoor:[5,6],plant:[5,6],harvest:[8,11],life:5},
 potiron:{indoor:[3,5],outdoor:[5,6],plant:[5,6],harvest:[9,11],life:5},
 melon:{indoor:[2,4],outdoor:[5,5],plant:[5,6],harvest:[7,9],life:5},
 salade:{indoor:[1,9],outdoor:[2,9],plant:[3,10],harvest:[4,11],life:5},
 laitue:{indoor:[1,9],outdoor:[2,9],plant:[3,10],harvest:[4,11],life:5},
 chou:{indoor:[1,6],outdoor:[3,7],plant:[4,8],harvest:[6,12],life:5},
 radis:{indoor:null,outdoor:[2,10],plant:null,harvest:[3,11],life:5},
 navet:{indoor:null,outdoor:[3,9],plant:null,harvest:[5,11],life:5},
 betterave:{indoor:[2,4],outdoor:[3,7],plant:[4,6],harvest:[6,11],life:5},
 epinard:{indoor:null,outdoor:[2,5],plant:null,harvest:[3,7],life:5},
 fraise:{indoor:[1,3],outdoor:[4,6],plant:[3,10],harvest:[5,8],life:3},
 basilic:{indoor:[2,5],outdoor:[5,6],plant:[5,6],harvest:[6,10],life:6},
 persil:{indoor:[1,4],outdoor:[2,8],plant:[4,6],harvest:[5,12],life:3},
 mais:{indoor:[3,4],outdoor:[4,6],plant:[5,6],harvest:[8,10],life:3},
 celeri:{indoor:[1,4],outdoor:null,plant:[5,6],harvest:[8,11],life:5},
 fenouil:{indoor:[2,4],outdoor:[4,7],plant:[5,7],harvest:[7,10],life:4},
 panais:{indoor:null,outdoor:[2,6],plant:null,harvest:[9,3],life:2},
 mache:{indoor:null,outdoor:[7,10],plant:null,harvest:[9,3],life:5},
 roquette:{indoor:null,outdoor:[2,10],plant:null,harvest:[3,11],life:4},
 coriandre:{indoor:[2,4],outdoor:[3,8],plant:[4,6],harvest:[5,10],life:3},
 aneth:{indoor:[2,4],outdoor:[3,7],plant:[4,6],harvest:[5,9],life:3},
 thym:{indoor:[2,5],outdoor:[4,6],plant:[5,7],harvest:[6,10],life:3},
 tournesol:{indoor:[3,4],outdoor:[4,6],plant:[5,6],harvest:[8,10],life:5},
 capucine:{indoor:[3,4],outdoor:[4,6],plant:[5,6],harvest:[6,10],life:5},
 souci:{indoor:[2,4],outdoor:[3,6],plant:[4,6],harvest:[6,10],life:5}
};
const MONTHS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function seedKey(name=''){const n=normCrop(name);return Object.keys(SEED_CALENDAR).find(k=>n===normCrop(k)||n.includes(normCrop(k))||normCrop(k).includes(n))||''}
function shiftedMonth(m,offset){return ((m-1+offset+120)%12)+1}
function climateOffset(){return {southwest:-1,temperate:0,mountain:1,mediterranean:-1}[state.settings.climateZone]??0}
function monthInRange(month,range,offset=0){if(!range)return false;let a=shiftedMonth(range[0],offset),b=shiftedMonth(range[1],offset);return a<=b?month>=a&&month<=b:month>=a||month<=b}
function rangeText(range,offset=0){if(!range)return '—';const a=shiftedMonth(range[0],offset),b=shiftedMonth(range[1],offset);return a===b?MONTHS[a-1]:`${MONTHS[a-1]} → ${MONTHS[b-1]}`}
function seedAgeStatus(seed){const key=seedKey(seed.name),life=key?SEED_CALENDAR[key].life:4,age=new Date().getFullYear()-(+seed.year||new Date().getFullYear());return age>life?'old':age===life?'check':'ok'}
function seedPeriodStatus(seed){const key=seedKey(seed.name);if(!key)return {code:'unknown',label:'Période à renseigner'};const cal=SEED_CALENDAR[key],m=new Date().getMonth()+1,off=climateOffset();if(monthInRange(m,cal.indoor,off)||monthInRange(m,cal.outdoor,off))return {code:'now',label:'À semer maintenant'};for(let d=1;d<=2;d++){const future=((m-1+d)%12)+1;if(monthInRange(future,cal.indoor,off)||monthInRange(future,cal.outdoor,off))return {code:'soon',label:`À prévoir en ${MONTHS[future-1]}`}}return {code:'later',label:'À semer plus tard'}}
function seedPhotoToData(file){return new Promise((resolve,reject)=>{if(!file){resolve('');return}const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function refreshSeedLogSelect(){const el=$('#logSeed');if(!el)return;const keep=el.value;el.innerHTML='<option value="">Non précisé</option>'+state.seeds.filter(s=>+s.quantity>0).map(s=>`<option value="${s.id}">${esc(s.name)}${s.variety?' — '+esc(s.variety):''} (${s.quantity} ${esc(s.unit)})</option>`).join('');el.value=keep}
function renderSeeds(){
 const box=$('#seedCards');if(!box)return;
 $('#climateZone').value=state.settings.climateZone||'southwest';$('#seedMonthBadge').textContent=MONTHS[new Date().getMonth()];
 const total=state.seeds.length,available=state.seeds.filter(s=>+s.quantity>0).length,now=state.seeds.filter(s=>+s.quantity>0&&seedPeriodStatus(s).code==='now').length,low=state.seeds.filter(s=>+s.quantity<=+(s.low||1)).length;
 $('#seedSummary').innerHTML=[[total,'Sachets enregistrés','📦'],[available,'Disponibles','🌱'],[now,'À semer maintenant','🗓️'],[low,'Stock faible / vide','⚠️']].map(x=>`<div class="stat"><span>${x[2]}</span><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
 const sowable=state.seeds.filter(s=>+s.quantity>0&&['now','soon'].includes(seedPeriodStatus(s).code));
 $('#seedNow').innerHTML=sowable.length?sowable.map(s=>{const st=seedPeriodStatus(s),key=seedKey(s.name),cal=key&&SEED_CALENDAR[key],off=climateOffset();return `<div class="seed-now-row"><div><b>${esc(s.name)}${s.variety?' — '+esc(s.variety):''}</b><span class="seed-status ${st.code}">${st.label}</span></div><small>${cal?`Sous abri : ${rangeText(cal.indoor,off)} • Pleine terre : ${rangeText(cal.outdoor,off)}`:'Calendrier non disponible'}</small></div>`}).join(''):'<p class="empty">Aucune graine disponible à semer maintenant ou dans les deux prochains mois.</p>';
 const f=$('#seedFilter').value;let arr=[...state.seeds];if(f==='now')arr=arr.filter(s=>seedPeriodStatus(s).code==='now'&&+s.quantity>0);if(f==='soon')arr=arr.filter(s=>seedPeriodStatus(s).code==='soon'&&+s.quantity>0);if(f==='low')arr=arr.filter(s=>+s.quantity<=+(s.low||1));if(f==='old')arr=arr.filter(s=>['old','check'].includes(seedAgeStatus(s)));
 box.innerHTML=arr.length?arr.map(s=>{const st=seedPeriodStatus(s),age=seedAgeStatus(s),key=seedKey(s.name),cal=key&&SEED_CALENDAR[key],off=climateOffset();return `<article class="crop-card seed-card">${s.photo?`<img src="${s.photo}" class="seed-photo" alt="Sachet de ${esc(s.name)}">`:''}<div class="crop-top"><div><h3>${esc(s.name)}</h3><div class="meta">${esc(s.variety||'Variété non précisée')}</div></div><span class="status ${st.code}">${st.label}</span></div><p><b>Stock :</b> ${s.quantity} ${esc(s.unit)} ${+s.quantity<=+(s.low||1)?'<span class="low-stock">⚠️ Faible</span>':''}<br><b>Année :</b> ${s.year||'—'} ${age==='old'?'<span class="low-stock">⚠️ ancien</span>':age==='check'?'<span class="check-stock">À vérifier</span>':''}<br><b>Rangement :</b> ${esc(s.storage||'Non précisé')}</p>${cal?`<div class="seed-calendar"><span><b>Sous abri</b>${rangeText(cal.indoor,off)}</span><span><b>Pleine terre</b>${rangeText(cal.outdoor,off)}</span><span><b>Plantation</b>${rangeText(cal.plant,off)}</span><span><b>Récolte</b>${rangeText(cal.harvest,off)}</span></div>`:'<p class="meta">Calendrier non disponible pour cette plante.</p>'}${s.notes?`<p class="meta">${esc(s.notes)}</p>`:''}<div class="seed-stock-actions"><button class="small" onclick="adjustSeed('${s.id}',-1)">− 1</button><button class="small" onclick="adjustSeed('${s.id}',1)">+ 1</button><button class="secondary" onclick="editSeed('${s.id}')">Modifier</button></div></article>`}).join(''):'<div class="card empty">Aucun sachet correspondant.</div>';
 refreshSeedLogSelect();
}
function resetSeed(){const f=$('#seedForm');f.reset();$('#seedId').value='';$('#seedYear').value=new Date().getFullYear();$('#seedQuantity').value=1;$('#seedLow').value=1;$('#deleteSeed').classList.add('hidden');$('#seedDialog h3').textContent='Ajouter des graines'}
$('#openSeed').onclick=()=>{resetSeed();$('#seedDialog').showModal()};
$('#seedFilter').onchange=renderSeeds;
$('#climateZone').onchange=e=>{state.settings.climateZone=e.target.value;save()};
$('#seedForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('#seedId').value||uid(),old=state.seeds.find(s=>s.id===id),file=$('#seedPhoto').files[0];let photo=old?.photo||'';if(file)photo=await seedPhotoToData(file);const seed={id,name:$('#seedName').value.trim(),variety:$('#seedVariety').value.trim(),quantity:+$('#seedQuantity').value||0,unit:$('#seedUnit').value,year:+$('#seedYear').value||'',origin:$('#seedOrigin').value,storage:$('#seedStorage').value.trim(),low:+$('#seedLow').value||0,notes:$('#seedNotes').value.trim(),photo};const i=state.seeds.findIndex(s=>s.id===id);i>=0?state.seeds[i]=seed:state.seeds.push(seed);$('#seedDialog').close();save()});
window.editSeed=id=>{const s=state.seeds.find(x=>x.id===id);if(!s)return;$('#seedId').value=s.id;$('#seedName').value=s.name;$('#seedVariety').value=s.variety||'';$('#seedQuantity').value=s.quantity;$('#seedUnit').value=s.unit||'Sachet(s)';$('#seedYear').value=s.year||'';$('#seedOrigin').value=s.origin||'Achetées';$('#seedStorage').value=s.storage||'';$('#seedLow').value=s.low??1;$('#seedNotes').value=s.notes||'';$('#deleteSeed').classList.remove('hidden');$('#seedDialog h3').textContent='Modifier le sachet';$('#seedDialog').showModal()};
window.adjustSeed=(id,delta)=>{const s=state.seeds.find(x=>x.id===id);if(s){s.quantity=Math.max(0,(+s.quantity||0)+delta);save()}};
$('#deleteSeed').onclick=()=>{const id=$('#seedId').value;if(id&&confirm('Supprimer ce sachet du stock ?')){state.seeds=state.seeds.filter(s=>s.id!==id);$('#seedDialog').close();save()}};
$('#seedNames').innerHTML=Object.keys(SEED_CALENDAR).map(k=>`<option value="${k.charAt(0).toUpperCase()+k.slice(1)}">`).join('');
renderSeeds();

renderAll();
