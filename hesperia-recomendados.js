(function () {

  var intentos = 0;

  function buscarProducto() {

    intentos++;

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

      console.log("HESPERIA: producto encontrado en intento " + intentos);

      return;
    }

    if (intentos < 30) {
      setTimeout(buscarProducto, 500);
    } else {
      console.log("HESPERIA: no se encontró .product-vip");
    }
  }

  buscarProducto();

})();
