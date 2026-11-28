# Все проверки проекта одной командой (из корня проекта или из папки tests):
#   python3 tests/run_all.py           — сборка + все тесты (расчётные и в браузере), ~15 минут
#   python3 tests/run_all.py --fast    — сборка + расчётные тесты без случайных и браузерных, ~2 минуты
#   python3 tests/run_all.py thread oneway browser_thread   — только названные тесты
import sys, re, json, subprocess, time
from pathlib import Path

T = Path(__file__).resolve().parent
ROOT = T.parent
PREP = ['mkproj.js', 'mkproj2.js', 'mkproj3.js', 'mkproj_thread.js', 'mkassist.js']          # входные проекты для тестов
CALC = ['calc', 'conv_calc', 'comp', 'locks', 'lockgrp', 'pin', 'sync', 'oneway', 'thread']
RANDOM = ['random', 'random_conv', 'random_pin']
BROWSER = ['browser', 'browser_mes', 'browser_comp', 'browser_conv', 'browser_cards', 'browser_locks', 'browser_pin',
           'browser_sync', 'browser_top', 'browser_func', 'browser_thread', 'browser_thread_site', 'browser_thumb', 'browser_assist', 'browser_dims', 'browser_assist2', 'browser_guides']


def run(cmd, timeout=1800):
    t0 = time.time()
    r = subprocess.run(cmd, cwd=T, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout + r.stderr, time.time() - t0


def verdict(name, code, out):
    m = re.findall(r'Итого: пройдено (\d+), ошибок (\d+)', out)
    if m:
        p, f = map(int, m[-1])
        return f == 0 and p > 0, f'{p} пройдено, {f} ошибок'
    j = re.findall(r'(\{"[^{}]*\})\s*$', out.strip())
    if j:
        d = json.loads(j[-1])
        bad = {k: v for k, v in d.items() if v}
        return not bad and code == 0, 'сбоев нет' if not bad else f'сбои: {bad}'
    return False, 'нет итоговой строки (упал?): ' + out.strip()[-300:]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    fast = '--fast' in sys.argv
    if args:
        todo = args
    else:
        todo = CALC + ([] if fast else RANDOM + BROWSER)
    code, out, _ = run([sys.executable, str(ROOT / 'build.py')])
    print(out.strip())
    if code:
        sys.exit(1)
    for p in PREP:
        code, out, _ = run(['node', p])
        if code:
            print('не удалось подготовить', p, out[-300:])
            sys.exit(1)
    results = []
    for name in ['build_check', 'pack_check', 'docs_check'] + todo:
        cmd = [sys.executable, f'{name}.py'] if (T / f'{name}.py').exists() else ['node', f'{name}.js']
        try:
            code, out, dt = run(cmd)
        except subprocess.TimeoutExpired:
            code, out, dt = 1, 'превышено время', 0
        good, note = verdict(name, code, out)
        results.append((name, good))
        print(f'{"ОК    " if good else "ОШИБКА"} {name:22s} {note}  ({dt:.0f} с)')
        if not good:
            for line in out.splitlines():
                if 'ОШИБКА' in line or 'Error' in line:
                    print('        ', line[:220])
    bad = [n for n, g in results if not g]
    print('\nВсё зелёное' if not bad else f'\nКрасные: {", ".join(bad)}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
