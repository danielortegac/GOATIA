(function(){
  'use strict';
  function install(){
    const css=document.querySelector('link[href*="/assets/goatify-markets.css"]')||document.createElement('link');
    css.rel='stylesheet';css.href='/assets/goatify-markets.css?v=20261004-compact-shivo-2';
    if(!css.parentElement)document.body.appendChild(css);
    if(!window.GOATIFY_APPLY_CURRENCY_V48){
      const script=document.createElement('script');
      script.src='/assets/goatify-currency.js?v=20261004-compact-shivo';script.async=false;
      document.head.appendChild(script);
    }
    if(document.querySelector('.gfy-shivo-assistant'))return;
    const existing=Array.from(document.querySelectorAll('a[href*="ia.goatify.app"]')).filter(a=>
      /asistente\s*ia|ai\s*assistant/i.test(a.textContent+' '+(a.getAttribute('aria-label')||'')) &&
      (getComputedStyle(a).position==='fixed'||a.closest('.ai-assistant-widget,.assistant-widget')));
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
    document.querySelectorAll('button[onclick*="scrollTo"],#scrollToTop,#back-to-top').forEach(button=>{
      if(getComputedStyle(button).position==='fixed')button.setAttribute('data-gfy-scroll-top','');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
