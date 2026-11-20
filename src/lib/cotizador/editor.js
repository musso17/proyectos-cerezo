// Cotizador Cerezo · editor de propuestas con el formato oficial (A4).
//
// La propuesta se edita directamente sobre la hoja (contenteditable) y el PDF
// se genera recorriendo esa misma hoja: cada palabra, fondo y borde se vuelve
// a dibujar como vector con jsPDF y las tipografías se incrustan en subconjunto.
// Así el PDF es idéntico a lo que se ve, pesa poco (~65 KB) y tiene texto real.
//
// mountCotizador(root, opciones) monta el editor dentro de `root` y devuelve una
// función que lo desmonta. Las cotizaciones se guardan con `opciones.store`
// (ver supabaseStore.js).

import { blankQuote, normalize, CUR } from './template';

const SHEET_W = 1185, A4W = 595.28, A4H = 841.89;
const PT = A4W / SHEET_W;      // puntos PDF por píxel de la hoja
const PAGE_H = A4H / PT;       // una página A4 en píxeles de la hoja (~1676)
const PAD_T = 42, PAD_B = 54;  // márgenes superior e inferior de la hoja
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const FACES = [
  { key: 'b300', file: '/cotizador/fonts/Barlow-300.ttf', css: 'CZ Barlow', w: 300 },
  { key: 'b400', file: '/cotizador/fonts/Barlow-400.ttf', css: 'CZ Barlow', w: 400 },
  { key: 'b500', file: '/cotizador/fonts/Barlow-500.ttf', css: 'CZ Barlow', w: 500 },
  { key: 'b600', file: '/cotizador/fonts/Barlow-600.ttf', css: 'CZ Barlow', w: 600 },
  { key: 'c700', file: '/cotizador/fonts/BarlowCondensed-700.ttf', css: 'CZ Barlow Condensed', w: 700 },
  { key: 'c800', file: '/cotizador/fonts/BarlowCondensed-800.ttf', css: 'CZ Barlow Condensed', w: 800 },
  { key: 'm400', file: '/cotizador/fonts/IBMPlexMono-400.ttf', css: 'CZ Plex Mono', w: 400 }
];

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const round2 = n => Math.round(n * 100) / 100;
const pad2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoToday = () => iso(new Date());
export function addDays(isoStr, n) { const [y, m, d] = (isoStr || isoToday()).split('-').map(Number); return iso(new Date(y, m - 1, d + n)); }
export function longDate(isoStr) { if (!isoStr) return ''; const [y, m, d] = isoStr.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; }
export function fmt(n) { const neg = n < 0; n = Math.abs(round2(n)); const s = n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); return (neg ? '-' : '') + s; }
const fmtPct = n => { const v = Number(n); return isFinite(v) ? String(round2(v)) : '0'; };
export function parseAmount(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/S\/|US\$|\$|€|USD|EUR|PEN/gi, '').replace(/[\s, ]/g, '');
  if (!s) return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}
const amountDisplay = raw => { const p = parseAmount(raw); return p == null ? String(raw || '') : fmt(p); };
export function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, ''); }
function readLS(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento local */ } }
function relTime(ms) {
  if (!ms) return '';
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  const d = new Date(ms);
  return `el ${d.getDate()} ${MES_CORTO[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
function nextFrame(cb) { let done = false; const f = () => { if (!done) { done = true; cb(); } }; requestAnimationFrame(f); setTimeout(f, 60); }
const raf = () => new Promise(r => nextFrame(r));
const kb = n => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`;

const IC = {
  up: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  tag: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M2.5 8.2V3.3c0-.5.4-.8.8-.8h4.9l5.3 5.3-5.7 5.7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="5.6" cy="5.6" r="1.1" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>'
};

/* ---------- fonts: loaded once per page, shared by the sheet and the PDF ---------- */
let fontsPromise = null;
function toBinary(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return s; }
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FACES.map(async f => {
      const res = await fetch(f.file);
      if (!res.ok) throw new Error('No se encontró la tipografía ' + f.file);
      const buf = await res.arrayBuffer();
      f.bin = toBinary(buf);
      const face = new FontFace(f.css, buf.slice(0), { weight: String(f.w), style: 'normal' });
      await face.load(); document.fonts.add(face);
    })).then(() => true);
    fontsPromise.catch(() => { fontsPromise = null; });
  }
  return fontsPromise;
}
let measured = false;
function measureFaces() {
  if (measured) return;
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-10000px;top:0;white-space:nowrap;line-height:normal;font-kerning:none';
  document.body.appendChild(box);
  FACES.forEach(f => {
    box.innerHTML = `<span style="font-family:'${f.css}';font-weight:${f.w};font-size:100px">Hxgá<span style="display:inline-block;width:1px;height:0;vertical-align:baseline"></span></span>`;
    const span = box.firstChild, txt = span.firstChild, mark = span.lastChild;
    const rg = document.createRange(); rg.setStart(txt, 0); rg.setEnd(txt, txt.length);
    f.asc = (mark.getBoundingClientRect().bottom - rg.getBoundingClientRect().top) / 100;
  });
  box.remove(); measured = true;
}
function faceFor(cs) {
  const fam = (cs.fontFamily.split(',')[0] || '').toLowerCase();
  const w = parseInt(cs.fontWeight, 10) || 400;
  if (fam.includes('mono')) return FACES[6];
  if (fam.includes('condensed')) return w >= 750 ? FACES[5] : FACES[4];
  const opts = [FACES[0], FACES[1], FACES[2], FACES[3]];
  return opts.reduce((best, f) => Math.abs(f.w - w) < Math.abs(best.w - w) ? f : best, opts[1]);
}
function parseColor(str) {
  const m = /rgba?\(([^)]+)\)/.exec(str || ''); if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const a = p.length > 3 ? p[3] : 1; if (!(a > 0)) return null;
  return [0, 1, 2].map(i => Math.round(p[i] * a + 255 * (1 - a)));
}

