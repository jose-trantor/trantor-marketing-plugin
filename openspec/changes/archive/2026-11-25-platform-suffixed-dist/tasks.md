# Tasks

## 1. Nombre y limpieza por plataforma

- [x] 1.1 En el `Makefile`, reemplazar `DIST` por la variable `STAGE` (`-staging` en la rama `staging`, vacía en las demás) y la función `dist = trantor-marketing-$(1)$(STAGE)-$(TIMESTAMP).zip`. Verificar con `make -n claude-build` y `make -n chatgpt-build` que los nombres son `trantor-marketing-claude-<ts>.zip` y `trantor-marketing-chatgpt-<ts>.zip`
- [x] 1.2 Cambiar `claude-build` para que haga `rm -f` del zip antes de `zip`, use `$(call dist,claude)` y añada `-x '*.DS_Store'`. Verificar con `make claude-build && unzip -l trantor-marketing-claude-*.zip` que contiene `.claude-plugin/marketplace.json` y `claude/.claude-plugin/plugin.json`, y que no contiene `.DS_Store` (crear antes `claude/skills/.DS_Store` temporal y borrarlo al terminar)
- [x] 1.3 Cambiar `claude-clean` para que borre solo `trantor-marketing-claude-*.zip` y `chatgpt-clean` para que borre solo `trantor-marketing-chatgpt-*.zip`. Verificar creando los dos zips, ejecutando `make chatgpt-clean` y comprobando que el de Claude sigue existiendo
- [x] 1.4 Actualizar el texto de `help` si menciona nombres o comportamientos que han cambiado. Verificar con `make help`

## 2. Paquete de ChatGPT con contenido en la raíz y endpoint por rama

- [x] 2.1 Cambiar `chatgpt/mcp.json` para que use `https://skull-api.trantorai.ws/mcp`. Verificar con `python3 -m json.tool chatgpt/mcp.json` que sigue siendo JSON válido
- [x] 2.2 Añadir `build/` a `.gitignore`. Verificar que, con `mkdir build`, `git status` no lo muestra
- [x] 2.3 Añadir al `Makefile` las variables `MCP_URL_PROD` y `MCP_URL_STAGING`, y `MCP_URL`, que vale la de staging en la rama `staging` y la de producción en las demás. Verificar con `make -n chatgpt-build` que se usa la URL correcta para la rama actual
- [x] 2.4 Reescribir `chatgpt-build` según el design (decisiones 4 y 5): borrar `build/chatgpt/`, copiar `chatgpt/`, escribir `mcp.json` con `sed` en un archivo nuevo, comprobar con `grep -q` que contiene `$(MCP_URL)` y fallar si no, borrar el zip de destino, ejecutar `cd build/chatgpt && zip -r $(CURDIR)/<zip> . -x '*.DS_Store'` y borrar `build/`. Verificar con `make chatgpt-build && unzip -l trantor-marketing-chatgpt-*.zip` que `plugin.json`, `mcp.json` y `skills/` están en la raíz y ninguna ruta empieza por `chatgpt/`
- [x] 2.5 Verificar el endpoint y que el árbol queda limpio: en la rama actual, `unzip -p trantor-marketing-chatgpt-*.zip mcp.json` muestra la URL de producción. Con `make chatgpt-build BRANCH=staging`, el nombre lleva `-staging` y `mcp.json` muestra la URL de staging. Después de los dos builds, `git status` no muestra cambios en `chatgpt/` y no existe `build/`
- [x] 2.6 Verificar que el build falla si la URL no coincide: cambiar temporalmente `MCP_URL_PROD` en `make chatgpt-build BRANCH=staging MCP_URL_PROD=https://otra/mcp`, comprobar que termina con error y que no se ha generado el zip, y deshacer el cambio

## 3. Integración

- [x] 3.1 En el mismo commit, ejecutar `make claude-build chatgpt-build` y verificar que salen dos zips distintos, y que cada uno contiene solo los archivos de su plataforma (`unzip -l`)
- [x] 3.2 Ejecutar `make claude-clean chatgpt-clean` y verificar que no queda ningún `trantor-marketing-*.zip` ni ningún directorio `build/`

## Workflow follow-up

- Abrir un cambio aparte para la regla `merge=ours` de `claude/.mcp.json`, que no funciona sin un driver configurado en cada clon.
- Archivar el cambio cuando esté fusionado en `staging` y se hayan comprobado los paquetes.
