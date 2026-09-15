(function () {
  "use strict";

  /* =========================================================
     HESPERIA - PRODUCTOS RECOMENDADOS
     Versión segura para Empretienda
     ========================================================= */

  const CONFIG = {
    iniciales: 8,
    porCarga: 4,

    // Cantidad mínima de productos que queremos descubrir
    catalogoObjetivo: 40,

    // Pausas para evitar demasiadas solicitudes simultáneas
    pausaMarcas: 450,
    pausaProductos: 350,

    maxMarcasAConsultar: 10
  };

  let productosCatalogo = [];
  let productosMostrados = new Set();
  let productosDisponibles = [];
  let cargando = false;
  let categoriaActual = "";
  let productoActual = "";

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
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
  }

  /* =========================================================
     DETECTAR CATEGORÍA Y PRODUCTO ACTUAL
     ========================================================= */

  function detectarContexto() {

    const path = window.location.pathname
      .replace(/\/+$/, "");

    if (!document.querySelector(".product-vip")) {
      return null;
    }

    if (path.includes("/fragancias-arabes/")) {
      categoriaActual = "/fragancias-arabes";
    } else if (path.includes("/fragancias-disenador/")) {
      categoriaActual = "/fragancias-disenador";
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

      const respuesta = await fetch(categoria, {
        method: "GET",
        credentials: "same-origin",
        cache: "default"
      });

      if (!respuesta.ok) {
        console.warn(
          "Hesperia: no se pudo obtener la categoría",
          respuesta.status
        );
        return [];
      }

      const html = await respuesta.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const marcas = [];
      const vistas = new Set();

      doc.querySelectorAll("a[href]").forEach(a => {

        const href = normalizarURL(a.getAttribute("href"));

        if (!href) return;

        const url = new URL(href);
        const path = url.pathname.replace(/\/+$/, "");

        if (!path.startsWith(categoria + "/")) {
          return;
        }

        const resto = path
          .slice(categoria.length + 1)
          .split("/")
          .filter(Boolean);

        // Una sola parte después de la categoría = marca
        if (resto.length !== 1) {
          return;
        }

        if (!vistas.has(path)) {
          vistas.add(path);
          marcas.push(href);
        }

      });

      return barajar(marcas);

    } catch (error) {

      console.error(
        "Hesperia: error obteniendo marcas",
        error
      );

      return [];
    }
  }

  /* =========================================================
     EXTRAER PRODUCTOS DE UNA PÁGINA DE MARCA
     ========================================================= */

  function extraerProductos(html, categoria) {

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const productos = [];
    const vistos = new Set();

    doc.querySelectorAll("a[href]").forEach(a => {

      const href = normalizarURL(a.getAttribute("href"));

      if (!href) return;

      const url = new URL(href);
      const path = url.pathname.replace(/\/+$/, "");

      if (!path.startsWith(categoria + "/")) {
        return;
      }

      const resto = path
        .slice(categoria.length + 1)
        .split("/")
        .filter(Boolean);

      /*
        Producto:
        /fragancias-arabes/marca/producto

        Son exactamente 2 segmentos después
        de la categoría.
      */

      if (resto.length !== 2) {
        return;
      }

      if (vistos.has(path)) {
        return;
      }

      // Intentamos asegurarnos de que realmente sea
      // una tarjeta de producto.
      const imagen = a.querySelector("img");

      if (!imagen) {
        return;
      }

      let nombre =
        limpiarTexto(imagen.getAttribute("alt")) ||
        limpiarTexto(a.textContent);

      if (!nombre) {
        nombre = resto[1]
          .replace(/-/g, " ")
          .replace(/\b\w/g, letra => letra.toUpperCase());
      }

      vistos.add(path);

      productos.push({
        url: href,
        path: path,
        nombre: nombre,
        imagen: imagen.src || imagen.getAttribute("data-src") || ""
      });

    });

    return productos;
  }

  /* =========================================================
     OBTENER CATÁLOGO DE FORMA GRADUAL
     ========================================================= */

  async function obtenerCatalogo(categoria) {

    const marcas = await obtenerMarcas(categoria);

    if (!marcas.length) {
      return [];
    }

    const catalogo = [];
    const vistos = new Set();

    /*
      Mezclamos las marcas para que no siempre
      empiece por las mismas.
    */
    const marcasMezcladas = barajar(marcas);

    /*
      No consultamos las 20 marcas de golpe.
      Vamos consultando hasta tener suficiente catálogo.
    */
    const limite = Math.min(
      marcasMezcladas.length,
      CONFIG.maxMarcasAConsultar
    );

    for (let i = 0; i < limite; i++) {

      const marcaURL = marcasMezcladas[i];

      try {

        const respuesta = await fetch(marcaURL, {
          method: "GET",
          credentials: "same-origin",
          cache: "default"
        });

        if (respuesta.ok) {

          const html = await respuesta.text();

          const productos =
            extraerProductos(html, categoria);

          productos.forEach(producto => {

            if (
              !vistos.has(producto.path) &&
              producto.path !== productoActual
            ) {

              vistos.add(producto.path);
              catalogo.push(producto);

            }

          });

        }

      } catch (error) {

        console.warn(
          "Hesperia: error leyendo marca",
          marcaURL,
          error
        );

      }

      /*
        Pausa entre marcas.
      */
      await esperar(CONFIG.pausaMarcas);

      /*
        Si ya tenemos suficiente catálogo,
        dejamos de hacer solicitudes.
      */
      if (catalogo.length >= CONFIG.catalogoObjetivo) {
        break;
      }
    }

    return barajar(catalogo);
  }

  /* =========================================================
     OBTENER DATOS DEL PRODUCTO
     ========================================================= */

  async function obtenerDatosProducto(producto) {

    try {

      const respuesta = await fetch(producto.url, {
        method: "GET",
        credentials: "same-origin",
        cache: "default"
      });

      if (!respuesta.ok) {
        return producto;
      }

      const html = await respuesta.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const texto = limpiarTexto(doc.body.textContent);

      /*
        Imagen principal
      */

      const imagenPrincipal =
        doc.querySelector(
          ".product-vip img"
        ) ||
        doc.querySelector(
          "main img"
        ) ||
        doc.querySelector(
          "img"
        );

      if (imagenPrincipal) {

        producto.imagen =
          imagenPrincipal.getAttribute("src") ||
          imagenPrincipal.getAttribute("data-src") ||
          producto.imagen;

      }

      /*
        Nombre
      */

      const titulo =
        doc.querySelector(
          ".product-vip h1"
        ) ||
        doc.querySelector(
          "h1"
        );

      if (titulo) {
        producto.nombre =
          limpiarTexto(titulo.textContent);
      }

      /*
        PRECIO TRANSFERENCIA
      */

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

      /*
        Buscar todos los precios
      */

      const precios = [];

      const regexPrecio =
        /\$\s*[\d.]+,\d{2}/g;

      let match;

      while ((match = regexPrecio.exec(texto)) !== null) {

        const precio =
          match[0]
            .replace(/\s+/g, "")
            .trim();

        if (!precios.includes(precio)) {
          precios.push(precio);
        }
      }

      /*
        PRECIO NORMAL / 3 CUOTAS
      */

      let precioNormal = "";

      const indiceCuotas =
        texto.search(
          /3\s+cuotas\s+sin\s+inter[eé]s/i
        );

      if (indiceCuotas !== -1) {

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

      /*
        Fallback:
        si no encontramos el precio
        específicamente junto a las cuotas,
        buscamos uno diferente al de transferencia.
      */

      if (!precioNormal) {

        const diferente =
          precios.find(
            precio =>
              precio !== transferencia
          );

        if (diferente) {
          precioNormal = diferente;
        }
      }

      /*
        Otro fallback.
      */

      if (
        !transferencia &&
        precios.length >= 2
      ) {

        transferencia =
          precios[
            precios.length - 1
          ];

        precioNormal =
          precios[0];
      }

      producto.precioNormal =
        precioNormal || "";

      producto.transferencia =
        transferencia || "";

      producto.cargado = true;

      return producto;

    } catch (error) {

      console.warn(
        "Hesperia: error obteniendo producto",
        producto.url,
        error
      );

      return producto;
    }
  }

  /* =========================================================
     CREAR ESTRUCTURA
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

    const contenedor =
      document.createElement("section");

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
      document.createElement("style");

    style.id =
      "hesperia-recomendados-styles";

    style.textContent = `

      #hesperia-recomendados {
        width: 100%;
        margin: 50px auto 30px;
        box-sizing: border-box;
      }

      #hesperia-recomendados * {
        box-sizing: border-box;
      }

      #hesperia-recomendados
      .hesperia-inner {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }

      #hesperia-recomendados
      .hesperia-titulo {
        margin: 0 0 28px;
        text-align: center;
        font-size: 24px;
        line-height: 1.3;
        font-weight: 500;
      }

      #hesperia-recomendados
      .hesperia-carousel {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
      }

      #hesperia-recomendados
      .hesperia-viewport {
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
        scroll-snap-type: x proximity;
      }

      #hesperia-recomendados
      .hesperia-viewport::-webkit-scrollbar {
        display: none;
      }

      #hesperia-recomendados
      .hesperia-track {
        display: flex;
        gap: 20px;
        width: max-content;
        padding: 3px 2px 10px;
      }

      #hesperia-recomendados
      .hesperia-card {
        flex: 0 0
          calc((min(100vw - 40px, 1160px) - 90px) / 4);

        width: 100%;
        max-width: 255px;
        min-width: 0;

        scroll-snap-align: start;

        text-decoration: none;
        color: inherit;

        display: block;
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
        flex: 0 0 34px;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        font-size: 30px;
        line-height: 30px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }

      #hesperia-recomendados
      .hesperia-flecha:hover {
        opacity: .6;
      }

      @media (max-width: 900px) {

        #hesperia-recomendados
        .hesperia-track {
          gap: 16px;
        }

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0
            calc((100vw - 72px) / 2);

          max-width: none;
        }

      }

      @media (max-width: 600px) {

        #hesperia-recomendados {
          margin-top: 40px;
        }

        #hesperia-recomendados
        .hesperia-inner {
          padding: 0 12px;
        }

        #hesperia-recomendados
        .hesperia-titulo {
          font-size: 20px;
          margin-bottom: 22px;
        }

        #hesperia-recomendados
        .hesperia-carousel {
          gap: 5px;
        }

        #hesperia-recomendados
        .hesperia-track {
          gap: 12px;
        }

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0
            calc((100vw - 42px) / 2);
        }

        #hesperia-recomendados
        .hesperia-flecha {
          flex: 0 0 27px;
          width: 27px;
          height: 27px;
          font-size: 25px;
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
        .hesperia-transferencia {
          font-size: 13px;
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

    let preciosHTML = "";

    if (producto.precioNormal) {

      preciosHTML += `
        <div class="hesperia-precio-normal">
          ${producto.precioNormal}
        </div>

        <div class="hesperia-cuotas">
          3 cuotas sin interés
        </div>
      `;

    }

    if (producto.transferencia) {

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

  async function agregarProductos(cantidad) {

    if (cargando) return;

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

      /*
        Cargar datos de precio.
        Una solicitud por vez.
      */

      const productoCompleto =
        await obtenerDatosProducto(
          producto
        );

      await esperar(
        CONFIG.pausaProductos
      );

      productosMostrados.add(
        producto.path
      );

      const tarjeta =
        crearTarjeta(
          productoCompleto
        );

      track.appendChild(
        tarjeta
      );

      agregados++;
    }

    cargando = false;
  }

  /* =========================================================
     EVENTOS DEL CARRUSEL
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

    if (!viewport) return;

    function mover(direccion) {

      const distancia =
        viewport.clientWidth * 0.85;

      viewport.scrollBy({
        left:
          distancia * direccion,
        behavior: "smooth"
      });
    }

    if (prev) {

      prev.addEventListener(
        "click",
        () => mover(-1)
      );

    }

    if (next) {

      next.addEventListener(
        "click",
        () => mover(1)
      );

    }

    /*
      Cuando el usuario se acerca
      al final, agregamos 4 productos.
    */

    viewport.addEventListener(
      "scroll",
      async () => {

        const distanciaRestante =
          viewport.scrollWidth -
          viewport.scrollLeft -
          viewport.clientWidth;

        if (
          distanciaRestante < 500 &&
          !cargando &&
          productosDisponibles.length
        ) {

          await agregarProductos(
            CONFIG.porCarga
          );

        }

      },
      { passive: true }
    );

  }

  /* =========================================================
     INICIALIZACIÓN
     ========================================================= */

  async function iniciar() {

    const contexto =
      detectarContexto();

    if (!contexto) {
      return;
    }

    /*
      Evitar duplicados.
    */

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

      /*
        Filtro final del producto actual.
      */

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

      /*
        Mostrar los primeros 8.
      */

      await agregarProductos(
        CONFIG.iniciales
      );

    } catch (error) {

      console.error(
        "Hesperia: error general",
        error
      );

    }
  }

  /*
    Esperamos a que la página esté lista.
  */

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
