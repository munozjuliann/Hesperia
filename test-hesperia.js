(function () {

  function iniciar() {

    var producto = document.querySelector(".product-vip");

    if (!producto) {
      setTimeout(iniciar, 500);
      return;
    }

    var categoria = location.pathname.indexOf("/fragancias-arabes/") !== -1
      ? "/fragancias-arabes"
      : "/fragancias-disenador";

    fetch(categoria)
      .then(function (respuesta) {
        return respuesta.text();
      })
      .then(function (html) {

        var doc = new DOMParser().parseFromString(html, "text/html");
        var imagenes = doc.querySelectorAll("img");

        var productos = [];

        for (var i = 0; i < imagenes.length; i++) {

          var img = imagenes[i];

          var alt = img.getAttribute("alt") || "";

          if (alt.indexOf("Producto -") !== 0) continue;

          var enlace = img.closest("a");

          if (!enlace) continue;

          var href = enlace.getAttribute("href");

          if (!href) continue;

          productos.push({
            nombre: alt
              .replace(/^Producto - /, "")
              .replace(/ - [01]$/, "")
              .trim(),

            imagen:
              img.getAttribute("src") ||
              img.getAttribute("data-src") ||
              "",

            url: href
          });

        }

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:40px 0;padding:30px;background:#f5f5f5;color:#111;text-align:left;";

        bloque.innerHTML =
          "<h2>PRODUCTOS + URL</h2>" +
          "<p>Encontrados: " + productos.length + "</p>" +
          productos.slice(0, 20).map(function (p) {

            return (
              "<div style='padding:12px 0;border-bottom:1px solid #ccc;'>" +
              "<strong>" + p.nombre + "</strong><br>" +
              "<small>" + p.url + "</small>" +
              "</div>"
            );

          }).join("");

        producto.appendChild(bloque);

        console.log("HESPERIA PRODUCTOS:", productos);

      });

  }

  iniciar();

})();
