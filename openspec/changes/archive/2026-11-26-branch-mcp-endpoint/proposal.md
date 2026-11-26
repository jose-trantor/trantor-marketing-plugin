# Proposal

## Why

Claude se instala desde git, así que `claude/.mcp.json` tiene que apuntar a producción en `main` y a staging en `staging`. Para mantenerlo, el repo solo tenía la regla `merge=ours` de `.gitattributes`, que falla de dos formas. No funciona si cada persona no ha configurado antes el driver en su máquina, y git no avisa cuando falta. Y aunque esté configurado, no actúa cuando solo una de las dos ramas cambió el archivo.

El 25-11-2026 la URL de staging llegó así a `main` (commit `1d36617`, merge `8b70afd`), y los usuarios de producción quedaron conectados a staging hasta que se corrigió en `b7ac19a`. En ese mismo merge se perdieron dos cambios de jose en el `Makefile`: los zips se generaban en `builds/` y el zip de Claude incluía solo `claude/`.

## What Changes

- Nuevo `make setup`, que configura el driver `merge.ours` en el clon. Se ejecuta una vez.
- Nuevo `make check-mcp`, que comprueba que `claude/.mcp.json` apunta al servidor que corresponde a la rama: producción en `main` y staging en `staging`. En otras ramas solo muestra la URL y no falla.
- `make claude-build` ejecuta esa misma comprobación y no genera el zip si la URL no corresponde a la rama.
- Nuevo workflow de GitHub Actions que ejecuta la comprobación en cada push a `main` y `staging` y en cada PR contra esas ramas. En los PR la comprueba contra la rama de destino.
- Los zips se generan en `builds/`. **BREAKING**: antes se generaban en la raíz del repo.
- El zip de Claude contiene solo la carpeta `claude/`, sin `.claude-plugin/marketplace.json` ni `README.md`, como en la versión de jose. **BREAKING** respecto al requisito actual.
- Se añade una nota al `README.md` de la raíz sobre cómo se gestiona la URL de cada rama, qué hay que hacer tras un merge y qué se comprueba automáticamente.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `platform-packaging`: los zips se generan en `builds/`; cambia la estructura del zip de Claude; se añaden la comprobación del endpoint de Claude según la rama, el fallo del build de Claude si no coincide y la comprobación en CI.

## Impact

- `Makefile`: targets nuevos `setup` y `check-mcp`; cambian `claude-build`, `claude-clean`, `chatgpt-build`, `chatgpt-clean` y `help`.
- `.github/workflows/check-mcp.yml`: archivo nuevo.
- `.gitignore`: `builds/` sustituye a `build/`.
- `README.md`, `claude/README.md` y `chatgpt/README.md`: nota sobre las URLs de cada rama, nueva carpeta de salida y nueva estructura del zip de Claude.
- Quien use el zip de Claude que incluía el marketplace tendrá que adaptarse a la nueva estructura.
