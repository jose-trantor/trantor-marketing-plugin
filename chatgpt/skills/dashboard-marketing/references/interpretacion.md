# Cómo leer las cifras del dashboard

## Métricas que no se suman

- **Alcance (`reach`) y cuentas que interactúan (`accounts_engaged`)** cuentan personas distintas. El alcance de un periodo no es la suma de los días, porque la misma persona cuenta una vez por día. Para el total del periodo, pide `granularity: "total"`. El dashboard muestra alcance medio diario.
- **El alcance de varias campañas o cuentas tampoco se suma** por la misma razón. La frecuencia es impresiones ÷ alcance del mismo conjunto.
- **Las visualizaciones (`views`, `page_media_view`), interacciones, clics, gasto y conversiones sí se suman** entre días y entre elementos.

## Meta Ads

- **Tipo de campaña** según su objetivo: Mensajes (conversaciones iniciadas), Venta web (compras del píxel), Tráfico (visitas a la web) y Alcance (awareness). Cada tipo se compara con su propio resultado y su propio coste por resultado. No compares el coste de un mensaje con el de una compra.
- **Conversaciones:** `actions_onsite_conversion_messaging_conversation_started_7d`.
- **Enganche (hook rate):** reproducciones de 3 segundos ÷ impresiones. **Retención:** ThruPlays ÷ reproducciones de 3 segundos.
- **Veredictos de las tablas:** "Funciona" es claramente mejor que la media de su tipo, "No funciona" claramente peor, "Poco gasto" no tiene inversión suficiente para juzgarlo. Los umbrales están en los cálculos `*_rules` y se muestran en la página.

## Creatividades

- **Concepto**, por palabras del nombre del anuncio: Humor / meme, Textura (food porn), Reseñas, Tienda / apertura, Evento, Regalo / ocasión, Formatos / precio, Producto / sabor. El resto es "Otro". La lista exacta está en la tarjeta "Cómo se clasifica cada anuncio". Si casi todo sale como "Otro", los nombres de los anuncios del usuario no usan esas palabras. Díselo y propón adaptar las expresiones de `CONCEPTS` en `files/lv-crea.js` a su forma de nombrar.
- **Destino**, por el botón del anuncio: WhatsApp, Instagram Direct, perfil de Instagram o web.
- **Formato:** imagen, vídeo o carrusel. **Largo del texto:** corto, medio o largo, por palabras.
- Los grupos con poca inversión se descartan para no sacar conclusiones de pocos datos.

## Instagram

- **Tema**, por palabras del texto: Tienda / evento, Fecha especial, Promo / sorteo, Lanzamiento, Historia / equipo y, por defecto, Antojo / humor. Igual que con los conceptos, si no encaja con la marca se ajusta `THEMES` en `files/lv-ig.js`.
- **Tasa de interacción** de cada publicación: interacciones ÷ alcance.
- **% de alcance a no seguidores:** suma diaria de alcance a no seguidores ÷ suma diaria de alcance total.
- **Nuevos seguidores** solo existen para los últimos 30 días: Meta no guarda más.

## Facebook

- Meta sustituyó en noviembre de 2025 las impresiones de página por **visualizaciones**. El dashboard usa visualizaciones, separadas en pagadas y orgánicas.
- Una página con casi todo pagado funciona como soporte de anuncios, no como canal propio. Es una decisión de negocio, no un fallo.

## Web (GA4)

- **Embudo:** vista de producto → añadir al carrito → inicio de pago → compra. Una caída brusca en el último paso apunta a un problema de pago o de medición del evento `purchase`. Recomienda comparar con los pedidos reales de la tienda.
- **Pasarela de pago como referencia:** si una parte relevante de las ventas se atribuye a un dominio de pago (PayPal, Stripe, Mercado Pago, etc.), se pierde el canal real. Hay que añadir ese dominio a las referencias no deseadas de GA4.
- **Páginas de entrada:** se ignoran las de menos de 20 sesiones en el periodo. Las ciudades, por debajo de 100.

## Alertas

- **Prioridad:** Alta (cuesta dinero o rompe la medición), Media (vigilar), Baja (informativa) y Oportunidad (algo que escalar).
- En el Resumen, los **problemas de medición** van aparte de las alertas de negocio: mientras existan, las cifras de canales y anuncios no son fiables.
