# Проверка сборки: один исходник движка → все копии в трёх файлах.
#   python3 tests/build_check.py           — сборка из src/ совпадает с тем, что лежит в out/
#   python3 tests/build_check.py --golden  — сборка совпадает побайтно с эталоном tests/fixtures/golden (для переноса без изменений)
import sys,re,shutil,subprocess,tempfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];FIX=ROOT/'tests'/'fixtures'
FILES=['Конвертер-OBJ-HTML.html','Редактор-сайта.html','mesurments.html','Ассистент.html']
ok_n=bad_n=0
def ok(name,cond,info=''):
    global ok_n,bad_n
    if cond:ok_n+=1;print('  ОК    ',name)
    else:bad_n+=1;print('  ОШИБКА',name,' →',str(info)[:300])
def build(src_root,out):
    r=subprocess.run([sys.executable,str(src_root/'build.py'),'--out',str(out)],capture_output=True,text=True)
    return r.returncode==0,(r.stdout+r.stderr)[-500:]
def blk(t,i):
    a=t.index('>',t.index('id="%s"'%i))+1;return t[a:t.index('</script>',a)]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
tmp=Path(tempfile.mkdtemp())
print('Сборка')
ok('есть build.py и папка src',(ROOT/'build.py').exists() and (ROOT/'src').is_dir())
if not (ROOT/'build.py').exists():print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1)
good,log=build(ROOT,tmp/'a');ok('сборка проходит без ошибок',good,log)
ok('собраны все четыре файла',all((tmp/'a'/f).exists() for f in FILES),[f for f in FILES if not (tmp/'a'/f).exists()])
good2,_=build(ROOT,tmp/'b');ok('сборка повторяемая: второй раз те же байты',good2 and all(sha(tmp/'a'/f)==sha(tmp/'b'/f) for f in FILES))
if '--golden' in sys.argv:
    for f in FILES[:3]:ok(f'{f}: побайтно как эталон',(tmp/'a'/f).exists() and sha(tmp/'a'/f)==sha(FIX/'golden'/f),f)
else:
    for f in FILES:ok(f'{f}: в out/ лежит свежая сборка',(ROOT/'out'/f).exists() and sha(tmp/'a'/f)==sha(ROOT/'out'/f),'запустите python3 build.py')
print('Один исходник — все копии')
src=ROOT/'src';text=lambda p:p.read_text(encoding='utf8')
find=lambda pat:[p for p in src.rglob('*.js') if re.search(pat,text(p))]
bp=(ROOT/'build.py').read_text(encoding='utf8')
ok('сборка не использует старые заплатки (engine.py, conv_ui, ed_ui, mes_patch, sk_thread)',not re.search(r'\b(engine|conv_ui|ed_ui|mes_patch|sk_thread)\b\s*(\.|import)',bp) and 'import engine' not in bp)
solver=find(r'\nfunction dmSkSolve\(');skel=find(r'\nfunction skBuild\(')
ok('решатель каркаса лежит ровно в одном файле src/',len(solver)==1,solver)
ok('построение каркаса лежит ровно в одном файле src/',len(skel)==1,skel)
ok('номер версии в одном файле src/VERSION',(src/'VERSION').exists() and re.fullmatch(r'\d+\s*',text(src/'VERSION')) is not None)
ok('в шаблонах нет второй копии решателя',not any('function dmSkSolve(' in text(p) for p in (src/'shells').glob('*')) if (src/'shells').is_dir() else False)
if len(solver)==1 and len(skel)==1:
    t2=tmp/'probe';shutil.copytree(ROOT,t2,ignore=shutil.ignore_patterns('tests','out','__pycache__'))
    for p,tag in [(solver[0],'/*PROBE-SOLVER*/'),(skel[0],'/*PROBE-SKELETON*/')]:
        q=t2/p.relative_to(ROOT);s=text(q);i=s.index('\nfunction ')+1;q.write_text(s[:i]+tag+'\n'+s[i:],encoding='utf8')
    (t2/'src'/'VERSION').write_text('99\n')
    good,log=build(t2,t2/'out');ok('сборка с пробными метками проходит',good,log)
    if good:
        c=(t2/'out'/FILES[0]).read_text(encoding='utf8');e=(t2/'out'/FILES[1]).read_text(encoding='utf8');m=(t2/'out'/FILES[2]).read_text(encoding='utf8')
        cp={'конвертер: ядро':blk(c,'core-src'),'конвертер: движок для сайта':blk(c,'site-adapter-src'),'редактор: ядро':blk(e,'core-src'),'редактор: движок для сайта':blk(e,'bundled-adapter')}
        ok('правка решателя попала во все 4 копии движка (по одному разу)',all(v.count('/*PROBE-SOLVER*/')==1 for v in cp.values()),{k:v.count('/*PROBE-SOLVER*/') for k,v in cp.items()})
        ok('правка каркаса попала в конвертер и в редактор размеров',cp['конвертер: ядро'].count('/*PROBE-SKELETON*/')==1 and m.count('/*PROBE-SKELETON*/')==1,[cp['конвертер: ядро'].count('/*PROBE-SKELETON*/'),m.count('/*PROBE-SKELETON*/')])
        ok('каркас не попал туда, где он не нужен (редактор сайта, сайт)','/*PROBE-SKELETON*/' not in e and '/*PROBE-SKELETON*/' not in blk(c,'site-adapter-src'))
        ok('номер версии из src/VERSION стоит в обоих движках для сайта',all(v.lstrip('\n').startswith('/*OBJRT:START v99*/') for k,v in cp.items() if 'сайта' in k),[v[:22] for v in cp.values()])
shutil.rmtree(tmp,ignore_errors=True)
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
