---
name: resumen
description: Crea o actualiza la pestaña Resumen del dashboard de marketing. Invocada automáticamente por el orchestrator cuando hay 2 o más áreas instaladas. No genera nuevas queries API: el Resumen se calcula en el JS a partir de los datasets ya cargados por las otras áreas.
---

# Skill: Resumen

Actualiza `dash/params` y `files/manifest.json` para activar la pestaña Resumen. No genera nuevas consultas API.

## 1. Leer el manifest actual

Lee `files/manifest.json` del store. Extrae `installed_tabs` y la selección de cuentas.

## 2. Generar params y manifest

Ejecuta el script de resumen pasando el config con todas las cuentas conocidas:

```bash
python3 ${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/build_resumen.py config.json salida/
```

El config debe incluir todos los campos ya conocidos más `installed_tabs` actualizado (con `"resumen"` añadido).

Escribe los documentos de `salida/writes-1.json` en el store (sobrescribe `dash/params` y `files/manifest.json`).

## 3. Informar de métricas vacías

Según las áreas instaladas, informa al usuario de qué métricas del Resumen estarán disponibles:

| Áreas instaladas | Métricas vacías en el Resumen |
|---|---|
| Solo Meta Ads | Interacciones (Instagram/FB), visitas web, pedidos, inicio de pago |
| Meta + Instagram | Visitas web, pedidos, inicio de pago |
| Meta + Facebook | Visitas web, pedidos, inicio de pago |
| Meta + GA4 | Interacciones (Instagram/FB) |
| Meta + Instagram + Facebook | Visitas web, pedidos, inicio de pago |
| Meta + Instagram + GA4 | — (embudo completo disponible) |
| Las 4 áreas | — (sin advertencia) |

Solo emite la advertencia si hay métricas vacías; con todas las áreas instaladas, no digas nada.

## 4. Entregar (si lo invoca el usuario directamente)

Informa al usuario que la pestaña Resumen está activa y qué métricas se muestran con las áreas actuales.

Si fue invocado por el orchestrator, devuelve el control al orchestrator.
