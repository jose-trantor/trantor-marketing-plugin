## Context

El dashboard actual es un artefacto monolítico generado por `build.py` de una sola vez: 36 datasets + `index.html` + 8 archivos JS. El skill `dashboard-marketing` lo crea en un único paso, requiriendo que el usuario tenga todas las fuentes conectadas (Meta, Instagram, Facebook, GA4). Las pestañas están hardcodeadas en el HTML y siempre son visibles independientemente de qué datos existan.

La nueva arquitectura permite construir el dashboard de forma incremental dentro de una conversación: el usuario empieza con una sola área y añade las demás cuando quiera. El estado del dashboard persiste en un `manifest.json` en el propio store del dashboard.

Restricciones conocidas:
- Una conversación = un dashboard. No hay edición cross-conversación (deferred al MCP server).
- Las pestañas no se pueden eliminar una vez instaladas.
- El Resumen solo aparece con 2+ áreas instaladas.

## Goals / Non-Goals

**Goals:**
- Permitir instalar áreas de forma incremental dentro de una conversación.
- Que el JS oculte automáticamente las pestañas de áreas no instaladas.
- Mantener el Resumen como vista cross-área actualizable.
- Scripts de build modulares y fáciles de mantener por área.
- El onboarding funcione con selección parcial (solo las cuentas del área a instalar).

**Non-Goals:**
- Edición del dashboard desde conversaciones distintas (future: MCP server).
- Eliminación de pestañas ya instaladas.
- Nuevas fuentes de datos (Google Ads, TikTok, etc.) — pertenecen a otro change.
- Cambios en el diseño visual o las métricas de cada pestaña.

## Decisions

### D1: Manifest en el dashboard store (`dash/manifest` o `files/manifest.json`)

El manifest vive como documento en el mismo store del dashboard. El LLM lo escribe al crear el dashboard y lo actualiza al añadir cada área. El JS lo lee al arrancar para controlar la visibilidad de tabs.

Estructura del manifest:
```json
{
  "schema": 1,
  "brand": "Mi Marca",
  "title": "Mi Marca · Marketing",
  "connector": "Trantor",
  "installed_tabs": ["meta", "awareness", "creatividades"],
  "accounts": {
    "meta_account_ids": ["123"],
    "meta_account_names": "Mi Marca Ads",
    "meta_campaign_ids": [],
    "ig_id": null,
    "ig_username": null,
    "page_id": null,
    "page_name": null,
    "ga4_property_id": null,
    "ga4_name": null
  },
  "locale": "es-ES",
  "currency_symbol": "€",
  "utc_offset_hours": 1
}
```

Se almacena en la colección `files` con doc_id `manifest.json` para que el JS pueda acceder con el mismo mecanismo que usa para leer otros ficheros.

Alternativa descartada: manifest en Claude Doc separado → requiere búsqueda por título y añade complejidad sin beneficio dentro del modelo de una-conversación-por-dashboard.

### D2: Visibilidad de tabs controlada por manifest en el JS

`lv-data.js` lee `manifest.json` al arrancar (antes de renderizar ninguna pestaña) y aplica `hidden` a los `<button data-tab>` y `<section>` cuyo `data-tab` no esté en `installed_tabs`. El botón de Resumen se oculta también si `installed_tabs.length < 2`.

Alternativa descartada: detectar tabs activas por si el dataset primario devuelve filas → frágil (cuenta con cero gasto = tab oculta aunque esté instalada).

### D3: Scripts de build modulares con orquestador

`build.py` se convierte en orquestador con flag `--tabs` (ej. `--tabs meta,awareness,creatividades`). Importa los módulos por área:

```
scripts/
├── build.py              # orquestador: --tabs, --config, --out
├── build_meta.py         # datasets Meta Ads (m_*, aw_*, cr_*)
├── build_instagram.py    # datasets Instagram (ig_*)
├── build_facebook.py     # datasets Facebook (fb_*)
├── build_ga4.py          # datasets GA4 (ga_*)
├── build_resumen.py      # manifest.json + params (sin nuevas queries)
└── build_common.py       # fill_text, fill_value, only_campaigns, put()
```

`build_resumen.py` no genera nuevas queries API: escribe el `manifest.json` y el `params` document. El Resumen se calcula en el JS a partir de los datasets ya cargados por las otras áreas.

Alternativa descartada: scripts completamente independientes sin orquestador → duplicación de lógica de sustitución de tokens y escritura de batches.

### D4: Skill `meta-ads` crea los 3 tabs de Meta independientemente

Aunque Meta·Rendimiento, Meta·Awareness y Meta·Creatividades comparten la misma cuenta publicitaria, son 3 pestañas distintas con perspectivas distintas. El skill `meta-ads` las crea todas juntas (misma llamada a build_meta.py) porque comparten datos y no tiene sentido instalarlas por separado.

### D5: Skill `resumen` se invoca automáticamente desde el orchestrator

Cuando `installed_tabs.length` pasa de 1 a 2 (o más), el orchestrator invoca el skill `resumen` tras instalar el área nueva. El skill `resumen` actualiza el manifest y escribe/sobreescribe los documentos `dash/params` y `files/manifest.json`. El HTML y el JS del Resumen ya estaban en el store desde la primera instalación.

### D6: El skill `dashboard-marketing` se elimina

El nuevo punto de entrada es el skill `orchestrator`. El skill monolítico `dashboard-marketing` queda eliminado. El skill `onboarding` se mantiene pero se adapta para funcionar con selección parcial.

## Risks / Trade-offs

**[Risk] El LLM escribe el manifest con campos incorrectos o lo corrompe al actualizar.**
→ Mitigación: el manifest tiene estructura simple y fija (JSON plano, sin arrays anidados complejos). El skill de cada área solo actualiza el campo `installed_tabs` y los `accounts` que le corresponden, no reescribe todo el manifest. Se lee el manifest existente antes de actualizar (`get` + merge + `set` con `if_version`).

**[Risk] El JS falla al leer el manifest si el fetch tarda o falla.**
→ Mitigación: el JS trata el manifest como opcional. Si no puede leerlo en el arranque, muestra todas las tabs (comportamiento fallback = monolítico actual). No bloquea la carga del dashboard.

**[Risk] Conversación larga: el LLM pierde el contexto del dashboard ID y del manifest.**
→ Mitigación: el orchestrator relee el manifest desde el store al inicio de cada acción de añadir área. El dashboard ID se recupera desde el contexto de la conversación o el usuario lo proporciona.

**[Risk] build_resumen.py no genera queries nuevas, pero el Resumen necesita que las áreas instaladas ya tengan sus datasets. Si se llama antes de instalar las áreas, mostrará vacíos.**
→ Mitigación: el orchestrator siempre invoca el skill de área antes que el skill de resumen.

**[Trade-off] El HTML sigue teniendo los 8 tabs en el DOM** (aunque ocultos via JS). Esto añade peso al HTML inicial pero simplifica la arquitectura enormemente — no hay que editar el HTML al añadir tabs.

## Open Questions

- ¿El skill `onboarding` debe detectar si ya hay un manifest en el store y saltar los pasos ya completados (cuentas ya configuradas)? Por ahora asumimos que el onboarding se ejecuta una vez por conversación y el manifest captura el resultado.
- ¿El template de `index.html` mantiene el texto introductorio del lede ("Panel de marketing digital con datos en vivo de Meta Ads, Instagram, Facebook y Google Analytics 4...") aunque alguna de esas fuentes no esté instalada? Propuesta: sí, el lede es genérico y el JS se encarga de ocultar las tabs relevantes.
