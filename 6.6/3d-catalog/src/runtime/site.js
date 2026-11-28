// ===== Подключение OBJ-моделей к каталогу сайта =====
const REG = (function () {
  try {
    const el = document.getElementById('obj-models-data');
    const t = el ? el.textContent.trim() : '';
    const d = t ? JSON.parse(t) : {};
    return { models: Array.isArray(d.models) ? d.models : [], hidden: Array.isArray(d.hidden) ? d.hidden : [] };
  } catch (err) { console.error('OBJ models registry error', err); return { models: [], hidden: [] }; }
})();
const byId = new Map(), state = new Map();
function geoVis(e) { const off = geoOff(e); return geoParams(e.geo).filter(function (p) { return !off.has(p.key); }); }
function schemaOfGeo(e) {
  const rg = (e.ui && e.ui.rg) || {};
  return geoVis(e).map(function (p) {
    let mn = p.min, mx = p.max;
    const o = rg[p.key];
    if (o && o.length === 2 && isFinite(o[0]) && isFinite(o[1])) { mn = +o[0]; mx = +o[1]; }
    mn = Math.min(mn, p.def); mx = Math.max(mx, p.def);
    return { key: p.key, min: Math.floor(mn * 10) / 10, max: Math.ceil(mx * 10) / 10, step: p.unit === 'pct' ? 1 : 0.1, def: p.def, unit: p.unit };
  });
}
function paramsOfGeo(e, lang) {
  const o = {};
  geoVis(e).forEach(function (p) { const ov = e.ui && e.ui.lab && e.ui.lab[p.key]; o[p.key] = (ov && ov[lang]) || p.lab[lang]; });
  return o;
}
function buildNB(pos, n) {
  const fn = faceNormals(pos, n), c = Math.cos(40 * Math.PI / 180), map = new Map();
  const key = function (i) { return Math.round(pos[i * 3] * 1e4) + ',' + Math.round(pos[i * 3 + 1] * 1e4) + ',' + Math.round(pos[i * 3 + 2] * 1e4); };
  for (let i = 0; i < n * 3; i++) { const k = key(i); (map.get(k) || map.set(k, []).get(k)).push((i / 3) | 0); }
  const offs = new Int32Array(n * 3 + 1), list = [];
  for (let i = 0; i < n * 3; i++) {
    const f = (i / 3) | 0;
    for (const j of map.get(key(i))) if (fn[j * 3] * fn[f * 3] + fn[j * 3 + 1] * fn[f * 3 + 1] + fn[j * 3 + 2] * fn[f * 3 + 2] > c) list.push(j);
    offs[i + 1] = list.length;
  }
  return { off: offs, list: Int32Array.from(list) };
}
function visOf(e) {
  const off = offSet(e), pl = paramList(e.axes);
  const nw = pl.filter(function (p) { return isWall(p) && !off.has(p.key); }).length;
  return pl.filter(function (p) { return !off.has(p.key) && (p.kind !== 'm' || nw > 1); });
}
function limitsOf(e, p) {
  const ax = p.ax, rg = (e.ui && e.ui.rg && e.ui.rg[p.key]) || null;
  let mn, mx, def;
  if (p.kind === 'm') { mn = 30; mx = 300; def = 100; } else if (p.kind === 't') { mn = ax.trng[0]; mx = ax.trng[1]; def = ax.tdef; } else { mn = ax.rng[p.i][0]; mx = ax.rng[p.i][1]; def = ax.def[p.i]; }
  if (rg && rg.length === 2 && isFinite(rg[0]) && isFinite(rg[1])) { mn = +rg[0]; mx = +rg[1]; }
  return { mn: Math.min(mn, def), mx: Math.max(mx, def), def: def };
}
function schemaOf(e) {
  return visOf(e).map(function (p) {
    const l = limitsOf(e, p);
    if (p.kind === 'm') return { key: p.key, min: l.mn, max: l.mx, step: 1, def: 100, unit: 'pct' };
    return { key: p.key, min: Math.floor(l.mn * 10) / 10, max: Math.ceil(l.mx * 10) / 10, step: 0.1, def: l.def, unit: 'mm' };
  });
}
function paramsOf(e, lang) {
  const o = {};
  visOf(e).forEach(function (p) { o[p.key] = labelOf(e, p, lang); });
  return o;
}
const PLACEHOLDER = '<svg viewBox="0 0 120 120" fill="none"><polygon points="22,70 60,90 98,70 60,50" fill="#cbd5e1" stroke="#0f172a" stroke-width="2.4"/><polygon points="22,70 60,90 60,104 22,84" fill="#94a3b8" stroke="#0f172a" stroke-width="2.4"/><polygon points="60,90 98,70 98,84 60,104" fill="#64748b" stroke="#0f172a" stroke-width="2.4"/></svg>';
REG.hidden.forEach(function (hid) {
  const i = MODEL_DEFS.findIndex(function (m) { return m.id === hid; });
  if (i >= 0) MODEL_DEFS.splice(i, 1);
});
REG.models.forEach(function (e) {
  if (!e || !e.id || !e.pos || !e.idx || !(Array.isArray(e.axes) || e.geo)) return;
  if (byId.has(e.id) || MODEL_DEFS.some(function (m) { return m.id === e.id; })) return;
  byId.set(e.id, e);
  MODEL_DEFS.push({
    id: e.id, color: e.color || '#4a4d52', obj: true, schema: e.geo ? schemaOfGeo(e) : schemaOf(e),
    svg: !e.thumb ? PLACEHOLDER : (e.thn ? tintSvg(e.thumb, e.color || '#4a4d52', e.id) : '<svg viewBox="0 0 120 120" fill="none"><image href="' + e.thumb + '" x="0" y="0" width="120" height="120"/></svg>'),
    svgFn: (e.thumb && e.thn) ? function (c) { return tintSvg(e.thumb, c, e.id + '-c'); } : null
  });
  Object.keys(I18N).forEach(function (lang) {
    if (!I18N[lang].models) I18N[lang].models = {};
    I18N[lang].models[e.id] = { name: pick(e.name, lang) || e.src || e.id, tag: pick(e.tag, lang), desc: pick(e.desc, lang), params: e.geo ? paramsOfGeo(e, lang) : paramsOf(e, lang) };
  });
});
// ленивая подготовка модели при первом открытии
function ensure(id) {
  let S = state.get(id);
  if (S) return S;
  const e = byId.get(id);
  if (!e) return null;
  const ub = b64dec(e.pos), ib = b64dec(e.idx);
  const U = new Float32Array(ub.buffer, 0, ub.byteLength / 4);
  const I = e.ib === 4 ? new Uint32Array(ib.buffer, 0, ib.byteLength / 4) : new Uint16Array(ib.buffer, 0, ib.byteLength / 2);
  const pos = expand(U, I), n = I.length / 3;
  if (e.geo) {
    const G = geoDetect(U, I), st = JSON.parse(JSON.stringify(e.geo.st));
    while (st.hf.length < G.holes.length) st.hf.push(1);
    while (st.df.length < G.bosses.length) st.df.push(1);
    while (st.sf.length < G.slopes.length) st.sf.push(1);
    const snap = {}, keys = [];
    schemaOfGeo(e).forEach(function (s) { snap[s.key] = s.def; keys.push(s.key); });
    const S2 = { e: e, geo: true, U: U, I: I, pos: pos, n: n, G: G, g: e.geo, st: st, NB: e.s ? buildNB(pos, n) : null,
                 out: new Float32Array(n * 9), W: new Float32Array(U.length), snap: snap, keys: keys, vis: new Set(keys), zu: !!e.z };
    // значения применяются в постоянном порядке, как бы ни были расставлены карточки
    S2.akeys = geoParams(Object.assign({}, e.geo, { st: Object.assign({}, st, { ord: null }) })).map(function (p) { return p.key; }).filter(function (k) { return S2.vis.has(k); });
    state.set(id, S2);
    return S2;
  }
  const AX = detect(pos, n, { split: !!e.split }), off = offSet(e), pl = paramList(e.axes);
  AX.forEach(function (A, i) {
    const m = e.axes[i];
    if (!m || m.n !== A.vals.length) { console.warn('OBJ model axis mismatch', id, i); return; }
    A.vals = m.def.slice(); A.rng = m.rng.map(function (r) { return r.slice(); }); A.trng = m.trng.slice();
    pl.forEach(function (p) {
      if (p.ai !== i || p.kind === 'm') return;
      const l = limitsOf(e, p);
      if (p.kind === 't') A.trng = [l.mn, l.mx]; else A.rng[p.i] = [l.mn, l.mx];
    });
    if (!A.sym) {
      A.free = A.vals.map(function (_, j) { return !off.has('a' + i + 's' + j); });
      A.seg = A.vals.length > 1 && A.free.some(Boolean);
    }
  });
  const NB = e.s ? buildNB(pos, n) : null;
  const snap = {}, vis = new Set();
  schemaOf(e).forEach(function (s) { snap[s.key] = s.def; vis.add(s.key); });
  const walls = [];
  paramList(e.axes).forEach(function (p) {
    if (!isWall(p) || off.has(p.key)) return;
    const l = limitsOf(e, p), ax = e.axes[p.ai];
    walls.push({ key: p.key, orig: (ax.orig && ax.orig[p.i]) || ax.def[p.i], min: l.mn, max: l.mx });
  });
  const lk = (e.ui && e.ui.link) || { show: true, on: false };
  S = { e: e, pos: pos, n: n, AX: AX, NB: NB, out: new Float32Array(n * 9), snap: snap, vis: vis, zu: !!e.z,
        walls: walls, linkShow: lk.show !== false && walls.length > 1, link: !!lk.on };
  state.set(id, S);
  return S;
}
function syncKeys(id, p, keys) {
  if (!keys.length || typeof activeModelId === 'undefined' || activeModelId !== id) return;
  const def = MODEL_DEFS.find(function (x) { return x.id === id; });
  if (!def) return;
  keys.forEach(function (k) {
    const item = def.schema.find(function (s) { return s.key === k; });
    if (!item) return;
    const disp = mmToDisplay(p[k], item);
    const rg = paramsContainer.querySelector('input[type="range"][data-key="' + k + '"]');
    const nm = document.getElementById('num-' + k);
    if (rg) rg.value = String(disp);
    if (nm && document.activeElement !== nm) nm.value = formatManualInputNumber(disp, item);
  });
}
function buildOld(S, id, p) {
  const AX = S.AX, changed = [], vis = S.vis, forced = [];
  const hasM = vis.has('wall_all') && S.walls.length > 1;
  if (S.walls.length > 1) {
    const ch = S.walls.filter(function (w) { return typeof p[w.key] === 'number' && p[w.key] !== S.snap[w.key]; });
    const mCh = hasM && typeof p.wall_all === 'number' && p.wall_all !== S.snap.wall_all;
    if (mCh && ch.length === 0) {
      const r = wallScaleF(S.walls, p.wall_all / 100);
      S.walls.forEach(function (w) { p[w.key] = r.vals[w.key]; forced.push(w.key); });
      p.wall_all = r.f * 100;
    } else if (S.link && ch.length === 1 && !mCh) {
      const m = wallScale(S.walls, ch[0].key, p[ch[0].key]);
      if (m) S.walls.forEach(function (w) { p[w.key] = m[w.key]; forced.push(w.key); });
    }
  }
  AX.forEach(function (A) {
    const ai = A.a, kt = 'a' + ai + 't';
    let segCh = false;
    A.vals.forEach(function (_, i) {
      const k = 'a' + ai + 's' + i;
      if (!vis.has(k)) return;
      if (typeof p[k] === 'number' && p[k] !== S.snap[k]) { setSeg(A, i, p[k]); segCh = true; }
    });
    if (!segCh && vis.has(kt) && typeof p[kt] === 'number' && p[kt] !== S.snap[kt]) setTotal(A, p[kt]);
    A.vals.forEach(function (_, i) {
      const k = 'a' + ai + 's' + i;
      if (!vis.has(k)) return;
      if (p[k] !== A.vals[i]) { p[k] = A.vals[i]; changed.push(k); }
      S.snap[k] = A.vals[i];
    });
    if (vis.has(kt)) {
      const T = total(A);
      if (p[kt] !== T) { p[kt] = T; changed.push(kt); }
      S.snap[kt] = T;
    }
  });
  if (hasM) {
    const pct = wallPct(S.walls, function (k) { return p[k]; });
    if (Math.abs(pct - p.wall_all) > 0.05) { p.wall_all = pct; forced.push('wall_all'); }
    S.snap.wall_all = p.wall_all;
  }
  syncKeys(id, p, changed.concat(forced));
  deform(S.pos, S.out, AX);
}
function buildGeo(S, id, p) {
  const changed = [];
  (S.akeys || S.keys).forEach(function (k) { if (typeof p[k] === 'number' && Math.abs(p[k] - S.snap[k]) > 1e-9) geoSet(S.g, S.st, k, p[k]); });
  const vals = geoVals(S.g, S.st);
  S.keys.forEach(function (k) {
    if (!(Math.abs((p[k] === undefined ? NaN : p[k]) - vals[k]) <= 1e-9)) { p[k] = vals[k]; changed.push(k); }
    S.snap[k] = p[k];
  });
  syncKeys(id, p, changed);
  geoApply(S.U, S.G, S.st, S.W);
  const out = S.out, W = S.W, I = S.I;
  for (let t = 0; t < S.n * 3; t++) { const q = I[t] * 3; out[t * 3] = W[q]; out[t * 3 + 1] = W[q + 1]; out[t * 3 + 2] = W[q + 2]; }
}

