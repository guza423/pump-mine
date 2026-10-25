// @ts-nocheck
import React, { useState } from 'react';
import { BiomechTab } from '../biyomekanik/Biyomekanik';
import { Icon, StageFatigue, StageRate, StageRecruit, StageSignal, STAGES } from '../yorgunluk/Yorgunluk';
import { sleepScore, trainingScoreFromLoad } from '../../lib/models/fatigue';

const FOUNDATION = [
  ['1', 'Zor seti bul', 'Yalnız RIR 4 veya daha yakın setler antrenman yüküne girer.'],
  ['2', 'Ağırlığı ver', 'Tükenişe yakınlık × hareketin sistemik maliyeti.'],
  ['3', 'Zamanı işlet', 'Yük 36 saatlik zaman sabitiyle üstel azalır; 24 saatte yaklaşık %51 kalır.'],
  ['4', 'Uyku ve karar', 'Tek gece ile üç gecelik eğilim eklenir. Sonuç karar desteğidir, ölçüm değildir.'],
];

function FatigueMeter({ back }) {
  const [sets,setSets]=useState(16),[rir,setRir]=useState(2),[sessions,setSessions]=useState(3),[heavy,setHeavy]=useState(40),[lastSleep,setLastSleep]=useState(7),[avgSleep,setAvgSleep]=useState(7),[deload,setDeload]=useState(false);
  const prox=rir<=0?1.6:rir===1?1.3:rir===2?1.1:rir===3?1:.8;
  const avgCost=.6+(heavy/100)*.9;
  const weekly=sets*prox*avgCost*(deload?.5:1), per=weekly/sessions;
  let load=0,lastHour=0,pre=0,post=0;
  for(let week=0;week<3;week++)for(let n=0;n<sessions;n++){const hour=(week*7+(n*7/sessions))*24+18;load*=Math.exp(-(hour-lastHour)/36);lastHour=hour;if(week===2)pre+=trainingScoreFromLoad(load);load+=per;if(week===2)post+=trainingScoreFromLoad(load);}
  const sleep=sleepScore([lastSleep,avgSleep,avgSleep]);
  pre=Math.min(100,pre/sessions+sleep);post=Math.min(100,post/sessions+sleep);
  const slider=(label,value,set,min,max,step=1,unit='')=><label className="meter-control"><span>{label}<b className="mono">{String(value).replace('.',',')}{unit}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></label>;
  return <div className="v7-stack"><div className="v7-topline"><button className="back-btn" onClick={back}><Icon name="left"/> Temeller</button><strong>Yorgunluk ölçer</strong></div><section className="meter-result"><div><small>SEANS BAŞI</small><b className="mono">{Math.round(pre)}</b></div><Icon name="right"/><div><small>SEANS SONU</small><b className="mono fire">{Math.round(post)}</b></div></section><section className="card meter-controls">{slider('Haftalık zor set',sets,setSets,4,30)}{slider('Nerede bitti · RIR',rir,setRir,0,4)}{slider('Seans sayısı',sessions,setSessions,1,6)}{slider('Ağır bileşik payı',heavy,setHeavy,0,100,5,'%')}{slider('Dün gece',lastSleep,setLastSleep,3,10,.5,' sa')}{slider('3 gece ort.',avgSleep,setAvgSleep,3,10,.5,' sa')}<label className="deload-check"><input type="checkbox" checked={deload} onChange={e=>setDeload(e.target.checked)}/> Deload haftası</label></section><p className="chart-note">Üç haftalık denge tahmini. Yük ve uyku girdileri ölçüm değil; karar desteğidir.</p></div>;
}

export function Lab() {
  const [section,setSection]=useState('temeller');
  const [lesson,setLesson]=useState(0);
  const [lessonOpen,setLessonOpen]=useState(false);
  const [meterOpen,setMeterOpen]=useState(false);
  const [move,setMove]=useState('bench');
  const lessons=[StageSignal,StageRecruit,StageRate,StageFatigue]; const Lesson=lessons[lesson];
  return <div className="lab-v7"><div className="lab-switch"><button className={section==='temeller'?'on':''} onClick={()=>setSection('temeller')}>01 Temeller</button><button className={section==='hareketler'?'on':''} onClick={()=>setSection('hareketler')}>02 Hareketler</button></div>
    {section==='temeller'?(meterOpen?<FatigueMeter back={()=>setMeterOpen(false)}/>:lessonOpen?<div className="v7-stack"><div className="v7-topline"><button className="back-btn" onClick={()=>setLessonOpen(false)}><Icon name="left"/> Temeller</button><strong>{STAGES[lesson].short}</strong></div><div className="lesson-frame"><Lesson/></div><div className="lesson-pager"><button className="btn ghost sm" disabled={!lesson} onClick={()=>setLesson(x=>x-1)}><Icon name="left"/> Geri</button><span className="mono">{lesson+1}/4</span><button className="btn primary sm" disabled={lesson===3} onClick={()=>setLesson(x=>x+1)}>İleri <Icon name="right"/></button></div></div>:<div className="v7-stack"><section className="card foundation"><div className="card-h"><h3>Yorgunluk nasıl ölçülür?</h3><span className="card-hint">4 adım</span></div>{FOUNDATION.map(([n,t,d])=><div key={n} className="foundation-step"><b className="mono">{n}</b><span><strong>{t}</strong><small>{d}</small></span></div>)}<p className="chart-note">Tükeniş toparlanmayı 24–48 saat uzatabilir. Tüm sayılar tahmindir.</p></section><section className="lab-lessons"><div className="sec-h"><h3>Sinir sistemi</h3><span className="sec-k">4 ders</span></div><div className="lesson-list">{STAGES.slice(0,4).map((stage,index)=><button key={stage.id} onClick={()=>{setLesson(index);setLessonOpen(true)}}><span className="mono">0{index+1}</span><strong>{stage.short}</strong><Icon name="right"/></button>)}</div><button className="meter-note" onClick={()=>setMeterOpen(true)}><Icon name="pulse"/><span><strong>Yorgunluk ölçer</strong><small>Haftalık yük, uyku ve deload ile üç haftalık dengeyi gör.</small></span><Icon name="right"/></button></section></div>):<BiomechTab move={move} setMove={setMove}/>}</div>;
}
