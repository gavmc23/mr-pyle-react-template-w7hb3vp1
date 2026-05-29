import React, { useState, useEffect, useRef, useCallback } from "react";

const SCORE_NEEDED = 6;
const ROUND_TIME   = 300;
const TICK         = 50;
const DAYS         = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const WEEK_LEN     = DAYS.length;
const MISMATCH_MULT = 0.4;
const MAX_QUEUE    = 5;
const SPAWN_MS     = 4200;
const PROCESS_RATE = 0.8;
const FONT         = "'Space Mono','Courier New',monospace";

const ZONE = { BOARD:0, FRONT:1, AISLE:2, DESK:3 };
const ZONE_LABEL = ["by the board","moving up the front","in your aisle","AT YOUR DESK"];

const BOTS = [
  { id:"essai", name:"EssAI",  type:"Essay",       color:"#7bdff2", pts:100 },
  { id:"mathr", name:"Mathr",  type:"Problem Set",  color:"#f2b5d4", pts:150 },
  { id:"labot", name:"LaBot",  type:"Lab Report",   color:"#b5ead7", pts:125 },
];

const TITLES = {
  essai:["The Symbolism of Doors","Why Rome Fell (Again)","An Ode to Procrastination","Hamlet's Vibes","Essay on Essays"],
  mathr:["Quadratics Q1-Q12","Trig Identities Pt. 3","The Dreaded Word Problems","Calc Limits Set B","Probability HW"],
  labot:["Photosynthesis Writeup","Titration Results","Pendulum Motion Lab","Cell Division Notes","Density Lab"],
};

const lerp  = (a,b,t) => a+(b-a)*t;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

let _uid = 0;
function makeCard() {
  const bot = BOTS[Math.floor(Math.random()*BOTS.length)];
  const pool = TITLES[bot.id];
  return { uid:++_uid, botId:bot.id, color:bot.color, type:bot.type, title:pool[Math.floor(Math.random()*pool.length)], pts:bot.pts };
}

