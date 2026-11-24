---
name: facebook
description: Instala la pestaña de Facebook en el dashboard de marketing. Úsala cuando el usuario quiera añadir su página de Facebook a un dashboard incremental, o cuando el orchestrator delegue esta área.
---

# Skill: Facebook

Instala los 4 datasets de Facebook en el dashboard y registra la pestaña `facebook` en el manifest.

## 1. Onboarding con scope facebook

Sigue la skill **onboarding** con scope `facebook`: verifica la conexión y pregunta solo por la página de Facebook. Si en esta conversación ya se completó la selección de Facebook, usa esa selección directamente sin volver a preguntar.

## 2. Generar los datasets

Lee el manifest actual (`files/manifest.json`) del store para obtener los valores ya conocidos (brand, connector, locale, etc.).

Genera el config.json con al menos estos campos: `brand`, `connector`, `page_id`, `page_name`. Ejecuta:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_facebook.py config.json salida/
```

Escribe los documentos de `salida/writes-1.json` en el store.

## 3. Actualizar el manifest

Lee el manifest actual del store. Añade `"facebook"` a `installed_tabs` (si no estaba) y actualiza las cuentas:

```json
{
  "installed_tabs": [..., "facebook"],
  "accounts": {
    "page_id": "...",
    "page_name": "..."
  }
}
```

Fusiona con los campos existentes; no sobreescribas otras áreas. Vuelve a escribir `files/manifest.json`.

## 4. Entregar

Informa al usuario:
- Que la pestaña Facebook está lista.
- Si el orchestrator es quien invoca este skill, no entregues aún: devuelve el control al orchestrator para que decida si invocar el skill `resumen`.

## Si algo falla

- **Error de permisos o página vacía:** sigue el paso 3 del onboarding para Facebook.
- **Script no disponible:** lee los archivos de `assets/template/datasets/` (fb_d_cur, fb_d_prev, fb_posts, fb_profile) y sustituye los tokens `__LV_*__` antes de escribir.
