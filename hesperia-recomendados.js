(function () {

  document.addEventListener("DOMContentLoaded", function () {

    var producto = document.querySelector(".product-vip");

    if (!producto) {
      alert("NO ENCONTRE PRODUCT-VIP");
      return;
    }

    var bloque = document.createElement("div");

    bloque.innerHTML = "HESPERIA TEST FUNCIONANDO";

    bloque.style.cssText =
      "display:block!important;" +
      "margin:40px 0!important;" +
      "padding:40px!important;" +
      "background:#000!important;" +
      "color:#fff!important;" +
      "font-size:25px!important;" +
      "text-align:center!important;";

    producto.appendChild(bloque);

  });

})();
