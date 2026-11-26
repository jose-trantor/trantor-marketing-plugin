## Why

El dashboard de marketing actual es monolítico: un único skill crea las 8 pestañas de golpe con las 36 queries. Esto obliga al usuario a conectar todas las fuentes antes de tener valor, hace el skill difícil de mantener y no permite construir el dashboard de forma incremental. El usuario necesita poder empezar con una sola área (ej. Meta Ads) y añadir otras después, dentro de la misma conversación.

## What Changes

- **Nuevo skill `orchestrator`**: punto de entrada único que lee el manifest del dashboard (si existe), pregunta al usuario qué área quiere añadir y delega en el skill correspondiente.
- **5 skills de área** (nuevos): `meta-ads`, `instagram`, `facebook`, `ga4`, `resumen`. Cada uno instala solo las pestañas y datasets de su área.
- **Manifest en el dashboard store**: nuevo documento `manifest.json` que persiste el estado del dashboard (pestañas instaladas, cuentas configuradas, conector). El JS lo lee al arrancar para mostrar solo las pestañas instaladas.
- **Scripts de build modulares**: `build.py` pasa a ser orquestador con flag `--tabs`; se añaden `build_meta.py`, `build_instagram.py`, `build_facebook.py`, `build_ga4.py`, `build_resumen.py`.
- **Visibilidad de tabs controlada por manifest**: el JS lee `manifest.json` al arrancar y oculta las pestañas cuyas áreas no estén en `installed_tabs`. **BREAKING**: el template de `index.html` y `lv-data.js` cambian para soportar esto.
- **Skill `resumen` condicional**: se crea/actualiza automáticamente cuando `installed_tabs` tiene 2 o más áreas. Con una sola área no se muestra.
- El skill monolítico `dashboard-marketing` queda deprecado y se elimina.

## Capabilities

### New Capabilities

- `manifest`: documento de estado del dashboard que persiste pestañas instaladas, cuentas y configuración; leído por el JS para controlar visibilidad de tabs.
- `orchestrator-skill`: flujo de entrada que detecta el estado actual del dashboard y guía al usuario para añadir áreas incrementalmente.
- `area-skills`: skills independientes por área (Meta Ads, Instagram, Facebook, GA4) que instalan sus pestañas y datasets sin tocar las áreas existentes.
- `resumen-skill`: skill que genera/actualiza la pestaña Resumen a partir de las áreas instaladas; solo activo con 2+ áreas.
- `modular-build`: scripts de build separados por área, coordinados por `build.py --tabs`.

### Modified Capabilities

- `onboarding`: el onboarding pasa de requerir todas las fuentes a funcionar con selección parcial — el usuario solo necesita las cuentas del área que va a instalar.

## Impact

- `skills/dashboard-marketing/` → deprecado y eliminado
- `skills/orchestrator/`, `skills/meta-ads/`, `skills/instagram/`, `skills/facebook/`, `skills/ga4/`, `skills/resumen/` → nuevos
- `skills/onboarding/SKILL.md` → modificado (selección parcial)
- `scripts/build.py` → refactorizado como orquestador
- `scripts/build_meta.py`, `build_instagram.py`, `build_facebook.py`, `build_ga4.py`, `build_resumen.py` → nuevos
- `assets/template/files/index.html` → lee manifest para visibilidad de tabs
- `assets/template/files/lv-data.js` → carga manifest al arrancar
- `assets/template/manifest.json` → nuevo template
