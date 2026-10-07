const $ = s => document.querySelector(s);
let selected = null, editing = false, all = [];

async function api(url, options={}) {
  const r = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function boot(){try{await api("/api/admin/me");showDash()}catch{showLogin()}}
function showLogin(){$("#loginCard").hidden=false;$("#dashboard").hidden=true;$("#logout").hidden=true}
function showDash(){$("#loginCard").hidden=true;$("#dashboard").hidden=false;$("#logout").hidden=false;load()}
$("#loginForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({email:$("#email").value,password:$("#password").value})});showDash()}catch(err){$("#loginError").textContent=err.message}});
$("#logout")?.addEventListener("click",async()=>{await api("/api/admin/logout",{method:"POST"});showLogin()});
async function load(){all=await api("/api/shipments");render()}
function render(){
  const counts={total:all.length,transit:all.filter(s=>/transit|flight/i.test(s.status||"")).length,delivered:all.filter(s=>/delivered/i.test(s.status||"")).length,pending:all.filter(s=>/pending|awaiting/i.test(s.status||"")).length};
  ["totalStat","transitStat","deliveredStat","pendingStat"].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=[counts.total,counts.transit,counts.delivered,counts.pending][i]});
  const q=$("#search").value.toLowerCase();
  const list=all.filter(s=>JSON.stringify(s).toLowerCase().includes(q));
  $("#shipments").innerHTML=list.map(s=>`<div class="shipment card"><div class="row"><b>${esc(s.trackingNumber)}</b><span class="status">${esc(s.status)}</span></div><p>${esc(s.origin)} → ${esc(s.destination)}</p><small>${esc(s.recipient?.name||"")} · ${esc(s.currentLocation||"")}</small><div class="actions"><button onclick="edit('${attr(s.trackingNumber)}')">Edit</button><button class="light" onclick="removeShipment('${attr(s.trackingNumber)}')">Delete</button></div></div>`).join("")||`<div class="card">No shipments found.</div>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
const attr=esc;
$("#search")?.addEventListener("input",render);
$("#newShipment")?.addEventListener("click",()=>openEditor(null));
$("#cancel")?.addEventListener("click",()=>$("#editor").hidden=true);

function openEditor(s){
  selected=s;editing=!!s;$("#editor").hidden=false;$("#eventEditor").hidden=!s;$("#editorTitle").textContent=s?"Edit Shipment":"Create Shipment";
  const f=$("#shipmentForm");[...f.elements].forEach(x=>{if(x.name)x.value=""});
  if(s){const vals={...s,senderName:s.sender?.name,senderContact:s.sender?.contact,recipientName:s.recipient?.name,recipientContact:s.recipient?.contact,recipientAddress:s.recipient?.address};Object.entries(vals).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||""})}
  if(!s){const tn=f.elements.trackingNumber;if(tn){tn.value="Generated automatically";tn.placeholder="Generated automatically after saving"}}
  window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
}
window.edit=n=>openEditor(all.find(s=>s.trackingNumber===n));

$("#shipmentForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
  if(!editing) delete data.trackingNumber;
  try{
    let result;
    if(editing){result=await api(`/api/shipments/${encodeURIComponent(selected.trackingNumber)}`,{method:"PUT",body:JSON.stringify({...data,sender:{name:data.senderName,contact:data.senderContact},recipient:{name:data.recipientName,contact:data.recipientContact,address:data.recipientAddress}})})}
    else {result=await api("/api/shipments",{method:"POST",body:JSON.stringify(data)});alert(`Shipment created. Tracking number: ${result.trackingNumber}`)}
    await load();$("#editor").hidden=true;
  }catch(err){alert(err.message)}
});

$("#eventForm")?.addEventListener("submit",async e=>{
  e.preventDefault();if(!selected)return;const data=Object.fromEntries(new FormData(e.target));
  try{selected=await api(`/api/shipments/${encodeURIComponent(selected.trackingNumber)}/events`,{method:"POST",body:JSON.stringify(data)});await load();openEditor(selected);e.target.reset();alert(`Tracking stage updated to ${selected.status}.`)}catch(err){alert(err.message)}
});
window.removeShipment=async n=>{if(confirm(`Delete ${n}?`)){try{await api(`/api/shipments/${encodeURIComponent(n)}`,{method:"DELETE"});await load()}catch(err){alert(err.message)}}};
boot();
