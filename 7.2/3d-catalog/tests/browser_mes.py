# редактор размеров: галочки по умолчанию, масштаб доходит до конвертера
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def export(g,name):
        with g.expect_download(timeout=15000) as d:g.click('#btn-export-html')
        f=T/name;d.value.save_as(f);return f
    def data(f):return json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',f.read_text(),re.S).group(1))
    e=page(OUT/'mesurments.html')
    ok('«Авто при входе» выключено по умолчанию',not e.locator('#auto-dims-on-load').is_checked())
    ok('«Показывать масштаб в конвертере» включено по умолчанию',e.locator('#show-scale-all').is_checked())
    e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1200)
    n=e.locator('input[data-action="name"]').count();ok('авторазмеры сами не появляются',n==2,n)
    ok('старый проект: масштаб включён',e.locator('#show-scale-all').is_checked() and all(a['showScale'] for a in data(export(e,'m-on.html'))['annotations']))
    def scale_in_conv(f):
        c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(f));c.wait_for_timeout(2000)
        r=c.evaluate('()=>plist().map(p=>p.key)');c.close();return 'sc' in r
    ok('в конвертере есть ползунок масштаба',scale_in_conv(T/'m-on.html'))
    e.screenshot(path=str(T/'mes.png'))
    e.locator('#show-scale-all').uncheck();e.wait_for_timeout(300)
    cards=e.locator('input[data-action="showscale"]')
    ok('галочки в карточках размеров следуют за общей',cards.count()>0 and not any(cards.nth(i).is_checked() for i in range(cards.count())),cards.count())
    off=export(e,'m-off.html');d=data(off)
    ok('выключенное значение сохраняется в файле',d['showScaleAll'] is False and not any(a['showScale'] for a in d['annotations']))
    ok('в конвертере ползунка масштаба нет',not scale_in_conv(off))
    e.set_input_files('#file-input',[]);e.set_input_files('#file-input',str(off));e.wait_for_timeout(1200)
    ok('при повторном открытии галочка остаётся выключенной',not e.locator('#show-scale-all').is_checked())
    if cards.count():
        cards.nth(0).evaluate('el=>{el.checked=true;el.dispatchEvent(new Event("change",{bubbles:true}))}');e.wait_for_timeout(300)
        ok('галочка в карточке включает и общую',e.locator('#show-scale-all').is_checked())
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
