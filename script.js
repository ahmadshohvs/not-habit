/* ═══════════════════════════════════════
   script.js — Habitly v2.0
═══════════════════════════════════════ */

let habits      = JSON.parse(localStorage.getItem('habits'))      || ["Erta turish","Sport","Kitob o'qish","Suv ichish"];
let plannerData = JSON.parse(localStorage.getItem('plannerData')) || {};
let timeRows    = JSON.parse(localStorage.getItem('timeRows'))    || ["07:00","09:00","11:00","13:00","15:00","17:00","19:00","21:00"];
let goals       = JSON.parse(localStorage.getItem('goals'))       || [];
let checks      = JSON.parse(localStorage.getItem('checks'))      || {};

const colorMap = { blue:'#3b82f6', green:'#22c55e', orange:'#f97316', red:'#ef4444', purple:'#8b5cf6' };

const NOW   = new Date();
const TODAY = NOW.getDate();
const MONTH = NOW.getMonth();
const YEAR  = NOW.getFullYear();
const DAYS  = new Date(YEAR, MONTH+1, 0).getDate();
const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

let treeRenderer = null;
let _barCh, _doughCh, _lineCh, _habitBarCh;
let _editMode = null, _editId = null, _editColor = 'blue';
let _activeCat = 'all', _expanded = {};

const CAT_LABELS = { all:'Hammasi', soglik:"Sog'liq", ish:"Ish/O'qish", shaxsiy:'Shaxsiy', moliya:'Moliya', boshqa:'Boshqa' };

/* ─── YORDAMCHI ─── */
function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
function save() {
  localStorage.setItem('habits',      JSON.stringify(habits));
  localStorage.setItem('plannerData', JSON.stringify(plannerData));
  localStorage.setItem('timeRows',    JSON.stringify(timeRows));
  localStorage.setItem('goals',       JSON.stringify(goals));
  localStorage.setItem('checks',      JSON.stringify(checks));
}
function simpleRand(seed) {
  let s = seed;
  return () => { s=(s*1664525+1013904223)&0x7fffffff; return s/0x7fffffff; };
}

/* ─── INIT ─── */
window.onload = () => {
  setText('currentDate', `${TODAY}-${MONTHS_UZ[MONTH].toLowerCase()}, ${YEAR}`);

  if (localStorage.getItem('dark') === '1') {
    document.body.classList.add('dark');
    const ic = document.getElementById('themeIcon'); if (ic) ic.className = 'fas fa-sun';
    const tg = document.getElementById('toggleDark'); if (tg) tg.classList.add('on');
  }

  const mb = document.getElementById('menuBtn');
  if (mb) mb.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));

  treeRenderer = TreeRenderer.init('treeCanvas');

  renderHabitTable();
  renderPlanner();
  renderGoals();
  renderAchievements();
  updateStats();
  updateTree();
  updateSettingsCounts();
};

/* ─── SAHIFALAR ─── */
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'stats')  setTimeout(renderStatCharts, 80);
  if (name === 'planner') renderPlanner();
  if (name === 'tree')    setTimeout(updateTree, 80);
  return false;
}

/* ─── TEMA ─── */
function toggleTheme() {
  document.body.classList.toggle('dark');
  const on = document.body.classList.contains('dark');
  const ic = document.getElementById('themeIcon'); if (ic) ic.className = on ? 'fas fa-sun' : 'fas fa-moon';
  const tg = document.getElementById('toggleDark'); if (tg) tg.classList.toggle('on', on);
  localStorage.setItem('dark', on ? '1' : '0');
  const c = document.getElementById('treeCanvas');
  if (treeRenderer && c && c._lastState) treeRenderer.render(c._lastState);
}

