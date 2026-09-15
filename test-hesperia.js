(function () {
  "use strict";

  /* =========================================================
     HESPERIA PARFUM
     CARRUSEL DE RECOMENDADOS
     VERSION 43 - CARGA RAPIDA
     ========================================================= */

  const CONFIG = {
    iniciales: 8,
    porCarga: 4,

    catalogoObjetivo: 80,
    maxMarcasAConsultar: 20,

    pausaMarcas: 300,

    // Productos cuyos precios se consultan simultáneamente
    productosPorLote: 2,

    pausaProductos: 100
  };


  /* =========================================================
     VARIABLES
     ========================================================= */

  let categoriaActual = "";
  let productoActual = "";

  let productosCatalogo = [];
  let productosDisponibles = [];

  let productosMostrados = new Set();
  let productosProcesando = new Set();

  let catalogoCargando = false;
  let catalogoCargado = false;
  let cargando = false;

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

      [copia[i], copia[j]] =
        [copia[j], copia[i]];
    }

    return copia;
  }


  function limpiarTexto(texto) {
    return (texto || "")
      .replace(/\s+/g, " ")
      .replace(/\n/g, " ")
      .trim();
  }


  function escaparHtml(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function esProductoActual(url) {
    if (!productoActual) return false;

    try {
      const actual =
        new URL(
          productoActual,
          window.location.origin
        );

      const otro =
        new URL(
          url,
          window.location.origin
        );

      return (
        actual.pathname.replace(/\/$/, "") ===
        otro.pathname.replace(/\/$/, "")
      );

    } catch (e) {
      return url === productoActual;
    }
  }


  /* =========================================================
     DETECTAR CATEGORIA
     ========================================================= */

  function detectarCategoria() {

    const path =
      window.location.pathname.toLowerCase();

    if (
      path.includes("/fragancias-arabes/")
    ) {

      categoriaActual =
        "fragancias-arabes";

    } else if (
      path.includes("/fragancias-disenador/")
    ) {

      categoriaActual =
        "fragancias-disenador";

    } else {

      categoriaActual = "";

    }

    productoActual =
      window.location.href;

    return categoriaActual;
  }


  /* =========================================================
     EXTRAER PRODUCTOS
     ========================================================= */

  function extraerProductos(
    html,
    categoria
  ) {

    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        html,
        "text/html"
      );

    const enlaces =
      Array.from(
        doc.querySelectorAll(
          "a[href]"
        )
      );

    const productos = [];
    const vistos = new Set();

    enlaces.forEach(enlace => {

      const href =
        enlace.getAttribute(
          "href"
        );

      if (!href) return;

      let url;

      try {

        url =
          new URL(
            href,
            window.location.origin
          );

      } catch (e) {

        return;

      }


      const path =
        url.pathname
          .replace(/^\/|\/$/g, "")
          .split("/")
          .filter(Boolean);


      /*
       * Producto:
       *
       * /categoria/marca/producto
       */

      if (path.length !== 3) {
        return;
      }


      if (
        path[0].toLowerCase() !==
        categoria.toLowerCase()
      ) {
        return;
      }


      const urlFinal =
        url.href;


      if (
        vistos.has(urlFinal)
      ) {
        return;
      }


      if (
        esProductoActual(
          urlFinal
        )
      ) {
        return;
      }


      const imagen =
        enlace.querySelector(
          "img"
        ) ||
        enlace.closest(
          "div, article, li"
        )?.querySelector(
          "img"
        );


      let src = "";

      if (imagen) {

        src =
          imagen.getAttribute(
            "src"
          ) ||
          imagen.getAttribute(
            "data-src"
          ) ||
          imagen.getAttribute(
            "data-lazy-src"
          ) ||
          "";

      }


      let nombre = "";


      if (imagen) {

        nombre =
          imagen.getAttribute(
            "alt"
          ) ||
          "";

      }


      if (!nombre) {

        nombre =
          enlace.getAttribute(
            "title"
          ) ||
          limpiarTexto(
            enlace.textContent
          );

      }


      nombre =
        limpiarTexto(
          nombre
        );


      if (!nombre) {
        return;
      }


      vistos.add(
        urlFinal
      );


      productos.push({
        url: urlFinal,
        nombre: nombre,
        imagen: src,
        precioNormal: "",
        precioCuotas: "",
        precioTransferencia: ""
      });

    });


    return productos;
  }


  /* =========================================================
     AGREGAR AL CATALOGO SIN DUPLICADOS
     ========================================================= */

  function agregarAlCatalogo(
    productos
  ) {

    productos.forEach(producto => {

      if (!producto.url) {
        return;
      }


      if (
        esProductoActual(
          producto.url
        )
      ) {
        return;
      }


      const existe =
        productosCatalogo.some(
          p =>
            p.url ===
            producto.url
        );


      if (!existe) {

        productosCatalogo.push(
          producto
        );

      }

    });


    actualizarDisponibles();
  }


  /* =========================================================
     ACTUALIZAR DISPONIBLES
     ========================================================= */

  function actualizarDisponibles() {

    const usados =
      new Set([
        ...productosMostrados,
        ...productosProcesando
      ]);


    productosDisponibles =
      productosCatalogo.filter(
        producto =>
          !usados.has(
            producto.url
          )
      );
  }


  /* =========================================================
     OBTENER MARCAS
     ========================================================= */

  async function obtenerMarcas(
    categoria
  ) {

    try {

      const respuesta =
        await fetch(
          "/" + categoria,
          {
            credentials:
              "same-origin"
          }
        );


      if (!respuesta.ok) {
        return [];
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


      const enlaces =
        Array.from(
          doc.querySelectorAll(
            "a[href]"
          )
        );


      const marcas = [];
      const vistas = new Set();


      enlaces.forEach(enlace => {

        const href =
          enlace.getAttribute(
            "href"
          );

        if (!href) return;


        let url;

        try {

          url =
            new URL(
              href,
              window.location.origin
            );

        } catch (e) {

          return;

        }


        const path =
          url.pathname
            .replace(/^\/|\/$/g, "")
            .split("/")
            .filter(Boolean);


        /*
         * Marca:
         *
         * /categoria/marca
         */

        if (path.length !== 2) {
          return;
        }


        if (
          path[0].toLowerCase() !==
          categoria.toLowerCase()
        ) {
          return;
        }


        if (
          vistas.has(
            url.href
          )
        ) {
          return;
        }


        vistas.add(
          url.href
        );


        marcas.push(
          url.href
        );

      });


      return mezclar(
        marcas
      );

    } catch (error) {

      console.warn(
        "[HESPERIA] Error obteniendo marcas:",
        error
      );

      return [];
    }
  }


  /* =========================================================
     CARGAR CATALOGO EN SEGUNDO PLANO
     ========================================================= */

  async function cargarCatalogoEnSegundoPlano() {

    if (
      catalogoCargando ||
      catalogoCargado
    ) {
      return;
    }


    catalogoCargando =
      true;


    try {

      /*
       * Obtenemos las marcas.
       */

      const marcas =
        await obtenerMarcas(
          categoriaActual
        );


      /*
       * Las consultamos una por una.
       *
       * Esto evita sobrecargar Empretienda.
       */

      for (
        let i = 0;
        i < marcas.length &&
        i < CONFIG.maxMarcasAConsultar;
        i++
      ) {

        /*
         * Si ya tenemos suficiente catálogo,
         * podemos dejar de consultar.
         */

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
                credentials:
                  "same-origin"
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


            agregarAlCatalogo(
              productos
            );

          }

        } catch (error) {

          console.warn(
            "[HESPERIA] Error consultando marca:",
            marcas[i]
          );

        }


        await esperar(
          CONFIG.pausaMarcas
        );
      }


      /*
       * Mezclamos los productos que todavía
       * no fueron mostrados.
       */

      const mostrados =
        new Set(
          productosMostrados
        );


      const disponibles =
        productosCatalogo.filter(
          producto =>
            !mostrados.has(
              producto.url
            )
        );


      const mezclados =
        mezclar(
          disponibles
        );


      productosDisponibles =
        mezclados;


      catalogoCargado =
        true;


      /*
       * Si el usuario ya está cerca del final,
       * aprovechamos para cargar más.
       */

      setTimeout(
        revisarCarga,
        100
      );


    } catch (error) {

      console.error(
        "[HESPERIA] Error cargando catálogo:",
        error
      );

    } finally {

      catalogoCargando =
        false;

    }
  }


  /* =========================================================
     OBTENER DATOS DE PRODUCTO
     ========================================================= */

  async function obtenerDatosProducto(
    producto
  ) {

    const resultado = {
      ...producto
    };


    try {

      const respuesta =
        await fetch(
          producto.url,
          {
            credentials:
              "same-origin"
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
        doc.querySelector(
          "h1"
        );


      if (h1) {

        const nombre =
          limpiarTexto(
            h1.textContent
          );


        if (nombre) {

          resultado.nombre =
            nombre;

        }
      }


      /*
       * IMAGEN
       */

      if (
        !resultado.imagen
      ) {

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
            imagen.getAttribute(
              "src"
            ) ||
            imagen.getAttribute(
              "data-src"
            ) ||
            imagen.getAttribute(
              "data-lazy-src"
            ) ||
            "";

        }
      }


      const texto =
        limpiarTexto(
          doc.body?.innerText ||
          ""
        );


      /*
       * TRANSFERENCIA
       */

      const transferencia =
        texto.match(
          /Precio\s+final\s*:\s*\$?\s*[\d.]+(?:,\d{1,2})?/i
        );


      if (
        transferencia
      ) {

        const precio =
          transferencia[0].match(
            /\$\s?[\d.]+(?:,\d{1,2})?/
          );


        if (precio) {

          resultado.precioTransferencia =
            precio[0];

        }
      }


      /*
       * PRECIO NORMAL
       */

      const indiceCuotas =
        texto
          .toLowerCase()
          .indexOf(
            "3 cuotas sin interés"
          );


      if (
        indiceCuotas !== -1
      ) {

        const zona =
          texto.substring(
            Math.max(
              0,
              indiceCuotas - 500
            ),
            indiceCuotas + 100
          );


        const precios =
          zona.match(
            /\$\s?[\d.]+(?:,\d{1,2})?/g
          );


        if (
          precios &&
          precios.length
        ) {

          resultado.precioNormal =
            precios[
              precios.length - 1
            ];

        }
      }


      /*
       * FALLBACK
       */

      if (
        !resultado.precioNormal
      ) {

        const precios =
          texto.match(
            /\$\s?[\d.]+(?:,\d{1,2})?/g
          );


        if (
          precios &&
          precios.length
        ) {

          if (
            resultado.precioTransferencia
          ) {

            const diferente =
              precios.find(
                precio =>
                  precio !==
                  resultado.precioTransferencia
              );


            resultado.precioNormal =
              diferente ||
              precios[0];

          } else {

            resultado.precioNormal =
              precios[0];

          }
        }
      }


      resultado.precioCuotas =
        resultado.precioNormal ||
        "";

    } catch (error) {

      console.warn(
        "[HESPERIA] Error obteniendo producto:",
        producto.url
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


    if (!producto) {
      return;
    }


    contenedor =
      document.createElement(
        "section"
      );


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


    /*
     * ANTERIOR
     */

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


    /*
     * SIGUIENTE
     */

    btnSiguiente.addEventListener(
      "click",
      function () {

        const distancia =
          obtenerDistanciaPorPagina();


        viewport.scrollBy({
          left: distancia,
          behavior: "smooth"
        });


        programarRevisionCarga();

      }
    );


    /*
     * SCROLL
     */

    viewport.addEventListener(
      "scroll",
      function () {

        actualizarFlechas();


        clearTimeout(
          scrollTimer
        );


        scrollTimer =
          setTimeout(
            revisarCarga,
            70
          );

      },
      {
        passive: true
      }
    );


    /*
     * RESIZE
     */

    window.addEventListener(
      "resize",
      function () {

        actualizarFlechas();

      }
    );


    actualizarFlechas();
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
      document.createElement(
        "style"
      );


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
      }

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
      }

    `;


    document.head.appendChild(
      style
    );
  }


  /* =========================================================
     CREAR TARJETA
     ========================================================= */

  function crearTarjeta(
    producto
  ) {

    const tarjeta =
      document.createElement(
        "a"
      );


    tarjeta.className =
      "hesperia-card";


    tarjeta.href =
      producto.url;


    tarjeta.target =
      "_self";


    tarjeta.innerHTML = `

      <div class="hesperia-card-image">

        ${
          producto.imagen
            ? `
              <img
                src="${escaparHtml(
                  producto.imagen
                )}"
                alt="${escaparHtml(
                  producto.nombre
                )}"
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
        ${escaparHtml(
          producto.nombre
        )}
      </div>

      <div class="hesperia-card-normal"></div>

      <div class="hesperia-card-cuotas"></div>

      <div class="hesperia-card-transfer"></div>

    `;


    /*
     * Guardamos la URL para poder encontrar
     * esta tarjeta después.
     */

    tarjeta.dataset.productUrl =
      producto.url;


    return tarjeta;
  }


  /* =========================================================
     ACTUALIZAR TARJETA CON PRECIOS
     ========================================================= */

  function actualizarTarjeta(
    tarjeta,
    producto
  ) {

    if (!tarjeta) {
      return;
    }


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

      nombre.textContent =
        producto.nombre ||
        "";

    }


    if (imagen) {

      if (
        producto.imagen
      ) {

        imagen.src =
          producto.imagen;

      }

    }


    if (normal) {

      normal.textContent =
        producto.precioNormal ||
        "";

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
  }


  /* =========================================================
     CARGAR PRECIOS DE PRODUCTOS
     ========================================================= */

  async function cargarPrecios(
    productos,
    tarjetas
  ) {

    /*
     * De a 2 para mantener velocidad
     * sin bombardear Empretienda.
     */

    for (
      let i = 0;
      i < productos.length;
      i += CONFIG.productosPorLote
    ) {

      const lote =
        productos.slice(
          i,
          i +
          CONFIG.productosPorLote
        );


      const resultados =
        await Promise.all(
          lote.map(
            producto =>
              obtenerDatosProducto(
                producto
              )
          )
        );


      resultados.forEach(
        resultado => {

          const tarjeta =
            tarjetas.get(
              resultado.url
            );


          if (tarjeta) {

            actualizarTarjeta(
              tarjeta,
              resultado
            );

          }

        }
      );


      if (
        i +
        CONFIG.productosPorLote <
        productos.length
      ) {

        await esperar(
          CONFIG.pausaProductos
        );

      }
    }
  }


  /* =========================================================
     AGREGAR PRODUCTOS
     ========================================================= */

  async function agregarProductos(
    cantidad
  ) {

    if (cargando) {
      return;
    }


    actualizarDisponibles();


    if (
      !productosDisponibles.length
    ) {

      actualizarFlechas();

      return;
    }


    cargando = true;


    /*
     * Seleccionamos productos.
     */

    const seleccionados =
      productosDisponibles.splice(
        0,
        cantidad
      );


    /*
     * Los marcamos como procesando.
     */

    seleccionados.forEach(
      producto => {

        productosProcesando.add(
          producto.url
        );

        productosMostrados.add(
          producto.url
        );

      }
    );


    actualizarDisponibles();


    /*
     * TARJETAS SE CREAN INMEDIATAMENTE.
     *
     * No esperamos a los precios.
     */

    const tarjetas =
      new Map();


    seleccionados.forEach(
      producto => {

        const tarjeta =
          crearTarjeta(
            producto
          );


        track.appendChild(
          tarjeta
        );


        tarjetas.set(
          producto.url,
          tarjeta
        );

      }
    );


    /*
     * La interfaz ya está visible.
     */

    actualizarFlechas();


    /*
     * Ahora cargamos los precios
     * en segundo plano.
     */

    cargarPrecios(
      seleccionados,
      tarjetas
    ).finally(
      function () {

        seleccionados.forEach(
          producto => {

            productosProcesando.delete(
              producto.url
            );

          }
        );


        actualizarDisponibles();

        actualizarFlechas();

      }
    );


    cargando = false;


    /*
     * Revisamos si hace falta cargar
     * otra tanda.
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


    const cantidad =
      window.innerWidth <= 900
        ? 2
        : 4;


    return (
      (
        tarjeta.getBoundingClientRect()
          .width +
        gap
      ) *
      cantidad
    );
  }


  /* =========================================================
     FLECHAS
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


    btnAnterior.disabled =
      izquierda <= 5;


    /*
     * Si todavía estamos construyendo
     * el catálogo, dejamos habilitada
     * la flecha.
     */

    if (
      productosDisponibles.length > 0 ||
      catalogoCargando ||
      cargando
    ) {

      btnSiguiente.disabled =
        false;

    } else {

      btnSiguiente.disabled =
        izquierda >=
        maxScroll - 5;

    }
  }


  /* =========================================================
     CARGA PROGRESIVA
     ========================================================= */

  async function revisarCarga() {

    if (!viewport) {
      return;
    }


    if (cargando) {
      return;
    }


    actualizarDisponibles();


    /*
     * Si no hay productos disponibles pero
     * todavía estamos construyendo el catálogo,
     * esperamos.
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


    const posicion =
      viewport.scrollLeft;


    const restante =
      maxScroll -
      posicion;


    /*
     * Cargamos antes de llegar al final.
     */

    const limite =
      viewport.clientWidth *
      1.15;


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
     REVISION PROGRAMADA
     ========================================================= */

  function programarRevisionCarga() {

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
     INICIAR
     ========================================================= */

  async function iniciar() {

    /*
     * Solo páginas de producto.
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
     * CREAR LA INTERFAZ.
     */

    crearContenedor();


    /*
     * =====================================================
     * PASO 1
     * =====================================================
     *
     * Pedimos SOLO la categoría.
     *
     * Esta es la petición rápida.
     */

    try {

      const respuesta =
        await fetch(
          "/" + categoriaActual,
          {
            credentials:
              "same-origin"
          }
        );


      if (
        respuesta.ok
      ) {

        const html =
          await respuesta.text();


        const productos =
          extraerProductos(
            html,
            categoriaActual
          );


        /*
         * Mezclamos los productos de la
         * categoría.
         */

        agregarAlCatalogo(
          mezclar(
            productos
          )
        );

      }

    } catch (error) {

      console.warn(
        "[HESPERIA] Error inicial:",
        error
      );

    }


    /*
     * =====================================================
     * PASO 2
     * =====================================================
     *
     * MOSTRAMOS LAS PRIMERAS 8.
     *
     * NO esperamos las marcas.
     * NO esperamos los precios.
     */

    actualizarDisponibles();


    if (
      productosDisponibles.length
    ) {

      await agregarProductos(
        CONFIG.iniciales
      );

    }


    /*
     * =====================================================
     * PASO 3
     * =====================================================
     *
     * AHORA, EN SEGUNDO PLANO,
     * construimos el catálogo completo.
     */

    cargarCatalogoEnSegundoPlano();


    /*
     * Comprobaciones posteriores.
     */

    programarRevisionCarga();
  }


  /* =========================================================
     DOM READY
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
