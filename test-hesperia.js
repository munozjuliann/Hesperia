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

                // Sacar el producto que se está viendo
                productos = productos.filter(function (producto) {
                    return producto.url !== window.location.href;
                });

                // Mezclar productos aleatoriamente
                productos.sort(function () {
                    return Math.random() - 0.5;
                });

                // Elegir solamente 4
                var seleccionados = productos.slice(0, 4);

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

                <div class="hesperia-recomendados-grid"></div>

            </div>
        `;

        var grid = seccion.querySelector(".hesperia-recomendados-grid");

        productos.forEach(function (producto) {

            var tarjeta = document.createElement("a");

            tarjeta.href = producto.url;
            tarjeta.className = "hesperia-producto";

            tarjeta.innerHTML = `
                <div class="hesperia-producto-imagen">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                </div>

                <div class="hesperia-producto-info">

                    <h3>${producto.nombre}</h3>

                    <div class="hesperia-precio">
                        Consultar precio
                    </div>

                </div>
            `;

            grid.appendChild(tarjeta);

        });

        // Insertar debajo del producto
        var productoPrincipal = document.querySelector(".product-vip");

        productoPrincipal.insertAdjacentElement("afterend", seccion);

        agregarEstilos();

        // Buscar precios reales
        productos.forEach(function (producto, indice) {

            obtenerPrecio(producto.url)
                .then(function (precio) {

                    var tarjeta = grid.children[indice];

                    if (!tarjeta) return;

                    var elementoPrecio =
                        tarjeta.querySelector(".hesperia-precio");

                    if (elementoPrecio && precio) {
                        elementoPrecio.innerHTML = precio;
                    }

                });

        });

    }


    function obtenerPrecio(url) {

        return fetch(url)
            .then(function (respuesta) {
                return respuesta.text();
            })
            .then(function (html) {

                var parser = new DOMParser();
                var doc = parser.parseFromString(html, "text/html");

                var precios = [];

                doc.querySelectorAll(
                    "[class*='price'], [class*='precio'], [class*='Price'], [class*='Precio']"
                ).forEach(function (elemento) {

                    var texto = elemento.innerText.trim();

                    if (
                        texto &&
                        texto.includes("$") &&
                        !precios.includes(texto)
                    ) {
                        precios.push(texto);
                    }

                });

                if (!precios.length) {
                    return "";
                }

                /*
                 * Si existen varios precios,
                 * usamos el último, que en Empretienda
                 * corresponde al precio promocional.
                 */

                return precios[precios.length - 1];

            })
            .catch(function () {
                return "";
            });

    }


    function agregarEstilos() {

        if (document.querySelector("#hesperia-recomendados-estilos")) {
            return;
        }

        var estilos = document.createElement("style");

        estilos.id = "hesperia-recomendados-estilos";

        estilos.innerHTML = `

            #hesperia-recomendados {
                width: 100%;
                margin: 70px auto 40px;
                padding: 0 20px;
                box-sizing: border-box;
            }

            .hesperia-recomendados-contenedor {
                max-width: 1200px;
                margin: 0 auto;
            }

            .hesperia-recomendados-titulo {
                text-align: center;
                margin-bottom: 35px;
            }

            .hesperia-recomendados-titulo h2 {
                margin: 0 0 8px;
                font-size: 26px;
                font-weight: 400;
                letter-spacing: 0.5px;
            }

            .hesperia-recomendados-titulo p {
                margin: 0;
                font-size: 14px;
                opacity: 0.65;
            }

            .hesperia-recomendados-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 25px;
            }

            .hesperia-producto {
                display: block;
                text-decoration: none !important;
                color: inherit !important;
                transition: transform 0.25s ease;
            }

            .hesperia-producto:hover {
                transform: translateY(-4px);
            }

            .hesperia-producto-imagen {
                width: 100%;
                aspect-ratio: 1 / 1;
                overflow: hidden;
                background: #f7f7f7;
                margin-bottom: 15px;
            }

            .hesperia-producto-imagen img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                transition: transform 0.35s ease;
            }

            .hesperia-producto:hover
            .hesperia-producto-imagen img {
                transform: scale(1.04);
            }

            .hesperia-producto-info {
                text-align: center;
            }

            .hesperia-producto-info h3 {
                margin: 0 0 9px;
                font-size: 14px;
                font-weight: 400;
                line-height: 1.4;
            }

            .hesperia-precio {
                font-size: 15px;
                font-weight: 500;
            }

            @media (max-width: 900px) {

                .hesperia-recomendados-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }

            }

            @media (max-width: 500px) {

                #hesperia-recomendados {
                    margin-top: 45px;
                    padding: 0 15px;
                }

                .hesperia-recomendados-titulo h2 {
                    font-size: 22px;
                }

                .hesperia-recomendados-grid {
                    gap: 15px;
                }

                .hesperia-producto-info h3 {
                    font-size: 13px;
                }

            }

        `;

        document.head.appendChild(estilos);
    }


    iniciar();

})();