function dayClock(f) {
  const mins = Math.floor(480 + f*420);
  let h = Math.floor(mins/60), m = mins%60;
  const ap = h>=12?"PM":"AM";
  if(h>12) h-=12;
  return `${h}:${String(m).padStart(2,"0")} ${ap}`;
}
function fmtTime(s) { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

function pickLane(f)  { return Math.random()<lerp(0.38,0.72,f)?0:(Math.random()<0.5?-1:1); }
function laneX(z,l)   { if(z<=ZONE.FRONT) return 50; if(z===ZONE.AISLE) return 50+l*24; return l===0?50:50+l*30; }
function whereLabel(z,l) {
  if(z===ZONE.BOARD) return "by the board";
  if(z===ZONE.FRONT) return "moving up the front";
  const side=l<0?"left":"right";
  if(z===ZONE.AISLE) return l===0?"coming down YOUR aisle!":`heading down the ${side} aisle`;
  return l===0?"AT YOUR DESK":`at a ${side}-side desk`;
}

function gradeFrom(pts) {
  if(pts>=1600) return {letter:"S",label:"Legendary",color:"#ffd700"};
  if(pts>=1200) return {letter:"A",label:"Excellent", color:"#7bdff2"};
  if(pts>=800)  return {letter:"B",label:"Solid",     color:"#b5ead7"};
  if(pts>=500)  return {letter:"C",label:"Passing",   color:"#ffd166"};
  if(pts>=300)  return {letter:"D",label:"Barely",    color:"#f2b5d4"};
  return {letter:"F",label:"Detention",color:"#ff5b6e"};
}
function ccBonus(z,l) {
  if(z===ZONE.DESK  && l===0) return 3.0;
  if(z===ZONE.AISLE && l===0) return 2.0;
  if(z===ZONE.FRONT)          return 1.4;
  return 1.0;
}

function Teacher({ front, alert: isAlert }) {
  const skin="#e6b58f", hair="#5b4636", skirt="#3a4255";
  const coat=isAlert?"#c0392b":front?"#c98a3a":"#6d7b94";
  const coatD=isAlert?"#9e2b20":front?"#a86f24":"#566075";
  return (
    <svg width="64" height="132" viewBox="0 0 64 132">
      <rect x="24" y="104" width="6.5" height="24" rx="3" fill="#caa"/>
      <rect x="33.5" y="104" width="6.5" height="24" rx="3" fill="#caa"/>
      <ellipse cx="26" cy="129" rx="6" ry="3" fill="#2a2f3a"/>
      <ellipse cx="38" cy="129" rx="6" ry="3" fill="#2a2f3a"/>
      <path d="M18 84 L46 84 L50 106 L14 106 Z" fill={skirt}/>
      <path d="M19 52 Q32 46 45 52 L48 86 L16 86 Z" fill={coat}/>
      {front && (<>
        <line x1="32" y1="54" x2="32" y2="84" stroke={coatD} strokeWidth="1.5"/>
        <circle cx="32" cy="60" r="1.4" fill={coatD}/>
        <circle cx="32" cy="68" r="1.4" fill={coatD}/>
        <circle cx="32" cy="76" r="1.4" fill={coatD}/>
      </>)}
      <g style={{transformOrigin:"20px 54px",transform:front?"rotate(0deg)":"rotate(14deg)"}}>
        <rect x="14" y="54" width="7" height="28" rx="3.5" fill={coat}/>
        <circle cx="17.5" cy="83" r="3.5" fill={skin}/>
      </g>
      <g style={{transformOrigin:"44px 54px",transform:front?"rotate(0deg)":"rotate(-28deg)"}}>
        <rect x="43" y="54" width="7" height="28" rx="3.5" fill={coat}/>
        <circle cx="46.5" cy="83" r="3.5" fill={skin}/>
      </g>
      <rect x="28.5" y="42" width="7" height="10" fill={skin}/>
      <path d="M15 30 Q13 60 20 66 Q22 50 24 44 Q18 40 18 30 Z" fill={hair}/>
      <path d="M49 30 Q51 60 44 66 Q42 50 40 44 Q46 40 46 30 Z" fill={hair}/>
      <ellipse cx="32" cy="34" rx="15" ry="15" fill={hair}/>
      <ellipse cx="32" cy="32" rx="13" ry="14" fill={skin}/>
      {front
        ? <path d="M18 33 Q17 17 32 17 Q47 17 46 33 Q46 25 32 25 Q18 25 18 33 Z" fill={hair}/>
        : <ellipse cx="32" cy="31" rx="13.5" ry="14.5" fill={hair}/>}
      {front && (<>
        <g stroke="#2a2f3a" strokeWidth="1.3" fill="none">
          <circle cx="27" cy="31" r="4"/>
          <circle cx="37" cy="31" r="4"/>
          <line x1="31" y1="31" x2="33" y2="31"/>
        </g>
        <circle cx="27" cy="31" r="1.3" fill="#222"/>
        <circle cx="37" cy="31" r="1.3" fill="#222"/>
        <line x1="32" y1="33" x2="32" y2="37" stroke="#c99" strokeWidth="1"/>
        <path d={isAlert?"M28 41 Q32 38 36 41":"M28 40 Q32 41 36 40"} stroke="#a55" strokeWidth="1.3" fill="none"/>
      </>)}
    </svg>
  );
}

export default function Game() {
  const [phase,setPhase]   = useState("menu");
  const [mode,setMode]     = useState("week");
  const [day,setDay]       = useState(1);
  const [elapsed,setElapsed] = useState(0);
  const [unlocked,setUnlocked] = useState(false);
  const [bestSurvival,setBestSurvival] = useState(0);
  const [score,setScore]   = useState(0);
  const [points,setPoints] = useState(0);
  const [streak,setStreak] = useState(0);
  const [lastBonus,setLastBonus] = useState(null);
  const [highScore,setHighScore] = useState(0);
  const [bestStreak,setBestStreak] = useState(0);
  const [loadError,setLoadError] = useState(null);
  const [showHelp,setShowHelp] = useState(false);
  const [time,setTime]     = useState(ROUND_TIME);
  const [queue,setQueue]   = useState([]);
  const [slots,setSlots]   = useState({essai:null,mathr:null,labot:null});
  const [picked,setPicked] = useState(null);
  const [dragOver,setDragOver] = useState(null);
  const [flash,setFlash]   = useState(null);
  const [lidClosed,setLidClosed] = useState(false);
  const [scanning,setScanning]   = useState(false);
  const [teacher,setTeacher] = useState({zone:ZONE.BOARD,lane:0,moveTimer:2600,deskTimer:0});
  const [lastSeen,setLastSeen] = useState({zone:ZONE.BOARD,lane:0,stale:false});

  const ref = useRef();
  ref.current = {phase,mode,day,elapsed,score,points,streak,time,queue,slots,lidClosed,scanning,teacher};

  const fileRef = useRef(null);

  function resetRound() {
    setQueue([makeCard(),makeCard(),makeCard()]);
    setSlots({essai:null,mathr:null,labot:null});
    setPicked(null); setDragOver(null);
    setLidClosed(false); setScanning(false); setFlash(null); setLastBonus(null);
    setTeacher({zone:ZONE.BOARD,lane:0,moveTimer:2600,deskTimer:0});
    setLastSeen({zone:ZONE.BOARD,lane:0,stale:false});
    ref.current._spawnTimer = SPAWN_MS;
  }

  function start(m="week") {
    setMode(m); setDay(1); setElapsed(0);
    setScore(0); setPoints(0); setStreak(0);
    setTime(ROUND_TIME);
    resetRound();
    setPhase("playing");
  }

  function nextDay() {
    setDay(d=>d+1); setScore(0); setTime(ROUND_TIME);
    resetRound(); setPhase("playing");
  }

  const toggleScan = useCallback(()=>setScanning(s=>!s),[]);
  const toggleLid  = useCallback(()=>{
    setLidClosed(c=>{
      if(!c) setScanning(false);
      setTeacher(t=>t.facing===ZONE.WATCHING
        ?{...t,timer:(t.timer||0)+30}
        :{...t,zone:t.zone,lane:t.lane,moveTimer:t.moveTimer,deskTimer:t.deskTimer});
      return !c;
    });
  },[]);

  function assignToBot(botId,uid) {
    const s=ref.current;
    if(s.scanning||s.lidClosed) return false;
    if(!uid) return false;
    if(s.slots[botId]) { setFlash("busy"); setTimeout(()=>setFlash(null),500); return false; }
    const item=s.queue.find(a=>a.uid===uid);
    if(!item) return false;
    setQueue(q=>q.filter(a=>a.uid!==uid));
    setSlots(sl=>({...sl,[botId]:{card:item,progress:0}}));
    setPicked(null);
    return true;
  }

  function sendPicked(botId) {
    const s=ref.current;
    const uid=picked??(s.queue[0]&&s.queue[0].uid);
    if(uid) assignToBot(botId,uid);
  }

  useEffect(()=>{
    const onKey=e=>{
      if(ref.current.phase!=="playing") return;
      if(e.key==="s"||e.key==="S"){ toggleScan(); return; }
      if(e.key==="c"||e.key==="C"){ toggleLid(); return; }
      if(ref.current.scanning||ref.current.lidClosed) return;
      if(e.key==="1") sendPicked("essai");
      if(e.key==="2") sendPicked("mathr");
      if(e.key==="3") sendPicked("labot");
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[toggleScan,toggleLid,picked]);

  // ── Main loop ──
  useEffect(()=>{
    if(phase!=="playing") return;
    const iv=setInterval(()=>{
      const s=ref.current;
      let f;
      if(s.mode==="unlimited") {
        f=clamp(s.elapsed/180,0,1);
      } else {
        const dayBoost=(s.day-1)*0.08;
        f=clamp((1-s.time/ROUND_TIME)+dayBoost,0,1);
      }
      const moveInterval=lerp(2600,1000,f);
      const advChance=lerp(0.42,0.9,f);
      const popChance=lerp(0.04,0.16,f);
      const deskWin=lerp(3200,1500,f);
      const feint=lerp(0.07,0.22,f);

      // ── Bot processing ──
      if(!s.scanning&&!s.lidClosed) {
        const done=[];
        let anyActive=false;
        const nxt={essai:null,mathr:null,labot:null};
        for(const bot of BOTS) {
          const sl=s.slots[bot.id];
          if(!sl) continue;
          anyActive=true;
          const np=sl.progress+PROCESS_RATE;
          if(np>=100) done.push({botId:bot.id,card:sl.card});
          else nxt[bot.id]={...sl,progress:np};
        }
        if(anyActive) setSlots(nxt);
        if(done.length) {
          let ns=s.streak;
          let total=0, lastInfo=null;
          const cc=ccBonus(s.teacher.zone,s.teacher.lane);
          for(const{botId,card}of done){
            ns++;
            const matched=card.botId===botId;
            const earned=Math.round(card.pts*(matched?1:MISMATCH_MULT)*(1+(ns-1)*0.25)*cc);
            total+=earned;
            lastInfo={pts:earned,cc,streak:ns,matched};
          }
          setStreak(ns);
          setScore(sc=>sc+done.length);
          setPoints(prev=>{ const n=prev+total; setHighScore(h=>Math.max(h,n)); return n; });
          setLastBonus(lastInfo);
          setTimeout(()=>setLastBonus(null),2200);
          setFlash(lastInfo.matched?"match":"mismatch");
          setTimeout(()=>setFlash(null),800);
        }
      }

      // ── Spawn assignments ──
      ref.current._spawnTimer=(ref.current._spawnTimer??SPAWN_MS)-TICK;
      if(ref.current._spawnTimer<=0){
        ref.current._spawnTimer=SPAWN_MS;
        setQueue(q=>q.length>=MAX_QUEUE?q:[...q,makeCard()]);
      }

      // ── Teacher movement ──
      let{zone,lane,moveTimer,deskTimer}=s.teacher;
      moveTimer-=TICK;
      if(moveTimer<=0){
        moveTimer=moveInterval;
        const wasMy=zone===ZONE.DESK&&lane===0;
        if(s.scanning){
          if(zone>ZONE.BOARD&&zone<ZONE.DESK&&Math.random()<0.7){ zone-=1; if(zone<=ZONE.FRONT) lane=0; }
        } else if(zone<ZONE.AISLE){
          if(Math.random()<popChance){ lane=pickLane(f); zone=ZONE.DESK; }
          else if(Math.random()<advChance){ zone+=1; if(zone===ZONE.AISLE) lane=pickLane(f); }
        } else if(zone===ZONE.AISLE){
          if(lane!==0&&Math.random()<feint) lane=0;
          if(Math.random()<popChance) zone=ZONE.DESK;
          else if(Math.random()<advChance) zone+=1;
        }
        if(zone===ZONE.DESK&&!wasMy) deskTimer=deskWin;
      }

      let caught=false;
      if(zone===ZONE.DESK){
        deskTimer-=TICK;
        if(lane!==0){ if(deskTimer<=0){zone=ZONE.BOARD;lane=0;deskTimer=0;} }
        else if(s.lidClosed){ if(deskTimer<=0){zone=ZONE.BOARD;deskTimer=0;} }
        else if(deskTimer<=0) caught=true;
      }
      setTeacher({zone,lane,moveTimer,deskTimer});
      if(caught){
        setStreak(0);
        setBestStreak(b=>Math.max(b,ref.current.streak));
        if(s.mode==="unlimited") setBestSurvival(b=>Math.max(b,ref.current.elapsed));
        ref.current._totalRuns=(ref.current._totalRuns||0)+1;
        setPhase("caught"); return;
      }
      if(s.scanning) setLastSeen({zone,lane,stale:false});
      else setLastSeen(ls=>({...ls,stale:true}));
    },TICK);
    return()=>clearInterval(iv);
  },[phase]);

  // ── Clock ──
  useEffect(()=>{
    if(phase!=="playing") return;
    const iv=setInterval(()=>{
      if(ref.current.mode==="unlimited"){ setElapsed(e=>e+1); return; }
      setTime(t=>{
        if(t<=1){
          const cleared=ref.current.score>=SCORE_NEEDED;
          setBestStreak(b=>Math.max(b,ref.current.streak));
          ref.current._totalRuns=(ref.current._totalRuns||0)+1;
          if(!cleared){ setPhase("incomplete"); }
          else if(ref.current.day>=WEEK_LEN){ setUnlocked(true); setPhase("weekComplete"); }
          else { setPhase("dayComplete"); }
          return 0;
        }
        return t-1;
      });
    },1000);
    return()=>clearInterval(iv);
  },[phase]);

  // ── Save / Load ──
  function saveData(){
    const p={version:1,savedAt:new Date().toISOString(),highScore,bestStreak,bestSurvival,unlimitedUnlocked:unlocked,totalRuns:ref.current._totalRuns||0};
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:"application/json"}));
    a.download="hall_monitor_save.json"; a.click();
  }
  function loadFile(e){
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(typeof d.version!=="number") throw new Error("Not a Hall Monitor save.");
        if(typeof d.highScore==="number") setHighScore(h=>Math.max(h,d.highScore));
        if(typeof d.bestStreak==="number") setBestStreak(b=>Math.max(b,d.bestStreak));
        if(typeof d.bestSurvival==="number") setBestSurvival(b=>Math.max(b,d.bestSurvival));
        if(d.unlimitedUnlocked) setUnlocked(true);
        setLoadError({ok:true,msg:`Loaded! Best: ${d.highScore?.toLocaleString()??"-"}`});
      }catch(err){ setLoadError({ok:false,msg:`Bad file: ${err.message}`}); }
      e.target.value="";
      setTimeout(()=>setLoadError(null),4000);
    };
    reader.readAsText(file);
  }

  // ── Derived ──
  const frac       = clamp(1-time/ROUND_TIME,0,1);
  const atMyDesk   = teacher.zone===ZONE.DESK&&teacher.lane===0;
  const atOtherDesk= teacher.zone===ZONE.DESK&&teacher.lane!==0;
  const inMyLane   = teacher.zone>=ZONE.AISLE&&teacher.lane===0;
  const threat     = atMyDesk||inMyLane;
  const tLeft      = laneX(teacher.zone,teacher.lane);
  const tScale     = atOtherDesk?1.5:{[ZONE.BOARD]:.7,[ZONE.FRONT]:1,[ZONE.AISLE]:1.45,[ZONE.DESK]:2.5}[teacher.zone];
  const tTop       = atOtherDesk?"40%":{[ZONE.BOARD]:"37%",[ZONE.FRONT]:"43%",[ZONE.AISLE]:"49%",[ZONE.DESK]:"26%"}[teacher.zone];
  const tVis       = scanning||atMyDesk;

  const wrap={width:"100%",maxWidth:760,margin:"0 auto",fontFamily:FONT,
    background:"#0d0f14",color:"#e6e9ef",borderRadius:14,overflow:"hidden",
    border:"1px solid #232838",boxShadow:"0 24px 60px rgba(0,0,0,.5)",userSelect:"none"};

  // ── Day-complete interstitial ──
  if(phase==="dayComplete") return (
    <div style={wrap}>
      <div style={{padding:"60px 36px",textAlign:"center",background:"radial-gradient(circle at 50% 20%,#16331f,#0d0f14)"}}>
        <div style={{fontSize:13,letterSpacing:6,opacity:.6}}>DAY {day} OF {WEEK_LEN} CLEARED</div>
        <h1 style={{fontSize:38,margin:"10px 0 6px"}}>Bell rings! {DAYS[day-1]} done.</h1>
        <p style={{maxWidth:440,margin:"0 auto 8px",lineHeight:1.6,opacity:.85,fontSize:14}}>
          {score} fakes submitted. Points so far: <b style={{color:"#ffd166"}}>{points.toLocaleString()}</b>
        </p>
        <div style={{display:"flex",gap:8,justifyContent:"center",margin:"18px 0 26px"}}>
          {DAYS.map((d,i)=>(
            <div key={d} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:i<day?1:.4}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:i<day?"#5bd6a0":i===day?"#ffd166":"#2a3142"}}/>
              <span style={{fontSize:9}}>{d.slice(0,3)}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:13,opacity:.7,marginBottom:22}}>
          Next: <b>{DAYS[day]}</b> — she will be quicker.
        </p>
        <button onClick={nextDay} style={{fontFamily:FONT,fontSize:15,letterSpacing:2,cursor:"pointer",
          background:"#e6e9ef",color:"#0d0f14",border:"none",padding:"14px 36px",borderRadius:8,fontWeight:700}}>
          Start {DAYS[day]}
        </button>
      </div>
    </div>
  );

  // ── Week-complete ──
  if(phase==="weekComplete") {
    const g=gradeFrom(points);
    return (
      <div style={wrap}>
        <div style={{padding:"50px 36px",textAlign:"center",background:"radial-gradient(circle at 50% 20%,#2a2410,#0d0f14)"}}>
          <div style={{fontSize:13,letterSpacing:6,opacity:.6}}>FRIDAY 3:00 PM</div>
          <h1 style={{fontSize:40,margin:"10px 0 4px",color:"#ffd700"}}>Week Survived!</h1>
          <div style={{margin:"0 auto 20px",maxWidth:320,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:"18px 24px"}}>
            <div style={{fontSize:60,fontWeight:700,lineHeight:1,color:g.color}}>{g.letter}</div>
            <div style={{fontSize:13,opacity:.7,marginBottom:14}}>{g.label}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 20px",fontSize:12,textAlign:"left"}}>
              <div><div style={{opacity:.5,fontSize:10}}>WEEK SCORE</div><div style={{fontSize:20,fontWeight:700,color:"#ffd166"}}>{points.toLocaleString()}</div></div>
              <div><div style={{opacity:.5,fontSize:10}}>HIGH SCORE</div><div style={{fontSize:20,fontWeight:700,color:"#7bdff2"}}>{highScore.toLocaleString()}</div></div>
            </div>
          </div>
          <div style={{margin:"0 auto 24px",maxWidth:400,padding:"16px 20px",borderRadius:12,background:"rgba(255,215,0,.1)",border:"1px solid rgba(255,215,0,.4)"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#ffd700",marginBottom:4}}>Unlimited Mode Unlocked</div>
            <div style={{fontSize:12,opacity:.8,lineHeight:1.5}}>No bell, no quota. Survive as long as you can.</div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>start("unlimited")} style={{fontFamily:FONT,fontSize:14,cursor:"pointer",background:"#ffd700",color:"#0d0f14",border:"none",padding:"13px 28px",borderRadius:8,fontWeight:700}}>Play Unlimited</button>
            <button onClick={()=>start("week")} style={{fontFamily:FONT,fontSize:14,cursor:"pointer",background:"transparent",color:"#e6e9ef",border:"1px solid #4a5468",padding:"13px 28px",borderRadius:8,fontWeight:700}}>New Week</button>
            <button onClick={saveData} style={{fontFamily:FONT,fontSize:14,cursor:"pointer",background:"transparent",color:"#7bdff2",border:"1px solid #7bdff2",padding:"13px 22px",borderRadius:8,fontWeight:700}}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Menu / end screens ──
  if(phase!=="playing") {
    const isMenu=phase==="menu";
    const wasUnlim=mode==="unlimited";
    const g=gradeFrom(points);
    const bg=isMenu?"radial-gradient(circle at 50% 20%,#1a2336,#0d0f14)":"radial-gradient(circle at 50% 20%,#3a1620,#0d0f14)";
    return (
      <div style={wrap}>
        <div style={{padding:"48px 36px",textAlign:"center",background:bg}}>
          {!isMenu && (
            <div style={{fontSize:13,letterSpacing:6,opacity:.6}}>
              {wasUnlim?"UNLIMITED MODE":`${DAYS[day-1]?.toUpperCase()} - DAY ${day}/${WEEK_LEN}`}
            </div>
          )}
          <h1 style={{fontSize:38,margin:"10px 0 4px",letterSpacing:-1}}>
            {isMenu?"Papa's Cheat-oria":phase==="caught"?"BUSTED":"INCOMPLETE"}
          </h1>

          {phase==="caught"&&(
            <div style={{margin:"10px auto",width:130,height:150,overflow:"hidden"}}>
              <div style={{transform:"scale(2)",transformOrigin:"top center",marginTop:10}}>
                <Teacher front alert/>
              </div>
            </div>
          )}

          {!isMenu&&(
            <div style={{margin:"18px auto 22px",maxWidth:340,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:"18px 24px"}}>
              <div style={{fontSize:64,fontWeight:700,lineHeight:1,color:g.color}}>{g.letter}</div>
              <div style={{fontSize:13,opacity:.7,marginBottom:16}}>{g.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 20px",fontSize:12,textAlign:"left"}}>
                <div><div style={{opacity:.5,fontSize:10}}>POINTS</div><div style={{fontSize:20,fontWeight:700,color:"#ffd166"}}>{points.toLocaleString()}</div></div>
                <div><div style={{opacity:.5,fontSize:10}}>HIGH SCORE</div><div style={{fontSize:20,fontWeight:700,color:"#7bdff2"}}>{highScore.toLocaleString()}</div></div>
                {wasUnlim && (
                  <div><div style={{opacity:.5,fontSize:10}}>SURVIVED</div><div style={{fontSize:16,fontWeight:700,color:"#ff8a96"}}>{fmtTime(elapsed)}</div></div>
                )}
                {wasUnlim && (
                  <div><div style={{opacity:.5,fontSize:10}}>BEST SURVIVAL</div><div style={{fontSize:16,fontWeight:700}}>{fmtTime(Math.max(elapsed,bestSurvival))}</div></div>
                )}
                {!wasUnlim && (
                  <div><div style={{opacity:.5,fontSize:10}}>FAKES TODAY</div><div style={{fontSize:16,fontWeight:700}}>{score}/{SCORE_NEEDED}</div></div>
                )}
                {!wasUnlim && (
                  <div><div style={{opacity:.5,fontSize:10}}>BEST STREAK</div><div style={{fontSize:16,fontWeight:700}}>{Math.max(streak,bestStreak)>0?`x${Math.max(streak,bestStreak)}`:"-"}</div></div>
                )}
              </div>
            </div>
          )}

          <p style={{maxWidth:500,margin:"0 auto 22px",lineHeight:1.6,opacity:.85,fontSize:14}}>
            {!isMenu&&(wasUnlim
              ?`Caught after ${fmtTime(elapsed)}. ${points.toLocaleString()} points.`
              :phase==="caught"
              ?`Caught on ${DAYS[day-1]}. ${points.toLocaleString()} pts this week.`
              :`Bell rang — only ${score}/${SCORE_NEEDED} done on ${DAYS[day-1]}.`)}
          </p>

          {isMenu&&highScore>0&&(
            <div style={{margin:"-10px auto 16px",padding:"8px 18px",borderRadius:7,display:"inline-block",
              background:"rgba(123,223,242,.12)",border:"1px solid rgba(123,223,242,.3)",fontSize:12}}>
              Save loaded - Best: <b style={{color:"#7bdff2"}}>{highScore.toLocaleString()}</b> pts
              {bestStreak>0&&<span style={{marginLeft:10,opacity:.7}}>- Streak x{bestStreak}</span>}
            </div>
          )}

          {isMenu&&(
            <div style={{marginBottom:22}}>
              <button onClick={()=>setShowHelp(h=>!h)} style={{fontFamily:FONT,fontSize:12,cursor:"pointer",
                letterSpacing:1,background:showHelp?"rgba(255,255,255,.1)":"transparent",color:"#aab4c8",
                border:"1px solid #3a4255",padding:"8px 18px",borderRadius:7,fontWeight:700}}>
                {showHelp?"Hide Guide":"How to Use This App"}
              </button>
              {showHelp&&(
                <div style={{marginTop:14,maxWidth:440,margin:"14px auto 0",background:"rgba(255,255,255,.04)",
                  border:"1px solid #2a3142",borderRadius:10,padding:"18px 22px",textAlign:"left"}}>
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#7bdff2",marginBottom:6,letterSpacing:1}}>STEP 1 - Submit Fake Assignments</div>
                    <p style={{fontSize:12,lineHeight:1.75,opacity:.88,margin:0}}>
                      Drag assignment cards from the Class Portal on the left into one of the three AI bots on the right.
                      Match the card colour to the bot for full points — mismatches still work but pay less.
                    </p>
                  </div>
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#ffd166",marginBottom:6,letterSpacing:1}}>STEP 2 - Watch the Teacher</div>
                    <p style={{fontSize:12,lineHeight:1.75,opacity:.88,margin:0}}>
                      Ms. Vector patrols the classroom and will sometimes walk toward your desk.
                      Click the Look Up button to see where she is heading.
                    </p>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#ff8a96",marginBottom:6,letterSpacing:1}}>STEP 3 - Do Not Get Caught</div>
                    <p style={{fontSize:12,lineHeight:1.75,opacity:.88,margin:0}}>
                      If she reaches your desk with the laptop open, it is game over.
                      Click Close Lid before she catches you.
                    </p>
                  </div>
                  <div style={{marginTop:14,padding:"10px 12px",background:"rgba(255,255,255,.04)",borderRadius:7,fontSize:11,opacity:.65,lineHeight:1.7}}>
                    <b>Keyboard shortcuts:</b> S = look up/down, C = close/open lid, 1/2/3 = send selected card to bot
                  </div>
                </div>
              )}
            </div>
          )}

          {isMenu && (
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>start("week")} style={{fontFamily:FONT,fontSize:15,letterSpacing:2,cursor:"pointer",background:"#e6e9ef",color:"#0d0f14",border:"none",padding:"14px 30px",borderRadius:8,fontWeight:700}}>Start the Week</button>
              {unlocked && <button onClick={()=>start("unlimited")} style={{fontFamily:FONT,fontSize:15,letterSpacing:1,cursor:"pointer",background:"#ffd700",color:"#0d0f14",border:"none",padding:"14px 26px",borderRadius:8,fontWeight:700}}>Unlimited</button>}
            </div>
          )}
          {!isMenu && (
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>start(mode)} style={{fontFamily:FONT,fontSize:15,letterSpacing:2,cursor:"pointer",background:"#e6e9ef",color:"#0d0f14",border:"none",padding:"14px 30px",borderRadius:8,fontWeight:700}}>{wasUnlim?"Go Again":"New Week"}</button>
              <button onClick={()=>setPhase("menu")} style={{fontFamily:FONT,fontSize:15,letterSpacing:1,cursor:"pointer",background:"transparent",color:"#aab4c8",border:"1px solid #3a4255",padding:"14px 22px",borderRadius:8,fontWeight:700}}>Menu</button>
            </div>
          )}
          {isMenu&&unlocked&&<div style={{marginTop:12,fontSize:11,opacity:.6}}>Unlimited best: <b style={{color:"#ffd700"}}>{fmtTime(bestSurvival)}</b></div>}

          <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {!isMenu&&<button onClick={saveData} style={{fontFamily:FONT,fontSize:12,cursor:"pointer",letterSpacing:1,background:"transparent",color:"#7bdff2",border:"1px solid #7bdff2",padding:"9px 20px",borderRadius:7,fontWeight:700}}>Save Score</button>}
            <button onClick={()=>fileRef.current?.click()} style={{fontFamily:FONT,fontSize:12,cursor:"pointer",letterSpacing:1,background:"transparent",color:"#b5ead7",border:"1px solid #b5ead7",padding:"9px 20px",borderRadius:7,fontWeight:700}}>Load Save</button>
            <input ref={fileRef} type="file" accept=".json" onChange={loadFile} style={{display:"none"}}/>
          </div>
          {loadError&&(
            <div style={{marginTop:12,fontSize:12,padding:"8px 16px",borderRadius:6,display:"inline-block",
              background:loadError.ok?"rgba(91,214,160,.15)":"rgba(255,91,110,.15)",
              border:`1px solid ${loadError.ok?"#5bd6a0":"#ff5b6e"}`,
              color:loadError.ok?"#5bd6a0":"#ff8a96"}}>
              {loadError.msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Playing ──
  return (
    <div style={wrap}>
      <style>{`
        @keyframes adPulse{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes adWalk{0%,100%{transform:translateX(-50%) translateY(0) rotate(-1deg)}50%{transform:translateX(-50%) translateY(-2px) rotate(1deg)}}
        @keyframes adArm{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}
      `}</style>

      {/* HUD */}
      <div style={{background:"#11141d",borderBottom:"1px solid #232838"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"10px 16px",fontSize:12}}>
          {mode==="unlimited" && (
            <>
              <span style={{color:"#ffd700",fontWeight:700}}>UNLIMITED</span>
              <span>{score} fakes</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,opacity:.6,marginBottom:3}}>SURVIVED</div>
                <div style={{fontSize:16,fontWeight:700,color:"#ff8a96",lineHeight:1}}>{fmtTime(elapsed)}</div>
              </div>
            </>
          )}
          {mode!=="unlimited" && (
            <>
              <span title={DAYS[day-1]}>Day {day}/{WEEK_LEN} - {DAYS[day-1]?.slice(0,3)}</span>
              <span>{dayClock(frac)}</span>
              <span>{score}/{SCORE_NEEDED} fakes</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,opacity:.6,marginBottom:3}}>SCHOOL DAY</div>
                <div style={{height:7,background:"#222838",borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${frac*100}%`,height:"100%",background:"#5b8fd6",transition:"width 1s linear"}}/>
                </div>
              </div>
            </>
          )}
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {ZONE_LABEL.map((_,i)=>(
              <div key={i} style={{width:9,height:9,borderRadius:"50%",
                background:lastSeen.zone===i?(i>=ZONE.AISLE&&lastSeen.lane===0?"#ff5b6e":"#ffd166"):"#2a3142",
                opacity:lastSeen.stale?.4:1,transition:"opacity .2s"}}/>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,padding:"6px 16px 8px",borderTop:"1px solid #1c2030",fontSize:11}}>
          <div style={{display:"flex",flexDirection:"column"}}>
            <span style={{fontSize:9,letterSpacing:2,opacity:.5}}>POINTS</span>
            <span style={{fontSize:18,fontWeight:700,color:"#ffd166",lineHeight:1}}>{points.toLocaleString()}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column"}}>
            <span style={{fontSize:9,letterSpacing:2,opacity:.5}}>STREAK</span>
            <span style={{fontSize:18,fontWeight:700,lineHeight:1,color:streak>=4?"#ff5b6e":streak>=2?"#f2b5d4":"#e6e9ef"}}>{streak>0?`x${streak}`:"-"}</span>
          </div>
          <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,opacity:lastBonus?1:0,
            color:lastBonus?.cc>=3?"#ff5b6e":lastBonus?.cc>=2?"#ffd166":"#b5ead7"}}>
            {lastBonus&&<>
              +{lastBonus.pts.toLocaleString()} pts
              {lastBonus.cc>=2&&<span style={{marginLeft:6,fontSize:10,opacity:.8}}>{lastBonus.cc>=3?"DESK BONUS":"CLOSE CALL"}</span>}
              {lastBonus.streak>=3&&<span style={{marginLeft:6,fontSize:10,opacity:.8}}>x{lastBonus.streak} streak</span>}
            </>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <span style={{fontSize:9,letterSpacing:2,opacity:.5}}>BEST</span>
            <span style={{fontSize:13,opacity:.7}}>{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Classroom */}
      <div style={{position:"relative",height:250,overflow:"hidden",background:"linear-gradient(#cdd9e6,#bcc9da 38%,#aebbcf 52%)"}}>
        {/* back wall */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(#d7e1ec,#c4d0e0)"}}/>
        {/* floor */}
        <div style={{position:"absolute",left:0,right:0,bottom:0,height:"44%",background:"linear-gradient(#9aa6b8,#7f8ca0)"}}>
          <svg width="100%" height="100%" style={{position:"absolute",inset:0,opacity:.35}}>
            <line x1="50%" y1="0" x2="-20%" y2="100%" stroke="#5c6878" strokeWidth="1.5"/>
            <line x1="50%" y1="0" x2="120%" y2="100%" stroke="#5c6878" strokeWidth="1.5"/>
            <line x1="50%" y1="0" x2="35%" y2="100%" stroke="#5c6878" strokeWidth="1"/>
            <line x1="50%" y1="0" x2="65%" y2="100%" stroke="#5c6878" strokeWidth="1"/>
            <line x1="0" y1="32%" x2="100%" y2="32%" stroke="#5c6878" strokeWidth="1"/>
            <line x1="0" y1="62%" x2="100%" y2="62%" stroke="#5c6878" strokeWidth="1.5"/>
          </svg>
        </div>
        {/* window */}
        <div style={{position:"absolute",left:"3%",top:30,width:78,height:60,background:"linear-gradient(135deg,#aee0ff,#7cc4f5)",border:"5px solid #e8edf3",borderRadius:3}}>
          <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:4,background:"#e8edf3"}}/>
          <div style={{position:"absolute",top:"50%",left:0,right:0,height:4,background:"#e8edf3"}}/>
        </div>
        {/* clock */}
        <div style={{position:"absolute",right:"5%",top:18,width:34,height:34,borderRadius:"50%",background:"#fff",border:"3px solid #4a5260",boxShadow:"0 2px 4px rgba(0,0,0,.25)"}}>
          <div style={{position:"absolute",left:"50%",top:"50%",width:2,height:9,background:"#333",transformOrigin:"bottom",
            transform:`translate(-50%,-100%) rotate(${((mode==="unlimited"?elapsed:time)%60)*6}deg)`}}/>
          <div style={{position:"absolute",left:"50%",top:"50%",width:2,height:6,background:"#333",transformOrigin:"bottom",
            transform:`translate(-50%,-100%) rotate(${((mode==="unlimited"?elapsed:time)/5)*6}deg)`}}/>
          <div style={{position:"absolute",left:"50%",top:"50%",width:4,height:4,background:"#333",borderRadius:"50%",transform:"translate(-50%,-50%)"}}/>
        </div>
        {/* flag */}
        <div style={{position:"absolute",right:"16%",top:16,width:40,height:26,
          background:"repeating-linear-gradient(#c0392b 0,#c0392b 3px,#fff 3px,#fff 6px)",border:"1px solid #99a",boxShadow:"0 2px 3px rgba(0,0,0,.2)"}}>
          <div style={{width:16,height:13,background:"#2c3e6b"}}/>
        </div>
        {/* whiteboard */}
        <div style={{position:"absolute",left:"22%",top:22,width:"44%",height:70,background:"#f6f9fc",borderRadius:3,border:"4px solid #d2d9e2",boxShadow:"0 6px 14px rgba(0,0,0,.18)",color:"#3a5",fontSize:11,padding:"8px 10px",boxSizing:"border-box",fontFamily:FONT}}>
          <div style={{color:"#c0392b",fontWeight:700}}>NO AI TOOLS</div>
          <div style={{color:"#2c6",marginTop:2}}>Eyes on your own work</div>
          <div style={{color:"#456",marginTop:2,fontStyle:"italic"}}>- Ms. Vector</div>
          <div style={{position:"absolute",left:-4,right:-4,bottom:-10,height:6,background:"#c2cad6",borderRadius:2}}/>
          <div style={{position:"absolute",left:14,bottom:-9,width:16,height:4,background:"#c0392b",borderRadius:2}}/>
          <div style={{position:"absolute",left:36,bottom:-9,width:16,height:4,background:"#2c6",borderRadius:2}}/>
        </div>
        {/* student desks */}
        {[{y:"50%",scale:.55,gap:120,n:3,op:.5},{y:"66%",scale:.8,gap:165,n:3,op:.7},{y:"86%",scale:1.05,gap:235,n:2,op:.9}].map((row,ri)=>(
          <div key={ri} style={{position:"absolute",left:0,right:0,top:row.y}}>
            {Array.from({length:row.n}).map((_,ci)=>{
              const center=(row.n-1)/2;
              return (
                <div key={ci} style={{position:"absolute",left:"50%",
                  transform:`translateX(calc(-50% + ${(ci-center)*row.gap}px)) scale(${row.scale})`,opacity:row.op}}>
                  <div style={{width:64,height:16,background:"#b08968",borderRadius:2,boxShadow:"0 3px 0 #8a6a4f"}}/>
                  <div style={{position:"absolute",left:4,top:16,width:4,height:20,background:"#5c6878"}}/>
                  <div style={{position:"absolute",right:4,top:16,width:4,height:20,background:"#5c6878"}}/>
                  <div style={{position:"absolute",left:"50%",top:22,transform:"translateX(-50%)",width:26,height:14,background:"#3f5fa0",borderRadius:3}}/>
                </div>
              );
            })}
          </div>
        ))}
        {/* teacher */}
        <div style={{position:"absolute",top:tTop,left:`${tLeft}%`,transform:`translateX(-50%) scale(${tScale})`,
          transformOrigin:"top center",transition:"top .25s, left .3s ease, transform .25s, opacity .2s",zIndex:6,
          opacity:tVis?1:0,filter:threat?"drop-shadow(0 0 14px rgba(192,57,43,.7))":"drop-shadow(0 4px 4px rgba(0,0,0,.3))"}}>
          <Teacher front={teacher.zone!==ZONE.BOARD} alert={threat}/>
        </div>
        {/* dark overlay when heads down */}
        {!scanning&&(
          <div style={{position:"absolute",inset:0,zIndex:7,pointerEvents:"none",
            background:"linear-gradient(rgba(8,10,16,.78),rgba(8,10,16,.9))"}}/>
        )}
        {/* Look Up button */}
        <div style={{position:"absolute",top:8,right:10,zIndex:10}}>
          <button onClick={toggleScan} style={{fontFamily:FONT,fontSize:11,cursor:"pointer",fontWeight:700,
            padding:"7px 14px",borderRadius:7,border:"1px solid #3a4660",letterSpacing:1,
            background:scanning?"#23406b":"rgba(20,25,40,.85)",color:scanning?"#cfe3ff":"#7fa6df",
            boxShadow:scanning?"0 0 10px rgba(100,160,255,.4)":"none"}}>
            {scanning?"Look Down":"Look Up"}
          </button>
        </div>
        {/* status banner */}
        <div style={{position:"absolute",top:6,left:0,right:0,textAlign:"center",zIndex:8,
          fontSize:12,letterSpacing:2,fontWeight:700,fontFamily:FONT,
          textShadow:scanning?"0 1px 2px rgba(255,255,255,.6)":"0 1px 3px #000",
          color:atMyDesk?"#ff5b6e":scanning?(threat?"#c0392b":"#2c6e49"):"#8a93a6"}}>
          {atMyDesk?"SHE IS AT YOUR DESK — CLOSE THE LID"
            :scanning?`She is ${whereLabel(teacher.zone,teacher.lane)}`
            :"(looking down — click Look Up to scan)"}
        </div>
        {(atMyDesk||(threat&&!scanning))&&(
          <div style={{position:"absolute",inset:0,zIndex:9,pointerEvents:"none",
            background:"radial-gradient(circle at 50% 55%, transparent 30%, rgba(192,57,43,.4))",
            animation:"adPulse 0.7s ease-in-out infinite"}}/>
        )}
      </div>

      {/* Desk + Laptop */}
      <div style={{position:"relative",padding:"20px 18px 26px",
        background:"linear-gradient(#6b4a2f,#5a3d27)",boxShadow:"inset 0 8px 18px rgba(0,0,0,.4)"}}>
        {/* desk props */}
        <div style={{position:"absolute",left:18,top:14,fontSize:22,filter:"drop-shadow(0 2px 3px rgba(0,0,0,.4))"}}>☕</div>
        <div style={{position:"absolute",left:52,top:20,fontSize:18,transform:"rotate(28deg)",filter:"drop-shadow(0 2px 2px rgba(0,0,0,.3))"}}>✏️</div>
        <div style={{position:"absolute",right:20,top:12,width:46,height:40,background:"#ffe27a",transform:"rotate(-5deg)",
          boxShadow:"0 3px 6px rgba(0,0,0,.3)",fontSize:9,padding:5,boxSizing:"border-box",fontFamily:FONT,lineHeight:1.2,color:"#8a6d1f"}}>
          don't get<br/>caught!!
        </div>

        <div style={{position:"relative",margin:"8px auto 0",maxWidth:560,opacity:scanning?.4:1,transition:"opacity .2s"}}>
          {/* LID */}
          <div style={{position:"relative",background:"#26282f",borderRadius:"12px 12px 4px 4px",
            padding:"10px 10px 8px",boxShadow:"0 10px 24px rgba(0,0,0,.5)",border:"1px solid #3a3d47",
            transformOrigin:"bottom center",transition:"transform .35s cubic-bezier(.6,0,.3,1)",
            transform:lidClosed?"perspective(900px) rotateX(-78deg)":"perspective(900px) rotateX(0deg)"}}>
            {/* bezel */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6,position:"relative",height:18}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#0a0c10",boxShadow:"inset 0 0 0 1px #2dd4bf"}}/>
              <div style={{position:"absolute",right:0}}>
                <button onClick={toggleLid} style={{fontFamily:FONT,fontSize:10,cursor:"pointer",fontWeight:700,
                  padding:"4px 10px",borderRadius:5,border:"1px solid #6a6f7c",letterSpacing:1,
                  background:lidClosed?"#2d3a2f":"#3a2d34",color:lidClosed?"#9fe6b0":"#d98a96"}}>
                  {lidClosed?"Open Lid":"Close Lid"}
                </button>
              </div>
            </div>
            {/* screen */}
            <div style={{background:"#0c0e14",borderRadius:4,minHeight:244,border:"1px solid #33405c",overflow:"hidden",position:"relative"}}>
              {/* title bar */}
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
                background:"#11141d",borderBottom:"1px solid #232838",fontSize:10.5,color:"#7a8499"}}>
                <span style={{width:9,height:9,borderRadius:"50%",background:"#ff5f56"}}/>
                <span style={{width:9,height:9,borderRadius:"50%",background:"#ffbd2e"}}/>
                <span style={{width:9,height:9,borderRadius:"50%",background:"#27c93f"}}/>
                <span style={{marginLeft:8,opacity:.8}}>drag cards to matching bot for full points</span>
              </div>
              {/* two panes */}
              <div style={{display:"flex",minHeight:210}}>
                {/* Portal */}
                <div style={{width:"44%",borderRight:"1px solid #232838",display:"flex",flexDirection:"column"}}>
                  <div style={{padding:"8px 10px 6px",fontSize:11,letterSpacing:1,color:"#9fb4d8",
                    background:"#101826",borderBottom:"1px solid #1c2740",fontWeight:700}}>
                    CLASS PORTAL <span style={{opacity:.5,fontWeight:400}}>- {queue.length} due</span>
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:8,display:"flex",flexDirection:"column",gap:7,maxHeight:178}}>
                    {queue.length===0&&(
                      <div style={{opacity:.4,fontSize:11,textAlign:"center",marginTop:24}}>inbox empty<br/>new work incoming...</div>
                    )}
                    {queue.map(a=>{
                      const bot=BOTS.find(b=>b.id===a.botId);
                      const iP=picked===a.uid;
                      return (
                        <div key={a.uid} draggable
                          onDragStart={e=>{setPicked(a.uid);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(a.uid));}}
                          onDragEnd={()=>setDragOver(null)}
                          onClick={()=>setPicked(p=>p===a.uid?null:a.uid)}
                          style={{cursor:"grab",background:iP?"#1c2740":"#141925",
                            border:`1px solid ${iP?a.color:"#26314a"}`,
                            borderLeft:`4px solid ${a.color}`,borderRadius:6,padding:"7px 9px",
                            boxShadow:iP?`0 0 0 1px ${a.color}`:"none"}}>
                          <div style={{fontSize:11.5,fontWeight:700,color:"#e6e9ef",lineHeight:1.25}}>
                            {a.title}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}>
                            <span style={{width:8,height:8,borderRadius:"50%",background:a.color}}/>
                            <span style={{fontSize:9.5,opacity:.7}}>{a.type} - wants <b style={{color:a.color}}>{bot.name}</b></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Bots */}
                <div style={{width:"56%",display:"flex",flexDirection:"column",gap:6,padding:8}}>
                  {BOTS.map((bot,i)=>{
                    const slot=slots[bot.id];
                    const over=dragOver===bot.id;
                    const willMatch=picked!=null&&(queue.find(a=>a.uid===picked)?.botId===bot.id);
                    return (
                      <div key={bot.id}
                        onDragOver={e=>{e.preventDefault();setDragOver(bot.id);}}
                        onDragLeave={()=>setDragOver(d=>d===bot.id?null:d)}
                        onDrop={e=>{e.preventDefault();const uid=Number(e.dataTransfer.getData("text/plain"))||picked;assignToBot(bot.id,uid);setDragOver(null);}}
                        onClick={()=>picked!=null&&sendPicked(bot.id)}
                        style={{flex:1,borderRadius:7,padding:"8px 10px",position:"relative",
                          background:over?`${bot.color}22`:"#101521",
                          border:`2px ${slot?"solid":"dashed"} ${over||willMatch?bot.color:slot?"#2a3650":"#283149"}`,
                          transition:"background .1s, border-color .1s",
                          cursor:picked!=null?"pointer":"default",
                          display:"flex",flexDirection:"column",justifyContent:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{width:10,height:10,borderRadius:"50%",background:bot.color}}/>
                          <span style={{fontSize:12,fontWeight:700,color:bot.color}}>{i+1} - {bot.name}</span>
                          <span style={{fontSize:9,opacity:.5}}>{bot.type}</span>
                        </div>
                        {slot && (
                          <div style={{marginTop:6}}>
                            <div style={{fontSize:10,opacity:.8,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {slot.card.botId===bot.id?"✓":"!"} {slot.card.title}
                            </div>
                            <div style={{height:8,background:"#222838",borderRadius:5,overflow:"hidden"}}>
                              <div style={{width:`${slot.progress}%`,height:"100%",background:bot.color,transition:"width .05s"}}/>
                            </div>
                          </div>
                        )}
                        {!slot && (
                          <div style={{marginTop:5,fontSize:10,opacity:over?.9:.4,color:over?bot.color:"#8a93a6"}}>
                            {over?"drop to process":"drag work here"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* flashes */}
              {(flash==="match"||flash==="mismatch")&&(
                <div style={{position:"absolute",inset:0,pointerEvents:"none",
                  background:flash==="match"?"rgba(91,214,160,.14)":"rgba(255,209,102,.12)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:700,color:flash==="match"?"#5bd6a0":"#ffd166"}}>
                  {flash==="match"?"PERFECT MATCH":"WRONG BOT - reduced points"}
                </div>
              )}
              {flash==="busy"&&(
                <div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center",
                  pointerEvents:"none",fontSize:11,color:"#ff8a96"}}>
                  that bot is busy!
                </div>
              )}
            </div>
          </div>
          {/* keyboard deck */}
          <div style={{position:"relative",marginTop:-2,background:"linear-gradient(#c9ccd4,#a9adb8)",
            height:46,borderRadius:"5px 5px 11px 11px",boxShadow:"0 8px 16px rgba(0,0,0,.45)",
            border:"1px solid #8a8f9c",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 14px"}}>
            <div style={{position:"absolute",top:-3,left:"12%",right:"12%",height:5,background:"#3a3d47",borderRadius:3}}/>
            <div style={{width:70,height:6,background:"#9094a0",borderRadius:3}}/>
          </div>
          {lidClosed&&(
            <div style={{position:"absolute",top:0,left:0,right:0,display:"flex",alignItems:"center",
              justifyContent:"center",height:30,pointerEvents:"none"}}>
              <div style={{background:"rgba(0,0,0,.7)",color:"#9fe6b0",fontFamily:FONT,fontSize:12,
                fontWeight:700,padding:"6px 14px",borderRadius:6,letterSpacing:1}}>
                Lid closed - you look innocent
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}