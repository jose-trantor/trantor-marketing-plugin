# Escribir las lecturas del dashboard

Cada pestaña tiene una tarjeta de lectura: unas pocas conclusiones escritas por ti a partir de los datos. Están en `files/index.html`, entre dos marcadores:

```html
<!--LV_READING:<id>-->
  …nota y lista…
<!--/LV_READING-->
```

| id | Pestaña | Qué datos mirar |
|---|---|---|
| `sum-plan` | Resumen · "Lectura y plan de la semana" | Las otras cuatro lecturas, más alertas altas y problemas de medición del dashboard |
| `cr-conclusiones` | Meta · Creatividades | Anuncios de los últimos 90 días con `meta_insights` (`level: "ad"`, `include_creative: true`): concepto, formato, largo del texto, destino, coste por resultado, enganche y retención de vídeo |
| `ig-lectura` | Instagram | Publicaciones de los últimos 180 días con `instagram_media`: tema, formato, largo del texto, día, alcance, interacción, guardados y compartidos |
| `fb-lectura` | Facebook | Página, últimos 90 días, con `page_insights` (visualizaciones con desglose `is_from_ads`, interacciones, visitas, seguidores) y posts con `page_posts` |
| `ga-lectura` | Web | GA4, últimos 90 días frente a los 90 anteriores, con `ga4_report`: embudo (vistas de producto, carrito, pago, compra), canales, dispositivos, páginas de entrada, productos y fuentes de referencia |

Usa las mismas cuentas que las consultas del dashboard: están en los `args` de sus datasets (`datasets/m_*`, `ig_*`, `fb_*`, `ga_*`).

## Cómo escribir cada lectura

- **Entre 4 y 7 puntos.** Cada uno empieza con una frase en negrita que dice la conclusión y sigue con la cifra o el ejemplo que la sostiene y qué hacer.
- **Solo lo que dicen los datos.** No inventes causas. Si algo es una hipótesis, dilo ("puede deberse a…, compruébalo con…").
- **Nombres reales:** el anuncio, la publicación, la página o el producto concretos.
- **Prioriza lo accionable:** primero lo que cuesta dinero o rompe la medición, después las oportunidades.
- **No repitas las alertas automáticas** de la misma pestaña: la lectura explica el porqué y los patrones que las reglas no ven.
- **Tono de la página:** frases cortas, tú, sin jerga.
- En `sum-plan`, escribe un plan de 4 a 6 pasos ordenados ("Primero…", "Después…") a partir de las otras lecturas.

## Formato HTML

Para `cr-conclusiones`, `ig-lectura`, `fb-lectura` y `ga-lectura` (lista `lv-find`, con un punto de color por conclusión: `ok` funciona, `warn` vigilar, `bad` no funciona):

```html
<!--LV_READING:ig-lectura-->
      <p class="lv-card-note">Análisis hecho por IA el <fecha> sobre <periodo y datos usados>. No se actualiza solo: si las cifras de arriba cuentan otra cosa, mandan las cifras.</p>
      <ul class="lv-find">
        <li><span class="lv-dot ok"></span><span><b>Conclusión en una frase.</b> Cifra o ejemplo que la sostiene y qué hacer.</span></li>
        <li><span class="lv-dot warn"></span><span><b>…</b> …</span></li>
      </ul>
      <!--/LV_READING-->
```

Para `sum-plan` (lista numerada `lv-list`):

```html
<!--LV_READING:sum-plan-->
      <p class="lv-card-note">Síntesis hecha por IA el <fecha> a partir de todas las pestañas. No se actualiza sola: si las alertas de arriba cuentan otra cosa, mandan las alertas.</p>
      <ol class="lv-list">
        <li><b>Paso en una frase.</b> Por qué y cómo.</li>
      </ol>
      <!--/LV_READING-->
```

Escapa en el texto `<`, `>` y `&` (`&lt;`, `&gt;`, `&amp;`). Usa «comillas latinas» para citar copys o nombres.

## Cómo guardarla

1. Lee `files/index.html` del almacén del dashboard (`get`) y anota su `version`.
2. Sustituye todo lo que hay entre `<!--LV_READING:<id>-->` y su `<!--/LV_READING-->`, marcadores incluidos, por el bloque nuevo, que vuelve a llevar los dos marcadores. Si cambias una sola lectura, basta un `str_replace` sobre el campo `text` con el bloque antiguo completo como `old_str`.
3. Escribe con `if_version`. Si la versión cambió, vuelve a leer y repite.
4. Comprueba `check` como explica el tipo de dashboard.

Al terminar, resume al usuario en dos o tres líneas lo más importante que has encontrado.
