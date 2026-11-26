# Spec: manifest

## Purpose

Documento `manifest.json` en la colección `files` del store del dashboard. Es la fuente de verdad sobre qué áreas están instaladas y con qué cuentas. El JS lo lee al arrancar para controlar la visibilidad de pestañas.

## Requirements

### Requirement: Manifest persiste el estado del dashboard
El sistema SHALL mantener un documento `manifest.json` en la colección `files` del store del dashboard. Este documento es la fuente de verdad sobre qué áreas están instaladas y con qué cuentas. Se crea al instalar la primera área y se actualiza al instalar cada área adicional.

#### Scenario: Creación del manifest al instalar la primera área
- **WHEN** el LLM instala la primera área en un dashboard nuevo
- **THEN** escribe `files/manifest.json` con `installed_tabs` conteniendo los tabs de esa área, `accounts` con las cuentas seleccionadas, `brand`, `title`, `connector`, `locale`, `currency_symbol` y `utc_offset_hours`

#### Scenario: Actualización del manifest al añadir un área
- **WHEN** el LLM añade una nueva área a un dashboard que ya tiene manifest
- **THEN** lee el manifest existente con su `version`, añade los nuevos tabs a `installed_tabs`, completa los campos `accounts` del área nueva y escribe con `if_version`

#### Scenario: El manifest refleja solo áreas completamente instaladas
- **WHEN** la instalación de un área falla antes de completar la escritura de todos sus datasets
- **THEN** el tab de esa área NO se añade a `installed_tabs` del manifest

### Requirement: El JS lee el manifest para controlar la visibilidad de tabs
El JS SHALL leer `files/manifest.json` al arrancar el dashboard, antes de renderizar ninguna pestaña, y ocultar los `<button data-tab>` y `<section id>` correspondientes a áreas no incluidas en `installed_tabs`.

#### Scenario: Tabs de áreas no instaladas quedan ocultas
- **WHEN** el dashboard carga y `installed_tabs` contiene solo `["meta", "awareness", "creatividades"]`
- **THEN** los botones y secciones de Instagram, Facebook y Web (GA4) tienen el atributo `hidden`; los de Meta·Rendimiento, Meta·Awareness y Meta·Creatividades son visibles

#### Scenario: Resumen oculto con menos de 2 áreas
- **WHEN** el dashboard carga y `installed_tabs` tiene tabs de una sola área (ej. solo Meta)
- **THEN** el botón y la sección de Resumen tienen el atributo `hidden`

#### Scenario: Fallback si el manifest no puede cargarse
- **WHEN** el fetch de `manifest.json` falla o devuelve un error
- **THEN** el dashboard muestra todas las pestañas (comportamiento idéntico al actual) y no bloquea la carga
