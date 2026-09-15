(function () {
  "use strict";

  /* =========================================================
     HESPERIA PARFUM
     RECOMENDADOS DE PRODUCTO
     VERSION 44 - ULTRA CONSERVADORA
     ========================================================= */

  const CONFIG = {

    // Productos que aparecen inicialmente
    iniciales: 8,

    // Productos que se agregan posteriormente
    porCarga: 4,

    // Cantidad máxima de marcas que podremos consultar
    maxMarcas: 20,

    // Espera entre consultas de marcas
    pausaEntreMarcas: 1200,

    // Espera entre consultas de productos
    pausaEntreProductos: 900,

    // Distancia a partir de la cual buscamos más productos
    margenCarga: 1.2
  };


  /* =========================================================
     VARIABLES
     ========================================================= */

  let categoriaActual = "";
  let productoActual = "";

  let productosCatalogo = [];
  let productosDisponibles = [];

  let marcasDisponibles = [];
  let marcasConsultadas = new Set();

  let cargandoProductos = false;
  let cargandoMarca = false;

  let contenedor = null;
  let viewport = null;
  let track = null;

  let btnAnterior = null;
  let btnSiguiente = null;

  let timerScroll = null;


  /* =========================================================
     UTILIDADES
     ========================================================= */

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }


  function mezclar(array) {

    const copia = [...array];

    for (
      let i = copia.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        copia[i],
        copia[j]
      ] = [
        copia[j],
        copia[i]
      ];
    }

    return copia;
  }


  function limpiarTexto(texto) {

    return String(texto || "")
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

    if (!productoActual) {
      return false;
    }

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
      window.location.pathname
        .toLowerCase();


    if (
      path.includes(
        "/fragancias-arabes/"
      )
    ) {

      categoriaActual =
        "fragancias-arabes";

    } else if (
      path.includes(
        "/fragancias-disenador/"
      )
    ) {

      categoriaActual =
        "fragancias-disenador";

    } else {

      categoriaActual = "";

    }


    productoActual =
      window.location.href;
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


    enlaces.forEach(function (enlace) {

      const href =
        enlace.getAttribute(
          "href"
        );


      if (!href) {
        return;
      }


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
     AGREGAR PRODUCTOS SIN DUPLICADOS
     ========================================================= */

  function agregarAlCatalogo(
    productos
  ) {

    productos.forEach(
      function (producto) {

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
            function (item) {

              return (
                item.url ===
                producto.url
              );

            }
          );


        if (!existe) {

          productosCatalogo.push(
            producto
          );

        }

      }
    );


    actualizarDisponibles();
  }


  /* =========================================================
     ACTUALIZAR DISPONIBLES
     ========================================================= */

  function actualizarDisponibles() {

    const mostrados =
      new Set(
        productosCatalogo
          .filter(function (producto) {

            return (
              producto.mostrado === true
            );

          })
          .map(function (producto) {

            return producto.url;

          })
      );


    productosDisponibles =
      productosCatalogo.filter(
        function (producto) {

          return (
            !mostrados.has(
              producto.url
            )
          );

        }
      );
  }


  /* =========================================================
     OBTENER MARCAS
     ========================================================= */

  async function obtenerMarcas() {

    try {

      /*
       * UNA SOLA PETICION.
       */

      const respuesta =
        await fetch(
          "/" + categoriaActual,
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


      enlaces.forEach(
        function (enlace) {

          const href =
            enlace.getAttribute(
              "href"
            );


          if (!href) {
            return;
          }


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
            categoriaActual.toLowerCase()
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

        }
      );


      return mezclar(
        marcas
      );

    } catch (error) {

      console.warn(
        "[HESPERIA] Error obteniendo marcas",
        error
      );

      return [];
    }
  }


  /* =========================================================
     CARGAR UNA SOLA MARCA
     ========================================================= */

  async function cargarSiguienteMarca() {

    if (cargandoMarca) {
      return false;
    }


    /*
     * Si todavía no tenemos marcas,
     * las obtenemos una sola vez.
     */

    if (
      marcasDisponibles.length === 0
    ) {

      const marcas =
        await obtenerMarcas();


      marcasDisponibles =
        marcas;

    }


    /*
     * Buscar siguiente marca no consultada.
     */

    let marca = null;


    for (
      let i = 0;
      i < marcasDisponibles.length;
      i++
    ) {

      const posible =
        marcasDisponibles[i];


      if (
        !marcasConsultadas.has(
          posible
        )
      ) {

        marca =
          posible;

        break;

      }
    }


    /*
     * No quedan marcas.
     */

    if (!marca) {

      return false;

    }


    marcasConsultadas.add(
      marca
    );


    cargandoMarca =
      true;


    try {

      /*
       * UNA SOLA PETICION.
       */

      const respuesta =
        await fetch(
          marca,
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


        agregarAlCatalogo(
          productos
        );


        /*
         * Mezclamos los nuevos productos.
         */

        productosDisponibles =
          mezclar(
            productosDisponibles
          );

        return true;

      }

    } catch (error) {

      console.warn(
        "[HESPERIA] Error cargando marca:",
        marca
      );

    } finally {

      cargandoMarca =
        false;

    }


    return false;
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

          left:
            -distancia,

          behavior:
            "smooth"

        });

      }
    );


    /*
     * SIGUIENTE
     */

    btnSiguiente.addEventListener(
      "click",
      async function () {

        const distancia =
          obtenerDistanciaPorPagina();


        viewport.scrollBy({

          left:
            distancia,

          behavior:
            "smooth"

        });


        /*
         * Comprobamos después del movimiento.
         */

        setTimeout(
          revisarCarga,
          500
        );

      }
    );


    /*
     * SCROLL MANUAL / SWIPE
     */

    viewport.addEventListener(
      "scroll",
      function () {

        actualizarFlechas();


        clearTimeout(
          timerScroll
        );


        timerScroll =
          setTimeout(
            revisarCarga,
            150
          );

      },
      {
        passive: true
      }
    );


    window.addEventListener(
      "resize",
      actualizarFlechas
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
        grid-template-columns:
          34px
          minmax(0, 1fr)
          34px;
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
        display: block;
        text-decoration: none !important;
        color: #111 !important;
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
        min-height: 17px;
        font-size: 13px;
        line-height: 1.3;
        color: #777;
        text-decoration: line-through;
      }

      .hesperia-card-cuotas {
        margin: 0 0 3px;
        min-height: 17px;
        font-size: 13px;
        line-height: 1.3;
        color: #222;
      }

      .hesperia-card-transfer {
        margin: 0;
        min-height: 18px;
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
          grid-template-columns:
            28px
            minmax(0, 1fr)
            28px;
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
          grid-template-columns:
            25px
            minmax(0, 1fr)
            25px;
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


    tarjeta.dataset.url =
      producto.url;


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
            : ""
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


    return tarjeta;
  }


  /* =========================================================
     OBTENER DATOS / PRECIOS
     ========================================================= */

  async function obtenerDatosProducto(
    producto
  ) {

    const resultado =
      {
        ...producto
      };


    try {

      /*
       * UNA SOLA PETICION.
       */

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

            const distinto =
              precios.find(
                function (precio) {

                  return (
                    precio !==
                    resultado.precioTransferencia
                  );

                }
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


      resultado.precioCuotas =
        resultado.precioNormal ||
        "";

    } catch (error) {

      console.warn(
        "[HESPERIA] Error obteniendo:",
        producto.url
      );

    }


    return resultado;
  }


  /* =========================================================
     ACTUALIZAR TARJETA
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


    if (nombre) {

      nombre.textContent =
        producto.nombre ||
        "";

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
     CARGAR PRECIO DE UNA TARJETA
     ========================================================= */

  async function cargarPrecioTarjeta(
    producto,
    tarjeta
  ) {

    /*
     * Esperamos antes de hacer la petición.
     */

    await esperar(
      CONFIG.pausaEntreProductos
    );


    const datos =
      await obtenerDatosProducto(
        producto
      );


    actualizarTarjeta(
      tarjeta,
      datos
    );
  }


  /* =========================================================
     AGREGAR PRODUCTOS
     ========================================================= */

  async function agregarProductos(
    cantidad
  ) {

    if (cargandoProductos) {
      return;
    }


    actualizarDisponibles();


    /*
     * Si no tenemos suficientes productos,
     * intentamos conseguir UNA marca.
     */

    while (
      productosDisponibles.length <
      cantidad
    ) {

      const cargada =
        await cargarSiguienteMarca();


      if (!cargada) {
        break;
      }


      /*
       * Pausa importante entre marcas.
       */

      await esperar(
        CONFIG.pausaEntreMarcas
      );


      actualizarDisponibles();
    }


    if (
      !productosDisponibles.length
    ) {

      actualizarFlechas();

      return;
    }


    cargandoProductos =
      true;


    const seleccionados =
      productosDisponibles.splice(
        0,
        cantidad
      );


    /*
     * Crear las tarjetas inmediatamente.
     */

    const tareasPrecios = [];


    seleccionados.forEach(
      function (producto) {

        producto.mostrado =
          true;


        const tarjeta =
          crearTarjeta(
            producto
          );


        track.appendChild(
          tarjeta
        );


        /*
         * El precio se carga aparte,
         * uno por uno.
         */

        tareasPrecios.push(
          cargarPrecioTarjeta(
            producto,
            tarjeta
          )
        );

      }
    );


    actualizarFlechas();


    /*
     * Esperamos a que terminen los precios.
     *
     * Importante:
     * las tarjetas YA están visibles.
     */

    await Promise.all(
      tareasPrecios
    );


    cargandoProductos =
      false;


    actualizarDisponibles();
    actualizarFlechas();
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
     * Si todavía hay productos disponibles
     * o podemos consultar otra marca,
     * dejamos activa la flecha.
     */

    const quedanMarcas =
      marcasDisponibles.some(
        function (marca) {

          return (
            !marcasConsultadas.has(
              marca
            )
          );

        }
      );


    if (
      productosDisponibles.length > 0 ||
      quedanMarcas ||
      cargandoProductos ||
      cargandoMarca
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

    if (
      !viewport ||
      cargandoProductos ||
      cargandoMarca
    ) {
      return;
    }


    actualizarDisponibles();


    const maxScroll =
      viewport.scrollWidth -
      viewport.clientWidth;


    const posicion =
      viewport.scrollLeft;


    const restante =
      maxScroll -
      posicion;


    const limite =
      viewport.clientWidth *
      CONFIG.margenCarga;


    /*
     * Solo buscamos más productos cuando
     * realmente estamos cerca del final.
     */

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
     INICIAR
     ========================================================= */

  async function iniciar() {

    /*
     * Solo producto.
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
     * Crear interfaz.
     */

    crearContenedor();


    /*
     * =====================================================
     * ÚNICA PETICIÓN INICIAL
     * =====================================================
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
        !respuesta.ok
      ) {

        console.warn(
          "[HESPERIA] Categoría:",
          respuesta.status
        );

        return;
      }


      const html =
        await respuesta.text();


      /*
       * Extraemos los productos.
       */

      const productos =
        extraerProductos(
          html,
          categoriaActual
        );


      /*
       * Mezclamos.
       */

      agregarAlCatalogo(
        mezclar(
          productos
        )
      );


      /*
       * =================================================
       * MOSTRAR PRIMEROS 8
       * =================================================
       */

      await agregarProductos(
        CONFIG.iniciales
      );


      actualizarFlechas();


    } catch (error) {

      console.error(
        "[HESPERIA] Error inicial:",
        error
      );

    }
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
