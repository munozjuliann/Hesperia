(function () {
    "use strict";

    const CATEGORIAS = {
        arabes: "/fragancias-arabes",
        disenador: "/fragancias-disenador"
    };

    function obtenerCategoria() {
        const path = window.location.pathname;

        if (path.includes("/fragancias-arabes/")) {
            return CATEGORIAS.arabes;
        }

        if (path.includes("/fragancias-disenador/")) {
            return CATEGORIAS.disenador;
        }

        return null;
    }

    function mezclar(array) {
        const copia = [...array];

        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }

        return copia;
    }

    function limpiarNombre(nombre) {
        return nombre
            .replace(/^Producto\s*-\s*/i, "")
            .replace(/\s*-\s*[01]\s*$/i, "")
            .trim();
    }

    async function obtenerProductos(categoria) {
        try {
            const respuesta = await fetch(
                categoria + "?hesperia=" + Date.now(),
                { cache: "no-store" }
            );

            if (!respuesta.ok) return [];

            const html = await respuesta.text();

            const parser = new DOMParser();
            const documento = parser.parseFromString(html, "text/html");

            const productos = [];
            const vistos = new Set();

            documento
                .querySelectorAll("img[alt^='Producto -']")
                .forEach(function (imagen) {

                    const enlace = imagen.closest("a");

                    if (!enlace) return;

                    const url = enlace.href;

                    if (!url) return;

                    const urlLimpia =
                        url.split("?")[0].replace(/\/$/, "");

                    if (vistos.has(urlLimpia)) return;

                    vistos.add(urlLimpia);

                    productos.push({
                        url: urlLimpia,
                        nombre: limpiarNombre(imagen.alt || ""),
                        imagen: imagen.src
                    });
                });

            return productos;

        } catch (error) {
            console.error(
                "HESPERIA - Error productos:",
                error
            );

            return [];
        }
    }

    async function obtenerPrecios(url) {
        try {

            const respuesta = await fetch(
                url + "?hesperia_precio=" + Date.now(),
                { cache: "no-store" }
            );

            if (!respuesta.ok) {
                return {
                    cuotas: "",
                    transferencia: ""
                };
            }

            const html = await respuesta.text();

            const parser = new DOMParser();
            const documento =
                parser.parseFromString(html, "text/html");

            const precios = [];

            documento
                .querySelectorAll("body *")
                .forEach(function (elemento) {

                    const texto =
                        (elemento.textContent || "").trim();

                    if (
                        /^\$\s*[\d.,]+$/.test(texto) &&
                        !precios.includes(texto)
                    ) {
                        precios.push(texto);
                    }
                });

            const numericos = precios
                .map(function (precio) {

                    const numero = parseFloat(
                        precio
                            .replace("$", "")
                            .replace(/\./g, "")
                            .replace(",", ".")
                    );

                    return {
                        texto: precio,
                        numero: numero
                    };
                })
                .filter(function (item) {
                    return !isNaN(item.numero);
                });

            numericos.sort(function (a, b) {
                return b.numero - a.numero;
            });

            return {
                cuotas: numericos[0]
                    ? numericos[0].texto
                    : "",

                transferencia: numericos.length > 1
                    ? numericos[numericos.length - 1].texto
                    : ""
            };

        } catch (error) {

            console.error(
                "HESPERIA - Error precios:",
                error
            );

            return {
                cuotas: "",
                transferencia: ""
            };
        }
    }

    function crearEstilos() {

        if (
            document.getElementById(
                "hesperia-recomendados-css"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id =
            "hesperia-recomendados-css";

        style.textContent = `

        #hesperia-recomendados {
            width: 100%;
            margin: 60px auto 45px;
            padding: 0 10px;
            box-sizing: border-box;
        }

        #hesperia-recomendados .hesperia-titulo {
            text-align: center;
            margin-bottom: 30px;
        }

        #hesperia-recomendados .hesperia-titulo h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 500;
            letter-spacing: .3px;
        }

        #hesperia-recomendados .hesperia-titulo p {
            margin: 7px 0 0;
            font-size: 13px;
            opacity: .6;
        }

        #hesperia-recomendados .hesperia-carrusel {
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
            padding: 3px 3px 15px;
            overscroll-behavior-x: contain;
        }

        #hesperia-recomendados .hesperia-track::-webkit-scrollbar {
            display: none;
        }

        #hesperia-recomendados .hesperia-card {
            flex: 0 0 calc((100% - 60px) / 4);
            min-width: 0;
            color: inherit;
            text-decoration: none;
            box-sizing: border-box;
        }

        #hesperia-recomendados .hesperia-imagen {
            width: 100%;
            aspect-ratio: 1 / 1;
            background: #f7f7f7;
            overflow: hidden;
            margin-bottom: 13px;
        }

        #hesperia-recomendados .hesperia-imagen img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            transition: transform .35s ease;
        }

        #hesperia-recomendados .hesperia-card:hover
        .hesperia-imagen img {
            transform: scale(1.04);
        }

        #hesperia-recomendados .hesperia-nombre {
            font-size: 13px;
            line-height: 1.35;
            min-height: 36px;
            margin-bottom: 10px;
        }

        #hesperia-recomendados .hesperia-precio {
            margin-top: 5px;
        }

        #hesperia-recomendados .hesperia-precio-label {
            display: block;
            font-size: 10px;
            line-height: 1.2;
            opacity: .55;
            margin-bottom: 2px;
        }

        #hesperia-recomendados .hesperia-precio-valor {
            display: block;
            font-size: 13px;
            font-weight: 600;
        }

        #hesperia-recomendados .hesperia-flecha {
            position: absolute;
            top: 42%;
            transform: translateY(-50%);
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1px solid rgba(0,0,0,.15);
            background: rgba(255,255,255,.96);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            font-size: 22px;
            line-height: 1;
            padding: 0;
        }

        #hesperia-recomendados
        .hesperia-flecha-izq {
            left: -18px;
        }

        #hesperia-recomendados
        .hesperia-flecha-der {
            right: -18px;
        }

        @media (max-width: 900px) {

            #hesperia-recomendados .hesperia-card {
                flex: 0 0 calc((100% - 20px) / 2);
            }

            #hesperia-recomendados .hesperia-flecha-izq {
                left: 4px;
            }

            #hesperia-recomendados .hesperia-flecha-der {
                right: 4px;
            }
        }

        @media (max-width: 600px) {

            #hesperia-recomendados {
                margin-top: 40px;
                padding-left: 8px;
                padding-right: 8px;
            }

            #hesperia-recomendados
            .hesperia-titulo {
                margin-bottom: 22px;
            }

            #hesperia-recomendados
            .hesperia-titulo h2 {
                font-size: 20px;
            }

            #hesperia-recomendados
            .hesperia-titulo p {
                font-size: 12px;
            }

            #hesperia-recomendados
            .hesperia-track {
                gap: 12px;
            }

            #hesperia-recomendados
            .hesperia-card {
                flex: 0 0 calc((100% - 12px) / 2);
            }

            #hesperia-recomendados
            .hesperia-nombre {
                font-size: 12px;
            }

            #hesperia-recomendados
            .hesperia-precio-label {
                font-size: 9px;
            }

            #hesperia-recomendados
            .hesperia-precio-valor {
                font-size: 12px;
            }

            #hesperia-recomendados
            .hesperia-flecha {
                width: 32px;
                height: 32px;
                font-size: 18px;
            }
        }

        `;

        document.head.appendChild(style);
    }

    function crearTarjeta(producto, precios) {

        const tarjeta =
            document.createElement("a");

        tarjeta.className =
            "hesperia-card";

        tarjeta.href =
            producto.url;

        tarjeta.innerHTML = `

            <div class="hesperia-imagen">

                <img
                    src="${producto.imagen}"
                    alt="${producto.nombre}"
                    loading="lazy">

            </div>

            <div class="hesperia-nombre">
                ${producto.nombre}
            </div>

            ${
                precios.cuotas
                    ? `
                    <div class="hesperia-precio">

                        <span class="hesperia-precio-label">
                            3 cuotas sin interés
                        </span>

                        <span class="hesperia-precio-valor">
                            ${precios.cuotas}
                        </span>

                    </div>
                    `
                    : ""
            }

            ${
                precios.transferencia
                    ? `
                    <div class="hesperia-precio">

                        <span class="hesperia-precio-label">
                            Transferencia
                        </span>

                        <span class="hesperia-precio-valor">
                            ${precios.transferencia}
                        </span>

                    </div>
                    `
                    : ""
            }

        `;

        return tarjeta;
    }

    async function crearRecomendados() {

        if (
            document.getElementById(
                "hesperia-recomendados"
            )
        ) {
            return;
        }

        const productoPrincipal =
            document.querySelector(
                ".product-vip"
            );

        if (!productoPrincipal) return;

        const categoria =
            obtenerCategoria();

        if (!categoria) return;

        crearEstilos();

        const todos =
            await obtenerProductos(categoria);

        if (!todos.length) return;

        const actual =
            window.location.href
                .split("?")[0]
                .replace(/\/$/, "");

        /*
         * Eliminamos el producto actual
         */

        let disponibles =
            todos.filter(function (producto) {

                return producto.url !== actual;

            });

        /*
         * Orden aleatorio diferente
         * cada vez que se carga la página.
         */

        disponibles =
            mezclar(disponibles);

        if (!disponibles.length) return;

        /*
         * Creamos la sección.
         */

        const seccion =
            document.createElement("section");

        seccion.id =
            "hesperia-recomendados";

        seccion.innerHTML = `

            <div class="hesperia-titulo">

                <h2>
                    También te puede interesar
                </h2>

                <p>
                    Descubrí otras fragancias
                </p>

            </div>

            <div class="hesperia-carrusel">

                <button
                    type="button"
                    class="hesperia-flecha
                           hesperia-flecha-izq"
                    aria-label="Anterior">
                    ‹
                </button>

                <div class="hesperia-track"></div>

                <button
                    type="button"
                    class="hesperia-flecha
                           hesperia-flecha-der"
                    aria-label="Siguiente">
                    ›
                </button>

            </div>
        `;

        productoPrincipal.insertAdjacentElement(
            "afterend",
            seccion
        );

        const track =
            seccion.querySelector(
                ".hesperia-track"
            );

        const izquierda =
            seccion.querySelector(
                ".hesperia-flecha-izq"
            );

        const derecha =
            seccion.querySelector(
                ".hesperia-flecha-der"
            );

        /*
         * Obtenemos precios.
         */

        const productosConPrecio =
            await Promise.all(

                disponibles.map(
                    async function (producto) {

                        const precios =
                            await obtenerPrecios(
                                producto.url
                            );

                        return {
                            producto: producto,
                            precios: precios
                        };

                    }
                )

            );

        /*
         * Para crear un loop REAL:
         *
         * [A B C D E F]
         * [A B C D E F]
         * [A B C D E F]
         *
         * El usuario comienza en
         * el bloque central.
         */

        const bloque1 =
            productosConPrecio;

        const bloque2 =
            productosConPrecio.map(
                function (item) {

                    return {
                        producto: item.producto,
                        precios: item.precios
                    };

                }
            );

        const bloque3 =
            productosConPrecio.map(
                function (item) {

                    return {
                        producto: item.producto,
                        precios: item.precios
                    };

                }
            );

        const bloques = [
            ...bloque1,
            ...bloque2,
            ...bloque3
        ];

        bloques.forEach(
            function (item) {

                track.appendChild(
                    crearTarjeta(
                        item.producto,
                        item.precios
                    )
                );

            }
        );

        /*
         * Esperamos a que el navegador
         * calcule los tamaños.
         */

        requestAnimationFrame(
            function () {

                const tarjetas =
                    track.querySelectorAll(
                        ".hesperia-card"
                    );

                if (!tarjetas.length) return;

                /*
                 * Calculamos el ancho
                 * del primer bloque.
                 */

                let anchoBloque = 0;

                for (
                    let i = 0;
                    i < productosConPrecio.length;
                    i++
                ) {

                    anchoBloque +=
                        tarjetas[i]
                            .getBoundingClientRect()
                            .width;

                }

                const estilo =
                    window.getComputedStyle(
                        track
                    );

                const gap =
                    parseFloat(
                        estilo.gap || "0"
                    );

                anchoBloque +=
                    gap *
                    Math.max(
                        0,
                        productosConPrecio.length - 1
                    );

                /*
                 * Empezamos en el bloque central.
                 */

                track.scrollLeft =
                    anchoBloque;

                /*
                 * Loop instantáneo.
                 */

                let ajustando = false;

                track.addEventListener(
                    "scroll",
                    function () {

                        if (ajustando) return;

                        const limiteSuperior =
                            anchoBloque * 1.5;

                        const limiteInferior =
                            anchoBloque * 0.5;

                        if (
                            track.scrollLeft >
                            limiteSuperior
                        ) {

                            ajustando = true;

                            track.scrollLeft -=
                                anchoBloque;

                            requestAnimationFrame(
                                function () {
                                    ajustando = false;
                                }
                            );

                        }

                        else if (
                            track.scrollLeft <
                            limiteInferior
                        ) {

                            ajustando = true;

                            track.scrollLeft +=
                                anchoBloque;

                            requestAnimationFrame(
                                function () {
                                    ajustando = false;
                                }
                            );

                        }

                    },
                    {
                        passive: true
                    }
                );

            }
        );

        /*
         * Flechas.
         */

        function mover(direccion) {

            const tarjeta =
                track.querySelector(
                    ".hesperia-card"
                );

            if (!tarjeta) return;

            const estilo =
                window.getComputedStyle(
                    track
                );

            const gap =
                parseFloat(
                    estilo.gap || "0"
                );

            const distancia =
                tarjeta.getBoundingClientRect()
                    .width +
                gap;

            track.scrollBy({

                left:
                    direccion *
                    distancia *
                    4,

                behavior:
                    "smooth"

            });

        }

        izquierda.addEventListener(
            "click",
            function () {
                mover(-1);
            }
        );

        derecha.addEventListener(
            "click",
            function () {
                mover(1);
            }
        );
    }

    /*
     * Esperar a que cargue el producto.
     */

    let intentos = 0;

    const espera =
        setInterval(
            function () {

                intentos++;

                if (
                    document.querySelector(
                        ".product-vip"
                    )
                ) {

                    clearInterval(
                        espera
                    );

                    crearRecomendados();

                }

                if (intentos >= 60) {
                    clearInterval(
                        espera
                    );
                }

            },
            500
        );

})();
