(function (root) {
  'use strict';
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const date = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid date.');
    const [y,m,d] = value.split('-').map(Number);
    const parsed = new Date(y,m-1,d,12);
    if (key(parsed) !== value) throw new Error('Choose a valid date.');
    return parsed;
  };
  const shift = (value,delta) => {const d=date(value);d.setDate(d.getDate()+delta);return key(d);};
  const week = value => {const d=date(value);return shift(value,-((d.getDay()+6)%7));};
  const days = (end,count=7) => Array.from({length:count},(_,i)=>shift(end,i-count+1));
  const uid = () => globalThis.crypto.randomUUID();
  const title = value => {const clean=String(value||'').trim();if(!clean)throw new Error('Add a name first.');if(clean.length>180)throw new Error('Keep names under 180 characters.');return clean;};
  const find = (items,id,label) => {const item=items.find(x=>x.id===id);if(!item)throw new Error(`${label} was not found.`);return item;};
  const clone = value => JSON.parse(JSON.stringify(value));
  function seed(today=key(new Date())) {
    const start=week(today);
    const state={version:1,sample:true,goals:[
      {id:'lineflow',title:'Build LineFlow into a business',why:'Create something useful. Find the people who need it.',color:'green',icon:'target'},
      {id:'strength',title:'Feel stronger, every week',why:'More energy for work, life, and everything in between.',color:'blue',icon:'activity'},
      {id:'savings',title:'Build a financial cushion',why:'Give future me a little more freedom.',color:'amber',icon:'wallet'}
    ],milestones:[
      {id:'l1',goalId:'lineflow',title:'Shape an offer worth sharing',done:true},
      {id:'l2',goalId:'lineflow',title:'Find my first paying customer',done:false},
      {id:'l3',goalId:'lineflow',title:'Deliver the first successful project',done:false},
      {id:'s1',goalId:'strength',title:'Build a four-week workout routine',done:false},
      {id:'s2',goalId:'strength',title:'Keep the routine for three months',done:false},
      {id:'f1',goalId:'savings',title:'Understand my monthly spending',done:true},
      {id:'f2',goalId:'savings',title:'Save my first $1,000',done:false}
    ],commitments:[
      {id:'outreach',goalId:'lineflow',milestoneId:'l2',title:'Make 5 personal introductions',target:5,week:start},
      {id:'workouts',goalId:'strength',milestoneId:'s1',title:'Make time for 3 workouts',target:3,week:start},
      {id:'money',goalId:'savings',milestoneId:'f2',title:'Have a money check-in',target:1,week:start}
    ],tasks:[
      {id:'email',title:'Send one introduction to a manufacturer',goalId:'lineflow',commitmentId:'outreach',date:today,minutes:20,done:false,priority:true,postponements:0},
      {id:'exercise',title:'Make room for a 30-minute workout',goalId:'strength',commitmentId:'workouts',date:today,minutes:30,done:false,priority:true,postponements:0},
      {id:'budget',title:"Review this month's spending",goalId:'savings',commitmentId:'money',date:today,minutes:15,done:true,priority:true,postponements:0}
    ],habits:[
      {id:'move',title:'Move my body',type:'good',goalId:'strength',icon:'activity',createdOn:shift(today,-20)},
      {id:'focus',title:'One focused work session',type:'good',goalId:'lineflow',icon:'focus',createdOn:shift(today,-20)},
      {id:'scroll',title:'Avoid mindless scrolling',type:'bad',goalId:'',icon:'phone',createdOn:shift(today,-20)},
      {id:'read',title:'Read a few pages',type:'good',goalId:'',icon:'book',createdOn:shift(today,-20)}
    ],logs:{},journal:{}};
    for(let i=20;i>=0;i--){const day=shift(today,-i);state.logs[day]={};state.habits.forEach((h,j)=>{if(i===0 && j===3)return;state.logs[day][h.id]={outcome:(i+j)%5===0?'bad':'good',time:`${day}T17:${String(10+j*4).padStart(2,'0')}:00`};});}
    state.logs[today]={move:{outcome:'good',time:`${today}T08:15:00`},focus:{outcome:'good',time:`${today}T10:40:00`},scroll:{outcome:'bad',time:`${today}T12:10:00`}};
    const earlier=days(shift(today,-1),6).filter(d=>d>=start);
    earlier.slice(0,2).forEach((d,i)=>state.tasks.push({id:`past-email-${i}`,title:'Introduce LineFlow to a local manufacturer',goalId:'lineflow',commitmentId:'outreach',date:d,minutes:20,done:true,priority:true,postponements:0}));
    earlier.slice(0,1).forEach((d,i)=>state.tasks.push({id:`past-workout-${i}`,title:'Complete a strength session',goalId:'strength',commitmentId:'workouts',date:d,minutes:30,done:true,priority:true,postponements:0}));
    state.journal[shift(today,-1)]={morning:'Make space for the work that matters before opening my inbox.',evening:'A shorter plan made it easier to follow through.',text:'The best part of today was getting started before I felt ready. Small steps still count.',savedAt:new Date().toISOString()};
    return state;
  }
  function validate(s) {
    if(!s||s.version!==1)throw new Error('This saved workspace uses an unsupported format.');
    ['goals','milestones','commitments','tasks','habits'].forEach(name=>{if(!Array.isArray(s[name]))throw new Error('The saved workspace is incomplete.');const ids=new Set();s[name].forEach(x=>{if(!x||typeof x.id!=='string'||typeof x.title!=='string'||ids.has(x.id))throw new Error('The saved workspace contains invalid records.');ids.add(x.id);});});
    if(!s.logs||typeof s.logs!=='object'||Array.isArray(s.logs)||!s.journal||typeof s.journal!=='object'||Array.isArray(s.journal))throw new Error('The saved history is incomplete.');
    s.tasks.forEach(t=>date(t.date));s.commitments.forEach(c=>{date(c.week);if(!Number.isInteger(c.target)||c.target<1)throw new Error('Invalid weekly target.');});
    Object.entries(s.logs).forEach(([day,logs])=>{date(day);if(!logs||typeof logs!=='object')throw new Error('Invalid habit history.');Object.values(logs).forEach(log=>{if(!['good','bad'].includes(log.outcome))throw new Error('Invalid habit result.');});});
    Object.entries(s.journal).forEach(([day,entry])=>{date(day);if(!entry||typeof entry!=='object')throw new Error('Invalid journal entry.');['text','morning','evening'].forEach(f=>{if(entry[f]!==undefined&&typeof entry[f]!=='string')throw new Error('Invalid journal text.');});});
    return s;
  }
  const habitDueOn=(h,day)=>(!h.createdOn||h.createdOn<=day)&&(h.frequency!=='weekly'||(h.weekdays||[]).includes(date(day).getDay()));
  const habitsForDay=(s,day)=>s.habits.filter(h=>habitDueOn(h,day)||s.logs[day]?.[h.id]);
  const habitSummary=(s,day)=>{date(day);const ids=new Set(habitsForDay(s,day).map(h=>h.id));const values=Object.entries(s.logs[day]||{}).filter(([id])=>ids.has(id)).map(([,log])=>log);const good=values.filter(x=>x.outcome==='good').length;const bad=values.length-good;return {good,bad,total:values.length,due:ids.size,percent:values.length?Math.round(good/values.length*100):0};};
  const commitmentCount=(s,c)=>s.tasks.filter(t=>(s.goalMap?s.goalMap.edges.some(e=>e.from==='commitment:'+c.id&&e.to==='task:'+t.id):t.commitmentId===c.id)&&t.done&&week(t.date)===c.week).length;
  function createGoal(s,input){const g={id:uid(),title:title(input.title),why:String(input.why||'').trim().slice(0,600),color:['green','blue','amber'].includes(input.color)?input.color:'green',icon:'target'};s.goals.push(g);return g;}
  function createMilestone(s,input){find(s.goals,input.goalId,'Goal');const m={id:uid(),goalId:input.goalId,title:title(input.title),done:false};s.milestones.push(m);return m;}
  function createCommitment(s,input){find(s.goals,input.goalId,'Goal');const target=Number(input.target);if(!Number.isInteger(target)||target<1||target>100)throw new Error('Choose a weekly target from 1 to 100.');if(input.milestoneId&&find(s.milestones,input.milestoneId,'Milestone').goalId!==input.goalId)throw new Error('Choose a milestone from this goal.');const c={id:uid(),goalId:input.goalId,milestoneId:input.milestoneId||'',title:title(input.title),target,week:week(input.date)};s.commitments.push(c);return c;}
  function createTask(s,input){date(input.date);if(input.goalId)find(s.goals,input.goalId,'Goal');if(input.commitmentId){const c=find(s.commitments,input.commitmentId,'Commitment');if(c.goalId!==input.goalId)throw new Error('Choose a commitment from this goal.');if(c.week!==week(input.date))throw new Error('Choose a date in the commitment week.');}const minutes=Number(input.minutes||15);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw new Error('Choose a duration from 1 to 1,440 minutes.');const t={id:uid(),title:title(input.title),goalId:input.goalId||'',commitmentId:input.commitmentId||'',date:input.date,minutes,done:false,priority:s.tasks.filter(t=>t.date===input.date&&t.priority).length<3,postponements:0};s.tasks.push(t);return t;}
  function setPriorities(s,day,ids){date(day);if(ids.length>3)throw new Error('Choose up to three priorities.');if(new Set(ids).size!==ids.length)throw new Error('Each priority must be unique.');ids.forEach(id=>{if(find(s.tasks,id,'Action').date!==day)throw new Error('Choose actions scheduled for this day.');});s.tasks.filter(t=>t.date===day).forEach(t=>t.priority=ids.includes(t.id));}
  function setTaskDone(s,id,done){const t=find(s.tasks,id,'Action');t.done=Boolean(done);return t;}
  function reschedule(s,id,day){date(day);const t=find(s.tasks,id,'Action');if(t.done)throw new Error('Reopen the action before rescheduling it.');if(t.date===day)return t;const prior=t.date;t.date=day;t.postponements++;t.priority=s.tasks.filter(x=>x.id!==id&&x.date===day&&x.priority).length<3;if(t.commitmentId){const c=s.commitments.find(c=>c.id===t.commitmentId);if(c&&c.week!==week(day))t.commitmentId='';}t.previousDate=prior;return t;}
  function createHabit(s,input){if(input.goalId)find(s.goals,input.goalId,'Goal');if(!['good','bad'].includes(input.type))throw new Error('Choose a habit type.');date(input.date);const h={id:uid(),title:title(input.title),type:input.type,goalId:input.goalId||'',icon:input.type==='bad'?'phone':'activity',createdOn:input.date};s.habits.push(h);return h;}
  function setHabit(s,id,day,outcome){const h=find(s.habits,id,'Habit');date(day);if(h.createdOn&&day<h.createdOn)throw new Error('This habit did not exist on that day.');if(!['good','bad',null].includes(outcome))throw new Error('Choose a valid habit result.');if(day>key(new Date()))throw new Error('Check in on this day when it arrives.');s.logs[day]??={};if(outcome===null){delete s.logs[day][id];return;}s.logs[day][id]={outcome,time:new Date().toISOString()};}
  function saveJournal(s,day,entry){date(day);s.journal[day]={morning:String(entry.morning||'').slice(0,20000),evening:String(entry.evening||'').slice(0,20000),text:String(entry.text||'').slice(0,50000),savedAt:new Date().toISOString()};}
  function buddy(s,day){const tasks=s.tasks.filter(t=>t.date===day);const postponed=tasks.find(t=>!t.done&&t.postponements>=2);if(postponed)return {title:'Make the next step smaller.',text:`“${postponed.title}” has moved ${postponed.postponements} times. Try a smaller action or choose a day with more room.`,action:'task-edit',id:postponed.id,label:'Adjust this action'};const next=tasks.find(t=>t.priority&&!t.done);if(next){const g=s.goals.find(g=>g.id===next.goalId);return {title:'A little focus goes a long way.',text:`Give “${next.title}” ${next.minutes} minutes.${g?` It supports your goal: ${g.title}.`:''}`,action:'focus-action',id:next.id,label:'See my next step'};}if(tasks.some(t=>t.priority)&&tasks.filter(t=>t.priority).every(t=>t.done))return {title:'You showed up for your priorities.',text:'Take a moment to notice what helped. A short reflection can make tomorrow easier.',action:'review',label:'Reflect on the day'};return {title:'Give today a direction.',text:'Choose up to three actions that deserve your attention. A realistic plan is easier to follow.',action:'plan',label:'Plan my day'};}
  const api={key,date,shift,week,days,clone,seed,validate,habitSummary,habitDueOn,habitsForDay,commitmentCount,createGoal,createMilestone,createCommitment,createTask,setPriorities,setTaskDone,reschedule,createHabit,setHabit,saveJournal,buddy};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BuddyModel=api;
})(globalThis);
