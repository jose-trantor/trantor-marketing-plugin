---
name: meta-ads
description: Instala las pestañas de Meta Ads (Meta · Rendimiento, Meta · Awareness, Meta · Creatividades) en el dashboard de marketing. Úsala cuando el usuario quiera añadir sus anuncios de Meta a un dashboard incremental, o cuando el orchestrator delegue esta área.
---

# Skill: Meta Ads

Instala los 14 datasets de Meta Ads en el dashboard y registra las tres pestañas (`meta`, `awareness`, `creatividades`) en el manifest.

## 1. Onboarding con scope meta_ads

Sigue la skill **onboarding** con scope `meta_ads`: verifica la conexión y pregunta solo por cuentas publicitarias y campañas. Si en esta conversación ya se completó la selección de Meta Ads, usa esa selección directamente sin volver a preguntar.

Anota también la zona horaria, moneda y locale de la primera cuenta publicitaria elegida (de `meta_list_accounts`: `currency`, `timezone_name`).

## 2. Título del dashboard (solo si es la primera área)

Si todavía no existe un artifact de dashboard en esta conversación (no hay manifest previo):

> "Voy a crear el dashboard con el título «[título generado]». Dime si quieres cambiarlo antes de continuar."

Criterios para el título:
- Una sola marca y todas las fuentes → `"[Marca] · Marketing"`
- Varias marcas → `"[Marca A] + [Marca B] · Marketing"`
- Sin Meta pero con GA4 (no aplica aquí) → `"[Marca] · Analytics"`
- Solo Meta (sin GA4) → `"[Marca] · Meta Ads"`

Como en este paso solo se ha instalado Meta, el título por defecto es `"[Marca] · Meta Ads"` (a menos que ya haya otras áreas instaladas). Espera confirmación o cambio antes de crear el artifact.

## 3. Crear o actualizar el dashboard

### Si es la primera área (no existe artifact)

Crea el dashboard desde el tipo de artifact de dashboards (Data / Dashboard): una sola llamada de publicación con su `type_url`, el `title` acordado y `auto_open: "after_first_write"`. Sigue las instrucciones que devuelva el tipo para todo lo que no diga esta skill.

Genera el config.json con todos los campos de la selección y ejecuta:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build.py config.json salida/ --tabs meta
```

El script escribe los archivos estáticos del template (HTML, CSS, JS), `dash/params` y los 14 datasets de Meta Ads. Luego escribe en el store todos los documentos de `salida/writes-1.json` (y `writes-2.json` si existe).

### Si ya existe el artifact (añadiendo Meta a un dashboard existente)

Lee el manifest actual (`files/manifest.json`) del store. Genera el config.json e invoca solo el script de área:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_meta.py config.json salida/
```

Escribe los documentos de `salida/writes-1.json` en el store.

## 4. Actualizar el manifest

Lee el manifest actual del store (o usa el template si es nuevo). Actualiza estos campos y vuelve a escribir `files/manifest.json`:

```json
{
  "installed_tabs": ["meta", "awareness", "creatividades"],
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
- Que las pestañas Meta · Rendimiento, Meta · Awareness y Meta · Creatividades están listas.
- El periodo por defecto (últimos 15 días vs. los 15 anteriores).
- Que las lecturas escritas están vacías; puede pedir "actualiza las lecturas".
- Si faltan fuentes (Instagram, Facebook, GA4), que puede añadirlas después con el orchestrator.

## Si algo falla

- **Error de permisos o cuenta vacía:** sigue el paso 3 del onboarding para Meta.
- **Script no disponible:** lee los archivos de `assets/template/datasets/` (los 14 de Meta) y sustituye tú los tokens `__LV_*__` antes de escribir.
