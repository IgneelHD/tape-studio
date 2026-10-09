import {type Project,type Layer,type Geometry,type SheetSide,type Track,layer,sheetGeometry,trackNote,cassetteBadges,albumArtwork} from './model';
// Layout is shared by the editor and every export; the reverse changes panel positions, never glyphs.
export function fullJcardLayers(p:Project,g:Geometry,side:SheetSide):Layer[]{
 const b=p.booklet!,inner=side==='inner',out:Layer[]=[],ink=inner?b.innerInk:p.ink;
 const add=(id:string,part:Partial<Layer>)=>{out.push(layer({id,name:id,auto:true,side,visible:!p.hideText,color:ink,font:p.bodyFont,size:p.bodySize,...part,...p.builtin[id]}));};
 const text=(id:string,text:string,x:number,y:number,w:number,h:number,part:Partial<Layer>={})=>add(id,{text,x,y,w,h,...part});
 const front=g.panels.find(x=>x.id==='front')!,back=g.panels.find(x=>x.id==='back')!,spine=g.panels.find(x=>x.id==='spine')!;
 const badges=(prefix:string,x:number,y:number,w:number,h:number)=>{const labels=cassetteBadges(p),cols=w>40?2:1,gap=1,rows=Math.ceil(labels.length/cols),row=(h-Math.max(0,rows-1)*gap)/Math.max(1,rows),cw=(w-(cols-1)*gap)/cols;labels.forEach((badge,i)=>text(prefix+'-badge-'+i,badge,x+(i%cols)*(cw+gap),y+Math.floor(i/cols)*(row+gap),cw,row,{name:'Метка · '+badge,bold:true,size:7,align:'center',vAlign:'middle',wrap:false,badgeIcon:/hi.?fi/i.test(badge)?'hifi':/dolby/i.test(badge)?'dolby':/music/i.test(badge)?'music':'stereo',border:.15,borderColor:ink}));};
 if(inner)return [];
 {
  if(p.titlePos!=='hidden'){text('title',p.title,front.x+5,p.titlePos==='bottom'?front.h*.65:p.titlePos==='center'?front.h*.43:12,front.w-10,front.h*.2,{name:'Название',font:p.titleFont,bold:true,size:p.titleSize});text('artist',p.artist,front.x+5,5,front.w-10,6,{name:'Исполнитель',size:8,bold:true});}
  if(!p.hideMeta)text('outer-cover-meta',[p.year,p.catalog].filter(Boolean).join(' · '),front.x+4,front.h-8,front.w-8,5,{size:6});
  const half=(back.h-27)/2,lw=half-1,size=Math.max(7,Math.min(p.trackSize,10)),lh=back.w-6;
  const texts=[p.tracksA,p.tracksB].map((tracks,i)=>(i?'B':'A')+' / '+sumDuration(tracks)+'\n'+tracks.map((t,n)=>`${String(n+1).padStart(2,'0')} ${t.title}${t.duration?' / '+t.duration:''}`).join('\n'));
  const ctx=typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
  if(ctx)ctx.font=`${size*25.4/72*10}px "${p.bodyFont}", sans-serif`;
  const fits=texts.every(content=>{const lines=content.split('\n');return lines.length*size*25.4/72*1.2<=lh&&lines.every(line=>(ctx?ctx.measureText(line).width/10:line.length*size*25.4/72*.65)<=lw);});
  if(fits){texts.forEach((content,i)=>{const cx=back.x+back.w/2,cy=back.y+3+half*(i+.5);text('tracks'+(i?'B':'A'),content,cx-lw/2,cy-lh/2,lw,lh,{name:'Треки · сторона '+(i?'B':'A'),size,minSize:size,rotation:90,align:'left',blockAlign:'center',vAlign:'middle',wrap:false});});}
  else {
   // Native-size cassette artwork: no raster scaling, crop or partial track list.
   const x=back.x+3,y=19,w=back.w-6,h=47;
   add('flap-art-frame',{name:'Кассетная графика · клапан',type:'rect',x,y,w,h,color:p.accent,visible:true,radius:1});
   add('flap-art-inset',{type:'rect',x:x+1,y:y+1,w:w-2,h:h-2,color:p.paper,visible:true,radius:.7});
   add('flap-art-window',{type:'rect',x:x+3,y:y+10,w:w-6,h:h-20,color:p.accent,visible:true,radius:1});
   for(const [i,ry] of [y+17,y+h-17].entries()){add('flap-art-reel-'+i,{type:'ellipse',x:x+w/2-4,y:ry-4,w:8,h:8,color:p.paper,visible:true});add('flap-art-hub-'+i,{type:'ellipse',x:x+w/2-1.2,y:ry-1.2,w:2.4,h:2.4,color:p.accent,visible:true});}
   text('flap-art-title','A / B',x,y+3,w,4,{font:'Arial',size:8,bold:true,align:'center',wrap:false});
  }
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
 const visible=tracks.slice(0,12);
 visible.forEach((t,i)=>{const col=i%2,row=Math.floor(i/2),x=4+col*42,y=row<3?5.8+row*2.8:28.7+(row-3)*2.8;add(side+'-track-'+t.id,{name:'Трек '+sideName+(i+1),text:String(i+1).padStart(2,'0')+' '+t.title,x,y,w:31.5,h:2.8,size:6.5,minSize:6.5,vAlign:'middle'})});
 add(side+'-brand',{text:cassetteBadges(p).join(' · '),x:4,y:39.2,w:81,h:1.5,size:3.5,align:'center',vAlign:'middle'});return out;}
