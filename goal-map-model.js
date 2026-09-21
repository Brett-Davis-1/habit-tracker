(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./productivity-model.js'):root.BuddyModel;
  const levels=['lifetime','year','weekly','daily'];
  const collections={goal:'goals',milestone:'milestones',commitment:'commitments',habit:'habits',task:'tasks'};
  const uid=()=>globalThis.crypto.randomUUID();
  const clean=v=>{const text=String(v||'').trim();if(!text||text.length>180)throw Error('Use a name between 1 and 180 characters.');return text;};
  function nodes(s){return Object.entries(collections).flatMap(([kind,collection])=>s[collection].map(item=>({
    id:kind+':'+item.id,kind,sourceId:item.id,title:item.title,
    level:kind==='goal'?'lifetime':kind==='milestone'?'year':kind==='commitment'||(kind==='habit'&&item.frequency==='weekly')?'weekly':'daily',
    direction:item.mapDirection||(kind==='habit'&&item.type==='bad'?'less':'more'),item
  })));}
  const get=(s,id)=>{const node=nodes(s).find(n=>n.id===id);if(!node)throw Error('This item no longer exists.');return node;};
  function inferred(s,n){const x=n.item;let parent='';
    if(n.kind==='milestone'&&x.goalId)parent='goal:'+x.goalId;
    if(n.kind==='commitment')parent=x.milestoneId?'milestone:'+x.milestoneId:x.goalId?'goal:'+x.goalId:'';
    if(n.kind==='task')parent=x.commitmentId?'commitment:'+x.commitmentId:x.goalId?'goal:'+x.goalId:'';
    if(n.kind==='habit'&&x.goalId)parent='goal:'+x.goalId;
    return parent;
  }
  // Import old relationships once. A removed map connection must not reappear on reload.
  function ensure(s){
    s.goalMap??={version:1,known:[],edges:[]};
    const map=s.goalMap;
    if(map.version!==1||!Array.isArray(map.known)||!Array.isArray(map.edges))throw Error('The saved goal map is incomplete.');
    const all=nodes(s),ids=new Set(all.map(n=>n.id));
    map.edges=map.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
    for(const n of all)if(!map.known.includes(n.id)){
      const from=inferred(s,n);
      if(from&&ids.has(from)&&!map.edges.some(e=>e.from===from&&e.to===n.id))map.edges.push({id:uid(),from,to:n.id});
      map.known.push(n.id);
    }
    return map;
  }
  function connect(s,from,to){ensure(s);const a=get(s,from),b=get(s,to);
    if(levels.indexOf(a.level)>=levels.indexOf(b.level))throw Error('Connect a bigger time horizon to a smaller one. You can skip columns.');
    if(s.goalMap.edges.some(e=>e.from===from&&e.to===to))throw Error('These items are already connected.');
    if(a.kind==='commitment'&&b.kind==='task'&&M.week(b.item.date)!==a.item.week)throw Error('This action is scheduled outside the commitment week. Choose a matching week.');
    const edge={id:uid(),from,to};s.goalMap.edges.push(edge);return edge;
  }
  function disconnect(s,id){ensure(s);const index=s.goalMap.edges.findIndex(e=>e.id===id);if(index<0)throw Error('This connection no longer exists.');return s.goalMap.edges.splice(index,1)[0];}
  function related(s,id,direction='parents'){
    ensure(s);const seen=new Set(),pending=[id];
    while(pending.length){const current=pending.pop();for(const e of s.goalMap.edges){const next=direction==='parents'?(e.to===current?e.from:null):(e.from===current?e.to:null);if(next&&!seen.has(next)){seen.add(next);pending.push(next);}}}
    return nodes(s).filter(n=>seen.has(n.id));
  }
  const supportingGoals=(s,id)=>related(s,id).filter(n=>n.kind==='goal');
  function visible(s,focus,day){ensure(s);let all=nodes(s).filter(n=>n.kind!=='task'||(n.item.date===day||(!n.item.done&&n.item.date<day)));
    all=all.filter(n=>n.kind!=='commitment'||n.item.week===M.week(day));
    if(focus&&focus!=='all'){const family=new Set([focus,...related(s,focus,'children').map(n=>n.id)]);all=all.filter(n=>family.has(n.id));}
    const ids=new Set(all.map(n=>n.id));return {nodes:all,edges:s.goalMap.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
  }
  function candidateParents(s,id){const n=get(s,id);return nodes(s).filter(x=>levels.indexOf(x.level)<levels.indexOf(n.level)&&!s.goalMap.edges.some(e=>e.from===x.id&&e.to===id));}
  function create(s,input){ensure(s);const level=input.level;if(!levels.includes(level))throw Error('Choose a time horizon.');const title=clean(input.title),direction=input.direction==='less'?'less':'more';
    if(input.parent){const parent=get(s,input.parent);if(levels.indexOf(parent.level)>=levels.indexOf(level))throw Error('Choose a smaller time horizon than the connected item.');}
    if(input.parent&&get(s,input.parent).kind==='commitment'&&level==='daily'&&input.behavior==='once'&&M.week(input.date)!==get(s,input.parent).item.week)throw Error('Choose an action date in the commitment week.');
    const goalId=input.parent?(get(s,input.parent).kind==='goal'?get(s,input.parent).sourceId:supportingGoals(s,input.parent)[0]?.sourceId||''):'';
    let item,kind;
    if(level==='lifetime'){item=M.createGoal(s,{title,why:input.why,color:'green'});kind='goal';}
    else if(level==='year'){kind='milestone';item={id:uid(),title,goalId,done:false,why:String(input.why||'').slice(0,600)};s.milestones.push(item);}
    else if(level==='weekly'&&input.behavior==='target'){
      const target=Number(input.target);if(!Number.isInteger(target)||target<1||target>100)throw Error('Set a target between 1 and 100.');
      kind='commitment';item={id:uid(),title,goalId,milestoneId:'',target,week:M.week(input.date)};s.commitments.push(item);
    }else if(level==='daily'&&input.behavior==='once'){
      kind='task';item=M.createTask(s,{title,goalId,date:input.date,minutes:input.minutes||15});
    }else{
      const weekday=Number(input.weekday);if(level==='weekly'&&(!Number.isInteger(weekday)||weekday<0||weekday>6))throw Error('Choose a weekly check-in day.');
      kind='habit';item=M.createHabit(s,{title,type:direction==='less'?'bad':'good',goalId,date:M.key(new Date())});
      item.frequency=level==='weekly'?'weekly':'daily';item.weekdays=level==='weekly'?[weekday]:[];
    }
    item.mapDirection=direction;const id=kind+':'+item.id;
    // The map connection, including an intentional lack of one, is authoritative.
    s.goalMap.known.push(id);
    if(input.parent)connect(s,input.parent,id);
    return get(s,id);
  }
  function update(s,id,input){ensure(s);const n=get(s,id),title=clean(input.title),direction=input.direction==='less'?'less':'more';
    if(n.kind==='habit'&&n.item.frequency==='weekly'){
      const day=Number(input.weekday);if(!Number.isInteger(day)||day<0||day>6)throw Error('Choose a weekly check-in day.');n.item.weekdays=[day];
    }
    if(n.kind==='commitment'){const target=Number(input.target);if(!Number.isInteger(target)||target<1||target>100)throw Error('Set a target between 1 and 100.');n.item.target=target;}
    if(n.kind==='task'){
      M.date(input.date);const minutes=Number(input.minutes);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Choose 1 to 1,440 minutes.');
      if(n.item.date!==input.date){M.reschedule(s,n.sourceId,input.date);s.goalMap.edges=s.goalMap.edges.filter(e=>!(e.to===id&&e.from.startsWith('commitment:')&&get(s,e.from).item.week!==M.week(input.date)));}
      n.item.minutes=minutes;
    }
    n.item.title=title;n.item.mapDirection=direction;if(n.kind==='habit')n.item.type=direction==='less'?'bad':'good';
    if(['goal','milestone'].includes(n.kind))n.item.why=String(input.why||'').slice(0,600);
    return n;
  }
  function remove(s,id){
    ensure(s);const n=get(s,id);
    s[collections[n.kind]]=s[collections[n.kind]].filter(x=>x.id!==n.sourceId);
    s.goalMap.edges=s.goalMap.edges.filter(e=>e.from!==id&&e.to!==id);
    s.goalMap.known=s.goalMap.known.filter(x=>x!==id);
    // Clear legacy references without cascading deletion to connected records.
    const field={goal:'goalId',milestone:'milestoneId',commitment:'commitmentId'}[n.kind];
    if(field)for(const collection of Object.values(collections))for(const item of s[collection])if(item[field]===n.sourceId)item[field]='';
    if(n.kind==='habit')for(const logs of Object.values(s.logs))delete logs[n.sourceId];
    return n;
  }
  const api={levels,nodes,get,ensure,connect,disconnect,related,supportingGoals,visible,candidateParents,create,update,remove};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GoalMapModel=api;
})(globalThis);
