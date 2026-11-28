# Архив проекта для продолжения работы в новом чате: исходники, тесты с входными файлами и три готовых файла.
#   python3 pack.py              → dist/3d-catalog-vN.zip
#   python3 pack.py --out ПАПКА  → туда же, но в другую папку
import sys, zipfile, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTS = ['Конвертер-OBJ-HTML.html', 'Редактор-сайта.html', 'mesurments.html', 'Ассистент.html']
# входные файлы тестов (остальное тесты делают сами при запуске)
TEST_INPUTS = ['user-model.html', 'user_box.json', 'old-converter.html', 'conv.v23.html', 'part-freecad.html', 'host-real.html', 'user-angle-guides.html']


def files():
    yield from ['README.md', 'ИСТОРИЯ.md', 'ИНСТРУКЦИЯ.md', 'build.py', 'pack.py']
    for p in sorted((ROOT / 'src').rglob('*')):
        if p.is_file() and '__pycache__' not in p.parts:
            yield p.relative_to(ROOT).as_posix()
    t = ROOT / 'tests'
    for p in sorted(t.glob('*.js')) + sorted(t.glob('*.py')):
        yield p.relative_to(ROOT).as_posix()
    for p in sorted((t / 'stub').rglob('*')) + sorted((t / 'fixtures').rglob('*')):
        if p.is_file():
            yield p.relative_to(ROOT).as_posix()
    for n in TEST_INPUTS:
        yield 'tests/' + n
    for n in OUTS:
        yield 'out/' + n


def main():
    args = sys.argv[1:]
    dist = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'dist'
    subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True, capture_output=True)   # out/ всегда свежий
    v = (ROOT / 'src' / 'VERSION').read_text().strip()
    dist.mkdir(parents=True, exist_ok=True)
    z = dist / f'3d-catalog-v{v}.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as f:
        for rel in files():
            p = ROOT / rel
            if not p.exists():
                sys.exit(f'нет файла {rel}')
            f.write(p, '3d-catalog/' + rel)
    print(f'архив: {z} ({z.stat().st_size // 1024} КБ)')


if __name__ == '__main__':
    main()
