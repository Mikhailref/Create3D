// ---- ЯДРО КАРКАСА (без зависимостей, этот же код нужен программе с ползунками) ----
// Грани: соседние треугольники с углом меньше 20° считаются одной поверхностью
function skFaces(parts, tol) {
    const faces = [], q = v => Math.round(v / tol);
    for (const { positions: p } of parts) {
        const tris = [], edges = new Map();
        for (let i = 0; i + 8 < p.length; i += 9) {
            const a = [p[i], p[i+1], p[i+2]], b = [p[i+3], p[i+4], p[i+5]], c = [p[i+6], p[i+7], p[i+8]];
            const u = b.map((v, k) => v - a[k]), w = c.map((v, k) => v - a[k]);
            const n = [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]];
            const l = Math.hypot(...n);
            if (l < 1e-12) continue;
            const t = { v: [a, b, c], n: n.map(x => x / l), area: l / 2, nb: [] };
            const key = t.v.map(v => v.map(q).join(','));
            for (let e = 0; e < 3; e++) {
                const k = [key[e], key[(e+1)%3]].sort().join('|');
                for (const o of edges.get(k) || []) { t.nb.push(o); o.nb.push(t); }
                if (!edges.has(k)) edges.set(k, []);
                edges.get(k).push(t);
            }
            tris.push(t);
        }
        for (const s of tris) {
            if (s.done) continue;
            s.done = true;
            const face = [s], stack = [s];
            while (stack.length) {
                const t = stack.pop();
                for (const o of t.nb) {
                    if (!o.done && t.n[0]*o.n[0] + t.n[1]*o.n[1] + t.n[2]*o.n[2] > 0.94) { o.done = true; face.push(o); stack.push(o); }
                }
            }
            faces.push(face);
        }
    }
    return faces;
}

// Круг по трём точкам на плоскости
function skCircle(pts) {
    const far = a => pts.reduce((m, p) => Math.hypot(p[0]-a[0], p[1]-a[1]) > Math.hypot(m[0]-a[0], m[1]-a[1]) ? p : m, a);
    const A = far(pts[0]), B = far(A);
    const dist = p => Math.abs((B[0]-A[0])*(p[1]-A[1]) - (B[1]-A[1])*(p[0]-A[0]));
    const C = pts.reduce((m, p) => dist(p) > dist(m) ? p : m, pts[0]);
    const d = 2 * (A[0]*(B[1]-C[1]) + B[0]*(C[1]-A[1]) + C[0]*(A[1]-B[1]));
    if (Math.abs(d) < 1e-9) return null;
    const s = p => p[0]*p[0] + p[1]*p[1];
    const x = (s(A)*(B[1]-C[1]) + s(B)*(C[1]-A[1]) + s(C)*(A[1]-B[1])) / d;
    const y = (s(A)*(C[0]-B[0]) + s(B)*(A[0]-C[0]) + s(C)*(B[0]-A[0])) / d;
    const r = Math.hypot(A[0]-x, A[1]-y);
    return pts.every(p => Math.abs(Math.hypot(p[0]-x, p[1]-y) - r) < r * 0.01) ? { c: [x, y], r } : null;
}

