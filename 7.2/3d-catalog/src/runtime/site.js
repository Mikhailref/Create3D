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
  S.xf = { zu: zu, cx: cx, y0: mn[1], cz: cz };
  if (S.geo && dimUi() === 'model') dimsBuild(id, S, p); else dimsClear();
}
// динамические ближняя/дальняя плоскости: стенки не пропадают при отдалении и приближении камеры
function clip(cam, ctl) {
  dimsPlace(cam);
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
  precMount();
  if (S.geo) { decorateComp(id, S); decorateKeep(id, S); if (dimUi() === 'model') dimsPanel(id, S); return; }
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

// ===== интерфейс размеров на сайте: «Классический» (панель ползунков) или «Размеры на модели» =====
function siteX() { try { const c = JSON.parse(document.getElementById('site-config').textContent || '{}'); return c.x || {}; } catch (e) { return {}; } }
function dimUi() { return siteX().dimui === 'model' ? 'model' : 'classic'; }
const DIMS = { id: null, grp: null, ov: null, lab: {}, pop: null, popKey: null };
const DIMTXT = { he: 'לחצו על מידה בדגם כדי לשנות אותה', en: 'Click a dimension on the model to change it', ru: 'Нажмите на размер на модели, чтобы изменить его' };
const DEFN = [[0, -1, 0], [-1, 0, 0], [-0.7071, -0.7071, 0]];
const hostFn = function (name) { try { return eval('typeof ' + name) === 'function' ? eval(name) : null; } catch (e) { return null; } };
function itemOf(id, k) { const d = MODEL_DEFS.find(function (x) { return x.id === id; }); return d && d.schema.find(function (s) { return s.key === k; }); }
function fmtDim(id, k, v) {
  const it = itemOf(id, k) || { unit: 'mm' };
  const f = hostFn('formatDisplayNumber'), u = hostFn('getUnitLabel');
  return (f ? f(v, it) : String(Math.round(v * 100) / 100)) + (u ? ' ' + u(it) : '');
}
// размеры, которые рисуются на модели: видимые линейные и диаметры из конвертера
function dimKeys(S) { return S.keys.filter(function (k) { const s = /^q\d+$/.test(k) && S.st.dm[+k.slice(1)]; return s && (s.t === 'L' || s.t === 'D'); }); }
function dimNear(S, P, ax) {
  const U = S.U, n = U.length / 3;
  if (!S.dsz) { let m = 0; for (let k = 0; k < 3; k++) { let a = 1e30, b = -1e30; for (let i = k; i < U.length; i += 3) { if (U[i] < a) a = U[i]; if (U[i] > b) b = U[i]; } m = Math.max(m, b - a); } S.dsz = m || 1; }
  const tl = S.dsz * 1e-4 + 1e-4;
  let b = 0, bd = 1e30, bp = -1, bpd = 1e30;
  for (let i = 0; i < n; i++) {
    const dx = U[i * 3] - P[0], dy = U[i * 3 + 1] - P[1], dz = U[i * 3 + 2] - P[2], d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; b = i; }
    if (ax >= 0 && Math.abs(U[i * 3 + ax] - P[ax]) <= tl && d < bpd) { bpd = d; bp = i; }
  }
  return [b, bp];
}
function dimsClear() {
  if (DIMS.grp) { while (DIMS.grp.children.length) { const c = DIMS.grp.children.pop(); if (c.geometry) c.geometry.dispose(); } }
  Object.keys(DIMS.lab).forEach(function (k) { DIMS.lab[k].el.remove(); });
  DIMS.lab = {}; DIMS.id = null; popClose();
}
function dimsBuild(id, S, p) {
  if (typeof scene === 'undefined') return;
  if (!DIMS.grp) { DIMS.grp = new THREE.Group(); scene.add(DIMS.grp); }
  if (!DIMS.ov) {
    const host = (typeof viewportPane !== 'undefined' && viewportPane) || document.querySelector('.viewport-pane') || document.body;
    DIMS.ov = document.createElement('div'); DIMS.ov.id = 'objrt-dims';
    DIMS.ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5';
    host.appendChild(DIMS.ov);
  }
  if (DIMS.id !== id) dimsClear();
  DIMS.id = id;
  while (DIMS.grp.children.length) { const c = DIMS.grp.children.pop(); if (c.geometry) c.geometry.dispose(); }
  const keys = dimKeys(S), X = S.xf, U = S.U, W = S.W;
  if (!S.dnear) S.dnear = {};
  const toD = function (q) { const r = X.zu ? [q[0], q[2], -q[1]] : q; return new THREE.Vector3(r[0] - X.cx, r[1] - X.y0, r[2] - X.cz); };
  const toV = function (q) { const r = X.zu ? [q[0], q[2], -q[1]] : q; return new THREE.Vector3(r[0], r[1], r[2]); };
  Object.keys(DIMS.lab).forEach(function (k) { if (keys.indexOf(k) < 0) { DIMS.lab[k].el.remove(); delete DIMS.lab[k]; } });
  keys.forEach(function (k) {
    const j = +k.slice(1), s = S.st.dm[j], v = p[k], lin = s.t === 'L';
    let P, dir, ax;
    if (lin) { P = s.a; dir = s.d; ax = s.d.findIndex(function (x) { return Math.abs(x) > 0.9995; }); }
    else { P = [0, 0, 0]; P[s.ax] = s.e[s.ax]; P[s.u] = s.cu; P[s.v] = s.cv; dir = [0, 0, 0]; dir[s.u] = s.e[s.u] - s.cu; dir[s.v] = s.e[s.v] - s.cv; const l = Math.hypot(dir[0], dir[1], dir[2]) || 1; dir = dir.map(function (x) { return x / l; }); ax = -1; }
    const nr = S.dnear[k] || (S.dnear[k] = dimNear(S, P, ax)), sh = function (i, c) { return W[i * 3 + c] - U[i * 3 + c]; };
    const P0 = [0, 1, 2].map(function (c) { return P[c] + (c === ax && nr[1] >= 0 ? sh(nr[1], c) : sh(nr[0], c)); });
    const a = lin ? P0 : P0.map(function (x, c) { return x - dir[c] * v / 2; }), b = a.map(function (x, c) { return x + dir[c] * v; });
    const A = toD(a), B = toD(b);
    const n = lin ? toV(s.nv || DEFN[ax >= 0 ? ax : 0]).normalize() : new THREE.Vector3();
    const of = lin ? (isFinite(s.of) ? s.of : S.dsz * 0.08) : 0, t = typeof s.lt === 'number' ? s.lt : 0.5;
    const Ao = A.clone().addScaledVector(n, of), Bo = B.clone().addScaledVector(n, of), at = function (x) { return Ao.clone().lerp(Bo, x); };
    const seg = [at(Math.min(0, t)), at(Math.max(1, t))];
    if (lin && of) { const o = n.clone().multiplyScalar(Math.sign(of) * Math.min(Math.abs(of) * 0.25, S.dsz * 0.02)); seg.push(A, Ao.clone().add(o), B, Bo.clone().add(o)); }
    const u = Bo.clone().sub(Ao), L = u.length();
    if (L > 1e-6) {
      u.divideScalar(L);
      let sd = n.lengthSq() > 0 ? n.clone() : new THREE.Vector3(0, 1, 0);
      if (Math.abs(sd.dot(u)) > 0.9) sd = new THREE.Vector3(1, 0, 0);
      const z = Math.min(L * 0.25, Math.max(S.dsz * 0.025, 0.4));
      [[Ao, 1], [Bo, -1]].forEach(function (pr) { [1, -1].forEach(function (w) { seg.push(pr[0].clone(), pr[0].clone().addScaledVector(u, z * pr[1]).addScaledVector(sd, z * 0.35 * w)); }); });
    }
    const col = s.col || '#f59e0b';
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: col, depthTest: false, transparent: true }));
    m.renderOrder = 999; DIMS.grp.add(m);
    let lb = DIMS.lab[k];
    if (!lb) {
      const e = document.createElement('button');
      e.type = 'button'; e.className = 'objrt-dl'; e.setAttribute('data-key', k);
      e.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;white-space:nowrap;background:rgba(15,23,42,.9);color:#f8fafc;border:1.5px solid;border-radius:7px;padding:2px 7px;font:700 12px/1.3 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)';
      e.addEventListener('click', function (ev) { ev.stopPropagation(); popOpen(k); });
      DIMS.ov.appendChild(e);
      lb = DIMS.lab[k] = { el: e };
    }
    lb.pos = at(t);
    lb.el.style.borderColor = col;
    lb.el.textContent = (lin ? '' : 'Ø') + fmtDim(id, k, v);
    try { const nm = I18N[currentLang].models[id].params[k]; if (nm) lb.el.title = nm; } catch (e) {}
  });
  if (DIMS.popKey) { if (DIMS.lab[DIMS.popKey]) popSync(); else popClose(); }
}
function dimsRefresh() { const S = DIMS.id && ensure(DIMS.id); if (S && S.xf && typeof modelParamsMap !== 'undefined') dimsBuild(DIMS.id, S, modelParamsMap[DIMS.id]); }
function dimsPlace(cam) {
  if (!DIMS.ov || !DIMS.id) return;
  const w = DIMS.ov.clientWidth, h = DIMS.ov.clientHeight;
  for (const k in DIMS.lab) {
    const L = DIMS.lab[k];
    if (!L.pos) continue;
    const q = L.pos.clone().project(cam);
    if (q.z > 1) { L.el.style.display = 'none'; continue; }
    L.el.style.display = 'block';
    L.el.style.left = ((q.x * 0.5 + 0.5) * w) + 'px';
    L.el.style.top = ((-q.y * 0.5 + 0.5) * h) + 'px';
  }
  if (DIMS.pop && DIMS.popKey && DIMS.lab[DIMS.popKey]) {
    const e = DIMS.lab[DIMS.popKey].el, pw = DIMS.pop.offsetWidth || 220;
    let x = e.offsetLeft - pw / 2, y = e.offsetTop + 18;
    x = Math.max(6, Math.min(x, w - pw - 6)); y = Math.min(y, h - (DIMS.pop.offsetHeight || 90) - 6);
    DIMS.pop.style.left = x + 'px'; DIMS.pop.style.top = y + 'px';
  }
}
// в панели прячем ползунки размеров, которые теперь на модели (они остаются — окошко управляет ими)
function dimsPanel(id, S) {
  if (typeof paramsContainer === 'undefined') return;
  const keys = dimKeys(S);
  keys.forEach(function (k) {
    const rg = paramsContainer.querySelector('input[type="range"][data-key="' + k + '"]'), it = rg && rg.closest('.param-item');
    if (it) { it.style.display = 'none'; it.setAttribute('data-objrt-dim', '1'); }
  });
  const left = [].some.call(paramsContainer.querySelectorAll('.param-item'), function (x) { return x.style.display !== 'none'; });
  if (!left && !paramsContainer.querySelector('.objrt-hint')) {
    const h = document.createElement('div');
    h.className = 'objrt-hint';
    h.style.cssText = 'padding:10px 4px;font-size:13px;opacity:.8;line-height:1.4';
    h.textContent = DIMTXT[typeof currentLang !== 'undefined' && DIMTXT[currentLang] ? currentLang : 'en'];
    paramsContainer.appendChild(h);
  }
}
const hostR = function (k) { return typeof paramsContainer !== 'undefined' && paramsContainer.querySelector('input[type="range"][data-key="' + k + '"]'); };
const hostN = function (k) { return document.getElementById('num-' + k); };
function popClose() { if (DIMS.pop) DIMS.pop.style.display = 'none'; DIMS.popKey = null; }
function popOpen(k) {
  if (!DIMS.pop) {
    const d = document.createElement('div');
    d.className = 'objrt-pop';
    d.style.cssText = 'position:absolute;pointer-events:auto;z-index:6;min-width:210px;max-width:280px;background:#fff;color:#0f172a;border:1.5px solid #f59e0b;border-radius:12px;padding:8px 10px;box-shadow:0 10px 26px rgba(15,23,42,.25);font:600 13px system-ui,sans-serif';
    d.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span class="objrt-pop-n" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span><button type="button" class="objrt-pop-x" aria-label="Close" style="border:0;background:none;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px">✕</button></div>' +
      '<div style="display:flex;align-items:center;gap:8px"><input type="range" style="flex:1;min-width:0"><input type="number" style="width:76px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:6px;font:inherit"><span class="objrt-pop-u" style="font-size:12px;opacity:.7"></span></div>';
    d.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    d.querySelector('.objrt-pop-x').addEventListener('click', function (e) { e.stopPropagation(); popClose(); });
    const r = d.querySelector('input[type=range]'), nb = d.querySelector('input[type=number]');
    r.addEventListener('input', function () { const R = hostR(DIMS.popKey); if (!R) return; R.value = r.value; R.dispatchEvent(new Event('input', { bubbles: true })); popSync(); });
    nb.addEventListener('change', function () { const N = hostN(DIMS.popKey); if (!N) return; N.value = nb.value; N.dispatchEvent(new Event('change', { bubbles: true })); popSync(); });
    nb.addEventListener('keydown', function (e) { if (e.key === 'Enter') nb.dispatchEvent(new Event('change')); });
    DIMS.ov.appendChild(d); DIMS.pop = d;
  }
  DIMS.popKey = k; DIMS.pop.style.display = 'block';
  popSync();
}
function popSync() {
  const k = DIMS.popKey, d = DIMS.pop, R = hostR(k), N = hostN(k);
  if (!d || !R) return;
  const r = d.querySelector('input[type=range]'), nb = d.querySelector('input[type=number]');
  r.min = R.min; r.max = R.max; r.step = R.step; r.value = R.value;
  if (N && document.activeElement !== nb) { nb.min = N.min; nb.max = N.max; nb.step = N.step; nb.value = N.value; }
  let nm = '';
  try { nm = I18N[currentLang].models[DIMS.id].params[k] || ''; } catch (e) {}
  d.querySelector('.objrt-pop-n').textContent = nm;
  const it = itemOf(DIMS.id, k), u = hostFn('getUnitLabel');
  d.querySelector('.objrt-pop-u').textContent = it && u ? u(it) : '';
}
try { document.addEventListener('keydown', function (e) { if (e.key === 'Escape') popClose(); }); } catch (e) {}

