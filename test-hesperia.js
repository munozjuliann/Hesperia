(function () {
  "use strict";

  const CANTIDAD_INICIAL = 8;
  const CANTIDAD_EXTRA = 4;

  const CATEGORIAS = {
    arabes: "/fragancias-arabes",
    disenador: "/fragancias-disenador"
  };

  /* =========================================================
     UTILIDADES
  ========================================================= */

  function normalizarURL(url) {
    try {
      const u = new URL(url, window.location.origin);

      u.search = "";
      u.hash = "";

      return u.href.replace(/\/$/, "");
    } catch {
      return "";
    }
  }

  function mezclar(array) {
    const copia = [...array];

    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [copia[i], copia[j]] = [
        copia[j],
        copia[i]
      ];
    }

    return copia;
  }

  function escaparHTML(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* =========================================================
     DETECTAR CATEGORÍA DEL PRODUCTO
  ========================================================= */

  function obtenerCategoria() {

    const path =
      window.location.pathname.toLowerCase();

    if (path.includes("/fragancias-arabes/")) {
      return "arabes";
    }

    if (path.includes("/fragancias-disenador/")) {
      return "disenador";
    }

    return null;
  }

  /* =========================================================
     OBTENER HTML
  ========================================================= */

  async function obtenerHTML(url) {

    try {

      const respuesta = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!respuesta.ok) {
        return null;
      }

      return await respuesta.text();

    } catch (error) {

      console.warn(
        "HESPERIA: error cargando",
        url,
        error
      );

      return null;
    }
  }

  /* =========================================================
     OBTENER MARCAS DE LA CATEGORÍA
  ========================================================= */

  async function obtenerMarcas(categoria) {

    const categoriaURL =
      normalizarURL(
        window.location.origin +
        CATEGORIAS[categoria]
      );

    const html =
      await obtenerHTML(categoriaURL);

    if (!html) {
      return [];
    }

    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        html,
        "text/html"
      );

    const marcas = [];
    const vistas = new Set();

    [...doc.querySelectorAll("a[href]")]
      .forEach(a => {

        const href =
          normalizarURL(a.href);

        if (!href) return;

        const url =
          new URL(href);

        const path =
          url.pathname.replace(/\/$/, "");

        const categoriaPath =
          CATEGORIAS[categoria];

        if (
          !path.startsWith(
            categoriaPath + "/"
          )
        ) {
          return;
        }

        const resto =
          path.substring(
            (categoriaPath + "/").length
          );

        /*
         * Una marca tiene solamente un nivel:
         *
         * /fragancias-arabes/afnan
         *
         * Un producto tiene dos:
         *
         * /fragancias-arabes/afnan/9pm
         */

        if (!resto || resto.includes("/")) {
          return;
        }

        if (
          resto === "ver-todo" ||
          resto === "productos"
        ) {
          return;
        }

        if (vistas.has(href)) {
          return;
        }

        vistas.add(href);

        marcas.push(href);

      });

    console.log(
      "HESPERIA: marcas encontradas:",
      marcas.length
    );

    return marcas;
  }

  /* =========================================================
     EXTRAER PRODUCTOS DE UNA PÁGINA
  ========================================================= */

  function extraerProductosDeHTML(
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
    const vistas = new Set();

    const categoriaPath =
      CATEGORIAS[categoria];

    [...doc.querySelectorAll("a[href]")]
      .forEach(a => {

        const href =
          normalizarURL(a.href);

        if (!href) return;

        const url =
          new URL(href);

        const path =
          url.pathname.replace(/\/$/, "");

        if (
          !path.startsWith(
            categoriaPath + "/"
          )
        ) {
          return;
        }

        const resto =
          path.substring(
            (categoriaPath + "/").length
          );

        /*
         * Producto:
         *
         * marca/producto
         */

        const partes =
          resto.split("/");

        if (partes.length !== 2) {
          return;
        }

        if (vistas.has(href)) {
          return;
        }

        const imagen =
          a.querySelector("img");

        if (!imagen) {
          return;
        }

        let nombre = "";

        if (
          imagen.alt &&
          imagen.alt.trim()
        ) {

          nombre =
            imagen.alt
              .replace(
                /^Producto\s*-\s*/i,
                ""
              )
              .trim();
        }

        if (!nombre) {

          nombre =
            a.textContent
              .replace(/\s+/g, " ")
              .trim();
        }

        if (!nombre) {
          return;
        }

        vistas.add(href);

        productos.push({

          url: href,

          nombre: nombre,

          imagen:
            imagen.currentSrc ||
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
     OBTENER CATÁLOGO COMPLETO
  ========================================================= */

  async function obtenerCatalogoCompleto(
    categoria
  ) {

    console.log(
      "HESPERIA: buscando todas las marcas..."
    );

    const marcas =
      await obtenerMarcas(categoria);

    /*
     * También procesamos la categoría general.
     */

    const urls = [
      normalizarURL(
        window.location.origin +
        CATEGORIAS[categoria]
      ),
      ...marcas
    ];

    const todasLasPromesas =
      urls.map(async url => {

        const html =
          await obtenerHTML(url);

        if (!html) {
          return [];
        }

        return extraerProductosDeHTML(
          html,
          categoria
        );
      });

    const resultados =
      await Promise.all(
        todasLasPromesas
      );

    /*
     * Unificar productos y eliminar duplicados.
     */

    const mapa =
      new Map();

    resultados
      .flat()
      .forEach(producto => {

        const url =
          normalizarURL(
            producto.url
          );

        if (!url) return;

        if (!mapa.has(url)) {

          mapa.set(
            url,
            {
              ...producto,
              url
            }
          );
        }

      });

    const catalogo =
      [...mapa.values()];

    console.log(
      "HESPERIA: catálogo total encontrado:",
      catalogo.length
    );

    return catalogo;
  }

  /* =========================================================
     OBTENER DATOS DEL PRODUCTO
  ========================================================= */

  async function obtenerDatosProducto(
    producto
  ) {

    try {

      const html =
        await obtenerHTML(
          producto.url
        );

      if (!html) {
        return null;
      }

      const parser =
        new DOMParser();

      const doc =
        parser.parseFromString(
          html,
          "text/html"
        );

      /* =====================================================
         NOMBRE
      ===================================================== */

      let nombre =
        producto.nombre;

      const titulo =
        doc.querySelector("h1") ||
        doc.querySelector(
          ".product-title"
        );

      if (
        titulo &&
        titulo.textContent.trim()
      ) {

        nombre =
          titulo.textContent
            .replace(/\s+/g, " ")
            .trim();
      }

      /* =====================================================
         IMAGEN
      ===================================================== */

      let imagen =
        producto.imagen;

      const img =
        doc.querySelector(
          'img[alt^="Producto -"]'
        ) ||
        doc.querySelector(
          ".product-image img"
        ) ||
        doc.querySelector(
          ".product-gallery img"
        );

      if (img) {

        imagen =
          img.currentSrc ||
          img.src ||
          img.getAttribute(
            "data-src"
          ) ||
          imagen;
      }

      /* =====================================================
         PRECIOS
      ===================================================== */

      const texto =
        doc.body.innerText || "";

      /*
       * Todas las cantidades con formato:
       *
       * $86.145,12
       */

      const precios =
        texto.match(
          /\$\s*[\d.]+,\d{2}/g
        ) || [];

      const preciosUnicos =
        [...new Set(precios)];

      let precioNormal = "";
      let precioTransferencia = "";

      /* =====================================================
         PRECIO DE TRANSFERENCIA
      ===================================================== */

      /*
       * Buscamos específicamente:
       *
       * Precio final: $68.916,10
       */

      const matchTransferencia =
        texto.match(
          /Precio\s+final\s*:\s*(\$\s*[\d.]+,\d{2})/i
        );

      if (matchTransferencia) {

        precioTransferencia =
          matchTransferencia[1];
      }

      /* =====================================================
         PRECIO NORMAL / 3 CUOTAS
      ===================================================== */

      /*
       * Buscamos el precio que aparece asociado
       * a "3 cuotas".
       *
       * Ejemplo:
       *
       * $86.145,12
       * 3 cuotas sin interés
       */

      const matchCuotas =
        texto.match(
          /(\$\s*[\d.]+,\d{2})[\s\S]{0,200}?3\s+cuotas/i
        );

      if (matchCuotas) {

        precioNormal =
          matchCuotas[1];
      }

      /* =====================================================
         RESPALDO PARA PRECIO NORMAL
      ===================================================== */

      /*
       * Si no encontramos "3 cuotas", buscamos
       * el primer precio que sea diferente
       * al precio de transferencia.
       */

      if (!precioNormal) {

        const precioDiferente =
          preciosUnicos.find(
            precio =>
              precio !==
              precioTransferencia
          );

        if (precioDiferente) {

          precioNormal =
            precioDiferente;
        }
      }

      /*
       * Último respaldo.
       */

      if (
        !precioNormal &&
        preciosUnicos.length
      ) {

        precioNormal =
          preciosUnicos[0];
      }

      /*
       * Si por alguna razón no encontramos
       * transferencia pero tenemos varios precios,
       * intentamos usar el último precio como
       * transferencia.
       */

      if (
        !precioTransferencia &&
        preciosUnicos.length >= 2
      ) {

        precioTransferencia =
          preciosUnicos[
            preciosUnicos.length - 1
          ];
      }

      console.log(
        "HESPERIA:",
        nombre,
        "| cuotas:",
        precioNormal,
        "| transferencia:",
        precioTransferencia
      );

      return {

        ...producto,

        nombre,

        imagen,

        precioNormal,

        precioTransferencia

      };

    } catch (error) {

      console.warn(
        "HESPERIA: error obteniendo producto",
        producto.url,
        error
      );

      return null;
    }
  }

  /* =========================================================
     ESTILOS
  ========================================================= */

  function crearEstilos() {

    if (
      document.getElementById(
        "hesperia-recomendados-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "hesperia-recomendados-style";

    style.textContent = `

      #hesperia-recomendados {
        width: 100%;
        margin: 50px auto 30px;
        position: relative;
      }

      /* ============================
         TÍTULO
      ============================ */

      #hesperia-recomendados
      .hesperia-titulo {
        font-size: 24px;
        font-weight: 500;
        margin: 0 0 25px;
        text-align: center;
      }

      /* ============================
         CONTENEDOR
      ============================ */

      #hesperia-recomendados
      .hesperia-wrapper {
        position: relative;
        width: 100%;
      }

      /* ============================
         CARRUSEL
      ============================ */

      #hesperia-recomendados
      .hesperia-track {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        padding: 5px 0 15px;
      }

      #hesperia-recomendados
      .hesperia-track::-webkit-scrollbar {
        display: none;
      }

      /* ============================
         TARJETAS DESKTOP
      ============================ */

      #hesperia-recomendados
      .hesperia-card {
        flex: 0 0 calc((100% - 90px) / 4);
        max-width: 260px;
        min-width: 0;
        text-decoration: none;
        color: inherit;
      }

      /* ============================
         IMAGEN
      ============================ */

      #hesperia-recomendados
      .hesperia-card img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        display: block;
        background: #fff;
      }

      /* ============================
         NOMBRE
      ============================ */

      #hesperia-recomendados
      .hesperia-name {
        margin-top: 12px;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 500;
      }

      /* ============================
         PRECIO NORMAL
      ============================ */

      #hesperia-recomendados
      .hesperia-price-normal {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 500;
      }

      /* ============================
         PRECIO TRANSFERENCIA
      ============================ */

      #hesperia-recomendados
      .hesperia-price-transfer {
        margin-top: 3px;
        font-size: 13px;
        opacity: .7;
      }

      /* ============================
         FLECHAS
      ============================ */

      #hesperia-recomendados
      .hesperia-arrow {
        position: absolute;
        top: 42%;
        transform: translateY(-50%);
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,.15);
        background: rgba(255,255,255,.95);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 5;
        font-size: 22px;
        line-height: 1;
        box-shadow:
          0 2px 8px rgba(0,0,0,.08);
      }

      #hesperia-recomendados
      .hesperia-arrow-left {
        left: -20px;
      }

      #hesperia-recomendados
      .hesperia-arrow-right {
        right: -20px;
      }

      /* ============================
         TABLET
      ============================ */

      @media (max-width: 1100px) {

        #hesperia-recomendados
        .hesperia-card {
          max-width: 230px;
        }

      }

      /* ============================
         MOBILE
      ============================ */

      @media (max-width: 900px) {

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0 calc((100% - 20px) / 2);
          max-width: none;
        }

        #hesperia-recomendados
        .hesperia-arrow-left {
          left: 5px;
        }

        #hesperia-recomendados
        .hesperia-arrow-right {
          right: 5px;
        }

      }

      /* ============================
         CELULAR
      ============================ */

      @media (max-width: 600px) {

        #hesperia-recomendados {
          margin-top: 35px;
        }

        #hesperia-recomendados
        .hesperia-track {
          gap: 12px;
        }

        #hesperia-recomendados
        .hesperia-card {
          flex: 0 0 calc((100% - 12px) / 2);
          max-width: none;
        }

        #hesperia-recomendados
        .hesperia-titulo {
          font-size: 20px;
          margin-bottom: 18px;
        }

        #hesperia-recomendados
        .hesperia-arrow {
          width: 34px;
          height: 34px;
          font-size: 18px;
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

    tarjeta.innerHTML = `

      <img
        src="${escaparHTML(producto.imagen)}"
        alt="${escaparHTML(producto.nombre)}"
        loading="lazy"
      >

      <div class="hesperia-name">
        ${escaparHTML(producto.nombre)}
      </div>

      ${
        producto.precioNormal
          ? `
            <div class="hesperia-price-normal">
              ${escaparHTML(
                producto.precioNormal
              )}
          `
          : ""
      }

      ${
        producto.precioNormal
          ? `
              <span
                style="
                  font-size:11px;
                  font-weight:400;
                  opacity:.65;
                  margin-left:3px;
                "
              >
                3 cuotas sin interés
              </span>
            </div>
          `
          : ""
      }

      ${
        producto.precioTransferencia
          ? `
            <div class="hesperia-price-transfer">
              ${escaparHTML(
                producto.precioTransferencia
              )}
              con transferencia
            </div>
          `
          : ""
      }

    `;

    return tarjeta;
  }

  /* =========================================================
     INICIAR
  ========================================================= */

  async function iniciar() {

    const categoria =
      obtenerCategoria();

    /*
     * Solo ejecutar en productos de las
     * categorías correspondientes.
     */

    if (!categoria) {
      return;
    }

    /*
     * Evitar duplicar el carrusel.
     */

    if (
      document.getElementById(
        "hesperia-recomendados"
      )
    ) {
      return;
    }

    console.log(
      "HESPERIA: iniciando recomendaciones..."
    );

    console.log(
      "HESPERIA: categoría:",
      categoria
    );

    crearEstilos();

    /*
     * CONTENEDOR DEL PRODUCTO
     */

    const productVip =
      document.querySelector(
        ".product-vip"
      );

    if (!productVip) {

      console.warn(
        "HESPERIA: .product-vip no encontrado"
      );

      return;
    }

    /* =====================================================
       CREAR CARRUSEL
    ===================================================== */

    const bloque =
      document.createElement("section");

    bloque.id =
      "hesperia-recomendados";

    bloque.innerHTML = `

      <div class="hesperia-titulo">
        También te puede interesar
      </div>

      <div class="hesperia-wrapper">

        <button
          class="hesperia-arrow hesperia-arrow-left"
          type="button"
          aria-label="Anterior"
        >
          ‹
        </button>

        <div class="hesperia-track"></div>

        <button
          class="hesperia-arrow hesperia-arrow-right"
          type="button"
          aria-label="Siguiente"
        >
          ›
        </button>

      </div>

    `;

    productVip.parentNode.insertBefore(
      bloque,
      productVip.nextSibling
    );

    const track =
      bloque.querySelector(
        ".hesperia-track"
      );

    const izquierda =
      bloque.querySelector(
        ".hesperia-arrow-left"
      );

    const derecha =
      bloque.querySelector(
        ".hesperia-arrow-right"
      );

    /* =====================================================
       OBTENER CATÁLOGO
    ===================================================== */

    const catalogo =
      await obtenerCatalogoCompleto(
        categoria
      );

    console.log(
      "HESPERIA: TOTAL DEL CATÁLOGO:",
      catalogo.length
    );

    if (!catalogo.length) {

      console.warn(
        "HESPERIA: no se encontraron productos"
      );

      bloque.remove();

      return;
    }

    /* =====================================================
       EXCLUIR PRODUCTO ACTUAL
    ===================================================== */

    const actual =
      normalizarURL(
        window.location.href
      );

    const disponibles =
      catalogo.filter(
        producto =>
          normalizarURL(
            producto.url
          ) !== actual
      );

    /* =====================================================
       MEZCLAR TODO
    ===================================================== */

    const productos =
      mezclar(disponibles);

    let posicion = 0;

    const usados =
      new Set();

    /* =====================================================
       AGREGAR PRODUCTOS
    ===================================================== */

    async function agregarProductos(
      cantidad
    ) {

      const seleccionados = [];

      while (
        seleccionados.length < cantidad &&
        posicion < productos.length
      ) {

        const producto =
          productos[posicion++];

        const url =
          normalizarURL(
            producto.url
          );

        if (usados.has(url)) {
          continue;
        }

        usados.add(url);

        seleccionados.push(
          producto
        );
      }

      if (!seleccionados.length) {
        return;
      }

      /*
       * Obtener datos únicamente de los
       * productos que se van a mostrar.
       */

      const datos =
        await Promise.all(
          seleccionados.map(
            producto =>
              obtenerDatosProducto(
                producto
              )
          )
        );

      datos
        .filter(Boolean)
        .forEach(producto => {

          track.appendChild(
            crearTarjeta(producto)
          );

        });
    }

    /* =====================================================
       PRIMEROS 8
    ===================================================== */

    await agregarProductos(
      CANTIDAD_INICIAL
    );

    /* =====================================================
       FLECHA DERECHA
    ===================================================== */

    derecha.addEventListener(
      "click",
      function () {

        track.scrollBy({

          left:
            track.clientWidth * 0.85,

          behavior:
            "smooth"

        });

      }
    );

    /* =====================================================
       FLECHA IZQUIERDA
    ===================================================== */

    izquierda.addEventListener(
      "click",
      function () {

        track.scrollBy({

          left:
            -track.clientWidth * 0.85,

          behavior:
            "smooth"

        });

      }
    );

    /* =====================================================
       CARGAR MÁS PRODUCTOS
    ===================================================== */

    let cargando = false;

    track.addEventListener(
      "scroll",
      async function () {

        if (cargando) {
          return;
        }

        const distanciaAlFinal =
          track.scrollWidth -
          track.scrollLeft -
          track.clientWidth;

        if (
          distanciaAlFinal <
          track.clientWidth * 2
        ) {

          if (
            posicion >=
            productos.length
          ) {
            return;
          }

          cargando = true;

          await agregarProductos(
            CANTIDAD_EXTRA
          );

          cargando = false;
        }

      }
    );

    console.log(
      "HESPERIA: CARRUSEL LISTO"
    );

  }

  /* =========================================================
     EJECUTAR
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
