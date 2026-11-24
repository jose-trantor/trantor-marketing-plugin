# Trantor Marketing

Crea con Claude un dashboard de marketing en vivo a partir de tus cuentas de Meta Ads, Instagram, Facebook y Google Analytics 4, sin conocimientos técnicos. Puedes empezar con una sola fuente y añadir las demás cuando quieras, dentro de la misma conversación.

## Cómo se usa

1. Instala el plugin y escribe «quiero empezar con Trantor». Claude te guía: crear la cuenta si no la tienes (https://staging.trantorai.ws/signup/), conectar Trantor desde la pestaña **Connectors** del plugin y habilitar tus fuentes en https://staging.trantorai.ws/connectors/.
2. Pide a Claude: «crea mi dashboard de marketing». El orchestrator te pregunta qué área quieres instalar primero.
3. Claude te hace preguntas de opciones solo para esa área (cuentas publicitarias, campañas, página, Instagram o web según lo que elijas) y crea las pestañas correspondientes.
4. Añade más áreas en la misma conversación cuando quieras: «añade Instagram a mi dashboard». A partir de 2 áreas, se activa también la pestaña **Resumen** con la visión global.
5. Cuando quieras, pide «actualiza las lecturas del dashboard» y Claude escribirá sus conclusiones en cada pestaña.

## Áreas y pestañas

| Área | Pestañas |
|------|----------|
| Meta Ads | Meta · Rendimiento · Meta · Awareness · Meta · Creatividades |
| Instagram | Instagram |
| Facebook | Facebook |
| Web (GA4) | Web (GA4) |
| Resumen (automático con 2+ áreas) | Resumen |

Cada pestaña compara el periodo elegido con el anterior, muestra alertas por prioridad y señala qué funciona y qué no.

## Skills disponibles

- **orchestrator** — punto de entrada; gestiona el flujo incremental y delega en los skills de área.
- **meta-ads** — instala las 3 pestañas de Meta Ads.
- **instagram** — instala la pestaña de Instagram.
- **facebook** — instala la pestaña de Facebook.
- **ga4** — instala la pestaña Web (GA4).
- **resumen** — activa/actualiza la pestaña Resumen (invocado automáticamente).
- **onboarding** — verifica la conexión y guía la selección de cuentas (soporta selección parcial por área).

## Datos

Las consultas se hacen a través del conector Trantor (`skull-api-staging.trantorai.ws`), cada vez que alguien abre el dashboard y con las cuentas que esa persona ha autorizado: métricas de anuncios, publicaciones y analítica web. El plugin no guarda datos propios. El dashboard almacena su configuración (consultas, cálculos y textos) en un manifest que controla qué pestañas están visibles.
