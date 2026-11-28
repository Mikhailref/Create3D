# Редактор сайта: превью в карточках (объёмное WebP / простое / без превью) и готовые кружки цветов у палитры
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
SW=['#94a3b8','#38bdf8','#f59e0b','#10b981','#ef4444','#6366f1','#334155']
base=(T/'site-cfg.html').read_text()
(T/'site-sw.html').write_text(base.replace('const SWATCH_COLORS=[];','const SWATCH_COLORS = ['+', '.join("'"+c+"'" for c in SW)+'];'))
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);ctx.set_default_timeout(5000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());g.wait_for_timeout(800);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d:click()
        f=T/name;d.value.save_as(f);return f
    def editor(site,models=()):
        s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(site));s.wait_for_timeout(800)
        if models:
            fid=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
            s.set_input_files('#'+[i for i,m in fid if i!='fSite' and m][0],[str(x) for x in models]);s.wait_for_timeout(2500)
        return s
    MODELS='()=>readRegistry(site).models.map(m=>({id:m.id,thumb:m.thumb||"",thn:m.thn,color:m.color}))'
    CFG='()=>readCfg(site)'
    # картинка превью: формат, размер, прозрачный фон по углам, непрозрачная модель в центре, серая (под перекраску)
    INFO='''async u=>{if(!u)return null;const im=new Image();im.src=u;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
      const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;const W=c.width;
      let op=0,grey=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200){op++;if(Math.abs(d[i]-d[i+1])<=4&&Math.abs(d[i+1]-d[i+2])<=4)grey++}
      const a=(x,y)=>d[(y*W+x)*4+3];
      return {fmt:u.slice(5,u.indexOf(';')),w:im.width,h:im.height,len:u.length,corners:[a(1,1),a(W-2,1),a(1,W-2),a(W-2,W-2)],opaque:op/(W*W),grey:op?grey/op:0}}'''
    info=lambda s,u:s.evaluate(INFO,u)
    def mode(s,v):s.locator(f'input[name="thMode"][value="{v}"]').check(force=True);s.wait_for_timeout(2500)

    print('Объёмное превью — WebP')
    s=editor(T/'site-cfg.html',[T/'user-model.html'])
    ok('в разделе превью три варианта',s.locator('input[name="thMode"]').count()==3,s.locator('input[name="thMode"]').count())
    t=s.locator('label.thmode').evaluate_all('l=>l.map(e=>e.textContent)')
    ok('варианты подписаны и у каждого показан вес',len(t)==3 and all(n in x and 'КБ' in x for n,x in zip(['🧊 Объёмное','Простое','Без превью'],t)),t)
    ok('по умолчанию выбрано объёмное',s.locator('input[name="thMode"][value="vol"]').is_checked())
    m=s.evaluate(MODELS)[0];i=info(s,m['thumb'])
    ok('новая модель получает объёмное превью сразу',m['thn']==1 and i and i['w']==420,i)
    ok('объёмное превью в WebP',i and i['fmt']=='image/webp',i and i['fmt'])
    ok('объёмное превью легче 20 КБ (было ~40 КБ в PNG)',i and i['len']<20000,i and i['len'])
    ok('фон прозрачный, модель непрозрачная',i and max(i['corners'])==0 and i['opaque']>0.1,i)
    ok('превью серое — сайт перекрашивает его в цвет модели',i and i['grey']>0.97,i)
    png=s.evaluate('()=>{const m=readRegistry(site).models[0];const c=document.createElement("canvas");const r=thumbCore(m,420);c.width=c.height=r.W;c.getContext("2d").putImageData(new ImageData(r.rgba,r.W,r.W),0,0);return c.toDataURL("image/png").length}')
    ok('WebP меньше PNG того же рисунка хотя бы в 2,5 раза',i and png/i['len']>2.5,(png,i and i['len']))
    ok('вес превью показан на карточке модели',re.search(r'превью \d+ КБ',s.inner_text('body')),s.inner_text('body')[:600])
    ok('общий вес превью показан в разделе',re.search(r'Превью всех моделей: \d+ КБ',s.inner_text('body')))
    s.evaluate('()=>{const m=readRegistry(site).models[0];touchModel(m.id,x=>{const c=document.createElement("canvas");const r=thumbCore(x,420);c.width=c.height=r.W;c.getContext("2d").putImageData(new ImageData(r.rgba,r.W,r.W),0,0);x.thumb=c.toDataURL("image/png");x.thn=1});render()}')
    s.get_by_role('button',name='🧊 Перерисовать превью всех моделей').click();s.wait_for_timeout(2500)
    i2=info(s,s.evaluate(MODELS)[0]['thumb'])
    ok('кнопка перерисовки переводит старое PNG-превью в WebP',i2 and i2['fmt']=='image/webp' and i2['w']==420,i2)
    s.get_by_role('button',name='Настроить').first.click();s.wait_for_timeout(300)
    s.evaluate('()=>{const m=readRegistry(site).models[0];touchModel(m.id,x=>{x.thumb=""});render()}')
    s.get_by_role('button',name='🧊 Сделать превью объёмным').click();s.wait_for_timeout(1500)
    i3=info(s,s.evaluate(MODELS)[0]['thumb']);ok('кнопка в настройках модели тоже даёт WebP',i3 and i3['fmt']=='image/webp',i3)
    vol=i2['len']

    print('Простое превью')
    mode(s,'simple')
    m=s.evaluate(MODELS)[0];i=info(s,m['thumb'])
    ok('простое превью: WebP 240×240, серое, прозрачный фон',i and i['fmt']=='image/webp' and i['w']==240 and max(i['corners'])==0 and i['grey']>0.97 and m['thn']==1,i)
    print('    вес: объёмное',vol,'простое',i and i['len'])
    ok('простое заметно легче объёмного',i and i['len']<vol*0.6,(i and i['len'],vol))
    ok('выбор записан в настройки сайта',s.evaluate(CFG).get('thumbMode')=='simple',s.evaluate(CFG))

    print('Без превью')
    mode(s,'none')
    ok('у моделей превью убрано',all(not x['thumb'] for x in s.evaluate(MODELS)))
    ok('в разделе показано 0 КБ',re.search(r'Превью всех моделей: 0 КБ',s.inner_text('body')))
    fid=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    s.set_input_files('#'+[i for i,m in fid if i!='fSite' and m][0],str(T/'user-model.html'));s.wait_for_timeout(2500)
    ok('модель, добавленная в этом режиме, тоже без превью',all(not x['thumb'] for x in s.evaluate(MODELS)))
    site=save(s,lambda:s.click('#btnSave'),'site-thumb-none.html')
    h=site.read_text();cfg=json.loads(re.search(r'id="site-config">(.*?)</script>',h,re.S).group(1))
    ok('сохранённый сайт помнит выбор',cfg.get('thumbMode')=='none',cfg)
    s2=editor(site);ok('при повторном открытии выбран «Без превью»',s2.locator('input[name="thMode"][value="none"]').is_checked())
    mode(s2,'vol')
    i=info(s2,s2.evaluate(MODELS)[0]['thumb'])
    ok('объёмное возвращается из геометрии модели',i and i['fmt']=='image/webp' and i['w']==420,i)
    s2.evaluate('()=>{const m=readRegistry(site).models[0];document.body.insertAdjacentHTML("beforeend","<div id=tt>"+tintSvg(m.thumb,"#ef4444","t1")+"</div>")}')
    ok('перекраска на сайте работает с WebP (картинка внутри svg)',s2.evaluate('async()=>{const u=document.querySelector("#tt image").getAttribute("href");const im=new Image();im.src=u;await im.decode();return im.width}')==420)

    print('Кружки цветов у палитры')
    s=editor(T/'site-sw.html',[T/'user-model.html'])
    s.get_by_role('button',name='Настроить').first.click();s.wait_for_timeout(300)
    box=s.locator('.meditor .mswatch')
    got=box.locator('.msw').evaluate_all('l=>l.map(e=>e.dataset.color)')
    ok('в настройках модели рядом с палитрой — стандартные цвета сайта',got==SW,got)
    box.locator('.msw[data-color="#ef4444"]').click();s.wait_for_timeout(400)
    ok('кружок ставит цвет модели',s.evaluate(MODELS)[0]['color']=='#ef4444',s.evaluate(MODELS)[0]['color'])
    ok('выбранный кружок отмечен, палитра показывает тот же цвет',s.locator('.meditor .mswatch .msw.on').evaluate_all('l=>l.map(e=>e.dataset.color)')==['#ef4444'] and s.locator('.meditor input[type=color]').first.input_value()=='#ef4444')
    allb=s.locator('#allColor').locator('xpath=..').locator('.msw')
    ok('у «Один цвет для всех моделей» те же кружки',allb.evaluate_all('l=>l.map(e=>e.dataset.color)')==SW)
    allb.nth(3).click();s.wait_for_timeout(300)
    ok('кружок у общего цвета подставляет цвет в палитру (применяется кнопкой)',s.locator('#allColor').input_value()==SW[3] and s.evaluate(MODELS)[0]['color']=='#ef4444')
    s.get_by_role('button',name='Применить ко всем').click();s.wait_for_timeout(400)
    ok('«Применить ко всем» красит модели этим цветом',s.evaluate(MODELS)[0]['color']==SW[3])
    s.evaluate('()=>{const c=cfg();c.swatches=["#123456","#abcdef"];saveCfg(c);render()}')
    got=s.locator('.meditor .mswatch .msw').evaluate_all('l=>l.map(e=>e.dataset.color)')
    ok('если в «Оформлении» задан свой набор цветов — кружки из него',got==['#123456','#abcdef'],got)
    s3=editor(T/'site-cfg.html',[T/'user-model.html'])
    s3.get_by_role('button',name='Настроить').first.click();s3.wait_for_timeout(300)
    ok('нет цветов на сайте — кружков нет, палитра работает',s3.locator('.meditor .msw').count()==0 and s3.locator('.meditor input[type=color]').count()>=1)
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
