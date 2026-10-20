(function () {
  "use strict";

  const PRODUCTS = window.PRODUCTS || [];
  const CONFIG = window.STORE_CONFIG || { freeShippingFrom: 60, shippingCost: 4.95 };
  const CART_KEY = "nizar-cart-v1";
  const WISH_KEY = "nizar-wishlist-v1";
  const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  const productMap = new Map(PRODUCTS.map((product) => [String(product.id), product]));
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const els = {
    cartOpen: $("#cartOpen"),
    cart: $("#cart"),
    cartClose: $("#cartClose"),
    scrim: $("#scrim"),
    cartBody: $("#cartBody"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    cartFoot: $("#cartFoot"),
    cartCount: $("#cartCount"),
    cartHeadCount: $("#cartHeadCount"),
    subtotal: $("#subtotal"),
    shippingLabel: $("#shippingLabel"),
    totalLabel: $("#totalLabel"),
    shipText: $("#shipText"),
    shipBar: $("#shipBar"),
    shipMeter: $("#shipMeter"),
    checkoutBtn: $("#checkoutBtn"),
    checkoutForm: $("#checkoutForm"),
    checkoutError: $("#checkoutError"),
    payBtn: $("#payBtn"),
    backToCart: $("#backToCart"),
    cartSuccess: $("#cartSuccess"),
    orderId: $("#orderId"),
    orderTotal: $("#orderTotal"),
    successContinue: $("#successContinue"),
    cartShop: $("#cartShop"),
    modal: $("#modal"),
    modalClose: $("#modalClose"),
    modalMedia: $("#modalMedia"),
    modalTag: $("#modalTag"),
    modalUse: $("#modalUse"),
    modalCat: $("#modalCat"),
    modalName: $("#modalName"),
    modalPrice: $("#modalPrice"),
    modalDesc: $("#modalDesc"),
    modalColors: $("#modalColors"),
    modalSizes: $("#modalSizes"),
    sizeHint: $("#sizeHint"),
    modalQtyValue: $("#modalQtyValue"),
    modalAdd: $("#modalAdd"),
    modalAddTotal: $("#modalAddTotal"),
    toast: $("#toast"),
    toastText: $("#toastText"),
    menuBtn: $("#menuBtn"),
    mobileNav: $("#mobileNav"),
    searchInput: $("#searchInput"),
    resultCount: $("#resultCount"),
    emptyResults: $("#emptyResults"),
    newsletterForm: $("#newsletterForm"),
    newsletterEmail: $("#newsletterEmail"),
    newsletterSuccess: $("#newsletterSuccess"),
  };

  let cart = loadCart();
  let wishlist = loadWishlist();
  let activeFilter = "Todos";
  let searchTerm = "";
  let activeProduct = null;
  let selectedSize = null;
  let modalQty = 1;
  let drawerOpen = false;
  let modalOpen = false;
  let checkoutView = false;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((item) => item && productMap.has(String(item.id)))
        .map((item) => ({
          id: String(item.id),
          size: String(item.size || ""),
          qty: Math.min(10, Math.max(1, parseInt(item.qty, 10) || 1)),
        }));
    } catch (error) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      /* storage unavailable */
    }
  }

  function loadWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WISH_KEY) || "[]");
      return Array.isArray(raw) ? raw.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  function saveWishlist() {
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
    } catch (error) {
      /* storage unavailable */
    }
  }

  function setLock() {
    document.body.classList.toggle("locked", drawerOpen || modalOpen);
  }

  function toast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function totals() {
    const subtotal = cart.reduce((sum, item) => {
      const product = productMap.get(item.id);
      return product ? sum + product.price * item.qty : sum;
    }, 0);
    const shipping = cart.length === 0 || subtotal >= CONFIG.freeShippingFrom ? 0 : CONFIG.shippingCost;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round((subtotal + shipping) * 100) / 100,
    };
  }

  function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    els.cartCount.textContent = String(count);
    els.cartCount.classList.toggle("visible", count > 0);
    els.cartHeadCount.textContent = "(" + count + ")";

    if (cart.length === 0) {
      els.cartItems.innerHTML = "";
      els.cartItems.hidden = true;
      els.cartEmpty.hidden = false;
      els.shipMeter.hidden = true;
      els.cartFoot.hidden = true;
      els.subtotal.textContent = money.format(0);
      els.shippingLabel.textContent = "—";
      els.totalLabel.textContent = money.format(0);
      return;
    }

    els.cartEmpty.hidden = true;
    els.cartItems.hidden = false;
    els.shipMeter.hidden = false;
    els.cartFoot.hidden = checkoutView;

    els.cartItems.innerHTML = cart
      .map((item) => {
        const product = productMap.get(item.id);
        if (!product) return "";
        const lineTotal = product.price * item.qty;
        return `
          <div class="cart-item" data-id="${product.id}" data-size="${escapeHtml(item.size)}">
            <div class="ci-media" style="--bg1:${product.bg[0]};--bg2:${product.bg[1]};--garment:${product.color}">
              <svg viewBox="0 0 200 200" aria-hidden="true"><use href="#g-${product.icon}"></use></svg>
            </div>
            <div class="ci-info">
              <p class="ci-name">${escapeHtml(product.name)}</p>
              <p class="ci-meta">Talla ${escapeHtml(item.size)} · ${escapeHtml(product.category)}</p>
              <div class="qty">
                <button type="button" data-action="dec" aria-label="Quitar una unidad de ${escapeHtml(product.name)}">−</button>
                <span>${item.qty}</span>
                <button type="button" data-action="inc" aria-label="Añadir una unidad de ${escapeHtml(product.name)}">+</button>
              </div>
            </div>
            <div class="ci-right">
              <span class="ci-price">${money.format(lineTotal)}</span>
              <button class="ci-remove" type="button" data-action="remove">Quitar</button>
            </div>
          </div>`;
      })
      .join("");

    const summary = totals();
    els.subtotal.textContent = money.format(summary.subtotal);
    els.shippingLabel.textContent = summary.shipping === 0 ? "Gratis" : money.format(summary.shipping);
    els.totalLabel.textContent = money.format(summary.total);

    const remaining = Math.max(0, CONFIG.freeShippingFrom - summary.subtotal);
    if (remaining <= 0) {
      els.shipText.textContent = "¡Enhorabuena! Tu envío es gratis.";
      els.shipBar.style.width = "100%";
    } else {
      els.shipText.textContent = "Añade " + money.format(remaining) + " para conseguir envío gratis.";
      const progress = Math.min(100, (summary.subtotal / CONFIG.freeShippingFrom) * 100);
      els.shipBar.style.width = progress + "%";
    }
  }

  function findCartItem(id, size) {
    return cart.find((item) => item.id === String(id) && item.size === size);
  }

  function addToCart(product, size, qty) {
    const existing = findCartItem(product.id, size);
    if (existing) {
      existing.qty = Math.min(10, existing.qty + qty);
    } else {
      cart.push({ id: String(product.id), size: size, qty: Math.min(10, qty) });
    }
    saveCart();
    renderCart();
    toast(product.name + " añadido a la cesta");
  }

  function openCart() {
    drawerOpen = true;
    els.cart.classList.add("open");
    els.cart.setAttribute("aria-hidden", "false");
    els.scrim.classList.add("active");
    window.clearTimeout(toastTimer);
    els.toast.classList.remove("show");
    setLock();
    window.setTimeout(() => els.cartClose.focus(), 80);
  }

  function resetDrawerView() {
    checkoutView = false;
    els.cartBody.hidden = false;
    els.checkoutForm.hidden = true;
    els.checkoutForm.reset();
    els.checkoutError.hidden = true;
    els.cartSuccess.hidden = true;
    els.payBtn.disabled = false;
    els.payBtn.textContent = "Confirmar pedido";
  }

  function closeCart() {
    drawerOpen = false;
    els.cart.classList.remove("open");
    els.cart.setAttribute("aria-hidden", "true");
    els.scrim.classList.remove("active");
    setLock();
    resetDrawerView();
    renderCart();
  }

  function showCheckout() {
    if (cart.length === 0) return;
    checkoutView = true;
    els.cartBody.hidden = true;
    els.cartFoot.hidden = true;
    els.checkoutForm.hidden = false;
    els.cartSuccess.hidden = true;
    els.checkoutError.hidden = true;
    els.cart.scrollTop = 0;
    els.checkoutForm.scrollTop = 0;
    window.setTimeout(() => $("#checkoutName").focus(), 80);
  }

  function showCartView() {
    checkoutView = false;
    els.checkoutForm.hidden = true;
    els.cartBody.hidden = false;
    els.cartSuccess.hidden = true;
    renderCart();
    window.setTimeout(() => els.checkoutBtn.focus(), 80);
  }

  function openProduct(id) {
    const product = productMap.get(String(id));
    if (!product) return;

    activeProduct = product;
    selectedSize = null;
    modalQty = 1;

    els.modalMedia.style.setProperty("--bg1", product.bg[0]);
    els.modalMedia.style.setProperty("--bg2", product.bg[1]);
    els.modalMedia.style.setProperty("--garment", product.color);
    els.modalUse.setAttribute("href", "#g-" + product.icon);
    els.modalTag.textContent = product.old_price ? "Oferta" : product.tag;
    els.modalTag.classList.toggle("is-sale", Boolean(product.old_price));
    els.modalCat.textContent = product.category;
    els.modalName.textContent = product.name;
    els.modalPrice.innerHTML =
      (product.old_price ? "<s>" + money.format(product.old_price) + "</s>" : "") +
      money.format(product.price);
    els.modalDesc.textContent = product.desc;
    els.modalColors.innerHTML = product.colors
      .map((color) => '<span style="--sw:' + color + '"></span>')
      .join("");
    els.modalSizes.innerHTML = product.sizes
      .map(
        (size) =>
          '<button class="size" type="button" data-size="' +
          escapeHtml(size) +
          '" aria-pressed="false">' +
          escapeHtml(size) +
          "</button>"
      )
      .join("");
    els.modalQtyValue.textContent = "1";
    els.modalAddTotal.textContent = money.format(product.price);
    els.sizeHint.hidden = true;

    modalOpen = true;
    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden", "false");
    setLock();
    window.setTimeout(() => els.modalClose.focus(), 80);
  }

  function closeModal() {
    modalOpen = false;
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden", "true");
    setLock();
  }

  function updateWishlistUI(id) {
    $$('[data-wish="' + id + '"]').forEach((button) => {
      const active = wishlist.includes(String(id));
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      const use = $("use", button);
      if (use) use.setAttribute("href", active ? "#i-heart-fill" : "#i-heart");
    });
  }

  function applyFilters() {
    let visible = 0;
    $$(".product-card").forEach((card) => {
      const matchesCategory = activeFilter === "Todos" || card.dataset.category === activeFilter;
      const haystack = (card.dataset.name + " " + card.dataset.category).toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      const show = matchesCategory && matchesSearch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    els.resultCount.textContent = visible + (visible === 1 ? " pieza" : " piezas");
    els.emptyResults.hidden = visible !== 0;
  }

  function setFilter(value) {
    activeFilter = value || "Todos";
    $$(".chip").forEach((chip) => {
      const active = chip.dataset.filter === activeFilter;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
    applyFilters();
  }

  function closeMobileMenu() {
    els.mobileNav.classList.remove("open");
    els.menuBtn.setAttribute("aria-expanded", "false");
  }

  function scrollToProducts() {
    const section = $("#productos");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateCustomer(customer) {
    if (customer.name.length < 2) return { field: "checkoutName", message: "Escribe tu nombre completo." };
    if (!EMAIL_RE.test(customer.email)) return { field: "checkoutEmail", message: "Introduce un email válido." };
    if (customer.address.length < 5) return { field: "checkoutAddress", message: "La dirección es demasiado corta." };
    if (customer.city.length < 2) return { field: "checkoutCity", message: "Indica tu ciudad." };
    if (!/^\d{5}$/.test(customer.zip)) return { field: "checkoutZip", message: "El código postal debe tener 5 dígitos." };
    return null;
  }

  async function submitOrder(event) {
    event.preventDefault();
    els.checkoutError.hidden = true;

    const customer = {
      name: $("#checkoutName").value.trim(),
      email: $("#checkoutEmail").value.trim(),
      address: $("#checkoutAddress").value.trim(),
      city: $("#checkoutCity").value.trim(),
      zip: $("#checkoutZip").value.trim(),
    };

    const validation = validateCustomer(customer);
    if (validation) {
      els.checkoutError.textContent = validation.message;
      els.checkoutError.hidden = false;
      $("#" + validation.field).focus();
      return;
    }

    if (cart.length === 0) {
      els.checkoutError.textContent = "Tu cesta está vacía.";
      els.checkoutError.hidden = false;
      return;
    }

    els.payBtn.disabled = true;
    els.payBtn.textContent = "Procesando…";

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: customer,
          items: cart.map((item) => ({ id: item.id, size: item.size, qty: item.qty })),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        const firstError = data.errors ? Object.values(data.errors)[0] : null;
        throw new Error(firstError || "No se pudo procesar el pedido. Inténtalo de nuevo.");
      }

      els.orderId.textContent = data.order.id;
      els.orderTotal.textContent = money.format(data.order.total);
      cart = [];
      saveCart();
      renderCart();
      els.checkoutForm.hidden = true;
      els.cartBody.hidden = true;
      els.cartFoot.hidden = true;
      els.cartSuccess.hidden = false;
      els.cart.scrollTop = 0;
      toast("Pedido confirmado · " + data.order.id);
      window.setTimeout(() => els.successContinue.focus(), 80);
    } catch (error) {
      els.checkoutError.textContent = error.message || "No se pudo conectar con la tienda.";
      els.checkoutError.hidden = false;
    } finally {
      els.payBtn.disabled = false;
      els.payBtn.textContent = "Confirmar pedido";
    }
  }

  document.addEventListener("click", (event) => {
    const filterTrigger = event.target.closest("[data-filter]");
    if (filterTrigger) {
      event.preventDefault();
      setFilter(filterTrigger.dataset.filter);
      closeMobileMenu();
      if (!filterTrigger.classList.contains("chip")) scrollToProducts();
      return;
    }

    const openTrigger = event.target.closest("[data-open]");
    if (openTrigger) {
      event.preventDefault();
      openProduct(openTrigger.dataset.open);
      return;
    }

    const wishTrigger = event.target.closest("[data-wish]");
    if (wishTrigger) {
      event.preventDefault();
      const id = String(wishTrigger.dataset.wish);
      if (wishlist.includes(id)) {
        wishlist = wishlist.filter((item) => item !== id);
        toast("Eliminado de favoritos");
      } else {
        wishlist.push(id);
        toast("Guardado en favoritos");
      }
      saveWishlist();
      updateWishlistUI(id);
      return;
    }

    const cartAction = event.target.closest("[data-action]");
    if (cartAction) {
      const row = cartAction.closest(".cart-item");
      if (!row) return;
      const item = findCartItem(row.dataset.id, row.dataset.size);
      if (!item) return;
      const action = cartAction.dataset.action;
      if (action === "inc") item.qty = Math.min(10, item.qty + 1);
      if (action === "dec") item.qty -= 1;
      if (action === "remove" || item.qty < 1) {
        cart = cart.filter((entry) => entry !== item);
      }
      saveCart();
      renderCart();
      return;
    }

    if (event.target.closest("[data-close-modal]")) closeModal();
  });

  els.cartOpen.addEventListener("click", openCart);
  els.cartClose.addEventListener("click", closeCart);
  els.scrim.addEventListener("click", closeCart);
  els.cartShop.addEventListener("click", () => {
    closeCart();
    scrollToProducts();
  });
  els.checkoutBtn.addEventListener("click", showCheckout);
  els.backToCart.addEventListener("click", showCartView);
  els.checkoutForm.addEventListener("submit", submitOrder);
  els.successContinue.addEventListener("click", () => {
    closeCart();
    scrollToProducts();
  });
  els.modalClose.addEventListener("click", closeModal);

  els.modalSizes.addEventListener("click", (event) => {
    const sizeButton = event.target.closest("[data-size]");
    if (!sizeButton) return;
    selectedSize = sizeButton.dataset.size;
    $$("[data-size]", els.modalSizes).forEach((button) => {
      const active = button === sizeButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    els.sizeHint.hidden = true;
  });

  $(".modal-actions .qty").addEventListener("click", (event) => {
    const stepButton = event.target.closest("[data-step]");
    if (!stepButton || !activeProduct) return;
    const step = parseInt(stepButton.dataset.step, 10);
    modalQty = Math.min(10, Math.max(1, modalQty + step));
    els.modalQtyValue.textContent = String(modalQty);
    els.modalAddTotal.textContent = money.format(activeProduct.price * modalQty);
  });

  els.modalAdd.addEventListener("click", () => {
    if (!activeProduct) return;
    if (!selectedSize) {
      els.sizeHint.hidden = false;
      els.modalSizes.classList.remove("shake");
      void els.modalSizes.offsetWidth;
      els.modalSizes.classList.add("shake");
      return;
    }
    const product = activeProduct;
    addToCart(product, selectedSize, modalQty);
    closeModal();
    openCart();
  });

  els.menuBtn.addEventListener("click", () => {
    const open = els.mobileNav.classList.toggle("open");
    els.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  els.searchInput.addEventListener("input", () => {
    searchTerm = els.searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  els.newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = els.newsletterEmail.value.trim();
    if (!EMAIL_RE.test(email)) {
      els.newsletterEmail.setCustomValidity("Introduce un email válido.");
      els.newsletterEmail.reportValidity();
      els.newsletterEmail.setCustomValidity("");
      return;
    }
    els.newsletterForm.hidden = true;
    $(".form-note").hidden = true;
    els.newsletterSuccess.hidden = false;
    toast("Bienvenido al club NIZAR");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalOpen) {
      closeModal();
    } else if (drawerOpen) {
      closeCart();
    } else if (els.mobileNav.classList.contains("open")) {
      closeMobileMenu();
    }
  });

  $$("[data-wish]").forEach((button) => updateWishlistUI(button.dataset.wish));
  renderCart();
  applyFilters();
})();
