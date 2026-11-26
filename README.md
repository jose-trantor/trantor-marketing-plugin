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
development.mk     Comandos para probar el plugin contra el servidor MCP local (incluido por el Makefile)
dev/               Cliente MCP de desarrollo y lista de tools que usan las skills; no forma parte de los zips
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
| `make fix-mcp`       | Corrige la URL del MCP de Claude para la rama actual (sin commit)    |
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

Si el check falla, ejecuta `make fix-mcp` en esa rama: sustituye la URL equivocada por la que corresponde, vuelve a ejecutar `check-mcp` y te muestra el cambio. No hace commit: haz el commit tú, aparte. Solo funciona en `main` y `staging`, y no toca el archivo si la URL no es ninguna de las dos conocidas. Ni `check-mcp`, ni `claude-build`, ni CI corrigen la URL por su cuenta, para que el error siempre se vea.

## Desarrollo en local

Los comandos de `development.mk` comprueban el servidor MCP (`skull-api`) y prueban el plugin contra él **sin tocar `claude/.mcp.json`**. Todo lo que generan va a `builds/.dev/`, que git ignora.

Requisitos: `python3`, la CLI `claude` y un clon de `skull-api` (por defecto en `../skull-api`; si no, pásalo con `SKULL_API_DIR=<ruta>`).

### Flujo

```sh
# 1. En skull-api: arranca el servidor en http://localhost:8001
make -C ../skull-api run

# 2. Aquí: genera un token MCP y expórtalo (la última línea de la salida)
make mcp-token USER_ID=<tu-user-id>
export MCP_TOKEN=eyJ...

# 3. Comprueba el servidor y que expone las tools de las skills
make mcp-ping
make mcp-contract

# 4. Abre Claude Code con una copia del plugin apuntando al servidor local
make dev-claude
```

Usa un `USER_ID` que tenga fuentes conectadas en ese entorno. Si no, las tools responden que la fuente no está conectada.

### Comandos

| Comando             | Qué hace                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `make mcp-token`    | Genera un token MCP (`aud=mcp`) con skull-api para `USER_ID`. No genera tokens de `prod`   |
| `make mcp-ping`     | Hace el handshake MCP y muestra el nombre y la versión del servidor                        |
| `make mcp-tools`    | Lista las tools del servidor                                                               |
| `make mcp-contract` | Falla si el servidor no expone alguna tool de `dev/mcp-tools.txt`; avisa de las que sobran |
| `make dev-plugin`   | Copia `claude/` a `builds/.dev/claude/` con el MCP y el token del entorno de pruebas       |
| `make dev-claude`   | Genera la copia y abre `claude --plugin-dir builds/.dev/claude`                            |
| `make dev-clean`    | Borra `builds/.dev/` (los zips no se tocan)                                                |

Por defecto apuntan a `http://localhost:8001/mcp`. Para usar otro servidor:

- `MCP_TARGET=staging` o `MCP_TARGET=prod` usan las URLs de la tabla anterior. Con `MCP_TARGET=staging`, `mcp-token` firma el token con el secreto de staging (necesita acceso a AWS SSM).
- `MCP_DEV_URL=<url>` usa cualquier URL, por ejemplo `https://localhost:8001/mcp` con `make run-https` en skull-api.

### Notas

- **El token no se guarda en disco.** El `.mcp.json` de la copia contiene `Bearer ${MCP_TOKEN}`, y Claude Code lo sustituye al arrancar. Si el token caduca, genera otro y vuelve a abrir la sesión.
- **Tools con el mismo nombre.** En la copia, el plugin se llama `trantor-marketing-dev` y sus tools son `mcp__plugin_trantor-marketing-dev_trantor__*`. Si también tienes instalado el plugin del marketplace o los conectores de Trantor de claude.ai, verás las mismas tools varias veces. Desactívalos mientras pruebas, o fíjate en el prefijo de la tool que se llama.
- **`dev/mcp-tools.txt`** lista las tools de las que dependen las skills. Actualízala en el mismo PR en que una skill empiece o deje de usar una tool.
- Para depurar a mano también sirve el inspector oficial: `npx @modelcontextprotocol/inspector`, con transporte *Streamable HTTP*, la URL del servidor y la cabecera `Authorization: Bearer $MCP_TOKEN`.

## Licencia

[MIT](LICENSE)
