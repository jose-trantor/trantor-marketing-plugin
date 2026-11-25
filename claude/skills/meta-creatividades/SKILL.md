---
name: meta-creatividades
description: Instala la pestaña Meta · Creatividades en el dashboard de marketing (rendimiento por creatividad: imagen, vídeo, carrusel, copy). Úsala cuando el usuario quiera analizar qué creatividades funcionan mejor en sus campañas de Meta Ads, o cuando el orchestrator delegue esta área.
---

# Skill: Meta · Creatividades

Instala el dataset de creatividades de Meta Ads (`cr_ads`) y registra la pestaña `creatividades` en el manifest.

## 1. Onboarding con scope meta_ads

Sigue la skill **onboarding** con scope `meta_ads`: verifica la conexión y pregunta solo por cuentas publicitarias y campañas. Si en esta conversación ya se completó la selección de Meta Ads (hay `meta_account_ids` disponible), usa esa selección directamente sin volver a preguntar.

Anota también la zona horaria, moneda y locale de la primera cuenta publicitaria elegida (de `meta_list_accounts`: `currency`, `timezone_name`).

## 2. Título del dashboard (solo si es la primera área)

Si todavía no existe un artifact de dashboard en esta conversación (no hay manifest previo):

> "Voy a crear el dashboard con el título «[título generado]». Dime si quieres cambiarlo antes de continuar."

Criterios para el título:
- Una sola marca, solo áreas de Meta → `"[Marca] · Meta Ads"`
- Una sola marca con otras fuentes → `"[Marca] · Marketing"`
- Varias marcas → `"[Marca A] + [Marca B] · Marketing"`

Espera confirmación o cambio antes de crear el artifact.

## 3. Crear o actualizar el dashboard

### Si es la primera área (no existe artifact)

Crea el dashboard desde el tipo de artifact de dashboards (Data / Dashboard): una sola llamada de publicación con su `type_url`, el `title` acordado y `auto_open: "after_first_write"`. Sigue las instrucciones que devuelva el tipo para todo lo que no diga esta skill.

Genera el config.json con todos los campos de la selección y ejecuta:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build.py config.json salida/ --tabs creatividades
```

El script escribe los archivos estáticos del template (HTML, CSS, JS), `dash/params` y el dataset de Creatividades. Luego escribe en el store todos los documentos de `salida/writes-1.json` (y `writes-2.json` si existe).

### Si ya existe el artifact (añadiendo Creatividades a un dashboard existente)

Lee el manifest actual (`files/manifest.json`) del store. Genera el config.json e invoca solo el script de área:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_meta.py config.json salida/ --tab creatividades
```

Escribe los documentos de `salida/writes-1.json` en el store.

## 4. Actualizar el manifest

Lee el manifest actual del store (o usa el template si es nuevo). Añade `"creatividades"` a `installed_tabs` (si no estaba ya). Actualiza también:

```json
{
  "installed_tabs": [..., "creatividades"],
  "accounts": {
    "meta_account_ids": [...],
    "meta_account_names": "...",
    "meta_campaign_ids": [...]
  }
}
```

Fusiona con los campos existentes; no sobreescribas áreas ya instaladas. Usa `if_version` si el store lo requiere.

## 5. Entregar

Informa al usuario:
- Que la pestaña Meta · Creatividades está lista.
- El periodo por defecto (últimos 15 días vs. los 15 anteriores).
- Que las lecturas escritas están vacías; puede pedir "actualiza las lecturas".

## Si algo falla

- **Error de permisos o cuenta vacía:** sigue el paso 3 del onboarding para Meta.
- **Script no disponible:** lee el archivo de `assets/template/datasets/cr_ads.json` y sustituye tú los tokens `__LV_*__` antes de escribir.
