(function () {

    function prueba() {

        var producto = document.querySelector(".product-vip");

        if (!producto) {
            setTimeout(prueba, 500);
            return;
        }

        var precios = [];

        document.querySelectorAll("body *").forEach(function (el) {

            var texto = (el.textContent || "").trim();

            if (/^\$\s*[\d.,]+$/.test(texto)) {
                if (!precios.includes(texto)) {
                    precios.push(texto);
                }
            }

        });

        var caja = document.createElement("div");

        caja.style.cssText = `
            margin:40px 0;
            padding:25px;
            border:2px solid #000;
            background:#fff;
            position:relative;
            z-index:99999;
            font-family:Arial,sans-serif;
        `;

        caja.innerHTML = `
            <strong>PRUEBA HESPERIA</strong><br><br>
            Precios encontrados:<br>
            ${precios.map(function(p) {
                return "<div>" + p + "</div>";
            }).join("")}
        `;

        producto.insertAdjacentElement("afterend", caja);
    }

    prueba();

})();
