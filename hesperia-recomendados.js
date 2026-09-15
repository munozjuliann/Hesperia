(function () {

  document.addEventListener("DOMContentLoaded", function () {

    var producto = document.querySelector(".product-vip");

    if (!producto) return;

    var categoria = location.pathname.indexOf("/fragancias-arabes/") !== -1
      ? "/fragancias-arabes"
      : "/fragancias-disenador";

    fetch(categoria)
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {

        var doc = new DOMParser().parseFromString(html, "text/html");
        var enlaces = doc.querySelectorAll("a[href]");

        var datos = [];

        for (var i = 0; i < enlaces.length; i++) {

          var href = enlaces[i].getAttribute("href");
          var texto = (enlaces[i].innerText || "").trim();

          if (href) {
            datos.push(
              "<div style='margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:8px;'>" +
              "<strong>TEXTO:</strong> " + texto +
              "<br><strong>HREF:</strong> " + href +
              "</div>"
            );
          }

          if (datos.length >= 30) break;
        }

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:50px 0;padding:30px;background:#f5f5f5;color:#111;font-size:14px;text-align:left;";

        bloque.innerHTML =
          "<h2>ENLACES REALES DE EMPRETIENDA</h2>" +
          datos.join("");

        producto.appendChild(bloque);

        console.log("HESPERIA: enlaces inspeccionados:", enlaces.length);

      });

  });

})();
