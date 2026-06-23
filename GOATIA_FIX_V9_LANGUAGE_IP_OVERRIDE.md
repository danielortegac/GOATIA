# GOATIA FIX V9 — idioma por IP + selector manual estable

## Problema detectado
El selector anterior dependía casi por completo de cookies/localStorage de Google Translate.
Eso provocaba dos fallas:

1. El idioma inicial no se decidía por IP/país del visitante.
2. Al volver de inglés a español, Google Translate podía quedarse pegado con la cookie `googtrans=/es/en`, por eso el botón marcaba una cosa pero la página seguía en otro idioma o no regresaba bien.

## Cambios aplicados

### 1. Lógica de idioma por IP
Se reemplazó el script de idioma en todas las páginas públicas que tenían el selector.
Ahora la lógica hace esto:

- Si el visitante llega desde Ecuador, Colombia, México, Perú, Chile, Argentina y Latinoamérica/España: idioma automático `ES`.
- Si el visitante llega desde Estados Unidos u otro país no listado como español/LatAm: idioma automático `EN`.
- La detección usa IP geográfica con fallback:
  1. `https://ipwho.is/?fields=success,country_code`
  2. `https://get.geojs.io/v1/ip/country.json`
  3. `https://ipapi.co/json/`

### 2. La computadora/navegador ya no decide el idioma de Goatify
La lógica del selector de idioma no usa `navigator.language` ni `navigator.languages`.
El idioma inicial queda gobernado por IP/país, no por idioma del sistema, teclado, navegador, ni por dónde fue comprada la computadora.

### 3. Selección manual manda sobre todo
Si el usuario toca `ES` o `EN`, esa elección queda guardada como preferencia manual con:

- `goatify_lang_manual_v9`

Desde ese momento, la selección manual manda sobre la IP. Ejemplo:

- Usuario está en USA pero toca `ES` → queda en español.
- Usuario está en Ecuador pero toca `EN` → queda en inglés.

### 4. Cambio de EN a ES corregido
Para volver a español se limpia completamente la cookie de Google Translate:

- `googtrans`

Se limpia en dominio actual y dominio raíz. Luego se recarga la página para restaurar el español original.

### 5. Botón protegido contra Google Translate
El selector `ES / EN` ahora tiene:

- `class="notranslate"`
- `translate="no"`

Así Google Translate no intenta traducir o alterar el propio botón.

## Archivos afectados
Se actualizó el script de idioma en 19 páginas HTML del paquete:

- `/index.html`
- `/inicio/index.html`
- `/pricing/index.html`
- `/industrias/index.html`
- `/portal/index.html`
- `/productividad/index.html`
- `/automatizaciones/index.html`
- `/portafolio/index.html`
- `/social-media/index.html`
- `/socios/index.html`
- `/fundadores/index.html`
- `/mailing/index.html`
- `/qlase/index.html`
- `/fit/index.html`
- `/flow/index.html`
- `/meet/index.html`
- `/privacidad/index.html`
- `/choco-cookies/index.html`
- `/d-core2/index.html`

## Validación técnica

- Eliminado el script viejo `gfy-language-toggle-script-v7`.
- Instalado el script nuevo `gfy-language-toggle-script-v9`.
- Validado que las 19 páginas tengan la misma lógica.
- Validado con `node --check` que el JavaScript no tenga errores de sintaxis.
- Probado por simulación:
  - IP `EC` → marca español y limpia traducción.
  - IP `US` → marca inglés, coloca `googtrans=/es/en` y recarga.
  - Preferencia manual `ES` con cookie vieja de inglés → limpia cookie y recarga.

