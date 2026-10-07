(function(){
  const $=s=>document.querySelector(s);
  const menu=$('#mobileMenu'),open=$('#menuBtn'),close=$('#closeMenu');
  if(open&&menu) open.onclick=()=>menu.classList.add('open');
  if(close&&menu) close.onclick=()=>menu.classList.remove('open');
  if(menu) menu.querySelectorAll('a').forEach(a=>a.onclick=()=>menu.classList.remove('open'));
  const toggle=$('#shipToggle'),sub=$('#shipSub'); if(toggle&&sub) toggle.onclick=()=>sub.classList.toggle('open');

  async function track(n, target){
    target.innerHTML='<div class="loading card">Loading shipment...</div>';
    try{const r=await fetch('/api/track/'+encodeURIComponent(n));const s=await r.json();if(!r.ok) throw new Error(s.error||'Shipment not found');
      const events=s.events||[]; const known=events.map(e=>String(e.status).toLowerCase());
      const steps=['Shipment information received','Picked up by courier','Departed from origin facility','Arrived at destination country','Out for delivery','Delivered'];
      target.innerHTML=`<section class="tracking-card card"><div class="tracking-top"><div><div class="eyebrow red">TRACKING DETAILS</div><h2>${esc(s.trackingNumber)}</h2><div class="estimate">Estimated Delivery <b>${formatDate(s.estimatedDelivery)}</b></div></div><span class="status">${esc(s.status)}</span></div><div class="route"><div><small>From</small><b>${s.originFlag ? esc(s.originFlag)+" " : ""}${esc(s.origin)}</b></div><strong>→</strong><div><small>To</small><b>${s.destinationFlag ? esc(s.destinationFlag)+" " : ""}${esc(s.destination)}</b></div></div><div class="tracking-body"><div class="timeline">${steps.map((step,i)=>{const found=events.find(e=>e.status.toLowerCase()===step.toLowerCase());const active=!!found;return `<div class="event ${active?'done':''}"><i>${active?'✓':''}</i><div><b>${esc(step)}</b><small>${found?esc(found.date+' '+found.time+' · '+found.location):esc(i<3?'':'Awaiting update')}</small>${found&&found.note?`<p>${esc(found.note)}</p>`:''}</div></div>`}).join('')}</div><div class="details"><div><span>▣</span><b>Parcel Type</b><p>${esc(s.parcelType||'—')}</p></div><div><span>◫</span><b>Weight</b><p>${esc(s.weight||'—')}</p></div><div><span>◇</span><b>Service</b><p>${esc(s.service||'—')}</p></div><div><span>№</span><b>Reference</b><p>${esc(s.reference||'—')}</p></div><div><span>●</span><b>Recipient</b><p>${esc(s.recipient?.name||'—')}</p></div><div><span>☎</span><b>Contact</b><p>${esc(s.recipient?.contact||'—')}</p></div></div></div><div class="map"><div class="map-route"><span>📍 ${esc(s.origin)}</span><b>✈</b><span>📍 ${esc(s.destination)}</span></div><div class="map-status">🚚 <b>Your parcel is on its way</b><small>Current location: ${esc(s.currentLocation||s.status)}</small></div></div><div class="help-box"><div><b>Need Help?</b><span>Our support team is here for you.</span></div><a href="/contact.html">Contact Support →</a></div></section>`;
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){target.innerHTML=`<div class="card not-found"><h2>Shipment not found</h2><p>Please check your tracking number and try again.</p></div>`}
  }
  const forms=document.querySelectorAll('.track-form');forms.forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const n=(f.querySelector('input').value||'').trim();if(!n)return;if(location.pathname!=='/track.html'&&location.pathname!=='/track.html/') location.href='/track.html?tracking='+encodeURIComponent(n); else track(n,$('#trackingResult'));}));
  if(location.pathname==='/track.html'||location.pathname==='/track.html/') {const q=new URLSearchParams(location.search).get('tracking'); if(q){$('#trackInput').value=q;track(q,$('#trackingResult'));}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function formatDate(v){if(!v)return '—';const d=new Date(v+'T00:00:00');return isNaN(d)?esc(v):d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});}
})();