/* ---------- chrome markup ---------- */
const CHROME = `
<div class="cz-bar">
  <div class="cz-bar-id">
    <h2 class="cz-heading">Cotizaciones</h2>
    <div class="cz-doc"><span class="cz-doc-num" data-el="num"></span><span class="cz-doc-client" data-el="client"></span></div>
    <span class="cz-status" data-el="status" data-s="new">Sin guardar</span>
  </div>
  <div class="cz-actions">
    <button class="cz-btn ghost" type="button" data-el="b-list">Guardadas <span class="cz-count" data-el="count" hidden></span></button>
    <button class="cz-btn ghost" type="button" data-el="b-new">Nueva</button>
    <button class="cz-btn ghost" type="button" data-el="b-dup">Duplicar</button>
    <button class="cz-btn" type="button" data-el="b-save">Guardar</button>
    <button class="cz-btn primary" type="button" data-el="b-pdf"><span class="cz-pdot" aria-hidden="true"></span><span data-el="b-pdf-label">Descargar PDF</span></button>
  </div>
</div>
<div class="cz-work">
  <div class="cz-desk">
    <div class="cz-deskbar">
      <span class="cz-pages" data-el="pages">1 página A4</span>
      <div class="cz-zoom" role="group" aria-label="Zoom">
        <button class="cz-zbtn" type="button" data-el="z-out" aria-label="Alejar">−</button>
        <button class="cz-zbtn cz-zval" type="button" data-el="z-fit" title="Ajustar al ancho">Ajustar</button>
        <button class="cz-zbtn" type="button" data-el="z-in" aria-label="Acercar">+</button>
      </div>
    </div>
    <div class="cz-scroller" data-el="scroller"><div class="cz-frame" data-el="frame"><article class="cz-sheet" data-el="sheet" lang="es"></article></div></div>
    <p class="cz-hint">Haz clic en cualquier texto de la propuesta para editarlo. Los botones para mover o quitar un bloque aparecen al pasar el cursor o al editarlo.</p>
  </div>
  <aside class="cz-panel" data-el="panel" aria-label="Ajustes de la propuesta">
    <section class="cz-group">
      <h3>Propuesta</h3>
      <label class="cz-field"><span>Número</span><input id="cz-f-number" autocomplete="off" spellcheck="false"></label>
      <div class="cz-row2">
        <label class="cz-field"><span>Fecha de emisión</span><input type="date" id="cz-f-issue"></label>
        <label class="cz-field"><span>Válida hasta</span><input type="date" id="cz-f-valid"></label>
      </div>
      <div class="cz-chips">Vigencia:
        <button class="cz-chip" type="button" data-days="7">7 días</button>
        <button class="cz-chip" type="button" data-days="15">15 días</button>
        <button class="cz-chip" type="button" data-days="30">30 días</button>
      </div>
    </section>
    <section class="cz-group">
      <h3>Montos</h3>
      <div class="cz-row2">
        <label class="cz-field"><span>Moneda</span>
          <select id="cz-f-currency"><option value="PEN">Soles (S/)</option><option value="USD">Dólares (USD)</option><option value="EUR">Euros (EUR)</option></select>
        </label>
        <label class="cz-field"><span>IGV (%)</span><input type="number" id="cz-f-igv" min="0" max="100" step="0.5" inputmode="decimal"></label>
      </div>
      <p class="cz-note">Los ítems de la tabla van sin símbolo; los totales llevan el símbolo de la moneda, como en la propuesta original.</p>
    </section>
    <section class="cz-group">
      <h3>Totales</h3>
      <div data-el="totals"></div>
    </section>
    <section class="cz-group">
      <h3>Bloques opcionales</h3>
      <label class="cz-toggle"><input type="checkbox" id="cz-f-excl"> Recuadro “No incluye”</label>
      <label class="cz-toggle"><input type="checkbox" id="cz-f-tnote"> Nota bajo la tabla</label>
    </section>
    <section class="cz-group">
      <h3>Envío</h3>
      <div class="cz-filebox"><span class="cz-mono" data-el="filename"></span><small data-el="filesize">PDF A4 vectorial, con texto real.</small></div>
      <label class="cz-field"><span>Texto sugerido para el correo</span><textarea id="cz-f-mail" readonly></textarea></label>
      <button class="cz-btn" type="button" data-el="b-copy">Copiar texto del correo</button>
    </section>
  </aside>
</div>`;

const LAYER = `
<div class="cz-scrim" data-el="scrim" hidden></div>
<aside class="cz-drawer" data-el="drawer" hidden aria-label="Cotizaciones guardadas">
  <div class="cz-dr-head">
    <h2>Cotizaciones</h2>
    <span class="cz-dr-mode" data-el="dr-mode"></span>
    <button class="cz-icon-btn" type="button" data-el="dr-close" aria-label="Cerrar">${IC.close}</button>
  </div>
  <div class="cz-dr-search"><input data-el="dr-q" type="search" placeholder="Buscar por cliente, número o título" autocomplete="off"></div>
  <div class="cz-dr-list" data-el="dr-list"></div>
</aside>
<div class="cz-modal" data-el="modal" hidden>
  <div class="cz-modal-box" role="dialog" aria-modal="true">
    <p data-el="modal-msg"></p>
    <div class="cz-modal-actions">
      <button class="cz-btn" type="button" data-el="modal-cancel">Cancelar</button>
      <button class="cz-btn primary" type="button" data-el="modal-ok">Continuar</button>
    </div>
  </div>
</div>`;

