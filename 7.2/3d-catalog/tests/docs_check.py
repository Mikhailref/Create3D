# Документация не отстаёт от программ: история версий и инструкция по функциям
import re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'src'
ok_n=bad_n=0
def ok(name,cond,info=''):
    global ok_n,bad_n
    if cond:ok_n+=1;print('  ОК    ',name)
    else:bad_n+=1;print('  ОШИБКА',name,' →',str(info)[:300])
H=ROOT/'ИСТОРИЯ.md';G=ROOT/'ИНСТРУКЦИЯ.md';V=(SRC/'VERSION').read_text().strip()
ok('есть история версий ИСТОРИЯ.md',H.exists())
ok('есть инструкция ИНСТРУКЦИЯ.md',G.exists())
if H.exists():
    h=H.read_text(encoding='utf8');vs=re.findall(r'^## v(\d+)',h,re.M)
    ok(f'верхняя запись истории — текущая версия v{V}',vs[:1]==[V],vs[:3])
    ok('у каждой версии дата и хотя бы один пункт',all(re.search(r'^## v'+v+r'\b[^\n]*\d{4}-\d\d-\d\d[^\n]*\n(?:[^\n]*\n)*?- ',h,re.M) for v in vs),vs)
if G.exists():
    g=G.read_text(encoding='utf8');allsrc=''.join(p.read_text(encoding='utf8') for p in SRC.rglob('*') if p.is_file())
    fns=re.findall(r"\{k:'(\w+)',ru:'([^']+)'",(SRC/'shells'/'converter.html').read_text(encoding='utf8'))
    ok('в конвертере найден список функций',len(fns)>=1,fns)
    ok('каждая функция конвертера описана в инструкции (есть раздел с её названием)',all(re.search(r'^#+ .*'+re.escape(ru),g,re.M) for k,ru in fns),[ru for k,ru in fns if not re.search(r'^#+ .*'+re.escape(ru),g,re.M)])
    labels=set(re.findall(r'«([^»]{2,60})»',g))
    miss=[l for l in labels if l not in allsrc]
    ok(f'все {len(labels)} кнопок и надписей, названных в инструкции в «кавычках», есть в программах',not miss,miss)
    ok('в инструкции разделы для трёх программ',all(re.search(r'^## .*'+n,g,re.M) for n in ['Редактор размеров','Конвертер','Редактор сайта']))
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
