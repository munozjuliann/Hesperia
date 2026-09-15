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

        var encontrados = [];

        for (var i = 0; i < enlaces.length; i++) {

          var a = enlaces[i];
          var href = a.getAttribute("href") || "";
          var texto = (a.innerText || "").trim();

          if (
            href.indexOf(categoria + "/") === 0 &&
            texto &&
            href.indexOf("#") === -1
          ) {

            encontrados.push({
              texto: texto,
              href: href
            });

          }

        }

        var bloque = document.createElement("div");

        bloque.style.cssText =
          "margin:50px 0;padding:30px;background:#f5f5f5;color:#111;text-align:left;";

        bloque.innerHTML =
          "<h2>POSIBLES PRODUCTOS</h2>" +
          encontrados.slice(0, 100).map(function (item) {
            return (
              "<div style='padding:10px 0;border-bottom:1px solid #ddd;'>" +
              "<strong>" + item.texto + "</strong><br>" +
              item.href +
              "</div>"
            );
          }).join("");

        producto.appendChild(bloque);

        console.log("HESPERIA encontrados:", encontrados);

      });

  });

})();
