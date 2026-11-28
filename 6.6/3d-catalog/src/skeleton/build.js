// Грани: соседние треугольники с углом меньше 20° считаются одной поверхностью
function skFaces(parts, tol, skip) {
    const faces = [], q = v => Math.round(v / tol);
    for (const { positions: p } of parts) {
        const tris = [], edges = new Map();
        for (let i = 0; i + 8 < p.length; i += 9) {
            const a = [p[i], p[i+1], p[i+2]], b = [p[i+3], p[i+4], p[i+5]], c = [p[i+6], p[i+7], p[i+8]];
            if (skip && skip(a, b, c)) continue;
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
// Резьба: кольцевая зона из витков (грани наклонены к оси). Подробности витков каркасу не нужны:
// остаются длина зоны и два диаметра — по впадинам (rl) и по вершинам (rh)
function skThreads(parts, tol) {
    const zones = [];
    for (const { positions: p } of parts) {
        const q = v => Math.round(v / (tol / 10)), ids = new Map(), V = [];
        const vid = (x, y, z) => { const k = q(x) + ',' + q(y) + ',' + q(z); let i = ids.get(k); if (i === undefined) { i = V.length / 3; ids.set(k, i); V.push(x, y, z); } return i; };
        const T = [], N = [];
        for (let i = 0; i + 8 < p.length; i += 9) {
            const a = vid(p[i], p[i+1], p[i+2]), b = vid(p[i+3], p[i+4], p[i+5]), c = vid(p[i+6], p[i+7], p[i+8]);
            if (a === b || b === c || a === c) continue;
            const u = [p[i+3] - p[i], p[i+4] - p[i+1], p[i+5] - p[i+2]], w = [p[i+6] - p[i], p[i+7] - p[i+1], p[i+8] - p[i+2]];
            const n = [u[1]*w[2] - u[2]*w[1], u[2]*w[0] - u[0]*w[2], u[0]*w[1] - u[1]*w[0]], l = Math.hypot(...n);
            if (l < 1e-12) continue;
            T.push(a, b, c); N.push(n[0] / l, n[1] / l, n[2] / l);
        }
        const nT = T.length / 3, nV = V.length / 3;
        for (let A = 0; A < 3; A++) {
            const B = (A + 1) % 3, C = (A + 2) % 3, par = Int32Array.from({ length: nV }, (_, i) => i);
            const fd = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
            const mid = [];
            for (let f = 0; f < nT; f++) { const na = Math.abs(N[f*3+A]); if (na > .12 && na < .97) { mid.push(f); par[fd(T[f*3])] = fd(T[f*3+1]); par[fd(T[f*3+1])] = fd(T[f*3+2]); } }
            const cp = new Map();
            for (const f of mid) {
                const r = fd(T[f*3]); let c = cp.get(r);
                if (!c) cp.set(r, c = { n: 0, mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] });
                c.n++;
                for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) { const x = V[T[f*3+j]*3+k]; if (x < c.mn[k]) c.mn[k] = x; if (x > c.mx[k]) c.mx[k] = x; }
            }
            for (const [r, c] of cp) {
                if (c.n < 150) continue;
                const eb = c.mx[B] - c.mn[B], ec = c.mx[C] - c.mn[C], ez = c.mx[A] - c.mn[A];
                if (Math.abs(eb - ec) > .08 * Math.max(eb, ec)) continue; // должно быть полное кольцо
                const cb = (c.mn[B] + c.mx[B]) / 2, cc = (c.mn[C] + c.mx[C]) / 2;
                let rl = 1e9, rh = -1e9;
                for (const f of mid) {
                    if (fd(T[f*3]) !== r) continue;
                    for (let j = 0; j < 3; j++) { const v = T[f*3+j] * 3, d = Math.hypot(V[v+B] - cb, V[v+C] - cc); if (d < rl) rl = d; if (d > rh) rh = d; }
                }
                const depth = rh - rl, rm = (rl + rh) / 2;
                if (depth < .005 * rm || depth > .3 * rm || ez < 3 * depth) continue;
                zones.push({ k: A, zl: c.mn[A], zh: c.mx[A], c: [cb, cc], rl, rh, tr: Math.max(tol, depth * .03) });
            }
        }
    }
    return zones;
}

function skBuild(parts) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const { positions: p } of parts) for (let i = 0; i < p.length; i++) { const k = i % 3; if (p[i] < lo[k]) lo[k] = p[i]; if (p[i] > hi[k]) hi[k] = p[i]; }
    const tol = Math.max(0.01, Math.max(...hi.map((v, k) => v - lo[k])) * 1e-4);
    const raw = [[], [], []], round = [[], [], []], cyls = [];
    for (let k = 0; k < 3; k++) raw[k].push({ v: lo[k], s: 0 }, { v: hi[k], s: 0 });

    // резьба: витки в каркас не попадают, вместо них длина зоны и два диаметра
    const zones = skThreads(parts, tol);
    const inZone = (z, v) => { const B = (z.k + 1) % 3, C = (z.k + 2) % 3, r = Math.hypot(v[B] - z.c[0], v[C] - z.c[1]); return v[z.k] >= z.zl - tol && v[z.k] <= z.zh + tol && r >= z.rl - z.tr && r <= z.rh + z.tr; };
    const skip = zones.length ? (a, b, c) => zones.some(z => inZone(z, a) && inZone(z, b) && inZone(z, c)) : null;

    for (const face of skFaces(parts, tol / 10, skip)) {
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
            cyls.push({ k, c: c.c, r: c.r, lo: mn[k], hi: mx[k] });
            [u, w].forEach((ax, j) => {
                round[ax].push([mn[ax], mx[ax]]);
                // центр окружности тоже опорная плоскость (для размеров до центра)
                if (c.c[j] > lo[ax] + tol && c.c[j] < hi[ax] - tol) raw[ax].push({ v: c.c[j], s: 0 });
            });
        }
    }
    for (const z of zones) {
        const u = (z.k + 1) % 3, w = (z.k + 2) % 3;
        raw[z.k].push({ v: z.zl, s: 0 }, { v: z.zh, s: 0 });
        [[u, z.c[0]], [w, z.c[1]]].forEach(([ax, c]) => {
            if (c > lo[ax] + tol && c < hi[ax] - tol) raw[ax].push({ v: c, s: 0 });
            for (const d of [z.rl, z.rh]) raw[ax].push({ v: c - d, s: 0 }, { v: c + d, s: 0 });
            round[ax].push([c - z.rh, c + z.rh]);
        });
    }

    const axes = [0, 1, 2].map(k => {
        const st = [];
        raw[k].sort((a, b) => a.v - b.v);
        for (const r of raw[k]) {
            const last = st[st.length - 1];
            if (last && r.v - last.v <= tol) last.s += r.s; else st.push({ v: r.v, s: r.s });
        }
        const segments = st.slice(1).map((b, i) => {
            const a = st[i];
            const isRound = round[k].some(([m, M]) => a.v >= m - tol && b.v <= M + tol);
            const isThread = zones.some(z => z.k === k && a.v >= z.zl - tol && b.v <= z.zh + tol);
            const type = isThread ? 'thread' : isRound ? 'round' : (a.s < 0 && b.s > 0) ? 'wall' : (a.s > 0 && b.s < 0) ? 'gap' : 'step';
            return { type, fixed: type === 'wall' || type === 'round' || type === 'thread' };
        });
        return { stations: st.map(s => s.v), segments };
    });

    // привязки: диаметр резьбы (по впадинам и по вершинам) к диаметру носителя — длина a = r × длина b.
    // Носитель — цилиндр на той же оси, примыкающий к резьбе, с близким радиусом; нет носителя — вершины привязаны к впадинам
    const ties = [], threads = [];
    const idx = (k, v) => axes[k].stations.findIndex(s => Math.abs(s - v) <= tol * 3);
    const add = (k, a, b) => {
        if (a[0] < 0 || a[1] <= a[0] || b[0] < 0 || b[1] <= b[0] || (a[0] === b[0] && a[1] === b[1])) return;
        const S = axes[k].stations, r = (S[a[1]] - S[a[0]]) / (S[b[1]] - S[b[0]]);
        if (r > 0 && isFinite(r)) ties.push({ k, a, b, r: Math.abs(r - 1) < 0.005 ? 1 : r });
    };
    for (const z of zones) {
        const rm = (z.rl + z.rh) / 2, u = (z.k + 1) % 3, w = (z.k + 2) % 3;
        let car = null;
        for (const c of cyls) {
            if (c.k !== z.k || Math.hypot(c.c[0] - z.c[0], c.c[1] - z.c[1]) > Math.max(tol * 5, .03 * rm)) continue;
            if (c.r < .5 * rm || c.r > 1.6 * rm || c.lo > z.zh + tol * 3 || c.hi < z.zl - tol * 3) continue;
            if (!car || Math.abs(c.r - rm) < Math.abs(car.r - rm)) car = c;
        }
        [[u, z.c[0]], [w, z.c[1]]].forEach(([ax, c]) => {
            const span = d => [idx(ax, c - d), idx(ax, c + d)];
            if (car) { const b = span(car.r); add(ax, span(z.rl), b); add(ax, span(z.rh), b); }
            else add(ax, span(z.rl), span(z.rh));
            // круг симметричен: часть от центра влево равна части вправо (вершины, носитель, впадины) — отдельные размеры для сторон не нужны
            const ds = (car ? [z.rl, z.rh, car.r] : [z.rl, z.rh]).sort((p, q) => p - q), m = idx(ax, c);
            ds.forEach((d, i) => add(ax, [idx(ax, c - d), i ? idx(ax, c - ds[i - 1]) : m], [i ? idx(ax, c + ds[i - 1]) : m, idx(ax, c + d)]));
        });
        threads.push({ k: z.k, zl: z.zl, zh: z.zh, c: z.c, rl: z.rl, rh: z.rh, carrier: !!car });
    }
    return { tol, axes, threads, ties };
}