// ===== точность размеров для посетителя: целые / 1 / 2 знака после запятой (рядом с мм / см) =====
let PREC = 2, PREC_SET = false;
try { const v = localStorage.getItem('objrt-prec'); if (v === '0' || v === '1' || v === '2') { PREC = +v; PREC_SET = true; } } catch (e) {}
const rndP = function (v) { const k = Math.pow(10, PREC); return Math.round(v * k) / k; };
const PRECTXT = { he: ['מספרים שלמים', 'ספרה אחת אחרי הנקודה', 'שתי ספרות אחרי הנקודה'], en: ['Whole numbers', '1 decimal place', '2 decimal places'], ru: ['Целые', '1 знак после запятой', '2 знака после запятой'] };
(function precInstall() {
  // функции сайта подменяются, только если они есть; пока посетитель не выбрал точность — работают как раньше
  try {
    if (typeof roundToTwoDecimals === 'function') { const o = roundToTwoDecimals; roundToTwoDecimals = function (v) { return PREC_SET ? rndP(v) : o(v); }; }
    if (typeof formatDisplayNumber === 'function') { const o = formatDisplayNumber; formatDisplayNumber = function (v, it) { if (!PREC_SET) return o(v, it); if (!it || it.unit !== 'mm') return String(rndP(v)); return (lengthUnit === 'cm' ? rndP(v / 10) : rndP(v)).toFixed(PREC); }; }
    if (typeof formatManualInputNumber === 'function') { const o = formatManualInputNumber; formatManualInputNumber = function (v, it) { if (!PREC_SET) return o(v, it); if (!it || it.unit !== 'mm') return String(rndP(v)); return rndP(v).toFixed(PREC); }; }
    const stepFix = function (r, it) { if (PREC_SET && r && it && it.unit === 'mm') r.step = Math.pow(10, -PREC); return r; };
    if (typeof getDefaultDisplayBounds === 'function') { const o = getDefaultDisplayBounds; getDefaultDisplayBounds = function (it) { return stepFix(o(it), it); }; }
    if (typeof transformRangeAroundValue === 'function') { const o = transformRangeAroundValue; transformRangeAroundValue = function (id, it, v) { return stepFix(o(id, it, v), it); }; }
    // мм ↔ см: подписи на модели и окошко пересчитываются сразу
    if (typeof setLengthUnit === 'function') { const o = setLengthUnit; setLengthUnit = function (u) { o(u); try { if (DIMS.id && activeModelId === DIMS.id) dimsRefresh(); } catch (e) {} }; }
    if (typeof updateHudDimensions === 'function') {
      const o = updateHudDimensions;
      updateHudDimensions = function () {
        if (!PREC_SET) return o();
        if (!activeModelId) return;
        const box = new THREE.Box3().setFromObject(modelGroup);
        if (box.isEmpty()) return;
        const sz = new THREE.Vector3(); box.getSize(sz);
        const t = I18N[currentLang], cm = lengthUnit === 'cm', un = cm ? t.unitCm : t.unitMm, f = function (v) { return (cm ? rndP(v / 10) : rndP(v)).toFixed(PREC); };
        const el = document.getElementById('hud-dims');
        if (el) el.textContent = 'X: ' + f(sz.x) + ' ' + un + '  |  Y: ' + f(sz.y) + ' ' + un + '  |  Z: ' + f(sz.z) + ' ' + un;
      };
    }
  } catch (e) { console.warn('OBJ precision', e); }
})();
function precMount() {
  if (document.querySelector('.objrt-prec')) return precPaint();
  const mm = document.getElementById('unit-btn-mm'), grp = mm && mm.parentNode;
  if (!grp) return;
  const g = document.createElement('div');
  g.className = (grp.className || '') + ' objrt-prec';
  g.setAttribute('role', 'group');
  ['0', '0.0', '0.00'].forEach(function (lab, i) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = (mm.className || '').replace(/\bactive\b/, '').trim(); b.setAttribute('data-prec', String(i)); b.textContent = lab;
    b.addEventListener('click', function () {
      PREC = i; PREC_SET = true;
      try { localStorage.setItem('objrt-prec', String(i)); } catch (e) {}
      precPaint();
      try { if (activeModelId) { renderParamsForModel(activeModelId); updateHudDimensions(); dimsRefresh(); } } catch (e) {}
    });
    g.appendChild(b);
  });
  g.style.marginInlineStart = '6px';
  grp.parentNode.insertBefore(g, grp.nextSibling);
  precPaint();
}
function precPaint() {
  const lang = typeof currentLang !== 'undefined' && PRECTXT[currentLang] ? currentLang : 'en';
  document.querySelectorAll('.objrt-prec [data-prec]').forEach(function (b) { const i = +b.getAttribute('data-prec'); b.classList.toggle('active', i === PREC); b.title = PRECTXT[lang][i]; });
}
try { precMount(); } catch (e) {}
const API = { ver: 10, has: function (id) { return byId.has(id); }, build: build, clip: clip, decorate: decorate,
  active: activeId, undo: histUndo, reset: histReset, mark: histMark,
  canUndo: function (id) { const H = HIST.get(id || activeId()); return !!(H && H.stack.length); },
  // размеры на модели (режим «Размеры на модели»): ключ, текст и центр подписи на экране
  dims: function () { return Object.keys(DIMS.lab).map(function (k) { const e = DIMS.lab[k].el, r = e.getBoundingClientRect(); return { key: k, text: e.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); } };
try { window.__objrt = API; } catch (e) {}
return API;
})();
/*OBJRT:END*/
