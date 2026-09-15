(function () {

    function iniciar() {

        if (!document.querySelector(".product-vip")) {
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

                    if (!alt.startsWith("Producto -")) return;

                    var nombre = alt
                        .replace(/^Producto - /, "")
                        .replace(/ - [01]$/, "")
                        .trim();

                    var enlace = img.closest("a");

                    if (!enlace) return;

                    var url = enlace.href;

                    if (vistos[url]) return;

                    vistos[url] = true;

                    productos.push({
                        nombre: nombre,
                        url: url,
                        imagen: img.src
                    });
                });

                // Tomamos solamente los primeros 3 para probar
                var pruebas = productos.slice(0, 3);

                var caja = document.createElement("div");

                caja.style.cssText = `
                    position: relative;
                    z-index: 99999;
                    background: white;
                    color: black;
                    padding: 30px;
                    margin: 30px;
                    border: 3px solid black;
                    font-family: Arial, sans-serif;
                `;

                caja.innerHTML = `
                    <h2>PRUEBA DE PRECIOS</h2>
                    <p>Consultando ${pruebas.length} productos...</p>
                    <div id="resultado-precios"></div>
                `;

                document.body.prepend(caja);

                var resultado = caja.querySelector("#resultado-precios");

                pruebas.forEach(function (producto) {

                    fetch(producto.url)
                        .then(function (respuesta) {
                            return respuesta.text();
                        })
                        .then(function (htmlProducto) {

                            var docProducto =
                                parser.parseFromString(htmlProducto, "text/html");

                            var textos = [];

                            docProducto.querySelectorAll(
                                "[class*='price'], [class*='precio'], [class*='Price'], [class*='Precio']"
                            ).forEach(function (elemento) {

                                var texto = elemento.innerText.trim();

                                if (texto) {
                                    textos.push(texto);
                                }

                            });

                            resultado.innerHTML += `
                                <hr>
                                <h3>${producto.nombre}</h3>
                                <b>URL:</b><br>
                                ${producto.url}
                                <br><br>
                                <b>ELEMENTOS ENCONTRADOS:</b><br>
                                ${textos.length
                                    ? textos.join("<br>")
                                    : "NO ENCONTRADO"}
                            `;

                        })
                        .catch(function (error) {

                            resultado.innerHTML += `
                                <hr>
                                <h3>${producto.nombre}</h3>
                                ERROR AL CONSULTAR
                            `;

                        });

                });

            });
    }

    iniciar();

})();
