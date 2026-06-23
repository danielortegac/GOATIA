# GOATIA / Goatify — Auditoría V4 SEO + GEO + Navegación + Precios

Fecha: 2026-06-20  
Versión base: `GOATIA-main-SEO-GEO-FIXED-V3`  
Versión entregada: `GOATIA-main-SEO-GEO-FIXED-V4`

## 1. Objetivo de la V4

Corregir lo que faltaba sin cambiar el modelo visual ni la lógica principal del sitio:

- Añadir acceso visible a todas las páginas públicas desde todas las páginas indexables.
- Evitar una fila nueva en desktop y móvil.
- Mantener fuera del menú, sitemap y posicionamiento las rutas noindex o retiradas.
- Reforzar Search Console evitando duplicación de `/inicio/` contra `/`.
- Revisar precios visibles y señales técnicas para que la moneda base pública sea MXN.

## 2. Navegación agregada

Se agregó un menú compacto universal llamado **Ecosistema**, insertado en las 16 páginas públicas indexables.

Características:

- No modifica la estructura del header original.
- No agrega otra fila en desktop ni en móvil.
- En desktop aparece como acceso flotante compacto superior derecho.
- En móvil aparece como acceso compacto inferior derecho.
- El panel tiene scroll interno para no romper el layout.
- Incluye todas las páginas públicas indexables.
- Excluye rutas noindex y rutas retiradas.

Páginas enlazadas desde el menú:

1. `/`
2. `/pricing/`
3. `/industrias/`
4. `/portal/`
5. `/productividad/`
6. `/automatizaciones/`
7. `/portafolio/`
8. `/social-media/`
9. `/socios/`
10. `/fundadores/`
11. `/mailing/`
12. `/qlase/`
13. `/fit/`
14. `/flow/`
15. `/meet/`
16. `/privacidad/`

Rutas excluidas intencionalmente:

- `/inicio/`
- `/kbra/`
- `/choco-cookies/`
- `/d-core2/`

## 3. SEO / GEO validado

Validaciones realizadas:

- Sitemap con 16 URLs públicas.
- Todas las URLs públicas tienen `index, follow`.
- Todas las URLs públicas tienen canonical absoluto propio.
- Las rutas noindex no están en sitemap.
- `/inicio/` se mantiene como ruta técnica noindex/canonical hacia `/`, evitando duplicar la home.
- `/kbra/` se mantiene retirada/noindex/redirigida.
- `llms.txt` lista las páginas públicas y aclara que los modelos no deben priorizar rutas retiradas o privadas.
- `robots.txt` mantiene sitemap oficial y permisos de rastreo.

## 4. Precios revisados

Criterio usado:

- Moneda pública inicial: **MXN**.
- Referencia técnica de conversión: **1 USD ≈ 17.33 MXN**.
- Los valores visibles se normalizaron a MXN donde antes había textos sueltos en USD.
- USD se conserva únicamente como opción de conversión o referencia secundaria cuando el selector lo permite.
- Se reemplazó el guard agresivo anterior por un guard V4 que evita duplicar símbolo/moneda en páginas que ya tienen label separado.

Correcciones destacadas:

- QLASE ya inicia en MXN, no en USD.
- Productividad y Portal ya no muestran el caso visible `Valor $2,500 USD` como base.
- Pricing normaliza textos de comisiones y valores referenciales a MXN aproximado.
- Socios mantiene el concepto de PayPal/comisiones, pero la lectura pública inicial ya no fuerza USD como precio base del sitio.
- Social Media conserva selector, pero el precio visible inicial queda en MXN.

## 5. Archivos técnicos agregados o actualizados

- `sitemap.xml`
- `robots.txt`
- `llms.txt`
- `_headers`
- `netlify.toml`
- `goatify-pricing-source.json`
- `GOATIA_SEO_GEO_NAV_AUDIT_V4.json`
- `GOATIA_SEO_GEO_NAV_PRICE_AUDIT_V4.json`

## 6. Qué enviar en Google Search Console

Después de hacer deploy del ZIP en Netlify o hosting:

- Si Search Console muestra la propiedad como `https://www.goatify.app/`, en **Sitemaps** pega solo:

```txt
sitemap.xml
```

- Si te pide URL completa, pega:

```txt
https://www.goatify.app/sitemap.xml
```

No se pega el contenido XML. Se pega la ruta o URL del archivo ya publicado.

## 7. Validación final

Resultado de validación local:

- Fallos de menú: 0
- Fallos de canonical: 0
- Fallos de robots indexables: 0
- Fallos de noindex: 0
- URLs en sitemap: 16
- URLs públicas faltantes en sitemap: 0
- URLs noindex dentro de sitemap: 0

