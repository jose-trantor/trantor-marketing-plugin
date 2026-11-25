# Trantor Marketing para ChatGPT

**Estado: en preparación.**

Versión de Trantor Marketing para ChatGPT. La lógica principal reside en el servidor Trantor, que ya da soporte a ChatGPT. Esta carpeta contiene el plugin que se publica desde el lado de ChatGPT. Mientras tanto, la versión disponible es la de [Claude](../claude/README.md).

Esta plataforma tiene su propia versión (en `plugin.json`), independiente de la de Claude.

## Contenido

```text
plugin.json   Manifest del plugin (nombre, versión, autor)
mcp.json      Conexión con el servidor MCP de Trantor (OAuth con registro dinámico de cliente)
skills/       Skills del plugin: orchestrator, onboarding, dashboard-marketing y una por área
```

## Generar el paquete

Desde la raíz del repo:

```bash
make chatgpt-build
```

Genera `trantor-marketing-chatgpt[-staging]-<timestamp>.zip` con `plugin.json`, `mcp.json` y `skills/` en la raíz del zip.

`mcp.json` apunta siempre a producción (`https://skull-api.trantorai.ws/mcp`) en todas las ramas. Si construyes desde la rama `staging`, el paquete se genera con la URL de staging (`https://skull-api-staging.trantorai.ws/mcp`). Por eso, a diferencia de Claude, este archivo no necesita reglas de merge entre ramas. Si cambias la URL de producción en `mcp.json`, actualiza también `MCP_URL_PROD` en el `Makefile`. Si no coinciden, el build de staging falla.

Para borrar los zips de ChatGPT: `make chatgpt-clean`.
