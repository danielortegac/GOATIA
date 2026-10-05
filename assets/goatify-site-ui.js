(function(){
  'use strict';
  function installHomeLogoCycle(header){
    if(document.body.dataset.gfyPage!=='home')return;
    const logo=header.querySelector('a.logo'),original=logo?.querySelector(':scope>img');
    if(!original||logo.dataset.gfyLogoCycleInstalled)return;
    logo.dataset.gfyLogoCycleInstalled='1';
    const frame=document.createElement('span'),shivo=document.createElement('img');
    frame.className='gfy-header-logo-cycle';original.classList.add('gfy-header-logo-original');
    shivo.className='gfy-header-logo-shivo';shivo.alt='';shivo.setAttribute('aria-hidden','true');
    shivo.decoding='async';shivo.draggable=false;
    original.replaceWith(frame);frame.append(original,shivo);
    const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
    let timer=0,deadline=0,remaining=6000,showShivo=false,ready=false;
    function stop(preserve){
      if(!timer)return;
      if(preserve)remaining=Math.max(0,deadline-performance.now());
      clearTimeout(timer);timer=0;
    }
    function resume(){
      if(timer||!ready||reduced.matches||document.hidden)return;
      deadline=performance.now()+remaining;
      timer=setTimeout(()=>{
        timer=0;showShivo=!showShivo;
        frame.classList.toggle('gfy-header-show-shivo',showShivo);
        remaining=showShivo?5000:6000;resume();
      },remaining);
    }
    function resetMotion(){
      stop(false);showShivo=false;remaining=6000;
      frame.classList.remove('gfy-header-show-shivo');resume();
    }
    reduced.addEventListener('change',resetMotion);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(true);else resume();});
    shivo.addEventListener('load',()=>{ready=true;resume();},{once:true});
    shivo.addEventListener('error',()=>{ready=false;resetMotion();},{once:true});
    shivo.src='/assets/shivo-animado-r71.svg';
  }
  function installPortalNavigation(header){
    if(header.classList.contains('gfy-portal-navigation-ready'))return;
    const menu=header.querySelector('.nav-links'),actions=header.querySelector('.nav-buttons');
    if(!menu||!actions)return;
    const portal=actions.querySelector('.btn-primary');
    if(portal){
      const label=portal.textContent.trim(),full=document.createElement('span'),compact=document.createElement('span');
      full.className='gfy-portal-label-desktop';compact.className='gfy-portal-label-mobile';compact.textContent='Portal';
      while(portal.firstChild)full.appendChild(portal.firstChild);
      portal.appendChild(full);portal.appendChild(compact);portal.setAttribute('aria-label',label);
    }
    const navigation=header.closest('.main-nav'),ticker=document.querySelector('body[data-gfy-page="portal"]>.pulse-tracker');
    if(navigation&&ticker&&navigation.parentNode===ticker.parentNode)ticker.parentNode.insertBefore(navigation,ticker);
    const tools=document.createElement('div');tools.className='gfy-portal-tools';
    const country=actions.querySelector('.gfy-country-picker');
    const language=document.getElementById('gfy-language-toggle-v33');
    if(country)tools.appendChild(country);
    if(language)tools.appendChild(language);
    header.appendChild(tools);
    menu.id=menu.id||'gfy-portal-navigation';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='gfy-portal-menu-toggle';
    toggle.setAttribute('aria-controls',menu.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menú');
    toggle.innerHTML='<span aria-hidden="true">☰</span><span class="gfy-portal-menu-label">Menú</span>';tools.appendChild(toggle);
    function close(restoreFocus){
      header.classList.remove('gfy-portal-menu-open');toggle.setAttribute('aria-expanded','false');
      if(restoreFocus)toggle.focus();
    }
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      header.classList.toggle('gfy-portal-menu-open',open);toggle.setAttribute('aria-expanded',String(open));
    });
    menu.addEventListener('click',event=>{if(event.target.closest('a'))close(false);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('gfy-portal-menu-open'))close(true);});
    window.matchMedia('(max-width:1100px)').addEventListener('change',()=>close(false));
    header.classList.add('gfy-portal-navigation-ready');
  }
  function installServiceMobileCta(){
    document.querySelectorAll('header.site-header').forEach(header=>{
      const menu=header.querySelector('#nav.nav-links,#primary-nav.nav-links');
      const toggle=header.querySelector('.menu,.menu-button'),source=header.querySelector('a.nav-cta');
      if(!menu||!toggle||!source||menu.contains(source)||menu.querySelector('.gfy-mobile-primary-cta'))return;
      const action=source.cloneNode(true);action.removeAttribute('id');action.classList.add('gfy-mobile-primary-cta');
      menu.appendChild(action);
      function close(restoreFocus){
        menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');
        if(restoreFocus)toggle.focus();
      }
      menu.addEventListener('click',event=>{if(event.target.closest('a'))close(false);});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('open'))close(true);});
      window.matchMedia('(max-width:980px)').addEventListener('change',()=>close(false));
    });
  }
  function installHomeNavigation(header){
    const menu=header.querySelector('.nav-menu');
    if(!menu)return;
    menu.id=menu.id||'gfy-home-menu';
    const toolbar=document.createElement('div');
    toolbar.className='gfy-mobile-toolbar';
    const portal=document.createElement('a');
    portal.href='https://ia.goatify.app';portal.target='_blank';portal.rel='noopener';
    portal.className='gfy-mobile-portal';portal.textContent='Portal GOATIFY';
    const prices=document.createElement('a');prices.href='/pricing/';prices.textContent='Precios';
    const toggle=document.createElement('button');toggle.type='button';
    toggle.className='gfy-menu-toggle';toggle.setAttribute('aria-controls',menu.id);
    toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span aria-hidden="true">☰</span> Menú';
    toolbar.append(portal,prices,toggle);header.insertBefore(toolbar,menu);
    const external=menu.querySelector('.nav-row-external');
    const internal=menu.querySelector('.nav-row-internal');
    [external,internal].forEach((row,i)=>{
      if(!row)return;
      const title=document.createElement('span');title.className='gfy-menu-heading';
      title.textContent=i?'Explora el inicio':'Servicios y soluciones';
      row.insertBefore(title,row.firstChild);
    });
    const more=document.createElement('div');more.className='gfy-menu-more';
    const title=document.createElement('span');title.className='gfy-menu-heading';title.textContent='GOATIFY y su ecosistema';more.appendChild(title);
    const company=document.querySelectorAll('#gfy-eco-menu-v26 .gfy-eco-group-v26:last-child a');
    company.forEach(source=>{
      const link=source.cloneNode(true);link.querySelector('i')?.remove();
      link.className='nav-link';more.appendChild(link);
    });
    const ecosystem=document.createElement('a');ecosystem.href='/ecosistema/';
    ecosystem.className='nav-link';ecosystem.textContent='Todos los productos y servicios';more.appendChild(ecosystem);
    menu.appendChild(more);
    function close(restoreFocus){
      header.classList.remove('gfy-menu-open');toggle.setAttribute('aria-expanded','false');
      if(restoreFocus)toggle.focus();
    }
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      header.classList.toggle('gfy-menu-open',open);toggle.setAttribute('aria-expanded',String(open));
      if(open){menu.scrollTop=0;document.getElementById('gfy-eco-menu-v26')?.removeAttribute('open');}
    });
    menu.addEventListener('click',event=>{if(event.target.closest('a'))close(false);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('gfy-menu-open'))close(true);});
    window.matchMedia('(max-width:992px)').addEventListener('change',()=>close(false));
    header.classList.add('gfy-navigation-ready');
  }
  function isFloating(element){
    if(element.closest('header,nav,[role="dialog"],.modal,.modal-overlay,#userPublicProfileModal,#freeConsultationPopup,#cartDrawer,#cart-modal,#cart-sidebar,#promo-modal,#info-modal,#promoPopup,#promo-popup,#modal-container,#modal-overlay,#upgradeModal,#newCommunityModal,#userProfileModal,#paymentModal,#qrModal,#notifModal,#truequeModal,#infoModal'))return false;
    for(let current=element;current&&current!==document.body;current=current.parentElement){
      if(getComputedStyle(current).position==='fixed')return true;
    }
    return false;
  }
  function isLegacyAssistant(link){
    return link.matches('.float-btn.ai,.float.ai,.float-ai,.gfy-assistant-fab,.advisor-fab,.floating-assistant')||/asistente|assistant/i.test(link.textContent+' '+(link.getAttribute('aria-label')||'')+' '+link.title);
  }
  function installHomeFooterDock(){
    if(document.body.dataset.gfyPage!=='home')return null;
    const footer=document.querySelector('footer.footer-extended'),container=footer?.querySelector(':scope > .container');
    if(!container||footer.dataset.gfyUtilityDockInstalled)return null;
    footer.dataset.gfyUtilityDockInstalled='1';
    const dock=document.createElement('div');dock.className='gfy-footer-utility-dock';dock.hidden=true;
    dock.setAttribute('role','group');dock.setAttribute('aria-label',document.documentElement.lang.startsWith('en')?'Help and navigation':'Ayuda y navegación');
    container.appendChild(dock);
    const rail=document.createElement('div'),controls=document.createElement('div');
    rail.className='gfy-main-utility-rail';rail.hidden=true;
    rail.setAttribute('role','group');rail.setAttribute('aria-label',dock.getAttribute('aria-label'));
    controls.className='gfy-main-utility-controls';rail.appendChild(controls);document.body.appendChild(rail);
    document.body.dataset.gfyUtilityRailInstalled='1';
    const positions=new Map();
    const selector='.gfy-shivo-assistant,[data-gfy-scroll-top],[data-gfy-floating-cart],[data-gfy-floating-whatsapp]';
    function sync(){
      if(!footer.isConnected)return;
      // Its top is unchanged by the dock's height. Keep controls docked below
      // the footer too, including the country directory which follows it.
      const active=footer.getBoundingClientRect().top<innerHeight+80;
      const target=active?dock:controls;
      document.querySelectorAll(selector).forEach(node=>{
        if(positions.has(node)||!isFloating(node))return;
        const marker=document.createComment('GOATIFY original utility control position');
        node.parentNode.insertBefore(marker,node);positions.set(node,marker);
        node.setAttribute('data-gfy-footer-docked','');
      });
      positions.forEach((marker,node)=>{
        if(!node.isConnected){marker.remove();positions.delete(node);return;}
        if(node.parentNode!==target)target.appendChild(node);
      });
      dock.hidden=!active||!positions.size;
      rail.hidden=active||!positions.size;
    }
    let frame;
    function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync();});}
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(schedule,{rootMargin:'0px 0px 80px 0px',threshold:0});observer.observe(footer);}
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    return sync;
  }
  function installFloatingControls(){
    const syncFooterDock=installHomeFooterDock();
    const topSelector='[data-gfy-scroll-top],#backToTopBtn,#scrollToTopBtn,#scrollTopBtn,#btnScrollTop,#back-to-top,#scrollToTop,.gfy-back-top,.to-top,a.top[href="#top"],[onclick*="scrollTo"]';
    const overlays='#freeConsultationPopup.active,#modalOverlay.active,#cartOverlay.active,#cartDrawer.active,#cart-modal:not(.hidden),#cart-sidebar:not(.translate-x-full),#cart-bar.visible,#modal-overlay:not(.hidden),#modal-container:not(.hidden),#promo-popup:not(.hidden),#promoPopup.active,#promo-modal:not(.hidden),#info-modal.show,#upgradeModal:not(.hidden),#newCommunityModal:not(.hidden),#userProfileModal:not(.hidden),#paymentModal:not(.hidden),#qrModal:not(.hidden),#userPublicProfileModal:not(.hidden),#notifModal,#truequeModal,#infoModal';
    function visible(element){
      const style=getComputedStyle(element),rect=element.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0&&rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight;
    }
    function refresh(){
      const tops=Array.from(document.querySelectorAll(topSelector)).filter(element=>isFloating(element)||element.hasAttribute('data-gfy-footer-docked'));
      const legacyActive=tops.find(button=>button.id==='btnScrollTop');
      if(legacyActive){tops.splice(tops.indexOf(legacyActive),1);tops.unshift(legacyActive);}
      tops.forEach((button,i)=>{
        button.setAttribute(i?'data-gfy-duplicate-top':'data-gfy-scroll-top','');
        if(i)button.removeAttribute('data-gfy-scroll-top');
        else {button.setAttribute('aria-label',document.documentElement.lang.startsWith('en')?'Back to top':'Volver arriba');if(button.tagName==='DIV'){button.setAttribute('role','button');button.tabIndex=0;if(!button.dataset.gfyTopKeyboard){button.dataset.gfyTopKeyboard='1';button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();button.click();}});}}}
      });
      document.querySelectorAll('a[href*="ia.goatify.app"]').forEach(link=>{
        if(!link.classList.contains('gfy-shivo-assistant')&&isFloating(link)&&isLegacyAssistant(link))link.setAttribute('data-gfy-original-assistant','');
      });
      document.querySelectorAll('a[href*="wa.me"],a[href*="api.whatsapp.com"],.whatsapp-float,.gfy-whatsapp-fab,.float-wa,.floating-whatsapp-bubble').forEach(link=>{
        if(link.id!=='floating-cart-btn'&&isFloating(link))link.setAttribute('data-gfy-floating-whatsapp','');
      });
      document.querySelectorAll('.cart-fab').forEach(cart=>{if(isFloating(cart))cart.setAttribute('data-gfy-floating-cart','');});
      const cart=document.querySelector('[data-gfy-floating-cart]');
      const cartHeight=Math.ceil(cart?.getBoundingClientRect().height||44)+'px';
      if(document.documentElement.style.getPropertyValue('--gfy-cart-height')!==cartHeight)document.documentElement.style.setProperty('--gfy-cart-height',cartHeight);
      const blocked=Array.from(document.querySelectorAll(overlays)).some(visible);
      document.body.toggleAttribute('data-gfy-overlay-open',blocked);
      if(syncFooterDock)syncFooterDock();
    }
    refresh();
    let frame;
    const observer=new MutationObserver(()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;refresh();});});
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
    document.addEventListener('transitionend',event=>{if(event.target.matches(overlays))refresh();});
    window.addEventListener('resize',refresh,{passive:true});
  }
  function install(){
    if(document.body.dataset.gfySiteUiInstalled)return;
    document.body.dataset.gfySiteUiInstalled='1';
    const portalHeader=document.querySelector('body[data-gfy-page="portal"] .main-nav .nav-container');
    if(portalHeader)installPortalNavigation(portalHeader);
    installServiceMobileCta();
    const homeHeader=document.querySelector('body[data-gfy-page="home"] .nav-container');
    if(homeHeader){
      const actions=homeHeader.querySelector('.header-actions');
      const language=document.getElementById('gfy-language-toggle-v33');
      const portal=actions?.querySelector('.btn-header-special');
      const menu=homeHeader.querySelector('.nav-row-external');
      if(actions&&language)actions.appendChild(language);
      if(portal&&menu){
        const originalPosition=document.createComment('Portal action desktop position');
        portal.parentNode.insertBefore(originalPosition,portal);
        const mobile=window.matchMedia('(max-width:992px)');
        function placePortal(){
          if(mobile.matches)menu.insertBefore(portal,menu.firstChild);
          else originalPosition.parentNode.insertBefore(portal,originalPosition.nextSibling);
        }
        placePortal();mobile.addEventListener('change',placePortal);
      }
      document.body.dataset.gfyPage='home';
      installHomeNavigation(homeHeader);
      installHomeLogoCycle(homeHeader);
    }
    const appPreview=document.querySelector('#pwa-section .grid.grid-cols-12');
    if(appPreview){
      appPreview.id='gfy-app-preview';appPreview.classList.add('gfy-app-preview');
      appPreview.parentElement.classList.add('gfy-app-preview-container');
      appPreview.firstElementChild?.firstElementChild?.classList.add('gfy-app-phone');
    }
    const css=document.querySelector('link[href*="/assets/goatify-markets.css"]')||document.createElement('link');
    css.rel='stylesheet';css.href='/assets/goatify-markets.css?v=20261004-responsive-45';
    document.body.appendChild(css);
    if(homeHeader){
      ['goatify-home-design.css','goatify-navigation.css'].forEach(file=>{
        const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/assets/'+file+'?v=20261004-responsive-45';document.body.appendChild(sheet);
      });
    }
    if(!window.GOATIFY_APPLY_CURRENCY_V48){
      const script=document.createElement('script');
      script.src='/assets/goatify-currency.js?v=20261004-responsive-45';script.async=false;
      document.head.appendChild(script);
    }
    if(document.querySelector('.gfy-shivo-assistant')){installFloatingControls();return;}
    const existing=Array.from(document.querySelectorAll('a[href*="ia.goatify.app"]')).filter(a=>
      isLegacyAssistant(a) &&
      isFloating(a));
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
    installFloatingControls();
    const headers=Array.from(document.querySelectorAll('body>header,body>nav.fixed,body>nav.main-nav,header.site-header,#header'));
    function updateAnchorOffset(){
      const height=Math.max(0,...headers.map(header=>{
        const style=getComputedStyle(header);
        if(!/fixed|sticky/.test(style.position)||style.display==='none')return 0;
        const toolbar=header.querySelector('.gfy-menu-open .gfy-mobile-toolbar');
        return toolbar?toolbar.getBoundingClientRect().bottom-header.getBoundingClientRect().top+parseFloat(style.paddingBottom||0):header.getBoundingClientRect().height;
      }));
      document.documentElement.style.setProperty('--gfy-nav-offset',Math.ceil(height+16)+'px');
    }
    updateAnchorOffset();
    if('ResizeObserver' in window){const observer=new ResizeObserver(updateAnchorOffset);headers.forEach(header=>observer.observe(header));}
    window.addEventListener('resize',updateAnchorOffset,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
