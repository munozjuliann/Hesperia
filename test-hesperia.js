(function () {

  function buscarProducto() {

    var producto = document.querySelector(".product-vip");

    if (!producto) {
      setTimeout(buscarProducto, 500);
      return;
    }

    var categoria = "";

    if (location.pathname.indexOf("/fragancias-arabes/") !== -1) {
      categoria = "/fragancias-arabes";
    }

    if (location.pathname.indexOf("/fragancias-disenador/") !== -1) {
      categoria = "/fragancias-disenador";
    }

    if (!categoria) return;

    fetch(categoria)
      .then(function (respuesta) {
        return respuesta.text();
      })
      .then(function (html) {

        var doc = new DOMParser().parseFromString(html, "text/html");

        var enlaces = doc.querySelectorAll("a[href]");

        var resultados = [];

        for (var i = 0; i < enlaces.length; i++) {

          var href = enlaces[i].getAttribute("href") || "";

          if (href.indexOf(categoria + "/") === 0) {

            var partes = href.split("/").filter(Boolean);

            if (partes.length >= 3) {

              if (resultados.indexOf(href) === -1) {
                resultados.push(href);
              }

            }

          }

        }

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:40px 0;padding:30px;background:#f5f5f5;color:#111;text-align:left;";

        bloque.innerHTML =
          "<h2>PRODUCTOS DETECTADOS</h2>" +
          "<p>Encontrados: " + resultados.length + "</p>" +
          resultados.slice(0, 20).map(function (url) {
            return "<div style='padding:8px 0;border-bottom:1px solid #ddd;'>" + url + "</div>";
          }).join("");

        producto.appendChild(bloque);

        console.log("HESPERIA PRODUCTOS:", resultados);

      })
      .catch(function (error) {
        console.log("HESPERIA ERROR:", error);
      });
  }

  buscarProducto();

})();
