---
name: orchestrator
description: Punto de entrada del dashboard de marketing incremental. Lee el estado del dashboard (si existe), muestra qué áreas están instaladas y guía al usuario para añadir la siguiente. Úsala cuando el usuario pida un dashboard de marketing, quiera añadir una nueva área o pregunte por el estado de su dashboard.
---

# Skill: Orchestrator

Guía al usuario para construir su dashboard de marketing de forma incremental, delegando en los skills de área y manteniendo el manifest actualizado.

## Flujo principal

### A. Dashboard nuevo (no existe manifest)

1. Informa al usuario de lo que puede construir:

   > "Puedo crear un dashboard de marketing con estas pestañas: **Meta · Rendimiento**, **Meta · Awareness**, **Meta · Creatividades**, **Instagram**, **Facebook** y **Web (GA4)**. Puedes empezar con cualquiera y añadir las demás después."

2. Pregunta qué área quiere instalar primero con `AskUserQuestion`:
   - Opciones: "Meta · Rendimiento (Recomendada)" / "Meta · Awareness" / "Meta · Creatividades" / "Instagram" / "Facebook" / "Web (GA4)"
   - Solo una respuesta.

3. Delega en el skill correspondiente:
   - Meta · Rendimiento → skill **meta-rendimiento**
   - Meta · Awareness → skill **meta-awareness**
   - Meta · Creatividades → skill **meta-creatividades**
   - Instagram → skill **instagram**
   - Facebook → skill **facebook**
   - GA4 → skill **ga4**

4. Una vez instalada la primera área, comprueba si hay 2+ fuentes distintas (ver sección «Resumen automático»). Si no, pregunta si quiere añadir otra área ahora o dejarlo para más adelante.

### B. Dashboard existente (hay manifest)

1. Lee `files/manifest.json` del store al inicio de la sesión.

2. Muestra el estado actual en texto corto:

   > **Dashboard: [título]**
   > Meta: Rendimiento ✓ · Awareness ✓ · Creatividades —
   > Instagram ✓ · Facebook — · Web (GA4) —
   > Resumen: activo (2 fuentes)

3. Pregunta qué área quiere añadir con `AskUserQuestion`. Ofrece solo las áreas **no instaladas** todavía (revisa `installed_tabs`):
   - Opciones dinámicas según lo que falta (máximo 6 opciones, una respuesta).

4. Delega en el skill del área elegida.

5. Tras completar el skill de área, comprueba si corresponde invocar el skill **resumen** (ver abajo).

## Resumen automático

Después de instalar cualquier área, cuenta las **fuentes de datos distintas** instaladas. Las 6 pestañas se agrupan así:

| Fuente | Tab names en `installed_tabs` |
|--------|-------------------------------|
| Meta | `meta`, `awareness`, `creatividades` (cualquiera de ellas = fuente Meta) |
| Instagram | `instagram` |
| Facebook | `facebook` |
| GA4 (Web) | `web` |

`resumen` no cuenta como fuente. Si hay **2 o más fuentes distintas**, invoca automáticamente el skill **resumen**. No preguntes al usuario; hazlo en silencio y luego informa el resultado conjunto.

Ejemplo: el usuario acaba de instalar Instagram y ya tenía Meta · Rendimiento → `installed_tabs = ["meta", "instagram"]` → Meta = 1 fuente + Instagram = 1 fuente → **2 fuentes distintas** → invocar **resumen** automáticamente.

Ejemplo con 3 pestañas de Meta: `installed_tabs = ["meta", "awareness", "creatividades"]` → solo la fuente Meta → **1 fuente** → NO invocar resumen todavía.

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