/* ─── ODATLAR ─── */
function renderHabitTable() {
  const row = document.getElementById('daysRow');
  if (!row) return;
  row.innerHTML = `<th style="text-align:left;min-width:160px;padding:10px 8px">Odatlar / Kunlar</th>`;
  for (let d = 1; d <= DAYS; d++) {
    row.innerHTML += `<th class="${d===TODAY?'day-today':''}">${d}</th>`;
  }
  const body = document.getElementById('habitBody');
  if (!body) return;

  body.innerHTML = habits.map((h, hi) => `
    <tr>
      <td class="h-name">${h}
        <button class="del-btn" onclick="deleteHabit(${hi})"><i class="fas fa-trash"></i></button>
      </td>
      ${Array.from({length:DAYS},(_,d) => {
        const k = `${d+1}_${hi}`, done = !!checks[k], fut = (d+1) > TODAY;
        return `<td><input type="checkbox" ${done?'checked':''} ${fut?'disabled style="opacity:0.3"':''}
          onchange="toggleCheck(${d+1},${hi},this.checked)"></td>`;
      }).join('')}
    </tr>`).join('');

  body.innerHTML += `<tr class="pct-row">
    <td class="h-name" style="color:var(--text-muted)">Kunlik %</td>
    ${Array.from({length:DAYS},(_,d) => {
      if (d+1 > TODAY) return '<td></td>';
      const done = habits.filter((_,hi) => checks[`${d+1}_${hi}`]).length;
      const p = habits.length>0 ? Math.round(done/habits.length*100) : 0;
      const col = p>=80?'var(--green)':p>=50?'var(--orange)':'var(--red)';
      return `<td style="color:${col}">${p}%</td>`;
    }).join('')}
  </tr>`;
}

function addHabit() {
  const inp = document.getElementById('newHabitInput'); if (!inp) return;
  const v = inp.value.trim(); if (!v) return;
  if (!habits.includes(v)) habits.push(v);
  save(); inp.value='';
  renderHabitTable(); updateStats(); updateTree(); renderAchievements();
}

function deleteHabit(i) {
  habits.splice(i,1);
  const nc = {};
  Object.keys(checks).forEach(k => {
    const [d,hi] = k.split('_').map(Number);
    if (hi<i) nc[k]=checks[k]; else if (hi>i) nc[`${d}_${hi-1}`]=checks[k];
  });
  checks = nc; save();
  renderHabitTable(); updateStats(); updateTree();
}

function toggleCheck(d, hi, val) {
  checks[`${d}_${hi}`] = val; save();
  renderHabitTable(); updateStats(); updateTree();
}

/* ─── STATISTIKA HISOB ─── */
function calcEfficiency() {
  const total = habits.length * TODAY;
  const done  = Object.values(checks).filter(Boolean).length;
  return total>0 ? Math.round(done/total*100) : 0;
}
function calcStreak() {
  let s=0;
  for (let d=TODAY; d>=1; d--) {
    if (!habits.length) break;
    const done = habits.filter((_,hi) => checks[`${d}_${hi}`]).length;
    if (done===habits.length) s++; else break;
  }
  return s;
}
function calcMissedDays() {
  let m=0;
  for (let d=TODAY-1; d>=Math.max(1,TODAY-7); d--) {
    const done = habits.filter((_,hi) => checks[`${d}_${hi}`]).length;
    if (done===0 && habits.length>0) m++; else break;
  }
  return m;
}

function updateStats() {
  const eff    = calcEfficiency();
  const streak = calcStreak();
  const done   = Object.values(checks).filter(Boolean).length;
  const gDone  = goals.filter(g=>g.done).length;
  const active = Array.from({length:TODAY},(_,d) => habits.some((_,hi)=>checks[`${d+1}_${hi}`])).filter(Boolean).length;

  setText('statStreak', streak+' kun'); setText('statDone', done);
  setText('statEff', eff+'%'); setText('statGoals', gDone+'/'+goals.length);
  setText('st1', streak+' kun'); setText('st2', done); setText('st3', eff+'%'); setText('st4', active);

  if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashCharts(eff);
}

/* ─── DARAXT ─── */
function updateTree() {
  if (!treeRenderer) return;
  const eff     = calcEfficiency();
  const streak  = calcStreak();
  const missed  = calcMissedDays();
  const state   = HabitTree.computeState({ efficiency:eff, streak, missedDays:missed });
  treeRenderer.render(state);

  setText('treeStageBadge', state.stageName);
  setText('treeProgPct',    Math.round(state.growth*100)+'%');
  setText('tStatEff',       eff+'%');
  setText('tStatStreak',    streak);
  setText('tStatFruit',     state.fruitCount);
  setText('treeMessage',    HabitTree.getStatusMessage(state));
  setText('treeNextGoal',   HabitTree.getNextGoal(state));

  const fill = document.getElementById('treeProgFill');
  if (fill) fill.style.width = Math.round(state.growth*100)+'%';
}

