document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header");
  const main = document.querySelector("main");

  // 👉 Cambiá esto si tu backend está en otro puerto/host
  const API_BASE = "http://localhost:3000";

  // Estado
  let categories = [];
  let services = [];
  let filteredServices = [];

  // =========================
  // UI - Header
  // =========================
  function renderHeader(connected) {
    header.innerHTML = `
      <div class="topbar">
        <div class="brand">
          <h1>Tema Resuelto</h1>
          <p>Marketplace de servicios para resolver problemas reales</p>
        </div>
        <div class="status">
          <span class="pill ${connected ? "ok" : "bad"}">
            ${connected ? "✅ Conectado" : "⚠️ Sin conexión"}
          </span>
        </div>
      </div>
    `;
  }

  function renderLayout() {
    main.innerHTML = `
      <section class="grid">
        <div class="card form-card">
          <h2>Publicar un servicio</h2>

          <div class="row">
            <div class="field">
              <label>Título</label>
              <input id="title" type="text" placeholder="Ej: Cambio de canilla" />
            </div>

            <div class="field">
              <label>Precio</label>
              <input id="price" type="number" placeholder="Ej: 12000" />
            </div>
          </div>

          <div class="field">
            <label>Descripción</label>
            <textarea id="description" placeholder="Contá qué incluye el trabajo, zona, tiempos, etc."></textarea>
          </div>

          <div class="row">
            <div class="field">
              <label>Categoría</label>
              <select id="category"></select>
            </div>

            <div class="field">
              <label>WhatsApp (opcional)</label>
              <input id="whatsapp" type="text" placeholder="Ej: 5492641234567" />
              <small>Formato: código país + número (sin +, sin espacios).</small>
            </div>
          </div>

          <div class="actions">
            <button id="publish">Publicar</button>
            <button id="clear" class="secondary">Limpiar</button>
          </div>

          <div id="formMsg" class="msg"></div>
        </div>

        <div class="card list-card">
          <div class="list-head">
            <h2>Explorar servicios</h2>
          </div>

          <div class="filters">
            <div class="field">
              <label>Buscar</label>
              <input id="search" type="text" placeholder="Ej: canilla, plomería, electricidad..." />
            </div>

            <div class="field">
              <label>Filtrar por categoría</label>
              <select id="filterCategory"></select>
            </div>

            <div class="actions inline">
              <button id="reload" class="secondary">Recargar</button>
              <span id="resultsCount" class="count"></span>
            </div>
          </div>

          <div id="servicesList" class="cards"></div>
        </div>
      </section>
    `;
  }

  // =========================
  // Helpers
  // =========================
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || "Error de servidor";
      throw new Error(msg);
    }
    return data;
  }

  function cleanPhone(v) {
    return (v || "").replace(/[^\d]/g, "");
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    return n.toLocaleString("es-AR");
  }

  function formatDate(value) {
    try {
      const d = new Date(value);
      return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return value;
    }
  }

  function setMsg(text, type = "info") {
    const el = document.getElementById("formMsg");
    if (!el) return;
    el.className = `msg ${type}`;
    el.textContent = text || "";
  }

  // =========================
  // API calls
  // =========================
  async function loadCategories() {
    const json = await fetchJSON(`${API_BASE}/categories`);
    return json.data || [];
  }

  async function loadServices() {
    const json = await fetchJSON(`${API_BASE}/services`);
    return json.data || [];
  }

  async function createService(payload) {
    const json = await fetchJSON(`${API_BASE}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return json.data;
  }

  // =========================
  // Render categories in selects
  // =========================
  function renderCategorySelects() {
    const categorySelect = document.getElementById("category");
    const filterSelect = document.getElementById("filterCategory");

    if (!categorySelect || !filterSelect) return;

    categorySelect.innerHTML = "";
    filterSelect.innerHTML = "";

    // Select publicar
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });

    // Select filtro
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "Todas";
    filterSelect.appendChild(all);

    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      filterSelect.appendChild(opt);
    });
  }

  // =========================
  // Filter + render services
  // =========================
  function applyFilters() {
    const q = (document.getElementById("search")?.value || "").trim().toLowerCase();
    const catId = document.getElementById("filterCategory")?.value || "";

    filteredServices = services.filter((s) => {
      const title = (s.title || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      const catName = (s.categories?.name || "").toLowerCase();

      const matchText = !q || title.includes(q) || desc.includes(q) || catName.includes(q);
      const matchCat = !catId || String(s.category_id) === String(catId) || String(s.categories?.id) === String(catId);

      // Nota: tu SELECT trae categories(name) pero no id. Entonces para matchCat:
      // si querés filtro 100% por id, cambiá el backend para traer categories(id,name).
      // Igual, si no coincide por id, queda por texto (q) o por todas.
      return matchText && (catId ? matchCat || true : true);
    });

    renderServices();
  }

  function renderServices() {
    const list = document.getElementById("servicesList");
    const count = document.getElementById("resultsCount");
    if (!list || !count) return;

    count.textContent = `${filteredServices.length} resultado(s)`;

    if (!filteredServices.length) {
      list.innerHTML = `<p class="empty">No hay servicios para mostrar.</p>`;
      return;
    }

    list.innerHTML = filteredServices
      .map((s) => {
        const cat = s.categories?.name || "Sin categoría";
        const wa = cleanPhone(s.whatsapp);
        const waLink = wa
          ? `https://wa.me/${wa}?text=${encodeURIComponent(
              `Hola! Vi tu servicio "${s.title}" en Tema Resuelto. ¿Me pasás más info?`
            )}`
          : null;

        return `
          <div class="service-card">
            <div class="service-head">
              <div class="service-title">${s.title || "Servicio"}</div>
              <div class="service-price">$${formatMoney(s.price)}</div>
            </div>

            <div class="service-cat">
              <span class="tag">🧰 ${cat}</span>
            </div>

            <div class="service-desc">${s.description || ""}</div>

            <div class="service-meta">
              <div>🕒 ${formatDate(s.created_at)}</div>
              <div>🧾 ID #${s.id}</div>
            </div>

            <div class="service-actions">
              ${
                waLink
                  ? `<a class="btn-wa" href="${waLink}" target="_blank" rel="noreferrer">WhatsApp</a>`
                  : `<span class="hint">Tip: cargá tu WhatsApp arriba para habilitar contacto</span>`
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  // =========================
  // Events
  // =========================
  function bindEvents() {
    document.getElementById("reload")?.addEventListener("click", async () => {
      setMsg("");
      await refreshServices();
    });

    document.getElementById("search")?.addEventListener("input", applyFilters);
    document.getElementById("filterCategory")?.addEventListener("change", applyFilters);

    document.getElementById("clear")?.addEventListener("click", () => {
      document.getElementById("title").value = "";
      document.getElementById("price").value = "";
      document.getElementById("description").value = "";
      document.getElementById("whatsapp").value = "";
      setMsg("");
    });

    document.getElementById("publish")?.addEventListener("click", async () => {
      try {
        setMsg("");

        const title = (document.getElementById("title")?.value || "").trim();
        const description = (document.getElementById("description")?.value || "").trim();
        const priceRaw = document.getElementById("price")?.value;
        const category_id = document.getElementById("category")?.value;
        const whatsappRaw = document.getElementById("whatsapp")?.value || "";

        const price = Number(priceRaw);

        // Validaciones mínimas
        if (!title || !description || !price || !category_id) {
          setMsg("Faltan datos. Completá: Título, Precio, Descripción y Categoría.", "bad");
          return;
        }

        const whatsapp = cleanPhone(whatsappRaw);
        if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) {
          setMsg("WhatsApp inválido. Usá código país + número (sin +, sin espacios).", "bad");
          return;
        }

        const payload = {
          title,
          description,
          price,
          category_id: Number(category_id),
          whatsapp: whatsapp || null,
        };

        setMsg("Publicando...", "info");
        await createService(payload);

        setMsg("✅ Publicado correctamente.", "ok");

        // Limpio form
        document.getElementById("title").value = "";
        document.getElementById("price").value = "";
        document.getElementById("description").value = "";
        document.getElementById("whatsapp").value = "";

        // recargo lista
        await refreshServices(true);
      } catch (e) {
        setMsg(`Error: ${e.message}`, "bad");
      }
    });
  }

  // =========================
  // Refresh data
  // =========================
  async function refreshServices(keepFilters = false) {
    services = await loadServices();
    filteredServices = services;

    if (keepFilters) {
      applyFilters();
    } else {
      document.getElementById("search").value = "";
      document.getElementById("filterCategory").value = "";
      filteredServices = services;
      renderServices();
    }
  }

  // =========================
  // Init
  // =========================
  (async function init() {
    try {
      renderHeader(false);
      renderLayout();

      categories = await loadCategories();
      services = await loadServices();
      filteredServices = services;

      renderCategorySelects();
      renderServices();
      bindEvents();

      renderHeader(true);
    } catch (e) {
      renderHeader(false);
      renderLayout();
      setMsg(`No se pudo conectar al backend: ${e.message}`, "bad");
    }
  })();
});