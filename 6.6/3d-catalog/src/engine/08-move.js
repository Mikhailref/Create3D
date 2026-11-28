function geoSet1(g,st,key,val){
  // на время движения замки меняются (см. dmFree), потом ставятся обратно уже на новых значениях
  const lk=st.lk,{open,shut}=dmFree(st,key);
  if(!open.length&&!shut.length)return geoMove(g,st,key,val);
  // записать в ползунки фактические величины: замок держит именно их
  const fix=L=>{const A=dmSkSolve(st).val;L.forEach(q=>{if(A[q]!==undefined){const v0=st.dm[q].v0;st.dv[q]=Math.abs(A[q]-v0)<1e-6?v0:A[q]}})};
  const old=JSON.parse(JSON.stringify(st));
  // открытые и защищённые размеры пока удерживаются на нынешних значениях, чтобы деталь не дёрнулась от смены замков
  const keep=L=>L.forEach(q=>{if((st.last=st.last||[]).indexOf(q)<0){st.last.push(q);(st.ua=st.ua||[]).push(q)}if((st.un=st.un||[]).indexOf(q)<0)st.un.push(q)});
  fix(shut.concat(open));keep(open);
  const t=Object.assign({},lk);open.forEach(q=>delete t[q]);shut.forEach(q=>{t[q]=1});st.lk=t;
  geoMove(g,st,key,val);
  fix(open);
  st.lk=lk;
  keep(shut); // как после установки замка: держатся, пока на их оси не двинут другое
  // проверка уже с настоящими замками: если в редком сложном случае что-то разошлось, это движение не выполняется
  const was=dmShot(old),now=dmShot(st),L=Object.assign({},lk);open.forEach(q=>delete L[q]);
  const drag=key[0]==='q'?[+key.slice(1)]:old.cm[+key.slice(1)].m,G=dmLinks(old);
  const gap=(S,l)=>{const v=l.map(e=>dmVal(S.st,e,S.A));return (Math.max(...v)-Math.min(...v))*Math.max(...l.map(e=>e.k))};
  const mid=(S,q)=>{const s=st.dm[q],ax=s.d.findIndex(x=>x!==0),e=S.c.find(c=>c.ax===ax),p=e?e.by:st.sk.s[ax];return (p[s.sk[0]]+p[s.sk[1]])/2};
  if(dmGood({st:Object.assign({},st,{lk:L}),c:now.c,A:now.A},was,[],drag)
    &&Object.keys(G).every(k=>gap(now,G[k])<=Math.max(gap(was,G[k]),.003)+.002)
    &&Object.keys(st.cp||{}).every(q=>Math.abs(mid(now,+q)-mid(was,+q))<=.01))return;
  ['dv','last','un','ua','cb','cg'].forEach(k=>{if(old[k]===undefined)delete st[k];else st[k]=old[k]});
}
