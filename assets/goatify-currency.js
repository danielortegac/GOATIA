(function(){
  'use strict';
  const C = window.GOATIFY_COMMERCIAL;
  const RATES = C.rates;
  const OPTIONS = Object.fromEntries(Object.keys(RATES).map(code=>[code,code]));
  const LOCALES = C.locales;
  const SYMBOLS = C.symbols;
  const COUNTRY_TO_CURRENCY = C.countryCurrency;
  const SUPPORTED = Object.keys(RATES);
  const MANUAL_KEY = 'goatify_currency_manual_v40';
  const LEGACY_MANUAL_KEY = 'goatify_currency_manual';
  const COUNTRY_KEY = 'goatify_currency_country_v40';
  let applying = false;
  let renderedCurrency = '';
  let userSelected = false;

  function setText(el,text){ if(el.textContent !== text) el.textContent = text; }
  function norm(c){ c=String(c||'USD').toUpperCase(); return RATES[c] ? c : 'USD'; }
  function fromCountry(code){ return COUNTRY_TO_CURRENCY[String(code||'').toUpperCase()] || null; }
  function fallbackCurrency(){ return 'USD'; }
  function symbol(currency){ return SYMBOLS[norm(currency)] || '$'; }
  function convertedValue(usd, currency){ return Number(usd || 0) * (RATES[norm(currency)] || 1); }
  function decimalsFor(currency, value){
    currency = norm(currency);
    if ((currency === 'USD' || currency === 'EUR') && Math.abs(value - Math.round(value)) > 0.0001) return 2;
    return 0;
  }
  function numberOnly(usd, currency){
    currency = norm(currency);
    const value = convertedValue(usd, currency);
    const digits = decimalsFor(currency, value);
    return new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }).format(value);
  }
  function money(usd, currency, withCode=true){
    currency = norm(currency);
    const prefix = currency === 'PEN' ? 'S/ ' : symbol(currency);
    const formatted = `${prefix}${numberOnly(usd, currency)}`;
    return withCode ? `${formatted} ${currency}` : formatted;
  }
  function readUsd(el){
    const raw = el.getAttribute('data-usd') || el.getAttribute('data-price-usd') || el.getAttribute('data-goatify-usd') || el.getAttribute('data-base-price') || '0';
    const n = parseFloat(String(raw).replace(/,/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function getLS(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  function setLS(key, value){ try { localStorage.setItem(key, value); } catch(e){} }
  function removeLS(key){ try { localStorage.removeItem(key); } catch(e){} }
  function protect(el){
    if (!el || el.nodeType !== 1) return;
    el.setAttribute('translate','no');
    el.setAttribute('lang','zxx');
    el.classList.add('notranslate','gfy-money-lock-v48');
  }
  function injectStyle(){
    if (document.getElementById('gfy-currency-style-v48')) return;
    const st=document.createElement('style');
    st.id='gfy-currency-style-v48';
    st.textContent='.gfy-currency-code-v48{font-size:.38em;margin-left:.35rem;font-weight:800;opacity:.78;text-transform:uppercase;white-space:nowrap}.gfy-money-lock-v48{unicode-bidi:isolate}.price-display{min-width:0}.price-display .price-val{min-width:0}';
    document.head.appendChild(st);
  }
  function resetLegacyCurrencyIfUnconfirmed(){
    if (!getLS(MANUAL_KEY)) removeLS(LEGACY_MANUAL_KEY);
  }
  function ensureOptions(){
    document.querySelectorAll('select[id*="currency"], select.currency-select, select.currency-selector').forEach(sel => {
      protect(sel);
      const existing = new Set([...sel.options].map(o => String(o.value||'').toUpperCase()));
      SUPPORTED.forEach(cur => {
        if (!existing.has(cur)) {
          const opt = document.createElement('option'); opt.value = cur; opt.textContent = OPTIONS[cur]; sel.appendChild(opt);
        }
      });
      [...sel.options].forEach(opt => protect(opt));
    });
  }
  function setLabels(currency){
    const qlasePeriod=document.getElementById('price-pro-currency');
    if(qlasePeriod){setText(qlasePeriod,`/ MES (${currency})`);protect(qlasePeriod);}
    const qlaseFree=document.getElementById('price-free-value');
    if(qlaseFree){setText(qlaseFree,money(0,currency,true));protect(qlaseFree);}
    document.querySelectorAll('.currency-label, .dyn-label').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (/mes/i.test(txt)) setText(el,`${currency}/mes`);
      else if (/año|ano/i.test(txt)) setText(el,`${currency}/año`);
      else setText(el,currency);
      protect(el);
    });
    document.querySelectorAll('.price-symbol').forEach(el => { setText(el,currency === 'PEN' ? 'S/' : symbol(currency)); protect(el); });
    document.querySelectorAll('.price-val[data-usd]').forEach(el => {
      const parent=el.parentElement;
      if (!parent) return;
      protect(parent); protect(el);
      const hasLabel=parent.querySelector('.currency-label,.dyn-label');
      let code=parent.querySelector('.gfy-currency-code-v48');
      if (hasLabel) { if(code) code.remove(); return; }
      if(!code){ code=document.createElement('span'); code.className='gfy-currency-code-v48'; el.insertAdjacentElement('afterend',code); }
      setText(code,currency); protect(code);
    });
    document.querySelectorAll('.plan-period-new').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (/mes/i.test(txt)) setText(el,`${currency}/mes`);
      else if (/año|ano/i.test(txt)) setText(el,`${currency}/año`);
      else if (/USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG/i.test(txt)) setText(el,txt.replace(/USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG/gi, currency));
      protect(el);
    });
    document.querySelectorAll('.plan-period').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (/USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG/i.test(txt)) setText(el,txt.replace(/USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG/gi, currency));
      protect(el);
    });
  }
  function protectPricingUI(){
    document.querySelectorAll('[data-usd], [data-price-usd], [data-goatify-usd], [data-base-price], .price-display, .currency-label, .dyn-label, .plan-period, .plan-period-new, select[id*="currency"], select.currency-select, select.currency-selector').forEach(protect);
    ['web-plans-container','automation-plans-container','ai-plans-container','addons-container','training-container','cart-sidebar','calculator-section','social-media-packages'].forEach(id => {
      const el=document.getElementById(id); if(el){ el.setAttribute('translate','no'); el.classList.add('notranslate'); }
    });
  }
  function setSelectors(currency){
    ensureOptions();
    document.querySelectorAll('select[id*="currency"], select.currency-select, select.currency-selector').forEach(sel => { sel.value = currency; protect(sel); });
    document.querySelectorAll('[data-currency]').forEach(btn => {
      const active = String(btn.getAttribute('data-currency') || '').toUpperCase() === currency;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function formatNodes(currency){
    document.querySelectorAll('.dynamic-price[data-usd], .price-dynamic[data-usd], .price-dynamic[data-price-usd], .js-currency[data-usd]').forEach(el => {
      setText(el,money(readUsd(el), currency, true)); protect(el);
    });
    document.querySelectorAll('.dyn-price[data-usd]').forEach(el => {
      const siblingLabel = el.parentElement && el.parentElement.querySelector('.dyn-label');
      setText(el,siblingLabel ? money(readUsd(el), currency, false) : money(readUsd(el), currency, true));
      protect(el);
    });
    document.querySelectorAll('.price-val[data-usd]').forEach(el => { setText(el,numberOnly(readUsd(el), currency)); protect(el); });
    document.querySelectorAll('[data-usd], [data-base-price], [data-price-usd]').forEach(el => {
      if (el.matches('.dynamic-price,.price-dynamic,.js-currency,.dyn-price,.price-val')) return;
      if (el.children.length === 0 && (el.hasAttribute('data-base-price') || /\$|USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG|S\//.test(el.textContent || ''))) setText(el,money(readUsd(el), currency, true));
      protect(el);
    });
  }
  function applyCurrency(currency, source){
    currency = norm(currency);
    if (applying) return;
    applying = true;
    const changed = window.GOATIFY_CURRENCY !== currency;
    window.GOATIFY_CURRENCY = currency;
    window.GOATIFY_BASE_CURRENCY = 'USD';
    window.GOATIFY_EXCHANGE_RATES = RATES;
    window.GOATIFY_CURRENCY_SOURCE = source || 'auto';
    try { if (typeof currentCurrency !== 'undefined') currentCurrency = currency; } catch(e){}
    if(source === 'initial' || source === 'auto') source = 'auto';
    if (source === 'manual') {
      userSelected = true;
      setLS(MANUAL_KEY, currency);
      setLS(LEGACY_MANUAL_KEY, currency);
    }
    setSelectors(currency);
    updateCountryControl();
    formatNodes(currency);
    setLabels(currency);
    protectPricingUI();
    const cartTotal = document.getElementById('cart-total') || document.getElementById('cartTotal');
    if (cartTotal && /\$\s*0|0\s*(USD|MXN|COP|PEN|CLP|ARS|EUR|CRC|GTQ|HNL|DOP|UYU|PYG)/i.test(cartTotal.textContent || '')) { setText(cartTotal, money(0, 'USD', true)); protect(cartTotal); }
    applying = false;
    if (changed || renderedCurrency !== currency || source === 'manual') {
      renderedCurrency = currency;
      try { if (typeof refreshAll === 'function') refreshAll(); } catch(e){}
      try { if (typeof refreshCart === 'function') refreshCart(); } catch(e){}
      try { if (typeof updateCartUI === 'function') updateCartUI(); } catch(e){}
      setTimeout(() => { if(!applying){ applying=true; formatNodes(currency); setLabels(currency); protectPricingUI(); applying=false; } }, 0);
    }
    if(changed || source==='manual') try { window.dispatchEvent(new CustomEvent('goatify:currencychange',{detail:{currency,source:source||'auto'}})); } catch(e){}
  }
  async function detectCurrency(){
    const params = new URLSearchParams(location.search);
    const q = params.get('currency');
    if (q) return norm(q);
    const country = document.documentElement.dataset.market || params.get('country');
    if(country && fromCountry(country)) return fromCountry(country);
    const manual = getLS(MANUAL_KEY);
    if (manual) return norm(manual);
    try {
      const res = await fetch('https://ipwho.is/?fields=success,country_code,currency_code', { cache:'no-store', signal:AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data && data.success !== false) {
        const country = data.country_code ? String(data.country_code).toUpperCase() : 'UNKNOWN';
        setLS(COUNTRY_KEY, country);
        const byCountry = fromCountry(country);
        if (byCountry) return norm(byCountry);
        if (data.currency_code && RATES[String(data.currency_code).toUpperCase()]) return norm(data.currency_code);
      }
    } catch(e){}
    return fallbackCurrency();
  }
  document.addEventListener('change', function(e){
    const market=e.target && e.target.closest && e.target.closest('[data-gfy-market]');
    if(market){
      setLS(COUNTRY_KEY,market.value);
      applyCurrency(fromCountry(market.value)||'USD','manual');
      const regional=document.documentElement.dataset.market;
      const destination=C.markets.find(m=>m.code===market.value);
      if(regional && market.value!==regional && destination){location.assign('/paises/'+destination.slug+'/');return;}
      if(!regional){
        const url=new URL(location.href);
        if(url.searchParams.has('country')||url.searchParams.has('currency')){
          url.searchParams.set('country',market.value);url.searchParams.delete('currency');
          history.replaceState(history.state,'',url);
        }
      }
      return;
    }
    const sel = e.target && e.target.closest && e.target.closest('select[id*="currency"], select.currency-select, select.currency-selector');
    if (sel){if(fromCountry(getLS(COUNTRY_KEY))!==sel.value)setLS(COUNTRY_KEY,'INTL');applyCurrency(sel.value, 'manual'); setTimeout(()=>applyCurrency(sel.value,'manual'),0); }
  }, true);
  document.addEventListener('click', function(e){
    const btn = e.target && e.target.closest && e.target.closest('[data-currency]');
    if (btn && SUPPORTED.includes(String(btn.getAttribute('data-currency')).toUpperCase())) { e.preventDefault(); applyCurrency(btn.getAttribute('data-currency'), 'manual'); setTimeout(()=>applyCurrency(btn.getAttribute('data-currency'),'manual'),0); }
  }, true);
  window.GOATIFY_APPLY_CURRENCY_V48 = applyCurrency;
  window.GOATIFY_FORMAT_MONEY_V48 = function(usd,currency,withCode){ return money(usd,norm(currency || window.GOATIFY_CURRENCY || 'USD'),withCode !== false); };
  window.GOATIFY_CURRENCY_SYMBOL_V48 = function(currency){ return symbol(norm(currency || window.GOATIFY_CURRENCY || 'USD')); };
  function makeCountryPicker(id){
    const english=document.documentElement.lang.startsWith('en');
    const label=document.createElement('label');label.className='gfy-country-picker';label.htmlFor=id;
    const caption=document.createElement('span');caption.textContent=english?'Country':'País';label.appendChild(caption);
    const country=document.createElement('select');country.id=id;country.setAttribute('data-gfy-market','');
    country.setAttribute('aria-label',english?'Country for prices':'País para los precios');
    C.markets.forEach(m=>{const opt=document.createElement('option');opt.value=m.code;opt.textContent=m.name;country.appendChild(opt);});
    const other=document.createElement('option');other.value='INTL';other.textContent=english?'Other country':'Otro país';country.appendChild(other);
    country.value='INTL';label.appendChild(country);return label;
  }
  function addHeaderCountryPicker(){
    if(document.querySelector('[data-gfy-market]'))return;
    const selectors=Array.from(document.querySelectorAll('select[id*="currency"],select.currency-select,select.currency-selector'));
    const headerSelectors=selectors.filter(sel=>sel.closest('header,nav'));
    let count=0;
    headerSelectors.forEach(sel=>{
      const picker=makeCountryPicker('gfy-market-select'+(count?'-'+count:''));count++;
      if(sel.id==='currency-selector-mob')picker.classList.add('gfy-country-picker-mobile');
      sel.insertAdjacentElement('beforebegin',picker);
    });
    if(!count){
      const header=document.querySelector('body>nav.fixed,body>header.fixed,body>header,header.site-header,header,nav.fixed')||document.body;
      const row=document.createElement('div');row.className='gfy-header-country-row';
      row.appendChild(makeCountryPicker('gfy-market-select'));header.insertBefore(row,header.firstElementChild);
      if(getComputedStyle(header).position==='fixed'){
        document.body.style.setProperty('--gfy-original-top',getComputedStyle(document.body).paddingTop);
        document.body.classList.add('gfy-country-row-fixed');
      }
    }
    selectors.forEach(sel=>{sel.hidden=true;sel.setAttribute('data-gfy-legacy-currency','');
      const label=sel.closest('.gfy-country-currency');if(label)label.hidden=true;
    });
    document.querySelectorAll('[data-currency]').forEach(btn=>{
      const parent=btn.parentElement;
      if(parent && Array.from(parent.children).every(child=>child.hasAttribute('data-currency'))){parent.hidden=true;parent.setAttribute('data-gfy-legacy-currency','');}
      else{btn.hidden=true;btn.setAttribute('data-gfy-legacy-currency','');}
    });
  }
  function updateCountryControl(){
    const controls=document.querySelectorAll('[data-gfy-market]');if(!controls.length)return;
    const params=new URLSearchParams(location.search);
    const code=String((userSelected?getLS(COUNTRY_KEY):(document.documentElement.dataset.market||params.get('country')||getLS(COUNTRY_KEY)))||'INTL').toUpperCase();
    const known=C.markets.some(m=>m.code===code);
    controls.forEach(control=>{control.value=known && fromCountry(code)===window.GOATIFY_CURRENCY?code:'INTL';});
  }
  function boot(){
    addHeaderCountryPicker();
    injectStyle();
    resetLegacyCurrencyIfUnconfirmed();
    protectPricingUI();
    applyCurrency(fromCountry(document.documentElement.dataset.market) || 'USD', 'initial');
    detectCurrency().then(cur => {
      if(userSelected) cur=window.GOATIFY_CURRENCY;
      applyCurrency(cur, 'auto');
      [80,250,700,1400,2600,4200].forEach(ms => setTimeout(() => applyCurrency(window.GOATIFY_CURRENCY || cur, 'auto'), ms));
      try {
        new MutationObserver(() => {
          if (!applying) clearTimeout(window.__goatifyCurrencyTimerV48);
          window.__goatifyCurrencyTimerV48 = setTimeout(() => applyCurrency(window.GOATIFY_CURRENCY || cur, 'auto'), 120);
        }).observe(document.body, { childList:true, subtree:true });
      } catch(e){}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
