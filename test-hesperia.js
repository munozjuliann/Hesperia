(function () {
    "use strict";

    const CATEGORY_MAP = {
        arabes: "/fragancias-arabes",
        disenador: "/fragancias-disenador"
    };

    function getCategory() {
        const path = window.location.pathname;

        if (path.includes("/fragancias-arabes/")) {
            return CATEGORY_MAP.arabes;
        }

        if (path.includes("/fragancias-disenador/")) {
            return CATEGORY_MAP.disenador;
        }

        return null;
    }

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function cleanName(name) {
        return name
            .replace(/^Producto\s*-\s*/i, "")
            .replace(/\s*-\s*[01]\s*$/i, "")
            .trim();
    }

    async function getProducts(categoryUrl) {
        try {
            const response = await fetch(categoryUrl, {
                cache: "no-store"
            });

            if (!response.ok) return [];

            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const products = [];
            const seen = new Set();

            doc.querySelectorAll("img[alt^='Producto -']").forEach(function (img) {

                const link = img.closest("a");

                if (!link) return;

                const href = link.href;

                if (!href) return;

                const name = cleanName(img.alt || "");

                if (!name) return;

                if (seen.has(href)) return;

                seen.add(href);

                products.push({
                    url: href,
                    name: name,
                    image: img.src
                });
            });

            return products;

        } catch (error) {
            console.error("HESPERIA - Error obteniendo productos:", error);
            return [];
        }
    }

    async function getPrices(url) {
        try {
            const response = await fetch(url, {
                cache: "no-store"
            });

            if (!response.ok) {
                return {
                    cuotas: "",
                    transferencia: ""
                };
            }

            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const priceElements = Array.from(
                doc.querySelectorAll("*")
            ).filter(function (el) {

                const text = (el.textContent || "").trim();

                return /^\$\s*[\d.,]+$/.test(text);

            });

            const prices = [];

            priceElements.forEach(function (el) {

                const text = (el.textContent || "").trim();

                if (!prices.includes(text)) {
                    prices.push(text);
                }

            });

            return {
                cuotas: prices[0] || "",
                transferencia: prices[prices.length - 1] || ""
            };

        } catch (error) {
            console.error("HESPERIA - Error obteniendo precio:", error);

            return {
                cuotas: "",
                transferencia: ""
            };
        }
    }

    function createStyles() {

        if (document.getElementById("hesperia-recomendados-styles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "hesperia-recomendados-styles";

        style.textContent = `

            #hesperia-recomendados {
                width: 100%;
                margin: 55px auto 40px;
                padding: 0;
            }

            #hesperia-recomendados .hesperia-rec-title {
                text-align: center;
                margin-bottom: 28px;
            }

            #hesperia-recomendados .hesperia-rec-title h2 {
                margin: 0;
                font-size: 25px;
                font-weight: 500;
                letter-spacing: 0.5px;
            }

            #hesperia-recomendados .hesperia-rec-title p {
                margin: 7px 0 0;
                font-size: 14px;
                opacity: 0.65;
            }

            #hesperia-recomendados .hesperia-carousel {
                position: relative;
                width: 100%;
            }

            #hesperia-recomendados .hesperia-track-wrapper {
                overflow: hidden;
                width: 100%;
            }

            #hesperia-recomendados .hesperia-track {
                display: flex;
                gap: 18px;
                overflow-x: auto;
                scroll-behavior: smooth;
                scrollbar-width: none;
                padding: 3px 2px 15px;
            }

            #hesperia-recomendados .hesperia-track::-webkit-scrollbar {
                display: none;
            }

            #hesperia-recomendados .hesperia-card {
                flex: 0 0 calc((100% - 54px) / 4);
                min-width: 0;
                text-decoration: none;
                color: inherit;
                display: block;
            }

            #hesperia-recomendados .hesperia-card-image {
                width: 100%;
                aspect-ratio: 1 / 1;
                overflow: hidden;
                background: #f7f7f7;
                margin-bottom: 13px;
            }

            #hesperia-recomendados .hesperia-card-image img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                transition: transform 0.35s ease;
            }

            #hesperia-recomendados .hesperia-card:hover img {
                transform: scale(1.04);
            }

            #hesperia-recomendados .hesperia-card-name {
                font-size: 14px;
                line-height: 1.35;
                min-height: 38px;
                margin-bottom: 10px;
                font-weight: 500;
            }

            #hesperia-recomendados .hesperia-price {
                font-size: 13px;
                line-height: 1.5;
            }

            #hesperia-recomendados .hesperia-price-label {
                display: block;
                font-size: 11px;
                opacity: 0.6;
            }

            #hesperia-recomendados .hesperia-price-value {
                font-weight: 600;
            }

            #hesperia-recomendados .hesperia-arrow {
                position: absolute;
                top: 42%;
                transform: translateY(-50%);
                width: 38px;
                height: 38px;
                border: 1px solid rgba(0,0,0,0.15);
                border-radius: 50%;
                background: rgba(255,255,255,0.95);
                cursor: pointer;
                z-index: 5;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 21px;
                transition: opacity 0.2s ease, background 0.2s ease;
            }

            #hesperia-recomendados .hesperia-arrow:hover {
                background: #fff;
            }

            #hesperia-recomendados .hesperia-arrow-left {
                left: -19px;
            }

            #hesperia-recomendados .hesperia-arrow-right {
                right: -19px;
            }

            @media (max-width: 900px) {

                #hesperia-recomendados .hesperia-card {
                    flex: 0 0 calc((100% - 18px) / 2);
                }

                #hesperia-recomendados .hesperia-arrow-left {
                    left: 5px;
                }

                #hesperia-recomendados .hesperia-arrow-right {
                    right: 5px;
                }
            }

            @media (max-width: 600px) {

                #hesperia-recomendados {
                    margin-top: 40px;
                }

                #hesperia-recomendados .hesperia-rec-title h2 {
                    font-size: 21px;
                }

                #hesperia-recomendados .hesperia-card {
                    flex: 0 0 calc((100% - 12px) / 2);
                }

                #hesperia-recomendados .hesperia-track {
                    gap: 12px;
                }

                #hesperia-recomendados .hesperia-card-name {
                    font-size: 13px;
                }

            }

        `;

        document.head.appendChild(style);
    }

    async function buildRecommendations() {

        if (document.getElementById("hesperia-recomendados")) {
            return;
        }

        const productContainer = document.querySelector(".product-vip");

        if (!productContainer) {
            return;
        }

        const categoryUrl = getCategory();

        if (!categoryUrl) {
            return;
        }

        createStyles();

        const allProducts = await getProducts(categoryUrl);

        if (!allProducts.length) {
            console.warn("HESPERIA - No se encontraron productos.");
            return;
        }

        const currentUrl = window.location.href.split("?")[0].replace(/\/$/, "");

        const availableProducts = allProducts.filter(function (product) {

            const productUrl = product.url
                .split("?")[0]
                .replace(/\/$/, "");

            return productUrl !== currentUrl;

        });

        shuffle(availableProducts);

        const selectedProducts = availableProducts.slice(0, 8);

        if (!selectedProducts.length) {
            return;
        }

        const section = document.createElement("section");

        section.id = "hesperia-recomendados";

        section.innerHTML = `
            <div class="hesperia-rec-title">
                <h2>También te puede interesar</h2>
                <p>Descubrí otras fragancias seleccionadas para vos</p>
            </div>

            <div class="hesperia-carousel">

                <button
                    type="button"
                    class="hesperia-arrow hesperia-arrow-left"
                    aria-label="Productos anteriores">
                    ‹
                </button>

                <div class="hesperia-track-wrapper">

                    <div class="hesperia-track"></div>

                </div>

                <button
                    type="button"
                    class="hesperia-arrow hesperia-arrow-right"
                    aria-label="Productos siguientes">
                    ›
                </button>

            </div>
        `;

        productContainer.insertAdjacentElement("afterend", section);

        const track = section.querySelector(".hesperia-track");

        for (const product of selectedProducts) {

            const prices = await getPrices(product.url);

            const card = document.createElement("a");

            card.className = "hesperia-card";
            card.href = product.url;

            card.innerHTML = `

                <div class="hesperia-card-image">
                    <img
                        src="${product.image}"
                        alt="${product.name}"
                        loading="lazy">
                </div>

                <div class="hesperia-card-name">
                    ${product.name}
                </div>

                ${
                    prices.cuotas
                    ? `
                        <div class="hesperia-price">
                            <span class="hesperia-price-label">
                                3 cuotas sin interés
                            </span>
                            <span class="hesperia-price-value">
                                ${prices.cuotas}
                            </span>
                        </div>
                    `
                    : ""
                }

                ${
                    prices.transferencia
                    ? `
                        <div class="hesperia-price">
                            <span class="hesperia-price-label">
                                Transferencia
                            </span>
                            <span class="hesperia-price-value">
                                ${prices.transferencia}
                            </span>
                        </div>
                    `
                    : ""
                }

            `;

            track.appendChild(card);
        }

        const leftButton = section.querySelector(".hesperia-arrow-left");
        const rightButton = section.querySelector(".hesperia-arrow-right");

        function scrollAmount() {
            const card = track.querySelector(".hesperia-card");

            if (!card) return 300;

            return card.offsetWidth * 4 + 54;
        }

        leftButton.addEventListener("click", function () {
            track.scrollBy({
                left: -scrollAmount(),
                behavior: "smooth"
            });
        });

        rightButton.addEventListener("click", function () {
            track.scrollBy({
                left: scrollAmount(),
                behavior: "smooth"
            });
        });

        function updateArrows() {

            const maxScroll =
                track.scrollWidth - track.clientWidth;

            leftButton.style.opacity =
                track.scrollLeft <= 5 ? "0.25" : "1";

            rightButton.style.opacity =
                track.scrollLeft >= maxScroll - 5
                    ? "0.25"
                    : "1";
        }

        track.addEventListener("scroll", updateArrows);

        updateArrows();
    }

    let attempts = 0;

    const interval = setInterval(function () {

        attempts++;

        if (document.querySelector(".product-vip")) {

            clearInterval(interval);

            buildRecommendations();

        }

        if (attempts >= 60) {
            clearInterval(interval);
        }

    }, 500);

})();
