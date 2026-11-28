# Редактор размеров: размерная линия не улетает «в бесконечность» — отход от модели ограничен рамкой вокруг детали
# (при перетаскивании подписи, при открытии старого файла с огромным отступом, и когда направление отхода смотрит прямо в камеру)
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);ctx.set_default_timeout(6000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def drag(g,x,y,dx,dy):
        g.mouse.move(x,y);g.mouse.down();g.mouse.move(x+dx,y+dy,steps=12);g.mouse.up();g.wait_for_timeout(250)
    # проект: у первого размера огромный отступ (как после «улёта»), у второго направление отхода смотрит прямо в камеру
    src=(T/'project.html').read_text(encoding='utf8')
    m=re.search(r'(id="__CAD_ANNOTATIONS_DATA__"[^>]*>)(.*?)(</script>)',src,re.S);d=json.loads(m.group(2))
    d['annotations'][0]['offset']=5000
    v=[.5625,1,-.5451];n=sum(x*x for x in v)**.5;d['annotations'][1]['normal']=[x/n for x in v];d['annotations'][1]['offset']=10
    f=T/'offs-project.html';f.write_text(src[:m.start(2)]+json.dumps(d,ensure_ascii=False)+src[m.end(2):],encoding='utf8')

    print('Отступ размерных линий ограничен')
    e=page(OUT/'mesurments.html');e.set_input_files('#file-input',str(f));e.wait_for_timeout(1500)
    lim=e.evaluate('()=>ASSIST.offLim()')
    ok('предел отхода — по размеру детали (деталь 120 мм)',120<=lim<=400,lim)
    def L(i):
        e.evaluate('i=>document.querySelectorAll(".dim-badge")[i].scrollIntoView({block:"center",inline:"center"})',i);e.wait_for_timeout(150)
        return e.evaluate('()=>ASSIST.labels()')[i]
    on_screen=lambda l:-50<l['x']<1550 and -50<l['y']<950
    l=L(0)
    ok('старый файл с отступом 5000 — линия возвращается к модели',abs(l['offset'])<=lim,l['offset'])
    vx,vy=l['bx']-l['ax'],l['by']-l['ay'];n=(vx*vx+vy*vy)**.5
    drag(e,l['x'],l['y'],-vy/n*700,vx/n*700);l2=L(0)
    ok('тянем подпись далеко от модели — отступ не больше предела',abs(l2['offset'])<=lim,l2['offset'])
    ok('подпись остаётся на экране',on_screen(l2),(l2['x'],l2['y']))
    drag(e,l2['x'],l2['y'],vy/n*1400,-vx/n*1400);l3=L(0)
    ok('и в другую сторону тоже',abs(l3['offset'])<=lim,l3['offset'])
    l=L(1)
    drag(e,l['x'],l['y'],30,-40);l4=L(1)
    ok('отход прямо «в камеру»: небольшое движение мыши — небольшой сдвиг, без скачка',abs(l4['offset']-l['offset'])<=lim*.5,(l['offset'],l4['offset']))
    ok('такая подпись тоже на экране',on_screen(l4),(l4['x'],l4['y']))
    v=e.evaluate('()=>ASSIST.labels().map(x=>x.offset)')
    ok('числа конечные',all(isinstance(x,(int,float)) and abs(x)<1e6 for x in v),v)
    with e.expect_download() as dl:e.locator('#btn-export-html').evaluate('el=>el.click()')
    p2=T/'offs-saved.html';dl.value.save_as(p2)
    ann=json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',p2.read_text(encoding='utf8'),re.S).group(1))['annotations']
    ok('в сохранённом файле отступы в пределах',all(abs(a['offset'])<=lim for a in ann),[a['offset'] for a in ann])
    ok('ошибок на странице нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
