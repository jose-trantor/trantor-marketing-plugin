# platform-packaging Specification

## Purpose

Define cómo el repo aloja y distribuye Trantor Marketing en varias plataformas (Claude, ChatGPT), cada una autocontenida y documentada por separado.

## Requirements

### Requirement: Una carpeta autocontenida por plataforma
El repo SHALL alojar cada plataforma en su propia carpeta de primer nivel (`claude/`, `chatgpt/`). Todo lo que la plataforma necesita para funcionar o publicarse SHALL estar dentro de su carpeta, sin referencias a archivos fuera de ella.

#### Scenario: Plugin de Claude autocontenido
- **WHEN** se inspecciona `claude/`
- **THEN** contiene `.claude-plugin/plugin.json`, `.mcp.json` y `skills/`, y ningún archivo de `claude/` referencia rutas fuera de `claude/`

#### Scenario: No quedan archivos de plugin en la raíz
- **WHEN** se lista la raíz del repo
- **THEN** no existen `skills/`, `.mcp.json` ni `.claude-plugin/plugin.json` en la raíz

### Requirement: Instalación de Claude por marketplace sin cambios
El repo SHALL mantener `.claude-plugin/marketplace.json` en la raíz con el plugin `trantor-marketing` apuntando a `./claude`, para que el comando de instalación existente siga funcionando.

#### Scenario: Añadir el marketplace e instalar
- **WHEN** un usuario ejecuta `/plugin marketplace add <owner>/trantor-marketing-plugin` y luego instala `trantor-marketing`
- **THEN** se instala el plugin desde `claude/` con sus skills y el servidor MCP Trantor disponibles

#### Scenario: Skills que usan scripts compartidos
- **WHEN** un skill de área ejecuta `${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/...` tras la instalación
- **THEN** el script se encuentra y se ejecuta igual que antes de la reorganización

### Requirement: README general y README por plataforma
El repo SHALL tener un `README.md` en la raíz que describa el proyecto, liste las plataformas con su estado y enlace al README de cada una. Cada carpeta de plataforma SHALL tener su propio `README.md`.

#### Scenario: Navegar desde el README general
- **WHEN** un lector abre el `README.md` de la raíz
- **THEN** encuentra un enlace a `claude/README.md` y otro a `chatgpt/README.md`, cada uno con el estado de la plataforma

#### Scenario: Plataforma en preparación
- **WHEN** un lector abre `chatgpt/README.md` antes de que exista implementación
- **THEN** el README indica que la plataforma está en preparación y que la lógica reside en el servidor Trantor

### Requirement: Versionado independiente por plataforma
Cada plataforma SHALL declarar su versión dentro de su propia carpeta, y cambiar la versión de una plataforma MUST NOT requerir cambiar la de otra.

#### Scenario: Versión de Claude tras la reorganización
- **WHEN** se lee `claude/.claude-plugin/plugin.json`
- **THEN** su `version` es `0.4.0`, la misma que antes del cambio

#### Scenario: No hay versión global
- **WHEN** se inspecciona la raíz del repo
- **THEN** no existe ningún archivo que fije una versión común a todas las plataformas

### Requirement: Nombre del paquete por plataforma
Cada paquete SHALL generarse en la carpeta `builds/` con el nombre `trantor-marketing-<plataforma>[-staging]-<timestamp>.zip`. `<plataforma>` es `claude` o `chatgpt`. `-staging` aparece solo si se construye desde la rama `staging`. `<timestamp>` es la fecha del último commit en formato `YYYYMMDDTHHMMSS`.

#### Scenario: Build de Claude fuera de staging
- **WHEN** se ejecuta `make claude-build` en la rama `main` y el último commit es del 2026-11-25 16:26:00
- **THEN** se genera `builds/trantor-marketing-claude-20261125T162600.zip`

#### Scenario: Build de ChatGPT en staging
- **WHEN** se ejecuta `make chatgpt-build` en la rama `staging` y el último commit es del 2026-11-25 16:26:00
- **THEN** se genera `builds/trantor-marketing-chatgpt-staging-20261125T162600.zip`

#### Scenario: Builds de las dos plataformas en el mismo commit
- **WHEN** se ejecutan `make claude-build` y `make chatgpt-build` sobre el mismo commit
- **THEN** se generan dos zips distintos, y cada uno contiene solo los archivos de su plataforma