// Каркас: позиции плоскостей по каждой оси и участки между соседними плоскостями
function skBuild(parts) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const { positions: p } of parts) for (let i = 0; i < p.length; i++) { const k = i % 3; if (p[i] < lo[k]) lo[k] = p[i]; if (p[i] > hi[k]) hi[k] = p[i]; }
    const tol = Math.max(0.01, Math.max(...hi.map((v, k) => v - lo[k])) * 1e-4);
    const raw = [[], [], []], round = [[], [], []];
    for (let k = 0; k < 3; k++) raw[k].push({ v: lo[k], s: 0 }, { v: hi[k], s: 0 });

    for (const face of skFaces(parts, tol / 10)) {
        const pts = face.flatMap(t => t.v);
        const mn = [0, 1, 2].map(k => pts.reduce((m, p) => Math.min(m, p[k]), Infinity));
        const mx = [0, 1, 2].map(k => pts.reduce((m, p) => Math.max(m, p[k]), -Infinity));
        for (let k = 0; k < 3; k++) {
            raw[k].push({ v: mn[k], s: 0 }, { v: mx[k], s: 0 });
            // плоские площадки, перпендикулярные оси: знак показывает, с какой стороны материал
            for (const t of face) if (Math.abs(t.n[k]) > 0.999) raw[k].push({ v: t.v[0][k], s: Math.sign(t.n[k]) * t.area });
            // цилиндрические поверхности вдоль оси k (отверстия, скругления)
            if (!face.every(t => Math.abs(t.n[k]) < 0.02)) continue;
            const f = face[0].n;
            if (!face.some(t => t.n[0]*f[0] + t.n[1]*f[1] + t.n[2]*f[2] < 0.87)) continue;
            const u = (k + 1) % 3, w = (k + 2) % 3;
            const c = skCircle(pts.map(p => [p[u], p[w]]));
            if (!c) continue;
            [u, w].forEach((ax, j) => {
                round[ax].push([mn[ax], mx[ax]]);
                // центр окружности тоже опорная плоскость (для размеров до центра)
                if (c.c[j] > lo[ax] + tol && c.c[j] < hi[ax] - tol) raw[ax].push({ v: c.c[j], s: 0 });
            });
        }
    }

    return { tol, axes: [0, 1, 2].map(k => {
        const st = [];
        raw[k].sort((a, b) => a.v - b.v);
        for (const r of raw[k]) {
            const last = st[st.length - 1];
            if (last && r.v - last.v <= tol) last.s += r.s; else st.push({ v: r.v, s: r.s });
        }
        const segments = st.slice(1).map((b, i) => {
            const a = st[i];
            const isRound = round[k].some(([m, M]) => a.v >= m - tol && b.v <= M + tol);
            const type = isRound ? 'round' : (a.s < 0 && b.s > 0) ? 'wall' : (a.s > 0 && b.s < 0) ? 'gap' : 'step';
            return { type, fixed: type === 'wall' || type === 'round' };
        });
        return { stations: st.map(s => s.v), segments };
    }) };
}

// Какие участки однозначно определяются размерами. dims: пары [i, j] номеров плоскостей, i < j
function skAnalyze(n, dims) {
    const basis = [], redundant = [], zero = x => Math.abs(x) < 1e-9;
    const add = ([i, j]) => {
        let v = Array.from({ length: n }, (_, c) => c >= i && c < j ? 1 : 0);
        for (const b of basis) { const k = v[b.p]; if (!zero(k)) v = v.map((x, c) => x - k * b.row[c]); }
        const p = v.findIndex(x => !zero(x));
        if (p < 0) return false;
        const row = v.map(x => x / v[p]);
        for (const b of basis) { const k = b.row[p]; if (!zero(k)) b.row = b.row.map((x, c) => x - k * row[c]); }
        basis.push({ row, p });
        return true;
    };
    dims.forEach((d, i) => { if (!add(d)) redundant.push(i); });
    const known = Array.from({ length: n }, (_, k) => basis.some(b => b.p === k && b.row.every((x, c) => c === k || zero(x))));
    return { known, redundant, missing: n - basis.length, add };
}

// Новое расстояние между плоскостями i и j. Плоскости до i стоят на месте, после j сдвигаются целиком.
// Закреплённые участки не меняются (если свободных нет, растягиваются все). Участок не становится тоньше min.
function skSetSpan(s, i, j, value, segments, min = 0.1) {
    const len = s.slice(1).map((v, k) => v - s[k]);
    let flex = []; for (let k = i; k < j; k++) if (!segments[k].fixed) flex.push(k);
    if (!flex.length) for (let k = i; k < j; k++) flex.push(k);
    const total = flex.reduce((a, k) => a + len[k], 0);
    const rest = s[j] - s[i] - total;
    const kMin = Math.max(...flex.map(k => Math.min(1, min / len[k])));
    const f = Math.max(kMin, (value - rest) / total);
    for (const k of flex) len[k] *= f;
    const out = [s[0]];
    len.forEach((l, k) => out.push(out[k] + l));
    return out;
}

// Перенос координаты вершины из исходных плоскостей s в новые t
function skRemap(x, s, t) {
    const n = s.length - 1;
    if (x <= s[0]) return t[0] + x - s[0];
    if (x >= s[n]) return t[n] + x - s[n];
    let i = 0; while (x > s[i + 1]) i++;
    return t[i] + (x - s[i]) * (t[i + 1] - t[i]) / (s[i + 1] - s[i]);
}
// ---- КОНЕЦ ЯДРА ----
if (typeof module !== "undefined") module.exports = { skBuild, skAnalyze, skSetSpan, skRemap };
