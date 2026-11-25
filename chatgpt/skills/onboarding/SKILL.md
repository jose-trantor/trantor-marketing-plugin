---
name: onboarding
description: Deja lista la conexión con Trantor y guía al usuario, con preguntas de opciones, para elegir qué cuentas publicitarias, campañas, páginas, Instagram y webs (GA4) quiere analizar. Úsala cuando el usuario empiece a usar Trantor, pida que le guíes para conectar sus cuentas, diga que no le funciona, que no tiene cuenta o que no ve sus datos, y siempre antes de crear un dashboard, un documento o un informe con datos de Trantor.
---

# Onboarding de Trantor

El onboarding tiene dos partes:

1. **Conexión** (pasos 1 a 3): comprueba que el usuario tiene cuenta en Trantor, el conector habilitado y alguna fuente conectada. Para en el primer paso que falle y dile exactamente qué hacer.
2. **Selección** (paso 4): el usuario elige, con preguntas de opciones, qué marca y qué cuentas, campañas, página, Instagram y web quiere analizar. **Haz siempre esta parte**, también cuando todo está ya conectado: es lo que convierte el onboarding en una guía y no en un informe de estado.

Cuando acabe, vuelve a la tarea que te pidió o pregúntale qué quiere hacer con su selección (paso 5).

## Selección parcial por área (scope)

Cuando un skill de área invoca el onboarding con un parámetro `scope`, el onboarding **solo pregunta por las cuentas de ese área** y omite el resto de preguntas del paso 4:

| scope | Pregunta solo por |
|-------|-------------------|
| `meta_ads` | Cuentas publicitarias y campañas de Meta |
| `instagram` | Cuenta de Instagram |
| `facebook` | Página de Facebook |
| `ga4` | Propiedad de Google Analytics 4 |

Los pasos 1 a 3 (conexión) se ejecutan siempre independientemente del scope.

**Reutilización en la misma conversación:** si en esta conversación ya se completó el onboarding para algún área (marca elegida, cuentas confirmadas), no vuelvas a preguntar por esos elementos. Solo haz las preguntas del scope actual que aún no se hayan respondido. Por ejemplo, si ya se eligió la cuenta publicitaria de Meta y ahora se solicita scope `instagram`, pregunta solo por la cuenta de Instagram; no repitas la pregunta de marca ni la de cuentas publicitarias.

Habla con frases cortas y sin jerga: nada de "MCP", "herramientas", "OAuth", "IDs" ni "propiedad" a secas (di "tu web (Google Analytics)"). Di "la conexión con Trantor" y "tus cuentas". Muestra siempre nombres, nunca identificadores.

## Cómo preguntar

Pregunta con la herramienta de preguntas de opciones (AskUserQuestion), no en texto. Sus límites marcan el diseño:

- Cada llamada admite de 1 a 4 preguntas, y cada pregunta de 2 a 4 opciones. El usuario siempre puede escribir otra respuesta y saltar la pregunta.
- `multiSelect: true` cuando puede elegir varias (cuentas publicitarias, campañas); `false` cuando es una sola (marca, página, Instagram, web).
- `header` de 12 caracteres como mucho: "Marca", "Anuncios", "Campañas", "Página FB", "Instagram", "Web".
- Pon primero la opción que recomiendas, con "(Recomendada)" al final de la etiqueta.
- En la descripción de cada opción da el dato que ayuda a elegir, en una línea: "€1.240 invertidos en 30 días", "Sin anuncios en 30 días", "3.200 visitas en 30 días".
- **Más de 4 opciones de un mismo tipo:** ordénalas por relevancia (actividad en los últimos 30 días y luego nombre) y repártelas en varias preguntas de la misma llamada: "Anuncios (1/3)", "Anuncios (2/3)"… Con 4 preguntas por llamada caben 16 opciones; si hay más, deja fuera las que no tienen actividad y dile que puede escribir el nombre de cualquier otra.
- Una pregunta necesita al menos 2 opciones: si de un tipo solo hay una, úsala sin preguntar y dilo en una línea.
- No añadas opciones "Ninguna" u "Otra": saltar la pregunta significa no incluir esa fuente, y escribir significa otra.
- Si la herramienta de preguntas no está disponible, haz la misma pregunta en texto con una lista numerada y pide que responda con los números.

## Paso 1. El conector está habilitado

Busca entre tus herramientas las de Trantor: `meta_list_accounts`, `instagram_list_accounts`, `page_list`, `ga4_list_properties`, `meta_insights` y `ga4_report` (en versiones anteriores del conector, `list_accounts`). Si aparecen como diferidas, cárgalas todas en una sola búsqueda.

- **Si están**, el conector está habilitado: ve al paso 3.
- **Si no están**, ve al paso 2.

