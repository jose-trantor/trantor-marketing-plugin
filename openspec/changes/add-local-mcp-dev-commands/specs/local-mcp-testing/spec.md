# Spec Delta

## Purpose

Permite a quien desarrolla el plugin comprobar el servidor MCP de Trantor (local, staging o producción) y probar el plugin de Claude contra él con comandos `make`, sin modificar los archivos versionados del plugin.

## ADDED Requirements

### Requirement: Comandos de desarrollo en development.mk
Los comandos de desarrollo del MCP SHALL definirse en `development.mk`, en la raíz del repo, incluido desde `Makefile`. `make help` SHALL listarlos en una sección propia.

#### Scenario: Ayuda con comandos de desarrollo
- **WHEN** se ejecuta `make help`
- **THEN** la salida incluye una sección de desarrollo con `mcp-token`, `mcp-ping`, `mcp-tools`, `mcp-contract`, `dev-plugin`, `dev-claude` y `dev-clean`, y la URL del servidor objetivo

#### Scenario: Targets existentes intactos
- **WHEN** se ejecutan `make claude-build` o `make chatgpt-build` tras incluir `development.mk`
- **THEN** generan los mismos zips que antes del cambio

### Requirement: Selección del servidor objetivo
Los comandos SHALL apuntar al servidor que indique `MCP_TARGET`: `local` (por defecto, `http://localhost:8001/mcp`), `staging` o `prod`, con las mismas URLs que usa el `Makefile`. Si se pasa `MCP_DEV_URL`, SHALL usarse esa URL. Un `MCP_TARGET` desconocido SHALL terminar con error.

#### Scenario: Objetivo por defecto
- **WHEN** se ejecuta `make mcp-ping` sin `MCP_TARGET` ni `MCP_DEV_URL`
- **THEN** la petición va a `http://localhost:8001/mcp`

#### Scenario: Objetivo staging
- **WHEN** se ejecuta `make mcp-tools MCP_TARGET=staging`
- **THEN** la petición va a `https://skull-api-staging.trantorai.ws/mcp`

#### Scenario: Objetivo no válido
- **WHEN** se ejecuta un comando de desarrollo con `MCP_TARGET=foo`
- **THEN** termina con error e indica los valores válidos

### Requirement: Autenticación con token Bearer
Los comandos que hablan con el servidor SHALL enviar `MCP_TOKEN` como `Authorization: Bearer`. Si falta el token o el servidor responde 401, SHALL terminar con error y explicar cómo obtener un token con `make mcp-token`. El token no SHALL escribirse en archivos versionados.

#### Scenario: Sin token
- **WHEN** se ejecuta `make mcp-ping` sin `MCP_TOKEN`
- **THEN** termina con error y sugiere `make mcp-token`

#### Scenario: Token rechazado
- **WHEN** se ejecuta `make mcp-ping` con un token caducado o no válido
- **THEN** termina con error e incluye la descripción del 401 del servidor

### Requirement: Generar un token MCP de desarrollo
`make mcp-token USER_ID=<id>` SHALL generar un token con audiencia `mcp` usando el clon de `skull-api` en `SKULL_API_DIR` (por defecto `../skull-api`). Si falta `USER_ID` o no existe `SKULL_API_DIR`, SHALL terminar con error y explicar qué falta.

#### Scenario: Token generado
- **WHEN** se ejecuta `make mcp-token USER_ID=user123` con `skull-api` en `../skull-api`
- **THEN** se muestra un token MCP válido para `user123` y cómo exportarlo como `MCP_TOKEN`

#### Scenario: skull-api no encontrado
- **WHEN** se ejecuta `make mcp-token USER_ID=user123` y `SKULL_API_DIR` no existe
- **THEN** termina con error indicando la ruta buscada y que se puede cambiar con `SKULL_API_DIR`

### Requirement: Comprobar que el servidor responde
`make mcp-ping` SHALL completar el handshake MCP (`initialize`) con el servidor objetivo y mostrar la URL, el nombre y la versión del servidor. SHALL terminar con error si el servidor no responde o el handshake falla.

#### Scenario: Servidor disponible
- **WHEN** se ejecuta `make mcp-ping` con un token válido y el servidor en marcha
- **THEN** muestra la URL, el nombre y la versión del servidor, y termina sin error

#### Scenario: Servidor parado
- **WHEN** se ejecuta `make mcp-ping` y no hay servidor escuchando en la URL objetivo
- **THEN** termina con error indicando que no se pudo conectar a esa URL

### Requirement: Listar las tools del servidor
`make mcp-tools` SHALL listar las tools que expone el servidor objetivo, ordenadas por nombre, cada una con la primera línea de su descripción.

#### Scenario: Listado de tools
- **WHEN** se ejecuta `make mcp-tools` contra un servidor disponible
- **THEN** se muestra cada tool con su nombre y la primera línea de su descripción, en orden alfabético

### Requirement: Contrato entre skills y servidor
El repo SHALL mantener una lista versionada de las tools MCP de las que dependen las skills. `make mcp-contract` SHALL comparar esa lista con las tools del servidor objetivo. SHALL terminar con error si falta alguna, nombrándolas. Las tools del servidor que no están en la lista SHALL mostrarse como aviso, sin error.

#### Scenario: Contrato cumplido
- **WHEN** se ejecuta `make mcp-contract` y el servidor expone todas las tools de la lista
- **THEN** termina sin error e indica cuántas tools se comprobaron

#### Scenario: Tool requerida ausente
- **WHEN** se ejecuta `make mcp-contract` y el servidor no expone `meta_insights`, que está en la lista
- **THEN** termina con error y nombra `meta_insights` como ausente

#### Scenario: Tool nueva en el servidor
- **WHEN** el servidor expone una tool que no está en la lista
- **THEN** `make mcp-contract` la muestra como aviso y no falla por ello

### Requirement: Copia efímera del plugin para probar
`make dev-plugin` SHALL generar en `builds/.dev/claude/` una copia del plugin de Claude cuyo servidor MCP apunte a la URL objetivo y envíe `MCP_TOKEN`. `make dev-claude` SHALL generarla y arrancar Claude Code con ella. `make dev-clean` SHALL borrarla.

#### Scenario: Probar el plugin contra el MCP local
- **WHEN** se ejecuta `make dev-claude MCP_TOKEN=<token>`
- **THEN** se abre Claude Code con el plugin cargado desde `builds/.dev/claude/` y su servidor MCP en `http://localhost:8001/mcp`

#### Scenario: Limpieza
- **WHEN** se ejecuta `make dev-clean`
- **THEN** `builds/.dev/` deja de existir y los zips de `builds/` no se tocan

### Requirement: Los archivos del plugin no se modifican
Ningún comando de desarrollo SHALL modificar archivos versionados, en particular `claude/.mcp.json` y `chatgpt/mcp.json`. Los artefactos generados SHALL quedar en rutas ignoradas por git.

#### Scenario: Árbol de trabajo limpio
- **WHEN** se ejecutan `make dev-plugin`, `make dev-claude`, `make mcp-contract` y `make dev-clean` en un clon limpio
- **THEN** `git status --porcelain` no muestra cambios
