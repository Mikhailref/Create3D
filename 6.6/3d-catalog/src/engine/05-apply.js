function dmApply(U,G,st,W){
  const V=U.length/3,dm=st.dm,dv=st.dv,c0=G.c0,K=st.U,PI=Math.PI;
  const P=G.dmw||(G.dmw=dmPrep(U,G.I,G,dm)),ev=P.ev,o=[0,0,0];
  const CM=dmAxMaps(dm,dv),MG=CM.m,SK=dmSkSolve(st).c;
  for(let i=0;i<V;i++){
    const i3=i*3;o[0]=o[1]=o[2]=0;
    for(let q=0;q<dm.length;q++){
      const s=dm[q],val=dv[q];
      if(s.t==='L'){
        if(MG[q]||s.sk)continue;
        if(s.inw){const pk=P.ws[q];if(!pk||!pk.k)continue;const kk=pk.k[i];if(!kk)continue;const D=(val-s.L0)*kk*s.inw.sg;o[0]+=D*s.d[0];o[1]+=D*s.d[1];o[2]+=D*s.d[2];continue}
        const r=s.rg?ev:U,t0=((r[i3]-s.a[0])*s.d[0]+(r[i3+1]-s.a[1])*s.d[1]+(r[i3+2]-s.a[2])*s.d[2])/s.L0,t=t0<0?0:t0>1?1:t0,D=(val-s.L0)*(t-DMAN[s.an]);
        o[0]+=D*s.d[0];o[1]+=D*s.d[1];o[2]+=D*s.d[2];
      }else if(s.t==='D'){
        const pw=P.ws[q];if(!pw||!pw.k)continue;
        const kk=pw.k[i];if(!kk)continue;
        const x=U[i3+s.u]-s.cu,y=U[i3+s.v]-s.cv,l=Math.hypot(x,y);if(l<1e-9)continue;
        // витки резьбы меняются в том же отношении, что и носитель; остальная геометрия — на ту же величину
        const dr=pw.t&&pw.t[i]?l*(val/s.v0-1):(val-s.v0)/2*kk;o[s.u]+=x/l*dr;o[s.v]+=y/l*dr;
      }else if(s.t==='A'){
        const rx=ev[i3]-s.c[0],ry=ev[i3+1]-s.c[1],rz=ev[i3+2]-s.c[2];
        const xx=rx*s.e1[0]+ry*s.e1[1]+rz*s.e1[2],yy=rx*s.e2[0]+ry*s.e2[1]+rz*s.e2[2],ph=Math.atan2(yy,xx),th=s.th0;
        let w;
        if(ph<=0)w=0;else if(ph<th)w=ph/th;else{const m=th+(PI-th)/2;w=ph<=m?1:Math.max(0,(PI-ph)/(PI-m))}
        const al=(val*PI/180-th)*(w-DMAN[s.an]);
        if(Math.abs(al)>1e-12){
          const cs=Math.cos(al),sn=Math.sin(al),dx=xx*cs-yy*sn-xx,dy=xx*sn+yy*cs-yy;
          for(let k=0;k<3;k++)o[k]+=dx*s.e1[k]+dy*s.e2[k];
        }
      }
    }
    for(const cm of CM.c)o[cm.ax]+=dmAxMap(cm,ev[i3+cm.ax])-ev[i3+cm.ax];
    // вершины цилиндра (и резьбы на нём) идут за плоскостями каркаса по поперечным осям: если размер поменял ширину цилиндра, он растягивается, а не просто сдвигается
    const fo=G.owner&&G.owner[i]>=0?G.cyl[G.owner[i]]:null;
    for(const cm of SK){const e=fo&&(cm.ax===fo.u||cm.ax===fo.v)?U[i3+cm.ax]:ev[i3+cm.ax];o[cm.ax]+=dmAxMap(cm,e)-e}
    for(let k=0;k<3;k++)W[i3+k]=c0[k]+K*(U[i3+k]+o[k]-c0[k]);
  }
}

