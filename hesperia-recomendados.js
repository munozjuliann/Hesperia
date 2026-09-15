(function () {
  document.addEventListener("DOMContentLoaded", function () {

    var producto = document.querySelector(".product-vip");

    if (!producto) {
      console.log("HESPERIA: no se encontró .product-vip");
      return;
    }

    var bloque = document.createElement("div");

    bloque.style.cssText =
      "margin:50px 0;padding:40px 20px;background:#f5f5f5;text-align:center;";

    bloque.innerHTML =
      "<h2 style='margin:0 0 10px;'>También te puede interesar</h2>" +
      "<p style='margin:0;'>HESPERIA JS FUNCIONANDO CORRECTAMENTE</p>";

    producto.appendChild(bloque);

    console.log("HESPERIA: bloque agregado correctamente");

  });
})();
