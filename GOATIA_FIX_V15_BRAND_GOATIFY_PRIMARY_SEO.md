# GOATIA FIX V15 — Marca principal Goatify

## Objetivo
Hacer que Google y buscadores IA entiendan la marca principal como **Goatify**, no como “Goatify IA” en el título/snippet principal.

## Cambios aplicados
- Se reemplazó la marca visible SEO **Goatify IA** por **Goatify** en títulos, meta descriptions, Open Graph, Twitter Cards, JSON-LD, llms.txt y textos web-facing del paquete.
- Se conservó **Goatify IA / Goatify AI** como `alternateName` dentro del schema para que los buscadores sigan asociando búsquedas antiguas o variantes con la marca principal.
- Se agregó un schema explícito `Organization` con `name: Goatify` y `alternateName: [Goatify IA, Goatify AI, GOATIFY]` en páginas indexables.

## Resultado esperado
Cuando el usuario busque **Goatify**, los motores deberían reforzar la entidad principal como **Goatify**. Google puede tardar días o semanas en refrescar títulos y snippets según rastreo/cache.

## Instrucción post-deploy
1. Publicar esta versión.
2. En Search Console > Sitemaps enviar `sitemap.xml`.
3. En Inspección de URL solicitar indexación para:
   - https://www.goatify.app/
   - https://www.goatify.app/pricing/
   - https://www.goatify.app/automatizaciones/
   - https://www.goatify.app/productividad/
   - https://www.goatify.app/portafolio/
   - https://www.goatify.app/social-media/
   - https://www.goatify.app/industrias/

## Nota
No se puede prometer que Google cambie el título instantáneamente; el código queda listo para que el nombre primario sea Goatify.
