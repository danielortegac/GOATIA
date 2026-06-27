# GOATIA FIX V33 — idioma global ES/EN por IP en todas las páginas

## Cambio aplicado
Se reemplazó el control anterior de idioma y se instaló un único bloque global `GOATIFY GLOBAL IP LANGUAGE V33` en todas las páginas HTML con `<body>`.

## Alcance
- HTML con body parcheados: 56
- Bloques antiguos V7/V9 removidos: 20
- Archivos omitidos por no tener `<body>`: 0kke7bsoh0g2dxeg47qdr6sz0hsddh.html

## Regla de idioma
- Ecuador, Colombia, México, Latinoamérica y España: español.
- Estados Unidos y otros países no LatAm: inglés.
- El idioma del navegador/computadora no manda sobre IP.
- El botón manual ES/EN sí manda sobre IP y queda guardado.

## Comportamiento técnico
- Páginas fuente en español: ES limpia `googtrans`; EN usa `/es/en`.
- Páginas fuente en inglés: EN limpia `googtrans`; ES usa `/en/es`.
- Cambio manual limpia/aplica cookie y recarga para evitar traducción mezclada.
- El selector está marcado como `notranslate` y `translate="no"`.
- Se mantienen SEO, GEO, LLM, formulario, agendador, precios y estructura de V32.
