# Design

## Context

- El servidor MCP unificado vive en `../skull-api`. `make run` lo levanta en `http://localhost:8001/mcp` (streamable HTTP, FastMCP). Toda petición a `/mcp` exige `Authorization: Bearer <jwt aud=mcp>`. Sin token, `McpHttpAuth` responde 401 con `WWW-Authenticate` apuntando al descubrimiento OAuth. `skull-api` genera tokens de desarrollo con `make generate-token-mcp USER_ID=…`.
- El `Makefile` de este repo define `MCP_URL_PROD`, `MCP_URL_STAGING` y `MCP_URL`, que es la URL de `chatgpt-build` según la rama. `builds/` está en `.gitignore`.
- `trantor-platform-2` y `skull-api` ya usan el patrón de `.mk` incluidos con `include`.
- `claude/.mcp.json` es sensible: lleva `merge=ours`, lo comprueba el CI y tiene un incidente previo. Ver proposal.md - Why.
- Las skills nombran las tools sin prefijo (`meta_insights`, `ga4_report`…). Extraerlas con regex da falsos positivos, porque los parámetros comparten prefijo (`page_id`, `meta_account_ids`).

## Goals / Non-Goals

**Goals:**
- Un único punto de entrada (`make …`) para comprobar el MCP y probar el plugin contra él.
- Sin dependencias nuevas: `python3` de sistema y la CLI `claude`.
- El token nunca se escribe en disco dentro del repo.

**Non-Goals:**
- Arrancar o parar `skull-api`.
- Probar ChatGPT o exponer el servidor local con un túnel.
- Restaurar `setup` y `check-mcp`. Va en otro cambio.
- Tests automáticos de las skills: el uso real se prueba a mano en la sesión de `dev-claude`.

## Decisions

### D1. `development.mk` en la raíz, incluido al final de las variables del `Makefile`
El usuario lo pidió en la raíz. Hay un solo `.mk`, así que no compensa crear un directorio `makefiles/`. Se incluye después de definir `MCP_URL_PROD` y `MCP_URL_STAGING` para reutilizarlas sin duplicar URLs. `help` del `Makefile` llama a un target `help-dev` definido en `development.mk`. Así cada archivo documenta sus propios comandos.

### D2. Variables: `MCP_TARGET`, `MCP_DEV_URL`, `MCP_TOKEN`, `SKULL_API_DIR`
- `MCP_TARGET ?= local`, que se resuelve a `MCP_DEV_URL` (`local` → `http://localhost:8001/mcp`; `staging` y `prod` → las URLs del `Makefile`). Un valor desconocido aborta con `$(error …)`, pero solo en los targets de desarrollo, para no romper `make claude-build`.
- Se usa `MCP_DEV_URL` y no `MCP_URL` porque `MCP_URL` ya fija la URL del zip de ChatGPT. Sobrescribirla desde la línea de comandos cambiaría también `chatgpt-build`.
- `MCP_TOKEN` se lee del entorno o de la línea de comandos. Lo recomendado es `export MCP_TOKEN=…`, para que no quede en el historial de cada comando.

### D3. Cliente MCP mínimo en Python stdlib: `dev/mcp_client.py`
Subcomandos `ping`, `tools` y `contract`, con URL y token por argumentos o entorno. El transporte streamable HTTP necesita:
- `Accept: application/json, text/event-stream`, y la respuesta puede venir como JSON o como SSE (`data:` lines).
- Guardar `Mcp-Session-Id` de `initialize` y reenviarlo en las siguientes peticiones.
- Enviar `notifications/initialized` antes de `tools/list` y paginar con `nextCursor`.
- Cerrar la sesión con `DELETE`, con best effort.
- Distinguir errores: conexión rechazada, 401 (mostrar `error_description`) y error JSON-RPC.

Alternativas descartadas:
- `curl` + `jq` en el `.mk`: la gestión de SSE, la sesión y la paginación quedaría frágil y difícil de leer.
- `fastmcp` o `@modelcontextprotocol/inspector`: añaden instalación (venv o npm). El inspector se puede documentar en el README como opción manual, sin target.

