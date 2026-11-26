# Design

## Context

Hoy el repo es directamente el plugin de Claude: `marketplace.json` usa `"source": "./"`, y `plugin.json`, `.mcp.json` y `skills/` están en la raíz. Conviven con tooling del repo (`.claude/` con los comandos y skills de OpenSpec, `openspec/`, `.openspec-store/`) que no forma parte del plugin. Ver proposal.md para la motivación.

Restricciones de Claude Code:
- `/plugin marketplace add <owner>/<repo>` busca `.claude-plugin/marketplace.json` en la raíz del repo.
- Un plugin instalado solo ve los archivos de su carpeta `source`, así que no puede leer `../algo` fuera de ella.

## Goals / Non-Goals

**Goals:**
- Mover el plugin de Claude a `claude/` sin cambiar su comportamiento.
- Dejar `chatgpt/` preparada para recibir la implementación.
- Conservar el historial de git de los archivos movidos.

**Non-Goals:**
- Modificar skills, scripts, templates o datasets.
- Definir el formato o el contenido técnico de la versión de ChatGPT.
- Automatizar releases o CI por plataforma.

## Decisions

**1. `git mv` en lugar de copiar y borrar.** Mantiene `git log --follow` y `git blame` en los archivos del plugin. La alternativa (copiar y borrar) es equivalente en el resultado, pero se pierde la trazabilidad.

**2. Marketplace en la raíz con `source: "./claude"`.** Es la única ubicación que encuentra `marketplace add`. La alternativa de mover `marketplace.json` a `claude/` rompería la URL de instalación. También se puede añadir en el futuro una entrada al marketplace por cada plataforma que sea de Claude (no aplica a ChatGPT).

**3. Silos, sin `shared/`.** Por la restricción de `source`, compartir exigiría un paso de copia o build. Hoy no hay código de ChatGPT que permita saber qué se duplica de verdad. Se revisará cuando llegue la implementación de ChatGPT.

**4. `chatgpt/` solo con `README.md`.** Sin manifest, sin versión y sin subcarpetas especulativas. La estructura interna se definirá con las especificaciones del servidor.

**5. Reparto de READMEs.**
- Raíz: qué es Trantor Marketing, tabla de plataformas (Claude: disponible v0.4.0; ChatGPT: en preparación) con enlaces, datos y privacidad comunes (conector Trantor, no se guardan datos), licencia y nota breve para desarrolladores (OpenSpec).
- `claude/README.md`: instalación (`/plugin marketplace add` e instalación del plugin), uso, áreas y pestañas y skills disponibles, es decir, el contenido actual del README.
- `chatgpt/README.md`: estado "en preparación", que la lógica reside en el servidor Trantor y qué irá aquí.

**6. `.mcp.json` dentro de `claude/`.** Es configuración del plugin de Claude (se carga desde la raíz del plugin), no del repo.

## Risks / Trade-offs

- [Usuarios instalados con la caché del marketplace antigua] → Indicar en `claude/README.md` y en el mensaje del commit que hay que ejecutar `/plugin marketplace update trantor-marketing`.
- [Instalaciones locales con `--plugin-dir` apuntando a la raíz] → Documentar la nueva ruta `claude/`. Afecta solo a desarrollo.
- [`.claude/` de la raíz confundido con el plugin] → El README general aclara que `.claude/` y `openspec/` son tooling del repo.
- [Duplicación futura entre plataformas] → Se acepta de forma consciente y se revisará al implementar ChatGPT.

## Migration Plan

1. Un solo commit con los `git mv`, el cambio de `source` y los READMEs.
2. Verificar en local: `claude plugin validate ./claude` (si está disponible) y añadir el marketplace desde la ruta local del repo para instalar y comprobar que los skills aparecen y que el MCP Trantor se registra.
3. Rollback: `git revert` del commit, que devuelve `source: "./"` y los archivos a la raíz.
