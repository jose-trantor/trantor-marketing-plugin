---
name: ga4
description: Instala la pestaña Web (GA4) en el dashboard de marketing. Úsala cuando el usuario quiera añadir su Google Analytics 4 a un dashboard incremental, o cuando el orchestrator delegue esta área.
---

# Skill: GA4 (Web)

Instala los 12 datasets de GA4 en el dashboard y registra la pestaña `web` en el manifest.

## 1. Onboarding con scope ga4

Sigue la skill **onboarding** con scope `ga4`: verifica la conexión y pregunta solo por la propiedad de Google Analytics 4. Si en esta conversación ya se completó la selección de GA4, usa esa selección directamente sin volver a preguntar.

## 2. Generar los datasets

Lee el manifest actual (`files/manifest.json`) del store para obtener los valores ya conocidos (brand, connector, locale, etc.).

Genera el config.json con al menos estos campos: `brand`, `connector`, `ga4_property_id`, `ga4_name`. Ejecuta:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_ga4.py config.json salida/
```

Escribe los documentos de `salida/writes-1.json` en el store.

## 3. Actualizar el manifest

Lee el manifest actual del store. Añade `"web"` a `installed_tabs` (si no estaba) y actualiza las cuentas:

```json
{
  "installed_tabs": [..., "web"],
  "accounts": {
    "ga4_property_id": "...",
    "ga4_name": "..."
  }
}
```

Fusiona con los campos existentes; no sobreescribas otras áreas. Vuelve a escribir `files/manifest.json`.

## 4. Entregar

Informa al usuario:
- Que la pestaña Web (GA4) está lista.
- Si el orchestrator es quien invoca este skill, no entregues aún: devuelve el control al orchestrator para que decida si invocar el skill `resumen`.

## Si algo falla

- **Error de permisos o propiedad vacía:** sigue el paso 3 del onboarding para GA4.
- **Script no disponible:** lee los archivos de `assets/template/datasets/` (ga_t_cur, ga_t_prev, ga_d_cur, ga_ch_cur, ga_ch_prev, ga_ev_cur, ga_ev_prev, ga_items_cur, ga_lp_cur, ga_seg_cur, ga_src_cur, ga_city_cur) y sustituye los tokens `__LV_*__` antes de escribir.
