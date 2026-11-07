(function(root){
'use strict';
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Choose a valid date.');const [y,m,d]=v.split('-').map(Number),x=new Date(y,m-1,d,12);if(key(x)!==v)throw Error('Choose a valid date.');return x;};
const shift=(v,n)=>{const d=date(v);d.setDate(d.getDate()+n);return key(d);};
const week=v=>shift(v,-((date(v).getDay()+6)%7));
const days=(end,count=7)=>Array.from({length:count},(_,i)=>shift(end,i-count+1));
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const cleanTitle=v=>{const x=String(v||'').trim();if(!x)throw Error('Add a name first.');if(x.length>180)throw Error('Keep names under 180 characters.');return x;};
const find=(xs,id,label)=>{const x=xs.find(v=>v.id===id);if(!x)throw Error(`${label} was not found.`);return x;};
const empty=()=>({version:1,sample:false,goals:[],milestones:[],commitments:[],tasks:[],habits:[],logs:{},journal:{}});
function validate(value){
  if(!value||value.version!==1)throw Error('This saved workspace uses an unsupported format.');
  const s=value;for(const name of ['goals','milestones','commitments','tasks','habits']){if(!Array.isArray(s[name]))s[name]=[];const ids=new Set();for(const x of s[name]){if(!x||typeof x.id!=='string'||typeof x.title!=='string'||ids.has(x.id))throw Error('The saved workspace contains invalid records.');ids.add(x.id);}}
  if(!s.logs||typeof s.logs!=='object'||Array.isArray(s.logs))throw Error('The saved history is incomplete.');
  if(!s.journal||typeof s.journal!=='object'||Array.isArray(s.journal))throw Error('The saved journal is incomplete.');
  for(const [day,logs] of Object.entries(s.logs)){date(day);if(!logs||typeof logs!=='object'||Array.isArray(logs))throw Error('Invalid daily history.');for(const log of Object.values(logs)){if(!log||!['good','bad'].includes(log.outcome))throw Error('Invalid daily result.');}}
  for(const day of Object.keys(s.journal))date(day);return s;
}
const habitDueOn=(h,day)=>(!h.createdOn||h.createdOn<=day);
const habitsForDay=(s,day)=>s.habits.filter(h=>habitDueOn(h,day)||s.logs[day]?.[h.id]);
function habitSummary(s,day){date(day);const ids=new Set(habitsForDay(s,day).map(h=>h.id)),values=Object.entries(s.logs[day]||{}).filter(([id])=>ids.has(id)).map(([,x])=>x);const good=values.filter(x=>x.outcome==='good').length,bad=values.length-good;return{good,bad,total:values.length,due:ids.size,percent:values.length?Math.round(good/values.length*100):0};}
function createGoal(s,input){const g={id:uid(),title:cleanTitle(input.title),why:String(input.why||'').trim().slice(0,600),color:['green','blue','amber'].includes(input.color)?input.color:'green',icon:'target'};s.goals.push(g);return g;}
function updateGoal(s,id,input){const g=find(s.goals,id,'Goal');g.title=cleanTitle(input.title);g.why=String(input.why||'').trim().slice(0,600);return g;}
function removeGoal(s,id){find(s.goals,id,'Goal');s.goals=s.goals.filter(g=>g.id!==id);s.habits.forEach(h=>{if(h.goalId===id)h.goalId='';});}
function createHabit(s,input){if(input.goalId)find(s.goals,input.goalId,'Goal');date(input.date);const h={id:uid(),title:cleanTitle(input.title),type:input.type==='bad'?'bad':'good',goalId:input.goalId||'',icon:input.type==='bad'?'shield':'activity',createdOn:input.date,frequency:'daily'};s.habits.push(h);return h;}
function updateHabit(s,id,input){const h=find(s.habits,id,'Daily action');if(input.goalId)find(s.goals,input.goalId,'Goal');h.title=cleanTitle(input.title);h.type=input.type==='bad'?'bad':'good';h.goalId=input.goalId||'';h.frequency='daily';delete h.weekdays;return h;}
function removeHabit(s,id){find(s.habits,id,'Daily action');s.habits=s.habits.filter(h=>h.id!==id);for(const logs of Object.values(s.logs))delete logs[id];}
function setHabit(s,id,day,outcome){const h=find(s.habits,id,'Daily action');date(day);if(h.createdOn&&day<h.createdOn)throw Error('This daily action did not exist on that day.');if(day>key(new Date()))throw Error('Check in on this day when it arrives.');if(!['good','bad',null].includes(outcome))throw Error('Choose a valid result.');s.logs[day]??={};if(outcome===null){delete s.logs[day][id];return;}s.logs[day][id]={outcome,time:new Date().toISOString()};}
function saveJournal(s,day,entry){date(day);s.journal[day]={...(s.journal[day]||{}),text:String(entry.text||'').slice(0,50000),savedAt:new Date().toISOString()};}
function recoverLegacy(value,fallbackDay=key(new Date())){
  const source=value?.state||value;
  if(source?.version===1)return validate(clone(source));
  if(!source||!Array.isArray(source.habits))throw Error('No recoverable habits were found.');
  const s=empty(),ids=new Map();
  source.habits.forEach((old,index)=>{
    const original=String(old.id??index),id=`legacy-${original.replace(/[^a-zA-Z0-9_-]/g,'-')}`;
    ids.set(original,id);s.habits.push({id,title:cleanTitle(old.title||old.name),type:old.type==='bad'?'bad':'good',goalId:'',icon:old.type==='bad'?'shield':'activity',createdOn:fallbackDay,frequency:'daily'});
  });
  const entries=Array.isArray(source.logs)?source.logs:Object.entries(source.logs||{}).flatMap(([day,logs])=>Object.entries(logs||{}).map(([habitId,log])=>({...log,habitId,day})));
  entries.sort((a,b)=>Number(a.timestamp||Date.parse(a.time)||0)-Number(b.timestamp||Date.parse(b.time)||0)).forEach(log=>{
    const id=ids.get(String(log.habitId));if(!id)return;
    let day=log.day;if(!day){const when=new Date(Number(log.timestamp)||Date.parse(log.time));day=Number.isNaN(when.valueOf())?fallbackDay:key(when);}
    try{date(day);}catch{return;}const outcome=log.outcome==='bad'?'bad':'good';s.logs[day]??={};s.logs[day][id]={outcome,time:log.time||new Date(Number(log.timestamp)||Date.now()).toISOString()};const h=s.habits.find(x=>x.id===id);if(h&&day<h.createdOn)h.createdOn=day;
  });
  return validate(s);
}
const api={key,date,shift,week,days,clone,empty,validate,recoverLegacy,habitSummary,habitDueOn,habitsForDay,createGoal,updateGoal,removeGoal,createHabit,updateHabit,removeHabit,setHabit,saveJournal};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BuddyModel=api;
})(globalThis);

