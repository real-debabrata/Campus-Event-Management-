(function(){
const LBL={owner:'Organizer',manager:'Manager',treasurer:'Treasurer',lead:'Team lead',member:'Member',viewer:'Viewer'};window.LBL=LBL;
const PERM={event:['owner','manager'],people:['owner','manager'],roles:['owner','manager'],tasks:['owner','manager','lead'],pay:['owner','manager','treasurer'],regs:['owner','manager','lead','treasurer'],write:['owner','manager','treasurer','lead','member'],exp:['owner','manager','treasurer'],items:['owner','manager','treasurer','lead']};   // exp = budget, vendors, vendor payments; items = create and assign items to buy
const me=()=>window.MYUID||'me',myName=()=>window.MYNAME||'Me';
window.myRole=e=>{if(!e.cloud)return 'owner';const m=(e.members||{})[me()],r=m&&m.role;return r==='organizer'?'owner':(r||'viewer')};
window.can=(e,a)=>PERM[a].includes(myRole(e));
const people=e=>[...Object.entries(e.members||{}).map(([id,m])=>({id,n:m.name,r:m.role==='organizer'?'owner':m.role,acct:1})),...(e.team||[]).map(m=>({id:m.id,n:m.n,r:m.r,boss:m.boss}))];
const mineIds=e=>[me(),...(e.team||[]).filter(m=>m.boss===me()).map(m=>m.id)];
const pn=(e,id)=>id==='me'?'Me':(people(e).find(p=>p.id===id)||{n:'Unassigned'}).n;
window.peopleOf=people;window.mineIdsOf=mineIds;window.pnOf=pn;   // used by expenses.js
const canTick=(e,k)=>can(e,'tasks')||mineIds(e).includes(k.who);
const assignees=e=>{let l=can(e,'tasks')?people(e):people(e).filter(p=>mineIds(e).includes(p.id));if(!e.cloud)l=[{id:'me',n:'Me'},...l];return [...l].sort((a,b)=>(b.id===me())-(a.id===me()))};
const st=document.createElement('style');
st.textContent='.st-pending{color:var(--mute)}.st-verified{color:var(--ok);font-weight:700}.st-rejected{color:var(--bad);font-weight:700}td select{padding:4px 6px}.tkw{border-bottom:1px solid var(--line)}.tdb{margin:2px 0 8px 26px;padding:8px 10px;background:var(--bg);border-left:3px solid var(--acc);border-radius:6px;white-space:pre-wrap;font-size:14px;overflow-wrap:anywhere}.tdb textarea{white-space:pre-wrap}';document.head.append(st);

const row=(e,k,del)=>{
 const own=assignees(e),ok=canTick(e,k);
 const opts=(own.some(x=>x.id===k.who)?own:[{id:k.who,n:pn(e,k.who)},...own]).map(x=>`<option value="${x.id}" ${x.id===k.who?'selected':''}>${esc(x.n)}</option>`).join('');
 const who=ok?`<select data-ra="${e.id}|${k.id}" aria-label="Assigned to" style="max-width:150px;padding:4px 6px">${opts}</select>`:`<span class="meta">${esc(pn(e,k.who))}</span>`;
 const key=e.id+'|'+k.id,open=(V.td||{})[key],canEd=can(e,'tasks')||k.by===me();
 const bt=k.desc?`<button class="btn ghost sm" data-td="${key}" aria-expanded="${open?'true':'false'}">Brief ${open?'&#9652;':'&#9662;'}</button>`:(canEd?`<button class="btn ghost sm" data-tde="${key}">+ Brief</button>`:'');
 const body=V.te===key?`<div class="tdb"><textarea id="tdx" rows="4" maxlength="600" placeholder="What should the assignee know? Steps, links, deadlines..." aria-label="Task description">${esc(k.desc||'')}</textarea><div class="row" style="margin-top:6px"><button class="btn sm" data-tds="${key}">Save</button><button class="btn ghost sm" data-tdc="1">Cancel</button></div></div>`:(open&&k.desc?`<div class="tdb">${esc(k.desc)}${canEd?`<div style="margin-top:6px"><button class="btn ghost sm" data-tde="${key}">Edit brief</button></div>`:''}</div>`:'');
 return `<div class="tkw"><div class="row" style="padding:6px 0"><input type="checkbox" data-mt="${e.id}|${k.id}" ${k.done?'checked':''} ${ok?'':'disabled'} aria-label="Mark done"><span style="flex:1;min-width:120px;${k.done?'text-decoration:line-through;color:var(--mute)':''}">${esc(k.t)}</span>${who}<span class="meta">${k.due?'due '+k.due:''}</span>${bt}${del&&(can(e,'tasks')||k.by===me())?`<button class="btn ghost sm del" data-tkdel="${k.id}">Delete</button>`:''}</div>${body}</div>`};
window.mineCount=()=>{let n=0;S.events.forEach(e=>{const ids=mineIds(e);n+=(e.tasks||[]).filter(k=>!k.done&&ids.includes(k.who)).length+(window.mineItemsN?mineItemsN(e):0)});return n?' ('+n+')':''};
window.mine=()=>{
 const b=S.events.map(e=>{const ids=mineIds(e),ts=(e.tasks||[]).filter(k=>ids.includes(k.who)),it=window.mineItemsV?mineItemsV(e):'';return ts.length||it?`<div class="card"><h3>${esc(e.name)}</h3>${ts.map(k=>row(e,k,0)).join('')}${it}</div>`:''}).join('');
 return '<h2 style="margin-bottom:12px">My tasks</h2><p class="meta">Tasks and items to buy assigned to you and to your subordinates, across all events.</p>'+(b||'<div class="empty">Nothing assigned to you yet.</div>');
};
window.tasksV2=function(e){
 const all=e.tasks,vis=V.tm?all.filter(k=>mineIds(e).includes(k.who)):all,dn=all.filter(k=>k.done).length,p=all.length?Math.round(dn/all.length*100):0;
 const opts=assignees(e).map(a=>`<option value="${a.id}">${esc(a.n)}</option>`).join('');
 return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Tasks</h3><span class="meta">${dn} of ${all.length} done</span></div>
 <div class="bar" style="margin:8px 0 12px"><i style="width:${p}%;background:var(--ok)"></i></div>
 <div class="chips" style="margin:0"><button class="chip ${V.tm?'':'on'}" data-tm="0">All tasks</button><button class="chip ${V.tm?'on':''}" data-tm="1">Mine and my team</button></div>
 ${can(e,'tasks')?`<form id="grf" class="row" style="margin-top:12px"><input name="n" required placeholder="New task group, e.g. Logistics" style="flex:1;min-width:160px"><button class="btn" type="submit">Add group</button><button type="button" class="btn ghost" data-grstd="1">Add standard groups</button></form>`:''}</div>
 ${e.groups.map(g=>{const gt=all.filter(k=>k.gid===g.id);return `<div class="card"><div class="row" style="justify-content:space-between"><h3>${esc(g.n)}</h3><span class="meta">${gt.filter(k=>k.done).length}/${gt.length} done ${can(e,'tasks')?`<button class="btn ghost sm del" data-grdel="${g.id}">Delete group</button>`:''}</span></div>
 ${vis.filter(k=>k.gid===g.id).map(k=>row(e,k,1)).join('')||'<p class="meta">No tasks here.</p>'}
 ${can(e,'write')?`<form class="row tk2" data-gid="${g.id}" style="margin-top:10px"><input name="t" required placeholder="New task" style="flex:2;min-width:140px"><select name="w" style="flex:1;min-width:120px">${opts}</select><input name="d" type="date" style="flex:1;min-width:130px"><textarea name="x" rows="2" maxlength="600" placeholder="Description for the assignee (optional)" aria-label="Task description" style="flex:1 1 100%"></textarea><button class="btn sm" type="submit">Add task</button></form>`:''}</div>`}).join('')||'<div class="empty">No task groups yet.</div>'}`;
};
window.peopleV=function(e){
 const mr=myRole(e),asg=mr==='owner'?['manager','treasurer','lead','member','viewer']:['treasurer','lead','member','viewer'];
 const canRole=p=>can(e,'roles')&&p.id!==me()&&p.r!=='owner'&&(mr==='owner'||p.r!=='manager');
 const sel=p=>canRole(p)?`<select data-role="${p.id}" aria-label="Role">${asg.map(r=>`<option value="${r}" ${p.r===r?'selected':''}>${LBL[r]}</option>`).join('')}</select>`:(LBL[p.r]||esc(p.r||'Member'));
 const all=people(e);
 const tr=p=>{const t=e.tasks.filter(k=>k.who===p.id);
  const act=p.acct?(canRole(p)?`<button class="btn ghost sm del" data-rmm="${p.id}">Remove</button>`:''):(can(e,'people')||p.boss===me()?`<button class="btn ghost sm del" data-tmdel="${p.id}">Remove</button>`:'');
  return `<tr><td>${esc(p.n)}${p.id===me()?' (you)':''}</td><td>${p.acct?sel(p):esc(p.r||'Member')}</td><td>${p.acct?'-':esc(p.boss?pn(e,p.boss):'-')}</td><td>${t.filter(k=>k.done).length}/${t.length}</td><td>${act}</td></tr>`};
 const team=`<div class="card"><h3>Team members (${all.length})</h3><p class="meta">${e.cloud?'Everyone who joins with the event code is added here automatically and appears in the task assign list.':'Tap Share with team above to invite members. They will appear here automatically.'}</p>${all.length?`<div class="tbl"><table><tr><th>Name</th><th>Role / title</th><th>Reports to</th><th>Tasks</th><th></th></tr>${all.map(tr).join('')}</table></div>`:'<p class="meta">No one yet.</p>'}
 <details style="margin-top:10px"><summary class="meta">What each role can do</summary><p class="meta">Organizer: everything, including deleting the event.<br>Manager: edit the event, manage people and roles, tasks and payments.<br>Treasurer: verify payments, plus everything a member can do.<br>Team lead: create task groups, assign to anyone, check in attendees.<br>Member: tick their own tasks, add subordinates, assign tasks to themselves and them, create payment links.<br>Viewer: read only.</p></details></div>`;
 const boss=can(e,'people')?`<div><label>Reports to</label><select name="b"><option value="">Nobody (top level)</option>${all.map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select></div>`:'';
 const add=can(e,'write')?`<div class="card"><h3>${can(e,'people')?'Add a team member':'Add a subordinate'}</h3><p class="meta">For people without the app, such as volunteers.</p><form id="mbf" class="two"><div><label>Name *</label><input name="n" required></div><div><label>Title</label><input name="r" placeholder="Volunteer, Designer"></div><div><label>Phone</label><input name="p"></div>${boss}<div style="align-self:end"><button class="btn" type="submit">Add</button></div></form></div>`:'';
 return team+add+teamsV(e);
};
const ST={pending:'Pending',verified:'Verified',rejected:'Rejected'};
const payBase=()=>{const c=window.PAY_BASE;if(c)return c.replace(/\/?$/,'/');if(/^https?:/.test(location.protocol)&&!/^(localhost|127\.)/.test(location.hostname))return location.origin+location.pathname.replace(/[^/]*$/,'');try{return localStorage.getItem('pay-base')||''}catch(x){return ''}};
const ulink=f=>`upi://pay?pa=${encodeURIComponent(f.upi)}&pn=${encodeURIComponent(f.payee||'')}${f.amt?'&am='+f.amt:''}&cu=INR&tn=${encodeURIComponent(f.title)}`;
window.payV2=function(e){
 const base=payBase(),mgr=can(e,'pay'),fs=(e.forms||[]).filter(f=>mgr||f.by===me());
 const subs=fs.flatMap(f=>((window.SUBS||{})[f.id]||[]).map(x=>Object.assign({},x,{fid:f.id,key:f.id+'|'+x.id,pub:1})));
 const leg=mgr?(e.payments||[]).map(p=>Object.assign({},p,{key:p.id,pub:0})):[];
 const rows=[...subs,...leg].sort((x,y)=>(y.at||0)-(x.at||0));
 const sum=s=>rows.filter(p=>p.s===s).reduce((t,p)=>t+p.a,0),old=mgr?(e.don||[]).reduce((t,x)=>t+x.a,0):0;
 const link=f=>base+'pay.html?f='+f.id;
 const until=window.untilOf?untilOf(e):0,over=!!until&&Date.now()>until,grace=Math.max(0,Math.min(30,+((e.pay||{}).grace)||0)),dts=t=>new Date(t).toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'});
 return `<div class="stats"><div class="stat"><b>₹${sum('verified')+old}</b><span>Verified</span></div><div class="stat"><b>₹${sum('pending')}</b><span>Pending check</span></div><div class="stat"><b>${rows.length}</b><span>Submissions</span></div><div class="stat"><b>${fs.length}</b><span>Payment links</span></div></div>
 ${base?'':`<div class="card"><h3>Set your public site address</h3><p class="meta">Payment links open a page named pay.html on your website, for example https://yourname.github.io/your-repo/</p><form id="pbf" class="row"><input name="b" required placeholder="https://yourname.github.io/your-repo/" style="flex:1;min-width:200px"><button class="btn" type="submit">Save</button></form></div>`}
 ${e.cloud&&mgr?`<div class="card"><h3>Link expiry</h3><p class="meta">Every payment link belongs to this event. It stops working ${over?'<b>(it has)</b> ':''}at the end of the event day (${dts(new Date(e.date+'T00:00:00'))})${grace?' plus '+grace+' extra day'+(grace>1?'s':''):''}, and it is removed when the event is deleted. Payers then see an "expired" message.</p><form id="pgf" class="row"><label style="margin:0">Keep links open</label><input name="g" type="number" min="0" max="30" value="${grace}" style="width:80px" aria-label="Extra days"><span class="meta">extra days after the event</span><button class="btn sm" type="submit">Save</button></form></div>`:''}
 ${can(e,'write')&&e.cloud&&over?'<div class="card"><h3>Create a payment link</h3><p class="meta">This event is over, so a new link would already be expired. Change the event date or keep links open for extra days to create one.</p></div>':can(e,'write')&&e.cloud?`<div class="card"><h3>Create a payment link</h3><p class="meta">Anyone with the link can pay by scanning the QR code, then come back to the page and submit their name and UTR. They don't need an account.</p><form id="pfc" class="two"><div><label>Title *</label><input name="t" required placeholder="Registration fee, Donation"></div><div><label>Amount in ₹ (blank for any)</label><input name="a" type="number" min="1"></div><div><label>UPI ID *</label><input name="u" required value="${esc((e.pay||{}).upi||'')}" placeholder="name@bank"></div><div><label>Payee name *</label><input name="p" required value="${esc((e.pay||{}).payee||'')}"></div><div style="grid-column:1/-1"><label>Note shown to payers</label><input name="n"></div><div><button class="btn" type="submit">Create link</button></div></form></div>`:(e.cloud?'':'<div class="card"><p class="meta">Tap Share with team above first. Payment links need a shared event.</p></div>')}
 ${fs.length?`<div class="grid">${fs.map(f=>`<div class="card"><div class="row" style="justify-content:space-between"><h3>${esc(f.title)}</h3>${mgr||f.by===me()?`<button class="btn ghost sm del" data-act="fd" data-id="${f.id}">Delete</button>`:''}</div>
 <p class="meta">${f.amt?'Amount: ₹'+f.amt:'Any amount'}, created by ${esc(f.byName||'')}<br>${over?'<span class="st-rejected">Expired</span> on '+dts(until):'Valid until '+dts(until)}</p>${over?'':qrSvg(ulink(f))}
 <p class="meta">UPI ID: <b>${esc(f.upi)}</b><br>Payee: <b>${esc(f.payee)}</b></p>
 ${over?'<p class="meta">This link no longer works for payers. Extend the days above, or change the event date, to open it again.</p>':base?`<input readonly value="${esc(link(f))}" onclick="this.select()" aria-label="Payment link"><div class="row" style="margin-top:8px"><button class="btn sm" data-copy="${esc(link(f))}">Copy link</button><button class="btn ghost sm" data-shl="${esc(link(f))}" data-t="${esc(f.title)}">Share</button></div>`:''}</div>`).join('')}</div>`:''}
 <div class="card"><h3>Payments received (${rows.length})</h3>${rows.length?`<div class="tbl"><table><tr><th>Date</th><th>Name</th><th>Link</th><th>Amount</th><th>UTR</th><th>Status</th><th></th></tr>${rows.map(p=>{const f=fs.find(q=>q.id===p.fid);const ok=p.pub?true:mgr,pre=p.pub?'s':'p';return `<tr><td>${new Date(p.at).toLocaleDateString()}</td><td>${esc(p.n)}</td><td>${esc(f?f.title:'-')}</td><td>₹${p.a}</td><td>${esc(p.utr)}</td><td class="st-${p.s}">${ST[p.s]||p.s}</td><td>${ok?`${p.s!=='verified'?`<button class="btn ghost sm" data-act="${pre}v" data-id="${p.key}">Verify</button> `:''}${p.s!=='rejected'?`<button class="btn ghost sm" data-act="${pre}r" data-id="${p.key}">Reject</button> `:''}<button class="btn ghost sm del" data-act="${pre}d" data-id="${p.key}">Delete</button>`:''}</td></tr>`}).join('')}</table></div>`:'<p class="meta">Submissions from your payment links appear here automatically.</p>'}</div>`;
};
document.addEventListener('click',x=>{
 const t=x.target.closest('button');if(!t)return;const D=t.dataset,E=cur();
 if(D.tm!==undefined){V.tm=D.tm==='1';render()}
 else if(D.td){V.td=V.td||{};V.td[D.td]=!V.td[D.td];render()}
 else if(D.tde){V.td=V.td||{};V.td[D.tde]=1;V.te=D.tde;render();const a=document.getElementById('tdx');if(a)a.focus()}
 else if(D.tdc){V.te=null;render()}
 else if(D.tds){const q=D.tds.split('|'),e1=S.events.find(z=>z.id===q[0]),k=e1&&e1.tasks.find(z=>z.id===q[1]);
  if(k&&(can(e1,'tasks')||k.by===me())){const v=(document.getElementById('tdx').value||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,600);if(v)k.desc=v;else delete k.desc;V.te=null;V.td=V.td||{};V.td[D.tds]=!!v;sv()}}
 else if(D.rmm&&E){if(confirm('Remove this member from the event?'))window.rmMember(E.id,D.rmm)}
 else if(D.shl){if(navigator.share)navigator.share({title:D.t,url:D.shl}).catch(()=>{});else{try{navigator.clipboard.writeText(D.shl);toast('Link copied')}catch(q){}}}
 else if(D.act&&E){const k=D.act;
  if(k[0]==='s'){const p=D.id.split('|');window.subAct(p[0],p[1],k)}
  else if(k==='fd'){if(!confirm('Delete this payment link and the payments submitted through it?'))return;E.forms=E.forms.filter(f=>f.id!==D.id);if(window.pubDel)pubDel(D.id);sv()}
  else{const p=E.payments.find(q=>q.id===D.id);if(!p)return;
   if(k==='pv')p.s='verified';else if(k==='pr')p.s='rejected';else if(k==='pd')E.payments=E.payments.filter(q=>q.id!==D.id);sv()}}
});
document.addEventListener('change',x=>{
 const t=x.target;
 if(t.dataset.mt){const [eid,tid]=t.dataset.mt.split('|'),ev1=S.events.find(q=>q.id===eid),k=ev1&&ev1.tasks.find(q=>q.id===tid);if(k&&canTick(ev1,k)){k.done=t.checked;sv()}}
 else if(t.dataset.ra){const q=t.dataset.ra.split('|'),ev1=S.events.find(z=>z.id===q[0]),k=ev1&&ev1.tasks.find(z=>z.id===q[1]);if(k&&canTick(ev1,k)&&assignees(ev1).some(a=>a.id===t.value)){k.who=t.value;sv()}else render()}
 else if(t.dataset.role)window.setRole(cur().id,t.dataset.role,t.value);
});
document.addEventListener('submit',x=>{
 const f=x.target,E=cur(),fd=new FormData(f),g=k=>(fd.get(k)||'').toString().trim();
 if(f.id==='pgf'){if(!can(E,'pay'))return;const g2=Math.max(0,Math.min(30,Math.round(+g('g'))||0));E.pay=Object.assign(E.pay||{},{grace:g2});sv();toast(g2?'Links stay open '+g2+' extra day'+(g2>1?'s':''):'Links close at the end of the event day')}
 else if(f.id==='pfc'){if(!E.cloud)return;if(window.untilOf&&Date.now()>untilOf(E))return toast('This event is over, so the link would already be expired');const id=(uid()+uid()).slice(0,12),fm={id,title:g('t'),amt:+g('a')||0,upi:g('u'),payee:g('p'),note:g('n'),by:me(),byName:myName(),at:Date.now()};E.forms.push(fm);E.pay=Object.assign(E.pay||{},{upi:g('u'),payee:g('p')});window.pubForm(fm,E);sv();toast('Payment link created')}
 else if(f.id==='pbf'){try{localStorage.setItem('pay-base',g('b').replace(/\/?$/,'/'))}catch(q){}render()}
 else if(f.classList.contains('tk2')){const w=g('w')||me();if(!assignees(E).some(a=>a.id===w))return toast('You can only assign to yourself or your subordinates');
  const dsc=g('x').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').slice(0,600),tk={id:uid(),gid:f.dataset.gid,t:g('t'),who:w,due:g('d'),done:false,by:me()};if(dsc)tk.desc=dsc;E.tasks.push(tk);sv();toast('Task added')}
 else if(f.id==='mbf'){E.team.push({id:uid(),n:g('n'),r:g('r')||'Member',p:g('p'),boss:can(E,'people')?g('b'):me()});sv();toast('Added')}
});
})();
