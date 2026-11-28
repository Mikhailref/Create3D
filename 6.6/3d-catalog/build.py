# Сборка трёх рабочих файлов из исходников src/.
#   python3 build.py              → out/Конвертер-OBJ-HTML.html, out/Редактор-сайта.html, out/mesurments.html, out/Ассистент.html
#   python3 build.py --out ПАПКА  → то же в другую папку
#
# Шаблоны (src/shells) — это сами программы без движка. В них стоят метки <<<имя>>>,
# вместо метки сборка вставляет склеенные по порядку файлы из списка ниже.
# Один и тот же файл движка попадает во все места, где он нужен: правка в одном месте.
import sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'

# общее ядро: распознавание формы, решатель каркаса, применение размеров, движение ползунков
ENGINE = [
    'engine/01-base.js',            # разбор OBJ, сварка вершин, плоскости и деформация старого режима, подписи, цвета
    'engine/02-detect.js',          # распознавание: цилиндры, отверстия, резьба, тела
    'engine/03-prepare.js',         # подготовка размеров: соседство вершин, веса, карты осей
    'engine/04-solver.js',          # решатель каркаса: замки, привязки, фиксаторы, синхронизация
    'engine/05-apply.js',           # перенос решения на вершины модели
    'engine/06-geo.js',             # применение размеров (режим без каркаса), список ползунков, проверка формы
    'engine/07-rules.js',           # связи размеров, замки во время движения, допустимость состояния
    'engine/08-move.js',            # один шаг движения ползунка
    'engine/functions/oneway.js',   # функция «Односторонняя связь»
    'engine/09-set.js',             # движение ползунков, пределы, составные размеры
]
IMPORT = ['engine/10-import.js']    # чтение экспорта FreeCAD, упрощение резьбы (не нужно на сайте)
SKELETON = ['skeleton/build.js']    # построение каркаса по геометрии (общее для конвертера и редактора размеров)

RECIPES = {
    # конвертер: ядро + построение каркаса и размеров из файла редактора размеров
    'core-converter': ENGINE[:5] + ['skeleton/converter-intro.js'] + SKELETON + ['skeleton/converter-dims.js'] + ENGINE[5:] + IMPORT,
    # редактор сайта: ядро без построения каркаса (каркас уже лежит в файле модели)
    'core-editor': ENGINE + IMPORT,
    # движок, который встраивается в сайт посетителя (и в одиночную страницу модели)
    'site-runtime': ['runtime/site-head.js'] + ENGINE + ['runtime/site.js'],
    # редактор размеров: каркас и анализ размеров (внутри модуля с отступом 8 пробелов)
    'skeleton-mes': [(f, 8) for f in SKELETON + ['skeleton/analyze.js']],
}

OUTPUTS = {
    'Конвертер-OBJ-HTML.html': 'shells/converter.html',
    'Редактор-сайта.html': 'shells/editor.html',
    'mesurments.html': 'shells/mesurments.html',
}
# ассистент: внутрь вкладываются уже собранные программы (метка <<<out:имя файла>>>)
ASSISTANT = ('Ассистент.html', 'shells/assistant.html')


def read(rel):
    p = SRC / rel
    if not p.exists():
        sys.exit(f'нет файла src/{rel}')
    return p.read_text(encoding='utf-8')


def indent(text, n):
    pad = ' ' * n
    return ''.join(pad + l if l.strip() else l for l in text.splitlines(True))


def recipe(name, version):
    out = []
    for item in RECIPES[name]:
        rel, n = item if isinstance(item, tuple) else (item, 0)
        t = read(rel)
        if rel.startswith('runtime/'):
            t = t.replace('{{VERSION}}', version)
        out.append(indent(t, n) if n else t)
    return ''.join(out)


def build(out_dir):
    version = read('VERSION').strip()
    if not version.isdigit():
        sys.exit('src/VERSION: нужен номер версии числом')
    out_dir.mkdir(parents=True, exist_ok=True)
    built = {}
    for out_name, shell in OUTPUTS.items():
        t = read(shell)
        for name in RECIPES:
            mark = f'<<<{name}>>>'
            if mark in t:
                t = t.replace(mark, recipe(name, version))
        if '<<<' in t and '>>>' in t[t.index('<<<'):]:
            left = t[t.index('<<<'):t.index('<<<') + 40]
            sys.exit(f'{shell}: неизвестная метка {left!r}')
        (out_dir / out_name).write_text(t, encoding='utf-8')
        built[out_name] = t
    name, shell = ASSISTANT
    t = read(shell)
    for out_name, text in built.items():
        # строка JSON внутри <script type="application/json">: каждый «<» экранирован, чтобы теги программы не закрыли блок
        t = t.replace(f'<<<out:{out_name}>>>', json.dumps(text, ensure_ascii=False).replace('<', '\\u003c'))
    if '<<<out:' in t:
        sys.exit(f'{shell}: неизвестная метка {t[t.index("<<<out:"):][:60]!r}')
    (out_dir / name).write_text(t, encoding='utf-8')
    return version


if __name__ == '__main__':
    args = sys.argv[1:]
    out = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'out'
    v = build(out)
    print(f'собрано v{v} → {out}')
