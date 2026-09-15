(function () {

  document.addEventListener("DOMContentLoaded", function () {

    var producto = document.querySelector(".product-vip");

    if (!producto) return;

    var categoria = "";

    if (location.pathname.indexOf("/fragancias-arabes/") !== -1) {
      categoria = "/fragancias-arabes";
    } 
    else if (location.pathname.indexOf("/fragancias-disenador/") !== -1) {
      categoria = "/fragancias-disenador";
    }

    if (!categoria) {
      console.log("HESPERIA: categoría no detectada");
      return;
    }

    console.log("HESPERIA: categoría detectada:", categoria);

    fetch(categoria)
      .then(function (respuesta) {
        return respuesta.text();
      })
      .then(function (html) {

        var documento = new DOMParser().parseFromString(html, "text/html");

        var enlaces = documento.querySelectorAll("a[href]");

        console.log("HESPERIA: enlaces encontrados:", enlaces.length);

        var productos = [];

        enlaces.forEach(function (enlace) {

          var href = enlace.getAttribute("href");

          if (!href) return;

          if (href.indexOf(categoria + "/") !== 0) return;

          var partes = href.split("/").filter(Boolean);

          if (partes.length < 3) return;

          if (productos.indexOf(href) === -1) {
            productos.push(href);
          }

        });

        console.log("HESPERIA: productos encontrados:", productos);

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:50px 0;padding:30px;background:#f5f5f5;";

        bloque.innerHTML =
          "<h2>Productos encontrados</h2>" +
          "<p>" +
          productos.slice(0, 10).join("<br>") +
          "</p>";

        producto.appendChild(bloque);

      })
      .catch(function (error) {
        console.log("HESPERIA ERROR:", error);
      });

  });

})();
