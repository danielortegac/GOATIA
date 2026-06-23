# GOATIA V6 – Fix de moneda y precios

Cambios:

- Eliminé los scripts anteriores que forzaban una moneda fija y podían dejar número/símbolo/label cruzados.
- Dejé un único script universal `GOATIFY_GEO_CURRENCY_PATCH_V6` en las páginas con precios.
- La base técnica de precios queda en USD mediante `data-usd`.
- La moneda visible se calcula por país: México MXN, Colombia COP, Perú PEN, Chile CLP, Argentina ARS, Ecuador/USA USD, Europa EUR.
- El selector manual ahora manda sobre la geolocalización y sincroniza número, símbolo, etiqueta y selector.
- Convertí precios estáticos visibles a spans dinámicos cuando estaban en texto HTML.
- Mantengo Pricing con portada visual tipo Industrias y Productividad con tabla comparativa visible.

Validación por página:

- `index.html`: script V6=True, old V4=False, old V5=False, data-usd=82, static MXN=54, static USD=28
- `pricing/index.html`: script V6=True, old V4=False, old V5=False, data-usd=47, static MXN=20, static USD=27
- `productividad/index.html`: script V6=True, old V4=False, old V5=False, data-usd=9, static MXN=0, static USD=6
- `portal/index.html`: script V6=True, old V4=False, old V5=False, data-usd=3, static MXN=0, static USD=0
- `social-media/index.html`: script V6=True, old V4=False, old V5=False, data-usd=30, static MXN=0, static USD=27
- `socios/index.html`: script V6=True, old V4=False, old V5=False, data-usd=20, static MXN=13, static USD=6
- `qlase/index.html`: script V6=True, old V4=False, old V5=False, data-usd=4, static MXN=0, static USD=4
- `automatizaciones/index.html`: script V6=True, old V4=False, old V5=False, data-usd=4, static MXN=0, static USD=5
- `mailing/index.html`: script V6=True, old V4=False, old V5=False, data-usd=30, static MXN=0, static USD=30
- `portafolio/index.html`: script V6=True, old V4=False, old V5=False, data-usd=186, static MXN=183, static USD=3
- `flow/index.html`: script V6=True, old V4=False, old V5=False, data-usd=0, static MXN=0, static USD=0
- `industrias/index.html`: script V6=True, old V4=False, old V5=False, data-usd=14, static MXN=0, static USD=14
