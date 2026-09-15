(function () {

  function buscarProducto() {

    var producto = document.querySelector(".product-vip");

    if (!producto) {
      setTimeout(buscarProducto, 500);
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
        var datos = [];

        for (var i = 0; i < imagenes.length; i++) {

          var img = imagenes[i];

          var src =
            img.getAttribute("src") ||
            img.getAttribute("data-src") ||
            "";

          var alt = img.getAttribute("alt") || "";

          if (src) {
            datos.push(
              "<div style='padding:15px 0;border-bottom:1px solid #ccc;'>" +
              "<strong>ALT:</strong> " + alt +
              "<br>" +
              "<strong>IMG:</strong> " + src +
              "</div>"
            );
          }

          if (datos.length >= 30) break;
        }

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:40px 0;padding:30px;background:#f5f5f5;color:#111;text-align:left;";

        bloque.innerHTML =
          "<h2>IMÁGENES DE LA CATEGORÍA</h2>" +
          "<p>Total de imágenes encontradas: " + imagenes.length + "</p>" +
          datos.join("");

        producto.appendChild(bloque);

        console.log("HESPERIA imágenes:", imagenes.length);

      })
      .catch(function (error) {
        console.log("HESPERIA ERROR:", error);
      });

  }

  buscarProducto();

})();
