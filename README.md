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

Cada plataforma tiene sus propios targets en el `Makefile`. Los zips se generan en `builds/`:

| Comando              | Resultado                                                            |
| -------------------- | -------------------------------------------------------------------- |
| `make claude-build`  | `builds/trantor-marketing-claude[-staging]-<timestamp>.zip`          |
| `make chatgpt-build` | `builds/trantor-marketing-chatgpt[-staging]-<timestamp>.zip`         |
| `make claude-clean`  | Borra solo los zips de Claude (y `builds/` si queda vacía)           |
| `make chatgpt-clean` | Borra solo los zips de ChatGPT (y `builds/` si queda vacía)          |
| `make check-mcp`     | Comprueba la URL del MCP de Claude para la rama actual               |
| `make setup`         | Configura el driver de merge `ours` en tu clon (una vez)             |
| `make help`          | Muestra los nombres y las URLs que se usarán en la rama actual       |

- `-staging` aparece solo si se construye desde la rama `staging`. `<timestamp>` es la fecha del último commit (`YYYYMMDDTHHMMSS`).
- El zip de Claude contiene solo la carpeta `claude/` (manifest, `.mcp.json` y skills), sin el marketplace ni este README.
- El zip de ChatGPT tiene el contenido de `chatgpt/` en la raíz (`plugin.json`, `mcp.json` y `skills/`).
- Ningún zip incluye `.DS_Store`.

## URL del servidor MCP en cada rama

> **Importante:** `main` es producción y `staging` es staging. Cada plataforma debe conectarse al servidor que corresponde a su rama.

| Rama      | Servidor MCP                                  |
| --------- | --------------------------------------------- |
| `main`    | `https://skull-api.trantorai.ws/mcp`          |
| `staging` | `https://skull-api-staging.trantorai.ws/mcp`  |

**ChatGPT** no necesita nada: `chatgpt/mcp.json` tiene siempre la URL de producción y `make chatgpt-build` fija la de staging al construir desde `staging`.

**Claude** se instala desde git, así que `claude/.mcp.json` debe tener la URL correcta *en cada rama*. Para evitar que un merge entre `main` y `staging` la cambie:

1. Ejecuta `make setup` una vez en tu clon. Configura el driver de la regla `merge=ours` de `.gitattributes`; sin él, git ignora la regla en silencio.
2. Aun así, la regla **no basta**: solo actúa cuando las dos ramas han cambiado el archivo. Si lo cambió solo una, git aplica ese cambio. Así llegó la URL de staging a producción el 25-11-2026.
3. Después de cada merge entre `main` y `staging`, ejecuta `make check-mcp`. Falla si la URL no es la de la rama. `make claude-build` hace la misma comprobación y no genera el zip si falla.
4. El workflow `.github/workflows/check-mcp.yml` repite la comprobación en cada push a `main` y `staging` y en cada PR contra ellas, con el resultado del merge. Para que bloquee los merges, márcalo como check obligatorio en la protección de ramas de GitHub.

Si el check falla, corrige la URL de `claude/.mcp.json` a mano en un commit aparte. Ni CI ni el `Makefile` la cambian por ti.

## Licencia

[MIT](LICENSE)
