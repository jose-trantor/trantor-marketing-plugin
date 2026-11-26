# Proposal

## Why

Las skills del plugin dependen de las tools del servidor MCP de Trantor (`skull-api`). Hoy no hay forma de probarlas contra un servidor en desarrollo sin editar a mano `claude/.mcp.json`. Ese archivo está protegido por rama (`merge=ours`, `check-mcp`), y una edición accidental ya llevó la URL de staging a producción. Necesitamos comandos para probar en local que no toquen los archivos versionados del plugin.

## What Changes

- Nuevo `development.mk` en la raíz, incluido desde `Makefile`, con los comandos de desarrollo del MCP.
- Elección del servidor objetivo: `MCP_TARGET=local|staging|prod` (por defecto `local`, `http://localhost:8001/mcp`), con `MCP_DEV_URL` como override directo (no `MCP_URL`, que ya usa `chatgpt-build`). El token Bearer se pasa en `MCP_TOKEN`.
- `make mcp-token`: genera un token MCP llamando a `generate-token-mcp` de `skull-api` (`SKULL_API_DIR ?= ../skull-api`).
- `make mcp-ping`: hace el handshake MCP (`initialize`) contra el servidor objetivo e informa si responde y si acepta el token.
- `make mcp-tools`: lista las tools que expone el servidor objetivo.
- `make mcp-contract`: comprueba que todas las tools de las que dependen las skills existen en el servidor objetivo. Falla si falta alguna.
- `make dev-plugin`: genera una copia efímera del plugin de Claude (`builds/.dev/claude/`) cuyo `.mcp.json` apunta al servidor objetivo con el token. `make dev-claude` arranca Claude Code con esa copia.
- `make dev-clean`: borra la copia efímera.
- `make help` muestra también los comandos de desarrollo.
- Nunca se modifican `claude/.mcp.json` ni `chatgpt/mcp.json`.

Fuera de alcance:
- Restaurar los targets `setup` y `check-mcp`, que se perdieron en el merge `1cf67c3`. Va en un cambio aparte y previo.
- Probar ChatGPT en local, porque ChatGPT no llega a `localhost`.
- Arrancar `skull-api` desde este repo.

## Capabilities

### New Capabilities
- `local-mcp-testing`: comandos de desarrollo para comprobar el servidor MCP (local, staging o producción) y probar el plugin de Claude contra él, sin modificar los archivos versionados del plugin.

### Modified Capabilities
<!-- Ninguna: los targets de empaquetado y de comprobación de rama no cambian. -->

## Impact

- Archivos nuevos: `development.mk` y un cliente MCP mínimo en `dev/` (Python, solo librería estándar), más la lista de tools requeridas.
- `Makefile`: una línea `include development.mk` y la sección de ayuda.
- `.gitignore`: `builds/` ya cubre `builds/.dev/`, sin cambios.
- `README.md`: nueva sección "Desarrollo en local".
- Dependencias locales: `python3` y `claude` (CLI). `mcp-token` necesita un clon de `skull-api` con su `.venv`.
- Los zips de distribución no cambian: `dev/` y `development.mk` quedan fuera de `claude/` y `chatgpt/`.