/* ================================================================================= */
export function mountCotizador(root, opts = {}) {
  const store = opts.store;
  const userKey = opts.userKey || 'anon';
  const notify = opts.notify || (() => {});
  const LS_CURRENT = `cz.current.${userKey}`;

  root.classList.add('cz-root');
  root.innerHTML = CHROME;
  const layer = document.createElement('div');
  layer.className = 'cz-root cz-layer';
  layer.innerHTML = LAYER;
  document.body.appendChild(layer);

  const el = name => root.querySelector(`[data-el="${name}"]`) || layer.querySelector(`[data-el="${name}"]`);
  const E = {};
  ['num', 'client', 'status', 'b-list', 'count', 'b-new', 'b-dup', 'b-save', 'b-pdf', 'b-pdf-label', 'pages', 'z-out', 'z-fit', 'z-in',
    'scroller', 'frame', 'sheet', 'panel', 'totals', 'filename', 'filesize', 'b-copy',
    'scrim', 'drawer', 'dr-mode', 'dr-close', 'dr-q', 'dr-list', 'modal', 'modal-msg', 'modal-cancel', 'modal-ok'].forEach(n => { E[n] = el(n); });
  const F = {};
  ['number', 'issue', 'valid', 'currency', 'igv', 'excl', 'tnote', 'mail'].forEach(n => { F[n] = root.querySelector(`#cz-f-${n}`); });
  const sheet = E.sheet;

  const PLAIN = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch (e) { return false; } return d.contentEditable === 'plaintext-only'; })();
  const CE = `contenteditable="${PLAIN ? 'plaintext-only' : 'true'}"`;

  let destroyed = false;
  const cleanups = [];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };
  const cancel = t => { if (t) { clearTimeout(t); timers.delete(t); } };

  /* ---------- state ---------- */
  const restored = readLS(LS_CURRENT);
  let state = restored && restored.state && restored.state.v === 1 ? normalize(restored.state) : blankQuote();
  let dirty = !!(restored && restored.state && restored.dirty);
  let touched = false;
  let saving = false, saveAgain = false, saveError = null, readOnly = false, saveTimer = null;
  let quotes = [];
  let storeReady = false;
  let storeProblem = '';

  const rowById = id => state.rows.find(r => r.id === id);
  const itemRows = () => state.rows.filter(r => r.type === 'item');
  function sumMembers(row) {
    if (Array.isArray(row.sum)) return itemRows().filter(i => row.sum.includes(i.id));
    if (row.type === 'subtotal') {
      const out = [], idx = state.rows.indexOf(row);
      for (let i = idx - 1; i >= 0; i--) { const r = state.rows[i]; if (r.type === 'subtotal') break; if (r.type === 'item') out.unshift(r); }
      return out;
    }
    return itemRows();
  }
  const hasManual = r => r.manual != null && parseAmount(r.manual) != null;
  function rowValue(r) {
    if (r.type === 'item') return parseAmount(r.amount) || 0;
    if (hasManual(r)) return parseAmount(r.manual);
    return round2(sumMembers(r).reduce((a, i) => a + (parseAmount(i.amount) || 0), 0));
  }
  function clientName() { const m = state.meta.find(x => /cliente/i.test(x.label)) || state.meta[0]; return (m && m.value || '').trim(); }
  function contactName() { const m = state.meta.find(x => /contacto/i.test(x.label)); return (m && m.value || '').trim(); }
  const titleLine = () => state.title.replace(/\s*\n\s*/g, ' ').trim();
  function summary() {
    const cur = CUR[state.currency] || CUR.PEN;
    const totals = state.rows.filter(r => r.type === 'total').map(rowValue);
    const vals = totals.length ? totals : [itemRows().reduce((a, r) => a + rowValue(r), 0)];
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return lo === hi ? `${cur.sym} ${fmt(lo)}` : `${cur.sym} ${fmt(lo)} – ${fmt(hi)}`;
  }
  const fileName = () => `Cotizacion_${slug(clientName()) || 'Cliente'}_${slug(state.number) || 'CS'}.pdf`;

  /* ---------- sheet rendering ---------- */
  function ed(val, o, tag = 'span') {
    const list = o.list ? ` data-list="${o.list}" data-id="${o.id}"` : '';
    return `<${tag} class="ed ${o.cls || ''}" ${CE}${list} data-f="${o.f}" data-ph="${esc(o.ph || '')}"${o.ml ? ' data-ml="1"' : ''} spellcheck="true">${esc(val)}</${tag}>`;
  }
  function ctrl(list, id, o = {}) {
    const b = (act, icon, label) => `<button type="button" data-act="${act}" data-list="${list}" data-id="${id}" title="${label}" aria-label="${label}">${icon}</button>`;
    return `<div class="cz-ctrl no-pdf ${o.cls || ''}" contenteditable="false">${o.tag ? b('tag', IC.tag, 'Etiqueta') : ''}${b('up', IC.up, 'Subir')}${b('down', IC.down, 'Bajar')}${b('del', IC.del, 'Eliminar')}</div>`;
  }
  const valuePh = label => /cliente/i.test(label) ? 'Nombre del cliente' : /contacto/i.test(label) ? 'Nombre del contacto' : 'por definir';

  function renderSheet() {
    const s = state;
    const h = [];
    h.push(`<header class="q-header" data-blk>
      <div><div class="q-wordmark">CEREZO<span class="q-dot">.</span>STUDIO</div>${ed(s.brandSub, { f: 'brandSub', cls: 'q-wsub', ph: 'Ciudad · web' }, 'div')}</div>
      <div class="q-hmeta"><div class="q-hlabel">Propuesta N.°</div>${ed(s.number, { f: 'number', ph: 'CS-2026-00' }, 'div')}
        <div class="calc" data-calc="issue" data-jump="cz-f-issue" title="Cambiar fecha de emisión"></div>
        <div class="calc" data-calc="valid" data-jump="cz-f-valid" title="Cambiar vigencia"></div></div>
    </header>`);
    h.push(`<div class="q-project" data-blk>
      ${ed(s.eyebrow, { f: 'eyebrow', cls: 'q-eyebrow', ph: 'Tipo de propuesta' }, 'div')}
      ${ed(s.title, { f: 'title', cls: 'q-title', ph: 'Título del proyecto', ml: 1 }, 'h1')}
      <div class="q-metarow">${s.meta.map(m => `<span class="q-meta">${ed(m.label, { list: 'meta', id: m.id, f: 'label', cls: 'lbl', ph: 'Dato' })} ${ed(m.value, { list: 'meta', id: m.id, f: 'value', ph: valuePh(m.label) })}<button class="cz-mini-del no-pdf" type="button" data-act="del" data-list="meta" data-id="${m.id}" title="Quitar dato" aria-label="Quitar dato">${IC.del}</button></span>`).join('')}<button class="cz-add no-pdf" type="button" data-act="add" data-list="meta">+ Dato</button></div>
    </div>`);
    h.push(`<section class="q-section">
      <div class="q-stitle" data-blk="keep">${ed(s.scopeTitle, { f: 'scopeTitle', ph: 'Título de sección' })}<span class="cz-adds no-pdf"><button class="cz-add" type="button" data-act="add" data-list="scope">+ Entregable</button></span></div>
      <div class="q-deliv">${s.scope.map(it => `<div class="q-item" data-blk><span class="q-bullet"></span><div class="q-ibody">${it.tag ? ed(it.tag, { list: 'scope', id: it.id, f: 'tag', cls: 'q-tag', ph: 'Etiqueta' }) : ''}${ed(it.text, { list: 'scope', id: it.id, f: 'text', ph: 'Describe el entregable' })}</div>${ctrl('scope', it.id, { tag: true })}</div>`).join('')}</div>
      ${s.showExcludes ? `<div class="q-note" data-blk>${ed(s.excludesLabel, { f: 'excludesLabel', cls: 'lbl', ph: 'No incluye:' })} ${ed(s.excludes, { f: 'excludes', ph: 'Lo que no forma parte de la propuesta' })}</div>` : ''}
    </section>`);
    const rows = s.rows.map(r => {
      const c = ctrl('rows', r.id, { cls: 'cz-ctrl-row' });
      const E2 = (f, ph, cls = 'blk') => ed(r[f], { list: 'rows', id: r.id, f, ph, cls });
      if (r.type === 'item') return `<tr class="q-row" data-blk><td class="q-name">${c}${E2('concept', 'Concepto')}</td><td class="q-detail">${E2('detail', 'Detalle')}</td><td class="q-price">${ed(amountDisplay(r.amount), { list: 'rows', id: r.id, f: 'amount', ph: '0', cls: 'blk' })}</td></tr>`;
      if (r.type === 'subtotal') return `<tr class="q-sub" data-blk><td colspan="2">${c}${E2('label', 'Subtotal')}</td><td class="q-price">${ed('', { list: 'rows', id: r.id, f: 'manual', ph: '0', cls: 'blk calc-amt' })}</td></tr>`;
      if (r.type === 'total') {
        const det = r.detail === 'text' ? E2('detailText', 'Detalle del total') : r.detail === 'igv' ? `<span class="calc" data-calc="igv" data-id="${r.id}"></span>` : '';
        return `<tr class="q-total" data-blk><td>${c}${E2('label', 'Total')}</td><td class="q-tdetail">${det}</td><td class="q-price">${ed('', { list: 'rows', id: r.id, f: 'manual', ph: '0', cls: 'blk calc-amt' })}</td></tr>`;
      }
      return `<tr class="q-space"><td colspan="3">${c}</td></tr>`;
    }).join('');
    h.push(`<section class="q-section">
      <div class="q-stitle" data-blk="keep">${ed(s.ecoTitle, { f: 'ecoTitle', ph: 'Título de sección' })}<span class="cz-adds no-pdf">
        <button class="cz-add" type="button" data-act="add" data-list="rows" data-type="item">+ Ítem</button>
        <button class="cz-add" type="button" data-act="add" data-list="rows" data-type="subtotal">+ Subtotal</button>
        <button class="cz-add" type="button" data-act="add" data-list="rows" data-type="total">+ Total</button>
        <button class="cz-add" type="button" data-act="add" data-list="rows" data-type="space">+ Espacio</button></span></div>
      <table class="q-table"><colgroup><col style="width:32%"><col style="width:52%"><col style="width:16%"></colgroup>
        <thead><tr data-blk="keep"><th>${ed(s.colConcept, { f: 'colConcept', ph: 'Concepto' })}</th><th>${ed(s.colDetail, { f: 'colDetail', ph: 'Detalle' })}</th><th><span class="calc" data-calc="curhead"></span></th></tr></thead>
        <tbody>${rows}</tbody></table>
      ${s.showTableNote ? `<p class="q-tnote" data-blk>${ed(s.tableNoteLabel, { f: 'tableNoteLabel', cls: 'lbl', ph: 'Nota:' })} ${ed(s.tableNote, { f: 'tableNote', ph: 'Aclaración sobre los montos (opcional)' })}</p>` : ''}
    </section>`);
    h.push(`<section class="q-section">
      <div class="q-stitle" data-blk="keep">${ed(s.termsTitle, { f: 'termsTitle', ph: 'Título de sección' })}<span class="cz-adds no-pdf"><button class="cz-add" type="button" data-act="add" data-list="terms">+ Condición</button></span></div>
      <div class="q-terms">${s.terms.map(t => `<div class="q-term" data-blk>${ed(t.label, { list: 'terms', id: t.id, f: 'label', cls: 'q-tlabel', ph: 'Título' }, 'div')}${ed(t.body, { list: 'terms', id: t.id, f: 'body', cls: 'q-tbody', ph: 'Condición principal', ml: 1 }, 'div')}${ed(t.note, { list: 'terms', id: t.id, f: 'note', cls: 'q-tnote2', ph: 'Nota en gris (opcional)', ml: 1 }, 'div')}${ctrl('terms', t.id)}</div>`).join('')}</div>
    </section>`);
    h.push(`<footer class="q-footer" data-blk>
      <div><div class="q-fword">CEREZO<span class="q-dot">.</span>STUDIO</div>${ed(s.footerContact, { f: 'footerContact', cls: 'q-fcontact', ml: 1, ph: 'Datos de contacto' }, 'div')}</div>
      <div class="q-valid">${ed(s.validityLabel, { f: 'validityLabel', ph: 'Propuesta válida hasta' }, 'div')}<span class="q-vdate calc" data-calc="validBadge" data-jump="cz-f-valid" title="Cambiar vigencia"></span></div>
    </footer>
    <div class="q-breaks no-pdf" data-el="breaks"></div>`);
    sheet.innerHTML = h.join('');
    refreshComputed();
  }

  function refreshComputed() {
    const s = state, cur = CUR[s.currency] || CUR.PEN, act = document.activeElement;
    const set = (node, txt) => { if (node !== act && node.textContent !== txt) node.textContent = txt; };
    sheet.querySelectorAll('[data-calc]').forEach(node => {
      const c = node.dataset.calc;
      if (c === 'issue') set(node, longDate(s.issueDate));
      else if (c === 'valid') set(node, s.validUntil ? `Válida hasta el ${longDate(s.validUntil)}` : '');
      else if (c === 'validBadge') set(node, longDate(s.validUntil));
      else if (c === 'curhead') set(node, cur.head);
      else if (c === 'igv') { const r = rowById(node.dataset.id); if (r) set(node, `Con factura (IGV ${fmtPct(s.igv)} %): ${cur.sym} ${fmt(round2(rowValue(r) * (1 + (Number(s.igv) || 0) / 100)))}`); }
    });
    sheet.querySelectorAll('.calc-amt').forEach(node => {
      const r = rowById(node.dataset.id); if (!r) return;
      const v = rowValue(r);
      set(node, r.type === 'total' ? `${cur.sym} ${fmt(v)}` : fmt(v));
      node.classList.toggle('is-manual', hasManual(r));
    });
    updateBar();
    schedulePanel();
    scheduleLayout();
  }

  /* ---------- inline editing ---------- */
  function setField(node, v) {
    const { list, id, f } = node.dataset;
    if (list) { const it = (state[list] || []).find(x => x.id === id); if (it) it[f] = v; }
    else state[f] = v;
  }
  sheet.addEventListener('input', e => {
    const node = e.target.closest && e.target.closest('.ed'); if (!node) return;
    let v = node.innerText.replace(/ /g, ' ');
    v = node.dataset.ml ? v.replace(/\n+$/, '') : v.replace(/\s*\n\s*/g, ' ');
    if (!v.trim() && node.innerHTML !== '') { node.innerHTML = ''; v = ''; }
    if (node.dataset.f === 'manual') v = v.trim() ? v : null;
    setField(node, v);
    if (node.dataset.f === 'number' && document.activeElement !== F.number) F.number.value = v;
    markDirty();
    refreshComputed();
  });
  sheet.addEventListener('keydown', e => {
    const node = e.target.closest && e.target.closest('.ed'); if (!node) return;
    if (e.key === 'Enter' && !node.dataset.ml) { e.preventDefault(); node.blur(); }
    if (!PLAIN && (e.metaKey || e.ctrlKey) && /^[biu]$/i.test(e.key)) e.preventDefault();
  });
  sheet.addEventListener('paste', e => {
    const node = e.target.closest && e.target.closest('.ed'); if (!node) return;
    e.preventDefault();
    let t = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    if (!node.dataset.ml) t = t.replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, t);
  });
  sheet.addEventListener('focusout', e => {
    const node = e.target.closest && e.target.closest('.ed'); if (!node) return;
    const r = node.dataset.list === 'rows' ? rowById(node.dataset.id) : null;
    if (r && node.dataset.f === 'amount') { const d = amountDisplay(r.amount); if (node.textContent !== d) node.textContent = d; }
    if (r && node.dataset.f === 'manual') {
      if (r.manual != null) {
        const typed = parseAmount(r.manual), saved = r.manual; r.manual = null;
        const auto = rowValue(r);
        r.manual = typed == null || typed === auto ? null : saved;
      }
      later(refreshComputed, 0);
    }
  });
  sheet.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) { const inp = root.querySelector('#' + j.dataset.jump); if (inp) { inp.focus(); try { if (inp.showPicker) inp.showPicker(); } catch (err) { /* selector no permitido */ } } return; }
    const b = e.target.closest('button[data-act]'); if (!b) return;
    e.preventDefault();
    doAction(b.dataset.act, b.dataset.list, b.dataset.id, b.dataset.type);
  });

  function doAction(act, list, id, type) {
    const arr = state[list]; if (!arr) return;
    const idx = arr.findIndex(x => x.id === id);
    let focusId = null, focusF = null;
    if (act === 'add') {
      if (list === 'meta') { const n = { id: uid(), label: 'Dato', value: '' }; arr.push(n); focusId = n.id; focusF = 'label'; }
      else if (list === 'scope') { const last = arr[arr.length - 1]; const n = { id: uid(), tag: last ? last.tag : '', text: '' }; arr.push(n); focusId = n.id; focusF = 'text'; }
      else if (list === 'terms') { const n = { id: uid(), label: 'Nueva condición', body: '', note: '' }; arr.push(n); focusId = n.id; focusF = 'body'; }
      else if (list === 'rows') {
        let n;
        if (type === 'item') {
          n = { id: uid(), type: 'item', concept: '', detail: '', amount: '' };
          let at = -1; arr.forEach((r, i) => { if (r.type === 'item') at = i; });
          arr.splice(at + 1, 0, n); focusF = 'concept';
        } else if (type === 'subtotal') { n = { id: uid(), type: 'subtotal', label: 'Subtotal', sum: null, manual: null }; arr.push(n); focusF = 'label'; }
        else if (type === 'total') { n = { id: uid(), type: 'total', label: 'Total', sum: null, manual: null, detail: 'igv', detailText: '' }; arr.push(n); focusF = 'label'; }
        else { n = { id: uid(), type: 'space' }; arr.push(n); }
        focusId = n.id;
      }
    } else if (idx < 0) return;
    else if (act === 'del') {
      arr.splice(idx, 1);
      if (list === 'rows') state.rows.forEach(r => { if (Array.isArray(r.sum)) r.sum = r.sum.filter(x => x !== id); });
    } else if (act === 'up' && idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }
    else if (act === 'down' && idx < arr.length - 1) { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; }
    else if (act === 'tag') { const it = arr[idx]; if (it.tag) it.tag = ''; else { it.tag = 'Etiqueta'; focusId = id; focusF = 'tag'; } }
    else return;
    markDirty();
    renderSheet();
    renderPanel();
    if (focusId && focusF) {
      const node = sheet.querySelector(`.ed[data-id="${focusId}"][data-f="${focusF}"]`);
      if (node) { node.focus(); const sel = getSelection(); const rg = document.createRange(); rg.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(rg); }
    }
  }

  /* ---------- tool bar, status & panel ---------- */
  function updateBar() {
    E.num.textContent = state.number || 'Sin número';
    E.client.textContent = clientName() || 'Cliente sin nombre';
    E.filename.textContent = fileName();
    let s, t;
    if (saving) { s = 'saving'; t = 'Guardando…'; }
    else if (saveError) { s = 'error'; t = saveError; }
    else if (readOnly) { s = 'ro'; t = 'Solo lectura'; }
    else if (!state.id) { s = 'new'; t = 'Sin guardar'; }
    else if (dirty) { s = 'dirty'; t = 'Cambios por guardar'; }
    else { s = 'ok'; t = 'Guardada en el equipo'; }
    E.status.dataset.s = s; E.status.textContent = t;
    E['b-save'].hidden = readOnly;
    E.count.hidden = !quotes.length; E.count.textContent = quotes.length;
  }

  let panelTimer = null;
  function schedulePanel() { cancel(panelTimer); panelTimer = later(() => { if (!E.panel.contains(document.activeElement)) renderPanel(); else syncPanelInputs(); }, 120); }
  function syncPanelInputs() {
    const a = document.activeElement;
    const setv = (node, v) => { if (node !== a && node.value !== String(v)) node.value = v; };
    setv(F.number, state.number || '');
    setv(F.issue, state.issueDate || '');
    setv(F.valid, state.validUntil || '');
    setv(F.currency, state.currency);
    setv(F.igv, state.igv);
    F.excl.checked = !!state.showExcludes;
    F.tnote.checked = !!state.showTableNote;
    F.mail.value = mailText();
  }
  function renderPanel() {
    syncPanelInputs();
    const cur = CUR[state.currency] || CUR.PEN;
    const sums = state.rows.filter(r => r.type === 'total' || r.type === 'subtotal');
    const items = itemRows();
    if (!sums.length) { E.totals.innerHTML = '<div class="cz-empty-note">Agrega un total desde la tabla con “+ Total”.</div>'; return; }
    E.totals.innerHTML = sums.map(r => {
      const members = sumMembers(r).map(i => i.id);
      const v = rowValue(r);
      return `<div class="cz-tcard">
        <div class="cz-tcard-head"><strong>${esc(r.label || (r.type === 'total' ? 'Total' : 'Subtotal'))}</strong><span class="cz-mono">${r.type === 'total' ? cur.sym + ' ' : ''}${fmt(v)}</span></div>
        ${hasManual(r) ? `<div class="cz-manual">Monto escrito a mano <button class="cz-linkbtn" type="button" data-auto="${r.id}">Usar la suma</button></div>` : ''}
        <span class="cz-kicker">Suma de</span>
        ${items.length ? items.map(i => `<label class="cz-check"><input type="checkbox" data-total="${r.id}" data-item="${i.id}" ${members.includes(i.id) ? 'checked' : ''}><span>${esc(i.concept || 'Ítem sin nombre')}</span><span class="cz-mono">${fmt(rowValue(i))}</span></label>`).join('') : '<span class="cz-note">No hay ítems en la tabla.</span>'}
        ${Array.isArray(r.sum) ? `<button class="cz-linkbtn" type="button" data-resetsum="${r.id}">${r.type === 'subtotal' ? 'Sumar los ítems de su grupo' : 'Sumar todos los ítems'}</button>` : ''}
        ${r.type === 'total' ? `<label class="cz-field"><span>Texto al centro de la franja</span><select data-detail="${r.id}">
          <option value="igv" ${r.detail === 'igv' ? 'selected' : ''}>Monto con IGV (${fmtPct(state.igv)} %)</option>
          <option value="text" ${r.detail === 'text' ? 'selected' : ''}>Texto libre</option>
          <option value="none" ${r.detail === 'none' || !r.detail ? 'selected' : ''}>Nada</option></select></label>` : ''}
      </div>`;
    }).join('');
  }

  E.panel.addEventListener('input', e => {
    const t = e.target;
    if (t === F.number) { state.number = t.value; const n = sheet.querySelector('.ed[data-f="number"]'); if (n) n.textContent = t.value; }
    else if (t === F.igv) state.igv = t.value === '' ? 0 : Number(t.value);
    else return;
    markDirty(); refreshComputed();
  });
  E.panel.addEventListener('change', e => {
    const t = e.target;
    if (t === F.issue) state.issueDate = t.value || isoToday();
    else if (t === F.valid) state.validUntil = t.value;
    else if (t === F.currency) state.currency = t.value;
    else if (t === F.excl) { state.showExcludes = t.checked; markDirty(); renderSheet(); return; }
    else if (t === F.tnote) { state.showTableNote = t.checked; markDirty(); renderSheet(); return; }
    else if (t.dataset.total) {
      const r = rowById(t.dataset.total); if (!r) return;
      const set = new Set(sumMembers(r).map(i => i.id));
      if (t.checked) set.add(t.dataset.item); else set.delete(t.dataset.item);
      r.sum = itemRows().map(i => i.id).filter(id => set.has(id));
      markDirty(); refreshComputed(); renderPanel(); return;
    } else if (t.dataset.detail) {
      const r = rowById(t.dataset.detail); if (!r) return;
      r.detail = t.value; markDirty(); renderSheet(); renderPanel(); return;
    } else return;
    markDirty(); refreshComputed();
  });
  E.panel.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.days) { state.validUntil = addDays(state.issueDate, Number(t.dataset.days)); markDirty(); refreshComputed(); syncPanelInputs(); }
    else if (t.dataset.auto) { const r = rowById(t.dataset.auto); if (r) { r.manual = null; markDirty(); refreshComputed(); renderPanel(); } }
    else if (t.dataset.resetsum) { const r = rowById(t.dataset.resetsum); if (r) { r.sum = null; markDirty(); refreshComputed(); renderPanel(); } }
  });

  function mailText() {
    const first = contactName().split(/\s+/)[0];
    const t = titleLine();
    return `Hola${first ? ' ' + first : ''}:\n\nTe compartimos la propuesta ${state.number}${t ? ' de ' + t.toLowerCase() : ''}${clientName() ? ' para ' + clientName() : ''}. Está vigente hasta el ${longDate(state.validUntil)}.\n\nAdjuntamos el PDF con el alcance, el desglose económico y las condiciones. Quedamos atentos a tus comentarios.\n\nSaludos,\nCerezo.Studio`;
  }
  E['b-copy'].addEventListener('click', () => {
    const ta = F.mail; const txt = ta.value;
    const fallback = () => { ta.focus(); ta.select(); notify('Texto seleccionado: cópialo con Cmd/Ctrl + C'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => notify('Texto del correo copiado', 'success'), fallback);
      else fallback();
    } catch (err) { fallback(); }
  });

  /* ---------- layout: zoom & page breaks ---------- */
  let zoom = null, scale = 1;
  const ZSTEPS = [0.4, 0.5, 0.6, 0.67, 0.75, 0.85, 1, 1.15, 1.3];
  function fitScale() {
    const cs = getComputedStyle(E.scroller);
    const avail = E.scroller.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(0.2, Math.min(1, avail / SHEET_W));
  }
  function applyZoom() {
    if (destroyed) return;
    scale = zoom == null ? fitScale() : zoom;
    sheet.style.transform = `scale(${scale})`;
    E.frame.style.width = Math.floor(SHEET_W * scale) + 'px';
    E.frame.style.height = Math.ceil(sheet.offsetHeight * scale) + 'px';
    E['z-fit'].textContent = zoom == null ? `Ajustar · ${Math.round(scale * 100)}%` : `${Math.round(scale * 100)}%`;
  }
  E['z-in'].addEventListener('click', () => { const s = zoom == null ? scale : zoom; zoom = ZSTEPS.find(z => z > s + 0.001) || ZSTEPS[ZSTEPS.length - 1]; applyZoom(); });
  E['z-out'].addEventListener('click', () => { const s = zoom == null ? scale : zoom; zoom = [...ZSTEPS].reverse().find(z => z < s - 0.001) || ZSTEPS[0]; applyZoom(); });
  E['z-fit'].addEventListener('click', () => { zoom = null; applyZoom(); });
  const ro = new ResizeObserver(() => applyZoom());
  ro.observe(E.scroller); ro.observe(sheet);
  cleanups.push(() => ro.disconnect());

  function sheetGeom() {
    const base = sheet.getBoundingClientRect(); const k = base.width / SHEET_W;
    return { rel: r => ({ x: (r.left - base.left) / k, y: (r.top - base.top) / k, w: r.width / k, h: r.height / k }) };
  }
  function collectBlocks() {
    const { rel } = sheetGeom();
    return Array.from(sheet.querySelectorAll('[data-blk]')).filter(n => n.getClientRects().length).map(n => {
      const r = rel(n.getBoundingClientRect());
      return { y: r.y, b: r.y + r.h, keep: n.dataset.blk === 'keep' };
    });
  }
  function paginate(blocks) {
    blocks = blocks.slice().sort((a, b) => a.y - b.y);
    const breaks = []; let top = 0;
    for (let i = 0; i < blocks.length; i++) {
      const bl = blocks[i];
      if (bl.b > top + PAGE_H - PAD_B && bl.y > top + PAD_T + 2) {
        let at = bl.y;
        for (let j = i - 1; j >= 0; j--) {
          const p = blocks[j];
          if (p.b < at - 40) break;
          if (p.keep && p.y > top + PAD_T + 2) at = Math.min(at, p.y);
        }
        breaks.push(at); top = at - PAD_T;
      }
    }
    return breaks;
  }
  let layoutQueued = false;
  function scheduleLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    nextFrame(() => {
      layoutQueued = false;
      if (destroyed) return;
      const br = paginate(collectBlocks());
      const holder = sheet.querySelector('[data-el="breaks"]');
      if (holder) holder.innerHTML = br.map((y, i) => `<div class="q-break" style="top:${y - 12}px"><span>Página ${i + 2}</span></div>`).join('');
      const pages = br.length + 1;
      E.pages.dataset.over = pages > 1 ? '1' : '0';
      E.pages.textContent = pages > 1 ? `${pages} páginas A4 · el formato original ocupa 1` : '1 página A4';
      applyZoom();
    });
  }

  /* ---------- PDF: walk the sheet and redraw it as vectors ---------- */
  function collectOps() {
    const { rel } = sheetGeom();
    const ops = [], blocks = [], range = document.createRange();
    const textOps = (node, cs) => {
      const text = node.nodeValue; if (!/\S/.test(text)) return;
      const face = faceFor(cs), fs = parseFloat(cs.fontSize);
      const ls = cs.letterSpacing === 'normal' ? 0 : (parseFloat(cs.letterSpacing) || 0);
      const col = parseColor(cs.color) || [0, 0, 0];
      const up = cs.textTransform === 'uppercase';
      const re = /\S+/g; let m;
      while ((m = re.exec(text))) {
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        const rs = range.getClientRects(); if (!rs.length) continue;
        const r = rel(rs[0]); if (r.w <= 0) continue;
        ops.push({ t: 't', s: up ? m[0].toLocaleUpperCase('es') : m[0], x: r.x, y: r.y, base: r.y + face.asc * fs, f: face.key, fs, ls, c: col });
      }
    };
    const walk = node => {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || node.classList.contains('no-pdf')) return;
      const vis = cs.visibility !== 'hidden';
      if (node !== sheet && vis) {
        let box = null; const B = () => box || (box = rel(node.getBoundingClientRect()));
        const bg = parseColor(cs.backgroundColor);
        if (bg) ops.push(Object.assign({ t: 'r', c: bg }, B()));
        ['Top', 'Right', 'Bottom', 'Left'].forEach(s => {
          const w = parseFloat(cs['border' + s + 'Width']);
          if (!(w > 0) || cs['border' + s + 'Style'] === 'none') return;
          const c = parseColor(cs['border' + s + 'Color']); if (!c) return;
          const b = B();
          const r = s === 'Top' ? { x: b.x, y: b.y, w: b.w, h: w } : s === 'Bottom' ? { x: b.x, y: b.y + b.h - w, w: b.w, h: w }
            : s === 'Left' ? { x: b.x, y: b.y, w, h: b.h } : { x: b.x + b.w - w, y: b.y, w, h: b.h };
          ops.push(Object.assign({ t: 'r', c }, r));
        });
        if (node.dataset.blk !== undefined) { const b = B(); blocks.push({ y: b.y, b: b.y + b.h, keep: node.dataset.blk === 'keep' }); }
      }
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { if (vis) textOps(n, cs); }
        else if (n.nodeType === 1) walk(n);
      }
    };
    walk(sheet);
    return { ops, blocks };
  }
  function drawPdf(JsPDF, ops, breaks) {
    const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
    FACES.forEach(f => { doc.addFileToVFS(f.key + '.ttf', f.bin); doc.addFont(f.key + '.ttf', f.key, 'normal'); });
    for (let i = 0; i < breaks.length; i++) doc.addPage();
    const pageOf = y => { let p = 0; while (p < breaks.length && y >= breaks[p] - 0.5) p++; return p; };
    // En PDF el texto y los rellenos comparten el color: se fija en cada operación.
    let curPage = -1, curFont = '', curSize = 0;
    ops.forEach(op => {
      const p = pageOf(op.y);
      if (p !== curPage) { doc.setPage(p + 1); curPage = p; }
      const off = p ? breaks[p - 1] - PAD_T : 0;
      if (op.t === 'r') {
        doc.setFillColor(op.c[0], op.c[1], op.c[2]);
        doc.rect(op.x * PT, (op.y - off) * PT, op.w * PT, op.h * PT, 'F');
      } else {
        if (op.f !== curFont) { doc.setFont(op.f, 'normal'); curFont = op.f; }
        if (op.fs !== curSize) { doc.setFontSize(op.fs * PT); curSize = op.fs; }
        doc.setTextColor(op.c[0], op.c[1], op.c[2]);
        doc.text(op.s, op.x * PT, (op.base - off) * PT, op.ls ? { charSpace: op.ls * PT } : undefined);
      }
    });
    doc.setProperties({
      title: `Propuesta ${state.number}${clientName() ? ' · ' + clientName() : ''}`,
      subject: titleLine(), author: 'Cerezo.Studio', keywords: 'cotización, propuesta', creator: 'Cotizador Cerezo'
    });
    if (typeof doc.setLanguage === 'function') { try { doc.setLanguage('es-PE'); } catch (e) { /* opcional */ } }
    return doc.output('blob');
  }
  async function buildPdfBlob() {
    const [mod] = await Promise.all([import('jspdf'), loadFonts()]);
    const JsPDF = mod.jsPDF || mod.default;
    measureFaces();
    if (sheet.contains(document.activeElement)) document.activeElement.blur();
    sheet.classList.add('exporting');
    void sheet.offsetHeight; await raf();
    let res;
    try { res = collectOps(); } finally { sheet.classList.remove('exporting'); }
    const breaks = paginate(res.blocks);
    return { blob: drawPdf(JsPDF, res.ops, breaks), pages: breaks.length + 1 };
  }

  let exporting = false;
  E['b-pdf'].addEventListener('click', async () => {
    if (exporting) return;
    exporting = true; E['b-pdf'].disabled = true; E['b-pdf-label'].textContent = 'Generando…';
    try {
      const { blob, pages } = await buildPdfBlob();
      E.filesize.textContent = `Último PDF: ${kb(blob.size)} · ${pages} ${pages > 1 ? 'páginas' : 'página'} A4 · texto real`;
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify(`PDF listo · ${kb(blob.size)}`, 'success');
    } catch (err) {
      console.error(err); notify(err && err.message ? err.message : 'No se pudo generar el PDF', 'error');
    } finally {
      exporting = false; E['b-pdf'].disabled = false; E['b-pdf-label'].textContent = 'Descargar PDF';
    }
  });

  /* ---------- saving ---------- */
  let lsTimer = null;
  function persistLocal() { cancel(lsTimer); lsTimer = later(() => writeLS(LS_CURRENT, { state, dirty, at: Date.now() }), 300); }
  function markDirty() {
    dirty = true; touched = true; saveError = null;
    persistLocal();
    if (state.id && !readOnly) { cancel(saveTimer); saveTimer = later(() => saveNow(), 1500); }
    updateBar();
  }
  function bodyFor() {
    const doc = clone(state); delete doc.id;
    return { number: state.number || '', client: clientName(), title: titleLine(), summary: summary(), doc };
  }
  async function saveNow() {
    cancel(saveTimer);
    if (!store) return;
    if (readOnly) { notify('Tu usuario solo puede ver estas cotizaciones.', 'error'); return; }
    if (saving) { saveAgain = true; return; }
    const isNew = !state.id;
    if (isNew) {
      const n = (state.number || '').trim().toLowerCase();
      if (quotes.some(q => (q.number || '').trim().toLowerCase() === n)) notify(`Ojo: ya existe otra cotización con el número ${state.number}`);
    }
    saving = true; saveError = null; updateBar();
    const wasDirty = dirty; dirty = false;
    try {
      const res = await store.save(state.id, bodyFor());
      if (isNew && res && res.id) state.id = res.id;
      if (isNew) notify('Cotización guardada para el equipo', 'success');
    } catch (e) {
      dirty = wasDirty || true;
      if (e && e.code === 'forbidden') { readOnly = true; notify('No tienes permiso para guardar cotizaciones.', 'error'); }
      else if (e && e.code === 'missing_table') { saveError = 'Falta la tabla en Supabase'; notify('Todavía no se puede guardar: falta crear la tabla de cotizaciones en Supabase. Puedes seguir editando y descargar el PDF.', 'error'); }
      else { saveError = 'No se pudo guardar'; notify('No se pudo guardar. Revisa tu conexión e inténtalo otra vez.', 'error'); }
    } finally {
      saving = false;
      if (!destroyed) { persistLocal(); updateBar(); }
      else writeLS(LS_CURRENT, { state, dirty, at: Date.now() });
      if (saveAgain) { saveAgain = false; if (dirty && state.id) saveNow(); }
    }
    refreshList();
  }
  async function flushSave() { if (state.id && dirty && !readOnly) await saveNow(); }

  async function refreshList() {
    if (!store || destroyed) return;
    try {
      quotes = await store.list();
      storeReady = true; storeProblem = '';
      updateBar();
      if (!E.drawer.hidden) renderDrawer();
    } catch (e) {
      console.warn('cotizaciones', e);
      if (e && e.code === 'forbidden') { readOnly = true; updateBar(); }
      storeProblem = e && e.code === 'missing_table'
        ? 'Falta crear la tabla de cotizaciones en Supabase. Mientras tanto puedes editar y descargar el PDF.'
        : 'No se pudieron cargar las cotizaciones guardadas. Revisa tu conexión.';
      if (!E.drawer.hidden) renderDrawer();
    }
  }
  function nextNumber() {
    const y = new Date().getFullYear();
    let max = 0, width = 2;
    quotes.forEach(q => {
      const m = /^CS-(\d{4})-(\d+)$/i.exec(String(q.number || '').trim());
      if (m && +m[1] === y) { max = Math.max(max, +m[2]); width = Math.max(width, m[2].length); }
    });
    return `CS-${y}-${String(max + 1).padStart(width, '0')}`;
  }
  async function firstLoad() {
    await refreshList();
    if (destroyed || !storeReady) return;
    if (!restored && !touched) {
      if (quotes.length) { loadQuote(quotes[0]); return; }
      state.number = nextNumber(); renderSheet(); renderPanel();
    } else if (state.id) {
      const q = quotes.find(x => x.id === state.id);
      if (q && !dirty && (q.updatedAt || 0) > ((restored && restored.at) || 0)) loadQuote(q);
      else if (dirty && !readOnly) saveNow();
      else if (!q) { state.id = null; updateBar(); }
    }
  }

  /* ---------- opening, new, duplicate ---------- */
  function afterLoad() { renderSheet(); renderPanel(); persistLocal(); updateBar(); E.scroller.scrollTop = 0; }
  function loadQuote(q) {
    state = normalize(clone(q.doc || {})); state.id = q.id;
    dirty = false; saveError = null; afterLoad();
  }
  async function guardLeave() {
    if (!state.id && dirty) return ask('Esta cotización todavía no está guardada. Si continúas, se perderán los cambios.', 'Descartar cambios');
    return true;
  }
  E['b-save'].addEventListener('click', () => saveNow());
  E['b-new'].addEventListener('click', async () => {
    if (!await guardLeave()) return;
    await flushSave();
    state = blankQuote(nextNumber()); dirty = false; afterLoad();
    notify(`Nueva cotización ${state.number}`);
  });
  function duplicateFrom(src) {
    const d = normalize(clone(src));
    d.id = null; d.number = nextNumber(); d.issueDate = isoToday(); d.validUntil = addDays(d.issueDate, 15);
    state = d; dirty = true; touched = true; afterLoad();
    notify(`Copia creada como ${state.number}. Guárdala cuando esté lista.`);
  }
  E['b-dup'].addEventListener('click', async () => { await flushSave(); duplicateFrom(state); });
  const onKey = e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); }
    if (e.key === 'Escape' && !E.drawer.hidden) closeDrawer();
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));

  /* ---------- drawer ---------- */
  let pendingDelete = null;
  function openDrawer() { E.drawer.hidden = false; E.scrim.hidden = false; renderDrawer(); refreshList(); setTimeout(() => E['dr-q'].focus(), 30); }
  function closeDrawer() { E.drawer.hidden = true; E.scrim.hidden = true; pendingDelete = null; }
  E['b-list'].addEventListener('click', openDrawer);
  E['dr-close'].addEventListener('click', closeDrawer);
  E.scrim.addEventListener('click', closeDrawer);
  E['dr-q'].addEventListener('input', renderDrawer);
  function renderDrawer() {
    E['dr-mode'].textContent = readOnly ? 'Del equipo · solo lectura' : 'Compartidas con el equipo';
    const q = E['dr-q'].value.trim().toLowerCase();
    const list = quotes.filter(x => !q || [x.number, x.client, x.title].some(v => String(v || '').toLowerCase().includes(q)));
    if (!storeReady) { E['dr-list'].innerHTML = `<div class="cz-dr-empty">${esc(storeProblem || 'Cargando cotizaciones…')}</div>`; return; }
    if (!quotes.length) { E['dr-list'].innerHTML = '<div class="cz-dr-empty">Todavía no hay cotizaciones guardadas.<br>Usa “Guardar” y aparecerán aquí para todo el equipo.</div>'; return; }
    if (!list.length) { E['dr-list'].innerHTML = `<div class="cz-dr-empty">Ninguna cotización coincide con “${esc(q)}”.</div>`; return; }
    E['dr-list'].innerHTML = list.map(x => `<div class="cz-qi ${x.id === state.id ? 'active' : ''}">
      <button class="cz-qi-open" type="button" data-open="${esc(x.id)}">
        <span class="cz-qi-top"><span class="cz-qi-num">${esc(x.number || 'Sin número')}</span><span class="cz-qi-total">${esc(x.summary || '')}</span></span>
        <span class="cz-qi-client">${esc(x.client || 'Cliente sin nombre')}</span>
        <span class="cz-qi-title">${esc(x.title || '')}</span>
        <span class="cz-qi-meta">Editada ${esc(relTime(x.updatedAt))}${x.updatedByName ? ' por ' + esc(x.updatedByName) : ''}</span>
      </button>
      <div class="cz-qi-actions">${pendingDelete === x.id
        ? `<span class="cz-ask">¿Eliminar ${esc(x.number || 'esta cotización')}? No se puede deshacer.</span><button type="button" class="confirm" data-delok="${esc(x.id)}">Sí, eliminar</button><button type="button" data-delno="1">Cancelar</button>`
        : `<button type="button" data-open="${esc(x.id)}">Abrir</button><button type="button" data-dupq="${esc(x.id)}">Duplicar</button>${readOnly ? '' : `<button type="button" class="danger" data-del="${esc(x.id)}">Eliminar</button>`}`}</div>
    </div>`).join('');
  }
  E['dr-list'].addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const find = id => quotes.find(x => x.id === id);
    if (b.dataset.open) {
      const q = find(b.dataset.open); if (!q) return;
      if (q.id === state.id) { closeDrawer(); return; }
      if (!await guardLeave()) return;
      await flushSave(); loadQuote(q); closeDrawer();
    } else if (b.dataset.dupq) {
      const q = find(b.dataset.dupq); if (!q) return;
      if (!await guardLeave()) return;
      await flushSave(); duplicateFrom(Object.assign({}, q.doc)); closeDrawer();
    } else if (b.dataset.del) { pendingDelete = b.dataset.del; renderDrawer(); }
    else if (b.dataset.delno) { pendingDelete = null; renderDrawer(); }
    else if (b.dataset.delok) {
      const id = b.dataset.delok; pendingDelete = null;
      try {
        await store.remove(id);
        if (state.id === id) { state.id = null; dirty = true; persistLocal(); updateBar(); }
        notify('Cotización eliminada');
      } catch (err) { notify('No se pudo eliminar la cotización', 'error'); }
      await refreshList(); renderDrawer();
    }
  });

  /* ---------- modal ---------- */
  function ask(msg, okLabel) {
    return new Promise(resolve => {
      E['modal-msg'].textContent = msg; E['modal-ok'].textContent = okLabel || 'Continuar';
      E.modal.hidden = false; E['modal-cancel'].focus();
      const done = v => { E.modal.hidden = true; E['modal-ok'].onclick = E['modal-cancel'].onclick = null; resolve(v); };
      E['modal-ok'].onclick = () => done(true);
      E['modal-cancel'].onclick = () => done(false);
    });
  }

  /* ---------- boot ---------- */
  renderSheet();
  renderPanel();
  updateBar();
  loadFonts().then(() => scheduleLayout()).catch(err => console.warn('Tipografías del cotizador:', err));
  if (store && store.subscribe) cleanups.push(store.subscribe(() => refreshList()));
  firstLoad();

  if (typeof window !== 'undefined') window.__czBuildPdf = buildPdfBlob;

  return function destroy() {
    if (destroyed) return;
    // Un cambio pendiente de autoguardado se envía al salir de la vista.
    if (state.id && dirty && !readOnly) { cancel(saveTimer); saveNow(); }
    // Solo se recuerda como "copia de trabajo" algo abierto o editado, no la plantilla vacía.
    if (state.id || touched) writeLS(LS_CURRENT, { state, dirty, at: Date.now() });
    destroyed = true;
    timers.forEach(t => clearTimeout(t)); timers.clear();
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* ya desmontado */ } });
    layer.remove();
    root.innerHTML = '';
    root.classList.remove('cz-root');
    if (window.__czBuildPdf === buildPdfBlob) delete window.__czBuildPdf;
  };
}
