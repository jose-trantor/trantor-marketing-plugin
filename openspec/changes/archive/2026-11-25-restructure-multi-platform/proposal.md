# Proposal

## Why

El repo solo contiene el plugin de Claude y el propio repo funciona como plugin, porque el marketplace apunta a `./`. Ahora queremos distribuir Trantor Marketing también en ChatGPT. Para eso hace falta una estructura que aloje cada plataforma por separado, con su propia documentación y versión, sin romper la instalación actual en Claude.

## What Changes

- Mover todo lo del plugin de Claude a `claude/`: `claude/.claude-plugin/plugin.json`, `claude/.mcp.json` y `claude/skills/`.
- Mantener `.claude-plugin/marketplace.json` en la raíz y cambiar `source` de `"./"` a `"./claude"`. Así `/plugin marketplace add <owner>/trantor-marketing-plugin` sigue funcionando.
- Crear `claude/README.md` con el contenido de uso del plugin de Claude (el README actual, adaptado).
- Crear el esqueleto `chatgpt/` con solo un `README.md`. La lógica de ChatGPT vive en el servidor Trantor y sus especificaciones llegarán en otro cambio.
- Reescribir el `README.md` de la raíz como README general: qué es Trantor Marketing, qué plataformas hay y enlaces a cada carpeta.
- Dejar en la raíz el tooling del repo: `.claude/`, `openspec/`, `.openspec-store/` y `LICENSE`.
- Versionado independiente por plataforma: Claude sigue en `0.4.0` y ChatGPT no tiene versión hasta que exista código.
- **BREAKING** (solo para quien instale con ruta local apuntando a la raíz del repo): el plugin ya no está en la raíz y hay que apuntar a `claude/`. La instalación por marketplace no cambia.

Fuera de alcance: carpeta `shared/`, renombrar el repo, implementación de ChatGPT y cambios en los skills o en el dashboard.

## Capabilities

### New Capabilities
- `platform-packaging`: cómo se organiza y distribuye el repo por plataforma (una carpeta autocontenida por plataforma, marketplace de Claude en la raíz, README general y por plataforma, versión independiente).

### Modified Capabilities
<!-- Ninguna: no hay specs previas y el comportamiento de los skills no cambia. -->

## Impact

- Rutas: `skills/`, `.claude-plugin/plugin.json` y `.mcp.json` pasan a `claude/`.
- `.claude-plugin/marketplace.json`: cambia `source`.
- `README.md` de la raíz se reescribe. Se añaden `claude/README.md` y `chatgpt/README.md`.
- Skills: sin cambios. Las rutas `${CLAUDE_SKILL_DIR}/../dashboard-marketing/...` son relativas dentro de `skills/` y siguen siendo válidas.
- Usuarios ya instalados: tendrán que actualizar el marketplace (`/plugin marketplace update`) para que coja el nuevo `source`.