Si tienes una herramienta que lista los conectores del usuario, úsala para afinar el mensaje:
- **Instalado y conectado, pero no disponible en este chat:** dile que lo active para esta conversación desde el menú de conectores del chat y que vuelva a escribir.
- **Instalado sin conectar:** ve al paso 2, apartado "con cuenta".
- **No instalado:** ve al paso 2.

Anota el **nombre del conector** tal como aparece en sus herramientas (la parte entre `mcp__` y el segundo `__`, con los guiones bajos como espacios: `Trantor_staging` → "Trantor staging"). Las tareas que crean dashboards lo necesitan.

## Paso 2. Cuenta y conexión

Pregunta con opciones: **«¿Tienes ya una cuenta en Trantor?»** (Sí / No).

- **No tiene cuenta:**
  > Para ver tus datos necesitas una cuenta de Trantor. Créala aquí: https://staging.trantorai.ws/signup/
  > Cuando la tengas, vuelve y seguimos: te diré cómo conectarla con Claude.

  Para aquí hasta que vuelva.

- **Con cuenta:**
  > Ahora conecta Trantor con Claude:
  > 1. Abre **Personalizar → Plugins → Trantor Marketing** y entra en la pestaña **Connectors**.
  > 2. Pulsa **Añadir** (o **Conectar**) en Trantor.
  > 3. Inicia sesión con tu cuenta de Trantor y acepta.
  >
  > Cuando termines, escribe "listo".

  Si no ve el plugin, puede añadir el conector a mano desde la sección de conectores de su configuración con la URL `https://skull-api-staging.trantorai.ws/mcp`. En planes Team o Enterprise puede que solo un propietario de la organización pueda añadirlo: si es su caso, que se lo pida.

  Si al iniciar sesión le dice que no tiene cuenta, dale el enlace de registro de arriba.

Cuando diga que ha terminado, vuelve al paso 1. Si las herramientas siguen sin aparecer, dile que abra una conversación nueva, porque los conectores se cargan al empezar cada conversación.

## Paso 3. Hay fuentes conectadas

Llama a la vez a `meta_list_accounts` (cuentas publicitarias), `instagram_list_accounts`, `page_list` (páginas de Facebook) y `ga4_list_properties`; si existe `google_ads_list_customers`, llámala también. Con el conector antiguo, `list_accounts` lo da todo en una llamada.

- **Si alguna devuelve cuentas**, ve al paso 4. No hagas aún un resumen largo de todo lo que tiene: el paso 4 se lo enseña en las preguntas.
- **Si todo está vacío, o da un error de permisos o de token:**
  > La conexión con Trantor funciona, pero todavía no has conectado ninguna fuente de datos. Entra en https://staging.trantorai.ws/connectors/ y habilita al menos uno de estos conectores:
  > - **Meta for Claude** (anuncios de Meta, página de Facebook e Instagram)
  > - **Google Analytics 4**
  > - **Google Search Console**
  > - **Google Ads**
  >
  > Al habilitar Meta, marca todas las cuentas, páginas e Instagram que quieras analizar. Cuando termines, escribe "listo".

  Cuando vuelva, repite esas llamadas.

## Paso 4. Elegir qué analizar

### 4.1 Medir la actividad (sin preguntar)

Antes de enseñar opciones, averigua cuáles tienen datos, para recomendar bien y no dejar elegir una cuenta vacía sin avisar:

- **Anuncios:** una sola llamada a `meta_insights` con todas las cuentas publicitarias, `level: "account"`, `fields: ["account_name", "spend"]`, `time_increment: "all_days"` y los últimos 30 días hasta ayer. Las que no salen o salen con gasto 0 no han tenido anuncios.
- **Web:** si hay 8 propiedades de GA4 o menos, una llamada a `ga4_report` por propiedad, a la vez, con `metrics: ["sessions"]`, sin dimensiones y los mismos 30 días. Si hay más, salta esta medición.
- Instagram y páginas: no hace falta medir; usa los seguidores si la lista los trae.

Si alguna de estas llamadas falla, sigue sin ese dato.

### 4.2 Marca o cliente

Agrupa las fuentes por marca comparando nombres sin mayúsculas, tildes, símbolos (®, |) ni sufijos como "S.A.S", "2" o "3": "MI MARCA" (anuncios), "Mi Marca" (página e Instagram) y "Mi Marca" (web) son la misma marca.

- **Si sale más de una marca**, pregunta **«¿Qué marca o cliente quieres analizar?»** (una respuesta). Ofrece hasta 4 marcas, primero las que tienen actividad. En la descripción, lo que tiene cada una: "Anuncios (€1.240 en 30 días) · Página · Instagram · Web". Si hay más de 4, avisa en la pregunta de que puede escribir el nombre de otra.
- **Si solo hay una**, úsala sin preguntar.

