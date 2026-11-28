// Какие участки однозначно определяются размерами. dims: пары [i, j] номеров плоскостей, i < j
function skAnalyze(n, dims, ties) {
    const basis = [], redundant = [], zero = x => Math.abs(x) < 1e-9;
    const addRow = (v) => {
        for (const b of basis) { const k = v[b.p]; if (!zero(k)) v = v.map((x, c) => x - k * b.row[c]); }
        const p = v.findIndex(x => !zero(x));
        if (p < 0) return false;
        const row = v.map(x => x / v[p]);
        for (const b of basis) { const k = b.row[p]; if (!zero(k)) b.row = b.row.map((x, c) => x - k * row[c]); }
        basis.push({ row, p });
        return true;
    };
    const add = ([i, j]) => addRow(Array.from({ length: n }, (_, c) => c >= i && c < j ? 1 : 0));
    // привязки (например, диаметр резьбы к диаметру носителя) — известные связи: размер на них ставить не нужно
    (ties || []).forEach(t => addRow(Array.from({ length: n }, (_, c) => (c >= t.a[0] && c < t.a[1] ? 1 : 0) - t.r * (c >= t.b[0] && c < t.b[1] ? 1 : 0))));
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
