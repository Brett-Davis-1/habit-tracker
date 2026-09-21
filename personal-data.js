(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./productivity-model.js'):root.BuddyModel;
  const G=typeof module!=='undefined'&&module.exports?require('./goal-map-model.js'):root.GoalMapModel;
  const STORE='habit-buddy-productivity-v1',RECOVERY=STORE+'-recovery';
  const empty=()=>({version:1,sample:false,goals:[],milestones:[],commitments:[],tasks:[],habits:[],logs:{},journal:{}});
  function validate(value){
    const s=M.clone(value);M.validate(s);
    const text=JSON.stringify(s);if(text.length>10000000)throw Error('This backup is too large (10 MB maximum).');
    JSON.parse(text,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error('The backup contains an unsafe field.');return v;});
    const ids=new Set();
    for(const collection of ['goals','milestones','commitments','tasks','habits'])for(const item of s[collection]){
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)||!item.title.trim()||item.title.length>180)throw Error('The backup contains an invalid item.');
      ids.add(({goals:'goal',milestones:'milestone',commitments:'commitment',tasks:'task',habits:'habit'})[collection]+':'+item.id);
      for(const field of ['goalId','milestoneId','commitmentId','why','icon','color'])if(item[field]!=null&&typeof item[field]!=='string')throw Error('The backup contains an invalid item field.');
    }
    for(const h of s.habits){if(!['good','bad'].includes(h.type))throw Error('Invalid habit type.');if(h.createdOn)M.date(h.createdOn);if(h.frequency&& !['daily','weekly'].includes(h.frequency))throw Error('Invalid habit schedule.');if(h.frequency==='weekly'&&(!Array.isArray(h.weekdays)||!h.weekdays.length||h.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('Invalid weekly schedule.');}
    for(const t of s.tasks)if(!Number.isInteger(t.minutes)||t.minutes<1||t.minutes>1440||typeof t.done!=='boolean')throw Error('Invalid action.');
    for(const [day,logs] of Object.entries(s.logs)){if(Array.isArray(logs))throw Error('Invalid habit history.');for(const [id,log] of Object.entries(logs)){if(!ids.has('habit:'+id)||!log||typeof log!=='object'||(log.time&&(!Number.isFinite(Date.parse(log.time)))))throw Error('Invalid check-in history.');}}
    if(s.goalMap){
      if(s.goalMap.version!==1||!Array.isArray(s.goalMap.edges)||!Array.isArray(s.goalMap.known))throw Error('Invalid map.');
      const edgeIds=new Set(),pairs=new Set();
      for(const e of s.goalMap.edges){
        if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(e.id)||edgeIds.has(e.id)||!ids.has(e.from)||!ids.has(e.to))throw Error('Invalid map connection.');
        if(G.levels.indexOf(G.get(s,e.from).level)>=G.levels.indexOf(G.get(s,e.to).level)||pairs.has(e.from+'>'+e.to))throw Error('Invalid map direction.');
        edgeIds.add(e.id);pairs.add(e.from+'>'+e.to);
      }
      if(s.goalMap.known.some(id=>typeof id!=='string'))throw Error('Invalid map items.');
    }
    G.ensure(s);return s;
  }
  function read(text){let data;try{data=JSON.parse(text);}catch{throw Error('Choose a valid Habit Buddy JSON backup.');}
    if(data.app){if(data.app!=='habit-buddy'||data.backupVersion!==1)throw Error('This backup format is not supported.');data=data.state;}
    return validate(data);
  }
  const backup=s=>JSON.stringify({app:'habit-buddy',backupVersion:1,exportedAt:new Date().toISOString(),state:validate(s)},null,2);
  function replace(storage,next){const validated=validate(next),prior=storage.getItem(STORE),previousRecovery=storage.getItem(RECOVERY);
    try{if(prior!==null)storage.setItem(RECOVERY,prior);storage.setItem(STORE,JSON.stringify(validated));}
    catch(error){try{if(previousRecovery===null)storage.removeItem(RECOVERY);else storage.setItem(RECOVERY,previousRecovery);}catch{}throw Error('There is not enough device storage. Your current workspace was not replaced.');}
    return validated;
  }
  const api={STORE,RECOVERY,empty,validate,read,backup,replace};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PersonalData=api;
})(globalThis);
