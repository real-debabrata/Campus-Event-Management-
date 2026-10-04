(function(){
const C=window.FB_CONFIG||{};
const ready=!!(window.firebase&&C.apiKey&&!/YOUR_/.test(C.apiKey));
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let P=Object.assign({tasks:1,people:1,money:1,event:1,ntfy:0},LS('campus-prefs',{}));
let N=LS('campus-notes',[]);
let U=null,db,unsub,applying=false;const sent={},owners={};
const KEYS=['info','team','groups','tasks','teams','don','pay','regs'];
const clean=o=>JSON.parse(JSON.stringify(o));
const me=()=>((U&&(U.displayName||U.email.split('@')[0]))||'').toLowerCase();
const err=x=>toast(x.code==='permission-denied'?'No permission. Check the Firestore rules.':'Sync problem: '+(x.message||x.code));
const persist=()=>{try{localStorage.setItem('campus-events-v1',JSON.stringify(S))}catch(e){}};

const st=document.createElement('style');
st.textContent='#tp{position:fixed;right:10px;top:calc(60px + env(safe-area-inset-top,0px));width:min(360px,94vw);max-height:78vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;z-index:20;box-shadow:0 8px 30px rgba(0,0,0,.25)}#au{position:fixed;inset:0;background:var(--bg);z-index:30;display:flex;align-items:center;justify-content:center;padding:20px}#au .card{width:min(380px,100%)}.hid{display:none!important}';
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
  regs:S.regs.filter(r=>r.eid===e.id)};
 return clean(o);
}
const parts=e=>{const o=snapOf(e),r={};KEYS.forEach(k=>r[k]=JSON.stringify(o[k]));return r};
function diff(o,n,who){
 const out=[],added=(a,b)=>b.filter(x=>!a.some(y=>y.id===x.id));
 const nm=id=>((n.team.find(m=>m.id===id)||{}).n||'').toLowerCase();
 const nr=added(o.regs,n.regs);
 if(nr.length)out.push({cat:'people',text:nr.length+' new registration'+(nr.length>1?'s':'')+': '+nr.slice(0,3).map(r=>r.name).join(', ')});
 added(o.tasks,n.tasks).forEach(t=>{const mine=who&&nm(t.who)===who;out.push({cat:'tasks',me:mine,text:(mine?'Task assigned to you: ':'New task: ')+t.t})});
 n.tasks.forEach(t=>{const p=o.tasks.find(y=>y.id===t.id);if(!p)return;
  if(t.done&&!p.done)out.push({cat:'tasks',text:'Task done: '+t.t});
  if(t.who!==p.who&&who&&nm(t.who)===who)out.push({cat:'tasks',me:true,text:'Task assigned to you: '+t.t})});
 added(o.groups,n.groups).forEach(g=>out.push({cat:'tasks',text:'New task group: '+g.n}));
 added(o.team,n.team).forEach(m=>out.push({cat:'people',text:m.n+' joined the core team as '+m.r}));
 added(o.teams,n.teams).forEach(t=>out.push({cat:'people',text:'New team: '+t.n}));
 added(o.don,n.don).forEach(x=>out.push({cat:'money',text:'Donation of ₹'+x.a+' from '+x.n}));
 const np=n.regs.filter(r=>{const p=o.regs.find(y=>y.id===r.id);return p&&r.paid&&!p.paid}).length;
 if(np)out.push({cat:'money',text:np+' fee payment'+(np>1?'s':'')+' recorded'});
 const a=o.info,b=n.info;
 if(a.name!==b.name||a.date!==b.date||a.time!==b.time||a.venue!==b.venue)out.push({cat:'event',text:'Event details changed'});
 return out;
}
const badge=()=>{const b=document.getElementById('tb');if(b)b.textContent=N.length?'('+N.length+')':''};

// ---------- apply remote data ----------
function apply(id,d){
 let e=S.events.find(x=>x.id===id);const old=e?snapOf(e):null;
 if(!e){e={id};S.events.push(e)}
 Object.assign(e,d.info||{},{team:d.team||[],groups:d.groups||[],tasks:d.tasks||[],teams:d.teams||[],don:d.don||[],
  pay:d.pay||{upi:'',payee:'',fee:0},cloud:1,owner:d.owner,ntfy:d.ntfy||'',members:d.members||{}});
 S.regs=S.regs.filter(r=>r.eid!==id).concat((d.regs||[]).map(r=>Object.assign({},r,{eid:id})));
 owners[id]=d.owner;sent[id]=parts(e);return old;
}
function listen(){
 if(unsub)unsub();let first=true;
 unsub=db.collection('events').where('memberIds','array-contains',U.uid).onSnapshot(snap=>{
  const msgs=[];
  snap.docChanges().forEach(c=>{
   const id=c.doc.id,d=c.doc.data();
   if(c.type==='removed'){delete sent[id];S.events=S.events.filter(e=>e.id!==id);S.regs=S.regs.filter(r=>r.eid!==id);return}
   const old=apply(id,d);
   if(old&&!first&&!c.doc.metadata.hasPendingWrites)diff(old,snapOf(S.events.find(e=>e.id===id)),me()).forEach(m=>msgs.push(Object.assign(m,{n:d.info.name})));
  });
  first=false;persist();render();if(msgs.length)notify(msgs);
 },err);
}

