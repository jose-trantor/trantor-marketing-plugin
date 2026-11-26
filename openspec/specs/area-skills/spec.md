# Spec: area-skills

## Purpose

Skills independientes por área (Meta Ads, Instagram, Facebook, GA4) que instalan sus propios datasets y pestañas en el dashboard de forma incremental, sin modificar las áreas ya instaladas.

## Requirements

### Requirement: Cada área tiene un skill independiente que instala sus datasets y pestañas
El sistema SHALL tener 4 skills de área: `meta-ads`, `instagram`, `facebook`, `ga4`. Cada skill genera únicamente los datasets de su área, escribe `files/manifest.json` actualizado y no modifica los datasets de otras áreas.

#### Scenario: Instalación de Meta Ads
- **WHEN** el skill `meta-ads` se ejecuta con la selección del usuario
- **THEN** genera los datasets `m_acc_cur/prev`, `m_camp_cur/prev`, `m_ads_cur/prev`, `m_daily`, `aw_camp_cur/prev/7d`, `aw_ads_cur/prev`, `aw_daily`, `cr_ads` (14 datasets) y añade `["meta", "awareness", "creatividades"]` a `installed_tabs` en el manifest

#### Scenario: Instalación de Instagram
- **WHEN** el skill `instagram` se ejecuta con la cuenta de Instagram seleccionada
- **THEN** genera los datasets `ig_d_cur/prev`, `ig_p_cur/prev`, `ig_profile`, `ig_follows_30d` (6 datasets) y añade `"instagram"` a `installed_tabs` en el manifest

#### Scenario: Instalación de Facebook
- **WHEN** el skill `facebook` se ejecuta con la página de Facebook seleccionada
- **THEN** genera los datasets `fb_d_cur/prev`, `fb_posts`, `fb_profile` (4 datasets) y añade `"facebook"` a `installed_tabs` en el manifest

#### Scenario: Instalación de GA4
- **WHEN** el skill `ga4` se ejecuta con la propiedad de GA4 seleccionada
- **THEN** genera los datasets `ga_t_cur/prev`, `ga_d_cur`, `ga_ch_cur/prev`, `ga_ev_cur/prev`, `ga_items_cur`, `ga_lp_cur`, `ga_seg_cur`, `ga_src_cur`, `ga_city_cur` (13 datasets) y añade `"web"` a `installed_tabs` en el manifest

### Requirement: El skill de área usa el onboarding parcial para obtener solo las cuentas necesarias
Cada skill de área SHALL invocar el onboarding únicamente para las cuentas de su área. Si el onboarding ya completó esas cuentas en la conversación actual, no vuelve a preguntar.

#### Scenario: Meta Ads requiere solo cuenta publicitaria
- **WHEN** el skill `meta-ads` necesita la selección y el onboarding ya tiene la cuenta publicitaria elegida
- **THEN** usa esa selección directamente sin volver a preguntar por página de Facebook, Instagram o GA4

#### Scenario: Instagram requiere solo cuenta de Instagram
- **WHEN** el skill `instagram` necesita la selección
- **THEN** el onboarding pregunta solo por la cuenta de Instagram si no está ya elegida

### Requirement: El skill de área genera el título del dashboard antes de la primera instalación
En la primera área instalada (dashboard nuevo), el skill SHALL sugerir un título al usuario y esperar confirmación antes de crear el artifact.

#### Scenario: Sugerencia de título antes de crear el artifact
- **WHEN** es la primera área que se instala (no existe artifact todavía)
- **THEN** el skill comunica "Voy a crear el dashboard con el título «[título generado]». Dime si quieres cambiarlo antes de continuar." y espera respuesta antes de llamar a la API de artifact

#### Scenario: Título no se repregunta al añadir áreas
- **WHEN** se añade una nueva área a un dashboard ya existente
- **THEN** el skill NO vuelve a preguntar por el título