### Requirement: Paquete regenerado desde cero
Cada build SHALL crear el zip desde cero. Si ya existe un zip con el mismo nombre, no debe conservar nada de su contenido anterior.

#### Scenario: Archivo eliminado entre dos builds del mismo commit
- **WHEN** existe `trantor-marketing-chatgpt-<ts>.zip`, se borra un archivo de `chatgpt/skills/` sin hacer commit y se vuelve a ejecutar `make chatgpt-build`
- **THEN** el nuevo zip no contiene el archivo borrado

### Requirement: Limpieza por plataforma
`make claude-clean` SHALL borrar solo los paquetes de Claude, y `make chatgpt-clean` SHALL borrar solo los de ChatGPT. Si `builds/` queda vacía, SHALL borrarse.

#### Scenario: Limpiar ChatGPT conserva Claude
- **WHEN** existen `builds/trantor-marketing-claude-<ts>.zip` y `builds/trantor-marketing-chatgpt-<ts>.zip`, y se ejecuta `make chatgpt-clean`
- **THEN** se borra el zip de ChatGPT y el de Claude sigue existiendo

#### Scenario: Limpiar las dos plataformas
- **WHEN** se ejecutan `make claude-clean` y `make chatgpt-clean`
- **THEN** no existe la carpeta `builds/`

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

### Requirement: Paquete de Claude con solo la carpeta del plugin
El paquete de Claude SHALL contener solo la carpeta `claude/` como único directorio de primer nivel, con el mismo contenido que tiene en el repo. No SHALL incluir `.claude-plugin/marketplace.json` ni el `README.md` de la raíz.

#### Scenario: Solo la carpeta del plugin
- **WHEN** se lista el contenido del zip de Claude
- **THEN** todas las rutas empiezan por `claude/`, contiene `claude/.claude-plugin/plugin.json` y `claude/.mcp.json`, y no contiene `.claude-plugin/marketplace.json`

### Requirement: Endpoint MCP de Claude según la rama
En la rama `main`, `claude/.mcp.json` SHALL apuntar a `https://skull-api.trantorai.ws/mcp`, y en la rama `staging` a `https://skull-api-staging.trantorai.ws/mcp`. `make check-mcp` SHALL comprobarlo y terminar con error si no se cumple. En otras ramas SHALL mostrar la URL configurada y terminar sin error.

#### Scenario: URL correcta en main
- **WHEN** se ejecuta `make check-mcp` en `main` y `claude/.mcp.json` contiene la URL de producción
- **THEN** el comando termina sin error

#### Scenario: URL de staging en main
- **WHEN** se ejecuta `make check-mcp` en `main` y `claude/.mcp.json` contiene la URL de staging
- **THEN** el comando termina con error e indica la URL esperada y la encontrada

#### Scenario: Rama de feature
- **WHEN** se ejecuta `make check-mcp` en una rama distinta de `main` y `staging`
- **THEN** el comando muestra la URL configurada y termina sin error

### Requirement: El build de Claude exige el endpoint correcto
`make claude-build` SHALL hacer la misma comprobación que `make check-mcp` antes de generar el zip, y no SHALL generarlo si falla.

#### Scenario: Build en staging con la URL de producción
- **WHEN** se ejecuta `make claude-build` en `staging` y `claude/.mcp.json` contiene la URL de producción
- **THEN** el comando termina con error y no existe el zip en `builds/`

### Requirement: Comprobación del endpoint en CI
El repo SHALL comprobar el endpoint de Claude en cada push a `main` y `staging`, y en cada pull request contra esas ramas. En un pull request, la comprobación SHALL usar la rama de destino.

#### Scenario: PR de staging a main
- **WHEN** se abre un pull request de `staging` a `main` y, tras el merge, `claude/.mcp.json` tendría la URL de staging
- **THEN** la comprobación de CI falla

#### Scenario: Push correcto a staging
- **WHEN** se hace push a `staging` y `claude/.mcp.json` contiene la URL de staging
- **THEN** la comprobación de CI pasa

### Requirement: Configuración del driver de merge
`make setup` SHALL configurar en el clon local el driver `merge.ours` que usa `.gitattributes`. Ejecutarlo varias veces SHALL dar el mismo resultado.

#### Scenario: Clon nuevo
- **WHEN** se ejecuta `make setup` en un clon donde no está configurado
- **THEN** `git config --get merge.ours.driver` devuelve `true`
