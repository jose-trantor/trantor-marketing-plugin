# Spec: resumen-skill

## Purpose

Skill que crea o actualiza la pestaña Resumen a partir de las áreas ya instaladas. Solo se activa cuando hay 2 o más áreas instaladas. No genera nuevas queries API: el Resumen se calcula en el JS a partir de los datasets existentes.

## Requirements

### Requirement: El skill resumen crea o actualiza la pestaña Resumen a partir de las áreas instaladas
El skill `resumen` SHALL escribir el document `dash/params` actualizado y `files/manifest.json` con `"resumen"` en `installed_tabs`. No genera nuevas queries API: el Resumen se calcula en el JS a partir de los datasets ya instalados por las áreas.

#### Scenario: Primera activación del Resumen (2 áreas instaladas)
- **WHEN** el orchestrator invoca el skill `resumen` por primera vez (exactamente 2 áreas instaladas)
- **THEN** el skill actualiza el manifest añadiendo `"resumen"` a `installed_tabs` y escribe `dash/params` con los parámetros de fecha actuales

#### Scenario: Actualización del Resumen al añadir una tercera área
- **WHEN** el orchestrator invoca el skill `resumen` tras instalar una tercera área
- **THEN** el skill actualiza el manifest (que ya tenía `"resumen"`) y reescribe `dash/params`

### Requirement: El Resumen muestra solo las métricas de las áreas instaladas
El skill `resumen` SHALL comunicar al usuario qué métricas del Resumen estarán disponibles según las áreas instaladas, y cuáles aparecerán vacías.

#### Scenario: Resumen parcial con Meta + Instagram
- **WHEN** las áreas instaladas son Meta Ads e Instagram (sin Facebook ni GA4)
- **THEN** el skill informa que el embudo mostrará alcance e interacciones de Instagram, pero visitas web y pedidos saldrán vacíos

#### Scenario: Resumen completo con todas las áreas
- **WHEN** las 4 áreas están instaladas
- **THEN** el skill no emite ninguna advertencia de datos faltantes
