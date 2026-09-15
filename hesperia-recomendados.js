alert("HESPERIA JS CARGADO");

(function () {
  "use strict";

  function iniciar() {
    var producto = document.querySelector(".product-vip");

    if (!producto) {
      return;
    }

    // Evita que el bloque se cree dos veces
    if (document.querySelector(".hesperia-recomendados")) {
      return;
    }

    var ruta = window.location.pathname;
    var categoria = "";

    if (ruta.indexOf("/fragancias-arabes/") !== -1) {
      categoria = "/fragancias-arabes";
    } else if (ruta.indexOf("/fragancias-disenador/") !== -1) {
      categoria = "/fragancias-disenador";
    } else {
      return;
    }

    fetch(categoria)
      .then(function (respuesta) {
        return respuesta.text();
      })
      .then(function (html) {
        var documento = new DOMParser().parseFromString(html, "text/html");
        var enlaces = documento.querySelectorAll("a[href]");
        var productos = [];
        var actual = window.location.pathname;

        enlaces.forEach(function (enlace) {
          var url = enlace.getAttribute("href");

          if (!url) {
            return;
          }

          if (url.indexOf(categoria + "/") !== 0) {
            return;
          }

          if (url === actual) {
            return;
          }

          var partes = url.split("/").filter(Boolean);

          if (partes.length < 3) {
            return;
          }

          if (productos.some(function (p) {
            return p.url === url;
          })) {
            return;
          }

          var imagen = enlace.querySelector("img");
          var nombre = "";
          var imagenUrl = "";

          if (imagen) {
            imagenUrl =
              imagen.getAttribute("src") ||
              imagen.getAttribute("data-src") ||
              "";

            nombre =
              imagen.getAttribute("alt") ||
              "";
          }

          if (!nombre) {
            nombre = enlace.innerText.trim();
          }

          if (!imagenUrl) {
            var imagenes = enlace.querySelectorAll("img");

            if (imagenes.length) {
              imagenUrl =
                imagenes[0].getAttribute("src") ||
                imagenes[0].getAttribute("data-src") ||
                "";
            }
          }

          if (!nombre || !imagenUrl) {
            return;
          }

          productos.push({
            url: url,
            nombre: nombre,
            imagen: imagenUrl
          });
        });

        // Mezclar productos aleatoriamente
        productos.sort(function () {
          return Math.random() - 0.5;
        });

        // Mostrar 4
        productos = productos.slice(0, 4);

        if (!productos.length) {
          return;
        }

        crearSeccion(producto, productos);
      })
      .catch(function (error) {
        console.log("Hesperia recomendaciones:", error);
      });
  }

  function crearSeccion(contenedor, productos) {
    var seccion = document.createElement("section");

    seccion.className = "hesperia-recomendados";

    var titulo = document.createElement("h2");
    titulo.textContent = "También te puede interesar";

    var grilla = document.createElement("div");
    grilla.className = "hesperia-recomendados-grid";

    productos.forEach(function (producto) {
      var tarjeta = document.createElement("a");

      tarjeta.className = "hesperia-recomendado";
      tarjeta.href = producto.url;

      var imagen = document.createElement("img");
      imagen.src = producto.imagen;
      imagen.alt = producto.nombre;
      imagen.loading = "lazy";

      var nombre = document.createElement("div");
      nombre.className = "hesperia-recomendado-nombre";
      nombre.textContent = producto.nombre;

      tarjeta.appendChild(imagen);
      tarjeta.appendChild(nombre);

      grilla.appendChild(tarjeta);
    });

    seccion.appendChild(titulo);
    seccion.appendChild(grilla);

    contenedor.appendChild(seccion);

    agregarEstilos();
  }

  function agregarEstilos() {
    if (document.getElementById("hesperia-recomendados-css")) {
      return;
    }

    var estilo = document.createElement("style");

    estilo.id = "hesperia-recomendados-css";

    estilo.textContent = `
      .hesperia-recomendados {
        width: 100%;
        margin-top: 60px;
        padding-top: 40px;
        border-top: 1px solid #e5e5e5;
      }

      .hesperia-recomendados h2 {
        margin: 0 0 35px;
        text-align: center;
        font-size: 24px;
        font-weight: 500;
      }

      .hesperia-recomendados-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 25px;
      }

      .hesperia-recomendado {
        display: block;
        color: inherit;
        text-decoration: none;
      }

      .hesperia-recomendado img {
        display: block;
        width: 100%;
        height: 280px;
        object-fit: contain;
      }

      .hesperia-recomendado-nombre {
        margin-top: 14px;
        text-align: center;
        font-size: 14px;
        line-height: 1.4;
      }

      .hesperia-recomendado:hover {
        opacity: 0.75;
      }

      @media (max-width: 768px) {
        .hesperia-recomendados {
          margin-top: 40px;
          padding-top: 30px;
        }

        .hesperia-recomendados h2 {
          font-size: 20px;
          margin-bottom: 25px;
        }

        .hesperia-recomendados-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 12px;
        }

        .hesperia-recomendado img {
          height: 220px;
        }

        .hesperia-recomendado-nombre {
          font-size: 13px;
        }
      }
    `;

    document.head.appendChild(estilo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
