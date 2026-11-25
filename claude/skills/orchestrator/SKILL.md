---
name: orchestrator
description: Punto de entrada del dashboard de marketing incremental. Lee el estado del dashboard (si existe), muestra qué áreas están instaladas y guía al usuario para añadir la siguiente. Úsala cuando el usuario pida un dashboard de marketing, quiera añadir una nueva área o pregunte por el estado de su dashboard.
---

# Skill: Orchestrator

Guía al usuario para construir su dashboard de marketing de forma incremental, delegando en los skills de área y manteniendo el manifest actualizado.

## Flujo principal

### A. Dashboard nuevo (no existe manifest)

1. Informa al usuario de lo que puede construir:

   > "Puedo crear un dashboard de marketing con estas áreas: **Meta Ads** (anuncios, awareness, creatividades), **Instagram**, **Facebook** y **Web (GA4)**. Puedes empezar con cualquiera y añadir las demás después."

2. Pregunta qué área quiere instalar primero con `AskUserQuestion`:
   - Opciones: "Meta Ads (Recomendada)" / "Instagram" / "Facebook" / "Web (GA4)"
   - Solo una respuesta.

3. Delega en el skill correspondiente:
   - Meta Ads → skill **meta-ads**
   - Instagram → skill **instagram**
   - Facebook → skill **facebook**
   - GA4 → skill **ga4**

4. Una vez instalada la primera área, comprueba si `installed_tabs` tiene 2+ áreas distintas (ver sección «Resumen automático»). Si no, pregunta si quiere añadir otra área ahora o dejarlo para más adelante.

### B. Dashboard existente (hay manifest)

1. Lee `files/manifest.json` del store al inicio de la sesión.

2. Muestra el estado actual en texto corto:

   > **Dashboard: [título]**
   > Áreas instaladas: Meta Ads ✓ · Instagram ✓ · Facebook — · Web (GA4) —
   > Resumen: activo (2 áreas)

3. Pregunta qué área quiere añadir con `AskUserQuestion`. Ofrece solo las áreas **no instaladas** todavía:
   - Opciones dinámicas según lo que falta (máximo 4 opciones, una respuesta).

4. Delega en el skill del área elegida.

5. Tras completar el skill de área, comprueba si corresponde invocar el skill **resumen** (ver abajo).

## Resumen automático

Después de instalar cualquier área, si `installed_tabs` (excluyendo `"resumen"`) tiene **2 o más áreas**, invoca automáticamente el skill **resumen** para actualizar la pestaña Resumen. No preguntes al usuario; hazlo en silencio y luego informa el resultado conjunto.

Ejemplo: el usuario acaba de instalar Instagram y ya tenía Meta Ads → `installed_tabs = ["meta", "awareness", "creatividades", "instagram"]` → 2 áreas distintas → invocar **resumen** automáticamente.

## Después de cada área

Una vez terminado el skill de área (y el resumen si corresponde), informa al usuario:

- Las áreas instaladas hasta ahora.
- Las áreas que quedan por instalar (si las hay).
- Pregunta con opciones: "Añadir otra área" / "Dejar el dashboard así" / "Actualizar las lecturas".

Si responde «Añadir otra área», vuelve al paso B.3.
Si responde «Actualizar las lecturas», sigue `references/lecturas.md` del skill `dashboard-marketing`.

## Reglas generales

- **Una conversación, un dashboard.** El orchestrator gestiona un solo dashboard por conversación. Si el usuario quiere otro, abre una conversación nueva.
- **Las áreas no se eliminan.** Una vez instalada, una pestaña permanece aunque el usuario no quiera más esa fuente.
- **Sin onboarding duplicado.** Si el onboarding ya se completó para un área en esta conversación, los skills de área lo reutilizan sin preguntar de nuevo.
- **Sin sobreescritura.** Al instalar una nueva área, solo se tocan los datasets y el manifest de esa área; los documentos de otras áreas no se modifican.
