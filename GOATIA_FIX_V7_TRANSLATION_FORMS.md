# GOATIA V7 — Traducción ES/EN + limpieza Fit/Meet/Flow

## Cambios aplicados

- Se agregó un botón fijo **ES / EN** visible en las **20 páginas reales** del sitio.
- Se dejó intacto `0kke7bsoh0g2dxeg47qdr6sz0hsddh.html` porque parece un archivo de verificación; modificarlo podría romper verificación/propiedad.
- El botón usa estado propio (`localStorage`) y cookies `googtrans`; no depende del idioma del navegador.
- La traducción se dispara con el botón, no por autodetección del navegador.
- Se oculta la barra invasiva de Google Translate para no dañar el layout.
- Se agregaron señales `hreflang` ES/EN sin crear URLs duplicadas.
- En **Fit**, **Meet** y **Flow** se quitó el bloque universal de **formulario + agendador**.
- En **Fit**, **Meet** y **Flow** se quitaron los scripts externos `goatify-form.js` y `goatify-scheduler.js`.
- No se tocaron formularios internos propios de las demos/apps, como publicaciones, chat o inputs funcionales.

## Validación

```json
{
  "real_index_pages_total": 20,
  "language_button_real_pages": 20,
  "language_button_missing_real_pages": [],
  "verification_html_not_modified": "0kke7bsoh0g2dxeg47qdr6sz0hsddh.html",
  "fit_meet_flow_removed": {
    "fit/index.html": {
      "footer_block": false,
      "form_embed": false,
      "scheduler_embed": false,
      "universal_form": false,
      "universal_scheduler": false
    },
    "meet/index.html": {
      "footer_block": false,
      "form_embed": false,
      "scheduler_embed": false,
      "universal_form": false,
      "universal_scheduler": false
    },
    "flow/index.html": {
      "footer_block": false,
      "form_embed": false,
      "scheduler_embed": false,
      "universal_form": false,
      "universal_scheduler": false
    }
  }
}
```

## Nota técnica

La traducción completa se resuelve desde el botón propio del sitio usando Google Translate como motor de traducción de página completa. Esto evita depender del traductor del navegador o del idioma automático del usuario. Si una red corporativa o bloqueador impide cargar `translate.google.com`, el botón seguirá visible pero el motor externo podría no ejecutar la traducción.
