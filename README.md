# Trantor Marketing

Crea con Claude un dashboard de marketing en vivo a partir de tus cuentas de Meta Ads, Instagram, Facebook y Google Analytics 4, sin conocimientos técnicos.

## Cómo se usa

1. Instala el plugin y escribe «quiero empezar con Trantor». Claude te guía: crear la cuenta si no la tienes (https://staging.trantorai.ws/signup/), conectar Trantor desde la pestaña **Connectors** del plugin y habilitar tus fuentes en https://staging.trantorai.ws/connectors/. Después te pregunta, con opciones, qué marca analizar y qué cuentas publicitarias, campañas, página de Facebook, Instagram y web incluir, y te avisa si alguna no tiene datos recientes.
2. Pide a Claude: «hazme un dashboard de marketing».
3. Claude usa la selección del paso 1 (o te la pide si aún no la has hecho), te da los enlaces para conectar las fuentes que falten y crea el dashboard.
4. Cuando quieras, pide «actualiza las lecturas del dashboard» y Claude escribirá sus conclusiones en cada pestaña.

El dashboard tiene ocho pestañas: Resumen, Meta · Rendimiento, Meta · Awareness, Meta · Creatividades, Instagram, Facebook, Web (GA4) y Fuentes y método. Cada una compara el periodo elegido con el anterior, muestra alertas por prioridad y señala qué funciona y qué no.

## Datos

Las consultas se hacen a través del conector Trantor (`skull-api-staging.trantorai.ws`), cada vez que alguien abre el dashboard y con las cuentas que esa persona ha autorizado: métricas de anuncios, publicaciones y analítica web. El plugin no guarda datos propios. El dashboard almacena su configuración (consultas, cálculos y textos), no las cifras.
