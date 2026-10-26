/* GLOBEA motion direction. Native browser APIs, no CDN, no perpetual animation loop. */
(() => {
  'use strict';
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=matchMedia('(hover:hover) and (pointer:fine)');
  const ease='cubic-bezier(.16,1,.3,1)';
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const activeAnimations=new Set();
  let navigating=false, raf=0, scrollDirty=true, pointerDirty=false, initialized=false;
  let cursorX=0,cursorY=0,targetX=0,targetY=0,pointerVisible=false;
  let hoverElement=null,hoverRect=null,magnetic=null,magneticRect=null;
  let story=null,storyWrap=null,storyTop=0,storyHeight=0,viewportHeight=innerHeight;
  let lastY=scrollY,lastTime=performance.now(),velocity=0;
  let bootTimer;

  const cursor=document.createElement('div');cursor.className='motion-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<span></span>';
  const cursorSurface=document.createElement('div');cursorSurface.className='motion-cursor-surface';cursorSurface.setAttribute('aria-hidden','true');cursorSurface.append(cursor);
  const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');
  const curtain=document.createElement('div');curtain.className='route-curtain';curtain.setAttribute('aria-hidden','true');curtain.innerHTML='<div class="curtain-lines"></div><div class="curtain-brand"><span class="curtain-orbit">✳</span><span>GLOBEA</span><small>EXPLORE THE WORLD, YOUR WAY.</small></div><div class="curtain-caption"><span>VIETNAM EDITION</span><span class="curtain-route">MỖI NƠI CHỐN, MỘT CÂU CHUYỆN</span><span>01 / DISCOVERY</span></div>';
  document.body.append(cursorSurface,progress,curtain);

  function play(el,frames,options={}) {
    if(reduced.matches||!el?.isConnected||typeof el.animate!=='function')return null;
    const animation=el.animate(frames,{duration:700,easing:ease,fill:'both',...options});
    activeAnimations.add(animation);
    animation.finished.then(()=>{activeAnimations.delete(animation);animation.cancel();}).catch(()=>activeAnimations.delete(animation));
    return animation;
  }
  function requestFrame(){if(!raf)raf=requestAnimationFrame(frame);}
  function measure(){viewportHeight=innerHeight;if(storyWrap){storyTop=storyWrap.getBoundingClientRect().top+scrollY;storyHeight=storyWrap.offsetHeight;}scrollDirty=true;requestFrame();}

  function splitTitle(heading) {
    if(heading.dataset.motionTitle||heading.closest('dialog,#print-plan'))return;
    heading.dataset.motionTitle='true';heading.classList.add('motion-title');
    const accessible=heading.cloneNode(true);$$('br',accessible).forEach(el=>el.replaceWith(' '));
    const original=accessible.textContent.replace(/\s+/g,' ').trim();
    heading.setAttribute('aria-label',original);
    let index=0;
    const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(!node.textContent.trim())return;
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word=>{
        if(!word.trim()){fragment.append(document.createTextNode(word));return;}
        const mask=document.createElement('span');mask.className='motion-word';mask.setAttribute('aria-hidden','true');
        const inner=document.createElement('span');inner.className='motion-word-inner';inner.textContent=word;
        inner.style.setProperty('--word-delay',`${Math.min(index++*48,360)}ms`);mask.append(inner);fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
    titleObserver?.observe(heading);
    if(reduced.matches||!titleObserver)heading.classList.add('motion-in');
  }
  const titleObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-in');titleObserver.unobserve(e.target);}}),{threshold:.12}):null;
  const imageObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-in');imageObserver.unobserve(e.target);}}),{threshold:.1}):null;
  const cardObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-in');cardObserver.unobserve(e.target);}}),{threshold:.08}):null;

  function enhance(scope=document) {
    $$('h1,h2',scope).forEach(splitTitle);
    $$('.intro-image,.interest-photo,.history-image .gallery-trigger,.place-sticky .gallery-trigger,.country-story>div:first-child,.vietnam-hero-image',scope).forEach(el=>{
      if(el.dataset.motionImage)return;el.dataset.motionImage='true';el.classList.add('motion-image');
      if(reduced.matches||!imageObserver)el.classList.add('motion-in');else imageObserver.observe(el);
    });
    $$('.destination-card',scope).forEach((el,i)=>{
      if(el.dataset.motionCard)return;el.dataset.motionCard='true';el.classList.add('motion-card');
      el.style.setProperty('--card-delay',`${(i%3)*75}ms`);
      if(reduced.matches||!cardObserver)el.classList.add('motion-in');else cardObserver.observe(el);
    });
    $$('.section-heading',scope).forEach(el=>el.classList.add('motion-section-heading'));
  }

  function prepareStory() {
    story=$('.story-full');if(!story)return;
    storyWrap=document.createElement('div');storyWrap.className='story-scroll-stage';
    story.before(storyWrap);storyWrap.append(story);
    // Keep the original deep link on the stage, so anchored navigation starts the story.
    storyWrap.id=story.id;story.removeAttribute('id');
    const echo=document.createElement('div');echo.className='story-echo';echo.setAttribute('aria-hidden','true');echo.textContent='CHẠM.';
    const chapters=document.createElement('div');chapters.className='story-chapters';chapters.setAttribute('aria-hidden','true');chapters.innerHTML='<span class="active"><i>01</i>Nhìn gần hơn</span><span><i>02</i>Cảm sâu hơn</span><span><i>03</i>Nhớ lâu hơn</span>';
    story.prepend(echo);$('.story-inner',story).append(chapters);
  }

  function frame(now) {
    raf=0;
    if(reduced.matches)return;
    const y=scrollY;
    if(scrollDirty){
      const length=Math.max(document.documentElement.scrollHeight-viewportHeight,1),p=clamp(y/length);
      root.style.setProperty('--reading-progress',p.toFixed(4));
      root.style.setProperty('--hero-scroll',`${Math.min(y,viewportHeight).toFixed(1)}px`);
      const delta=y-lastY,dt=Math.max(16,now-lastTime);velocity=lerp(velocity,clamp(delta/dt,-3,3),.28);
      root.style.setProperty('--scroll-angle',`${(y*.025+velocity*3).toFixed(2)}deg`);
      if(storyWrap){
        const travel=Math.max(storyHeight-viewportHeight,1),sp=clamp((y-storyTop)/travel);
        story.style.setProperty('--story-progress',sp.toFixed(4));
        const opening=clamp((y-storyTop+viewportHeight*.55)/(viewportHeight*.85));
        story.style.setProperty('--story-frame',`${((1-opening)*(innerWidth>720?55:14)).toFixed(1)}px`);
        const phase=Math.min(2,Math.floor(sp*3));
        $$('.story-chapters>span',story).forEach((el,i)=>el.classList.toggle('active',i===phase));
      }
      const footer=$('.site-footer');if(footer){const rect=footer.getBoundingClientRect();if(rect.top<viewportHeight)footer.style.setProperty('--footer-fill',`${clamp((viewportHeight-rect.top)/(rect.height*.85))*100}%`);}
      if(pointerVisible&&pointer.matches){syncHover(document.elementFromPoint(targetX,targetY));if(hoverElement)hoverRect=hoverElement.getBoundingClientRect();if(magnetic)magneticRect=magnetic.getBoundingClientRect();}
      lastY=y;lastTime=now;scrollDirty=false;
    }
    if(pointer.matches&&pointerVisible){
      cursorX=lerp(cursorX,targetX,.22);cursorY=lerp(cursorY,targetY,.22);
      cursor.style.transform=`translate3d(${cursorX.toFixed(2)}px,${cursorY.toFixed(2)}px,0)`;
      const distance=Math.abs(cursorX-targetX)+Math.abs(cursorY-targetY);
      if(pointerDirty){
        if(hoverElement&&hoverRect){const x=clamp((targetX-hoverRect.left)/hoverRect.width),yy=clamp((targetY-hoverRect.top)/hoverRect.height);hoverElement.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);hoverElement.style.setProperty('--my',`${(yy*100).toFixed(1)}%`);hoverElement.style.setProperty('--rotate-x',`${(-(yy-.5)*6).toFixed(2)}deg`);hoverElement.style.setProperty('--rotate-y',`${((x-.5)*7).toFixed(2)}deg`);}
        if(magnetic&&magneticRect){const x=(targetX-magneticRect.left-magneticRect.width/2)*.12,yy=(targetY-magneticRect.top-magneticRect.height/2)*.18;magnetic.style.setProperty('--magnet-x',`${clamp(x,-7,7).toFixed(2)}px`);magnetic.style.setProperty('--magnet-y',`${clamp(yy,-6,6).toFixed(2)}px`);}
        if(y<viewportHeight&&!document.querySelector('dialog[open]')){root.style.setProperty('--hero-pointer-x',`${((targetX/innerWidth-.5)*-9).toFixed(2)}px`);root.style.setProperty('--hero-pointer-y',`${((targetY/viewportHeight-.5)*-7).toFixed(2)}px`);}
        pointerDirty=false;
      }
      if(distance>.15)requestFrame();
    }
  }

  function resetHover(){if(hoverElement){hoverElement.classList.remove('pointer-active');hoverElement.style.setProperty('--rotate-x','0deg');hoverElement.style.setProperty('--rotate-y','0deg');hoverElement=null;hoverRect=null;}if(magnetic){magnetic.style.setProperty('--magnet-x','0px');magnetic.style.setProperty('--magnet-y','0px');magnetic=null;magneticRect=null;}}
  function syncPointer(){const enabled=pointer.matches&&!reduced.matches;root.classList.toggle('motion-pointer',enabled);if(!enabled){cursor.classList.remove('visible');pointerVisible=false;resetHover();}}
  function syncHover(target){
    if(!target?.closest)return;
    const frameEl=target.closest('.destination-image,.interest-visual,.plan-preview,.gallery-grid .gallery-trigger');
    if(frameEl!==hoverElement){resetHover();if(frameEl){hoverElement=frameEl;hoverRect=frameEl.getBoundingClientRect();frameEl.classList.add('pointer-active');}}
    const magnet=target.closest('.button,.round-link,.search-submit,.add-place,.gallery-arrow');
    if(magnet!==magnetic){if(magnetic){magnetic.style.setProperty('--magnet-x','0px');magnetic.style.setProperty('--magnet-y','0px');}magnetic=magnet;magneticRect=magnet?.getBoundingClientRect();if(magnet)magnet.classList.add('is-magnetic');}
    const imageLink=target.closest('.destination-image a,.gallery-trigger,.hero-image,.place-hero-image');
    const editing=target.closest('input,select,textarea,summary');
    cursor.classList.toggle('is-image',!!imageLink&&!editing);
    cursor.classList.toggle('is-link',!!target.closest('a,button')&&!imageLink&&!editing);
    cursor.classList.toggle('is-editing',!!editing);
    cursor.classList.toggle('in-dialog',!!target.closest('dialog'));
    const label=imageLink?.matches('.gallery-trigger')?'XEM ẢNH':imageLink?.closest('.destination-image')?'KHÁM PHÁ':'CẢM NHẬN';
    if($('span',cursor).textContent!==label)$('span',cursor).textContent=label;
    pointerDirty=true;
  }
  document.addEventListener('pointermove',e=>{
    if(!pointer.matches||reduced.matches||e.pointerType==='touch')return;
    targetX=e.clientX;targetY=e.clientY;
    if(!pointerVisible){cursorX=targetX;cursorY=targetY;pointerVisible=true;cursor.classList.add('visible');}
    syncHover(e.target);pointerDirty=true;requestFrame();
  },{passive:true});
  document.addEventListener('pointerover',e=>{
    if(!pointer.matches||reduced.matches)return;
    syncHover(e.target);requestFrame();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointerVisible=false;cursor.classList.remove('visible');resetHover();});
  document.addEventListener('pointerdown',()=>cursor.classList.add('is-pressed'),{passive:true});
  document.addEventListener('pointerup',()=>cursor.classList.remove('is-pressed'),{passive:true});

  // A local ripple, anchored where the user actually touches the control.
  document.addEventListener('click',e=>{
    const button=e.target.closest('.button,.search-submit,.favorite,.add-place,.filter-tabs button,.filter-saved');
    if(button&&!reduced.matches){const r=button.getBoundingClientRect();const ink=document.createElement('span');ink.className='motion-ink';ink.setAttribute('aria-hidden','true');const size=Math.max(r.width,r.height)*2;ink.style.cssText=`width:${size}px;height:${size}px;left:${(e.clientX||r.left+r.width/2)-r.left}px;top:${(e.clientY||r.top+r.height/2)-r.top}px;`;button.append(ink);const a=play(ink,[{transform:'translate(-50%,-50%) scale(0)',opacity:.35},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:750});if(a)a.finished.finally(()=>ink.remove()).catch(()=>{});else ink.remove();}
  });

  // Preserve the previous photo for a real wipe between interest tabs.
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-interest]');if(!tab||tab.getAttribute('aria-selected')==='true'||reduced.matches)return;
    const image=$('#interest-image'),holder=image?.parentElement;if(!image||!holder)return;
    $$('.interest-wipe',holder).forEach(el=>el.remove());
    const old=image.cloneNode();old.removeAttribute('id');old.removeAttribute('srcset');old.src=image.currentSrc||image.src;old.classList.add('interest-wipe');old.setAttribute('aria-hidden','true');holder.append(old);
    requestAnimationFrame(()=>{play(image,[{transform:'scale(1.13)'},{transform:'scale(1)'}],{duration:1150});const a=play(old,[{clipPath:'inset(0 0 0 0)',transform:'scale(1)'},{clipPath:'inset(0 0 0 100%)',transform:'scale(1.04)'}],{duration:850});a?.finished.finally(()=>old.remove()).catch(()=>{});});
  },true);

  // Keep navigation a real link; use a short cinematic cover only for ordinary local clicks.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download')||reduced.matches)return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin||!url.pathname.endsWith('.html')||url.pathname===location.pathname||a.classList.contains('skip-link'))return;
    if(!['http:','https:','file:'].includes(url.protocol))return;
    e.preventDefault();if(navigating)return;navigating=true;
    const d=window.GLOBEA?.destinations.find(d=>url.pathname.endsWith('/'+d.id+'.html'));
    $('.curtain-route',curtain).textContent=d?d.name.toUpperCase():url.pathname.endsWith('vietnam.html')?'VIỆT NAM / VẠN ĐIỀU ĐỂ THƯƠNG':'THE NEXT CHAPTER';
    resetHover();cursor.classList.remove('visible');curtain.classList.add('leaving');curtain.classList.remove('arriving');
    try{sessionStorage.setItem('globea-motion-navigation','1')}catch{}
    setTimeout(()=>location.assign(url.href),430);
    setTimeout(()=>{if(document.visibilityState==='visible'){curtain.classList.remove('leaving');navigating=false;}},2200);
  });

  let mutationQueued=false;
  const mutationObserver=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'&&r.addedNodes.length)&&!mutationQueued){mutationQueued=true;requestAnimationFrame(()=>{mutationQueued=false;enhance();measure();});}
    records.forEach(record=>{
      const el=record.target;
      if(record.type==='attributes'&&record.attributeName==='open'&&el.open){
        if(el.id==='lightbox'){play($('figure',el),[{opacity:0,transform:'translateY(22px) scale(.94)'},{opacity:1,transform:'none'}],{duration:850});}
        if(el.id==='planner'){cursor.classList.remove('visible');play($('.drawer-head',el),[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:750,delay:140});}
      }
      if(record.type==='childList'&&['history-panel','region-results','day-panel'].includes(el.id))play(el,[{opacity:.15,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:650});
    });
  });

  async function arrival() {
    if(reduced.matches){curtain.classList.add('finished');return;}
    let internal=false,seen=false;try{internal=sessionStorage.getItem('globea-motion-navigation')==='1';sessionStorage.removeItem('globea-motion-navigation');seen=sessionStorage.getItem('globea-motion-intro')==='1';sessionStorage.setItem('globea-motion-intro','1')}catch{}
    if(!internal&&(seen||document.body.dataset.page!=='home'||location.hash)){curtain.classList.add('finished');return;}
    curtain.classList.add('arriving','initial-cover');root.classList.add('motion-booting');
    requestAnimationFrame(()=>requestAnimationFrame(()=>curtain.classList.remove('initial-cover')));
    const timeout=new Promise(resolve=>setTimeout(resolve,1000));
    await Promise.race([document.fonts.ready,timeout]);
    bootTimer=setTimeout(()=>{curtain.classList.add('finished');root.classList.remove('motion-booting');$('.hero-copy h1')?.classList.add('motion-in');},internal?180:560);
  }

  function initialize() {
    if(initialized||!window.GlobeaPlanner)return;initialized=true;
    root.classList.add('motion-ready');prepareStory();enhance();syncPointer();measure();arrival();
    ['#destination-results','#region-results','#history-panel','#interest-matches','#planner-result','#mobile-menu'].forEach(selector=>{const el=$(selector);if(el)mutationObserver.observe(el,{childList:true,subtree:true});});
    $$('dialog').forEach(el=>mutationObserver.observe(el,{attributes:true,attributeFilter:['open']}));
    if('ResizeObserver'in window){const resize=new ResizeObserver(measure);resize.observe($('#main'));}
  }
  addEventListener('scroll',()=>{scrollDirty=true;requestFrame();},{passive:true});
  addEventListener('resize',()=>{resetHover();measure();},{passive:true});
  addEventListener('pageshow',e=>{if(e.persisted){navigating=false;curtain.classList.remove('leaving','arriving');curtain.classList.add('finished');root.classList.remove('motion-booting');measure();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pointerVisible=false;cursor.classList.remove('visible');resetHover();}else measure();});
  reduced.addEventListener('change',()=>{syncPointer();if(reduced.matches){clearTimeout(bootTimer);curtain.classList.add('finished');root.classList.remove('motion-booting');activeAnimations.forEach(a=>a.cancel());$$('.motion-title,.motion-image,.motion-card').forEach(el=>el.classList.add('motion-in'));}else measure();});
  pointer.addEventListener('change',syncPointer);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
  // BFCache and print remain instant, independent of the presentation layer.
  addEventListener('beforeprint',()=>{cursor.classList.remove('visible');curtain.classList.add('finished');});
  window.GlobeaMotion=Object.freeze({refresh:()=>{enhance();measure();},version:'1.0',features:['word-reveal','image-wipe','directional-hover','magnetic-controls','scroll-story','route-curtain','reading-progress']});
})();
