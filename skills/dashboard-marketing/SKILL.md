---
name: dashboard-marketing
description: Crea o actualiza un dashboard de marketing en vivo (Meta Ads, Instagram, Facebook y GA4) con el conector Trantor. Úsala cuando el usuario quiera un dashboard, informe o panel de su marketing, de sus anuncios de Meta, su Instagram, su página de Facebook o su web, o cuando pida actualizar las lecturas de ese dashboard.
---

# Dashboard de marketing con Trantor

Montas para el usuario un dashboard en vivo con ocho pestañas (Resumen, Meta · Rendimiento, Meta · Awareness, Meta · Creatividades, Instagram, Facebook, Web y Fuentes y método). Cada pestaña tiene cifras frente al periodo anterior, alertas priorizadas, mejores y peores elementos, patrones y una lectura escrita por ti. Los datos se consultan en cada visita con el conector Trantor de quien abre el dashboard.

El usuario no tiene por qué saber nada técnico. Habla de "tus anuncios", "tu Instagram" o "tu web", nunca de herramientas, datasets ni IDs. Pregunta con opciones siempre que puedas.

## 1. Conexión con Trantor

Antes de nada, sigue la skill **onboarding** de este plugin: comprueba que el usuario tiene cuenta, el conector habilitado y alguna fuente conectada. Este dashboard necesita Meta (cuenta publicitaria, página de Facebook e Instagram) y Google Analytics 4. Si falta una de ellas, el onboarding le ofrece conectarla o seguir sin ella.

Anota también el **nombre del conector tal como aparece en su cuenta** (normalmente "Trantor"). Lo necesitas en el paso 3: las consultas del dashboard lo usan para saber a qué conector llamar. Si no puedes verlo con certeza, pregúntaselo con opciones.

## 2. Elegir las cuentas

Usa la selección del paso 4 de la skill **onboarding**: marca, cuentas publicitarias, campañas, página de Facebook, Instagram y web. Si en esta conversación aún no se ha hecho, haz ese paso ahora, con sus preguntas de opciones; no vuelvas a preguntar lo que ya eligió.

Si le falta alguna fuente (por ejemplo, no tiene GA4), avísale de que esa pestaña aparecerá sin datos y sigue.

Si eligió solo algunas campañas, pasa sus identificadores en `meta_campaign_ids` y pon en `meta_account_names` las cuentas seguidas del número de campañas ("Mi Marca · 3 campañas elegidas").

Después completa sin preguntar:

- `ig_username`: viene en `instagram_list_accounts`.
- Zona horaria, moneda y formato de números: `meta_list_accounts` da `currency` y `timezone_name` de cada cuenta publicitaria. De la primera elegida sacas `currency_symbol` (EUR → "€", USD/COP/MXN/CLP/ARS → "$", GBP → "£") y `utc_offset_hours`, el desfase horario actual de su `timezone_name` (America/Bogota → -5, Europe/Madrid → 1). El `locale` va según el país de la moneda (EUR → "es-ES", COP → "es-CO", MXN → "es-MX", USD → "es-US"…).
- `ga4_name`: el nombre de la propiedad, o el dominio de la web si lo conoces.

## 3. Crear el dashboard

1. Antes de crear nada, genera un título para el dashboard a partir de la selección del usuario y comunícaselo: "Voy a crear el dashboard con el título «[título]». Dime si quieres cambiarlo antes de continuar." Criterios para el título: una sola marca y todas las fuentes → `"[Marca] · Marketing"`; varias cuentas de marcas distintas → `"[Marca A] + [Marca B] · Marketing"`; sin Meta pero con GA4 → `"[Marca] · Analytics"`; sin GA4 pero con Meta → `"[Marca] · Meta Ads"`. Usa el nombre limpio de la marca (sin sufijos legales). Si el usuario pide cambiarlo, usa el que indique.
2. Crea el dashboard desde el tipo de artifact de dashboards (Data / Dashboard): una sola llamada de publicación con su `type_url`, el `title` acordado y `auto_open: "after_first_write"`. Sigue las instrucciones que te devuelva el tipo para todo lo que no diga esta skill.
3. Escribe la configuración en un archivo JSON y genera los documentos con el script:
   ```bash
   python3 ${CLAUDE_SKILL_DIR}/scripts/build.py config.json salida/
   ```
   El formato de `config.json` está al principio de `scripts/build.py`. El script rellena la plantilla de `assets/template/` (página, 36 consultas, cálculos y estilos) y deja en `salida/writes-1.json` la lista de escrituras.
4. Escribe todos los documentos en el almacén del dashboard con una escritura por lotes (`batch`) usando esas entradas. Si alguno ya existía porque el tipo lo creó al nacer, léelo y añade su `version` como `if_version`.
5. Comprueba que la página carga, como explica el tipo: lee `check` y `runs`. Si una consulta falla por el nombre del conector, corrige `connector` en los datasets afectados.

Si no puedes ejecutar el script, lee los archivos de `assets/template/` y sustituye tú los marcadores (`__LV_…__`) como indica el script, antes de escribir.

## 4. Entregar

Dile al usuario en pocas líneas:

- Qué pestañas tiene y que se actualiza solo cada vez que lo abre, con sus propias cuentas.
- Que el periodo se cambia arriba (por defecto, los últimos 15 días frente a los 15 anteriores).
- Que las lecturas escritas de cada pestaña están vacías y puede pedirte "actualiza las lecturas del dashboard".
- Cualquier fuente que haya quedado sin conectar.

## Actualizar las lecturas

Cuando el usuario pida actualizar o escribir las lecturas, sigue `references/lecturas.md`.

## Reglas de interpretación

Antes de escribir una lectura o explicar una cifra, lee `references/interpretacion.md`: qué métricas no se suman entre días, cómo se clasifica cada anuncio y publicación, y qué significan las alertas.

## Si algo falla

- **Una pestaña muestra "—" o un error de conexión, o hay un error de permisos:** a esa fuente le falta conexión o permiso. Sigue el paso 3 de la skill **onboarding** para esa fuente. En Meta, casi siempre falta marcar una cuenta, página o Instagram al habilitar el conector.
- **Una consulta tarda o falla de forma puntual:** pídele que recargue. No cambies las consultas por un fallo aislado.
