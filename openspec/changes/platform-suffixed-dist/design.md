# Design

## Context

Hoy el `Makefile` calcula una variable `DIST` común a las dos plataformas y la usa con `zip -r`. Este comando añade archivos a un zip existente en lugar de reemplazarlo. Claude se instala desde git a través del marketplace (`source: "./claude"`), así que su `claude/.mcp.json` tiene que ser correcto en cada rama. ChatGPT, en cambio, solo se distribuye como zip, y eso permite resolver su configuración al construir el paquete. Ver `proposal.md` (Why).

## Goals / Non-Goals

**Goals:**

- Que un único sitio del `Makefile` defina el nombre de los paquetes.
- Que el build de ChatGPT no deje rastro en el árbol de trabajo.

**Non-Goals:**

- Cambiar cómo se resuelve el endpoint de Claude (`claude/.mcp.json` y la regla `merge=ours`).
- Añadir un target que construya las dos plataformas a la vez o un sistema de versiones en el nombre.

## Decisions

**1. El nombre se define con una función de Make.**
`dist = trantor-marketing-$(1)$(STAGE)-$(TIMESTAMP).zip`, donde `STAGE` vale `-staging` en la rama `staging` y está vacía en las demás. Los targets usan `$(call dist,claude)` y `$(call dist,chatgpt)`.
Alternativa descartada: dos variables `DIST_CLAUDE` y `DIST_CHATGPT`. Repiten la lógica del `ifeq` y pueden divergir.

**2. La plataforma va antes del entorno (`claude-staging`).**
Así los zips de cada plataforma quedan juntos al ordenar, y cada `clean` usa un único patrón, `trantor-marketing-<plataforma>-*.zip`. El patrón del `.gitignore` (`trantor-marketing-*.zip`) sigue sirviendo.

**3. Se borra el zip antes de crearlo.**
`rm -f` del archivo de destino antes de `zip`. Es más sencillo y portable que `zip -FS` (filesync), que además depende de la versión de `zip`.

**4. ChatGPT se prepara en `build/chatgpt/`.**
Secuencia: borrar `build/chatgpt/`, copiar `chatgpt/` con `cp -R`, reescribir la URL de `mcp.json`, ejecutar `cd build/chatgpt && zip -r <ruta absoluta del zip> . -x '*.DS_Store'` y borrar `build/`.
Alternativa descartada: hacer `cd chatgpt && zip` directamente. Deja el contenido en la raíz, pero no permite cambiar `mcp.json` sin tocar el repo.
La ruta del zip se pasa como absoluta (`$(CURDIR)/...`) para que, después del `cd`, el archivo quede en la raíz del repo.

**5. La URL se sustituye con `sed` sobre la URL de producción.**
`chatgpt/mcp.json` guarda la URL de producción. En la rama `staging`, el build sustituye `https://skull-api.trantorai.ws/mcp` por `https://skull-api-staging.trantorai.ws/mcp` en la copia. Las dos URLs se definen como variables del `Makefile` (`MCP_URL_PROD` y `MCP_URL_STAGING`). Para que funcione igual en macOS y en Linux, el resultado se escribe en un archivo nuevo en lugar de usar `sed -i`, cuya sintaxis difiere entre BSD y GNU.
Después de sustituir, el build comprueba con `grep -q` que la URL esperada aparece en el `mcp.json` de la copia. Si no aparece, el build falla. Esto evita generar un paquete de staging que apunte a producción si alguien cambia el formato del archivo.
Alternativa descartada: una plantilla `mcp.json.tmpl` con un marcador. El archivo del repo dejaría de ser un `mcp.json` válido, y no se podría probar la carpeta tal cual.

**6. Exclusión de `.DS_Store` con `-x '*.DS_Store'` en los dos `zip`.**

## Risks / Trade-offs

- [Alguien cambia la URL de producción en `chatgpt/mcp.json` y no actualiza `MCP_URL_PROD`] → La comprobación con `grep` hace fallar el build de staging, con un mensaje que indica la URL esperada.
- [El nombre nuevo rompe scripts o instrucciones que esperan `trantor-marketing-<ts>.zip`] → No se ha encontrado ninguna referencia en el repo. Se avisa en el commit y en el PR.
- [Un build interrumpido deja `build/` en el árbol] → `build/` va en `.gitignore`, y cada build empieza borrándolo.

## Migration Plan

1. Fusionar a `staging` y construir los dos paquetes. Comprobar los nombres, la estructura y la URL con `unzip -l` y `unzip -p <zip> mcp.json`.
2. Fusionar a `main`. `chatgpt/mcp.json` ya tiene la URL de producción, así que no depende de reglas de merge.
3. Para revertir, basta con revertir el commit. No hay estado persistente.
