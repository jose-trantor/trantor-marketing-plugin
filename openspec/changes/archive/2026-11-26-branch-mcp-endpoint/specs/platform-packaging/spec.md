# Spec Delta

## MODIFIED Requirements

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

### Requirement: Limpieza por plataforma
`make claude-clean` SHALL borrar solo los paquetes de Claude, y `make chatgpt-clean` SHALL borrar solo los de ChatGPT. Si `builds/` queda vacía, SHALL borrarse.

#### Scenario: Limpiar ChatGPT conserva Claude
- **WHEN** existen `builds/trantor-marketing-claude-<ts>.zip` y `builds/trantor-marketing-chatgpt-<ts>.zip`, y se ejecuta `make chatgpt-clean`
- **THEN** se borra el zip de ChatGPT y el de Claude sigue existiendo

#### Scenario: Limpiar las dos plataformas
- **WHEN** se ejecutan `make claude-clean` y `make chatgpt-clean`
- **THEN** no existe la carpeta `builds/`

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Estructura del paquete de Claude
**Reason**: El zip de Claude incluye solo la carpeta del plugin, sin el marketplace ni el README de la raíz (versión de jose, `1f1a4dd`).
**Migration**: Ver el requisito "Paquete de Claude con solo la carpeta del plugin". La instalación por marketplace desde git no cambia.
