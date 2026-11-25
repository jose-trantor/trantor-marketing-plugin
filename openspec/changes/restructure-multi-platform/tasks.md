# Tasks

## 1. Mover el plugin de Claude a `claude/`

- [x] 1.1 Mover con `git mv` `skills/`, `.mcp.json` y `.claude-plugin/plugin.json` a `claude/skills/`, `claude/.mcp.json` y `claude/.claude-plugin/plugin.json`. Verificar con `git status` que aparecen como renombrados (R) y que en la raíz ya no existen `skills/`, `.mcp.json` ni `.claude-plugin/plugin.json`
- [x] 1.2 Cambiar `source` a `"./claude"` en `.claude-plugin/marketplace.json`, que se queda en la raíz. Verificar con `python3 -m json.tool .claude-plugin/marketplace.json` y comprobando que existe `claude/.claude-plugin/plugin.json`
- [x] 1.3 Comprobar que ningún archivo de `claude/` referencia rutas fuera de `claude/`: `grep -rn '\.\./\.\.' claude/` sin resultados que salgan de la carpeta, y que todas las rutas `${CLAUDE_SKILL_DIR}/../dashboard-marketing/scripts/*.py` existen bajo `claude/skills/`
- [x] 1.4 Confirmar que `claude/.claude-plugin/plugin.json` mantiene `version: 0.4.0`, y validar el plugin con `claude plugin validate ./claude` (si el comando está disponible). Nota: falla por un error de YAML previo en `skills/resumen/SKILL.md`, ajeno a este cambio

## 2. READMEs

- [x] 2.1 Crear `claude/README.md` a partir del README actual: instalación (`/plugin marketplace add`, instalar `trantor-marketing`, nota sobre `/plugin marketplace update` para instalaciones previas), uso, áreas y pestañas, skills y datos. Verificar que contiene esas secciones
- [x] 2.2 Crear `chatgpt/README.md` con el estado "en preparación", que la lógica reside en el servidor Trantor y que la estructura se definirá con las especificaciones. Verificar que `chatgpt/` solo contiene `README.md`
- [x] 2.3 Reescribir el `README.md` de la raíz como README general: descripción, tabla de plataformas con estado y enlaces a `claude/README.md` y `chatgpt/README.md`, datos y privacidad comunes, nota de que `.claude/` y `openspec/` son tooling del repo, y licencia. Verificar que los enlaces relativos resuelven a archivos existentes

## 3. Verificación de integración

- [x] 3.1 Añadir el marketplace desde la ruta local del repo en Claude Code, instalar `trantor-marketing` y comprobar que se listan los skills (onboarding, orchestrator, meta-ads, instagram, facebook, ga4 y resumen; `dashboard-marketing` no es un skill sino assets y scripts) y que el servidor MCP `trantor` queda registrado
- [x] 3.2 Ejecutar `python3 claude/skills/dashboard-marketing/scripts/build.py <config de ejemplo> <scratch>/out --tabs meta` y verificar que genera `writes-1.json` igual que antes del movimiento

## Workflow follow-up

- Commit único con los movimientos y los READMEs, y mención en el mensaje a `/plugin marketplace update`.
- Archivar el cambio con `/opsx:archive` tras la revisión.
- Siguiente cambio: implementación de `chatgpt/` cuando lleguen las especificaciones del servidor.