// ---------- push local changes ----------
let tm;
window.onSave=()=>{if(!U)return;clearTimeout(tm);tm=setTimeout(flush,500)};
function flush(){
 Object.keys(sent).forEach(id=>{
  if(S.events.some(e=>e.id===id))return;
  const ref=db.collection('events').doc(id);delete sent[id];
  if(owners[id]===U.uid)ref.delete().catch(err);
  else ref.update({['members.'+U.uid]:firebase.firestore.FieldValue.delete(),memberIds:firebase.firestore.FieldValue.arrayRemove(U.uid)}).catch(err);
 });
 S.events.filter(e=>e.cloud&&sent[e.id]).forEach(e=>{
  const cur=parts(e),old=sent[e.id],upd={};
  KEYS.forEach(k=>{if(cur[k]!==old[k])upd[k]=JSON.parse(cur[k])});
  if(!Object.keys(upd).length)return;
  if(P.ntfy&&e.ntfy){
   const o={};KEYS.forEach(k=>o[k]=JSON.parse(old[k]));
   const msg=diff(o,snapOf(e),'').map(m=>m.text).join('; ');
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
 e.id=code;e.cloud=1;e.owner=U.uid;e.ntfy='campus-'+code+'-'+rnd(8).toLowerCase();e.members={[U.uid]:{name:U.displayName||U.email,role:'organizer'}};
 const o=snapOf(e);
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

// ---------- UI ----------
const hdr=document.querySelector('header');
const tbtn=document.createElement('button');tbtn.className='btn ghost sm';tbtn.innerHTML='Team <span id="tb"></span>';hdr.append(tbtn);
const tp=document.createElement('div');tp.id='tp';tp.className='hid';document.body.append(tp);
function panel(){
 if(!ready){tp.innerHTML='<h3>Sync is off</h3><p class="meta">Add your Firebase config in firebase-config.js to share events with your team and get live alerts.</p>';return}
 if(!U){tp.innerHTML='<p class="meta">Not signed in.</p>';return}
 tp.innerHTML=`<h3>${esc(U.displayName||'Member')}</h3><p class="meta">${esc(U.email)}</p>
 <label>Join an event</label><div class="row"><input id="jc" placeholder="Event code" style="flex:1;text-transform:uppercase"><button class="btn" id="jb">Join</button></div>
 <label>Notify me about</label><div class="row">${[['tasks','Tasks'],['people','People'],['money','Money'],['event','Event changes']].map(k=>`<label style="margin:0"><input type="checkbox" data-p="${k[0]}" ${P[k[0]]?'checked':''}> ${k[1]}</label>`).join('')}</div>
 <label><input type="checkbox" data-p="ntfy" ${P.ntfy?'checked':''}> Also send my changes to the event's ntfy topic</label>
 <h3 style="margin-top:14px">Recent updates</h3>${N.length?N.slice(0,15).map(n=>`<div class="meta" style="padding:4px 0;border-bottom:1px solid var(--line)">${esc(n.text)}</div>`).join(''):'<p class="meta">Nothing yet.</p>'}
 <div class="row" style="margin-top:12px"><button class="btn ghost sm" id="clr">Clear updates</button><button class="btn ghost sm del" id="so">Sign out</button></div>`;
}
function authUI(){
 let a=document.getElementById('au');if(a)return;
 a=document.createElement('div');a.id='au';
 a.innerHTML=`<div class="card"><h2>Campus Events</h2><p class="meta">Sign in to share events with your team.</p>
 <label>Your name (for new accounts)</label><input id="an"><label>Email</label><input id="ae" type="email"><label>Password</label><input id="ap" type="password">
 <p id="am" class="meta" style="color:var(--bad)"></p>
 <div class="row"><button class="btn" id="si">Sign in</button><button class="btn ghost" id="su">Create account</button><button class="btn ghost sm" id="off">Use offline</button></div></div>`;
 document.body.append(a);
}
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
 else if(t.id==='si'||t.id==='su'){
  const em=g('ae').value.trim(),pw=g('ap').value,nmv=g('an').value.trim();
  try{if(t.id==='si')await firebase.auth().signInWithEmailAndPassword(em,pw);
   else{const c=await firebase.auth().createUserWithEmailAndPassword(em,pw);await c.user.updateProfile({displayName:nmv||em.split('@')[0]})}}
  catch(x){g('am').textContent=x.message.replace('Firebase: ','')}
 }
});
document.addEventListener('change',e=>{
 const k=e.target.dataset&&e.target.dataset.p;
 if(k){P[k]=e.target.checked?1:0;localStorage.setItem('campus-prefs',JSON.stringify(P))}
});
badge();

if(ready){
 firebase.initializeApp(C);db=firebase.firestore();
 db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
 firebase.auth().onAuthStateChanged(u=>{
  U=u;
  if(u){const a=document.getElementById('au');if(a)a.remove();askPerm();listen();render()}
  else{if(unsub)unsub();authUI()}
 });
}
})();
