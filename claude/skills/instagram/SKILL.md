---
name: instagram
description: Instala la pestaña de Instagram en el dashboard de marketing. Úsala cuando el usuario quiera añadir su cuenta de Instagram a un dashboard incremental, o cuando el orchestrator delegue esta área.
---

# Skill: Instagram

Instala los 6 datasets de Instagram en el dashboard y registra la pestaña `instagram` en el manifest.

## 1. Onboarding con scope instagram

Sigue la skill **onboarding** con scope `instagram`: verifica la conexión y pregunta solo por la cuenta de Instagram. Si en esta conversación ya se completó la selección de Instagram, usa esa selección directamente sin volver a preguntar.

## 2. Generar los datasets

Lee el manifest actual (`files/manifest.json`) del store para obtener los valores ya conocidos (brand, connector, locale, etc.).

Genera el config.json con al menos estos campos: `brand`, `connector`, `ig_id`, `ig_username`. Ejecuta:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_instagram.py config.json salida/
```

Escribe los documentos de `salida/writes-1.json` en el store.

## 3. Actualizar el manifest

Lee el manifest actual del store. Añade `"instagram"` a `installed_tabs` (si no estaba) y actualiza las cuentas:

```json
{
  "installed_tabs": [..., "instagram"],
  "accounts": {
    "ig_id": "...",
    "ig_username": "..."
  }
}
```

Fusiona con los campos existentes; no sobreescribas otras áreas. Vuelve a escribir `files/manifest.json`.

## 4. Entregar

Informa al usuario:
- Que la pestaña Instagram está lista.
- Si el orchestrator es quien invoca este skill, no entregues aún: devuelve el control al orchestrator para que decida si invocar el skill `resumen`.

## Si algo falla

- **Error de permisos o cuenta vacía:** sigue el paso 3 del onboarding para Instagram.
- **Script no disponible:** lee los archivos de `assets/template/datasets/` (ig_d_cur, ig_d_prev, ig_p_cur, ig_p_prev, ig_profile, ig_follows_30d) y sustituye los tokens `__LV_*__` antes de escribir.
