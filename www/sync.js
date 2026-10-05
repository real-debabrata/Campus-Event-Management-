(function(){
const C=window.FB_CONFIG||{};
const ready=!!(window.firebase&&C.apiKey&&!/YOUR_/.test(C.apiKey));
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let P=Object.assign({tasks:1,people:1,money:1,event:1,chat:1,ntfy:0},LS('campus-prefs',{}));
let N=LS('campus-notes',[]);
let U=null,db,unsub,applying=false;const sent={},owners={};
const KEYS=['info','team','groups','tasks','teams','don','pay','regs','forms','payments'],MAPK=['forms','payments'];
const arr=o=>Array.isArray(o)?o:Object.values(o||{}).sort((a,b)=>(a.at||0)-(b.at||0));
const toMap=a=>Object.fromEntries((a||[]).map(x=>[x.id,x]));
const clean=o=>JSON.parse(JSON.stringify(o));
const me=()=>((U&&(U.displayName||U.email.split('@')[0]))||'').toLowerCase();
const err=x=>toast(x.code==='permission-denied'?'No permission. Check the Firestore rules.':'Sync problem: '+(x.message||x.code));
const persist=()=>{try{localStorage.setItem('campus-events-v1',JSON.stringify(S))}catch(e){}};

const st=document.createElement('style');
st.textContent='#tp{position:fixed;right:10px;top:calc(60px + env(safe-area-inset-top,0px));width:min(360px,94vw);max-height:78vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;z-index:20;box-shadow:0 8px 30px rgba(0,0,0,.25)}#au{position:fixed;inset:0;z-index:30}#au{display:grid;grid-template-columns:1.15fr 1fr;color:#fff;overflow:auto;background:radial-gradient(900px 500px at 8% 0%,rgba(123,147,255,.45),transparent 60%),radial-gradient(700px 500px at 100% 100%,rgba(255,122,184,.35),transparent 60%),linear-gradient(135deg,#0a0f2e,#16205c 60%,#2a1f6e)}#au .hero{padding:8vh 6vw;display:flex;flex-direction:column;justify-content:center;gap:16px}#au .brand{display:flex;align-items:center;gap:12px;font:800 22px Poppins,system-ui,sans-serif}#au h1{font-size:clamp(30px,4.4vw,52px);line-height:1.05}#au .hero p{color:#c9d2ff;max-width:46ch;margin:0}#au ul{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:10px}#au li{color:#e6eaff;padding-left:26px;position:relative}#au li:before{content:"";position:absolute;left:0;top:6px;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7b93ff,#ff7ab8)}#au .pane{display:flex;align-items:center;justify-content:center;padding:20px}#au .glass{width:min(400px,100%);background:var(--card);color:var(--ink);border-radius:20px;padding:26px;box-shadow:0 24px 70px rgba(0,0,0,.45)}#au .seg{display:grid;grid-template-columns:1fr 1fr;background:var(--bg);border-radius:10px;padding:4px;margin:14px 0 6px}#au .seg button{border:0;background:none;color:var(--mute);font:inherit;font-weight:700;padding:8px;border-radius:8px;cursor:pointer}#au .seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.2)}#au .go{width:100%;padding:12px;background:linear-gradient(135deg,#4f6bff,#9b5cff);color:#fff;border-radius:10px}@media(max-width:760px){#au{grid-template-columns:1fr}#au .hero{padding:28px 22px 6px}#au ul,#au .hero p{display:none}}.hid{display:none!important}';
document.head.append(st);

// ---------- notifications ----------
function ping(title,body){
 const LN=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
 if(LN){LN.schedule({notifications:[{id:Date.now()%2147483000,title,body}]}).catch(()=>{})}
 else if('Notification' in window&&Notification.permission==='granted'){try{new Notification(title,{body})}catch(e){}}
}
function askPerm(){
 const LN=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
 if(LN)LN.requestPermissions().catch(()=>{});else if('Notification' in window&&Notification.permission==='default')Notification.requestPermission();
}
function notify(list){
 const shown=list.filter(m=>P[m.cat]);
 if(!shown.length)return;
 shown.forEach(m=>N.unshift({t:Date.now(),text:m.n+': '+m.text}));
 N=N.slice(0,50);localStorage.setItem('campus-notes',JSON.stringify(N));badge();
 const hi=shown.filter(m=>m.me);
 if(shown.length>3&&!hi.length)ping('Campus Events',shown.length+' updates in your events');
 else shown.forEach(m=>ping(m.me?'For you':m.n,m.me?m.text:m.text));
 toast(shown.length===1?shown[0].text:shown.length+' new updates');
}
function snapOf(e){
 const o={info:{name:e.name,type:e.type,date:e.date,time:e.time,venue:e.venue,cap:e.cap,desc:e.desc,fields:e.fields},
  team:e.team||[],groups:e.groups||[],tasks:e.tasks||[],teams:e.teams||[],don:e.don||[],pay:e.pay||{upi:'',payee:'',fee:0},
  regs:S.regs.filter(r=>r.eid===e.id),forms:e.forms||[],payments:e.payments||[],members:e.members||{}};
 return clean(o);
}
const parts=e=>{const o=snapOf(e),r={};KEYS.forEach(k=>r[k]=JSON.stringify(o[k]));return r};
function diff(o,n,who){
 const out=[],added=(a,b)=>b.filter(x=>!a.some(y=>y.id===x.id));
 const nm=id=>((n.team.find(m=>m.id===id)||{}).n||'').toLowerCase();
 const nr=added(o.regs,n.regs);
 if(nr.length)out.push({cat:'people',text:nr.length+' new registration'+(nr.length>1?'s':'')+': '+nr.slice(0,3).map(r=>r.name).join(', ')});
 added(o.tasks,n.tasks).forEach(t=>{const mine=t.who===window.MYUID||(who&&nm(t.who)===who);out.push({cat:'tasks',me:mine,text:(mine?'Task assigned to you: ':'New task: ')+t.t})});
 n.tasks.forEach(t=>{const p=o.tasks.find(y=>y.id===t.id);if(!p)return;
  if(t.done&&!p.done)out.push({cat:'tasks',text:'Task done: '+t.t});
  if(t.who!==p.who&&(t.who===window.MYUID||(who&&nm(t.who)===who)))out.push({cat:'tasks',me:true,text:'Task assigned to you: '+t.t})});
 added(o.groups,n.groups).forEach(g=>out.push({cat:'tasks',text:'New task group: '+g.n}));
 added(o.team,n.team).forEach(m=>out.push({cat:'people',text:m.n+' joined the core team as '+m.r}));
 added(o.teams,n.teams).forEach(t=>out.push({cat:'people',text:'New team: '+t.n}));
 added(o.don,n.don).forEach(x=>out.push({cat:'money',text:'Donation of ₹'+x.a+' from '+x.n}));
 const np=n.regs.filter(r=>{const p=o.regs.find(y=>y.id===r.id);return p&&r.paid&&!p.paid}).length;
 if(np)out.push({cat:'money',text:np+' fee payment'+(np>1?'s':'')+' recorded'});
 const om=o.members||{},nmem=n.members||{};
 Object.keys(nmem).filter(k=>!om[k]).forEach(k=>out.push({cat:'people',text:nmem[k].name+' joined the event'}));
 Object.keys(nmem).forEach(k=>{if(om[k]&&om[k].role!==nmem[k].role&&k===window.MYUID)out.push({cat:'people',me:true,text:'Your role is now '+nmem[k].role})});
 added(o.payments||[],n.payments||[]).forEach(p=>out.push({cat:'money',text:'Payment of ₹'+p.a+' from '+p.n+' submitted'}));
 const a=o.info,b=n.info;
 if(a.name!==b.name||a.date!==b.date||a.time!==b.time||a.venue!==b.venue)out.push({cat:'event',text:'Event details changed'});
 return out;
}
const badge=()=>{const b=document.getElementById('tb');if(b)b.textContent=N.length?'('+N.length+')':''};

window.notify=notify;   // used by chat.js
// ---------- apply remote data ----------
function apply(id,d){
 let e=S.events.find(x=>x.id===id);const old=e?snapOf(e):null;
 if(!e){e={id};S.events.push(e)}
 Object.assign(e,d.info||{},{team:d.team||[],groups:d.groups||[],tasks:d.tasks||[],teams:d.teams||[],don:d.don||[],
  pay:d.pay||{upi:'',payee:'',fee:0},forms:arr(d.forms),payments:arr(d.payments),cloud:1,owner:d.owner,ntfy:d.ntfy||'',members:d.members||{}});
 S.regs=S.regs.filter(r=>r.eid!==id).concat((d.regs||[]).map(r=>Object.assign({},r,{eid:id})));
 owners[id]=d.owner;sent[id]=parts(e);return old;
}
function listen(){
 if(unsub)unsub();let first=true;
 unsub=db.collection('events').where('memberIds','array-contains',U.uid).onSnapshot(snap=>{
  const msgs=[];
  snap.docChanges().forEach(c=>{
   const id=c.doc.id,d=c.doc.data();
   if(c.type==='removed'){delete sent[id];S.events=S.events.filter(e=>e.id!==id);S.regs=S.regs.filter(r=>r.eid!==id);window.chatDrop&&chatDrop(id);return}
   const old=apply(id,d);
   if(old&&!first&&!c.doc.metadata.hasPendingWrites)diff(old,snapOf(S.events.find(e=>e.id===id)),me()).forEach(m=>msgs.push(Object.assign(m,{n:d.info.name})));
  });
  first=false;persist();render();watchSubs();window.chatSync&&chatSync();if(msgs.length)notify(msgs);
 },err);
}

// ---------- push local changes ----------
let tm;
window.onSave=()=>{if(!U)return;clearTimeout(tm);tm=setTimeout(()=>{flush();watchSubs()},500)};
function flush(){
 Object.keys(sent).forEach(id=>{
  if(S.events.some(e=>e.id===id))return;
  const ref=db.collection('events').doc(id);delete sent[id];
  if(owners[id]===U.uid)(window.chatPurge?chatPurge(id):Promise.resolve()).then(()=>ref.delete()).catch(x=>{err(x);listen()});   // chat messages go first, then the event; on failure the event comes back
  else ref.update({['members.'+U.uid]:firebase.firestore.FieldValue.delete(),memberIds:firebase.firestore.FieldValue.arrayRemove(U.uid)}).catch(err);
 });
 S.events.filter(e=>e.cloud&&sent[e.id]).forEach(e=>{
  const cur=parts(e),old=sent[e.id],upd={};
  KEYS.forEach(k=>{if(cur[k]===old[k])return;if(MAPK.includes(k)){const a=toMap(JSON.parse(old[k])),b=toMap(JSON.parse(cur[k]));for(const i in b)if(JSON.stringify(b[i])!==JSON.stringify(a[i]))upd[k+'.'+i]=b[i];for(const i in a)if(!b[i])upd[k+'.'+i]=firebase.firestore.FieldValue.delete()}else upd[k]=JSON.parse(cur[k])});
  if(!Object.keys(upd).length)return;
  if(P.ntfy&&e.ntfy){
   const o={};KEYS.forEach(k=>o[k]=JSON.parse(old[k]));
   const nn=snapOf(e);o.members=nn.members;const msg=diff(o,nn,'').map(m=>m.text).join('; ');
   if(msg)fetch('https://ntfy.sh/'+e.ntfy,{method:'POST',body:e.name+' - '+msg}).catch(()=>{});
  }
  sent[e.id]=cur;
  db.collection('events').doc(e.id).update(upd).catch(err);
 });
}

// ---------- share and join ----------
const rnd=n=>Array.from({length:n},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
window.shareBar=e=>{
 if(!ready||!U)return '';
 if(e.cloud)return `<p class="meta">Event code: <b>${esc(e.id)}</b>, ${Object.keys(e.members||{}).length} member(s). <button class="btn ghost sm" data-copy="${esc(e.id)}">Copy code</button><br>ntfy topic: ntfy.sh/${esc(e.ntfy||'')}</p>`;
 return `<p><button class="btn sm" data-share="${e.id}">Share with team</button></p>`;
};
async function share(id){
 const e=S.events.find(x=>x.id===id);if(!e)return;
 let code;for(let i=0;i<5;i++){code=rnd(6);const g=await db.collection('events').doc(code).get().catch(()=>null);if(g&&!g.exists)break}
 const regs=S.regs.filter(r=>r.eid===id);
 S.regs.forEach(r=>{if(r.eid===id)r.eid=code});
 e.id=code;e.cloud=1;e.owner=U.uid;e.ntfy='campus-'+code+'-'+rnd(8).toLowerCase();e.members={[U.uid]:{name:U.displayName||U.email,role:'owner'}};
 const o=snapOf(e);o.forms=toMap(o.forms);o.payments=toMap(o.payments);
 try{await db.collection('events').doc(code).set(Object.assign(o,{owner:U.uid,ntfy:e.ntfy,members:e.members,memberIds:[U.uid]}));
  sent[code]=parts(e);owners[code]=U.uid;V.eid=code;persist();render();toast('Shared. Code: '+code)}
 catch(x){e.id=id;e.cloud=0;S.regs.forEach(r=>{if(r.eid===code)r.eid=id});err(x)}
}
async function join(code){
 code=code.trim().toUpperCase();if(!code)return;
 try{const ref=db.collection('events').doc(code),g=await ref.get();
  if(!g.exists)return toast('Code not found');
  await ref.update({['members.'+U.uid]:{name:U.displayName||U.email,role:'member'},memberIds:firebase.firestore.FieldValue.arrayUnion(U.uid)});
  toast('Joined');document.getElementById('tp').classList.add('hid');go('events')}
 catch(x){err(x)}
}

window.rmMember=(id,uid)=>{const e=S.events.find(x=>x.id===id);if(!e||!e.members)return;delete e.members[uid];e.tasks.forEach(k=>{if(k.who===uid)k.who=''});save();render();if(db&&U)db.collection('events').doc(id).update({['members.'+uid]:firebase.firestore.FieldValue.delete(),memberIds:firebase.firestore.FieldValue.arrayRemove(uid)}).catch(err)};
window.setRole=(id,uid,role)=>{const e=S.events.find(x=>x.id===id);if(!e||!e.members||!e.members[uid])return;e.members[uid].role=role;persist();render();if(db&&U)db.collection('events').doc(id).update({['members.'+uid+'.role']:role}).catch(err)};
window.SUBS=window.SUBS||{};const subUn={};
window.pubForm=(f,e)=>{if(db&&U)db.collection('payforms').doc(f.id).set({eid:e.id,evName:e.name,title:f.title,amt:f.amt||0,upi:f.upi,payee:f.payee,note:f.note||'',by:U.uid,byName:f.byName||'',at:f.at}).catch(err)};
window.pubDel=id=>{if(db&&U)db.collection('payforms').doc(id).delete().catch(()=>{})};
window.subAct=(fid,sid,a)=>{if(!db)return;const r=db.collection('payforms').doc(fid).collection('subs').doc(sid);(a==='sd'?r.delete():r.update({s:a==='sv'?'verified':'rejected'})).catch(err)};
function watchSubs(){
 if(!U||!window.can)return;const want={};
 S.events.filter(e=>e.cloud).forEach(e=>(e.forms||[]).forEach(f=>{if(can(e,'pay')||f.by===U.uid)want[f.id]=f}));
 Object.keys(subUn).forEach(id=>{if(!want[id]){subUn[id]();delete subUn[id];delete SUBS[id]}});
 Object.keys(want).forEach(id=>{if(subUn[id])return;const f=want[id];let first=true;
  subUn[id]=db.collection('payforms').doc(id).collection('subs').onSnapshot(sn=>{
   const msgs=[];
   if(!first)sn.docChanges().forEach(c=>{if(c.type==='added'&&!c.doc.metadata.hasPendingWrites){const d=c.doc.data();msgs.push({cat:'money',n:f.title,text:'Payment of ₹'+d.a+' from '+d.n+' submitted'})}});
   first=false;SUBS[id]=sn.docs.map(d=>Object.assign({id:d.id},d.data()));render();if(msgs.length)notify(msgs);
  },()=>{});
 });
}
// ---------- UI ----------
const hdr=document.querySelector('header');
const tbtn=document.createElement('button');tbtn.className='btn ghost sm';tbtn.innerHTML='Team <span id="tb"></span>';hdr.append(tbtn);
const tp=document.createElement('div');tp.id='tp';tp.className='hid';document.body.append(tp);
function panel(){
 if(!ready){tp.innerHTML='<h3>Sync is off</h3><p class="meta">Add your Firebase config in firebase-config.js to share events with your team and get live alerts.</p>';return}
 if(!U){tp.innerHTML='<p class="meta">Not signed in.</p>';return}
 tp.innerHTML=`<h3>${esc(U.displayName||'Member')}</h3><p class="meta">${esc(U.email)}</p>
 <label>Join an event</label><div class="row"><input id="jc" placeholder="Event code" style="flex:1;text-transform:uppercase"><button class="btn" id="jb">Join</button></div>
 <label>Notify me about</label><div class="row">${[['tasks','Tasks'],['people','People'],['money','Money'],['event','Event changes'],['chat','Chat messages']].map(k=>`<label style="margin:0"><input type="checkbox" data-p="${k[0]}" ${P[k[0]]?'checked':''}> ${k[1]}</label>`).join('')}</div>
 <label><input type="checkbox" data-p="ntfy" ${P.ntfy?'checked':''}> Also send my changes to the event's ntfy topic</label>
 <h3 style="margin-top:14px">Recent updates</h3>${N.length?N.slice(0,15).map(n=>`<div class="meta" style="padding:4px 0;border-bottom:1px solid var(--line)">${esc(n.text)}</div>`).join(''):'<p class="meta">Nothing yet.</p>'}
 <div class="row" style="margin-top:12px"><button class="btn ghost sm" id="clr">Clear updates</button><button class="btn ghost sm del" id="so">Sign out</button></div>`;
}
let AM='in';
function authUI(){location.replace('login.html')}
document.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t)return;
 const g=id=>document.getElementById(id);
 if(t===tbtn){panel();tp.classList.toggle('hid')}
 else if(t.dataset.share)share(t.dataset.share);
 else if(t.dataset.copy){try{await navigator.clipboard.writeText(t.dataset.copy);toast('Code copied')}catch(x){toast('Code: '+t.dataset.copy)}}
 else if(t.id==='jb')join(g('jc').value);
 else if(t.id==='clr'){N=[];localStorage.setItem('campus-notes','[]');badge();panel()}
 else if(t.id==='so'){tp.classList.add('hid');firebase.auth().signOut()}
 else if(t.id==='off')g('au').remove();
 else if(t.dataset.m){AM=t.dataset.m;authUI(true)}
 else if(t.id==='go'){
  const em=g('ae').value.trim(),pw=g('ap').value,nmv=g('an').value.trim();
  try{if(AM==='in')await firebase.auth().signInWithEmailAndPassword(em,pw);
   else{const c=await firebase.auth().createUserWithEmailAndPassword(em,pw);await c.user.updateProfile({displayName:nmv||em.split('@')[0]})}}
  catch(x){g('am').textContent=x.message.replace('Firebase: ','')}
 }
});
document.addEventListener('change',e=>{
 const k=e.target.dataset&&e.target.dataset.p;
 if(k){P[k]=e.target.checked?1:0;localStorage.setItem('campus-prefs',JSON.stringify(P))}
});
badge();

if(!ready)document.documentElement.classList.remove('gate');
if(ready){
 firebase.initializeApp(C);db=firebase.firestore();
 db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
 firebase.auth().onAuthStateChanged(u=>{
  U=u;window.MYUID=u?u.uid:'';window.MYNAME=u?(u.displayName||u.email.split('@')[0]):'';
  if(u){document.documentElement.classList.remove('gate');askPerm();listen();render()}
  else{if(unsub)unsub();window.chatDrop&&chatDrop();Object.keys(subUn).forEach(i=>{subUn[i]();delete subUn[i]});authUI()}
 });
}
})();
