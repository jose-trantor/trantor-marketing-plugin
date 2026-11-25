# Proposal

## Why

Los targets `claude-build` y `chatgpt-build` generan un zip con el mismo nombre, y `zip -r` añade archivos a un zip existente. Si se construyen las dos plataformas desde el mismo commit, se obtiene un único zip con el contenido de ambas. Además, el zip de ChatGPT guarda los archivos dentro de `chatgpt/` en lugar de en la raíz, y `chatgpt/mcp.json` apunta siempre a staging, también si se construye desde `main`.

## What Changes

- El nombre del zip incluye la plataforma: `trantor-marketing-<plataforma>[-staging]-<timestamp>.zip`, con `<plataforma>` igual a `claude` o `chatgpt`. **BREAKING** para quien dependa del nombre actual (`trantor-marketing[-staging]-<timestamp>.zip`).
- Cada build borra su zip antes de crearlo, para que no queden archivos antiguos dentro.
- `claude-clean` y `chatgpt-clean` borran solo los zips de su plataforma.
- El zip de ChatGPT tiene `plugin.json`, `mcp.json` y `skills/` en la raíz. Se prepara en un directorio temporal `build/chatgpt/` que se borra al terminar.
- La URL del servidor MCP en el zip de ChatGPT depende de la rama: staging en la rama `staging` y producción en las demás. En el repo, `chatgpt/mcp.json` guarda la URL de producción.
- Los dos builds excluyen `.DS_Store`.
- `build/` se añade a `.gitignore`.

## Capabilities

### New Capabilities

- `plugin-packaging`: cómo se generan y se limpian los paquetes distribuibles de cada plataforma: nombre del archivo, estructura interna, endpoint según el entorno y exclusiones.

### Modified Capabilities

(ninguna)

## Impact

- `Makefile`: nueva función de nombre, targets `claude-build`, `claude-clean`, `chatgpt-build` y `chatgpt-clean`.
- `chatgpt/mcp.json`: pasa a contener la URL de producción.
- `.gitignore`: se añade `build/`.
- Distribución: cambia el nombre de los zips. El patrón `trantor-marketing-*.zip` del `.gitignore` sigue cubriéndolos.
- Fuera de alcance: la regla `merge=ours` de `claude/.mcp.json`. No funciona sin un driver configurado en cada clon, pero afecta a la instalación de Claude desde git y se tratará en otro cambio.
