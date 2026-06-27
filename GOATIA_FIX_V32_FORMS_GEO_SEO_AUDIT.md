# GOATIA FIX V32 — Formularios, Agendador, SEO/GEO/LLM y moneda

Fecha: 2026-06-26

## Cambios realizados

1. Se agregó el bloque universal de conversión al final de las 52 URLs indexables del sitemap:
   - Formulario rápido conectado con `data-goatify-form-id="KzGQz2tjmRZDu2htFYld"` y `data-goatify-form-slug="goatify"`.
   - Agendador conectado con `data-goatify-scheduler="goatify/agenda"`.
   - Scripts embed cargados: `https://ia.goatify.app/embed/goatify-form.js` y `https://ia.goatify.app/embed/goatify-scheduler.js`.
   - Normalización del WhatsApp del agendador combinando código de país + número.
   - Diseño en franjas delgadas premium como el bloque de la página de inicio.
   - Textos localizados: español en páginas ES y English en páginas EN.

2. Se mantuvieron intactos los cambios V31:
   - Contraste de textos en páginas claras.
   - Tarjetas mobile en dos columnas cuando corresponde.
   - Menú superior con Portafolio y Precios en landings.

3. Se corrigió la fuente de precios `goatify-pricing-source.json` para que no tenga contradicción:
   - Base interna real: USD.
   - Visualización pública: moneda automática por país o selector manual.
   - Monedas soportadas: USD, MXN, COP, PEN, CLP, ARS, EUR.

4. Se actualizó `llms.txt` y `llms-full.txt` con la regla de precios/monedas para lectura de LLMs.

## Auditoría posterior

- `sitemap.xml`: 52 URLs.
- Las 52 URLs existen en la carpeta del sitio.
- 52/52 tienen canonical.
- 52/52 tienen meta robots index/follow.
- 52/52 tienen JSON-LD parseable.
- 52/52 tienen hreflang.
- 52/52 tienen señales IA (`ai-summary` / `ai-services`).
- 52/52 tienen Open Graph.
- 52/52 tienen Twitter Card.
- 52/52 tienen formulario rápido.
- 52/52 tienen agendador.
- 52/52 cargan los scripts embed del formulario y del agendador.
- Sin JSON-LD roto detectado.
- Sin duplicados de scripts embed detectados.

## Configuración de idiomas detectada

- Páginas estáticas principales:
  - `/es/` en español.
  - `/en/` en inglés.
  - 6 landings especializadas en inglés bajo `/en/...`.
  - Landings comerciales en español bajo rutas directas como `/crm-para-constructoras/`.
- En 20 páginas legacy/core existe selector ES/EN con Google Translate y detección de país por IP.
- Regla de idioma en esas páginas con script:
  - Países LATAM + España => español.
  - Estados Unidos y otros países no definidos => inglés.
  - Si el usuario elige manualmente ES o EN, queda guardado en localStorage/cookie.
- Las 32+ landings especializadas se manejan como páginas estáticas con `lang`, `hreflang` y switch ES/EN, no con traducción automática completa por IP.

## Configuración de moneda detectada

- En páginas con precios dinámicos existe `GOATIFY_GEO_CURRENCY_PATCH_V6`.
- Base interna: USD usando atributos `data-usd`.
- Moneda por país:
  - MX => MXN
  - CO => COP
  - PE => PEN
  - CL => CLP
  - AR => ARS
  - EC, US, CA => USD
  - ES y países europeos definidos => EUR
  - Otros países => navegador o USD fallback
- También existe selector manual. Si el usuario cambia moneda, se guarda en `localStorage`.
- Tasas estáticas del sitio, no cotización bancaria en tiempo real.

## Observación honesta

La base SEO/GEO/LLM está completa para las 52 URLs indexables. Lo único que no puede garantizarse desde el código es que Google, Bing, ChatGPT Search, Perplexity, Claude u otros modelos indexen inmediatamente el sitio; eso depende de despliegue, rastreo, autoridad externa, backlinks, menciones y frecuencia de crawling.
