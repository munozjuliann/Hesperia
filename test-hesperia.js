(function () {
  "use strict";

  const CANTIDAD_INICIAL = 8;
  const CARGAR_CADA_VEZ = 4;

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
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
  }

  function escaparHTML(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&quot;")
      .replace(/"/g, "&quot;");
  }

  /* =========================================================
     DETECTAR CATEGORÍA
  ========================================================= */

  function obtenerCategoria() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/fragancias-arabes/")) {
      return "arabes";
    }

    if (path.includes("/fragancias-disenador/")) {
      return "disenador";
    }

    return null;
  }

  /* =========================================================
     OBTENER PRODUCTOS
  ========================================================= */

  async function obtenerProductosCategoria(categoria) {
    const urlCategoria = CATEGORIAS[categoria];

    try {
      const respuesta = await fetch(urlCategoria, {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!respuesta.ok) {
        throw new Error("No se pudo cargar la categoría");
      }

      const html = await respuesta.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const productos = [];
      const vistos = new Set();

      /*
       * Empretienda muestra las imágenes de producto con
       * alt="Producto - ..."
       */

      const imagenes = [...doc.querySelectorAll('img[alt^="Producto -"]')];

      imagenes.forEach(img => {
        const enlace = img.closest("a");

        if (!enlace) return;

        const href = normalizarURL(enlace.href);

        if (!href) return;

        /*
         * Evitamos enlaces que no sean productos.
         */
        if (
          href.includes("/fragancias-arabes") &&
          href !== normalizarURL(window.location.origin + CATEGORIAS.arabes)
        ) {
          if (!vistos.has(href)) {
            vistos.add(href);

            productos.push({
              url: href,
              imagen: img.src,
              nombre: img.alt.replace(/^Producto\s*-\s*/i, "").trim()
            });
          }
        }

        if (
          href.includes("/fragancias-disenador") &&
          href !== normalizarURL(window.location.origin + CATEGORIAS.disenador)
        ) {
          if (!vistos.has(href)) {
            vistos.add(href);

            productos.push({
              url: href,
              imagen: img.src,
              nombre: img.alt.replace(/^Producto\s*-\s*/i, "").trim()
            });
          }
        }
      });

      /*
       * También buscamos los enlaces de productos directamente.
       * Esto permite recuperar productos aunque la imagen no tenga
       * exactamente el alt esperado.
       */

      [...doc.querySelectorAll("a[href]")].forEach(a => {
        const href = normalizarURL(a.href);

        if (!href) return;

        const esArabe =
          categoria === "arabes" &&
          href.includes("/fragancias-arabes/");

        const esDisenador =
          categoria === "disenador" &&
          href.includes("/fragancias-disenador/");

        if (!esArabe && !esDisenador) return;

        if (href === normalizarURL(window.location.href)) return;

        if (vistos.has(href)) return;

        const img = a.querySelector("img");

        if (!img) return;

        const nombre =
          img.alt?.replace(/^Producto\s*-\s*/i, "").trim() ||
          a.textContent.trim();

        if (!nombre) return;

        vistos.add(href);

        productos.push({
          url: href,
          imagen: img.src,
          nombre: nombre
        });
      });

      return productos;

    } catch (error) {
      console.error("HESPERIA: error obteniendo productos", error);
      return [];
    }
  }

  /* =========================================================
     INFORMACIÓN DEL PRODUCTO
  ========================================================= */

  async function obtenerDatosProducto(producto) {
    try {
      const respuesta = await fetch(producto.url, {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!respuesta.ok) return null;

      const html = await respuesta.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /*
       * Nombre
       */

      let nombre = producto.nombre;

      const titulo =
        doc.querySelector("h1") ||
        doc.querySelector(".product-title") ||
        doc.querySelector("title");

      if (titulo && titulo.textContent.trim()) {
        nombre = titulo.textContent.trim();

        /*
         * Limpiar posibles textos agregados por el sitio.
         */
        nombre = nombre
          .replace(/\s*\|\s*Hesperia parfum.*$/i, "")
          .trim();
      }

      /*
       * Imagen
       */

      let imagen = producto.imagen;

      const imagenProducto =
        doc.querySelector('img[alt^="Producto -"]') ||
        doc.querySelector(".product-image img") ||
        doc.querySelector(".product-gallery img");

      if (imagenProducto?.src) {
        imagen = imagenProducto.src;
      }

      /*
       * Precios
       */

      const texto = doc.body.innerText || "";

      const precios = [];

      const regexPrecio = /\$\s*[\d.]+,\d{2}/g;
      const encontrados = texto.match(regexPrecio) || [];

      encontrados.forEach(precio => {
        if (!precios.includes(precio)) {
          precios.push(precio);
        }
      });

      /*
       * En Hesperia el primer precio es transferencia
       * y el segundo es precio normal / cuotas.
       */

      let precioTransferencia = precios[0] || "";
      let precioNormal = precios[1] || "";

      /*
       * Si encontramos el texto "Precio final", intentamos
       * localizar el precio posterior.
       */

      const matchFinal = texto.match(
        /Precio\s+final\s*:\s*(\$\s*[\d.]+,\d{2})/i
      );

      if (matchFinal) {
        precioTransferencia = matchFinal[1];
      }

      /*
       * Si por alguna razón solo apareció un precio,
       * usamos ese mismo como precio principal.
       */

      if (!precioNormal && precioTransferencia) {
        precioNormal = precioTransferencia;
      }

      return {
        ...producto,
        nombre,
        imagen,
        precioTransferencia,
        precioNormal
      };

    } catch (error) {
      console.warn("HESPERIA: no se pudo obtener", producto.url);
      return null;
    }
  }

  /* =========================================================
     CREAR ESTILOS
  ========================================================= */

  function crearEstilos() {
    if (document.getElementById("hesperia-recomendados-style")) return;

    const style = document.createElement("style");

    style.id = "hesperia-recomendados-style";

    style.textContent = `
      #hesperia-recomendados {
        width: 100%;
        margin: 50px auto 30px;
        position: relative;
      }

      #hesperia-recomendados .hesperia-titulo {
        font-size: 24px;
        font-weight: 500;
        margin: 0 0 25px;
        text-align: left;
      }

      #hesperia-recomendados .hesperia-wrapper {
        position: relative;
        width: 100%;
      }

      #hesperia-recomendados .hesperia-track {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        padding: 5px 0 15px;
      }

      #hesperia-recomendados .hesperia-track::-webkit-scrollbar {
        display: none;
      }

      #hesperia-recomendados .hesperia-card {
        flex: 0 0 calc((100% - 60px) / 4);
        min-width: 0;
        text-decoration: none;
        color: inherit;
      }

      #hesperia-recomendados .hesperia-card img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        display: block;
        background: #fff;
      }

      #hesperia-recomendados .hesperia-name {
        margin-top: 12px;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 500;
      }

      #hesperia-recomendados .hesperia-price-normal {
        margin-top: 6px;
        font-size: 14px;
      }

      #hesperia-recomendados .hesperia-price-transfer {
        margin-top: 3px;
        font-size: 13px;
        opacity: .7;
      }

      #hesperia-recomendados .hesperia-arrow {
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
        box-shadow: 0 2px 8px rgba(0,0,0,.08);
      }

      #hesperia-recomendados .hesperia-arrow-left {
        left: -20px;
      }

      #hesperia-recomendados .hesperia-arrow-right {
        right: -20px;
      }

      @media (max-width: 900px) {
        #hesperia-recomendados .hesperia-card {
          flex: 0 0 calc((100% - 20px) / 2);
        }

        #hesperia-recomendados .hesperia-arrow-left {
          left: 5px;
        }

        #hesperia-recomendados .hesperia-arrow-right {
          right: 5px;
        }
      }

      @media (max-width: 600px) {
        #hesperia-recomendados {
          margin-top: 35px;
        }

        #hesperia-recomendados .hesperia-track {
          gap: 12px;
        }

        #hesperia-recomendados .hesperia-card {
          flex: 0 0 calc((100% - 12px) / 2);
        }

        #hesperia-recomendados .hesperia-titulo {
          font-size: 20px;
          margin-bottom: 18px;
        }

        #hesperia-recomendados .hesperia-arrow {
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
    const tarjeta = document.createElement("a");

    tarjeta.className = "hesperia-card";
    tarjeta.href = producto.url;

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
          ? `<div class="hesperia-price-normal">
              ${escaparHTML(producto.precioNormal)}
             </div>`
          : ""
      }

      ${
        producto.precioTransferencia
          ? `<div class="hesperia-price-transfer">
              ${escaparHTML(producto.precioTransferencia)} con transferencia
             </div>`
          : ""
      }
    `;

    return tarjeta;
  }

  /* =========================================================
     INICIALIZAR
  ========================================================= */

  async function iniciar() {

    /*
     * Solo ejecutar dentro de productos individuales.
     */

    const categoria = obtenerCategoria();

    if (!categoria) {
      console.log("HESPERIA: no es una página de producto.");
      return;
    }

    /*
     * Evitar duplicados.
     */

    if (document.getElementById("hesperia-recomendados")) {
      return;
    }

    console.log("HESPERIA: iniciando recomendaciones...");
    console.log("HESPERIA: categoría:", categoria);

    crearEstilos();

    /*
     * Buscar el contenedor principal del producto.
     */

    const productVip = document.querySelector(".product-vip");

    if (!productVip) {
      console.warn("HESPERIA: no se encontró .product-vip");
      return;
    }

    /*
     * Crear contenedor.
     */

    const bloque = document.createElement("section");

    bloque.id = "hesperia-recomendados";

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

    /*
     * Lo colocamos después del producto.
     */

    productVip.parentNode.insertBefore(
      bloque,
      productVip.nextSibling
    );

    const track = bloque.querySelector(".hesperia-track");

    const botonIzquierda = bloque.querySelector(
      ".hesperia-arrow-left"
    );

    const botonDerecha = bloque.querySelector(
      ".hesperia-arrow-right"
    );

    /*
     * Obtener catálogo.
     */

    const catalogo = await obtenerProductosCategoria(categoria);

    console.log(
      "HESPERIA: productos encontrados:",
      catalogo.length
    );

    if (!catalogo.length) {
      bloque.remove();
      return;
    }

    /*
     * Eliminar producto actual.
     */

    const actual = normalizarURL(window.location.href);

    const disponibles = catalogo.filter(
      producto => normalizarURL(producto.url) !== actual
    );

    /*
     * Mezclar TODO lo obtenido.
     */

    const productosAleatorios = mezclar(disponibles);

    /*
     * Evitar productos repetidos.
     */

    const usados = new Set();

    /*
     * Función para obtener un grupo de productos.
     */

    async function agregarProductos(cantidad) {

      const candidatos = productosAleatorios.filter(
        producto => !usados.has(normalizarURL(producto.url))
      );

      if (!candidatos.length) {
        return;
      }

      const seleccionados = candidatos.slice(0, cantidad);

      seleccionados.forEach(producto => {
        usados.add(normalizarURL(producto.url));
      });

      /*
       * Cargar precios únicamente de los productos
       * que realmente vamos a mostrar.
       */

      const datos = await Promise.all(
        seleccionados.map(producto =>
          obtenerDatosProducto(producto)
        )
      );

      datos
        .filter(Boolean)
        .forEach(producto => {
          track.appendChild(crearTarjeta(producto));
        });
    }

    /*
     * Cargar las primeras 8.
     */

    await agregarProductos(CANTIDAD_INICIAL);

    /*
     * Flecha derecha.
     */

    botonDerecha.addEventListener("click", function () {

      const distancia =
        track.clientWidth * 0.85;

      track.scrollBy({
        left: distancia,
        behavior: "smooth"
      });
    });

    /*
     * Flecha izquierda.
     */

    botonIzquierda.addEventListener("click", function () {

      const distancia =
        track.clientWidth * 0.85;

      track.scrollBy({
        left: -distancia,
        behavior: "smooth"
      });
    });

    /*
     * Cargar más productos cuando el usuario
     * se acerca al final.
     */

    let cargando = false;

    track.addEventListener("scroll", async function () {

      if (cargando) return;

      const distanciaAlFinal =
        track.scrollWidth -
        track.scrollLeft -
        track.clientWidth;

      if (distanciaAlFinal < track.clientWidth * 2) {

        const quedan =
          productosAleatorios.filter(
            producto =>
              !usados.has(normalizarURL(producto.url))
          );

        if (!quedan.length) return;

        cargando = true;

        await agregarProductos(CARGAR_CADA_VEZ);

        cargando = false;
      }
    });

    console.log(
      "HESPERIA: carrusel iniciado correctamente."
    );
  }

  /* =========================================================
     ESPERAR DOM
  ========================================================= */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );

  } else {

    iniciar();

  }

})();