// ---- история изменений: «Сброс» одним нажатием и «Шаг назад» ----
let lastId = null;
const HIST = new Map();
function histOf(id) { let h = HIST.get(id); if (!h) { h = { stack: [], cur: null, t: 0, k: '', gt: 0, gp: 0, busy: 0, p: null }; HIST.set(id, h); } return h; }
function snapOf(S) { return { v: Object.assign({}, S.snap), st: S.geo ? JSON.parse(JSON.stringify(S.st)) : null }; }
function diffKey(a, b) {
  for (const k in a) { if (!(Math.abs(a[k] - b[k]) <= 1e-9)) return k; }
  for (const k in b) { if (!(k in a)) return k; }
  return '';
}
function histPush(H, s) { H.stack.push(s); if (H.stack.length > 100) H.stack.shift(); }
function histNotify() { try { window.dispatchEvent(new Event('objrt-hist')); } catch (e) {} }
// запись шага: серия движений одного ползунка (до 0,7 с) — один шаг; сброс кнопкой — тоже один шаг
function histRec(S, H) {
  const nw = snapOf(S);
  if (!H.cur) { H.cur = nw; return; }
  const key = diffKey(H.cur.v, nw.v);
  if (!key && JSON.stringify(H.cur.st) === JSON.stringify(nw.st)) return;
  const now = Date.now();
  if (now < H.gt) { if (!H.gp) { histPush(H, H.cur); H.gp = 1; } }
  else if (!(now - H.t < 700 && H.k === key)) histPush(H, H.cur);
  H.cur = nw; H.t = now; H.k = key || '*';
  histNotify();
}
function activeId() {
  try { if (typeof activeModelId !== 'undefined' && activeModelId) return activeModelId; } catch (e) {}
  return lastId;
}
// точное восстановление состояния: значения всех ползунков и внутреннее состояние модели
function histRestore(id, target) {
  const S = state.get(id), H = histOf(id);
  if (!S || !H.p) return false;
  const p = H.p;
  H.busy = 1;
  try {
    Object.keys(target.v).forEach(function (k) { p[k] = target.v[k]; });
    if (S.geo && target.st) { S.st = JSON.parse(JSON.stringify(target.st)); S.snap = Object.assign({}, target.v); }
    if (typeof buildModelGeometry === 'function') buildModelGeometry(id, p); else build(id, p);
    syncKeys(id, p, Object.keys(target.v));
    paintKeep(id);
  } finally { H.busy = 0; }
  H.cur = snapOf(S); H.t = 0; H.k = '';
  return true;
}
function histMark(id) { const H = histOf(id); H.gt = Date.now() + 600; H.gp = 0; }
function histReset(id) {
  const S = state.get(id), H = histOf(id);
  if (!S || !S.init || !H.p) return false;
  const cur = snapOf(S);
  if (!diffKey(cur.v, S.init.v) && JSON.stringify(cur.st) === JSON.stringify(S.init.st)) return true;
  if (!(Date.now() < H.gt + 400 && H.gp)) histPush(H, H.cur || cur);
  H.gp = 1;
  const ok = histRestore(id, S.init);
  histNotify();
  return ok;
}
function histUndo() {
  const id = activeId(), H = id && HIST.get(id);
  if (!H || !H.stack.length) return false;
  const t = H.stack.pop(), ok = histRestore(id, t);
  histNotify();
  return ok;
}
function build(id, p) {
  const S = ensure(id);
  if (!S) return;
  const H = histOf(id); H.p = p; lastId = id;
  if (!S.init) S.init = snapOf(S);
  if (S.geo) buildGeo(S, id, p); else buildOld(S, id, p);
  if (!H.busy) histRec(S, H);
  const n = S.n, out = S.out, zu = S.zu;
  const far = new Float32Array(n), fn = faceNormals(out, n, far), nr = new Float32Array(n * 9), w = new Float32Array(n * 9);
  for (let i = 0; i < n * 3; i++) {
    let x = 0, y = 0, z = 0;
    if (S.NB) { for (let q = S.NB.off[i]; q < S.NB.off[i + 1]; q++) { const fi = S.NB.list[q], j = fi * 3, aw = far[fi] || 1e-9; x += fn[j] * aw; y += fn[j + 1] * aw; z += fn[j + 2] * aw; } }
    else { const j = ((i / 3) | 0) * 3; x = fn[j]; y = fn[j + 1]; z = fn[j + 2]; }
    const l = Math.hypot(x, y, z) || 1;
    if (zu) { nr[i * 3] = x / l; nr[i * 3 + 1] = z / l; nr[i * 3 + 2] = -y / l; } else { nr[i * 3] = x / l; nr[i * 3 + 1] = y / l; nr[i * 3 + 2] = z / l; }
  }
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let v = 0; v < n * 3; v++) {
    const x = out[v * 3], y = out[v * 3 + 1], z = out[v * 3 + 2];
    const q = zu ? [x, z, -y] : [x, y, z];
    for (let k = 0; k < 3; k++) { w[v * 3 + k] = q[k]; if (q[k] < mn[k]) mn[k] = q[k]; if (q[k] > mx[k]) mx[k] = q[k]; }
  }
  if (S.geo) dmViewFix(S.G, S.st, zu, mn, mx);
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
  for (let v = 0; v < n * 3; v++) { w[v * 3] -= cx; w[v * 3 + 1] -= mn[1]; w[v * 3 + 2] -= cz; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(w, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nr, 3));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, currentMaterial);
  mesh.castShadow = false; mesh.receiveShadow = false;
  modelGroup.add(mesh);
  if (n <= 80000) {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
    line.visible = showEdges;
    edgesGroup.add(line);
  }
}
// динамические ближняя/дальняя плоскости: стенки не пропадают при отдалении и приближении камеры
function clip(cam, ctl) {
  const d = cam.position.distanceTo(ctl.target);
  const near = Math.max(d * 0.02, 0.05), far = d * 20 + 1000;
  if (Math.abs(cam.near - near) > near * 0.02 || Math.abs(cam.far - far) > far * 0.02) { cam.near = near; cam.far = far; cam.updateProjectionMatrix(); }
}
// галочка «все стенки пропорционально» над первым ползунком стенки
const LINKTXT = { he: 'כל הקירות בפרופורציה', en: 'All walls proportionally', ru: 'Все стенки пропорционально' };
// замки на размеры (ставятся в конвертере). Что видит посетитель, задаётся в редакторе сайта:
// hide — не видно (замки действуют), show — видно, снять нельзя, edit — можно снимать и ставить
const KEEPTXT = {
  he: { show: 'נעול: מחוונים אחרים לא משנים מידה זו', edit: 'לשמור על המידה בעת שינוי מידות אחרות' },
  en: { show: 'Locked: other sliders do not change this size', edit: 'Keep this size when others change' },
  ru: { show: 'Не меняется от других размеров', edit: 'Не менять от других размеров' }
};
function keepMode() {
  try {
    const c = JSON.parse(document.getElementById('site-config').textContent || '{}');
    const m = c.x && c.x.keep && c.x.keep.mode;
    return m === 'show' || m === 'edit' ? m : 'hide';
  } catch (e) { return 'hide'; }
}
function paintKeep(id) {
  const S = state.get(id);
  if (!S || !S.geo || typeof paramsContainer === 'undefined' || !paramsContainer.querySelectorAll) return;
  if (typeof activeModelId !== 'undefined' && activeModelId !== id) return;
  const lang = typeof currentLang !== 'undefined' && KEEPTXT[currentLang] ? currentLang : 'en';
  paramsContainer.querySelectorAll('.obj-keep').forEach(function (n) {
    const pin = n.getAttribute('data-k') === 'pin', i = n.getAttribute('data-i'), t = (pin ? PINTXT : KEEPTXT)[lang];
    const on = pin ? !!(S.st.cp && S.st.cp[i] !== undefined) : !!(S.st.lk && S.st.lk[i]), edit = n.getAttribute('role') === 'checkbox';
    if (edit) n.setAttribute('aria-checked', on ? 'true' : 'false');
    n.firstChild.textContent = on ? '✓' : '';
    n.lastChild.textContent = (pin ? '🎯 ' : '🔒 ') + (edit ? t.edit : t.show);
  });
}
function toggleKeep(id, i, kind) {
  const S = state.get(id), H = histOf(id);
  if (!S || !H.p) return;
  if (kind === 'pin') dmPin(S.st, i, !(S.st.cp && S.st.cp[i] !== undefined));
  else dmLock(S.st, i, !(S.st.lk && S.st.lk[i]));
  const vals = geoVals(S.g, S.st), changed = [];
  S.keys.forEach(function (k) {
    if (Math.abs(H.p[k] - vals[k]) > 1e-9) { H.p[k] = vals[k]; changed.push(k); }
    S.snap[k] = H.p[k];
  });
  syncKeys(id, H.p, changed);
  histRec(S, H);
  paintKeep(id);
}
function decorateKeep(id, S) {
  const mode = keepMode();
  if (mode === 'hide') return;
  const st0 = S.e.geo.st || {};
  Object.keys(st0.lk || {}).map(function (k) { return [k, '']; }).concat(Object.keys(st0.cp || {}).map(function (k) { return [k, 'pin']; })).forEach(function (pair) {
    const k = pair[0], kind = pair[1];
    const rg = paramsContainer.querySelector('input[type="range"][data-key="q' + k + '"]');
    const item = rg && rg.closest('.param-item');
    if (!item || item.querySelector('.obj-keep[data-k="' + kind + '"]')) return;
    // это не input: общая блокировка ползунков на сайте не должна выключать замок
    const row = document.createElement('span');
    row.className = 'obj-keep'; row.setAttribute('data-i', k); row.setAttribute('data-k', kind);
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;font-weight:600;line-height:1.3;user-select:none';
    const box = document.createElement('span');
    box.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;flex:none;box-sizing:border-box;border:2px solid currentColor;border-radius:4px;font-size:12px;line-height:1';
    row.appendChild(box); row.appendChild(document.createElement('span'));
    if (mode === 'edit') {
      row.setAttribute('role', 'checkbox'); row.tabIndex = 0; row.style.cursor = 'pointer';
      const flip = function (e) { e.preventDefault(); e.stopPropagation(); toggleKeep(id, +k, kind); };
      row.addEventListener('click', flip);
      row.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') flip(e); });
    } else { box.style.opacity = '.6'; }
    item.appendChild(row);
  });
  paintKeep(id);
}
const PINTXT = {
  he: { show: 'מרכז המידה נשאר במקומו', edit: 'להשאיר את מרכז המידה במקומו' },
  en: { show: 'The center of this size stays in place', edit: 'Keep the center in place' },
  ru: { show: 'Центр размера остаётся на месте', edit: 'Держать центр на месте' }
};
const INTXT = { he: 'חלק מ־«{n}»', en: 'Part of “{n}”', ru: 'Входит в «{n}»' };
function decorateComp(id, S) {
  const lang = typeof currentLang !== 'undefined' && INTXT[currentLang] ? currentLang : 'en';
  const m = typeof I18N !== 'undefined' && I18N[lang] && I18N[lang].models && I18N[lang].models[id];
  const names = (m && m.params) || {};
  const find = function (k) {
    const rg = paramsContainer.querySelector('input[type="range"][data-key="' + k + '"]');
    return rg && rg.closest('.param-item');
  };
  (S.st.cm || []).forEach(function (c, ci) {
    // пометка нужна, только если сам составной ползунок виден на сайте
    if (!find('c' + ci)) return;
    const text = '⛓ ' + INTXT[lang].replace('{n}', names['c' + ci] || c.lab[lang]);
    c.m.forEach(function (j) {
      const item = find('q' + j);
      if (!item || item.querySelector('.obj-in[data-c="' + ci + '"]')) return;
      const row = document.createElement('span');
      row.className = 'obj-in'; row.setAttribute('data-c', ci); row.textContent = text;
      row.style.cssText = 'display:block;margin-top:6px;font-size:12px;line-height:1.3;opacity:.75';
      item.appendChild(row);
    });
  });
}
function decorate(id) {
  const S = ensure(id);
  if (!S) return;
  if (S.geo) { decorateComp(id, S); decorateKeep(id, S); return; }
  if (!S.linkShow || !S.walls.length) return;
  const rg = paramsContainer.querySelector('input[type="range"][data-key="' + S.walls[0].key + '"]');
  const item = rg && rg.closest('.param-item');
  if (!item) return;
  const row = document.createElement('label');
  row.className = 'param-item';
  row.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;font-weight:700';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = S.link;
  cb.addEventListener('change', function () { S.link = cb.checked; });
  const sp = document.createElement('span');
  sp.textContent = LINKTXT[currentLang] || LINKTXT.en;
  row.appendChild(cb); row.appendChild(sp);
  item.parentNode.insertBefore(row, item);
}
const API = { ver: 9, has: function (id) { return byId.has(id); }, build: build, clip: clip, decorate: decorate,
  active: activeId, undo: histUndo, reset: histReset, mark: histMark,
  canUndo: function (id) { const H = HIST.get(id || activeId()); return !!(H && H.stack.length); } };
try { window.__objrt = API; } catch (e) {}
return API;
})();
/*OBJRT:END*/
