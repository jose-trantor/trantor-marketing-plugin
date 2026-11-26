# Tasks

## 1. Esqueleto de development.mk

- [x] 1.1 Crear `development.mk` en la raíz con `MCP_TARGET ?= local`, `MCP_DEV_URL` resuelto según el objetivo (D2), `SKULL_API_DIR ?= ../skull-api` y un target `help-dev`. Verificar: `make help-dev MCP_TARGET=staging` muestra la URL de staging.
- [x] 1.2 Añadir `include development.mk` al `Makefile` después de `MCP_URL_PROD` y `MCP_URL_STAGING`, y hacer que `help` llame a `help-dev`. Verificar: `make help` muestra la sección de desarrollo, y `make claude-build` y `make chatgpt-build` generan zips idénticos en contenido (`unzip -l`) a los de antes del cambio.
- [x] 1.3 Validar `MCP_TARGET` solo en los targets de desarrollo. Verificar: `make mcp-ping MCP_TARGET=foo` falla indicando `local|staging|prod`, y `make claude-build MCP_TARGET=foo` no se ve afectado.

## 2. Cliente MCP y comprobaciones del servidor

- [x] 2.1 Crear `dev/mcp_client.py` (stdlib) con `initialize` y `notifications/initialized`, respuestas JSON o SSE, `Mcp-Session-Id`, `DELETE` de cierre y errores diferenciados: conexión, 401 con `error_description` y JSON-RPC (D3). Verificar: con skull-api parado, `python3 -I dev/mcp_client.py ping --url http://localhost:8001/mcp` falla con "no se pudo conectar"; con un token falso, falla mostrando la descripción del 401.
- [x] 2.2 Añadir los subcomandos `ping` (URL, nombre y versión del servidor) y `tools` (orden alfabético, primera línea de la descripción, paginación con `nextCursor`). Verificar: ambos funcionan contra `make run` de skull-api con un token de `generate-token-mcp`.
- [x] 2.3 Añadir los targets `mcp-ping` y `mcp-tools` en `development.mk`. Sin `MCP_TOKEN` deben fallar sugiriendo `make mcp-token`. Verificar: `make mcp-ping` sin token falla con la sugerencia; con token, contra local y contra `MCP_TARGET=staging`, termina con código 0.
- [x] 2.4 Añadir el target `mcp-token`, que delega en `$(SKULL_API_DIR)` con `ENV=staging` si el objetivo es staging, aborta con `prod` y valida `USER_ID` y `SKULL_API_DIR` (D6). Verificar: `make mcp-token USER_ID=user123` imprime un token y la línea `export MCP_TOKEN=…`; `make mcp-token USER_ID=x SKULL_API_DIR=/nope` falla nombrando la ruta.

## 3. Contrato skills ↔ servidor

- [x] 3.1 Crear `dev/mcp-tools.txt` con las tools que usan las skills de `claude/skills/`, revisándolas una a una y agrupadas por skill con comentarios. Cabecera: cuándo actualizarla. Verificar: cada nombre aparece en al menos un `SKILL.md` o referencia (`grep -rw`).
- [x] 3.2 Añadir el subcomando `contract` al cliente (ausentes = error, extra = aviso) y el target `mcp-contract` (D4). Verificar: pasa contra staging; añadiendo una tool inventada a una copia temporal de la lista, falla y la nombra.

## 4. Plugin efímero para Claude Code

- [x] 4.1 Añadir `dev-plugin`: copia `claude/` a `builds/.dev/claude/`, reescribe su `.mcp.json` con `MCP_DEV_URL` y la cabecera `Bearer ${MCP_TOKEN}`, y renombra el plugin a `trantor-marketing-dev` (D5). Verificar: `jq . builds/.dev/claude/.mcp.json` muestra la URL objetivo y `${MCP_TOKEN}` literal, y `git status --porcelain` queda vacío.
- [x] 4.2 Añadir `dev-claude`, que exige `MCP_TOKEN` y ejecuta `claude --plugin-dir builds/.dev/claude`, y `dev-clean`, que borra solo `builds/.dev/`. Verificar: en la sesión abierta, `/mcp` muestra el servidor conectado a localhost y una skill (p. ej. onboarding) llama a `meta_list_accounts` con éxito; `make dev-clean` deja los zips de `builds/` intactos.

## 5. Documentación e integración

- [x] 5.1 Añadir al `README.md` la sección "Desarrollo en local": requisitos, flujo `mcp-token` → `export MCP_TOKEN` → `mcp-ping` → `mcp-contract` → `dev-claude`, mantenimiento de `dev/mcp-tools.txt`, desactivar el plugin instalado mientras se prueba y el inspector MCP como opción manual. Añadir los targets nuevos a la tabla de comandos. Verificar: seguir la sección paso a paso en un clon limpio funciona tal como está escrita.
- [x] 5.2 Comprobación final: en un clon limpio, ejecutar `make help`, `mcp-ping`, `mcp-tools`, `mcp-contract`, `dev-plugin`, `dev-clean`, `claude-build` y `chatgpt-build`. Verificar: `git status --porcelain` vacío y `claude/.mcp.json` y `chatgpt/mcp.json` sin cambios (`git diff --exit-code`).

## Workflow follow-up

- Abrir antes un cambio aparte para restaurar `setup` y `check-mcp`, que se perdieron en el merge `1cf67c3`. El CI `check-mcp.yml` falla sin ellos.
- Archivar este cambio cuando se haya revisado e integrado en `staging`.
