(function () {

    function iniciar() {

        if (document.querySelector("#hesperia-recomendados")) {
            return;
        }

        var productoPrincipal = document.querySelector(".product-vip");

        if (!productoPrincipal) {
            setTimeout(iniciar, 500);
            return;
        }

        var ruta = window.location.pathname;

        var categoria = "";

        if (ruta.includes("/fragancias-arabes/")) {
            categoria = "/fragancias-arabes";
        } else if (ruta.includes("/fragancias-disenador/")) {
            categoria = "/fragancias-disenador";
        } else {
            return;
        }

        fetch(categoria)
            .then(function (respuesta) {
                return respuesta.text();
            })
            .then(function (html) {

                var parser = new DOMParser();
                var doc = parser.parseFromString(html, "text/html");

                var productos = [];
                var vistos = {};

                doc.querySelectorAll("img").forEach(function (img) {

                    var alt = img.getAttribute("alt") || "";

                    if (!alt.startsWith("Producto -")) {
                        return;
                    }

                    var nombre = alt
                        .replace(/^Producto - /, "")
                        .replace(/ - [01]$/, "")
                        .trim();

                    var enlace = img.closest("a");

                    if (!enlace) {
                        return;
                    }

                    var url = enlace.href;

                    if (vistos[url]) {
                        return;
                    }

                    vistos[url] = true;

                    productos.push({
                        nombre: nombre,
                        url: url,
                        imagen: img.src
                    });

                });

                // Excluir producto actual
                var urlActual = window.location.href.split("?")[0];

                productos = productos.filter(function (producto) {
                    return producto.url.split("?")[0] !== urlActual;
                });

                // Mezclar aleatoriamente
                productos.sort(function () {
                    return Math.random() - 0.5;
                });

                // Elegir 8
                var seleccionados = productos.slice(0, 8);

                if (seleccionados.length === 0) {
                    return;
                }

                crearSeccion(seleccionados);

            })
            .catch(function (error) {
                console.log("Hesperia: error obteniendo productos", error);
            });
    }


    function crearSeccion(productos) {

        var seccion = document.createElement("section");

        seccion.id = "hesperia-recomendados";

        seccion.innerHTML = `

            <div class="hesperia-recomendados-contenedor">

                <div class="hesperia-recomendados-titulo">
                    <h2>También te puede interesar</h2>
                    <p>Descubrí otras fragancias seleccionadas para vos.</p>
                </div>

                <div class="hesperia-carrusel-wrapper">

                    <button
                        class="hesperia-flecha hesperia-flecha-izquierda"
                        aria-label="Productos anteriores">
                        ‹
                    </button>

                    <div class="hesperia-carrusel">

                        <div class="hesperia-carrusel-track"></div>

                    </div>

                    <button
                        class="hesperia-flecha hesperia-flecha-derecha"
                        aria-label="Más productos">
                        ›
                    </button>

                </div>

            </div>
        `;

        var track = seccion.querySelector(".hesperia-carrusel-track");

        productos.forEach(function (producto, indice) {

            var tarjeta = document.createElement("a");

            tarjeta.href = producto.url;
            tarjeta.className = "hesperia-producto";

            tarjeta.innerHTML = `

                <div class="hesperia-producto-imagen">
                    <img
                        src="${producto.imagen}"
                        alt="${producto.nombre}"
                        loading="lazy">
                </div>

                <div class="hesperia-producto-info">

                    <h3>${producto.nombre}</h3>

                    <div class="hesperia-precios">

                        <div class="hesperia-precio-cuotas">
                            <span class="hesperia-precio-label">
                                3 cuotas sin interés
                            </span>

                            <span class="hesperia-precio-normal">
                                Consultando...
                            </span>
                        </div>

                        <div class="hesperia-precio-transferencia">
                            <span class="hesperia-precio-label">
                                Transferencia
                            </span>

                            <span class="hesperia-precio-descuento">
                                Consultando...
                            </span>
                        </div>

                    </div>

                </div>
            `;

            track.appendChild(tarjeta);

            obtenerPrecio(producto.url)
                .then(function (precios) {

                    var precioNormal =
                        tarjeta.querySelector(".hesperia-precio-normal");

                    var precioTransferencia =
                        tarjeta.querySelector(".hesperia-precio-descuento");

                    if (precios.normal) {
                        precioNormal.textContent = precios.normal;
                    } else {
                        precioNormal.textContent = "";
                    }

                    if (precios.transferencia) {
                        precioTransferencia.textContent =
                            precios.transferencia;
                    } else {
                        precioTransferencia.textContent = "";
                    }

                });

        });

        var flechaIzquierda =
            seccion.querySelector(".hesperia-flecha-izquierda");

        var flechaDerecha =
            seccion.querySelector(".hesperia-flecha-derecha");

        var carrusel =
            seccion.querySelector(".hesperia-carrusel");

        var desplazamiento = 0;

        function mover(direccion) {

            var ancho =
                carrusel.clientWidth;

            desplazamiento += direccion * ancho;

            if (desplazamiento < 0) {
                desplazamiento = 0;
            }

            var maximo =
                track.scrollWidth - carrusel.clientWidth;

            if (desplazamiento > maximo) {
                desplazamiento = maximo;
            }

            carrusel.scrollTo({
                left: desplazamiento,
                behavior: "smooth"
            });

        }

        flechaIzquierda.addEventListener("click", function () {
            mover(-1);
        });

        flechaDerecha.addEventListener("click", function () {
            mover(1);
        });

        // Actualizar estado de flechas
        function actualizarFlechas() {

            var maximo =
                carrusel.scrollWidth - carrusel.clientWidth;

            flechaIzquierda.style.opacity =
                carrusel.scrollLeft <= 5 ? "0.25" : "1";

            flechaDerecha.style.opacity =
                carrusel.scrollLeft >= maximo - 5 ? "0.25" : "1";

        }

        carrusel.addEventListener("scroll", actualizarFlechas);

        // Insertar debajo del producto
        productoPrincipal.insertAdjacentElement(
            "afterend",
            seccion
        );

        agregarEstilos();

        setTimeout(actualizarFlechas, 500);

    }


    function obtenerPrecio(url) {

        return fetch(url)
            .then(function (respuesta) {
                return respuesta.text();
            })
            .then(function (html) {

                var parser = new DOMParser();

                var doc =
                    parser.parseFromString(
                        html,
                        "text/html"
                    );

                var precios = [];

                doc.querySelectorAll(
                    "[class*='price'], [class*='precio'], [class*='Price'], [class*='Precio']"
                ).forEach(function (elemento) {

                    var texto =
                        elemento.innerText.trim();

                    if (
                        texto &&
                        texto.includes("$") &&
                        !precios.includes(texto)
                    ) {

                        precios.push(texto);

                    }

                });

                /*
                 * Empretienda está entregando:
                 *
                 * precio normal
                 * precio normal repetido
                 * precio transferencia
                 *
                 * Por eso usamos el valor mayor
                 * como precio de cuotas y el menor
                 * como precio de transferencia.
                 */

                var valores = [];

                precios.forEach(function (texto) {

                    var numero =
                        texto
                            .replace(/\$/g, "")
                            .replace(/\./g, "")
                            .replace(",", ".")
                            .trim();

                    var valor =
                        parseFloat(numero);

                    if (!isNaN(valor)) {
                        valores.push({
                            texto: texto,
                            valor: valor
                        });
                    }

                });

                if (!valores.length) {
                    return {
                        normal: "",
                        transferencia: ""
                    };
                }

                valores.sort(function (a, b) {
                    return b.valor - a.valor;
                });

                var mayor =
                    valores[0];

                var menor =
                    valores[valores.length - 1];

                return {
                    normal: mayor.texto,
                    transferencia: menor.texto
                };

            })
            .catch(function () {

                return {
                    normal: "",
                    transferencia: ""
                };

            });

    }


    function agregarEstilos() {

        if (
            document.querySelector(
                "#hesperia-recomendados-estilos"
            )
        ) {
            return;
        }

        var estilos =
            document.createElement("style");

        estilos.id =
            "hesperia-recomendados-estilos";

        estilos.innerHTML = `

            #hesperia-recomendados {

                width: 100%;
                margin: 75px auto 45px;
                padding: 0 25px;
                box-sizing: border-box;

            }


            .hesperia-recomendados-contenedor {

                max-width: 1250px;
                margin: 0 auto;

            }


            .hesperia-recomendados-titulo {

                text-align: center;
                margin-bottom: 38px;

            }


            .hesperia-recomendados-titulo h2 {

                margin: 0 0 9px;

                font-size: 26px;
                font-weight: 400;

                letter-spacing: 0.4px;

            }


            .hesperia-recomendados-titulo p {

                margin: 0;

                font-size: 14px;

                opacity: 0.62;

            }


            .hesperia-carrusel-wrapper {

                position: relative;

                display: flex;
                align-items: center;

            }


            .hesperia-carrusel {

                width: 100%;

                overflow-x: auto;
                overflow-y: hidden;

                scroll-behavior: smooth;

                scrollbar-width: none;

                -ms-overflow-style: none;

            }


            .hesperia-carrusel::-webkit-scrollbar {

                display: none;

            }


            .hesperia-carrusel-track {

                display: flex;

                gap: 24px;

            }


            .hesperia-producto {

                flex: 0 0 calc(
                    (100% - 72px) / 4
                );

                min-width: 0;

                display: block;

                text-decoration: none !important;

                color: inherit !important;

                transition:
                    transform 0.25s ease;

            }


            .hesperia-producto:hover {

                transform: translateY(-4px);

            }


            .hesperia-producto-imagen {

                width: 100%;

                aspect-ratio: 1 / 1;

                overflow: hidden;

                background: #f7f7f7;

                margin-bottom: 16px;

            }


            .hesperia-producto-imagen img {

                width: 100%;
                height: 100%;

                object-fit: contain;

                display: block;

                transition:
                    transform 0.35s ease;

            }


            .hesperia-producto:hover
            .hesperia-producto-imagen img {

                transform: scale(1.04);

            }


            .hesperia-producto-info {

                text-align: center;

            }


            .hesperia-producto-info h3 {

                margin: 0 0 12px;

                font-size: 14px;

                font-weight: 400;

                line-height: 1.4;

                min-height: 39px;

            }


            .hesperia-precios {

                display: flex;

                flex-direction: column;

                gap: 6px;

            }


            .hesperia-precio-label {

                display: block;

                font-size: 10px;

                text-transform: uppercase;

                letter-spacing: 0.5px;

                opacity: 0.55;

                margin-bottom: 2px;

            }


            .hesperia-precio-normal {

                display: block;

                font-size: 14px;

                font-weight: 400;

            }


            .hesperia-precio-descuento {

                display: block;

                font-size: 15px;

                font-weight: 600;

            }


            .hesperia-flecha {

                position: absolute;

                top: 43%;

                z-index: 5;

                width: 38px;
                height: 38px;

                border: none;

                border-radius: 50%;

                background: rgba(255,255,255,0.92);

                box-shadow:
                    0 2px 12px rgba(0,0,0,0.12);

                font-size: 27px;

                line-height: 35px;

                cursor: pointer;

                display: flex;

                align-items: center;
                justify-content: center;

                transition:
                    opacity 0.2s ease,
                    transform 0.2s ease;

            }


            .hesperia-flecha:hover {

                transform: scale(1.08);

            }


            .hesperia-flecha-izquierda {

                left: -19px;

            }


            .hesperia-flecha-derecha {

                right: -19px;

            }


            @media (max-width: 900px) {

                .hesperia-producto {

                    flex: 0 0 calc(
                        (100% - 24px) / 2
                    );

                }

                .hesperia-flecha-izquierda {
                    left: -10px;
                }

                .hesperia-flecha-derecha {
                    right: -10px;
                }

            }


            @media (max-width: 500px) {

                #hesperia-recomendados {

                    margin-top: 50px;

                    padding: 0 15px;

                }

                .hesperia-recomendados-titulo h2 {

                    font-size: 22px;

                }

                .hesperia-recomendados-titulo p {

                    font-size: 13px;

                }

                .hesperia-carrusel-track {

                    gap: 14px;

                }

                .hesperia-producto {

                    flex: 0 0 calc(
                        (100% - 14px) / 2
                    );

                }

                .hesperia-producto-info h3 {

                    font-size: 13px;

                }

                .hesperia-flecha {

                    width: 32px;
                    height: 32px;

                    font-size: 23px;

                }

            }

        `;

        document.head.appendChild(estilos);

    }


    iniciar();

})();
