## 1. Infraestructura compartida de scripts

- [x] 1.1 Crear `scripts/build_common.py` extrayendo `fill_text`, `fill_value`, `only_campaigns` y `put` del `build.py` actual
- [x] 1.2 Refactorizar `scripts/build.py` para importar `build_common.py` y añadir flag `--tabs`; sin flag, construye todas las áreas
- [x] 1.3 Crear `assets/template/manifest.json` con la estructura base del manifest (todos los campos, valores vacíos como template)

## 2. Scripts de build por área

- [x] 2.1 Crear `scripts/build_meta.py`: datasets `m_acc_cur/prev`, `m_camp_cur/prev`, `m_ads_cur/prev`, `m_daily`, `aw_camp_cur/prev/7d`, `aw_ads_cur/prev`, `aw_daily`, `cr_ads`
- [x] 2.2 Crear `scripts/build_instagram.py`: datasets `ig_d_cur/prev`, `ig_p_cur/prev`, `ig_profile`, `ig_follows_30d`
- [x] 2.3 Crear `scripts/build_facebook.py`: datasets `fb_d_cur/prev`, `fb_posts`, `fb_profile`
- [x] 2.4 Crear `scripts/build_ga4.py`: datasets `ga_t_cur/prev`, `ga_d_cur`, `ga_ch_cur/prev`, `ga_ev_cur/prev`, `ga_items_cur`, `ga_lp_cur`, `ga_seg_cur`, `ga_src_cur`, `ga_city_cur`
- [x] 2.5 Crear `scripts/build_resumen.py`: escribe `dash/params` y `files/manifest.json` (sin nuevas queries)
- [x] 2.6 Verificar que cada script es ejecutable de forma independiente con `python3 build_<area>.py config.json salida/`

## 3. Manifest y control de visibilidad en el JS

- [x] 3.1 Modificar `assets/template/files/lv-data.js` para que al arrancar lea `files/manifest.json` y aplique `hidden` a los `<button data-tab>` y `<section>` cuyas áreas no estén en `installed_tabs`
- [x] 3.2 Ocultar el Resumen en el JS cuando `installed_tabs` tiene tabs de menos de 2 áreas distintas
- [x] 3.3 Implementar el fallback: si el fetch de `manifest.json` falla, mostrar todos los tabs sin bloquear la carga

## 4. Skill: onboarding (selección parcial)

- [x] 4.1 Modificar `skills/onboarding/SKILL.md` para soportar un parámetro de scope (`meta_ads`, `instagram`, `facebook`, `ga4`) que limita los pasos de selección al área solicitada
- [x] 4.2 Documentar que la selección previa se reutiliza dentro de la conversación sin volver a preguntar

## 5. Skill: meta-ads

- [x] 5.1 Crear `skills/meta-ads/SKILL.md`: invoca onboarding con scope `meta_ads`, genera título si es el primer área, llama a `build_meta.py`, escribe todos los documentos en el store, actualiza manifest
- [x] 5.2 Incluir en el SKILL.md la lógica de sugerencia de título (criterios del design) solo para el caso de dashboard nuevo

## 6. Skill: instagram

- [x] 6.1 Crear `skills/instagram/SKILL.md`: invoca onboarding con scope `instagram`, llama a `build_instagram.py`, actualiza manifest

## 7. Skill: facebook

- [x] 7.1 Crear `skills/facebook/SKILL.md`: invoca onboarding con scope `facebook`, llama a `build_facebook.py`, actualiza manifest

## 8. Skill: ga4

- [x] 8.1 Crear `skills/ga4/SKILL.md`: invoca onboarding con scope `ga4`, llama a `build_ga4.py`, actualiza manifest

## 9. Skill: resumen

- [x] 9.1 Crear `skills/resumen/SKILL.md`: llama a `build_resumen.py`, actualiza manifest añadiendo `"resumen"` a `installed_tabs`, informa al usuario de qué métricas estarán vacías según las áreas instaladas

## 10. Skill: orchestrator

- [x] 10.1 Crear `skills/orchestrator/SKILL.md`: lee el manifest si existe, muestra estado actual, pregunta qué área añadir con `AskUserQuestion`, delega en el skill correspondiente
- [x] 10.2 Añadir la lógica de invocación automática del skill `resumen` cuando `installed_tabs` pasa a tener 2+ áreas
- [x] 10.3 Documentar en el SKILL.md el flujo de dashboard nuevo (sin manifest previo)

## 11. Limpieza

- [x] 11.1 Eliminar `skills/dashboard-marketing/SKILL.md` (skill monolítico deprecado)
- [x] 11.2 Actualizar `README.md` del plugin para reflejar el nuevo flujo con el orchestrator
