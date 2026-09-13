const $ = (s) => document.querySelector(s);
let selected = null;
let editing = false;
let all = [];

async function api(url, options = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function showLogin() {
  const login = $("#loginCard"), dash = $("#dashboard"), logout = $("#logout");
  if (login) login.hidden = false;
  if (dash) dash.hidden = true;
  if (logout) logout.hidden = true;
}

function showDash() {
  const login = $("#loginCard"), dash = $("#dashboard"), logout = $("#logout");
  if (login) login.hidden = true;
  if (dash) dash.hidden = false;
  if (logout) logout.hidden = false;
  load().catch(err => {
    console.error(err);
    const list = $("#shipments");
    if (list) list.innerHTML = `<div class="card">Unable to load shipments.</div>`;
  });
}

async function boot() {
  try { await api("/api/admin/me"); showDash(); }
  catch { showLogin(); }
}

async function load() {
  all = await api("/api/shipments");
  render();
}

function render() {
  const counts = {
    total: all.length,
    transit: all.filter(s => /transit/i.test(s.status || "")).length,
    delivered: all.filter(s => /delivered/i.test(s.status || "")).length,
    pending: all.filter(s => /pending|awaiting/i.test(s.status || "")).length
  };
  ["totalStat", "transitStat", "deliveredStat", "pendingStat"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [counts.total, counts.transit, counts.delivered, counts.pending][i];
  });
  const search = $("#search");
  const q = search ? search.value.toLowerCase() : "";
  const list = all.filter(s => JSON.stringify(s).toLowerCase().includes(q));
  const target = $("#shipments");
  if (!target) return;
  target.innerHTML = list.map(s => `
    <div class="shipment card">
      <div class="row"><b>${escapeHtml(s.trackingNumber)}</b><span class="status">${escapeHtml(s.status)}</span></div>
      <p>${escapeHtml(s.origin)} → ${escapeHtml(s.destination)}</p>
      <small>${escapeHtml(s.recipient?.name || "")} · ${escapeHtml(s.currentLocation || "")}</small>
      <div class="actions">
        <button type="button" data-edit="${escapeAttr(s.trackingNumber)}">Edit</button>
        <button type="button" class="light" data-delete="${escapeAttr(s.trackingNumber)}">Delete</button>
      </div>
    </div>`).join("") || `<div class="card">No shipments found.</div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
const escapeAttr = escapeHtml;

function openEditor(s) {
  selected = s || null;
  editing = !!s;
  const editor = $("#editor"), eventEditor = $("#eventEditor"), title = $("#editorTitle"), form = $("#shipmentForm");
  if (!editor || !form) return;
  editor.hidden = false;
  if (eventEditor) eventEditor.hidden = !s;
  if (title) title.textContent = s ? "Edit Shipment" : "Create Shipment";
  [...form.elements].forEach(x => { if (x.name) x.value = ""; });
  if (s) {
    const vals = {...s, senderName:s.sender?.name, senderContact:s.sender?.contact, recipientName:s.recipient?.name, recipientContact:s.recipient?.contact, recipientAddress:s.recipient?.address};
    Object.entries(vals).forEach(([k,v]) => { if (form.elements[k]) form.elements[k].value = v || ""; });
  }
  editor.scrollIntoView({behavior:"smooth", block:"start"});
}

async function handleShipmentSubmit(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    if (editing && selected) {
      await api(`/api/shipments/${encodeURIComponent(selected.trackingNumber)}`, {method:"PUT", body:JSON.stringify({...data, sender:{name:data.senderName,contact:data.senderContact}, recipient:{name:data.recipientName,contact:data.recipientContact,address:data.recipientAddress}})});
    } else {
      await api("/api/shipments", {method:"POST", body:JSON.stringify(data)});
    }
    await load();
    const editor = $("#editor"); if (editor) editor.hidden = true;
  } catch (err) { alert(err.message); }
}

async function handleEventSubmit(e) {
  e.preventDefault();
  if (!selected) return;
  const data = Object.fromEntries(new FormData(e.target));
  try {
    await api(`/api/shipments/${encodeURIComponent(selected.trackingNumber)}/events`, {method:"POST", body:JSON.stringify(data)});
    selected = await api(`/api/track/${encodeURIComponent(selected.trackingNumber)}`);
    await load(); openEditor(selected); e.target.reset();
  } catch (err) { alert(err.message); }
}

async function removeShipment(n) {
  if (!confirm(`Delete ${n}?`)) return;
  try { await api(`/api/shipments/${encodeURIComponent(n)}`, {method:"DELETE"}); await load(); }
  catch (err) { alert(err.message); }
}

function wireEvents() {
  const newShipment = $("#newShipment"), cancel = $("#cancel"), search = $("#search"), loginForm = $("#loginForm"), logout = $("#logout"), shipmentForm = $("#shipmentForm"), eventForm = $("#eventForm"), shipments = $("#shipments");
  if (newShipment) newShipment.addEventListener("click", e => { e.preventDefault(); openEditor(null); });
  if (cancel) cancel.addEventListener("click", e => { e.preventDefault(); const editor=$("#editor"); if(editor) editor.hidden=true; });
  if (search) search.addEventListener("input", render);
  if (loginForm) loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    try { await api("/api/admin/login", {method:"POST", body:JSON.stringify({email:$("#email")?.value||"", password:$("#password")?.value||""})}); showDash(); }
    catch(err) { const x=$("#loginError"); if(x) x.textContent=err.message; }
  });
  if (logout) logout.addEventListener("click", async () => { try { await api("/api/admin/logout",{method:"POST"}); } finally { showLogin(); } });
  if (shipmentForm) shipmentForm.addEventListener("submit", handleShipmentSubmit);
  if (eventForm) eventForm.addEventListener("submit", handleEventSubmit);
  if (shipments) shipments.addEventListener("click", e => {
    const editButton=e.target.closest("[data-edit]"), deleteButton=e.target.closest("[data-delete]");
    if(editButton){ const s=all.find(x=>x.trackingNumber===editButton.dataset.edit); if(s) openEditor(s); }
    if(deleteButton) removeShipment(deleteButton.dataset.delete);
  });
}

document.addEventListener("DOMContentLoaded", () => { wireEvents(); boot(); });
