const KEY='mon-potager-v2';
let state=load();
let deferredPrompt;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function load(){try{const old=JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem('mon-potager-v1'));return normalize(old)}catch{return normalize({})}}
function normalize(x){return {crops:x?.crops||[],logs:x?.logs||[],water:x?.water||[],plots:x?.plots||[],settings:x?.settings||{gardenWidth:12,gardenHeight:8,planYear:new Date().getFullYear()}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function isoToday(){return new Date().toISOString().slice(0,10)}
function fmt(d){if(!d)return'—';return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}
function cropName(id){return state.crops.find(c=>c.id===id)?.name||'Culture supprimée'}
function switchView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
$$('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));
function renderAll(){renderStats();renderCrops();renderLogs();renderWater();renderYield();refreshSelects();renderPlan();}
function renderStats(){
 const totalYield=state.logs.filter(l=>l.type==='Récolte').reduce((s,l)=>s+(+l.weight||0),0);
 const month=new Date().toISOString().slice(0,7);const rain=state.water.filter(w=>w.type==='Pluie'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);
 const irrigation=state.water.filter(w=>w.type==='Arrosage'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);
 $('#stats').innerHTML=[['🌱',state.crops.filter(c=>c.status!=='Terminé').length,'Cultures actives'],['🧺',totalYield.toFixed(1)+' kg','Récolté au total'],['🌧️',rain.toFixed(1)+' mm','Pluie ce mois'],['💧',irrigation.toFixed(1)+' mm','Arrosage ce mois']].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b><span>${x[2]}</span></div>`).join('');
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
$('#logType').onchange=toggleLogFields;function toggleLogFields(){const t=$('#logType').value;$('#harvestFields').classList.toggle('hidden',t!=='Récolte');$('#treatmentFields').classList.toggle('hidden',t!=='Traitement')}
$('#logForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();state.logs.push({id:uid(),cropId:$('#logCrop').value,type:$('#logType').value,date:$('#logDate').value,weight:$('#logWeight').value,count:$('#logCount').value,product:$('#logProduct').value.trim(),dose:$('#logDose').value.trim(),note:$('#logNote').value.trim()});$('#logDialog').close();save()});
$('#filterType').onchange=renderLogs;$('#filterCrop').onchange=renderLogs;
function renderLogs(){const type=$('#filterType').value,crop=$('#filterCrop').value;const arr=[...state.logs].filter(l=>(!type||l.type===type)&&(!crop||l.cropId===crop)).sort((a,b)=>b.date.localeCompare(a.date));$('#logList').innerHTML=arr.length?arr.map(l=>`<div class="timeline-item"><div class="timeline-date">${fmt(l.date)}</div><div><span class="pill">${esc(l.type)}</span><b>${esc(cropName(l.cropId))}</b><div class="meta">${l.type==='Récolte'?(l.weight?l.weight+' kg ':'')+(l.count?l.count+' unité(s) ':''):''}${l.type==='Traitement'?[l.product,l.dose].filter(Boolean).map(esc).join(' • '):''}${l.note?' • '+esc(l.note):''}</div></div><button class="delete-link" onclick="deleteLog('${l.id}')">Supprimer</button></div>`).join(''):'<div class="timeline-item empty">Aucune activité.</div>'}
window.deleteLog=id=>{if(confirm('Supprimer cette activité ?')){state.logs=state.logs.filter(l=>l.id!==id);save()}}
$('#openWater').onclick=()=>{$('#waterForm').reset();$('#waterDate').value=isoToday();$('#waterDialog').showModal()};
$('#waterForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();state.water.push({id:uid(),type:$('#waterType').value,date:$('#waterDate').value,amount:$('#waterAmount').value,area:$('#waterArea').value.trim(),note:$('#waterNote').value.trim()});$('#waterDialog').close();save()});
function renderWater(){const month=new Date().toISOString().slice(0,7);const rain=state.water.filter(w=>w.type==='Pluie'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);const irr=state.water.filter(w=>w.type==='Arrosage'&&w.date.startsWith(month)).reduce((s,w)=>s+(+w.amount||0),0);$('#waterStats').innerHTML=[['🌧️',rain.toFixed(1)+' mm','Pluie ce mois'],['🚿',irr.toFixed(1)+' mm','Arrosage ce mois'],['💦',(rain+irr).toFixed(1)+' mm','Apport total'],['📒',state.water.length,'Mesures enregistrées']].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b><span>${x[2]}</span></div>`).join('');const arr=[...state.water].sort((a,b)=>b.date.localeCompare(a.date));$('#waterList').innerHTML=arr.length?arr.map(w=>`<div class="timeline-item"><div class="timeline-date">${fmt(w.date)}</div><div><span class="pill">${esc(w.type)}</span><b>${w.amount} mm / L·m²</b><div class="meta">${esc(w.area||'Zone non précisée')}${w.note?' • '+esc(w.note):''}</div></div><button class="delete-link" onclick="deleteWater('${w.id}')">Supprimer</button></div>`).join(''):'<div class="timeline-item empty">Aucune mesure de pluie ou d’arrosage.</div>'}
window.deleteWater=id=>{if(confirm('Supprimer cette mesure ?')){state.water=state.water.filter(w=>w.id!==id);save()}}
function renderYield(){const rows=state.crops.map(c=>{const hs=state.logs.filter(l=>l.cropId===c.id&&l.type==='Récolte');return{name:c.name,kg:hs.reduce((s,l)=>s+(+l.weight||0),0),count:hs.reduce((s,l)=>s+(+l.count||0),0)}}).filter(r=>r.kg||r.count).sort((a,b)=>b.kg-a.kg);$('#yieldTable').innerHTML=rows.length?`<div class="yield-row header"><span>Culture</span><span>Poids</span><span>Quantité</span></div>`+rows.map(r=>`<div class="yield-row"><b>${esc(r.name)}</b><span>${r.kg.toFixed(2)} kg</span><span>${r.count||'—'}</span></div>`).join(''):'<p class="empty">Aucune récolte enregistrée pour le moment.</p>'}
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sauvegarde-potager-${isoToday()}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.crops||!data.logs||!data.water)throw Error();state=data;save();alert('Sauvegarde importée.')}catch{alert('Fichier de sauvegarde non valide.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Effacer définitivement toutes les données de ce potager ?')){state=normalize({});save()}};
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
renderAll();


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
function renderPlan(){
 const plan=$('#gardenPlan'); if(!plan)return; refreshPlanControls();
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
