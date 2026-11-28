# Проверка архива исходников: в нём всё нужное для продолжения работы и ничего лишнего, и из него собирается
import sys,subprocess,tempfile,zipfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ok_n=bad_n=0
def ok(name,cond,info=''):
    global ok_n,bad_n
    if cond:ok_n+=1;print('  ОК    ',name)
    else:bad_n+=1;print('  ОШИБКА',name,' →',str(info)[:300])
tmp=Path(tempfile.mkdtemp())
ok('есть pack.py',(ROOT/'pack.py').exists())
if (ROOT/'pack.py').exists():
    r=subprocess.run([sys.executable,str(ROOT/'pack.py'),'--out',str(tmp)],capture_output=True,text=True)
    zs=list(tmp.glob('*.zip'));ok('архив создан, в имени номер версии',r.returncode==0 and len(zs)==1 and ('v'+(ROOT/'src'/'VERSION').read_text().strip()) in zs[0].name,(r.stdout+r.stderr)[-300:])
    if zs:
        names=zipfile.ZipFile(zs[0]).namelist();top={n.split('/')[0] for n in names};rel=['/'.join(n.split('/')[1:]) for n in names]
        ok('всё лежит в одной папке 3d-catalog',top=={'3d-catalog'},top)
        need=['README.md','ИСТОРИЯ.md','ИНСТРУКЦИЯ.md','build.py','pack.py','src/VERSION','src/engine/04-solver.js','src/skeleton/build.js','src/runtime/site.js','src/shells/converter.html',
              'tests/run_all.py','tests/build_check.py','tests/lib.js','tests/browser.py','tests/stub/three.js','tests/conv.v23.html','tests/user-model.html',
              'out/Конвертер-OBJ-HTML.html','out/Редактор-сайта.html','out/mesurments.html','out/Ассистент.html','tests/part-freecad.html','tests/host-real.html','tests/user-angle-guides.html']
        ok('в архиве исходники, тесты, входные файлы тестов и четыре готовых файла',all(n in rel for n in need),[n for n in need if n not in rel])
        junk=[n for n in rel if n.endswith('.png') or n.startswith('tests/site-') or n.startswith('tests/model-') or n.startswith('tests/project') or '__pycache__' in n or n.startswith('tests/harness')]
        ok('в архиве нет снимков и файлов, которые тесты делают сами',not junk,junk[:8])
        ok('архив компактный (меньше 3 МБ)',zs[0].stat().st_size<3e6,zs[0].stat().st_size)
        zipfile.ZipFile(zs[0]).extractall(tmp/'x');P=tmp/'x'/'3d-catalog'
        r=subprocess.run([sys.executable,str(P/'build.py'),'--out',str(tmp/'built')],capture_output=True,text=True)
        sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
        ok('из распакованного архива собираются те же четыре файла, что лежат в нём',r.returncode==0 and all(sha(tmp/'built'/f)==sha(P/'out'/f) for f in ['Конвертер-OBJ-HTML.html','Редактор-сайта.html','mesurments.html','Ассистент.html']),(r.stdout+r.stderr)[-300:])
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
