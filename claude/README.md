# Trantor Marketing

Crea con Claude un dashboard de marketing en vivo a partir de tus cuentas de Meta Ads, Instagram, Facebook y Google Analytics 4, sin conocimientos técnicos. Puedes empezar con una sola pestaña y añadir las demás cuando quieras, dentro de la misma conversación.

## Cómo se usa

1. Instala el plugin y escribe «quiero empezar con Trantor». Claude te guía: crear la cuenta en Trantor si no la tienes, conectar el conector desde la pestaña **Connectors** y habilitar tus fuentes de datos.
2. Pide a Claude: «crea mi dashboard de marketing». El orchestrator te pregunta qué pestaña quieres instalar primero.
3. Claude te hace preguntas de opciones solo para esa área (cuentas publicitarias, campañas, página, Instagram o web según lo que elijas) y crea las pestañas correspondientes.
4. Añade más pestañas en la misma conversación cuando quieras: «añade Instagram a mi dashboard». A partir de 2 fuentes distintas, se activa también la pestaña **Resumen** con la visión global.
5. Cuando quieras, pide «actualiza las lecturas del dashboard» y Claude escribirá sus conclusiones en cada pestaña.

## Pestañas disponibles

| Skill | Pestañas instaladas |
|-------|---------------------|
| **meta-ads** | Meta · Rendimiento (impresiones, clics, coste, ROAS) · Awareness (alcance, frecuencia, CPM) · Creatividades (rendimiento por creatividad) |
| **instagram** | Instagram (publicaciones, alcance, seguidores) |
| **facebook** | Facebook (publicaciones, alcance, página) |
| **ga4** | Web · GA4 (sesiones, canales, eventos, conversiones) |
| **resumen** | Resumen (embudo global; se activa automáticamente con 2+ áreas) |

Cada pestaña compara el periodo elegido con el anterior, muestra alertas por prioridad y señala qué funciona y qué no.

## Skills de soporte

- **orchestrator** — punto de entrada; gestiona el flujo incremental y delega en los skills de área.
- **onboarding** — verifica la conexión y guía la selección de cuentas (soporta selección parcial por área).

## Desarrollo

Este repo tiene dos ramas: `main` (producción) y `staging`. En el plugin de Claude, la única diferencia entre ellas es `claude/.mcp.json`, que apunta a un servidor distinto en cada rama. Ejecuta `make setup` una vez en tu clon y `make check-mcp` después de cada merge entre ramas. Los detalles, y por qué la regla `merge=ours` no basta, están en [URL del servidor MCP en cada rama](../README.md#url-del-servidor-mcp-en-cada-rama).

Para generar el zip del plugin, ejecuta `make claude-build` desde la raíz del repo. Primero comprueba la URL de `claude/.mcp.json` y después crea `builds/trantor-marketing-claude[-staging]-<timestamp>.zip`, que contiene solo la carpeta `claude/`. Para borrar los zips de Claude: `make claude-clean`.

## Datos

El plugin no ejecuta código local ni hace llamadas de red por su cuenta. Toda la comunicación con fuentes externas ocurre a través del conector MCP `trantor`, que actúa como intermediario con las cuentas que el usuario ha autorizado en la plataforma Trantor: métricas de Meta Ads, publicaciones de Instagram y Facebook, y datos de Google Analytics 4. El conector solo accede a las cuentas que el propio usuario conecta y autoriza.

El plugin no almacena datos de marketing propios. El artifact del dashboard guarda únicamente su configuración (parámetros de consulta, cálculos y textos escritos por Claude) en un manifest dentro del store de Claude, y no transmite nada fuera de ese entorno.
