/* CEM 3.1.0: expenses management.
   Budget lines, vendors / parties, payments to them, and a shopping list whose items are allocated to members.
   Data lives inside the event document (fields bud, ven, exp, itm), so it syncs, works offline and costs no extra reads.
   Who can do what (see PERM in app2.js):
   - exp   (owner, manager, treasurer): budget, vendors, payments to vendors. Other roles do not see these sections.
   - items (owner, manager, treasurer, lead): add items to the list and allocate them. Everybody sees the list;
     the member an item is assigned to (or their manager) marks it bought and enters the real cost. */
(function(){
const R=n=>'₹'+(Math.round((+n||0)*100)/100).toLocaleString('en-IN');
const sum=(l,k)=>l.reduce((t,x)=>t+(+x[k]||0),0);
const num=v=>Math.max(0,Math.round((+v||0)*100)/100);
const me=()=>window.MYUID||'me';
const loc=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const people=e=>window.peopleOf?peopleOf(e):[];
const pname=(e,id)=>window.pnOf?pnOf(e,id):'Unassigned';
const mineIds=e=>window.mineIdsOf?mineIdsOf(e):[me()];
const isMine=(e,i)=>!!i.who&&(mineIds(e).includes(i.who)||(!e.cloud&&i.who==='me'));
const canBuy=(e,i)=>can(e,'items')||isMine(e,i);
const upiOk=u=>/^[\w.\-]{2,}@[\w]{2,}$/.test(u||'');
const enc=encodeURIComponent;

const st=document.createElement('style');
st.textContent='.xo{color:var(--bad);font-weight:700}.xg{color:var(--ok);font-weight:700}.xin{width:104px;padding:4px 6px}.xbar{min-width:90px}.xsub{white-space:normal;padding:10px 8px;background:var(--bg)}.xqr{display:flex;gap:14px;flex-wrap:wrap;align-items:center}.xqr .qr svg{width:150px}';
document.head.append(st);

/* ---------- numbers ---------- */
function calc(e){
 const bud=e.bud||[],ex=e.exp||[],it=e.itm||[],known=new Set(bud.map(b=>b.id));
 const part=cid=>{const inC=o=>cid===null?!known.has(o.c):o.c===cid;
  return{paid:sum(ex.filter(x=>inC(x)&&x.s==='paid'),'a')+sum(it.filter(i=>inC(i)&&i.s==='bought'),'ac'),
         due:sum(ex.filter(x=>inC(x)&&x.s!=='paid'),'a')+sum(it.filter(i=>inC(i)&&i.s!=='bought'),'p')}};
 const rows=bud.map(b=>Object.assign({b},part(b.id))),oth=part(null);
 const plan=sum(bud,'a'),paid=rows.reduce((t,r)=>t+r.paid,0)+oth.paid,due=rows.reduce((t,r)=>t+r.due,0)+oth.due;
 return{rows,oth,plan,paid,due,left:plan-paid-due};
}
const bar=(plan,used)=>{const p=plan>0?Math.min(100,Math.round(used/plan*100)):(used>0?100:0);return `<div class="bar xbar"><i style="width:${p}%;background:${used>plan?'var(--bad)':'var(--ok)'}"></i></div>`};
const catOpts=(e,sel)=>`<option value="">No category</option>`+(e.bud||[]).map(b=>`<option value="${b.id}" ${b.id===sel?'selected':''}>${esc(b.n)}</option>`).join('');
const assignees=e=>{let l=people(e);if(!e.cloud)l=[{id:'me',n:'Me'},...l];return [...l].sort((a,b)=>(b.id===me())-(a.id===me()))};

/* ---------- sections ---------- */
function budgetCard(e,C){
 const rows=C.rows.map(r=>`<tr><td>${esc(r.b.n)}</td><td><input class="xin" type="number" min="0" step="any" data-xb="${e.id}|${r.b.id}" value="${r.b.a}" aria-label="Planned amount for ${esc(r.b.n)}"></td><td>${R(r.paid)}</td><td>${R(r.due)}</td><td class="${r.left<0?'xo':''}">${R(r.left)}</td><td>${bar(r.b.a,r.paid+r.due)}</td><td><button class="btn ghost sm del" data-x="bdel" data-e="${e.id}" data-i="${r.b.id}">Delete</button></td></tr>`).join('');
 const oth=(C.oth.paid||C.oth.due)?`<tr><td>No category</td><td class="meta">-</td><td>${R(C.oth.paid)}</td><td>${R(C.oth.due)}</td><td class="meta">-</td><td></td><td></td></tr>`:'';
 return `<div class="card"><h3>Budget</h3><p class="meta">Set how much each area may cost. "Spent" and "To pay" fill in from the payments and items below.</p>
 <form id="xbf" class="row" data-e="${e.id}"><input name="n" required maxlength="40" list="xbl" placeholder="Category, e.g. Food" style="flex:2;min-width:140px"><input name="a" type="number" min="0" step="any" required placeholder="Planned ₹" style="flex:1;min-width:110px"><button class="btn" type="submit">Add</button></form>
 <datalist id="xbl">${['Venue','Food and refreshments','Decor','Printing','Prizes','Travel','Marketing','Equipment','Miscellaneous'].map(x=>`<option>${x}</option>`).join('')}</datalist>
 ${rows||oth?`<div class="tbl" style="margin-top:10px"><table><tr><th>Category</th><th>Planned</th><th>Spent</th><th>To pay</th><th>Left</th><th>Used</th><th></th></tr>${rows}${oth}</table></div>`:'<p class="meta" style="margin-top:10px">No budget lines yet.</p>'}</div>`;
}
function vendorCard(e){
 const ex=e.exp||[];
 const rows=(e.ven||[]).map(v=>{const mine=ex.filter(x=>x.v===v.id);
  return `<tr><td>${esc(v.n)}</td><td>${esc(v.upi||'-')}</td><td>${esc(v.ph||'-')}</td><td>${R(sum(mine.filter(x=>x.s==='paid'),'a'))}</td><td>${R(sum(mine.filter(x=>x.s!=='paid'),'a'))}</td><td><button class="btn ghost sm del" data-x="vdel" data-e="${e.id}" data-i="${v.id}">Delete</button></td></tr>`}).join('');
 return `<div class="card"><h3>Vendors and parties</h3><p class="meta">People or shops you pay. Add a UPI ID to pay them from here with a QR code.</p>
 <form id="xvf" class="two" data-e="${e.id}"><div><label>Name *</label><input name="n" required maxlength="60" placeholder="Sharma Caterers"></div><div><label>UPI ID (optional)</label><input name="u" placeholder="name@bank"></div><div><label>Phone (optional)</label><input name="p" maxlength="20" inputmode="tel"></div><div style="align-self:end"><button class="btn" type="submit">Add vendor</button></div></form>
 ${rows?`<div class="tbl" style="margin-top:10px"><table><tr><th>Name</th><th>UPI ID</th><th>Phone</th><th>Paid</th><th>To pay</th><th></th></tr>${rows}</table></div>`:''}</div>`;
}
function payRows(e){
 const today=loc();
 return [...(e.exp||[])].sort((a,b)=>(a.s==='paid')-(b.s==='paid')||(b.at||0)-(a.at||0)).map(x=>{
  const v=(e.ven||[]).find(z=>z.id===x.v),to=v?v.n:(x.vn||'-'),cat=(e.bud||[]).find(b=>b.id===x.c),paid=x.s==='paid',late=!paid&&x.due&&x.due<today;
  const when=paid?'Paid '+new Date(x.pd||x.at).toLocaleDateString():(x.due?(late?'<span class="xo">Overdue '+esc(x.due)+'</span>':'Due '+esc(x.due)):'No due date');
  const canUpi=!paid&&v&&upiOk(v.upi);
  const act=paid?`<button class="btn ghost sm" data-x="xun" data-e="${e.id}" data-i="${x.id}">Undo</button>`:`${canUpi?`<button class="btn ghost sm" data-x="xq" data-e="${e.id}" data-i="${x.id}">Pay via UPI</button> `:''}<button class="btn sm" data-x="xpd" data-e="${e.id}" data-i="${x.id}">Mark paid</button>`;
  let sub='';
  if(V.xq===x.id&&canUpi){const l=`upi://pay?pa=${enc(v.upi)}&pn=${enc(v.n)}&am=${x.a}&cu=INR&tn=${enc(x.t)}`;
   sub=`<tr><td colspan="6" class="xsub"><div class="xqr">${qrSvg(l)}<div><p class="meta" style="margin:0 0 8px">Scan with any UPI app, or open your UPI app on this phone. Amount ${R(x.a)} to ${esc(v.n)} (${esc(v.upi)}). After paying, tap Mark paid and add the UTR.</p><a class="btn sm" href="${esc(l)}" style="text-decoration:none;display:inline-block">Open UPI app</a></div></div></td></tr>`}
  if(V.xp===x.id&&!paid)sub+=`<tr><td colspan="6" class="xsub"><form id="xpf" class="row" data-e="${e.id}" data-i="${x.id}"><select name="m" aria-label="Paid by">${['UPI','Cash','Bank transfer','Other'].map(m=>`<option ${x.m===m?'selected':''}>${m}</option>`).join('')}</select><input name="r" maxlength="40" value="${esc(x.ref||'')}" placeholder="UTR / reference (optional)" style="flex:1;min-width:150px"><button class="btn sm" type="submit">Confirm paid</button><button type="button" class="btn ghost sm" data-x="xpc" data-e="${e.id}">Cancel</button></form></td></tr>`;
  return `<tr><td>${esc(x.t)}${x.ref&&paid?`<br><span class="meta">${esc(x.m||'')} ${esc(x.ref)}</span>`:''}</td><td>${esc(to)}</td><td>${cat?esc(cat.n):'-'}</td><td>${R(x.a)}</td><td>${paid?'<span class="xg">Paid</span> ':'<span class="meta">To pay</span> '}<span class="meta">${when}</span></td><td>${act} <button class="btn ghost sm del" data-x="xdel" data-e="${e.id}" data-i="${x.id}">Delete</button></td></tr>${sub}`}).join('');
}
function payCard(e){
 const rows=payRows(e);
 return `<div class="card"><h3>Payments to vendors and parties</h3><p class="meta">Record what you owe or have paid. Items marked "To pay" count against the budget as money still to go out.</p>
 <form id="xef" class="two" data-e="${e.id}"><div><label>What is it for? *</label><input name="t" required maxlength="80" placeholder="Sound system rental"></div>
 <div><label>Pay to *</label><input name="v" required maxlength="60" list="xvl" placeholder="Vendor or person"></div>
 <div><label>Amount in ₹ *</label><input name="a" type="number" min="1" step="any" required></div>
 <div><label>Budget category</label><select name="c">${catOpts(e)}</select></div>
 <div><label>Due date</label><input name="d" type="date"></div>
 <div><label>Status</label><select name="s"><option value="due">To pay</option><option value="paid">Already paid</option></select></div>
 <div><label>Paid by</label><select name="m"><option>UPI</option><option>Cash</option><option>Bank transfer</option><option>Other</option></select></div>
 <div><label>UTR / reference</label><input name="r" maxlength="40"></div>
 <div style="grid-column:1/-1"><button class="btn" type="submit">Add payment</button></div></form>
 <datalist id="xvl">${(e.ven||[]).map(v=>`<option value="${esc(v.n)}"></option>`).join('')}</datalist>
 ${rows?`<div class="tbl" style="margin-top:10px"><table><tr><th>For</th><th>To</th><th>Category</th><th>Amount</th><th>Status</th><th></th></tr>${rows}</table></div>`:'<p class="meta" style="margin-top:10px">No payments recorded yet.</p>'}</div>`;
}
function itemsCard(e){
 const all=e.itm||[],f=V.xf||'all',itp=can(e,'items');
 const vis=all.filter(i=>f==='mine'?isMine(e,i):f==='todo'?i.s!=='bought':f==='bought'?i.s==='bought':true);
 const est=sum(all.filter(i=>i.s!=='bought'),'p'),spent=sum(all.filter(i=>i.s==='bought'),'ac'),done=all.filter(i=>i.s==='bought').length;
 const ass=assignees(e);
 const rows=vis.map(i=>{
  const bought=i.s==='bought',ok=canBuy(e,i),mine=isMine(e,i);
  const who=itp?`<select data-xa="${e.id}|${i.id}" aria-label="Assigned to" style="max-width:150px;padding:4px 6px">${(ass.some(a=>a.id===i.who)?ass:[{id:i.who,n:pname(e,i.who)},...ass]).map(a=>`<option value="${a.id}" ${a.id===i.who?'selected':''}>${esc(a.n)}</option>`).join('')}<option value="" ${i.who?'':'selected'}>Unassigned</option></select>`:`<span class="meta">${esc(i.who?pname(e,i.who):'Unassigned')}${mine?' (you)':''}</span>`;
  const cat=(e.bud||[]).find(b=>b.id===i.c);
  const act=bought?(ok?`<button class="btn ghost sm" data-x="iun" data-e="${e.id}" data-i="${i.id}">Undo</button>`:''):(ok?`<button class="btn sm" data-x="ibuy" data-e="${e.id}" data-i="${i.id}">Mark bought</button>`:'');
  const sub=V.xb===i.id&&!bought&&ok?`<tr><td colspan="6" class="xsub"><form id="xgf" class="row" data-e="${e.id}" data-i="${i.id}"><input name="ac" type="number" min="0" step="any" required value="${i.p||''}" placeholder="Actual cost ₹" style="width:150px" aria-label="Actual cost"><button class="btn sm" type="submit">Confirm bought</button><button type="button" class="btn ghost sm" data-x="xbc" data-e="${e.id}">Cancel</button></form></td></tr>`:'';
  return `<tr><td style="${bought?'color:var(--mute);text-decoration:line-through':''}">${esc(i.t)}${cat?`<br><span class="meta">${esc(cat.n)}</span>`:''}</td><td>${i.q||1}</td><td>${i.p?R(i.p):'-'}</td><td>${who}</td><td>${bought?'<span class="xg">Bought</span> '+R(i.ac):'<span class="meta">To buy</span>'}</td><td>${act}${itp?` <button class="btn ghost sm del" data-x="idel" data-e="${e.id}" data-i="${i.id}">Delete</button>`:''}</td></tr>${sub}`}).join('');
 const form=itp?`<form id="xif" class="two" data-e="${e.id}" style="margin-top:12px"><div><label>Item *</label><input name="t" required maxlength="80" placeholder="Banner, 3 x 6 ft"></div>
  <div><label>Quantity</label><input name="q" type="number" min="1" step="1" value="1"></div>
  <div><label>Estimated cost in ₹ (whole line)</label><input name="p" type="number" min="0" step="any"></div>
  <div><label>Budget category</label><select name="c">${catOpts(e)}</select></div>
  <div><label>Allocate to</label><select name="w"><option value="">Unassigned</option>${ass.map(a=>`<option value="${a.id}">${esc(a.n)}</option>`).join('')}</select></div>
  <div style="align-self:end"><button class="btn" type="submit">Add item</button></div></form>`:'';
 const by={};all.forEach(i=>{const k=i.who||'';(by[k]=by[k]||[]).push(i)});
 const sumRows=Object.keys(by).map(k=>{const l=by[k];return `<tr><td>${esc(k?pname(e,k):'Unassigned')}${k&&k===me()?' (you)':''}</td><td>${l.length}</td><td>${l.filter(i=>i.s==='bought').length}</td><td>${R(sum(l.filter(i=>i.s!=='bought'),'p'))}</td><td>${R(sum(l.filter(i=>i.s==='bought'),'ac'))}</td></tr>`}).join('');
 return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Items to buy</h3><span class="meta">${done} of ${all.length} bought</span></div>
 <p class="meta">${itp?'Add what the event needs and give each item to a member. They get an alert and can tick it off with the real cost.':'Items allocated to you are listed under My tasks too. Tap Mark bought and enter the real cost when you have it.'}</p>
 ${form}
 <div class="chips" style="margin:14px 0 8px">${[['all','All'],['mine','Mine'],['todo','To buy'],['bought','Bought']].map(c=>`<button class="chip ${f===c[0]?'on':''}" data-x="xf" data-e="${e.id}" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>
 ${rows?`<div class="tbl"><table><tr><th>Item</th><th>Qty</th><th>Est.</th><th>Allocated to</th><th>Status</th><th></th></tr>${rows}</table></div>`:`<p class="meta">${all.length?'Nothing in this filter.':'No items yet.'}</p>`}
 ${all.length?`<p class="meta" style="margin-top:10px">Still to buy (estimate): <b>${R(est)}</b> · Spent on bought items: <b>${R(spent)}</b></p>
 <details style="margin-top:6px"><summary class="meta">Who is buying what</summary><div class="tbl"><table><tr><th>Member</th><th>Items</th><th>Bought</th><th>To buy (est.)</th><th>Spent</th></tr>${sumRows}</table></div></details>`:''}</div>`;
}

window.expV=function(e){
 const mgr=can(e,'exp'),C=calc(e),all=e.itm||[];
 const stats=mgr?`<div class="stats"><div class="stat"><b>${R(C.plan)}</b><span>Budget</span></div><div class="stat"><b>${R(C.paid)}</b><span>Spent</span></div><div class="stat"><b>${R(C.due)}</b><span>Still to pay</span></div><div class="stat"><b class="${C.plan&&C.left<0?'xo':''}">${C.plan?R(C.left):'-'}</b><span>${C.plan&&C.left<0?'Over budget':'Left'}</span></div></div>`
  :`<div class="stats"><div class="stat"><b>${all.length}</b><span>Items</span></div><div class="stat"><b>${all.filter(i=>i.s==='bought').length}</b><span>Bought</span></div><div class="stat"><b>${all.filter(isMine.bind(null,e)).length}</b><span>Allocated to you</span></div></div>`;
 return stats+(mgr?budgetCard(e,C)+vendorCard(e)+payCard(e):'')+itemsCard(e)
  +(mgr?'':'<p class="meta">Budget, vendors and payments are managed by the organizer, managers and treasurer.</p>');
};

/* ---------- "My tasks" integration ---------- */
window.mineItemsN=e=>(e.itm||[]).filter(i=>i.s!=='bought'&&isMine(e,i)).length;
window.mineItemsV=e=>{
 const l=(e.itm||[]).filter(i=>isMine(e,i));if(!l.length)return '';
 return `<h4 style="margin:12px 0 4px;font-size:14px">Items to buy</h4>`+l.map(i=>`<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span style="flex:1;min-width:120px;${i.s==='bought'?'text-decoration:line-through;color:var(--mute)':''}">${esc(i.t)}${i.q>1?' x'+i.q:''}</span><span class="meta">${i.s==='bought'?'Bought '+R(i.ac):(i.p?'est. '+R(i.p):'')}</span>${i.s==='bought'?'':`<button class="btn ghost sm" data-x="igo" data-e="${e.id}">Open</button>`}</div>`).join('');
};

/* ---------- actions ---------- */
document.addEventListener('click',x=>{
 const t=x.target.closest('button[data-x]');if(!t)return;
 const D=t.dataset,E=S.events.find(z=>z.id===D.e);if(!E)return;
 const id=D.i,a=D.x;
 const item=()=>(E.itm||[]).find(z=>z.id===id),pay=()=>(E.exp||[]).find(z=>z.id===id);
 if(a==='xf'){V.xf=D.v;render()}
 else if(a==='igo'){V.dt='exp';go('detail',E.id)}
 else if(a==='bdel'&&can(E,'exp')){E.bud=E.bud.filter(b=>b.id!==id);sv()}
 else if(a==='vdel'&&can(E,'exp')){E.ven=E.ven.filter(v=>v.id!==id);sv()}
 else if(a==='xdel'&&can(E,'exp')){if(!confirm('Delete this payment record?'))return;E.exp=E.exp.filter(p=>p.id!==id);if(V.xp===id)V.xp=null;if(V.xq===id)V.xq=null;sv()}
 else if(a==='xq'){V.xq=V.xq===id?null:id;V.xp=null;render()}
 else if(a==='xpd'&&can(E,'exp')){V.xp=V.xp===id?null:id;render()}
 else if(a==='xpc'){V.xp=null;render()}
 else if(a==='xun'&&can(E,'exp')){const p=pay();if(p){p.s='due';delete p.pd;sv()}}
 else if(a==='idel'&&can(E,'items')){E.itm=E.itm.filter(i=>i.id!==id);if(V.xb===id)V.xb=null;sv()}
 else if(a==='ibuy'){const i=item();if(i&&canBuy(E,i)){V.xb=V.xb===id?null:id;render()}}
 else if(a==='xbc'){V.xb=null;render()}
 else if(a==='iun'){const i=item();if(i&&canBuy(E,i)){i.s='todo';delete i.ac;delete i.bt;sv()}}
});
document.addEventListener('change',x=>{
 const t=x.target;
 if(t.dataset.xb){const q=t.dataset.xb.split('|'),E=S.events.find(z=>z.id===q[0]),b=E&&(E.bud||[]).find(z=>z.id===q[1]);if(b&&can(E,'exp')){b.a=num(t.value);sv()}}
 else if(t.dataset.xa){const q=t.dataset.xa.split('|'),E=S.events.find(z=>z.id===q[0]),i=E&&(E.itm||[]).find(z=>z.id===q[1]);
  if(i&&can(E,'items')&&(t.value===''||assignees(E).some(a=>a.id===t.value))){i.who=t.value;sv()}else render()}
});
document.addEventListener('submit',x=>{
 const f=x.target,E=S.events.find(z=>z.id===f.dataset.e);if(!E||!/^x[bvefigp]f$/.test(f.id))return;
 const fd=new FormData(f),g=k=>(fd.get(k)||'').toString().replace(/\s+/g,' ').trim();
 if(f.id==='xbf'&&can(E,'exp')){if(!g('n'))return;E.bud.push({id:uid(),n:g('n').slice(0,40),a:num(g('a')),at:Date.now()});sv();toast('Budget line added')}
 else if(f.id==='xvf'&&can(E,'exp')){const u=g('u');if(u&&!upiOk(u))return toast('That UPI ID does not look right');
  E.ven.push({id:uid(),n:g('n').slice(0,60),upi:u,ph:g('p').slice(0,20),at:Date.now()});sv();toast('Vendor added')}
 else if(f.id==='xef'&&can(E,'exp')){
  const a=num(g('a'));if(!g('t')||!g('v')||!(a>0))return toast('Fill in what it is for, who to pay and the amount');
  const nm=g('v').toLowerCase(),v=(E.ven||[]).find(z=>z.n.toLowerCase()===nm),paid=g('s')==='paid';
  const p={id:uid(),t:g('t').slice(0,80),v:v?v.id:'',vn:(v?v.n:g('v')).slice(0,60),c:g('c'),a,s:paid?'paid':'due',m:g('m'),ref:g('r').slice(0,40),due:g('d'),by:me(),at:Date.now()};
  if(paid)p.pd=Date.now();E.exp.push(p);sv();toast(paid?'Payment recorded':'Payment added to the to-pay list')}
 else if(f.id==='xpf'&&can(E,'exp')){const p=(E.exp||[]).find(z=>z.id===f.dataset.i);if(p){p.s='paid';p.pd=Date.now();p.m=g('m');p.ref=g('r').slice(0,40);V.xp=null;sv();toast('Marked as paid')}}
 else if(f.id==='xif'&&can(E,'items')){
  const w=g('w');if(w&&!assignees(E).some(a=>a.id===w))return toast('Pick someone from the list');
  E.itm.push({id:uid(),t:g('t').slice(0,80),q:Math.max(1,Math.round(+g('q'))||1),p:num(g('p')),c:g('c'),who:w,s:'todo',by:me(),at:Date.now()});sv();toast('Item added')}
 else if(f.id==='xgf'){const i=(E.itm||[]).find(z=>z.id===f.dataset.i);if(i&&canBuy(E,i)){i.s='bought';i.ac=num(g('ac'));i.bt=Date.now();V.xb=null;sv();toast('Marked as bought')}}
});
})();
