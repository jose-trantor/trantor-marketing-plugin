# Trantor Marketing

Dashboards e informes de marketing en vivo, creados por un asistente de IA a partir de tus cuentas de Meta Ads, Instagram, Facebook y Google Analytics 4, sin conocimientos técnicos.

Este repo contiene la integración de Trantor Marketing para cada plataforma de IA. Cada una vive en su propia carpeta, con su README y su versión.

## Plataformas

| Plataforma | Estado         | Versión | Documentación                          |
| ---------- | -------------- | ------- | -------------------------------------- |
| Claude     | Disponible     | 0.4.0   | [claude/README.md](claude/README.md)   |
| ChatGPT    | En preparación | 0.3.0   | [chatgpt/README.md](chatgpt/README.md) |

## Datos y privacidad

Todas las plataformas consultan los datos a través del conector Trantor (<https://trantorai.ws>), siempre con las cuentas que cada persona ha autorizado. Las integraciones no guardan datos propios.

Para empezar necesitas una cuenta de Trantor (<https://staging.trantorai.ws/signup/>) y tus fuentes habilitadas en <https://staging.trantorai.ws/connectors/>.

## Estructura del repo

```text
claude/            Plugin de Claude (skills, MCP, manifest)
chatgpt/           Plugin de ChatGPT (skills, MCP, manifest; en preparación)
.claude-plugin/    Marketplace de Claude; apunta a claude/
Makefile           Genera los zips distribuibles de cada plataforma
openspec/          Especificaciones y cambios (OpenSpec)
.claude/           Comandos y skills de desarrollo de este repo; no forman parte del plugin
```

## Generar los paquetes

Cada plataforma tiene sus propios targets en el `Makefile`:

| Comando              | Resultado                                                      |
| -------------------- | -------------------------------------------------------------- |
| `make claude-build`  | `trantor-marketing-claude[-staging]-<timestamp>.zip`           |
| `make chatgpt-build` | `trantor-marketing-chatgpt[-staging]-<timestamp>.zip`          |
| `make claude-clean`  | Borra solo los zips de Claude                                  |
| `make chatgpt-clean` | Borra solo los zips de ChatGPT                                 |
| `make help`          | Muestra los nombres y la URL del MCP que se usarán en la rama  |

- `-staging` aparece solo si se construye desde la rama `staging`. `<timestamp>` es la fecha del último commit (`YYYYMMDDTHHMMSS`).
- El zip de Claude conserva la estructura del marketplace: `.claude-plugin/`, `claude/` y `README.md`.
- El zip de ChatGPT tiene el contenido de `chatgpt/` en la raíz (`plugin.json`, `mcp.json` y `skills/`). La URL del servidor MCP se fija al construir: staging desde la rama `staging` y producción desde cualquier otra. En el repo, `chatgpt/mcp.json` siempre apunta a producción.
- Ningún zip incluye `.DS_Store`.

## Licencia

[MIT](LICENSE)