/* ─── GRAFIKLAR ─── */
function renderDashCharts(eff) {
  if (_barCh)  _barCh.destroy();
  if (_doughCh) _doughCh.destroy();
  const barCtx = document.getElementById('barChart');
  if (barCtx) {
    const rand = simpleRand(TODAY);
    _barCh = new Chart(barCtx, {
      type:'bar',
      data:{ labels:['Du','Se','Ch','Pa','Ju','Sh','Ya'],
             datasets:[{label:'Samaradorlik', data:['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(()=>Math.round(rand()*55+15)),
             backgroundColor:'#3b82f6', borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}},
    });
  }
  const dCtx = document.getElementById('doughnutChart');
  if (dCtx) {
    _doughCh = new Chart(dCtx, {
      type:'doughnut',
      data:{ labels:['Bajarildi','Bajarilmadi'],
             datasets:[{data:[eff,100-eff], backgroundColor:['#22c55e','#e2e8f0'], borderWidth:0}]},
      options:{cutout:'72%',responsive:true,maintainAspectRatio:false},
    });
  }
}

function renderStatCharts() {
  if (_lineCh)    _lineCh.destroy();
  if (_habitBarCh) _habitBarCh.destroy();
  const labels=[], vals=[];
  for (let d=1; d<=TODAY; d++) {
    labels.push(String(d));
    const done = habits.filter((_,hi)=>checks[`${d}_${hi}`]).length;
    vals.push(habits.length>0 ? Math.round(done/habits.length*100) : 0);
  }
  const lCtx = document.getElementById('lineChart');
  if (lCtx) {
    _lineCh = new Chart(lCtx, {
      type:'line',
      data:{labels, datasets:[{label:'Samaradorlik %',data:vals,borderColor:'#3b82f6',
            backgroundColor:'rgba(59,130,246,0.08)',borderWidth:2,pointRadius:3,tension:0.4,fill:true}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}},
    });
  }
  const hCtx = document.getElementById('habitBarChart');
  if (hCtx) {
    _habitBarCh = new Chart(hCtx, {
      type:'bar',
      data:{labels:habits, datasets:[{label:'%',
            data:habits.map((_,hi)=>{let d=0;for(let dd=1;dd<=TODAY;dd++)if(checks[`${dd}_${hi}`])d++;return TODAY>0?Math.round(d/TODAY*100):0;}),
            backgroundColor:'#8b5cf6',borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
               scales:{y:{min:0,max:100},x:{ticks:{maxRotation:30,font:{size:11}}}}},
    });
  }
}

/* ─── PLANNER ─── */
function renderPlanner() {
  const body = document.getElementById('plannerBody'); if (!body) return;
  const days = ['Dush','Sesh','Chor','Pay','Jum','Shan','Yak'];
  body.innerHTML = timeRows.map((t,ri) => `
    <tr>
      <td class="time-cell" onclick="openTimeEdit(${ri})">${t}</td>
      ${days.map(day => {
        const id=`${day}-${ri}`, dt=plannerData[id];
        return dt&&dt.text
          ? `<td onclick="openTaskEdit('${id}')"><div class="p-task" style="background:${colorMap[dt.color]||'#3b82f6'}">${dt.text}</div></td>`
          : `<td onclick="openTaskEdit('${id}')"></td>`;
      }).join('')}
    </tr>`).join('');
}

function addTimeRow() { timeRows.push('00:00'); save(); renderPlanner(); }

function openTimeEdit(i) {
  _editMode='time'; _editId=i;
  setText('modalTitle',"Vaqtni o'zgartirish");
  document.getElementById('editTime').style.display='block';
  document.getElementById('editTime').value=timeRows[i];
  document.getElementById('editText').style.display='none';
  document.getElementById('colorRow').style.display='none';
  document.getElementById('modalBg').classList.add('open');
}
function openTaskEdit(id) {
  _editMode='task'; _editId=id;
  const dt=plannerData[id]||{text:'',color:'blue'};
  setText('modalTitle','Vazifani kiritish');
  document.getElementById('editTime').style.display='none';
  document.getElementById('editText').style.display='block';
  document.getElementById('editText').value=dt.text;
  document.getElementById('colorRow').style.display='flex';
  _editColor=dt.color||'blue';
  document.querySelectorAll('.c-dot').forEach(d=>d.classList.remove('sel'));
  const sel=document.querySelector(`.c-dot[data-color="${_editColor}"]`); if(sel) sel.classList.add('sel');
  document.getElementById('modalBg').classList.add('open');
}
function selColor(color,el) {
  _editColor=color;
  document.querySelectorAll('.c-dot').forEach(d=>d.classList.remove('sel'));
  el.classList.add('sel');
}
function saveModal() {
  if (_editMode==='time') {
    const v=document.getElementById('editTime').value.trim();
    if(v){timeRows[_editId]=v;save();renderPlanner();}
  } else {
    const t=document.getElementById('editText').value.trim();
    if(t) plannerData[_editId]={text:t,color:_editColor}; else delete plannerData[_editId];
    save(); renderPlanner();
  }
  closeModal();
}
function closeModal() { document.getElementById('modalBg').classList.remove('open'); }

/* ─── MAQSADLAR ─── */
function addGoal() {
  const inp=document.getElementById('goalInput'); if(!inp) return;
  const v=inp.value.trim(); if(!v) return;
  const cat=document.getElementById('goalCat').value;
  goals.push({id:Date.now(),name:v,cat,steps:[],done:false});
  save(); inp.value=''; renderGoals(); updateStats();
}
function goalPct(g) {
  if(g.done) return 100;
  if(!g.steps.length) return 0;
  return Math.round(g.steps.filter(s=>s.done).length/g.steps.length*100);
}
function renderGoals() {
  setText('gTotal', goals.length);
  setText('gDone',  goals.filter(g=>g.done).length);
  setText('gInprog',goals.filter(g=>!g.done&&goalPct(g)>0).length);
  const cats=['all','soglik','ish','shaxsiy','moliya','boshqa'];
  const cf=document.getElementById('catTabs');
  if(cf) cf.innerHTML=cats.map(c=>{
    const cnt=c==='all'?goals.length:goals.filter(g=>g.cat===c).length;
    return `<button class="cat-tab${_activeCat===c?' active':''}" onclick="setCat('${c}')">${CAT_LABELS[c]}${cnt>0?` (${cnt})`:''}</button>`;
  }).join('');
  const filtered=_activeCat==='all'?goals:goals.filter(g=>g.cat===_activeCat);
  const el=document.getElementById('goalsList'); if(!el) return;
  if(!filtered.length){el.innerHTML='<div class="empty-msg">Hozircha maqsad yo\'q.</div>';return;}
  el.innerHTML=filtered.map(g=>{
    const p=goalPct(g), ex=!!_expanded[g.id];
    return `<div class="goal-card">
      <div class="goal-top-row">
        <div class="g-check${g.done?' done':''}" onclick="toggleGoal(${g.id})"></div>
        <div class="goal-name${g.done?' done':''}">${g.name}</div>
        <div class="g-actions">
          <span class="badge badge-${g.cat}">${CAT_LABELS[g.cat]}</span>
          <button class="del-btn" onclick="deleteGoal(${g.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <button class="expand-link" onclick="toggleExpand(${g.id})">${ex?'▲ Yopish':'▼ Qadamlar ('+g.steps.length+')'}</button>
      ${g.steps.length>0||g.done?`<div class="g-progress">
        <div class="g-prog-label"><span>${p}% bajarildi</span><span>${g.steps.filter(s=>s.done).length}/${g.steps.length} qadam</span></div>
        <div class="prog-bg"><div class="prog-fill${p===100?' full':''}" style="width:${p}%"></div></div>
      </div>`:''}
      ${ex?`<div class="steps-wrap">
        ${g.steps.map((s,i)=>`<div class="step-row">
          <div class="step-cb${s.done?' done':''}" onclick="toggleStep(${g.id},${i})"></div>
          <span class="step-txt${s.done?' done':''}">${s.text}</span>
        </div>`).join('')}
        <div class="add-step">
          <input id="si_${g.id}" placeholder="Qadam qo'shish..." onkeydown="if(event.key==='Enter')addStep(${g.id})">
          <button onclick="addStep(${g.id})">+</button>
        </div>
      </div>`:''}
    </div>`;
  }).join('');
}
function setCat(c){_activeCat=c;renderGoals();}
function toggleGoal(id){const g=goals.find(x=>x.id===id);if(g){g.done=!g.done;save();renderGoals();updateStats();renderAchievements();}}
function deleteGoal(id){goals=goals.filter(x=>x.id!==id);save();renderGoals();updateStats();}
function toggleExpand(id){_expanded[id]=!_expanded[id];renderGoals();}
function toggleStep(gid,si){const g=goals.find(x=>x.id===gid);if(!g)return;g.steps[si].done=!g.steps[si].done;if(g.steps.length&&g.steps.every(s=>s.done))g.done=true;save();renderGoals();renderAchievements();}
function addStep(gid){const inp=document.getElementById('si_'+gid);if(!inp)return;const t=inp.value.trim();if(!t)return;const g=goals.find(x=>x.id===gid);if(g){g.steps.push({text:t,done:false});save();renderGoals();}}

/* ─── YUTUQLAR ─── */
const ACHIEVEMENTS=[
  {id:'first_habit', icon:'🌱',name:"Birinchi qadam",      desc:"Birinchi odatni qo'shing",       check:()=>habits.length>=1},
  {id:'five_habits', icon:'💪',name:"Faol odam",           desc:"5 ta odat qo'shing",             check:()=>habits.length>=5},
  {id:'streak3',     icon:'🔥',name:"3 kunlik zanjir",     desc:"3 kun ketma-ket bajaring",       check:()=>calcStreak()>=3},
  {id:'streak7',     icon:'⚡',name:"Haftalik zanjir",     desc:"7 kun ketma-ket bajaring",       check:()=>calcStreak()>=7},
  {id:'streak14',    icon:'🌟',name:"14 kunlik zanjir",    desc:"14 kun ketma-ket bajaring",      check:()=>calcStreak()>=14},
  {id:'streak30',    icon:'👑',name:"30 kunlik qahramon",  desc:"30 kun ketma-ket bajaring",      check:()=>calcStreak()>=30},
  {id:'done10',      icon:'✅',name:"10 ta bajarildi",     desc:"Jami 10 ta odat bajaring",       check:()=>Object.values(checks).filter(Boolean).length>=10},
  {id:'done50',      icon:'🎯',name:"50 ta bajarildi",     desc:"Jami 50 ta odat bajaring",       check:()=>Object.values(checks).filter(Boolean).length>=50},
  {id:'done100',     icon:'💎',name:"100 ta bajarildi",    desc:"Jami 100 ta odat bajaring",      check:()=>Object.values(checks).filter(Boolean).length>=100},
  {id:'first_goal',  icon:'🎪',name:"Birinchi maqsad",     desc:"Birinchi maqsadni qo'shing",     check:()=>goals.length>=1},
  {id:'goal_done',   icon:'🏆',name:"Maqsadga erishdim",   desc:"Birinchi maqsadni bajaring",     check:()=>goals.some(g=>g.done)},
  {id:'three_goals', icon:'🎖',name:"Maqsadlar ustasi",    desc:"3 ta maqsadni bajaring",         check:()=>goals.filter(g=>g.done).length>=3},
  {id:'tree_nihol',  icon:'🌿',name:"Nihol o'stirdi",      desc:"20%+ samaradorlikka yeting",     check:()=>calcEfficiency()>=20},
  {id:'tree_full',   icon:'🌳',name:"To'liq daraxt",       desc:"80%+ samaradorlikka yeting",     check:()=>calcEfficiency()>=80},
  {id:'tree_fruit',  icon:'🍎',name:"Birinchi hosil",      desc:"5 kunlik streak oling",          check:()=>calcStreak()>=5},
  {id:'perfect_day', icon:'☀️',name:"Mukammal kun",        desc:"Barcha odatni bir kunda bajaring",check:()=>{for(let d=1;d<=TODAY;d++)if(habits.length>0&&habits.every((_,hi)=>checks[`${d}_${hi}`]))return true;return false;}},
];
function renderAchievements(){
  const grid=document.getElementById('achGrid'); if(!grid) return;
  const unlocked=ACHIEVEMENTS.filter(a=>a.check()).length;
  setText('achCount',`${unlocked}/${ACHIEVEMENTS.length}`);
  grid.innerHTML=ACHIEVEMENTS.map(a=>{
    const ok=a.check();
    return `<div class="ach-card${ok?' unlocked':' ach-locked'}">
      <div class="ach-icon" style="font-size:30px;margin-bottom:8px">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
      ${ok?'<div style="margin-top:6px;font-size:11px;color:#3B6D11;font-weight:600">✓ Ochildi!</div>':''}
    </div>`;
  }).join('');
}

/* ─── SOZLAMALAR ─── */
function updateSettingsCounts(){setText('setHabitCount',habits.length);setText('setGoalCount',goals.length);}
function clearAll(){
  if(!confirm("Haqiqatan ham barcha ma'lumotlarni o'chirasizmi?")) return;
  habits=["Erta turish"];checks={};goals={};plannerData={};
  timeRows=["07:00","09:00","11:00","13:00","15:00","17:00","19:00","21:00"];
  localStorage.clear();
  renderHabitTable();renderPlanner();renderGoals();renderAchievements();
  updateStats();updateTree();updateSettingsCounts();
}
