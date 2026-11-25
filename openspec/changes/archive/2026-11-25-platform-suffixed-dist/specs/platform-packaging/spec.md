# Spec Delta

## ADDED Requirements

### Requirement: Nombre del paquete por plataforma
Cada paquete SHALL llamarse `trantor-marketing-<plataforma>[-staging]-<timestamp>.zip`. `<plataforma>` es `claude` o `chatgpt`. `-staging` aparece solo si se construye desde la rama `staging`. `<timestamp>` es la fecha del último commit en formato `YYYYMMDDTHHMMSS`.

#### Scenario: Build de Claude fuera de staging
- **WHEN** se ejecuta `make claude-build` en la rama `main` y el último commit es del 2026-11-25 16:26:00
- **THEN** se genera `trantor-marketing-claude-20261125T162600.zip`

#### Scenario: Build de ChatGPT en staging
- **WHEN** se ejecuta `make chatgpt-build` en la rama `staging` y el último commit es del 2026-11-25 16:26:00
- **THEN** se genera `trantor-marketing-chatgpt-staging-20261125T162600.zip`

#### Scenario: Builds de las dos plataformas en el mismo commit
- **WHEN** se ejecutan `make claude-build` y `make chatgpt-build` sobre el mismo commit
- **THEN** se generan dos zips distintos, y cada uno contiene solo los archivos de su plataforma

### Requirement: Paquete regenerado desde cero
Cada build SHALL crear el zip desde cero. Si ya existe un zip con el mismo nombre, no debe conservar nada de su contenido anterior.

#### Scenario: Archivo eliminado entre dos builds del mismo commit
- **WHEN** existe `trantor-marketing-chatgpt-<ts>.zip`, se borra un archivo de `chatgpt/skills/` sin hacer commit y se vuelve a ejecutar `make chatgpt-build`
- **THEN** el nuevo zip no contiene el archivo borrado

### Requirement: Limpieza por plataforma
`make claude-clean` SHALL borrar solo los paquetes de Claude, y `make chatgpt-clean` SHALL borrar solo los de ChatGPT.

#### Scenario: Limpiar ChatGPT conserva Claude
- **WHEN** existen `trantor-marketing-claude-<ts>.zip` y `trantor-marketing-chatgpt-<ts>.zip`, y se ejecuta `make chatgpt-clean`
- **THEN** se borra el zip de ChatGPT y el de Claude sigue existiendo

### Requirement: Estructura del paquete de Claude
El paquete de Claude SHALL contener `claude/`, `.claude-plugin/` y `README.md` con las mismas rutas relativas que tienen en el repo, para que `.claude-plugin/marketplace.json` siga resolviendo `source: "./claude"`.

#### Scenario: Marketplace dentro del paquete
- **WHEN** se lista el contenido del zip de Claude
- **THEN** contiene `.claude-plugin/marketplace.json` y `claude/.claude-plugin/plugin.json`

### Requirement: Estructura del paquete de ChatGPT
El paquete de ChatGPT SHALL tener el contenido de `chatgpt/` en la raíz del zip, sin la carpeta `chatgpt/` delante.

#### Scenario: Manifest en la raíz
- **WHEN** se lista el contenido del zip de ChatGPT
- **THEN** contiene `plugin.json`, `mcp.json` y `skills/` en la raíz, y ninguna ruta empieza por `chatgpt/`

### Requirement: Endpoint MCP de ChatGPT según la rama
El `mcp.json` del paquete de ChatGPT SHALL apuntar a `https://skull-api-staging.trantorai.ws/mcp` si se construye desde la rama `staging`, y a `https://skull-api.trantorai.ws/mcp` desde cualquier otra rama. El archivo `chatgpt/mcp.json` del repo SHALL contener la URL de producción.

#### Scenario: Build desde staging
- **WHEN** se ejecuta `make chatgpt-build` en la rama `staging`
- **THEN** el `mcp.json` del zip contiene `https://skull-api-staging.trantorai.ws/mcp`

#### Scenario: Build desde main o una rama de feature
- **WHEN** se ejecuta `make chatgpt-build` en una rama distinta de `staging`
- **THEN** el `mcp.json` del zip contiene `https://skull-api.trantorai.ws/mcp`

#### Scenario: El build no modifica el repo
- **WHEN** termina `make chatgpt-build` en cualquier rama
- **THEN** `chatgpt/mcp.json` no ha cambiado y no queda ningún directorio temporal de build

### Requirement: Exclusión de archivos de sistema
Ningún paquete SHALL contener archivos `.DS_Store`.

#### Scenario: `.DS_Store` presente en el árbol
- **WHEN** existe `chatgpt/skills/.DS_Store` o `claude/skills/.DS_Store` y se ejecuta el build de esa plataforma
- **THEN** el zip generado no contiene ningún `.DS_Store`
