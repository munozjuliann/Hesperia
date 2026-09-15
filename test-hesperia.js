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

                    var tarjeta = img.closest("article, li, div");

                    var precio = "";

                    if (tarjeta) {
                        precio = tarjeta.innerText || "";
                    }

                    productos.push({
                        nombre: nombre,
                        url: url,
                        imagen: img.src,
                        texto: precio.substring(0, 500)
                    });
                });

                var salida = document.createElement("div");

                salida.style.cssText = `
                    position: relative;
                    z-index: 99999;
                    background: white;
                    color: black;
                    padding: 30px;
                    margin: 30px;
                    border: 3px solid black;
                    font-family: Arial, sans-serif;
                `;

                salida.innerHTML =
                    "<h2>PRODUCTOS + PRECIO</h2>" +
                    "<p>Encontrados: " + productos.length + "</p>";

                productos.forEach(function (producto) {

                    salida.innerHTML +=
                        "<hr>" +
                        "<strong>" + producto.nombre + "</strong>" +
                        "<br><br>" +
                        "<b>URL:</b> " + producto.url +
                        "<br><br>" +
                        "<b>Texto tarjeta:</b><br>" +
                        producto.texto.replace(/\n/g, "<br>");
                });

                document.body.prepend(salida);
            });
    }

    iniciar();
})();
