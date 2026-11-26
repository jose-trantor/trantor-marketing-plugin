# Tasks

## 1. Salida en `builds/` y zip de Claude

- [x] 1.1 En el `Makefile`, añadir `OUT_DIR := builds` y generar los dos zips en `builds/`. El directorio temporal de ChatGPT pasa a `builds/.chatgpt/`. Verificar con `make claude-build chatgpt-build` que los zips están en `builds/` y que no queda `builds/.chatgpt/`
- [x] 1.2 Cambiar `claude-build` para que el zip contenga solo `claude/` (`zip -qr ... claude/ -x '*.DS_Store'`). Verificar con `unzip -l` que todas las rutas empiezan por `claude/` y que no hay `.claude-plugin/marketplace.json`
- [x] 1.3 Cambiar `claude-clean` y `chatgpt-clean` para que borren sus zips en `builds/` y después borren `builds/` si queda vacía. Verificar que `make chatgpt-clean` conserva el zip de Claude y que, tras los dos `clean`, no existe `builds/`
- [x] 1.4 En `.gitignore`, cambiar `build/` por `builds/`. Verificar con un archivo en `builds/` que `git status` no lo muestra

## 2. Comprobación del endpoint de Claude

- [x] 2.1 Añadir el target `check-mcp`: en `main` espera `MCP_URL_PROD`, en `staging` espera `MCP_URL_STAGING`, y si no la encuentra termina con error mostrando la URL esperada y la encontrada. En otras ramas solo muestra la URL. Verificar con `make check-mcp` (rama actual), `make check-mcp BRANCH=main` y `make check-mcp BRANCH=staging`, comprobando el código de salida de cada uno
- [x] 2.2 Hacer que `claude-build` dependa de `check-mcp`. Verificar que `make claude-build BRANCH=staging` falla con la URL de producción y que no deja zip en `builds/`
- [x] 2.3 Añadir el target `setup` (`git config merge.ours.driver true`) y actualizar `help` con `setup` y `check-mcp`. Verificar que `make setup` funciona si se ejecuta dos veces y que después `git config --get merge.ours.driver` devuelve `true`

## 3. CI

- [x] 3.1 Crear `.github/workflows/check-mcp.yml`, que se ejecuta en `push` y `pull_request` sobre `main` y `staging` y ejecuta `make check-mcp BRANCH=${{ github.base_ref || github.ref_name }}`. Verificar que el YAML es válido (`python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" <archivo>`) y simular localmente los dos comandos que ejecutaría CI en `main` y `staging`

## 4. Documentación

- [x] 4.1 Añadir al `README.md` de la raíz una nota sobre las URLs de cada rama: qué URL corresponde a cada una, que `merge=ours` no basta, `make setup`, `make check-mcp`, el check de CI, la recomendación de hacerlo obligatorio en GitHub y que hay que revisar la URL tras cada merge entre `main` y `staging`. Actualizar también la sección de paquetes con `builds/` y la nueva estructura del zip de Claude. Verificar que los comandos documentados existen en `make help`
- [x] 4.2 Actualizar la sección Desarrollo de `claude/README.md` para que remita a la nota de la raíz y describa el zip nuevo, y la ruta del zip en `chatgpt/README.md`. Verificar que los enlaces relativos resuelven

## 5. Integración

- [x] 5.1 En la rama actual, ejecutar `make check-mcp claude-build chatgpt-build`, comprobar los dos zips con `unzip -l` y ejecutar `make claude-clean chatgpt-clean`. Verificar que `git status` solo muestra los cambios de este change