Si el usuario ya nombró la marca en su mensaje, no preguntes: úsala.

### 4.3 Cuentas de esa marca

Haz una sola llamada con una pregunta por tipo de fuente, en este orden y con un máximo de 4 preguntas:

1. **Anuncios** — «¿Qué cuentas publicitarias de Meta incluimos?» (varias). Primero las de la marca, recomendadas si tienen gasto; después otras con gasto, por si comparte cuenta con otra marca (por ejemplo, una cuenta de agencia).
2. **Página FB** — «¿Qué página de Facebook?» (una). Ordena las opciones por similitud de nombre con las cuentas publicitarias ya elegidas: normaliza (minúsculas, sin tildes, sin sufijos legales) y pon primero la más parecida. Si hay empate, ordena por seguidores.
3. **Instagram** — «¿Qué cuenta de Instagram?» (una). En la descripción, el @usuario. Ordena igual que las páginas: primero la cuenta cuyo `username` o `name` sea más similar al nombre de las cuentas publicitarias elegidas.
4. **Web** — «¿Qué web de Google Analytics?» (una). En la descripción, las visitas de 30 días. Ordena por similitud de nombre con la marca elegida.

Para cada tipo:
- Si solo hay una opción razonable en total, no la preguntes: úsala y nómbrala en el texto de antes de la llamada ("Uso la página Mi Marca, que es la única").
- Si no hay ninguna, no la preguntes y apunta la fuente como pendiente (paso 4.6).
- Si hay más de 4 opciones de un tipo, reparte ese tipo en varias preguntas como dice "Cómo preguntar". Si así no caben los cuatro tipos en una llamada, haz una segunda llamada con los que falten.

### 4.4 Campañas

Si eligió alguna cuenta publicitaria con gasto, pregunta **«¿Analizamos todas las campañas o solo algunas?»** (una respuesta): "Todas las campañas (Recomendada)" — "Cada vez que abras el dashboard entrarán también las nuevas" / "Elegir campañas" — "Solo las que marques ahora".

Si quiere elegir:
1. Llama a `meta_insights` con las cuentas elegidas, `level: "campaign"`, `fields: ["account_name", "campaign_id", "campaign_name", "objective", "spend"]`, `time_increment: "all_days"` y los últimos 30 días.
2. Ordénalas por inversión y enséñalas con `multiSelect: true`, en preguntas "Campañas (1/n)" de hasta 4 opciones, hasta 4 preguntas por llamada. Descripción: "€540 en 30 días · Mensajes". Si hay más de 16, enseña las 16 con más gasto y dile que puede escribir el nombre de cualquier otra.
3. Guarda los `campaign_id` elegidos. Si no marca ninguna, usa todas.

Las campañas sin gasto en 30 días no aparecen: avísale en una línea si su nombre podría estar entre ellas.

### 4.5 Comprobar y avisar

Antes de cerrar, avisa en una línea de cada elección que va a salir vacía y ofrece cambiarla, con una pregunta de opciones ("Cambiar la cuenta" / "Seguir así"):
- Cuenta publicitaria sin gasto en 30 días: "Trantor MKT no ha tenido anuncios en los últimos 30 días: las pestañas de Meta saldrán vacías".
- Web con menos de 50 visitas en 30 días.

### 4.6 Resumen de la selección

Cierra con un resumen corto en texto, con nombres:

> **Tu selección: Mi Marca**
> - Anuncios: MI MARCA (todas las campañas)
> - Página de Facebook: Mi Marca
> - Instagram: @mimarca
> - Web: mimarca.com
> - Sin conectar: Google Ads, Search Console

Mantén esta selección durante la conversación (con nombres e identificadores, la moneda y la zona horaria de la primera cuenta publicitaria, y el nombre del conector) para que las demás tareas del plugin la usen sin volver a preguntar. Si el usuario quiere cambiarla más tarde, repite solo la pregunta de lo que cambia.

Para una fuente que no tiene, dale el camino en una línea: habilitarla en https://staging.trantorai.ws/connectors/ y escribir "listo", o seguir sin ella sabiendo qué parte quedará vacía.

## Paso 5. Siguiente paso

- Si el onboarding empezó porque pidió otra tarea (por ejemplo, un dashboard), sigue con ella usando la selección.
- Si no, pregunta **«¿Qué hacemos con esta selección?»**: "Crear un dashboard en vivo (Recomendada)" / "Ver un resumen rápido del último mes" / "Nada por ahora".

## Errores más adelante

Si en cualquier momento una herramienta de Trantor responde con un error de permisos, de token o de cuenta no conectada, vuelve al paso 3 para esa fuente. No reintentes la misma llamada.
