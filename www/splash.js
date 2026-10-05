/* CEM 2.0.0: removes the loader once the page is ready.
   - index.html: waits until sign-in state is known (the "gate" class is removed by sync.js).
   - pay.html: sets window.SPLASH_HOLD=1 and calls splashDone() when the payment form is drawn.
   The loader is shown at least ~1.2 s on the first open of a session and ~0.5 s afterwards, then fades out. */
(function(){
var s=document.getElementById('splash');if(!s)return;
var root=document.documentElement,first=true,done=false,loaded=document.readyState==='complete';
try{first=!sessionStorage.getItem('cem-sp');sessionStorage.setItem('cem-sp','1')}catch(e){}
var MIN=first?1200:500;
function hide(){if(done)return;done=true;s.classList.add('out');setTimeout(function(){s.remove()},700)}
function check(){
 if(done||!loaded||window.SPLASH_HOLD||root.classList.contains('gate'))return;
 setTimeout(hide,Math.max(0,MIN-performance.now()));
}
window.splashDone=function(){window.SPLASH_HOLD=0;check()};
window.addEventListener('load',function(){loaded=true;check()});
new MutationObserver(check).observe(root,{attributes:true,attributeFilter:['class']});
check();
/* safety net: never trap the user behind the loader */
setTimeout(function(){root.classList.remove('gate');window.SPLASH_HOLD=0;hide()},12000);
})();
