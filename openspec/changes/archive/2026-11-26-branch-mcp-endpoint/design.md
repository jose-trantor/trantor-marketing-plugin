# Design

## Context

Claude se instala desde git, a través del marketplace, así que `claude/.mcp.json` tiene que tener la URL correcta en cada rama. No puede resolverse al construir el zip, como en ChatGPT. Ver `proposal.md` (Why) y los requisitos en `specs/platform-packaging/spec.md`.

## Goals / Non-Goals

**Goals:**

- Detectar una URL incorrecta antes de que llegue a `main` o a `staging`, y en el peor caso nada más llegar.
- Una sola definición de las URLs y de la regla rama → URL, compartida por el `Makefile` y CI.

**Non-Goals:**

- Corregir la URL automáticamente. Ni CI ni el `Makefile` modifican `claude/.mcp.json`.
- Cambiar cómo se instala Claude (marketplace o `source`).
- Hacer obligatorios los checks de CI con protección de ramas en GitHub. Eso se configura en GitHub y queda como recomendación en el README.

## Decisions

**1. `check-mcp` en el `Makefile`, reutilizado por CI.**
CI ejecuta `make check-mcp BRANCH=<rama>`. Así la regla y las URLs viven solo en el `Makefile`, con las variables `MCP_URL_PROD` y `MCP_URL_STAGING` que ya existen.
Alternativa descartada: un script de shell aparte. Sería otro sitio donde mantener las URLs.

**2. La comprobación es estricta solo en `main` y `staging`.**
Las ramas de feature salen tanto de `main` como de `staging`, así que no hay una URL esperada. En ellas `check-mcp` solo informa. Esto también afecta a `claude-build`: en una rama de feature genera el zip con la URL que tenga el archivo.

**3. La URL se extrae con `grep -o` de las dos URLs conocidas.**
`check-mcp` busca cuál de las dos URLs (`MCP_URL_PROD` o `MCP_URL_STAGING`) aparece en `claude/.mcp.json` y la compara con la esperada. Si no aparece ninguna, también falla. No se usa `jq` porque no está en todas las máquinas.

**4. En CI, la rama esperada es `github.base_ref || github.ref_name`.**
En un `pull_request`, GitHub hace checkout del commit de merge, así que se comprueba el resultado real del merge contra la rama de destino. En un `push`, se usa la rama que recibe el push. El workflow se dispara con `push` y `pull_request` sobre `main` y `staging`, en `ubuntu-latest`, y solo necesita `make` y `grep`.

**5. Se mantiene `merge=ours` y se añade `make setup`.**
La regla sigue sirviendo cuando las dos ramas cambiaron el archivo. `make setup` ejecuta `git config merge.ours.driver true`, que puede repetirse sin efectos. La red de seguridad real es `check-mcp` en CI.

**6. Salida en `builds/` y zip de Claude como en la versión de jose.**
- `claude-build`: `mkdir -p builds`, `rm -f` del zip, `zip -qr builds/<zip> claude/ -x '*.DS_Store'`.
- `chatgpt-build`: el directorio temporal pasa a `builds/.chatgpt/` y el zip se escribe en `$(CURDIR)/builds/<zip>`.
- Cada `clean` borra sus zips de `builds/` y después ejecuta `rmdir builds 2>/dev/null || true`, que solo la borra si está vacía.
- En `.gitignore`, `builds/` sustituye a `build/`. `trantor-marketing-*.zip` se mantiene para los zips antiguos que haya en la raíz.

## Risks / Trade-offs

- [Los checks de CI no bloquean el merge si no se configura la protección de ramas] → El README recomienda marcarlos como obligatorios en GitHub.
- [En ramas de feature, `claude-build` no comprueba la URL] → `check-mcp` y `help` muestran la URL configurada. Los zips que se distribuyen se construyen desde `main` o `staging`.
- [Alguien cambia una URL en `claude/.mcp.json` y no en el `Makefile`] → `check-mcp` falla porque no reconoce la URL, que es lo que debe pasar.

## Migration Plan

1. Fusionar a `staging`. Comprobar que el workflow pasa y que `staging` sigue teniendo la URL de staging.
2. Abrir un PR de `staging` a `main`. Como la URL de `main` se corrigió en `b7ac19a` y la de `staging` no ha cambiado, el merge debería conservar la de producción. Si el check falla, corregir la URL antes de fusionar.
3. Cada persona ejecuta `make setup` una vez en su clon.
