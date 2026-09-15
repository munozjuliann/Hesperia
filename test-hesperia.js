(function () {
  "use strict";

  /* =========================================================
     HESPERIA PARFUM
     CARRUSEL DE RECOMENDADOS
     VERSION 42
     ========================================================= */

  const CONFIG = {
    iniciales: 8,
    porCarga: 4,

    // Cantidad máxima aproximada de productos a conseguir
    catalogoObjetivo: 80,

    // Máximo de marcas a consultar
    maxMarcasAConsultar: 20,

    // Pausas para evitar demasiadas peticiones seguidas
    pausaMarcas: 300,

    // Productos individuales: se consultan de a 2
    productosPorLote: 2,

    // Separación entre lotes de productos
    pausaProductos: 150
  };


  /* =========================================================
     VARIABLES
     ========================================================= */

  let categoriaActual = "";
  let productoActual = "";

  let productosCatalogo = [];
  let productosDisponibles = [];

  let productosMostrados = new Set();

  let cargando = false;
  let catalogoCargado = false;
  let catalogoCargando = false;

  let contenedor = null;
  let viewport = null;
  let track = null;

  let btnAnterior = null;
  let btnSiguiente = null;

  let scrollTimer = null;


  /* =========================================================
     UTILIDADES
     ========================================================= */

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  function mezclar(array) {
    const copia = [...array];

    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
  }


  function normalizarUrl(url) {
    try {
      return new URL(url, window.location.origin).href;
    } catch (e) {
      return url;
    }
  }


  function limpiarTexto(texto) {
    return (texto || "")
      .replace(/\s+/g, " ")
      .replace(/\n/g, " ")
      .trim();
  }


  function extraerPrecio(texto) {
    if (!texto) return "";

    const match = texto.match(
      /\$\s?[\d.]+(?:,\d{1,2})?/i
    );

    return match ? match[0].trim() : "";
  }


  function esProductoActual(url) {
    if (!productoActual) return false;

    try {
      const actual = new URL(productoActual, window.location.origin);
      const otra = new URL(url, window.location.origin);

      return actual.pathname.replace(/\/$/, "") ===
             otra.pathname.replace(/\/$/, "");
    } catch (e) {
      return url === productoActual;
    }
  }


  /* =========================================================
     DETECTAR CATEGORIA
     ========================================================= */

  function detectarCategoria() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/fragancias-arabes/")) {
      categoriaActual = "fragancias-arabes";
    } else if (path.includes("/fragancias-disenador/")) {
      categoriaActual = "fragancias-disenador";
    } else {
      categoriaActual = "";
    }

    productoActual = window.location.href;

    return categoriaActual;
  }


  /* =========================================================
     EXTRAER PRODUCTOS DE UNA PAGINA
     ========================================================= */

  function extraerProductos(html, categoria) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const enlaces = Array.from(doc.querySelectorAll("a[href]"));

    const productos = [];
    const vistos = new Set();

    enlaces.forEach(enlace => {
      const hrefOriginal = enlace.getAttribute("href");

      if (!hrefOriginal) return;

      let url;

      try {
        url = new URL(hrefOriginal, window.location.origin);
      } catch (e) {
        return;
      }

      const path = url.pathname
        .replace(/^\/|\/$/g, "")
        .split("/")
        .filter(Boolean);

      /*
       * Producto:
       *
       * /fragancias-arabes/marca/producto
       *
       * = 3 segmentos
       *
       * Pero internamente usamos los dos segmentos posteriores
       */

      if (path.length !== 3) return;

      if (path[0].toLowerCase() !== categoria.toLowerCase()) {
        return;
      }

      const urlFinal = url.href;

      if (vistos.has(urlFinal)) return;
      if (esProductoActual(urlFinal)) return;

      vistos.add(urlFinal);

      const imagen =
        enlace.querySelector("img") ||
        enlace.closest("div, article, li")?.querySelector("img");

      let src = "";

      if (imagen) {
        src =
          imagen.getAttribute("src") ||
          imagen.getAttribute("data-src") ||
          imagen.getAttribute("data-lazy-src") ||
          "";
      }

      let nombre = "";

      if (imagen) {
        nombre =
          imagen.getAttribute("alt") ||
          "";
      }

      if (!nombre) {
        nombre =
          enlace.getAttribute("title") ||
          limpiarTexto(enlace.textContent);
      }

      nombre = limpiarTexto(nombre);

      if (!nombre) return;

      productos.push({
        url: urlFinal,
        nombre: nombre,
        imagen: src
      });
    });

    return productos;
  }


  /* =========================================================
     OBTENER MARCAS
     ========================================================= */

  async function obtenerMarcas(categoria) {
    try {
      const respuesta = await fetch(
        "/" + categoria,
        {
          credentials: "same-origin"
        }
      );

      if (!respuesta.ok) {
        throw new Error(
          "No se pudo obtener la categoría: " +
          respuesta.status
        );
      }

      const html = await respuesta.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const enlaces = Array.from(doc.querySelectorAll("a[href]"));

      const marcas = [];
      const vistas = new Set();

      enlaces.forEach(enlace => {
        const hrefOriginal = enlace.getAttribute("href");

        if (!hrefOriginal) return;

        let url;

        try {
          url = new URL(
            hrefOriginal,
            window.location.origin
          );
        } catch (e) {
          return;
        }

        const path = url.pathname
          .replace(/^\/|\/$/g, "")
          .split("/")
          .filter(Boolean);

        /*
         * Marca:
         *
         * /fragancias-arabes/marca
         */

        if (path.length !== 2) return;

        if (
          path[0].toLowerCase() !==
          categoria.toLowerCase()
        ) {
          return;
        }

        const urlMarca = url.href;

        if (vistas.has(urlMarca)) return;

        vistas.add(urlMarca);

        marcas.push(urlMarca);
      });

      return mezclar(marcas);

    } catch (error) {
      console.error(
        "[HESPERIA] Error obteniendo marcas:",
        error
      );

      return [];
    }
  }


  /* =========================================================
     CARGAR CATALOGO
     ========================================================= */

  async function obtenerCatalogo() {
    if (catalogoCargado || catalogoCargando) {
      return;
    }

    catalogoCargando = true;

    try {

      /*
       * PRIMERA FUENTE:
       * página principal de la categoría.
       *
       * Esto permite mostrar productos rápidamente
       * mientras se arma el catálogo completo.
       */

      try {
        const respuestaCategoria = await fetch(
          "/" + categoriaActual,
          {
            credentials: "same-origin"
          }
        );

        if (respuestaCategoria.ok) {
          const htmlCategoria =
            await respuestaCategoria.text();

          const productosCategoria =
            extraerProductos(
              htmlCategoria,
              categoriaActual
            );

          productosCategoria.forEach(producto => {

            if (
              !productosCatalogo.some(
                p => p.url === producto.url
              )
            ) {
              productosCatalogo.push(producto);
            }

          });
        }

      } catch (error) {
        console.warn(
          "[HESPERIA] No se pudo leer categoría:",
          error
        );
      }


      /*
       * SEGUNDA FUENTE:
       * páginas de cada marca.
       *
       * Se consulta UNA POR UNA para evitar
       * sobrecargar Empretienda.
       */

      const marcas =
        await obtenerMarcas(categoriaActual);

      for (
        let i = 0;
        i < marcas.length &&
        i < CONFIG.maxMarcasAConsultar;
        i++
      ) {

        if (
          productosCatalogo.length >=
          CONFIG.catalogoObjetivo
        ) {
          break;
        }

        try {

          const respuesta =
            await fetch(
              marcas[i],
              {
                credentials: "same-origin"
              }
            );

          if (respuesta.ok) {

            const html =
              await respuesta.text();

            const productos =
              extraerProductos(
                html,
                categoriaActual
              );

            productos.forEach(producto => {

              if (
                !productosCatalogo.some(
                  p => p.url === producto.url
                )
              ) {
                productosCatalogo.push(producto);
              }

            });
          }

        } catch (error) {

          console.warn(
            "[HESPERIA] Error consultando marca:",
            marcas[i],
            error
          );

        }

        /*
         * Pequeña pausa entre marcas.
         */
        await esperar(CONFIG.pausaMarcas);
      }


      /*
       * Mezclamos todo el catálogo para que las
       * recomendaciones sean diferentes.
       */

      productosCatalogo =
        mezclar(productosCatalogo);


      /*
       * Eliminamos el producto actual y duplicados.
       */

      const unicos = [];
      const urls = new Set();

      productosCatalogo.forEach(producto => {

        if (!producto.url) return;

        if (esProductoActual(producto.url)) {
          return;
        }

        if (urls.has(producto.url)) {
          return;
        }

        urls.add(producto.url);
        unicos.push(producto);
      });

      productosCatalogo = unicos;

      /*
       * Inicialmente todos están disponibles.
       */

      productosDisponibles =
        productosCatalogo.filter(
          producto =>
            !productosMostrados.has(producto.url)
        );

      catalogoCargado = true;

    } catch (error) {

      console.error(
        "[HESPERIA] Error general del catálogo:",
        error
      );

    } finally {

      catalogoCargando = false;

    }
  }


  /* =========================================================
     OBTENER DATOS DEL PRODUCTO
     ========================================================= */

  async function obtenerDatosProducto(producto) {

    const resultado = {
      ...producto,
      nombre: producto.nombre || "",
      precioNormal: "",
      precioCuotas: "",
      precioTransferencia: ""
    };

    try {

      const respuesta =
        await fetch(
          producto.url,
          {
            credentials: "same-origin"
          }
        );

      if (!respuesta.ok) {
        return resultado;
      }

      const html =
        await respuesta.text();

      const parser =
        new DOMParser();

      const doc =
        parser.parseFromString(
          html,
          "text/html"
        );

      /*
       * NOMBRE
       */

      const h1 =
        doc.querySelector("h1");

      if (h1) {
        const nombre =
          limpiarTexto(h1.textContent);

        if (nombre) {
          resultado.nombre = nombre;
        }
      }


      /*
       * IMAGEN
       */

      if (!resultado.imagen) {

        const imagen =
          doc.querySelector(
            ".product-vip img"
          ) ||
          doc.querySelector(
            "main img"
          ) ||
          doc.querySelector(
            "img"
          );

        if (imagen) {

          resultado.imagen =
            imagen.getAttribute("src") ||
            imagen.getAttribute("data-src") ||
            imagen.getAttribute(
              "data-lazy-src"
            ) ||
            "";

        }
      }


      /*
       * TEXTO COMPLETO
       */

      const texto =
        limpiarTexto(
          doc.body?.innerText || ""
        );


      /*
       * PRECIO DE TRANSFERENCIA
       *
       * Busca:
       * Precio final: $XX
       */

      const transferencia =
        texto.match(
          /Precio\s+final\s*:\s*\$?\s*[\d.]+(?:,\d{1,2})?/i
        );

      if (transferencia) {

        resultado.precioTransferencia =
          extraerPrecio(
            transferencia[0]
          );

      }


      /*
       * PRECIO NORMAL
       *
       * Buscamos el precio asociado a:
       * 3 cuotas sin interés
       */

      const indiceCuotas =
        texto.toLowerCase().indexOf(
          "3 cuotas sin interés"
        );

      if (indiceCuotas !== -1) {

        const zona =
          texto.substring(
            Math.max(0, indiceCuotas - 500),
            indiceCuotas + 100
          );

        const precios =
          zona.match(
            /\$\s?[\d.]+(?:,\d{1,2})?/g
          );

        if (precios && precios.length) {

          /*
           * Normalmente el último precio
           * encontrado antes de las cuotas
           * corresponde al precio normal.
           */

          resultado.precioNormal =
            precios[precios.length - 1];
        }
      }


      /*
       * Si no encontramos el precio normal,
       * buscamos precios generales.
       */

      if (!resultado.precioNormal) {

        const precios =
          texto.match(
            /\$\s?[\d.]+(?:,\d{1,2})?/g
          );

        if (
          precios &&
          precios.length
        ) {

          /*
           * Si tenemos transferencia,
           * buscamos otro precio distinto.
           */

          if (
            resultado.precioTransferencia
          ) {

            const distinto =
              precios.find(
                precio =>
                  precio !==
                  resultado.precioTransferencia
              );

            resultado.precioNormal =
              distinto ||
              precios[0];

          } else {

            resultado.precioNormal =
              precios[0];

          }
        }
      }


      /*
       * PRECIO 3 CUOTAS
       *
       * Si el precio normal existe,
       * mostramos ese mismo valor como
       * precio de lista para las cuotas.
       *
       * En Empretienda el producto muestra:
       * precio normal + "3 cuotas sin interés".
       */

      resultado.precioCuotas =
        resultado.precioNormal || "";

    } catch (error) {

      console.warn(
        "[HESPERIA] Error producto:",
        producto.url,
        error
      );

    }

    return resultado;
  }


  /* =========================================================
     CREAR CONTENEDOR
     ========================================================= */

  function crearContenedor() {

    if (
      document.querySelector(
        "#hesperia-recomendados"
      )
    ) {
      return;
    }

    const producto =
      document.querySelector(
        ".product-vip"
      );

    if (!producto) return;


    contenedor =
      document.createElement("section");

    contenedor.id =
      "hesperia-recomendados";


    contenedor.innerHTML = `

      <div class="hesperia-rec-inner">

        <h2 class="hesperia-rec-title">
          También te puede interesar
        </h2>

        <div class="hesperia-carousel">

          <button
            type="button"
            class="hesperia-arrow hesperia-prev"
            aria-label="Productos anteriores"
          >
            ‹
          </button>

          <div
            class="hesperia-viewport"
            tabindex="0"
          >
            <div
              class="hesperia-track"
            ></div>
          </div>

          <button
            type="button"
            class="hesperia-arrow hesperia-next"
            aria-label="Más productos"
          >
            ›
          </button>

        </div>

      </div>
    `;


    /*
     * Insertamos debajo del producto.
     */

    producto.insertAdjacentElement(
      "afterend",
      contenedor
    );


    viewport =
      contenedor.querySelector(
        ".hesperia-viewport"
      );

    track =
      contenedor.querySelector(
        ".hesperia-track"
      );

    btnAnterior =
      contenedor.querySelector(
        ".hesperia-prev"
      );

    btnSiguiente =
      contenedor.querySelector(
        ".hesperia-next"
      );


    agregarEstilos();


    btnAnterior.addEventListener(
      "click",
      function () {

        const distancia =
          obtenerDistanciaPorPagina();

        viewport.scrollBy({
          left: -distancia,
          behavior: "smooth"
        });

        actualizarFlechas();

      }
    );


    btnSiguiente.addEventListener(
      "click",
      function () {

        const distancia =
          obtenerDistanciaPorPagina();

        viewport.scrollBy({
          left: distancia,
          behavior: "smooth"
        });

        /*
         * Revisamos inmediatamente y
         * también después de que termine
         * el desplazamiento.
         */

        programarRevisionCarga();

      }
    );


    viewport.addEventListener(
      "scroll",
      function () {

        actualizarFlechas();

        clearTimeout(scrollTimer);

        scrollTimer =
          setTimeout(
            function () {
              revisarCarga();
            },
            80
          );

      },
      {
        passive: true
      }
    );


    window.addEventListener(
      "resize",
      function () {

        actualizarFlechas();

      }
    );
  }


  /* =========================================================
     ESTILOS
     ========================================================= */

  function agregarEstilos() {

    if (
      document.querySelector(
        "#hesperia-recomendados-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "hesperia-recomendados-styles";

    style.textContent = `

      #hesperia-recomendados {
        width: 100%;
        margin: 50px auto 35px;
        overflow: hidden;
        box-sizing: border-box;
      }

      #hesperia-recomendados *,
      #hesperia-recomendados *::before,
      #hesperia-recomendados *::after {
        box-sizing: border-box;
      }

      .hesperia-rec-inner {
        width: 100%;
        max-width: 1160px;
        margin: 0 auto;
        padding: 0 20px;
      }

      .hesperia-rec-title {
        margin: 0 0 28px;
        padding: 0;
        text-align: center;
        font-size: 25px;
        line-height: 1.2;
        font-weight: 500;
        letter-spacing: 0;
        color: #111;
      }

      .hesperia-carousel {
        width: 100%;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 34px;
        align-items: center;
        gap: 10px;
      }

      .hesperia-viewport {
        width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        -ms-overflow-style: none;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x proximity;
      }

      .hesperia-viewport::-webkit-scrollbar {
        display: none;
      }

      .hesperia-track {
        display: flex;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: 20px;
        width: max-content;
        padding: 2px 0 8px;
      }

      .hesperia-card {
        position: relative;
        flex: 0 0 255px;
        width: 255px;
        min-width: 255px;
        text-decoration: none !important;
        color: #111 !important;
        display: block;
        scroll-snap-align: start;
      }

      .hesperia-card-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        background: #f7f7f7;
        margin-bottom: 13px;
      }

      .hesperia-card-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        transition: transform .3s ease;
      }

      .hesperia-card:hover
      .hesperia-card-image img {
        transform: scale(1.035);
      }

      .hesperia-card-name {
        margin: 0 0 9px;
        min-height: 38px;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 500;
        text-align: left;
        color: #111;
      }

      .hesperia-card-normal {
        margin: 0 0 3px;
        font-size: 13px;
        line-height: 1.3;
        color: #777;
        text-decoration: line-through;
      }

      .hesperia-card-cuotas {
        margin: 0 0 3px;
        font-size: 13px;
        line-height: 1.3;
        color: #222;
      }

      .hesperia-card-transfer {
        margin: 0;
        font-size: 14px;
        line-height: 1.3;
        font-weight: 600;
        color: #111;
      }

      .hesperia-arrow {
        width: 34px;
        height: 34px;
        padding: 0;
        margin: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #111;
        font-family: Arial, sans-serif;
        font-size: 32px;
        line-height: 30px;
        font-weight: 300;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          opacity .2s ease,
          background .2s ease;
        z-index: 5;
      }

      .hesperia-arrow:hover {
        background: #f3f3f3;
      }

      .hesperia-arrow:disabled {
        opacity: 0;
        pointer-events: none;
      }

      .hesperia-loading {
        flex: 0 0 255px;
        width: 255px;
        min-width: 255px;
        aspect-ratio: 1 / 1.45;
        background:
          linear-gradient(
            90deg,
            #f7f7f7 25%,
            #eeeeee 50%,
            #f7f7f7 75%
          );
        background-size: 200% 100%;
        animation:
          hesperiaShimmer 1.2s infinite;
      }

      @keyframes hesperiaShimmer {
        from {
          background-position: 200% 0;
        }

        to {
          background-position: -200% 0;
        }
      }


      /* =====================================================
         TABLET
         ===================================================== */

      @media (max-width: 900px) {

        .hesperia-rec-inner {
          padding: 0 14px;
        }

        .hesperia-carousel {
          grid-template-columns: 28px minmax(0, 1fr) 28px;
          gap: 7px;
        }

        .hesperia-track {
          gap: 14px;
        }

        .hesperia-card {
          flex-basis:
            calc((100vw - 77px) / 2);
          width:
            calc((100vw - 77px) / 2);
          min-width:
            calc((100vw - 77px) / 2);
        }

        .hesperia-arrow {
          width: 28px;
          height: 34px;
          font-size: 29px;
        }

        .hesperia-loading {
          flex-basis:
            calc((100vw - 77px) / 2);
          width:
            calc((100vw - 77px) / 2);
          min-width:
            calc((100vw - 77px) / 2);
        }
      }


      /* =====================================================
         MOBILE
         ===================================================== */

      @media (max-width: 600px) {

        #hesperia-recomendados {
          margin-top: 40px;
          margin-bottom: 25px;
        }

        .hesperia-rec-inner {
          padding: 0 10px;
        }

        .hesperia-rec-title {
          margin-bottom: 22px;
          font-size: 21px;
        }

        .hesperia-carousel {
          grid-template-columns: 25px minmax(0, 1fr) 25px;
          gap: 5px;
        }

        .hesperia-track {
          gap: 12px;
        }

        .hesperia-card {
          flex-basis:
            calc((100vw - 70px) / 2);
          width:
            calc((100vw - 70px) / 2);
          min-width:
            calc((100vw - 70px) / 2);
        }

        .hesperia-card-name {
          font-size: 12px;
          line-height: 1.35;
          min-height: 34px;
        }

        .hesperia-card-normal,
        .hesperia-card-cuotas {
          font-size: 11px;
        }

        .hesperia-card-transfer {
          font-size: 12px;
        }

        .hesperia-arrow {
          width: 25px;
          height: 30px;
          font-size: 27px;
        }

        .hesperia-loading {
          flex-basis:
            calc((100vw - 70px) / 2);
          width:
            calc((100vw - 70px) / 2);
          min-width:
            calc((100vw - 70px) / 2);
        }
      }

    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     CREAR TARJETA
     ========================================================= */

  function crearTarjeta(producto) {

    const tarjeta =
      document.createElement("a");

    tarjeta.className =
      "hesperia-card";

    tarjeta.href =
      producto.url;

    tarjeta.target =
      "_self";

    tarjeta.rel =
      "noopener";


    const imagen =
      producto.imagen ||
      "";


    tarjeta.innerHTML = `

      <div class="hesperia-card-image">

        ${
          imagen
            ? `
              <img
                src="${imagen}"
                alt="${escaparHtml(producto.nombre)}"
                loading="lazy"
              >
            `
            : `
              <div
                style="
                  width:100%;
                  height:100%;
                  background:#f7f7f7;
                "
              ></div>
            `
        }

      </div>

      <div class="hesperia-card-name">
        ${escaparHtml(producto.nombre)}
      </div>

      <div class="hesperia-card-normal">
        ${
          producto.precioNormal ||
          ""
        }
      </div>

      <div class="hesperia-card-cuotas">
        ${
          producto.precioCuotas
            ? producto.precioCuotas +
              " en 3 cuotas sin interés"
            : ""
        }
      </div>

      <div class="hesperia-card-transfer">
        ${
          producto.precioTransferencia
            ? producto.precioTransferencia +
              " con transferencia"
            : ""
        }
      </div>

    `;


    return tarjeta;
  }


  /* =========================================================
     ESCAPAR HTML
     ========================================================= */

  function escaparHtml(texto) {

    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* =========================================================
     ACTUALIZAR DATOS DE TARJETA
     ========================================================= */

  function actualizarTarjeta(
    tarjeta,
    producto
  ) {

    const nombre =
      tarjeta.querySelector(
        ".hesperia-card-name"
      );

    const normal =
      tarjeta.querySelector(
        ".hesperia-card-normal"
      );

    const cuotas =
      tarjeta.querySelector(
        ".hesperia-card-cuotas"
      );

    const transferencia =
      tarjeta.querySelector(
        ".hesperia-card-transfer"
      );

    const imagen =
      tarjeta.querySelector(
        ".hesperia-card-image img"
      );


    if (nombre) {
      nombre.innerHTML =
        escaparHtml(
          producto.nombre
        );
    }

    if (normal) {
      normal.textContent =
        producto.precioNormal || "";
    }

    if (cuotas) {
      cuotas.textContent =
        producto.precioCuotas
          ? producto.precioCuotas +
            " en 3 cuotas sin interés"
          : "";
    }

    if (transferencia) {
      transferencia.textContent =
        producto.precioTransferencia
          ? producto.precioTransferencia +
            " con transferencia"
          : "";
    }

    if (
      imagen &&
      producto.imagen
    ) {
      imagen.src =
        producto.imagen;
    }
  }


  /* =========================================================
     AGREGAR PRODUCTOS
     ========================================================= */

  async function agregarProductos(
    cantidad
  ) {

    if (cargando) return;

    if (!productosDisponibles.length) {
      actualizarFlechas();
      return;
    }

    cargando = true;


    /*
     * Tomamos solamente la cantidad
     * necesaria.
     */

    const seleccionados =
      productosDisponibles.splice(
        0,
        cantidad
      );


    /*
     * Los marcamos inmediatamente como
     * mostrados para evitar duplicados.
     */

    seleccionados.forEach(producto => {
      productosMostrados.add(
        producto.url
      );
    });


    /*
     * Procesamos de a 2 productos.
     *
     * Esto acelera muchísimo la carga
     * respecto a hacerlo uno por uno,
     * pero evita una avalancha de requests.
     */

    for (
      let i = 0;
      i < seleccionados.length;
      i += CONFIG.productosPorLote
    ) {

      const lote =
        seleccionados.slice(
          i,
          i + CONFIG.productosPorLote
        );


      const resultados =
        await Promise.all(
          lote.map(producto =>
            obtenerDatosProducto(
              producto
            )
          )
        );


      resultados.forEach(producto => {

        const tarjeta =
          crearTarjeta(producto);

        track.appendChild(
          tarjeta
        );

      });


      /*
       * Pausa pequeña entre lotes.
       */

      if (
        i + CONFIG.productosPorLote <
        seleccionados.length
      ) {
        await esperar(
          CONFIG.pausaProductos
        );
      }
    }


    cargando = false;

    actualizarFlechas();

    /*
     * Si la pantalla sigue cerca del final,
     * comprobamos si hace falta otra tanda.
     */

    setTimeout(
      revisarCarga,
      100
    );
  }


  /* =========================================================
     DISTANCIA POR PAGINA
     ========================================================= */

  function obtenerDistanciaPorPagina() {

    if (
      !viewport ||
      !track
    ) {
      return 0;
    }

    const tarjeta =
      track.querySelector(
        ".hesperia-card"
      );

    if (!tarjeta) {
      return viewport.clientWidth;
    }


    const estilo =
      window.getComputedStyle(
        track
      );

    const gap =
      parseFloat(
        estilo.columnGap ||
        estilo.gap ||
        "0"
      ) || 0;


    /*
     * PC = 4 productos
     * Tablet/móvil = 2 productos
     */

    const cantidad =
      window.innerWidth <= 900
        ? 2
        : 4;


    return (
      (tarjeta.getBoundingClientRect().width +
        gap) *
      cantidad
    );
  }


  /* =========================================================
     ACTUALIZAR FLECHAS
     ========================================================= */

  function actualizarFlechas() {

    if (
      !viewport ||
      !btnAnterior ||
      !btnSiguiente
    ) {
      return;
    }


    const izquierda =
      viewport.scrollLeft;


    const maxScroll =
      viewport.scrollWidth -
      viewport.clientWidth;


    /*
     * Flecha anterior
     */

    if (izquierda <= 5) {

      btnAnterior.disabled = true;

    } else {

      btnAnterior.disabled = false;

    }


    /*
     * Flecha siguiente
     *
     * Mientras existan productos disponibles,
     * dejamos la flecha activa.
     */

    if (
      productosDisponibles.length > 0 ||
      cargando
    ) {

      btnSiguiente.disabled = false;

    } else if (
      izquierda >= maxScroll - 5
    ) {

      btnSiguiente.disabled = true;

    } else {

      btnSiguiente.disabled = false;

    }
  }


  /* =========================================================
     REVISAR CARGA PROGRESIVA
     ========================================================= */

  async function revisarCarga() {

    if (
      !viewport ||
      cargando
    ) {
      return;
    }


    /*
     * Si todavía no hay catálogo suficiente,
     * no hacemos nada.
     */

    if (
      !productosDisponibles.length
    ) {
      actualizarFlechas();
      return;
    }


    const maxScroll =
      viewport.scrollWidth -
      viewport.clientWidth;


    const posicionActual =
      viewport.scrollLeft;


    const restante =
      maxScroll -
      posicionActual;


    /*
     * Cuando queda aproximadamente una
     * pantalla para llegar al final,
     * cargamos 4 productos más.
     */

    const limite =
      viewport.clientWidth * 1.15;


    if (
      restante <= limite
    ) {

      await agregarProductos(
        CONFIG.porCarga
      );

    }


    actualizarFlechas();
  }


  /* =========================================================
     REVISIONES PROGRAMADAS
     ========================================================= */

  function programarRevisionCarga() {

    /*
     * Varias comprobaciones pequeñas permiten
     * detectar el final incluso con scroll suave.
     */

    setTimeout(
      revisarCarga,
      100
    );

    setTimeout(
      revisarCarga,
      350
    );

    setTimeout(
      revisarCarga,
      700
    );

    setTimeout(
      revisarCarga,
      1100
    );
  }


  /* =========================================================
     INICIALIZACION
     ========================================================= */

  async function iniciar() {

    /*
     * Solo ejecutar en producto.
     */

    if (
      !document.querySelector(
        ".product-vip"
      )
    ) {
      return;
    }


    detectarCategoria();


    if (!categoriaActual) {
      return;
    }


    /*
     * Crear interfaz inmediatamente.
     */

    crearContenedor();


    /*
     * Cargar catálogo.
     */

    await obtenerCatalogo();


    if (
      !productosCatalogo.length
    ) {

      console.warn(
        "[HESPERIA] No se encontraron productos."
      );

      return;
    }


    /*
     * Actualizar disponibles.
     */

    productosDisponibles =
      productosCatalogo.filter(
        producto =>
          !productosMostrados.has(
            producto.url
          )
      );


    /*
     * Cargar las primeras 8.
     */

    await agregarProductos(
      CONFIG.iniciales
    );


    /*
     * Comprobación inicial.
     */

    programarRevisionCarga();
  }


  /* =========================================================
     ESPERAR A QUE ESTE LISTO EL DOM
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );

  } else {

    iniciar();

  }

})();
