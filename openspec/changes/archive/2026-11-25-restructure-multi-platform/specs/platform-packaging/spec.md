# Spec Delta

## Purpose

Define cómo el repo aloja y distribuye Trantor Marketing en varias plataformas (Claude, ChatGPT), cada una autocontenida y documentada por separado.

## ADDED Requirements

### Requirement: Una carpeta autocontenida por plataforma
El repo SHALL alojar cada plataforma en su propia carpeta de primer nivel (`claude/`, `chatgpt/`). Todo lo que la plataforma necesita para funcionar o publicarse SHALL estar dentro de su carpeta, sin referencias a archivos fuera de ella.

#### Scenario: Plugin de Claude autocontenido
- **WHEN** se inspecciona `claude/`
- **THEN** contiene `.claude-plugin/plugin.json`, `.mcp.json` y `skills/`, y ningún archivo de `claude/` referencia rutas fuera de `claude/`

#### Scenario: No quedan archivos de plugin en la raíz
- **WHEN** se lista la raíz del repo
- **THEN** no existen `skills/`, `.mcp.json` ni `.claude-plugin/plugin.json` en la raíz

### Requirement: Instalación de Claude por marketplace sin cambios
El repo SHALL mantener `.claude-plugin/marketplace.json` en la raíz con el plugin `trantor-marketing` apuntando a `./claude`, para que el comando de instalación existente siga funcionando.

#### Scenario: Añadir el marketplace e instalar
- **WHEN** un usuario ejecuta `/plugin marketplace add <owner>/trantor-marketing-plugin` y luego instala `trantor-marketing`
- **THEN** se instala el plugin desde `claude/` con sus skills y el servidor MCP Trantor disponibles

#### Scenario: Skills que usan scripts compartidos
- **WHEN** un skill de área ejecuta `${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/...` tras la instalación
- **THEN** el script se encuentra y se ejecuta igual que antes de la reorganización

### Requirement: README general y README por plataforma
El repo SHALL tener un `README.md` en la raíz que describa el proyecto, liste las plataformas con su estado y enlace al README de cada una. Cada carpeta de plataforma SHALL tener su propio `README.md`.

#### Scenario: Navegar desde el README general
- **WHEN** un lector abre el `README.md` de la raíz
- **THEN** encuentra un enlace a `claude/README.md` y otro a `chatgpt/README.md`, cada uno con el estado de la plataforma

#### Scenario: Plataforma en preparación
- **WHEN** un lector abre `chatgpt/README.md` antes de que exista implementación
- **THEN** el README indica que la plataforma está en preparación y que la lógica reside en el servidor Trantor

### Requirement: Versionado independiente por plataforma
Cada plataforma SHALL declarar su versión dentro de su propia carpeta, y cambiar la versión de una plataforma MUST NOT requerir cambiar la de otra.

#### Scenario: Versión de Claude tras la reorganización
- **WHEN** se lee `claude/.claude-plugin/plugin.json`
- **THEN** su `version` es `0.4.0`, la misma que antes del cambio

#### Scenario: No hay versión global
- **WHEN** se inspecciona la raíz del repo
- **THEN** no existe ningún archivo que fije una versión común a todas las plataformas
