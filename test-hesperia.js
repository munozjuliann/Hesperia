(function () {

  function buscarProducto() {

    var producto = document.querySelector(".product-vip");

    if (producto) {

      var bloque = document.createElement("div");

      bloque.innerHTML = "HESPERIA ENCONTRÓ EL PRODUCTO";

      bloque.style.cssText =
        "margin:40px 0!important;" +
        "padding:40px!important;" +
        "background:#000!important;" +
        "color:#fff!important;" +
        "font-size:24px!important;" +
        "text-align:center!important;";

      producto.appendChild(bloque);

      console.log("HESPERIA: producto encontrado");

      return;
    }

    setTimeout(buscarProducto, 500);
  }

  buscarProducto();

})();
