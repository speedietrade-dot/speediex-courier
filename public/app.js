(function(){
  const $=s=>document.querySelector(s);
  const menu=$('#mobileMenu'),open=$('#menuBtn'),close=$('#closeMenu');
  if(open&&menu) open.onclick=()=>menu.classList.add('open');
  if(close&&menu) close.onclick=()=>menu.classList.remove('open');
  if(menu) menu.querySelectorAll('a').forEach(a=>a.onclick=()=>menu.classList.remove('open'));
  const toggle=$('#shipToggle'),sub=$('#shipSub'); if(toggle&&sub) toggle.onclick=()=>sub.classList.toggle('open');

  const stages=[
    {name:'Shipment information received',icon:'📦'},
    {name:'Picked up by courier',icon:'🚚'},
    {name:'Departed from origin facility',icon:'🛫'},
    {name:'In Flight',icon:'✈️'},
    {name:'Arrived at destination country',icon:'🛬'},
    {name:'Out for delivery',icon:'🚚'},
    {name:'Delivered',icon:'✓'}
  ];
  const aliases={
    'shipment information received':'Shipment information received',
    'picked up by courier':'Picked up by courier',
    'departed from origin facility':'Departed from origin facility',
    'in transit':'In Flight',
    'in flight':'In Flight',
    'arrived at destination country':'Arrived at destination country',
    'arrived at destination facility':'Arrived at destination country',
    'out for delivery':'Out for delivery',
    'delivered':'Delivered'
  };
  function canonical(v){return aliases[String(v||'').trim().toLowerCase()]||String(v||'').trim();}
  function stageIndex(v){const c=canonical(v).toLowerCase();return stages.findIndex(x=>x.name.toLowerCase()===c);}
  function iconFor(stage){return stages.find(x=>x.name===stage)?.icon||'•';}

  async function track(n,target){
    target.innerHTML='<div class="loading card">Loading shipment...</div>';
    try{
      const r=await fetch('/api/track/'+encodeURIComponent(n));
      const s=await r.json();
      if(!r.ok) throw new Error(s.error||'Shipment not found');
      const events=s.events||[];
      const current=Math.max(0,stageIndex(s.status));
      const eventForStage=stage=>events.find(e=>canonical(e.status).toLowerCase()===stage.name.toLowerCase());
      const progress=Math.round((current/(stages.length-1))*100);
      const currentEvent=eventForStage(stages[current]);
      const flightStage=current===3;
      const routePosition=Math.max(0,Math.min(100, current===0?0:current===1?10:current===2?25:current===3?55:current===4?78:current>=5?100:50));

      target.innerHTML=`<section class="tracking-card card">
        <div class="tracking-top">
          <div><div class="eyebrow red">TRACKING DETAILS</div><h2>${esc(s.trackingNumber)}</h2><div class="estimate">Estimated Delivery <b>${formatDate(s.estimatedDelivery)}</b></div></div>
          <span class="status">${esc(canonical(s.status)||'Shipment information received')}</span>
        </div>
        <div class="route"><div><small>From</small><b>${s.originFlag?esc(s.originFlag)+' ':''}${esc(s.origin||'—')}</b></div><strong>✈</strong><div><small>To</small><b>${s.destinationFlag?esc(s.destinationFlag)+' ':''}${esc(s.destination||'—')}</b></div></div>
        <div class="flight-display" aria-label="Flight-style shipment progress">
          <div class="flight-route-labels"><b>${s.originFlag?esc(s.originFlag)+' ':''}${esc(s.origin||'Origin')}</b><b>${s.destinationFlag?esc(s.destinationFlag)+' ':''}${esc(s.destination||'Destination')}</b></div>
          <div class="flight-track"><span class="flight-line"><i style="width:${progress}%"></i></span><span class="flight-plane" style="left:${routePosition}%">✈️</span></div>
          <div class="flight-current"><span>${iconFor(canonical(s.status))}</span><b>${esc(canonical(s.status)||'Shipment information received')}</b><small>${esc(s.currentLocation||'')}</small></div>
        </div>
        <div class="stage-row">${stages.map((stage,i)=>{const done=i<current,active=i===current;return `<div class="stage ${done?'done ':''}${active?'active':''}"><span>${done?'✓':stage.icon}</span><small>${esc(stage.name)}</small></div>`}).join('')}</div>
        <div class="tracking-body"><div class="timeline">${stages.map((stage,i)=>{
          const ev=eventForStage(stage),done=i<current,active=i===current;
          const marker=done?'✓':active?stage.icon:'';
          const detail=ev?`${ev.date} ${ev.time} · ${ev.location}`:(active?(s.currentLocation||'Current update'):'Awaiting update');
          return `<div class="event ${done||active?'done':''} ${active?'current':''}"><i>${marker}</i><div><b>${esc(stage.name)}</b><small>${esc(detail)}</small>${ev&&ev.note?`<p>${esc(ev.note)}</p>`:''}</div></div>`;
        }).join('')}</div>
        <div class="details"><div><span>▣</span><b>Parcel Type</b><p>${esc(s.parcelType||'—')}</p></div><div><span>◫</span><b>Weight</b><p>${esc(s.weight||'—')}</p></div><div><span>◇</span><b>Service</b><p>${esc(s.service||'—')}</p></div><div><span>№</span><b>Reference</b><p>${esc(s.reference||'—')}</p></div><div><span>●</span><b>Recipient</b><p>${esc(s.recipient?.name||'—')}</p></div><div><span>☎</span><b>Contact</b><p>${esc(s.recipient?.contact||'—')}</p></div></div></div>
        <div class="map"><div class="map-route"><span>📍 ${esc(s.origin||'Origin')}</span><b class="map-plane" style="left:${routePosition}%">✈</b><span>📍 ${esc(s.destination||'Destination')}</span></div><div class="map-status">${flightStage?'✈️':'🚚'} <b>${flightStage?'Shipment is in flight':'Your parcel is on its way'}</b><small>Current location: ${esc(s.currentLocation||s.status||'—')}</small></div></div>
        <div class="help-box"><div><b>Need Help?</b><span>Our support team is here for you.</span></div><a href="/contact.html">Contact Support →</a></div>
      </section>`;
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){target.innerHTML=`<div class="card not-found"><h2>Shipment not found</h2><p>Please check your tracking number and try again.</p></div>`}
  }
  const forms=document.querySelectorAll('.track-form');forms.forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const n=(f.querySelector('input').value||'').trim();if(!n)return;if(location.pathname!=='/track.html'&&location.pathname!=='/track.html/') location.href='/track.html?tracking='+encodeURIComponent(n); else track(n,$('#trackingResult'));}));
  if(location.pathname==='/track.html'||location.pathname==='/track.html/') {const q=new URLSearchParams(location.search).get('tracking'); if(q){$('#trackInput').value=q;track(q,$('#trackingResult'));}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function formatDate(v){if(!v)return '—';const d=new Date(v+'T00:00:00');return isNaN(d)?esc(v):d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});}
})();
