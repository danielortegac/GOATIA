(function(){
  'use strict';
  function install(){
    const appPreview=document.querySelector('#pwa-section .grid.grid-cols-12');
    if(appPreview){
      appPreview.id='gfy-app-preview';appPreview.classList.add('gfy-app-preview');
      appPreview.parentElement.classList.add('gfy-app-preview-container');
      appPreview.firstElementChild?.firstElementChild?.classList.add('gfy-app-phone');
    }
    const css=document.querySelector('link[href*="/assets/goatify-markets.css"]')||document.createElement('link');
    css.rel='stylesheet';css.href='/assets/goatify-markets.css?v=20261004-responsive-13';
    document.body.appendChild(css);
    if(!window.GOATIFY_APPLY_CURRENCY_V48){
      const script=document.createElement('script');
      script.src='/assets/goatify-currency.js?v=20261004-responsive-13';script.async=false;
      document.head.appendChild(script);
    }
    if(document.querySelector('.gfy-shivo-assistant'))return;
    const existing=Array.from(document.querySelectorAll('a[href*="ia.goatify.app"]')).filter(a=>
      /asistente\s*ia|ai\s*assistant/i.test(a.textContent+' '+(a.getAttribute('aria-label')||'')) &&
      (getComputedStyle(a).position==='fixed'||a.closest('.ai-assistant-widget,.assistant-widget,.gfy-float-right,.floating-assistant')));
    const english=document.documentElement.lang.startsWith('en');
    const assistant=document.createElement('a');assistant.className='gfy-shivo-assistant';
    assistant.href=existing[0]?.href||'https://ia.goatify.app/#/agent/cVsZW8ZM9oHUnKNIXtFc';
    assistant.target='_blank';assistant.rel='noopener';
    assistant.setAttribute('aria-label',english?'Open GOATIFY AI assistant':'Abrir el asistente IA de GOATIFY');
    const mascot=document.createElement('img');mascot.src='/assets/shivo-animado-r71.svg';
    mascot.alt='Shivo';mascot.width=72;mascot.height=48;mascot.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent=english?'AI assistant':'Asistente IA';
    assistant.appendChild(mascot);assistant.appendChild(text);
    existing.forEach(a=>a.setAttribute('data-gfy-original-assistant',''));
    document.body.appendChild(assistant);
    document.querySelectorAll('button[onclick*="scrollTo"],#scrollToTop,#back-to-top,#scrollTopBtn,.gfy-back-top').forEach(button=>{
      if(getComputedStyle(button).position==='fixed')button.setAttribute('data-gfy-scroll-top','');
    });
    const headers=Array.from(document.querySelectorAll('body>header,body>nav.fixed,body>nav.main-nav,header.site-header,#header'));
    function updateAnchorOffset(){
      const height=Math.max(0,...headers.map(header=>{
        const style=getComputedStyle(header);
        return /fixed|sticky/.test(style.position)&&style.display!=='none'?header.getBoundingClientRect().height:0;
      }));
      document.documentElement.style.setProperty('--gfy-nav-offset',Math.ceil(height+16)+'px');
    }
    updateAnchorOffset();
    if('ResizeObserver' in window){const observer=new ResizeObserver(updateAnchorOffset);headers.forEach(header=>observer.observe(header));}
    window.addEventListener('resize',updateAnchorOffset,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
