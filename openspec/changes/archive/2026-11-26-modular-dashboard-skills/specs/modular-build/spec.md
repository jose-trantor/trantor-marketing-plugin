## ADDED Requirements

### Requirement: build.py actúa como orquestador con flag --tabs
`build.py` SHALL aceptar un flag `--tabs` con una lista separada por comas de áreas a construir (ej. `--tabs meta,instagram`). Importa y delega en los módulos de área correspondientes. Sin `--tabs`, construye todas las áreas (comportamiento equivalente al actual para retrocompatibilidad durante la transición).

#### Scenario: Build de un área específica
- **WHEN** se ejecuta `python3 build.py config.json salida/ --tabs meta`
- **THEN** genera únicamente los 14 datasets de Meta Ads y el manifest; no genera datasets de Instagram, Facebook ni GA4

#### Scenario: Build de múltiples áreas
- **WHEN** se ejecuta `python3 build.py config.json salida/ --tabs meta,instagram,resumen`
- **THEN** genera los datasets de Meta Ads, Instagram y el manifest; no genera datasets de Facebook ni GA4

#### Scenario: Build completo sin flag
- **WHEN** se ejecuta `python3 build.py config.json salida/` sin `--tabs`
- **THEN** genera todos los datasets de todas las áreas (equivalente al comportamiento actual)

### Requirement: build_common.py centraliza la lógica compartida
Un módulo `build_common.py` SHALL exportar las funciones `fill_text`, `fill_value`, `only_campaigns` y `put` para que todos los módulos de área las importen. No se duplica esta lógica en ningún módulo secundario.

#### Scenario: Módulo de área usa fill_text de build_common
- **WHEN** `build_meta.py` procesa un dataset con tokens `__LV_*__`
- **THEN** usa `fill_text` y `fill_value` importadas de `build_common`, no define sus propias versiones

### Requirement: Cada módulo de área es ejecutable de forma independiente
Cada script de área (`build_meta.py`, `build_instagram.py`, `build_facebook.py`, `build_ga4.py`) SHALL ser ejecutable directamente con la misma interfaz `config.json OUT_DIR` para facilitar el desarrollo y testing.

#### Scenario: Ejecución directa de build_meta.py
- **WHEN** se ejecuta `python3 build_meta.py config.json salida/`
- **THEN** genera únicamente los datasets de Meta Ads bajo `salida/` y produce `writes-1.json`
