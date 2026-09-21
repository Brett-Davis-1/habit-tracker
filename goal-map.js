window.GoalMapUI={create(ctx){
  'use strict';
  const {M,G,esc,icon,button,ib,field,select,form,openDialog,mutate,nav,dialog}=ctx;
  const names={lifetime:'Lifetime',year:'This year',weekly:'Weekly',daily:'Daily'};
  const hints={lifetime:'The life you want',year:'Meaningful outcomes',weekly:'Make room for it',daily:'Your small steps'};
  const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let active='',focus='',zoom='fit';
  const state=()=>ctx.state(),day=()=>ctx.day();
  const option=(value,label,chosen)=>`<option value="${esc(value)}" ${value===chosen?'selected':''}>${esc(label)}</option>`;
  const nodeOptions=(list,chosen='',empty='Choose an item')=>option('',empty,chosen)+list.map(n=>option(n.id,n.title+' · '+names[n.level],chosen)).join('');
  function status(n){const x=n.item;
    if(n.kind==='habit'){const log=state().logs[day()]?.[x.id];return log?{text:log.outcome==='good'?'Positive check-in':'Missed check-in',tone:log.outcome}:{text:M.habitDueOn(x,day())?'Ready to check in':'Not scheduled today',tone:''};}
    if(n.kind==='task')return {text:x.done?'Completed':x.date<day()?'Needs a new date':'Planned · '+ctx.pretty(x.date),tone:x.done?'good':''};
    if(n.kind==='commitment'){const count=M.commitmentCount(state(),x);return {text:`${count} / ${x.target} linked actions`,tone:count>=x.target?'good':''};}
    if(n.kind==='milestone')return {text:x.done?'Milestone reached':'Outcome to work toward',tone:x.done?'good':''};
    return {text:'A direction, not a finish line',tone:''};
  }
  function description(n){if(n.kind==='habit')return n.item.frequency==='weekly'?'Every '+weekdays[n.item.weekdays?.[0]??1]:'Repeats daily';if(n.kind==='task')return 'One-off action';if(n.kind==='commitment')return 'This week · action target';return n.level==='lifetime'?'Larger goal':'Yearly outcome';}
  function mobileMap(graph){return `<section class="mobile-map" aria-label="Your connected goals and steps">${G.levels.map(level=>`<section class="mobile-map-level"><header><div><h2>${names[level]}</h2><p>${hints[level]}</p></div>${ib('plus','map-new','Add '+names[level]+' item',`data-level="${level}"`)}</header>${graph.nodes.filter(n=>n.level===level).map(n=>{const parents=state().goalMap.edges.filter(e=>e.to===n.id).map(e=>G.get(state(),e.from).title);return `<article class="mobile-map-card ${n.direction==='less'?'less':''}"><button type="button" class="mobile-map-main" data-action="map-edit" data-id="${esc(n.id)}"><small>${n.direction==='less'?'Reduce / avoid':description(n)}</small><strong>${esc(n.title)}</strong><small>${esc(status(n).text)}</small></button><button type="button" class="map-delete-card" data-action="map-delete" data-id="${esc(n.id)}" aria-label="Delete ${esc(n.title)}">${icon('x')}</button>${parents.length?`<p>Supports: ${parents.map(esc).join(' / ')}</p>`:''}${level!=='daily'?button('+ Supporting step','map-new',`data-parent="${esc(n.id)}"`,'quiet'):''}</article>`;}).join('')||'<p class="field-hint">Nothing here yet. Start here or connect a step from another level.</p>'}</section>`).join('')}</section>`;}
  function render(routeId){
    G.ensure(state());const roots=G.nodes(state()).filter(n=>n.kind==='goal');
    if(routeId&&roots.some(n=>n.sourceId===routeId))focus='goal:'+routeId;
    else if(!focus)focus=roots[0]?.id||'all';
    if(focus!=='all'&&!roots.some(n=>n.id===focus))focus='all';
    const graph=G.visible(state(),focus,day()),byLevel=G.levels.map(l=>graph.nodes.filter(n=>n.level===l));
    const skips=graph.edges.filter(e=>G.levels.indexOf(G.get(state(),e.to).level)-G.levels.indexOf(G.get(state(),e.from).level)>1);
    const top=38+skips.length*13,max=Math.max(2,...byLevel.map(ns=>ns.length)),height=top+max*166+25,width=1196,positions=new Map();
    byLevel.forEach((ns,col)=>ns.forEach((n,row)=>positions.set(n.id,{x:28+col*300,y:top+row*166+(max-ns.length)*45})));
    const family=new Set(active?[active,...G.related(state(),active).map(n=>n.id),...G.related(state(),active,'children').map(n=>n.id)]:[]);
    const lines=graph.edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return '';const x=a.x+236,y=a.y+57,tx=b.x,ty=b.y+57,lane=skips.findIndex(s=>s.id===e.id);let d;
      if(lane>=0){const ly=14+lane*13;d=`M${x},${y}h10q8,0 8,-8V${ly+8}q0,-8 8,-8H${tx-22}q8,0 8,8V${ty-8}q0,8 8,8h6`;}
      else d=`M${x},${y} C${x+34},${y} ${tx-34},${ty} ${tx},${ty}`;
      const less=G.get(state(),e.to).direction==='less',highlight=!active||(family.has(e.from)&&family.has(e.to));return `<path d="${d}" class="map-edge ${less?'less':''} ${highlight?'':'faded'}" marker-end="url(#map-arrow-${less?'less':'more'})"/>`;
    }).join('');
    return `<header class="page-header"><div><p class="eyebrow">THE BIG PICTURE</p><h1>Your goal map<span class="green">.</span></h1><p class="muted">Start with what matters. Build the steps that support it.</p></div>${button(icon('plus')+' Add item','map-new','','primary')}</header>
      <div class="map-toolbar"><label class="map-filter">Explore <select id="map-focus" aria-label="Focus on a goal">${option('all','All goals & unlinked items',focus)}${roots.map(n=>option(n.id,n.title,focus)).join('')}</select></label><div class="map-view-controls">${button('Fit map','map-fit',`aria-pressed="${zoom==='fit'}"`,'quiet')}${button('Enlarge','map-enlarge',`aria-pressed="${zoom==='large'}"`,'quiet')}</div><div class="map-legend"><span><i></i>Build / do more</span><span><i class="less"></i>Reduce / avoid</span></div></div>
      <div class="map-intro"><span>${icon('spark')} Click an item to edit, connect, or check in.</span><span>Showing ${ctx.pretty(day())} and its weekly commitments. ${button(icon('calendar'),'calendar','aria-label="Change map date"','quiet')}</span></div>
      <section class="map-surface" aria-label="Goal map"><div class="map-scroll" tabindex="0" aria-label="Scroll horizontally to explore the four time horizons"><div class="map-board" style="width:${width}px"><div class="map-headings">${G.levels.map(l=>`<div><span class="eyebrow">${names[l]}</span><p>${hints[l]}</p>${ib('plus','map-new','Add '+names[l]+' item',`data-level="${l}"`)}</div>`).join('')}</div><div class="map-canvas" style="height:${height}px"><div class="map-guides">${G.levels.map(()=>'<div></div>').join('')}</div><svg class="map-connections" width="${width}" height="${height}" aria-hidden="true"><defs><marker id="map-arrow-more" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#778e63"/></marker><marker id="map-arrow-less" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ad6870"/></marker></defs>${lines}</svg>
      ${graph.nodes.map(n=>{const p=positions.get(n.id),st=status(n);return `<article class="map-node ${n.direction==='less'?'less':''} ${n.id===active?'active':''} ${active&&!family.has(n.id)?'muted-node':''}" style="left:${p.x}px;top:${p.y}px"><button class="map-node-main" data-action="map-edit" data-id="${esc(n.id)}" aria-label="Edit ${esc(n.title)}"><span class="map-node-type">${n.direction==='less'?'Reduce / avoid':description(n)}</span><strong title="${esc(n.title)}">${esc(n.title)}</strong><span class="map-node-status ${st.tone}">${st.tone==='good'?icon('check'):''}${st.text}</span></button><button type="button" class="map-delete-card" data-action="map-delete" data-id="${esc(n.id)}" aria-label="Delete ${esc(n.title)}" title="Delete card">${icon('x')}</button>${n.level!=='daily'?`<button class="map-add-child" data-action="map-new" data-parent="${esc(n.id)}" aria-label="Add a step that supports ${esc(n.title)}">${icon('plus')}</button>`:''}</article>`;}).join('')}
      ${byLevel.map((ns,i)=>ns.length?'':`<button class="map-empty-column" style="left:${28+i*300}px;top:${top+70}px" data-action="map-new" data-level="${G.levels[i]}">${icon('plus')} Add ${names[G.levels[i]].toLowerCase()} item</button>`).join('')}</div></div></div></section>
      ${mobileMap(graph)}<div class="map-bottom"><p>Arrows lead from a bigger goal to the steps that support it. Red outlines describe what to reduce, not a failed check-in.</p><span>${graph.nodes.length} items · ${graph.edges.length} connections</span></div>
      <section class="map-today-link"><span>${icon('sun')} Build here. Follow through in Today.</span>${button('Go to my day '+icon('arrow'),'map-today','','quiet')}</section>`;
  }
  function scheduleFields(level,behavior,x={}){
    if(level==='weekly'&&behavior==='habit')return select('Check in every','weekday',weekdays.map((name,i)=>option(String(i),name,String(x.weekdays?.[0]??M.date(day()).getDay()))).join(''));
    if(level==='weekly')return field('Completed actions to aim for this week','target',x.target||3,'number','min="1" max="100" required');
    if(level==='daily'&&behavior==='once')return `<div class="form-grid">${field('Scheduled for','date',x.date||day(),'date','required')}${field('Minutes to make room for','minutes',x.minutes||15,'number','min="1" max="1440" required')}</div>`;
    if(level==='daily')return '<p class="field-hint">Repeats every day from today. It appears in Today for one editable check-in.</p>';
    return `<div class="field"><label for="field-why">Why does this matter?</label><textarea id="field-why" name="why" maxlength="600" rows="2">${esc(x.why||'')}</textarea></div>`;
  }
  function behaviorChoices(level,chosen){if(level==='weekly')return select('How will you follow through?','behavior',option('habit','A repeating weekly habit',chosen)+option('target','A target for linked actions this week',chosen));if(level==='daily')return select('How will you follow through?','behavior',option('habit','A repeating daily habit',chosen)+option('once','A one-off action',chosen));return '';}
  function newDialog(parent='',level=''){
    const p=parent?G.get(state(),parent):null;level=level||(p?G.levels[Math.min(3,G.levels.indexOf(p.level)+1)]:'lifetime');
    const behavior=p?.kind==='commitment'&&level==='daily'?'once':'habit';
    openDialog(p?'Add a supporting step':'Start anywhere',form('map-create',
      field('Name this step or goal','title','','text','required maxlength="180" placeholder="e.g. Go for a walk"')+
      select('Where does it fit?','level',G.levels.filter(l=>!p||G.levels.indexOf(l)>G.levels.indexOf(p.level)).map(l=>option(l,names[l],level)).join(''))+
      `<div id="map-behavior">${behaviorChoices(level,behavior)}</div>`+
      select('What direction does this represent?','direction',option('more','Build / do more','more')+option('less','Reduce / avoid','more'))+
      `<div id="map-schedule">${scheduleFields(level,behavior)}</div>`+
      `<div id="map-parent-field">${select('This supports','parent',nodeOptions(G.nodes(state()).filter(n=>G.levels.indexOf(n.level)<G.levels.indexOf(level)),parent,'Keep it unlinked for now'))}</div>`,
      'Add to my map'),p?`This step supports <strong>${esc(p.title)}</strong>. Skip a level if it makes more sense.`:'Begin with an ambition or an everyday action. You can make connections later.');
  }
  function editDialog(id){active=id;const n=G.get(state(),id),x=n.item;ctx.render();const behavior=n.kind==='task'?'once':n.kind==='commitment'?'target':'habit';
    const parents=state().goalMap.edges.filter(e=>e.to===id),children=state().goalMap.edges.filter(e=>e.from===id);
    const links=(list,parent)=>list.map(e=>{const other=G.get(state(),parent?e.from:e.to);return `<div class="map-link-row"><span><strong>${esc(other.title)}</strong><small>${names[other.level]}</small></span>${ib('x','map-unlink','Disconnect '+other.title,`data-edge="${e.id}" data-node="${esc(id)}"`)}</div>`;}).join('');
    let checkin='';
    if(n.kind==='habit'){const log=state().logs[day()]?.[x.id],due=M.habitDueOn(x,day())||log;checkin=`<section class="map-checkin"><h3>${ctx.pretty(day())} check-in</h3><p class="field-hint">${due?'Self-reported. Change your answer whenever you need to.':'This habit is not scheduled on the selected day.'}</p><div class="vote-labels">${button(x.type==='bad'?'I avoided the temptation':'I did this','map-vote',`data-id="${esc(id)}" data-outcome="good" aria-pressed="${log?.outcome==='good'}" ${!due||day()>M.key(new Date())?'disabled':''}`,'positive-label')}${button(x.type==='bad'?'I gave into temptation':'I skipped it','map-vote',`data-id="${esc(id)}" data-outcome="bad" aria-pressed="${log?.outcome==='bad'}" ${!due||day()>M.key(new Date())?'disabled':''}`,'negative-label')}</div>${log?button('Undo check-in','map-undo',`data-id="${esc(id)}"`,'quiet'):''}</section>`;}
    if(n.kind==='task'||n.kind==='milestone')checkin=`<section class="map-checkin">${button(x.done?'Reopen '+(n.kind==='task'?'action':'milestone'):'Mark '+(n.kind==='task'?'action':'milestone')+' complete','map-complete',`data-id="${esc(id)}"`)}<p class="field-hint">Self-reported progress</p></section>`;
    openDialog('Shape this '+(n.kind==='goal'?'goal':'step'),
      button('Delete card','map-delete',`data-id="${esc(id)}"`,'danger')+form('map-update',`<p class="eyebrow muted">${names[n.level]} · ${description(n)}</p>`+field('Name','title',x.title,'text','required maxlength="180"')+
      select('Direction','direction',option('more','Build / do more',n.direction)+option('less','Reduce / avoid',n.direction))+
      scheduleFields(n.level,behavior,x),'Save changes',`data-id="${esc(id)}"`)+checkin+
      `<section class="map-relationships"><h3>This supports</h3>${links(parents,true)||'<p class="field-hint">No bigger goal connected yet.</p>'}${button(icon('plus')+' Connect to an existing goal or step','map-connect',`data-id="${esc(id)}" style="margin-top:12px"`,'quiet')}
      <h3 style="margin-top:22px">Supported by</h3>${links(children,false)||'<p class="field-hint">No smaller steps connected yet.</p>'}${n.level!=='daily'?button(icon('plus')+' Add a supporting step','map-new',`data-parent="${esc(id)}" style="margin-top:12px"`):''}</section>`);
  }
  function deleteDialog(id){const n=G.get(state(),id);
    openDialog('Delete this card?',`<p class="dialog-description">Delete <strong>${esc(n.title)}</strong> from the map and anywhere else it appears in the app? This cannot be undone.</p><p class="dialog-description">Only this item and its connections will be removed. Connected cards and your journal will stay.</p>${n.kind==='habit'?'<p class="dialog-description">All check-in history for this habit will also be deleted, changing past summaries.</p>':n.kind==='task'?'<p class="dialog-description">This action will no longer count toward completed actions or weekly targets.</p>':''}<div class="form-actions">${button('Cancel','close')}${button('Delete card','map-delete-confirm',`data-id="${esc(id)}"`,'danger')}</div>`);
  }
  function connectDialog(id){const options=G.candidateParents(state(),id),n=G.get(state(),id);openDialog('What does this support?',options.length?form('map-connect',`<p class="dialog-description">Connect <strong>${esc(n.title)}</strong> to a bigger goal or step. Existing connections stay in place.</p>`+select('Choose an existing item','parent',nodeOptions(options)),'Connect items',`data-id="${esc(id)}"`):'<p class="empty">There are no other items in a bigger time horizon to connect. Add one to your map first.</p>');}
  function submit(f){const data=Object.fromEntries(new FormData(f));try{
    let created;
    mutate(()=>{if(f.dataset.form==='map-create')created=G.create(state(),{...data,date:data.date||day()});if(f.dataset.form==='map-update')G.update(state(),f.dataset.id,data);if(f.dataset.form==='map-connect')G.connect(state(),data.parent,f.dataset.id);},'Your map is saved.');
    dialog.close();
    if(created){active=created.id;const roots=G.supportingGoals(state(),created.id);focus=created.kind==='goal'?created.id:roots[0]?.id||'all';if(location.hash!=='#goals')nav('goals');else ctx.render();}
    else editDialog(f.dataset.id);
  }catch(error){document.querySelector('#form-error').textContent=error.message;}}
  function change(event){const el=event.target;if(el.id==='map-focus'){focus=el.value;active='';if(location.hash!=='#goals')nav('goals');else ctx.render();return;}
    const f=el.closest('[data-form="map-create"]');if(!f)return;
    const level=f.elements.level.value;
    if(el.name==='level'){
      document.querySelector('#map-behavior').innerHTML=behaviorChoices(level,'habit');
      const parent=f.elements.parent.value;
      document.querySelector('#map-parent-field').innerHTML=select('This supports','parent',nodeOptions(G.nodes(state()).filter(n=>G.levels.indexOf(n.level)<G.levels.indexOf(level)),parent,'Keep it unlinked for now'));
    }
    if(['level','behavior'].includes(el.name))document.querySelector('#map-schedule').innerHTML=scheduleFields(level,f.elements.behavior?.value||'habit');
  }
  const actions={
    'map-delete':e=>deleteDialog(e.dataset.id),
    'map-delete-confirm':e=>{mutate(()=>{G.remove(state(),e.dataset.id);active='';focus='all';},'Card deleted. Connected cards were kept.');dialog.close();if(location.hash!=='#goals')nav('goals');},
    'map-fit':()=>{zoom='fit';layout();},'map-enlarge':()=>{zoom='large';layout();},
    'task-edit':e=>editDialog('task:'+e.dataset.id),
    'map-new':e=>newDialog(e.dataset.parent||'',e.dataset.level||''),
    'map-edit':e=>editDialog(e.dataset.id),'map-connect':e=>connectDialog(e.dataset.id),
    'map-unlink':e=>{mutate(()=>G.disconnect(state(),e.dataset.edge),'Connection removed. The item and its history are kept.');editDialog(e.dataset.node);},
    'map-vote':e=>{const n=G.get(state(),e.dataset.id);mutate(()=>M.setHabit(state(),n.sourceId,day(),e.dataset.outcome),'Check-in saved');editDialog(e.dataset.id);},
    'map-undo':e=>{const n=G.get(state(),e.dataset.id);mutate(()=>M.setHabit(state(),n.sourceId,day(),null),'Check-in removed');editDialog(e.dataset.id);},
    'map-complete':e=>{const n=G.get(state(),e.dataset.id);mutate(()=>{if(n.kind==='task')M.setTaskDone(state(),n.sourceId,!n.item.done);else n.item.done=!n.item.done;},'Progress updated');editDialog(e.dataset.id);},
    'map-today':()=>nav('today')
  };
  function layout(){const board=document.querySelector('.map-board'),surface=document.querySelector('.map-scroll');if(!board||!surface?.clientWidth)return;
    const fit=zoom==='fit'&&window.innerWidth>650;board.style.zoom=fit?Math.min(1,surface.clientWidth/1196):1;
    document.querySelectorAll('[data-action="map-fit"],[data-action="map-enlarge"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===(zoom==='fit'?'map-fit':'map-enlarge'))));
  }
  return {render,submit,change,actions,layout};
}};
