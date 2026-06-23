# GOATIA FIX V8 — Home Pricing Layout

Fecha: 2026-06-22

## Corrección principal
- Se corrigió el bloque `#automation-plans` de la página principal (`index.html`).
- El problema venía de tres textos sueltos dentro del grid de precios:
  - `GOATIFY Pro — ...`
  - `GOATIFY Connect Pro — ...`
  - `GOATIFY Connect Premium — ...`
- Esos textos estaban siendo interpretados por CSS Grid como elementos independientes, por eso las tarjetas se desordenaban, aparecían precios flotando y el diseño quedaba diagonal/roto.

## Mejora visual aplicada
- Se eliminaron esos textos huérfanos.
- Se dejó el grid con únicamente las tres cards reales.
- Se agregó un CSS específico para `#automation-plans` que mantiene las tarjetas alineadas, legibles y responsivas.
- En desktop quedan 3 columnas limpias.
- En pantallas pequeñas las cards pasan a una columna legible, sin texto microscópico ni desorden.

## Limpieza adicional
- Se eliminó la carpeta `kbra/` del paquete porque la ruta está retirada.
- El sitemap no incluía `/kbra/`; se conserva limpio.