El script vive en `dev/`, fuera de `claude/` y `chatgpt/`, así que no entra en los zips. Se ejecuta con `python3 -I` para aislarlo del directorio actual.

### D4. Contrato basado en una lista explícita: `dev/mcp-tools.txt`
Una tool por línea; se permiten comentarios `#` para agrupar por skill. La lista inicial se construye revisando las skills de `claude/skills/` y se valida contra staging. `contract` informa de:
- **Error**: tools de la lista que el servidor no expone.
- **Aviso**: tools del servidor que no están en la lista, para detectar tools nuevas que las skills aún no aprovechan o renombrados.

Alternativa descartada: extraer las tools de las skills automáticamente. Da falsos positivos con nombres de parámetros y negativos si una skill nombra una tool en prosa. La lista explícita se revisa en el PR que cambie una skill.

### D5. Copia efímera del plugin con el token por variable de entorno
`dev-plugin` hace `rm -rf builds/.dev && cp -R claude builds/.dev/claude` y reescribe con Python el `.mcp.json` de la copia:

```json
{ "mcpServers": { "trantor": {
    "type": "http",
    "url": "<MCP_DEV_URL>",
    "headers": { "Authorization": "Bearer ${MCP_TOKEN}" } } } }
```

Claude Code expande `${MCP_TOKEN}` al cargar el servidor, así que el token no llega a escribirse en disco. `dev-claude` exige `MCP_TOKEN`, depende de `dev-plugin` y ejecuta `MCP_TOKEN=… claude --plugin-dir builds/.dev/claude`.

En la copia, el `name` de `.claude-plugin/plugin.json` pasa a `trantor-marketing-dev`. Así no choca con el plugin instalado desde el marketplace.

Alternativa descartada: usar `${MCP_URL:-https://…}` en el `claude/.mcp.json` versionado. Rompe la comprobación de URL por rama y cambia el archivo que se publica en el marketplace.

### D6. `mcp-token` delega en `skull-api`
`$(MAKE) -C $(SKULL_API_DIR) --no-print-directory generate-token-mcp USER_ID=$(USER_ID)`. Pasa `ENV=staging` cuando `MCP_TARGET=staging`, porque el token se firma con el secreto de ese entorno. Para `prod` no se ofrece y aborta: los tokens de producción no se generan desde un portátil. La salida se muestra tal cual, seguida de la línea `export MCP_TOKEN=…` a copiar.

## Risks / Trade-offs

- [La lista `dev/mcp-tools.txt` se desactualiza respecto a las skills] → El README y la cabecera del archivo piden actualizarla al cambiar una skill. Los avisos de `contract` ayudan a detectar renombrados.
- [El formato de salida de `generate-token-mcp` cambia en `skull-api`] → `mcp-token` solo reenvía la salida, sin parsearla. Si cambia, lo peor es que la línea `export` sugerida sea incorrecta.
- [Plugin del marketplace y copia dev cargados a la vez, con dos servidores `trantor`] → La copia se renombra (D5). El README recomienda desactivar el instalado durante las pruebas.
- [Servidor local en HTTPS autofirmado (`make run-https`)] → Por defecto se usa HTTP. Con HTTPS hay que pasar `MCP_DEV_URL` y el certificado tiene que ser de confianza en el sistema. No se añade un modo "insecure".
- [`include development.mk` rompe `make` si el archivo falta] → Se usa `include` y no `-include`, porque el archivo está versionado y su ausencia es un error real.

## Migration Plan

No hay migración: son targets nuevos. Para revertir, se quitan la línea `include`, `development.mk` y `dev/`.

## Open Questions

- ¿Conviene un target `mcp-call TOOL=… ARGS='{…}'` para invocar una tool suelta? Se puede añadir más adelante sobre el mismo cliente sin cambiar este diseño.
