(function () {
  "use strict";

  /* =========================================================
     HESPERIA - PRODUCTOS RECOMENDADOS
     ========================================================= */

  const CONFIG = {
    iniciales: 8,
    porCarga: 4,

    catalogoObjetivo: 60,

    pausaMarcas: 450,
    pausaProductos: 350,

    maxMarcasAConsultar: 12
  };

  let productosCatalogo = [];
  let productosMostrados = new Set();
  let productosDisponibles = [];
  let cargando = false;
  let categoriaActual = "";
  let productoActual = "";
  let todasLasMarcasConsultadas = false;

  /* =========================================================
     UTILIDADES
     ========================================================= */

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function limpiarTexto(texto) {
    return (texto || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizarURL(url) {
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return "";
    }
  }

  function barajar(array) {
    const copia = [...array];

    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [copia[i], copia[j]] =
        [copia[j], copia[i]];
    }

    return copia;
  }

  /* =========================================================
     CONTEXTO
     ========================================================= */

  function detectarContexto() {

    const path =
      window.location.pathname
        .replace(/\/+$/, "");

    if (!document.querySelector(".product-vip")) {
      return null;
    }

    if (
      path.includes(
        "/fragancias-arabes/"
      )
    ) {
      categoriaActual =
        "/fragancias-arabes";

    } else if (
      path.includes(
        "/fragancias-disenador/"
      )
    ) {
      categoriaActual =
        "/fragancias-disenador";

    } else {
      return null;
    }

    productoActual = path;

    return {
      categoria: categoriaActual,
      producto: productoActual
    };
  }

  /* =========================================================
     OBTENER MARCAS
     ========================================================= */

  async function obtenerMarcas(categoria) {

    try {

      const respuesta =
        await fetch(categoria, {
          method: "GET",
          credentials: "same-origin",
          cache: "default"
        });

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

      const marcas = [];
      const vistas = new Set();

      doc.querySelectorAll(
        "a[href]"
      ).forEach(a => {

        const href =
          normalizarURL(
            a.getAttribute("href")
          );

        if (!href) return;

        const url =
          new URL(href);

        const path =
          url.pathname
            .replace(/\/+$/, "");

        if (
          !path.startsWith(
            categoria + "/"
          )
        ) {
          return;
        }

        const resto =
          path
            .slice(
              categoria.length + 1
            )
            .split("/")
            .filter(Boolean);

        if (resto.length !== 1) {
          return;
        }

        if (vistas.has(path)) {
          return;
        }

        vistas.add(path);

        marcas.push(href);
      });

      return barajar(marcas);

    } catch (error) {

      console.warn(
        "Hesperia: error obteniendo marcas",
        error
      );

      return [];
    }
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

    const productos = [];
    const vistos = new Set();

    doc.querySelectorAll(
      "a[href]"
    ).forEach(a => {

      const href =
        normalizarURL(
          a.getAttribute("href")
        );

      if (!href) return;

      const url =
        new URL(href);

      const path =
        url.pathname
          .replace(/\/+$/, "");

      if (
        !path.startsWith(
          categoria + "/"
        )
      ) {
        return;
      }

      const resto =
        path
          .slice(
            categoria.length + 1
          )
          .split("/")
          .filter(Boolean);

      if (resto.length !== 2) {
        return;
      }

      if (vistos.has(path)) {
        return;
      }

      const imagen =
        a.querySelector("img");

      if (!imagen) {
        return;
      }

      let nombre =
        limpiarTexto(
          imagen.getAttribute("alt")
        ) ||
        limpiarTexto(
          a.textContent
        );

      if (!nombre) {

        nombre =
          resto[1]
            .replace(/-/g, " ")
            .replace(
              /\b\w/g,
              letra =>
                letra.toUpperCase()
            );
      }

      vistos.add(path);

      productos.push({
        url: href,
        path: path,
        nombre: nombre,
        imagen:
          imagen.src ||
          imagen.getAttribute(
            "data-src"
          ) ||
          ""
      });

    });

    return productos;
  }

  /* =========================================================
     CATÁLOGO
     ========================================================= */

  async function obtenerCatalogo(
    categoria
  ) {

    const marcas =
      await obtenerMarcas(
        categoria
      );

    if (!marcas.length) {
      return [];
    }

    const catalogo = [];
    const vistos = new Set();

    const marcasMezcladas =
      barajar(marcas);

    const limite =
      Math.min(
        marcasMezcladas.length,
        CONFIG.maxMarcasAConsultar
      );

    for (
      let i = 0;
      i < limite;
      i++
    ) {

      const marcaURL =
        marcasMezcladas[i];

      try {

        const respuesta =
          await fetch(marcaURL, {
            method: "GET",
            credentials: "same-origin",
            cache: "default"
          });

        if (respuesta.ok) {

          const html =
            await respuesta.text();

          const productos =
            extraerProductos(
              html,
              categoria
            );

          productos.forEach(
            producto => {

              if (
                producto.path ===
                productoActual
              ) {
                return;
              }

              if (
                !vistos.has(
                  producto.path
                )
              ) {

                vistos.add(
                  producto.path
                );

                catalogo.push(
                  producto
                );
              }

            }
          );
        }

      } catch (error) {

        console.warn(
          "Hesperia: error leyendo marca",
          error
        );
      }

      await esperar(
        CONFIG.pausaMarcas
      );

      if (
        catalogo.length >=
        CONFIG.catalogoObjetivo
      ) {
        break;
      }
    }

    todasLasMarcasConsultadas =
      true;

    return barajar(catalogo);
  }

  /* =========================================================
     DATOS DEL PRODUCTO
     ========================================================= */

  async function obtenerDatosProducto(
    producto
  ) {

    try {

      const respuesta =
        await fetch(
          producto.url,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "default"
          }
        );

      if (!respuesta.ok) {
        return producto;
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

      const texto =
        limpiarTexto(
          doc.body.textContent
        );

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

        producto.imagen =
          imagen.getAttribute(
            "src"
          ) ||
          imagen.getAttribute(
            "data-src"
          ) ||
          producto.imagen;
      }

      const titulo =
        doc.querySelector(
          ".product-vip h1"
        ) ||
        doc.querySelector("h1");

      if (titulo) {

        producto.nombre =
          limpiarTexto(
            titulo.textContent
          );
      }

      /* TRANSFERENCIA */

      let transferencia = "";

      const matchTransferencia =
        texto.match(
          /Precio final\s*:\s*\$?\s*[\d.]+,\d{2}/i
        );

      if (matchTransferencia) {

        transferencia =
          matchTransferencia[0]
            .replace(
              /.*:\s*/,
              ""
            )
            .trim();
      }

      /* TODOS LOS PRECIOS */

      const precios = [];

      const regexPrecio =
        /\$\s*[\d.]+,\d{2}/g;

      let match;

      while (
        (match =
          regexPrecio.exec(texto))
      !== null) {

        const precio =
          match[0]
            .replace(/\s+/g, "")
            .trim();

        if (
          !precios.includes(
            precio
          )
        ) {
          precios.push(precio);
        }
      }

      /* PRECIO 3 CUOTAS */

      let precioNormal = "";

      const indiceCuotas =
        texto.search(
          /3\s+cuotas\s+sin\s+inter[eé]s/i
        );

      if (
        indiceCuotas !== -1
      ) {

        const antes =
          texto.slice(
            Math.max(
              0,
              indiceCuotas - 250
            ),
            indiceCuotas
          );

        const preciosAntes =
          antes.match(
            /\$\s*[\d.]+,\d{2}/g
          );

        if (
          preciosAntes &&
          preciosAntes.length
        ) {

          precioNormal =
            preciosAntes[
              preciosAntes.length - 1
            ]
              .replace(/\s+/g, "")
              .trim();
        }
      }

      if (!precioNormal) {

        const diferente =
          precios.find(
            precio =>
              precio !==
              transferencia
          );

        if (diferente) {
          precioNormal =
            diferente;
        }
      }

      if (
        !transferencia &&
        precios.length >= 2
      ) {

        precioNormal =
          precios[0];

        transferencia =
          precios[
            precios.length - 1
          ];
      }

      producto.precioNormal =
        precioNormal;

      producto.transferencia =
        transferencia;

      return producto;

    } catch (error) {

      console.warn(
        "Hesperia: error obteniendo producto",
        producto.url
      );

      return producto;
    }
  }

  /* =========================================================
     CONTENEDOR
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

    const contenedor =
      document.createElement(
        "section"
      );

    contenedor.id =
      "hesperia-recomendados";

    contenedor.innerHTML = `

      <div class="hesperia-inner">

        <h2 class="hesperia-titulo">
          También te puede interesar
        </h2>

        <div class="hesperia-carousel">

          <button
            class="hesperia-flecha hesperia-prev"
            type="button"
            aria-label="Anterior"
          >
            ‹
          </button>

          <div class="hesperia-viewport">

            <div class="hesperia-track"></div>

          </div>

          <button
            class="hesperia-flecha hesperia-next"
            type="button"
            aria-label="Siguiente"
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

    crearEstilos();
    activarEventos();
  }

  /* =========================================================
     ESTILOS
     ========================================================= */

  function crearEstilos() {

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
        margin: 50px auto 30px;
        overflow: hidden;
        box-sizing: border-box;
      }

      #hesperia-recomendados * {
        box-sizing: border-box;
      }

      #hesperia-recomendados
      .hesperia-inner {
        width: 100%;
        max-width: 1160px;
        margin: 0 auto;
        padding: 0 20px;
      }

      #hesperia-recomendados
      .hesperia-titulo {
        width: 100%;
        margin: 0 0 28px;
        text-align: center;
        font-size: 24px;
        line-height: 1.3;
        font-weight: 500;
      }

      #hesperia-recomendados
      .hesperia-carousel {
        width: 100%;
        display: grid;
        grid-template-columns:
          34px minmax(0, 1fr) 34px;
        align-items: center;
        column-gap: 10px;
      }

      #hesperia-recomendados
      .hesperia-viewport {
        width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
      }

      #hesperia-recomendados
      .hesperia-viewport::-webkit-scrollbar {
        display: none;
      }

      #hesperia-recomendados
      .hesperia-track {
        display: flex;
        flex-wrap: nowrap;
        gap: 20px;
        width: max-content;
        padding: 3px 2px 12px;
      }

      #hesperia-recomendados
      .hesperia-card {
        flex: 0 0 255px;
        width: 255px;
        min-width: 255px;
        max-width: 255px;

        display: block;

        text-decoration: none;
        color: inherit;

        scroll-snap-align: start;
      }

      #hesperia-recomendados
      .hesperia-card-imagen {
        width: 100%;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 12px;
      }

      #hesperia-recomendados
      .hesperia-card-imagen img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        transition: transform .25s ease;
      }

      #hesperia-recomendados
      .hesperia-card:hover
      .hesperia-card-imagen img {
        transform: scale(1.035);
      }

      #hesperia-recomendados
      .hesperia-card-nombre {
        font-size: 14px;
        line-height: 1.4;
        min-height: 40px;
        margin-bottom: 7px;
        font-weight: 400;
      }

      #hesperia-recomendados
      .hesperia-precio-normal {
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 2px;
      }

      #hesperia-recomendados
      .hesperia-cuotas {
        font-size: 12px;
        line-height: 1.4;
        margin-bottom: 4px;
      }

      #hesperia-recomendados
      .hesperia-transferencia {
        font-size: 14px;
        line-height: 1.4;
        font-weight: 500;
      }

      #hesperia-recomendados
      .hesperia-flecha {
        width: 34px;
        height: 34px;

        padding: 0;
        margin: 0;

        border: 0;
        border-radius: 50%;

        background: transparent;

        cursor: pointer;

        font-size: 30px;
        line-height: 30px;

        display: flex;
        align-items: center;
        justify-content: center;
      }

      #hesperia-recomendados
      .hesperia-flecha:hover {
        opacity: .55;
      }

      @media (max-width: 900px) {

        #hesperia-recomendados
        .hesperia-inner {
          padding: 0 16px;
        }

        #hesperia-recomendados
        .hesperia-carousel {
          grid-template-columns:
            28px minmax(0, 1fr) 28px;

          column-gap: 5px;
        }

        #hesperia-recomendados
        .hesperia-track {
          gap: 14px;
        }

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0
            calc(
              (100vw - 77px) / 2
            );

          width:
            calc(
              (100vw - 77px) / 2
            );

          min-width:
            calc(
              (100vw - 77px) / 2
            );

          max-width:
            calc(
              (100vw - 77px) / 2
            );
        }

      }

      @media (max-width: 600px) {

        #hesperia-recomendados {
          margin-top: 40px;
          overflow: hidden;
        }

        #hesperia-recomendados
        .hesperia-inner {
          padding: 0 10px;
        }

        #hesperia-recomendados
        .hesperia-titulo {
          font-size: 20px;
          margin-bottom: 22px;
        }

        #hesperia-recomendados
        .hesperia-carousel {
          grid-template-columns:
            25px minmax(0, 1fr) 25px;

          column-gap: 3px;
        }

        #hesperia-recomendados
        .hesperia-track {
          gap: 12px;
          padding-left: 1px;
          padding-right: 1px;
        }

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0
            calc(
              (100vw - 70px) / 2
            );

          width:
            calc(
              (100vw - 70px) / 2
            );

          min-width:
            calc(
              (100vw - 70px) / 2
            );

          max-width:
            calc(
              (100vw - 70px) / 2
            );
        }

        #hesperia-recomendados
        .hesperia-flecha {
          width: 25px;
          height: 25px;
          font-size: 24px;
        }

        #hesperia-recomendados
        .hesperia-card-nombre {
          font-size: 13px;
        }

        #hesperia-recomendados
        .hesperia-precio-normal {
          font-size: 12px;
        }

        #hesperia-recomendados
        .hesperia-cuotas {
          font-size: 11px;
        }

        #hesperia-recomendados
        .hesperia-transferencia {
          font-size: 13px;
        }
      }

    `;

    document.head.appendChild(
      style
    );
  }

  /* =========================================================
     TARJETA
     ========================================================= */

  function crearTarjeta(
    producto
  ) {

    const tarjeta =
      document.createElement("a");

    tarjeta.className =
      "hesperia-card";

    tarjeta.href =
      producto.url;

    let preciosHTML = "";

    if (
      producto.precioNormal
    ) {

      preciosHTML += `
        <div class="hesperia-precio-normal">
          ${producto.precioNormal}
        </div>

        <div class="hesperia-cuotas">
          3 cuotas sin interés
        </div>
      `;
    }

    if (
      producto.transferencia
    ) {

      preciosHTML += `
        <div class="hesperia-transferencia">
          ${producto.transferencia}
          con transferencia
        </div>
      `;
    }

    tarjeta.innerHTML = `

      <div class="hesperia-card-imagen">

        <img
          src="${producto.imagen || ""}"
          alt="${producto.nombre}"
          loading="lazy"
        >

      </div>

      <div class="hesperia-card-nombre">
        ${producto.nombre}
      </div>

      ${preciosHTML}

    `;

    return tarjeta;
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

    if (
      !productosDisponibles.length
    ) {
      return;
    }

    cargando = true;

    const track =
      document.querySelector(
        "#hesperia-recomendados .hesperia-track"
      );

    if (!track) {
      cargando = false;
      return;
    }

    let agregados = 0;

    while (
      agregados < cantidad &&
      productosDisponibles.length
    ) {

      const producto =
        productosDisponibles.shift();

      if (!producto) {
        break;
      }

      if (
        productosMostrados.has(
          producto.path
        )
      ) {
        continue;
      }

      const completo =
        await obtenerDatosProducto(
          producto
        );

      productosMostrados.add(
        producto.path
      );

      track.appendChild(
        crearTarjeta(
          completo
        )
      );

      agregados++;

      await esperar(
        CONFIG.pausaProductos
      );
    }

    cargando = false;

    actualizarFlechas();
  }

  /* =========================================================
     CALCULAR DESPLAZAMIENTO
     ========================================================= */

  function obtenerDistanciaPorPagina() {

    const track =
      document.querySelector(
        "#hesperia-recomendados .hesperia-track"
      );

    if (!track) {
      return 0;
    }

    const tarjeta =
      track.querySelector(
        ".hesperia-card"
      );

    if (!tarjeta) {
      return 0;
    }

    const estilo =
      window.getComputedStyle(
        track
      );

    const gap =
      parseFloat(
        estilo.columnGap ||
        estilo.gap ||
        0
      );

    /*
      Desktop:
      4 productos.

      Mobile:
      2 productos.
    */

    const cantidad =
      window.innerWidth <= 900
        ? 2
        : 4;

    return (
      (tarjeta.offsetWidth + gap) *
      cantidad
    );
  }

  /* =========================================================
     FLECHAS
     ========================================================= */

  function actualizarFlechas() {

    const viewport =
      document.querySelector(
        "#hesperia-recomendados .hesperia-viewport"
      );

    const prev =
      document.querySelector(
        "#hesperia-recomendados .hesperia-prev"
      );

    const next =
      document.querySelector(
        "#hesperia-recomendados .hesperia-next"
      );

    if (
      !viewport ||
      !prev ||
      !next
    ) {
      return;
    }

    prev.style.visibility =
      viewport.scrollLeft <= 5
        ? "hidden"
        : "visible";

    const final =
      viewport.scrollWidth -
      viewport.clientWidth -
      viewport.scrollLeft;

    next.style.visibility =
      final <= 5 &&
      !productosDisponibles.length
        ? "hidden"
        : "visible";
  }

  /* =========================================================
     CARGA AUTOMÁTICA
     ========================================================= */

  function revisarCarga() {

    const viewport =
      document.querySelector(
        "#hesperia-recomendados .hesperia-viewport"
      );

    if (!viewport) {
      return;
    }

    if (cargando) {
      return;
    }

    if (
      !productosDisponibles.length
    ) {
      actualizarFlechas();
      return;
    }

    const distancia =
      viewport.scrollWidth -
      viewport.scrollLeft -
      viewport.clientWidth;

    if (
      distancia <
      viewport.clientWidth * 0.8
    ) {

      agregarProductos(
        CONFIG.porCarga
      );
    }
  }

  /* =========================================================
     EVENTOS
     ========================================================= */

  function activarEventos() {

    const viewport =
      document.querySelector(
        "#hesperia-recomendados .hesperia-viewport"
      );

    const prev =
      document.querySelector(
        "#hesperia-recomendados .hesperia-prev"
      );

    const next =
      document.querySelector(
        "#hesperia-recomendados .hesperia-next"
      );

    if (!viewport) {
      return;
    }

    if (prev) {

      prev.addEventListener(
        "click",
        function () {

          const distancia =
            obtenerDistanciaPorPagina();

          if (!distancia) {
            return;
          }

          viewport.scrollBy({
            left: -distancia,
            behavior: "smooth"
          });

        }
      );
    }

    if (next) {

      next.addEventListener(
        "click",
        function () {

          const distancia =
            obtenerDistanciaPorPagina();

          if (!distancia) {
            return;
          }

          viewport.scrollBy({
            left: distancia,
            behavior: "smooth"
          });

        }
      );
    }

    let timeout;

    viewport.addEventListener(
      "scroll",
      function () {

        clearTimeout(timeout);

        timeout =
          setTimeout(
            function () {

              revisarCarga();
              actualizarFlechas();

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

        revisarCarga();
        actualizarFlechas();

      }
    );
  }

  /* =========================================================
     INICIO
     ========================================================= */

  async function iniciar() {

    const contexto =
      detectarContexto();

    if (!contexto) {
      return;
    }

    if (
      document.querySelector(
        "#hesperia-recomendados"
      )
    ) {
      return;
    }

    crearContenedor();

    try {

      productosCatalogo =
        await obtenerCatalogo(
          contexto.categoria
        );

      productosCatalogo =
        productosCatalogo.filter(
          producto =>
            producto.path !==
            contexto.producto
        );

      productosDisponibles =
        barajar(
          productosCatalogo
        );

      await agregarProductos(
        CONFIG.iniciales
      );

      actualizarFlechas();

      setTimeout(
        revisarCarga,
        500
      );

    } catch (error) {

      console.error(
        "Hesperia:",
        error
      );
    }
  }

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
