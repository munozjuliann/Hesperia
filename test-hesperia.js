(function () {

    console.log("HESPERIA RECOMENDADOS - INICIANDO");


    /* =========================================================
       CONFIGURACIÓN
    ========================================================= */

    const CANTIDAD_INICIAL = 8;


    /* =========================================================
       MEZCLAR PRODUCTOS ALEATORIAMENTE
    ========================================================= */

    function mezclar(array) {

        const copia = [...array];

        for (let i = copia.length - 1; i > 0; i--) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [copia[i], copia[j]] =
                [copia[j], copia[i]];

        }

        return copia;
    }


    /* =========================================================
       CONVERTIR PRECIO A NÚMERO
    ========================================================= */

    function numeroPrecio(texto) {

        if (!texto) {
            return NaN;
        }

        return parseFloat(
            texto
                .replace("$", "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
        );

    }


    /* =========================================================
       ESPERAR AL PRODUCTO
    ========================================================= */

    function esperarProducto() {

        const producto =
            document.querySelector(".product-vip");

        if (!producto) {

            setTimeout(
                esperarProducto,
                500
            );

            return;
        }

        iniciar(producto);
    }


    /* =========================================================
       DETECTAR CATEGORÍA
    ========================================================= */

    function obtenerCategoria() {

        const pathname =
            window.location.pathname;


        if (
            pathname.includes(
                "/fragancias-arabes/"
            )
        ) {

            return "/fragancias-arabes";

        }


        if (
            pathname.includes(
                "/fragancias-disenador/"
            )
        ) {

            return "/fragancias-disenador";

        }


        return null;
    }


    /* =========================================================
       OBTENER TODOS LOS PRODUCTOS DE LA CATEGORÍA
    ========================================================= */

    async function obtenerProductosCategoria(
        categoria
    ) {

        try {

            const respuesta =
                await fetch(categoria);


            if (!respuesta.ok) {

                throw new Error(
                    "No se pudo cargar la categoría"
                );

            }


            const html =
                await respuesta.text();


            const documento =
                new DOMParser()
                    .parseFromString(
                        html,
                        "text/html"
                    );


            const productos = [];


            documento
                .querySelectorAll("img")
                .forEach(function (imagen) {

                    const alt =
                        imagen.getAttribute("alt")
                        || "";


                    /*
                     * Solamente tomamos imágenes
                     * correspondientes a productos.
                     */

                    if (
                        !alt
                            .toLowerCase()
                            .startsWith(
                                "producto -"
                            )
                    ) {

                        return;

                    }


                    const enlace =
                        imagen.closest("a");


                    if (!enlace) {
                        return;
                    }


                    const href =
                        enlace.getAttribute(
                            "href"
                        );


                    if (!href) {
                        return;
                    }


                    const url =
                        new URL(
                            href,
                            window.location.origin
                        ).href;


                    let nombre =
                        alt
                            .replace(
                                /^Producto\s*-\s*/i,
                                ""
                            )
                            .replace(
                                /\s*-\s*\d+$/,
                                ""
                            )
                            .trim();


                    if (!nombre) {

                        nombre =
                            "Producto";

                    }


                    productos.push({

                        nombre:
                            nombre,

                        url:
                            url,

                        imagen:
                            imagen.getAttribute(
                                "src"
                            )

                    });

                });


            /* =================================================
               ELIMINAR DUPLICADOS
            ================================================= */

            const unicos = [];

            const urls =
                new Set();


            productos.forEach(function (producto) {

                if (
                    !urls.has(
                        producto.url
                    )
                ) {

                    urls.add(
                        producto.url
                    );

                    unicos.push(
                        producto
                    );

                }

            });


            /* =================================================
               EXCLUIR PRODUCTO ACTUAL
            ================================================= */

            const actual =
                window.location.href
                    .split("?")[0];


            const disponibles =
                unicos.filter(function (producto) {

                    return (
                        producto.url
                            .split("?")[0]
                        !== actual
                    );

                });


            console.log(
                "HESPERIA - TOTAL DE PRODUCTOS DISPONIBLES:",
                disponibles.length
            );


            return disponibles;


        } catch (error) {

            console.error(
                "HESPERIA - ERROR OBTENIENDO PRODUCTOS:",
                error
            );


            return [];

        }

    }


    /* =========================================================
       OBTENER PRECIOS
    ========================================================= */

    async function obtenerPrecios(url) {

        try {

            const respuesta =
                await fetch(url);


            if (!respuesta.ok) {

                return {

                    cuotas: "",
                    transferencia: ""

                };

            }


            const html =
                await respuesta.text();


            const documento =
                new DOMParser()
                    .parseFromString(
                        html,
                        "text/html"
                    );


            const precios = [];


            documento
                .querySelectorAll("body *")
                .forEach(function (elemento) {

                    const texto =
                        (
                            elemento.textContent
                            || ""
                        ).trim();


                    if (
                        /^\$\s*[\d.,]+$/.test(
                            texto
                        )
                        &&
                        !precios.includes(
                            texto
                        )
                    ) {

                        precios.push(
                            texto
                        );

                    }

                });


            const numericos =
                precios
                    .map(function (texto) {

                        return {

                            texto:
                                texto,

                            numero:
                                numeroPrecio(
                                    texto
                                )

                        };

                    })
                    .filter(function (precio) {

                        return !isNaN(
                            precio.numero
                        );

                    });


            /*
             * Ordenar de mayor a menor.
             *
             * Mayor = precio de cuotas.
             * Menor = precio de transferencia.
             */

            numericos.sort(
                function (a, b) {

                    return (
                        b.numero
                        -
                        a.numero
                    );

                }
            );


            return {

                cuotas:
                    numericos[0]
                        ? numericos[0].texto
                        : "",

                transferencia:
                    numericos.length > 1
                        ? numericos[
                            numericos.length - 1
                          ].texto
                        : ""

            };


        } catch (error) {

            console.error(
                "HESPERIA - ERROR OBTENIENDO PRECIO:",
                url,
                error
            );


            return {

                cuotas: "",
                transferencia: ""

            };

        }

    }


    /* =========================================================
       CREAR TARJETA
    ========================================================= */

    function crearTarjeta(
        producto,
        precios
    ) {

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
                    loading="lazy"
                >

            </div>


            <div class="hesperia-info">

                <div class="hesperia-nombre">

                    ${producto.nombre}

                </div>


                ${
                    precios.cuotas
                    ?
                    `

                        <div class="hesperia-precio-label">

                            3 cuotas sin interés

                        </div>


                        <div class="hesperia-precio">

                            ${precios.cuotas}

                        </div>

                    `
                    :
                    ""
                }


                ${
                    precios.transferencia
                    ?
                    `

                        <div class="hesperia-transferencia-label">

                            Transferencia

                        </div>


                        <div class="hesperia-transferencia">

                            ${precios.transferencia}

                        </div>

                    `
                    :
                    ""
                }

            </div>

        `;


        return tarjeta;

    }


    /* =========================================================
       INICIAR
    ========================================================= */

    async function iniciar(
        productoPrincipal
    ) {

        /*
         * Evitar crear el carrusel dos veces.
         */

        if (
            document.querySelector(
                "#hesperia-recomendados"
            )
        ) {

            return;

        }


        /* =====================================================
           DETECTAR CATEGORÍA
        ===================================================== */

        const categoria =
            obtenerCategoria();


        if (!categoria) {

            console.log(
                "HESPERIA - CATEGORÍA NO DETECTADA"
            );

            return;

        }


        console.log(
            "HESPERIA - CATEGORÍA:",
            categoria
        );


        /* =====================================================
           OBTENER TODOS LOS PRODUCTOS
        ===================================================== */

        const disponibles =
            await obtenerProductosCategoria(
                categoria
            );


        if (!disponibles.length) {

            console.log(
                "HESPERIA - NO HAY PRODUCTOS DISPONIBLES"
            );

            return;

        }


        /* =====================================================
           OBTENER PRECIOS DE TODOS
        ===================================================== */

        console.log(
            "HESPERIA - OBTENIENDO PRECIOS..."
        );


        const productosConPrecio = [];


        for (
            const producto
            of disponibles
        ) {

            const precios =
                await obtenerPrecios(
                    producto.url
                );


            productosConPrecio.push({

                producto:
                    producto,

                precios:
                    precios

            });

        }


        console.log(
            "HESPERIA - PRODUCTOS CON PRECIOS:",
            productosConPrecio.length
        );


        if (
            !productosConPrecio.length
        ) {

            return;

        }


        /* =====================================================
           CREAR CONTENEDOR
        ===================================================== */

        const contenedor =
            document.createElement(
                "section"
            );


        contenedor.id =
            "hesperia-recomendados";


        contenedor.innerHTML = `

            <div class="hesperia-titulo">

                También te puede interesar

            </div>


            <div class="hesperia-carousel">


                <button
                    type="button"
                    class="hesperia-flecha hesperia-flecha-izquierda"
                    aria-label="Productos anteriores"
                >

                    ‹

                </button>


                <div class="hesperia-track"></div>


                <button
                    type="button"
                    class="hesperia-flecha hesperia-flecha-derecha"
                    aria-label="Productos siguientes"
                >

                    ›

                </button>


            </div>

        `;


        productoPrincipal.insertAdjacentElement(
            "afterend",
            contenedor
        );


        /* =====================================================
           ESTILOS
        ===================================================== */

        const estilos =
            document.createElement(
                "style"
            );


        estilos.textContent = `

            #hesperia-recomendados {

                width: 100%;

                max-width: 1400px;

                margin: 60px auto 45px;

                padding: 0 10px;

                box-sizing: border-box;

            }


            .hesperia-titulo {

                font-size: 24px;

                font-weight: 500;

                text-align: center;

                margin-bottom: 28px;

                color: #111;

                letter-spacing: .2px;

            }


            .hesperia-carousel {

                position: relative;

                width: 100%;

            }


            .hesperia-track {

                display: flex;

                gap: 20px;

                width: 100%;

                overflow-x: auto;

                overflow-y: hidden;

                scroll-behavior: smooth;

                -webkit-overflow-scrolling: touch;

                scrollbar-width: none;

                padding: 5px 0 15px;

                box-sizing: border-box;

            }


            .hesperia-track::-webkit-scrollbar {

                display: none;

            }


            .hesperia-card {

                flex:
                    0 0
                    calc(
                        (100% - 60px) / 4
                    );

                min-width: 0;

                box-sizing: border-box;

                text-decoration: none;

                color: inherit;

                display: block;

            }


            .hesperia-imagen {

                width: 100%;

                aspect-ratio: 1 / 1;

                background: #f7f7f7;

                overflow: hidden;

                display: flex;

                align-items: center;

                justify-content: center;

            }


            .hesperia-imagen img {

                width: 100%;

                height: 100%;

                object-fit: contain;

                display: block;

                transition:
                    transform .35s ease;

            }


            .hesperia-card:hover
            .hesperia-imagen img {

                transform:
                    scale(1.035);

            }


            .hesperia-info {

                padding:
                    14px 3px 0;

            }


            .hesperia-nombre {

                font-size: 14px;

                line-height: 1.35;

                min-height: 38px;

                color: #222;

                margin-bottom: 9px;

            }


            .hesperia-precio-label {

                font-size: 11px;

                color: #777;

                margin-bottom: 2px;

            }


            .hesperia-precio {

                font-size: 16px;

                font-weight: 600;

                color: #111;

                margin-bottom: 8px;

            }


            .hesperia-transferencia-label {

                font-size: 11px;

                color: #777;

                margin-bottom: 2px;

            }


            .hesperia-transferencia {

                font-size: 15px;

                font-weight: 500;

                color: #111;

            }


            .hesperia-flecha {

                position: absolute;

                top: 42%;

                transform:
                    translateY(-50%);

                z-index: 5;

                width: 38px;

                height: 38px;

                border: 0;

                border-radius: 50%;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .96
                    );

                box-shadow:
                    0 2px 12px
                    rgba(
                        0,
                        0,
                        0,
                        .14
                    );

                cursor: pointer;

                display: flex;

                align-items: center;

                justify-content: center;

                font-size: 27px;

                line-height: 1;

                color: #111;

                transition:
                    opacity .2s ease,
                    transform .2s ease;

            }


            .hesperia-flecha:hover {

                transform:
                    translateY(-50%)
                    scale(1.05);

            }


            .hesperia-flecha-izquierda {

                left: -18px;

            }


            .hesperia-flecha-derecha {

                right: -18px;

            }


            @media (max-width: 900px) {

                .hesperia-card {

                    flex:
                        0 0
                        calc(
                            (100% - 20px) / 2
                        );

                }


                .hesperia-titulo {

                    font-size: 21px;

                }


                .hesperia-flecha-izquierda {

                    left: -8px;

                }


                .hesperia-flecha-derecha {

                    right: -8px;

                }

            }


            @media (max-width: 600px) {

                #hesperia-recomendados {

                    margin-top: 45px;

                    padding: 0 8px;

                }


                .hesperia-track {

                    gap: 12px;

                }


                .hesperia-card {

                    flex:
                        0 0
                        calc(
                            (100% - 12px) / 2
                        );

                }


                .hesperia-titulo {

                    font-size: 20px;

                    margin-bottom: 22px;

                }


                .hesperia-nombre {

                    font-size: 13px;

                }


                .hesperia-precio {

                    font-size: 15px;

                }


                .hesperia-transferencia {

                    font-size: 14px;

                }


                .hesperia-flecha {

                    width: 32px;

                    height: 32px;

                    font-size: 22px;

                }


                .hesperia-flecha-izquierda {

                    left: -4px;

                }


                .hesperia-flecha-derecha {

                    right: -4px;

                }

            }

        `;


        document.head.appendChild(
            estilos
        );


        /* =====================================================
           ELEMENTOS
        ===================================================== */

        const track =
            contenedor.querySelector(
                ".hesperia-track"
            );


        const flechaIzquierda =
            contenedor.querySelector(
                ".hesperia-flecha-izquierda"
            );


        const flechaDerecha =
            contenedor.querySelector(
                ".hesperia-flecha-derecha"
            );


        /* =====================================================
           TODOS LOS PRODUCTOS DISPONIBLES
        ===================================================== */

        /*
         * ACÁ ESTÁ LA PARTE IMPORTANTE:
         *
         * productosDisponibles contiene TODOS los productos
         * encontrados dentro de la categoría.
         *
         * Primero los mezclamos completamente.
         */

        let productosDisponibles =
            mezclar(
                [...productosConPrecio]
            );


        /*
         * Este historial existe solamente mientras
         * esta página está abierta.
         *
         * NO usa localStorage.
         * NO guarda nada en el navegador.
         */

        let usadosRecientemente = [];


        /* =====================================================
           OBTENER SIGUIENTE PRODUCTO ALEATORIO
        ===================================================== */

        function obtenerSiguienteProducto() {

            /*
             * Buscar productos que todavía NO hayan
             * aparecido durante esta sesión.
             */

            let candidatos =
                productosDisponibles.filter(
                    function (item) {

                        return !usadosRecientemente.some(
                            function (usado) {

                                return (
                                    usado.producto.url
                                    ===
                                    item.producto.url
                                );

                            }
                        );

                    }
                );


            /*
             * Si ya mostramos todos los productos,
             * reiniciamos el historial.
             *
             * De esta manera podemos volver a utilizar
             * todo el catálogo, pero solamente después
             * de haber recorrido los demás productos.
             */

            if (
                !candidatos.length
            ) {

                usadosRecientemente = [];


                /*
                 * Volvemos a mezclar TODO el catálogo
                 * antes de empezar nuevamente.
                 */

                productosDisponibles =
                    mezclar(
                        [...productosConPrecio]
                    );


                candidatos =
                    [
                        ...productosDisponibles
                    ];

            }


            /*
             * Elegir uno aleatoriamente entre
             * TODOS los candidatos disponibles.
             */

            const elegido =
                candidatos[
                    Math.floor(
                        Math.random()
                        *
                        candidatos.length
                    )
                ];


            /*
             * Guardar solamente en memoria
             * durante esta visita.
             */

            usadosRecientemente.push(
                elegido
            );


            return elegido;

        }


        /* =====================================================
           AGREGAR PRODUCTO
        ===================================================== */

        function agregarProducto() {

            const producto =
                obtenerSiguienteProducto();


            const tarjeta =
                crearTarjeta(
                    producto.producto,
                    producto.precios
                );


            track.appendChild(
                tarjeta
            );


            return tarjeta;

        }


        /* =====================================================
           CREAR LOS 8 PRODUCTOS INICIALES
        ===================================================== */

        const cantidadInicial =
            Math.min(
                CANTIDAD_INICIAL,
                productosDisponibles.length
            );


        for (
            let i = 0;
            i < cantidadInicial;
            i++
        ) {

            agregarProducto();

        }


        /* =====================================================
           SCROLL INFINITO
        ===================================================== */

        let agregando = false;


        function revisarScroll() {

            if (agregando) {
                return;
            }


            const distanciaAlFinal =
                track.scrollWidth
                -
                track.scrollLeft
                -
                track.clientWidth;


            /*
             * Cuando quedan aproximadamente
             * dos pantallas de productos,
             * agregamos 4 más.
             */

            if (
                distanciaAlFinal
                <
                track.clientWidth * 2
            ) {

                agregando = true;


                for (
                    let i = 0;
                    i < 4;
                    i++
                ) {

                    agregarProducto();

                }


                setTimeout(
                    function () {

                        agregando =
                            false;

                    },
                    100
                );

            }

        }


        track.addEventListener(
            "scroll",
            revisarScroll,
            {
                passive: true
            }
        );


        /* =====================================================
           CANTIDAD DE DESPLAZAMIENTO
        ===================================================== */

        function cantidadDesplazamiento() {

            const tarjeta =
                track.querySelector(
                    ".hesperia-card"
                );


            if (!tarjeta) {

                return 300;

            }


            const ancho =
                tarjeta
                    .getBoundingClientRect()
                    .width;


            const gap =
                window.innerWidth <= 600
                    ? 12
                    : 20;


            /*
             * PC = 4 productos
             * Mobile = 2 productos
             */

            const cantidad =
                window.innerWidth <= 900
                    ? 2
                    : 4;


            return (
                (ancho + gap)
                *
                cantidad
            );

        }


        /* =====================================================
           FLECHA DERECHA
        ===================================================== */

        flechaDerecha.addEventListener(
            "click",
            function (evento) {

                evento.preventDefault();

                evento.stopPropagation();


                track.scrollBy({

                    left:
                        cantidadDesplazamiento(),

                    behavior:
                        "smooth"

                });

            }
        );


        /* =====================================================
           FLECHA IZQUIERDA
        ===================================================== */

        flechaIzquierda.addEventListener(
            "click",
            function (evento) {

                evento.preventDefault();

                evento.stopPropagation();


                /*
                 * Si estamos muy cerca del inicio,
                 * agregamos productos nuevos adelante.
                 */

                if (
                    track.scrollLeft < 300
                ) {

                    const nuevos = [];


                    for (
                        let i = 0;
                        i < 4;
                        i++
                    ) {

                        nuevos.push(
                            obtenerSiguienteProducto()
                        );

                    }


                    const scrollAnterior =
                        track.scrollLeft;


                    nuevos
                        .reverse()
                        .forEach(
                            function (item) {

                                const tarjeta =
                                    crearTarjeta(
                                        item.producto,
                                        item.precios
                                    );


                                track.insertBefore(
                                    tarjeta,
                                    track.firstElementChild
                                );

                            }
                        );


                    /*
                     * Compensar el scroll para
                     * evitar un salto visual.
                     */

                    requestAnimationFrame(
                        function () {

                            let agregado = 0;


                            track
                                .querySelectorAll(
                                    ".hesperia-card"
                                )
                                .forEach(
                                    function (
                                        card,
                                        index
                                    ) {

                                        if (
                                            index < 4
                                        ) {

                                            agregado +=
                                                card
                                                    .getBoundingClientRect()
                                                    .width;


                                            if (
                                                index < 3
                                            ) {

                                                agregado +=
                                                    window.innerWidth
                                                    <= 600
                                                    ? 12
                                                    : 20;

                                            }

                                        }

                                    }
                                );


                            track.scrollLeft =
                                scrollAnterior
                                +
                                agregado;


                            requestAnimationFrame(
                                function () {

                                    track.scrollBy({

                                        left:
                                            -cantidadDesplazamiento(),

                                        behavior:
                                            "smooth"

                                    });

                                }
                            );

                        }
                    );


                    return;

                }


                track.scrollBy({

                    left:
                        -cantidadDesplazamiento(),

                    behavior:
                        "smooth"

                });

            }
        );


        /* =====================================================
           SWIPE EN CELULAR
        ===================================================== */

        let inicioX = 0;

        let moviendo = false;


        track.addEventListener(
            "touchstart",
            function (evento) {

                if (
                    evento.touches
                    &&
                    evento.touches.length
                ) {

                    inicioX =
                        evento
                            .touches[0]
                            .clientX;


                    moviendo = false;

                }

            },
            {
                passive: true
            }
        );


        track.addEventListener(
            "touchmove",
            function (evento) {

                if (
                    evento.touches
                    &&
                    evento.touches.length
                ) {

                    const actualX =
                        evento
                            .touches[0]
                            .clientX;


                    if (
                        Math.abs(
                            actualX
                            -
                            inicioX
                        )
                        >
                        10
                    ) {

                        moviendo = true;

                    }

                }

            },
            {
                passive: true
            }
        );


        track.addEventListener(
            "touchend",
            function () {

                setTimeout(
                    function () {

                        moviendo = false;

                    },
                    150
                );

            },
            {
                passive: true
            }
        );


        /* =====================================================
           RESIZE
        ===================================================== */

        window.addEventListener(
            "resize",
            function () {

                revisarScroll();

            }
        );


        console.log(
            "HESPERIA - RECOMENDADOS LISTOS"
        );

    }


    /* =========================================================
       INICIAR
    ========================================================= */

    esperarProducto();

})();
