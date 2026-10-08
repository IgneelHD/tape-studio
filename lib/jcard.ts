import {type Project,type Layer,type Geometry,type SheetSide,type Track,layer,sheetGeometry,trackNote,cassetteBadges,albumArtwork} from './model';
// Layout is shared by the editor and every export; the reverse changes panel positions, never glyphs.
export function fullJcardLayers(p:Project,g:Geometry,side:SheetSide):Layer[]{
 const b=p.booklet!,inner=side==='inner',out:Layer[]=[],ink=inner?b.innerInk:p.ink;
 const add=(id:string,part:Partial<Layer>)=>{out.push(layer({id,name:id,auto:true,side,visible:!p.hideText,color:ink,font:p.bodyFont,size:p.bodySize,...part,...p.builtin[id]}));};
 const text=(id:string,text:string,x:number,y:number,w:number,h:number,part:Partial<Layer>={})=>add(id,{text,x,y,w,h,...part});
 const front=g.panels.find(x=>x.id==='front')!,back=g.panels.find(x=>x.id==='back')!,spine=g.panels.find(x=>x.id==='spine')!;
 const inserts=g.panels.filter(x=>x.id.startsWith('insert')).sort((a,c)=>a.x-c.x),art=albumArtwork(p);
 const brand=cassetteBadges(p).join('  ·  ');
 if(p.smartDesign&&!inner){for(const panel of inserts){add('design-paper-'+panel.id,{type:'rect',x:panel.x,y:0,w:panel.w,h:panel.h,color:p.paper,panel:'background',visible:true});if(p.smartDesign.style==='pixel'){for(let i=0;i<8;i++)add('design-pixel-'+panel.id+'-'+i,{type:'rect',x:panel.x+i*panel.w/8,y:panel.h-10-(i%3)*3,w:panel.w/8,h:10+(i%3)*3,color:p.accent,opacity:.35,panel:'background',visible:true});}else{add('design-rule-'+panel.id,{type:'rect',x:panel.x+5,y:22,w:panel.w-10,h:.6,color:p.accent,panel:'background',visible:true});add('design-band-'+panel.id,{type:'rect',x:panel.x+5,y:panel.h-30,w:panel.w-10,h:1.5,color:p.accent,panel:'background',visible:true});}}}

 
 const badges=(prefix:string,x:number,y:number,w:number,h:number)=>{const labels=cassetteBadges(p),cols=w>40?2:1,gap=1,rows=Math.ceil(labels.length/cols),row=(h-Math.max(0,rows-1)*gap)/Math.max(1,rows),cw=(w-(cols-1)*gap)/cols;labels.forEach((badge,i)=>text(prefix+'-badge-'+i,badge,x+(i%cols)*(cw+gap),y+Math.floor(i/cols)*(row+gap),cw,row,{name:'Метка · '+badge,bold:true,size:7,align:'center',vAlign:'middle',wrap:false,badgeIcon:/hi.?fi/i.test(badge)?'hifi':/dolby/i.test(badge)?'dolby':/music/i.test(badge)?'music':'stereo',border:.15,borderColor:ink}));};
 if(inner){
  for(const panel of g.panels)add('inner-paper-'+panel.id,{type:'rect',name:'Бумага · '+panel.name,x:panel.x,y:0,w:panel.w,h:panel.h,color:['back','spine','front'].includes(panel.id)?p.paper:b.innerPaper,visible:true,panel:'background'});
  if(art)add('inner-cover-art',{...art,id:'inner-cover-art',name:'Обложка внутри',x:front.x+(p.smartDesign?6:0),y:p.smartDesign?24:0,w:p.smartDesign?front.w-12:front.w,h:p.smartDesign?front.w-12:front.h,fit:p.smartDesign?'contain':art.fit,auto:true,side:'inner',visible:true});
  if(!art||p.titlePos!=='hidden')text('inner-cover-title',p.title,front.x+5,front.h*.15,front.w-10,front.h*.22,{font:p.titleFont,size:p.titleSize,bold:true,color:p.ink});
  text('inner-cover-credit',p.artist+'\n'+[p.year,p.catalog].filter(Boolean).join(' · '),front.x+5,front.h-20,front.w-10,12,{size:8,color:p.ink});
  text('inner-colophon',[p.description,p.credits,p.warning].filter(Boolean).join('\n\n'),back.x+3,8,Math.max(2,back.w-6),back.h-28,{size:7,color:p.ink});
  text('inner-brand',brand,back.x+3,back.h-16,Math.max(2,back.w-6),12,{bold:true,size:5.5,color:p.ink});
  type Block={id:string;title:string;body:string};const blocks:Block[]=[];
  for(const [sideName,tracks] of [['A',p.tracksA],['B',p.tracksB]] as const)tracks.forEach((t,i)=>blocks.push({id:t.id,title:`${sideName}${String(i+1).padStart(2,'0')}  ${t.title}${t.duration?'  / '+t.duration:''}`,body:trackNote(t,p)}));
  if(b.notes)blocks.push({id:'booklet-notes',title:'ПРИМЕЧАНИЯ К ИЗДАНИЮ',body:b.notes});
  if(!blocks.length)blocks.push({id:'empty',title:'ЗАМЕТКИ К ИЗДАНИЮ',body:p.description||p.credits});
  const rows=Math.max(1,Math.ceil(blocks.length/Math.max(1,inserts.length))),step=(p.dimensions.h-25)/rows,hasNotes=blocks.some(block=>!!block.body),titleSize=Math.min(7.5,step*(hasNotes?.4:1)*72/25.4/1.2),heading=hasNotes?Math.min(step*.4,titleSize*25.4/72*1.2):Math.min(step,titleSize*25.4/72*1.2);
  let start=0;
  inserts.forEach((panel,page)=>{
   text('inner-page-header-'+page,`${p.title}  /  ${String(page+1).padStart(2,'0')}`,panel.x+5,5,panel.w-10,5,{bold:true,size:6.5});
   add('inner-rule-'+page,{type:'rect',x:panel.x+5,y:12,w:panel.w-10,h:.2,color:ink});
   const count=Math.ceil((blocks.length-start)/(inserts.length-page)),end=start+count;
   for(let i=start;i<end;i++){const y=17+(i-start)*step;const block=blocks[i];text('note-title-'+block.id,block.title,panel.x+5,y,panel.w-10,heading,{bold:true,size:titleSize,minSize:titleSize,wrap:false});if(block.body)text('note-body-'+block.id,block.body,panel.x+5,y+heading+.5,panel.w-10,Math.max(.1,step-heading-1),{size:7.5,wrap:true});}
   start=end;
  });

 }else{
  // A separately uploaded panorama takes precedence over the album cover.
  if(inserts.length&&b.panorama){const left=Math.min(...inserts.map(x=>x.x)),right=Math.max(...inserts.map(x=>x.x+x.w));add('outer-panorama',{type:'image',name:'Панорама раскрытого вкладыша',src:b.panorama,x:left,y:0,w:right-left,h:p.dimensions.h,fit:'cover',panel:'background',visible:true});}
  if(p.smartDesign&&inserts.length>1){const panel=inserts[0];text('design-album-credit',p.artist,panel.x+5,7,panel.w-10,10,{font:p.titleFont,bold:true,size:12,color:p.accent});for(const [i,tracks] of [p.tracksA,p.tracksB].entries()){text('design-side-'+i,(i?'SIDE B':'SIDE A')+'\n'+sumDuration(tracks),panel.x+5,32+i*22,panel.w-10,16,{size:10,bold:true,align:'center',vAlign:'middle'});}}
  if(inserts.length){const panel=inserts[inserts.length-1];text('outer-spread-title',p.title,panel.x+5,7,panel.w-10,14,{font:p.titleFont,bold:true,size:14});text('outer-spread-footer',[p.artist,p.year,brand].filter(Boolean).join('\n'),panel.x+5,panel.h-19,panel.w-10,14,{size:6});}
  if(p.titlePos!=='hidden'){text('title',p.title,front.x+5,p.titlePos==='bottom'?front.h*.65:p.titlePos==='center'?front.h*.43:12,front.w-10,front.h*.2,{name:'Название',font:p.titleFont,bold:true,size:p.titleSize});text('artist',p.artist,front.x+5,5,front.w-10,6,{name:'Исполнитель',size:8,bold:true});}
  if(!p.hideMeta)text('outer-cover-meta',[p.year,p.catalog].filter(Boolean).join(' · '),front.x+4,front.h-8,front.w-8,5,{size:6});
  const half=(back.w-8)/2,lw=back.h-26;
  for(const [i,tracks] of [p.tracksA,p.tracksB].entries()){const sideName=i?'B':'A',cx=back.x+4+half*(i+.5),cy=back.y+(back.h-22)/2;const size=Math.max(6.5,Math.min(p.trackSize,10)),capacity=Math.max(1,Math.floor((half-2)/(size*25.4/72*1.2))-1),continued=tracks.length>capacity,shown=tracks.slice(0,continued?Math.max(0,capacity-1):capacity);const content=`**${sideName} / ${sumDuration(tracks)}**\n`+shown.map((t,n)=>`${String(n+1).padStart(2,'0')} ${t.title}${t.duration?'  '+t.duration:''}`).join('\n')+(continued?'\nПолный список — внутри':'');text('tracks'+sideName,content,cx-lw/2,cy-(half-2)/2,lw,half-2,{name:'Треки · сторона '+sideName,size:Math.max(6.5,Math.min(p.trackSize,10)),minSize:6.5,rotation:90,align:'left',blockAlign:'center',vAlign:'middle',wrap:false});}
  badges('outer-back',back.x+3,back.h-21,Math.max(2,back.w-6),18);
 }
 const lw=spine.h-29,lh=Math.max(2,(spine.w-4)/2),cx=spine.x+spine.w/2,cy=spine.h/2,prefix=inner?'inner-':'';
 for(const [id,value,offset,size] of [['spine-artist',p.artist,-lh/2,Math.min(8,p.spineSize)],['spine-title',p.title,lh/2,p.spineSize]] as const){text(prefix+id,value,cx-offset-lw/2,cy-lh/2,lw,lh,{name:id==='spine-title'?'Название альбома · корешок':'Исполнитель · корешок',rotation:90,font:p.spineFont,size,bold:true,align:'center',color:p.ink,wrap:false,vAlign:'middle',visible:!p.hideText&&!p.hideSpine});}
 text((inner?'inner-':'')+'spine-brand',b.label||b.badges.find(x=>/music/i.test(x))||'STEREO',spine.x+1,3,spine.w-2,8,{size:5,bold:true,align:'center',color:p.ink});
 text((inner?'inner-':'')+'spine-stereo','STEREO',spine.x+1,spine.h-10,spine.w-2,6,{size:5,bold:true,align:'center',color:p.ink});return out;
}
export function sumDuration(tracks:Track[]){const n=tracks.reduce((sum,t)=>{const a=t.duration.split(':').map(Number);return sum+(a.every(Number.isFinite)?a.reduce((v,x)=>v*60+x,0):0);},0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export function labelLayers(p:Project,side:SheetSide):Layer[]{const sideName=side==='labelB'?'B':'A',tracks=sideName==='A'?p.tracksA:p.tracksB,b=p.booklet;const out:Layer[]=[];const add=(id:string,part:Partial<Layer>)=>out.push(layer({id,auto:true,side,name:id,color:p.ink,font:p.bodyFont,wrap:false,...part,...p.builtin[id]}));const art=albumArtwork(p);if(art&&!p.smartDesign)add(side+'-art',{...art,id:side+'-art',x:0,y:0,w:89,h:41,side,auto:true,visible:true,opacity:.2});
 if(p.smartDesign)add(side+'-band',{type:'rect',x:0,y:0,w:89,h:5,color:p.accent,opacity:.18,visible:true,panel:'background'});
 add(side+'-title',{name:'Название · этикетка '+sideName,text:[p.artist,p.title].filter(Boolean).join(' / '),x:4,y:1,w:81,h:3.6,font:p.titleFont,bold:true,size:p.smartDesign?.style==='pixel'?7:9,minSize:6.5,align:'center',vAlign:'middle'});
 add(side+'-side',{text:sideName,x:2,y:14,w:13,h:13,size:20,bold:true,align:'center',vAlign:'middle'});add(side+'-duration',{text:sumDuration(tracks)+'\nSTEREO',x:74,y:16,w:13,h:9,size:6.5,minSize:6.5,bold:true,align:'center',vAlign:'middle'});
 const compact=tracks.length>12,visible=tracks.slice(0,12);
 visible.forEach((t,i)=>{const col=i%2,row=Math.floor(i/2),x=4+col*42,y=row<3?5.8+row*2.8:28.7+(row-3)*2.8;add(side+'-track-'+t.id,{name:'Трек '+sideName+(i+1),text:String(i+1).padStart(2,'0')+' '+t.title,x,y,w:31.5,h:2.8,size:6.5,minSize:6.5,vAlign:'middle'});add(side+'-time-'+t.id,{name:'Длительность '+sideName+(i+1),text:t.duration,x:x+32,y,w:7,h:2.8,size:6.5,minSize:6.5,align:'right',vAlign:'middle'});});
 if(compact)add(side+'-continued',{name:'Продолжение треклиста',text:`${sideName}13–${sideName}${tracks.length}: полный список внутри вкладыша`,x:4,y:37.1,w:81,h:2.8,size:6.5,minSize:6.5,align:'center',vAlign:'middle'});
 add(side+'-brand',{text:cassetteBadges(p).join(' · '),x:4,y:39.2,w:81,h:1.5,size:3.5,align:'center',vAlign:'middle'});return out;}
