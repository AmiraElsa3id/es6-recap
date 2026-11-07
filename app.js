/* ============================================================
   ES6 Recap · interactions
   - theme + mobile sidebar
   - scroll spy / progress / reveal
   - syntax highlighting + runnable snippets
   - ES module live demo
   - array method playground
   - closure demos + quiz
   ============================================================ */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  /* ==========================================================
     Theme
     ========================================================== */

  const root = document.documentElement;

  function syncThemeUI() {
    const dark = root.classList.contains("dark");
    const sun = $("#icon-sun");
    const moon = $("#icon-moon");
    const toggle = $("#theme-toggle");
    if (sun) sun.classList.toggle("hidden", !dark);
    if (moon) moon.classList.toggle("hidden", dark);
    if (toggle) toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }

  $("#theme-toggle")?.addEventListener("click", () => {
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("es6-theme", dark ? "dark" : "light");
    } catch (_) {}
    syncThemeUI();
  });

  syncThemeUI();

  /* ==========================================================
     Mobile sidebar
     ========================================================== */

  const sidebar = $("#sidebar");
  const backdrop = $("#sidebar-backdrop");
  const menuToggle = $("#menu-toggle");

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("-translate-x-full", !open);
    backdrop?.classList.toggle("hidden", !open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("overflow-hidden", open);
  }

  menuToggle?.addEventListener("click", () => {
    setSidebar(sidebar.classList.contains("-translate-x-full"));
  });
  backdrop?.addEventListener("click", () => setSidebar(false));

  $$("#toc a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 1024) setSidebar(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSidebar(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) setSidebar(false);
  });

  /* ==========================================================
     Scroll progress, spy and back-to-top
     ========================================================== */

  const progressBar = $("#scroll-progress");
  const backTop = $("#back-top");
  const sections = $$("main section[id]");
  const tocLinks = new Map();
  $$('#toc a[href^="#"]').forEach((link) => {
    tocLinks.set(link.getAttribute("href").slice(1), link);
  });

  let activeSection = "";

  function updateScrollUI() {
    const scrollTop = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (scrollTop / max) * 100 : 0;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;

    const marker = window.innerHeight * 0.28 + 80;
    let current = sections[0] ? sections[0].id : "";
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) current = section.id;
    }

    if (current && current !== activeSection) {
      tocLinks.forEach((link) => {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      });
      const active = tocLinks.get(current);
      if (active) {
        active.classList.add("active");
        active.setAttribute("aria-current", "true");
        if (window.innerWidth >= 1024 && sidebar) {
          const r = active.getBoundingClientRect();
          const s = sidebar.getBoundingClientRect();
          if (r.top < s.top + 24) sidebar.scrollTop -= s.top + 24 - r.top;
          else if (r.bottom > s.bottom - 24) sidebar.scrollTop += r.bottom - s.bottom + 24;
        }
      }
      activeSection = current;
    }

    if (backTop) backTop.classList.toggle("visible", scrollTop > 700);
  }

  function onScroll() {
    updateScrollUI();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateScrollUI();

  backTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  });

  /* ==========================================================
     Reveal on scroll
     ========================================================== */

  const revealEls = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ==========================================================
     Syntax highlighting
     ========================================================== */

  const JS_KEYWORDS = new Set([
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
    "switch", "case", "break", "continue", "new", "class", "extends", "super", "this",
    "typeof", "instanceof", "in", "of", "delete", "void", "yield", "async", "await",
    "import", "export", "from", "as", "default", "try", "catch", "finally", "throw",
    "static", "get", "set"
  ]);

  const JS_LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

  const JS_BUILTINS = new Set([
    "console", "window", "document", "globalThis", "Math", "JSON", "Object", "Array",
    "String", "Number", "Boolean", "Symbol", "BigInt", "Promise", "Map", "Set", "WeakMap",
    "WeakSet", "Date", "RegExp", "Error", "TypeError", "RangeError", "Intl", "URL", "Blob",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval", "queueMicrotask",
    "fetch", "structuredClone", "require", "module", "exports"
  ]);

  const JS_TOKEN_RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')|(0[xX][\da-fA-F]+|\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

  const span = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`;

  function highlightJS(code) {
    let out = "";
    let last = 0;
    let match;
    JS_TOKEN_RE.lastIndex = 0;

    while ((match = JS_TOKEN_RE.exec(code)) !== null) {
      out += escapeHtml(code.slice(last, match.index));
      const [text, comment, string, number, word] = match;

      if (comment) {
        out += span("tok-com", comment);
      } else if (string) {
        out += span("tok-str", string);
      } else if (number) {
        out += span("tok-num", number);
      } else {
        const before = code.slice(0, match.index);
        const after = code.slice(match.index + word.length);
        if (JS_KEYWORDS.has(word)) out += span("tok-kw", word);
        else if (JS_LITERALS.has(word)) out += span("tok-lit", word);
        else if (JS_BUILTINS.has(word)) out += span("tok-fn", word);
        else if (/\.\s*$/.test(before)) out += span("tok-prop", word);
        else if (/^\s*\(/.test(after)) out += span("tok-fn", word);
        else out += escapeHtml(word);
      }

      last = match.index + text.length;
    }

    out += escapeHtml(code.slice(last));
    return out;
  }

  function highlightBash(code) {
    return code
      .split("\n")
      .map((line) => {
        if (/^\s*#/.test(line)) return span("tok-com", line);

        let main = line;
        let comment = "";
        const hash = line.indexOf(" #");
        if (hash !== -1) {
          main = line.slice(0, hash);
          comment = line.slice(hash);
        }

        let html = escapeHtml(main)
          .replace(/\b(npm|npx|node|git|cd|mkdir|rm|cp|mv|code)\b/g, '<span class="tok-fn">$1</span>')
          .replace(/(\s)(--?[\w-]+)/g, '$1<span class="tok-num">$2</span>');

        if (comment) html += span("tok-com", comment);
        return html;
      })
      .join("\n");
  }

  function highlightJSON(code) {
    return escapeHtml(code)
      .replace(/("(?:\\.|[^"\\])*")(\s*:)?/g, (m, str, colon) =>
        colon ? `<span class="tok-prop">${str}</span>${colon}` : span("tok-str", str)
      )
      .replace(/\b(true|false|null)\b/g, '<span class="tok-lit">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  }

  function highlight(code, lang) {
    if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
    if (lang === "json") return highlightJSON(code);
    if (lang === "js" || lang === "javascript" || lang === "jsx" || lang === "mjs") return highlightJS(code);
    return escapeHtml(code);
  }

  /* ==========================================================
     Snippets: render, copy, run
     ========================================================== */

  function dedent(text) {
    const lines = String(text).replace(/\r\n/g, "\n").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const widths = lines.filter((line) => line.trim()).map((line) => (line.match(/^[ \t]*/) || [""])[0].length);
    const min = widths.length ? Math.min(...widths) : 0;
    return lines.map((line) => line.slice(min)).join("\n");
  }

  function formatValue(value) {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
    if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
    if (value instanceof Map) return `Map(${value.size}) ${JSON.stringify(Object.fromEntries(value))}`;
    if (value instanceof Set) return `Set(${value.size}) ${JSON.stringify([...value])}`;

    try {
      const compact = JSON.stringify(value);
      if (compact && compact.length > 110) return JSON.stringify(value, null, 2);
      return compact ?? String(value);
    } catch (_) {
      return String(value);
    }
  }

  function appendOutputLine(container, text, kind) {
    const line = document.createElement("div");
    line.className = "output-line" + (kind ? ` is-${kind}` : "");
    line.textContent = text;
    container.appendChild(line);
  }

  function initSnippets() {
    $$(".snippet").forEach((block) => {
      const source = $('script[type="text/plain"]', block);
      if (!source) return;

      const code = dedent(source.textContent);
      const title = block.dataset.title || "example.js";
      const lang = (block.dataset.lang || "js").toLowerCase();
      const runnable = block.hasAttribute("data-run");
      const expectedEl = $(".expected", block);
      const expected = expectedEl ? expectedEl.textContent.replace(/\r\n/g, "\n").trim() : "";

      block.classList.add("code-block");
      block.innerHTML = `
        <div class="code-head">
          <div class="code-head-left">
            <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="code-title">${escapeHtml(title)}</span>
            <span class="code-lang">${escapeHtml(lang)}</span>
          </div>
          <div class="code-actions">
            ${runnable ? '<button type="button" class="code-btn run-btn">▶ Run</button>' : ""}
            <button type="button" class="code-btn copy-btn">Copy</button>
          </div>
        </div>
        <pre class="code-body"><code>${highlight(code, lang)}</code></pre>
        <div class="code-output${expected ? "" : " hidden"}">
          <div class="output-head">${expected ? "Expected output" : "Output"}</div>
          <pre class="output-body">${escapeHtml(expected)}</pre>
        </div>
      `;

      const outputWrap = $(".code-output", block);
      const outputHead = $(".output-head", block);
      const outputBody = $(".output-body", block);

      $(".copy-btn", block)?.addEventListener("click", async (event) => {
        const btn = event.currentTarget;
        try {
          await navigator.clipboard.writeText(code);
        } catch (_) {
          const area = document.createElement("textarea");
          area.value = code;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          try {
            document.execCommand("copy");
          } catch (_) {}
          area.remove();
        }
        btn.textContent = "Copied ✓";
        setTimeout(() => {
          btn.textContent = "Copy";
        }, 1400);
      });

      const runBtn = $(".run-btn", block);
      if (runBtn) {
        runBtn.addEventListener("click", async () => {
          runBtn.disabled = true;
          runBtn.textContent = "Running…";
          outputWrap.classList.remove("hidden");
          outputHead.textContent = "Output · live";
          outputBody.innerHTML = "";
          outputBody.classList.remove("is-error");

          const lines = [];
          const fakeConsole = {};
          ["log", "info", "dir", "table", "warn", "error"].forEach((kind) => {
            fakeConsole[kind] = (...args) => {
              lines.push({
                text: args.map(formatValue).join(" "),
                kind: kind === "error" ? "error" : kind === "warn" ? "warn" : ""
              });
            };
          });

          try {
            const fn = new Function("console", `"use strict";\nreturn (async () => {\n${code}\n})();`);
            const returned = await fn(fakeConsole);
            await new Promise((resolve) => setTimeout(resolve, 180));
            if (returned !== undefined) {
              lines.push({ text: `returned → ${formatValue(returned)}`, kind: "" });
            }
          } catch (error) {
            lines.push({ text: `${error.name}: ${error.message}`, kind: "error" });
          }

          outputBody.innerHTML = "";
          if (!lines.length) {
            appendOutputLine(outputBody, "No console output — try logging a value.", "muted");
          } else {
            lines.forEach((line) => appendOutputLine(outputBody, line.text, line.kind));
          }

          runBtn.disabled = false;
          runBtn.textContent = "▶ Run again";
        });
      }
    });
  }

  initSnippets();

  /* ==========================================================
     ES module live demo
     ========================================================== */

  const MODULE_SOURCE = [
    "export const PI = 3.14159;",
    "",
    "export function area(radius) {",
    "  return Number((PI * radius * radius).toFixed(2));",
    "}",
    "",
    "export default function greet(name) {",
    "  return `Hello, ${name}!`;",
    "}"
  ].join("\n");

  const moduleOutput = $("#module-demo-output");
  const moduleBtn = $("#run-module-demo");

  moduleBtn?.addEventListener("click", async () => {
    if (!moduleOutput) return;
    moduleBtn.disabled = true;
    moduleBtn.textContent = "Importing…";
    moduleOutput.innerHTML = "";
    appendOutputLine(moduleOutput, "Creating math.js as a Blob and calling import(url)…");

    try {
      const url = URL.createObjectURL(new Blob([MODULE_SOURCE], { type: "text/javascript" }));
      const mod = await import(url);
      URL.revokeObjectURL(url);

      moduleOutput.innerHTML = "";
      appendOutputLine(moduleOutput, `namespace keys → ${Object.keys(mod).join(", ")}`);
      appendOutputLine(moduleOutput, `PI (named) → ${mod.PI}`);
      appendOutputLine(moduleOutput, `area(2) (named) → ${mod.area(2)}`);
      appendOutputLine(moduleOutput, `greet("React") (default) → ${mod.default("React")}`);
      appendOutputLine(moduleOutput, "Imports are live read-only bindings, not copies.", "muted");
    } catch (error) {
      moduleOutput.innerHTML = "";
      appendOutputLine(moduleOutput, `${error.name}: ${error.message}`, "error");
      appendOutputLine(moduleOutput, "Tip: dynamic import needs a browser that supports ES modules.", "muted");
    }

    moduleBtn.disabled = false;
    moduleBtn.textContent = "Import again";
  });

  /* ==========================================================
     Array playground
     ========================================================== */

  const products = [
    { id: 1, name: "Aurora Headphones", category: "Audio", price: 129, rating: 4.8, stock: 12, emoji: "🎧" },
    { id: 2, name: "Pulse Earbuds", category: "Audio", price: 79, rating: 4.5, stock: 0, emoji: "🎵" },
    { id: 3, name: "Nimbus Watch", category: "Wearables", price: 199, rating: 4.7, stock: 5, emoji: "⌚" },
    { id: 4, name: "Flux Band", category: "Wearables", price: 59, rating: 4.1, stock: 20, emoji: "⌚" },
    { id: 5, name: "Orbit Keyboard", category: "Desk", price: 149, rating: 4.9, stock: 8, emoji: "⌨️" },
    { id: 6, name: "Glide Mouse", category: "Desk", price: 49, rating: 4.4, stock: 0, emoji: "🖱️" },
    { id: 7, name: "Loop Monitor Stand", category: "Desk", price: 89, rating: 4.2, stock: 15, emoji: "🖥️" },
    { id: 8, name: "Arc Charger", category: "Accessories", price: 39, rating: 4.6, stock: 30, emoji: "🔌" },
    { id: 9, name: "Halo Desk Lamp", category: "Accessories", price: 69, rating: 4.3, stock: 7, emoji: "💡" }
  ];

  const catalog = {
    query: "",
    category: "All",
    sort: "featured",
    inStock: false
  };

  const grid = $("#product-grid");
  const emptyState = $("#product-empty");
  const searchInput = $("#product-search");
  const sortSelect = $("#product-sort");
  const stockOnly = $("#in-stock-only");
  const statCount = $("#stat-count");
  const statTotal = $("#stat-total");
  const statRating = $("#stat-rating");
  const playgroundCode = $("#playground-code");

  function visibleProducts() {
    let list = products.filter((product) =>
      product.name.toLowerCase().includes(catalog.query.trim().toLowerCase())
    );

    if (catalog.category !== "All") {
      list = list.filter((product) => product.category === catalog.category);
    }
    if (catalog.inStock) {
      list = list.filter((product) => product.stock > 0);
    }

    if (catalog.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (catalog.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (catalog.sort === "rating-desc") list = [...list].sort((a, b) => b.rating - a.rating);
    if (catalog.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }

  function playgroundCodeFor(list) {
    let code = "const visible = products";
    let hasFilter = false;

    if (catalog.category !== "All") {
      code += `\n  .filter(p => p.category === ${JSON.stringify(catalog.category)})`;
      hasFilter = true;
    }
    if (catalog.query.trim()) {
      code += `\n  .filter(p => p.name.toLowerCase().includes(${JSON.stringify(catalog.query.trim().toLowerCase())}))`;
      hasFilter = true;
    }
    if (catalog.inStock) {
      code += "\n  .filter(p => p.stock > 0)";
      hasFilter = true;
    }

    const comparators = {
      "price-asc": "(a, b) => a.price - b.price",
      "price-desc": "(a, b) => b.price - a.price",
      "rating-desc": "(a, b) => b.rating - a.rating",
      name: "(a, b) => a.name.localeCompare(b.name)"
    };
    if (comparators[catalog.sort]) {
      code += `\n  .sort(${comparators[catalog.sort]})`;
    }

    if (!hasFilter && catalog.sort === "featured") {
      code += "\n  // no filters — the whole catalog";
    }

    code += ";";
    code += "\n\nconst total = visible.reduce((sum, p) => sum + p.price, 0);";
    const avg = list.length ? (list.reduce((sum, p) => sum + p.rating, 0) / list.length).toFixed(2) : "0.00";
    code += `\n// → ${list.length} products · $${list.reduce((sum, p) => sum + p.price, 0)} · ★ ${avg}`;

    return code;
  }

  function renderProducts() {
    if (!grid) return;
    const list = visibleProducts();
    const total = list.reduce((sum, product) => sum + product.price, 0);
    const avg = list.length ? list.reduce((sum, product) => sum + product.rating, 0) / list.length : 0;

    if (statCount) statCount.textContent = String(list.length);
    if (statTotal) statTotal.textContent = `$${total}`;
    if (statRating) statRating.textContent = list.length ? `★ ${avg.toFixed(2)}` : "—";

    grid.innerHTML = list
      .map(
        (product) => `
        <article class="product-card">
          <div class="flex items-start justify-between gap-2">
            <span class="product-emoji" aria-hidden="true">${product.emoji}</span>
            <span class="stock-badge ${product.stock > 0 ? "stock-in" : "stock-out"}">
              ${product.stock > 0 ? `In stock · ${product.stock}` : "Out of stock"}
            </span>
          </div>
          <div>
            <h3 class="text-sm font-semibold leading-snug text-slate-900 dark:text-white">${escapeHtml(product.name)}</h3>
            <p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">${product.category}</p>
          </div>
          <div class="mt-auto flex items-end justify-between pt-1">
            <span class="font-mono text-sm font-bold text-slate-900 dark:text-white">$${product.price}</span>
            <span class="text-xs font-semibold text-amber-500">★ ${product.rating.toFixed(1)}</span>
          </div>
        </article>`
      )
      .join("");

    emptyState?.classList.toggle("hidden", list.length > 0);

    if (playgroundCode) {
      playgroundCode.innerHTML = highlightJS(playgroundCodeFor(list));
    }
  }

  searchInput?.addEventListener("input", (event) => {
    catalog.query = event.target.value;
    renderProducts();
  });

  sortSelect?.addEventListener("change", (event) => {
    catalog.sort = event.target.value;
    renderProducts();
  });

  stockOnly?.addEventListener("change", (event) => {
    catalog.inStock = event.target.checked;
    renderProducts();
  });

  $$("#category-filters [data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      catalog.category = button.dataset.category;
      $$("#category-filters [data-category]").forEach((item) => item.classList.toggle("active", item === button));
      renderProducts();
    });
  });

  $("#reset-filters")?.addEventListener("click", () => {
    catalog.query = "";
    catalog.category = "All";
    catalog.sort = "featured";
    catalog.inStock = false;
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "featured";
    if (stockOnly) stockOnly.checked = false;
    $$("#category-filters [data-category]").forEach((item) =>
      item.classList.toggle("active", item.dataset.category === "All")
    );
    renderProducts();
  });

  renderProducts();

  /* ==========================================================
     Closure demo · counters
     ========================================================== */

  function createCounter() {
    let count = 0;
    return {
      increment() { count += 1; return count; },
      decrement() { count -= 1; return count; },
      reset() { count = 0; return count; },
      value() { return count; }
    };
  }

  const counterA = createCounter();
  const counterB = createCounter();
  const counters = { A: counterA, B: counterB };
  const counterLog = $("#counter-log");

  $$("[data-counter-card]").forEach((card) => {
    const key = card.dataset.counterCard;
    const counter = counters[key];
    const valueEl = $("[data-counter-value]", card);
    if (!counter || !valueEl) return;

    $$("[data-action]", card).forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        let value = counter.value();
        if (action === "inc") value = counter.increment();
        if (action === "dec") value = counter.decrement();
        if (action === "reset") value = counter.reset();
        valueEl.textContent = String(value);
        if (counterLog) {
          const label = action === "inc" ? "+1" : action === "dec" ? "−1" : "reset";
          counterLog.textContent = `Counter ${key} → ${label} → ${value}. Counter ${key === "A" ? "B" : "A"} is untouched: ${counters[key === "A" ? "B" : "A"].value()}.`;
        }
      });
    });
  });

  /* ==========================================================
     Closure demo · private bank account
     ========================================================== */

  function createAccount(initial) {
    let balance = initial;
    return {
      deposit(amount) {
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Deposit must be a positive number");
        balance += amount;
        return balance;
      },
      withdraw(amount) {
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Withdraw must be a positive number");
        if (amount > balance) throw new Error("Insufficient funds");
        balance -= amount;
        return balance;
      },
      getBalance() {
        return balance;
      }
    };
  }

  let account = createAccount(100);
  const balanceEl = $("#bank-balance");
  const bankLog = $("#bank-log");
  const amountInput = $("#bank-amount");

  function paintBalance() {
    if (balanceEl) balanceEl.textContent = `$${account.getBalance().toFixed(2)}`;
  }

  $("#bank-deposit")?.addEventListener("click", () => {
    const amount = Number(amountInput?.value);
    try {
      const balance = account.deposit(amount);
      paintBalance();
      if (bankLog) bankLog.textContent = `deposit(${amount}) → balance is now $${balance.toFixed(2)}. The balance lives only inside the closure.`;
    } catch (error) {
      if (bankLog) bankLog.textContent = `Error: ${error.message}`;
    }
  });

  $("#bank-withdraw")?.addEventListener("click", () => {
    const amount = Number(amountInput?.value);
    try {
      const balance = account.withdraw(amount);
      paintBalance();
      if (bankLog) bankLog.textContent = `withdraw(${amount}) → balance is now $${balance.toFixed(2)}.`;
    } catch (error) {
      if (bankLog) bankLog.textContent = `Error: ${error.message} — the closure rejected an invalid withdrawal.`;
    }
  });

  $("#bank-peek")?.addEventListener("click", () => {
    if (bankLog) bankLog.textContent = `account.balance → ${String(account.balance)}. It is not a property — only the returned methods can touch it.`;
  });

  $("#bank-reset")?.addEventListener("click", () => {
    account = createAccount(100);
    paintBalance();
    if (bankLog) bankLog.textContent = "New account created with a fresh, private balance of $100.00.";
  });

  paintBalance();

  /* ==========================================================
     Quiz
     ========================================================== */

  const QUESTIONS = [
    {
      q: "What does [1, 2, 3].map(n => n * 2) return?",
      options: ["[1, 2, 3]", "[2, 4, 6]", "6", "undefined"],
      answer: 1,
      explain: "map() returns a new array containing each callback return value. The original array is untouched."
    },
    {
      q: "Which array method mutates the original array?",
      options: ["map()", "filter()", "sort()", "reduce()"],
      answer: 2,
      explain: "sort() sorts in place and returns the same array. Use toSorted() or [...arr].sort() when you need a copy."
    },
    {
      q: "What happens when you call [].reduce((a, b) => a + b) with no initial value?",
      options: ["It returns 0", "It returns undefined", "It throws a TypeError", "It returns an empty array"],
      answer: 2,
      explain: "With no initial value, reduce uses the first element as the accumulator. On an empty array there is no first element, so it throws."
    },
    {
      q: "A closure is best described as…",
      options: [
        "A function that returns another function",
        "A function that remembers variables from the scope where it was created",
        "A block of code wrapped in try/catch",
        "An object with private methods"
      ],
      answer: 1,
      explain: "Every function closes over its lexical environment. It can keep reading and writing those outer variables after the outer function has returned."
    },
    {
      q: "for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); } logs…",
      options: ["0 1 2", "3 3 3", "0 0 0", "undefined ×3"],
      answer: 1,
      explain: "var has one function-scoped binding shared by all callbacks. By the time the timers run, i is 3. Using let creates a new binding per iteration."
    },
    {
      q: "Given export default function Card() {}, which import is valid?",
      options: [
        "import { Card } from './Card.js'",
        "import Card from './Card.js'",
        "import default from './Card.js'",
        "import * as Card from './Card.js'"
      ],
      answer: 1,
      explain: "A default export can be imported under any local name, without curly braces. Named exports need braces."
    },
    {
      q: "npm install -D vite records vite in…",
      options: ["dependencies", "devDependencies", "peerDependencies", "node_modules only"],
      answer: 1,
      explain: "-D is shorthand for --save-dev. Build tools and test libraries belong in devDependencies."
    },
    {
      q: "The range ^1.4.2 accepts which installed versions?",
      options: ["Only 1.4.2", ">=1.4.2 <1.5.0", ">=1.4.2 <2.0.0", "Any 1.x or 2.x"],
      answer: 2,
      explain: "Caret allows changes that do not modify the left-most non-zero digit. For 1.x that means any 1.y.z at or above 1.4.2."
    },
    {
      q: "Which method short-circuits and returns a boolean?",
      options: ["forEach()", "find()", "some()", "map()"],
      answer: 2,
      explain: "some() stops at the first truthy result and returns true. every() is similar, but stops at the first falsy result."
    },
    {
      q: "const user = { name: 'Mona' }; user.name = 'Nour'; What happens?",
      options: [
        "SyntaxError",
        "TypeError: Assignment to constant variable",
        "It works — const prevents reassignment, not mutation",
        "Nothing; the object is frozen"
      ],
      answer: 2,
      explain: "const locks the binding, not the value. You cannot write user = {...}, but you can change properties of the object."
    }
  ];

  const quizRoot = $("#quiz-list");
  const scoreEl = $("#quiz-score");
  const resultEl = $("#quiz-result");
  const checkBtn = $("#quiz-check");
  const retryBtn = $("#quiz-retry");
  const letters = ["A", "B", "C", "D"];

  function renderQuiz() {
    if (!quizRoot) return;
    quizRoot.innerHTML = QUESTIONS.map(
      (question, index) => `
      <fieldset class="quiz-item rounded-xl border border-slate-200 p-4 dark:border-slate-700/60" id="quiz-item-${index}">
        <legend class="sr-only">Question ${index + 1}</legend>
        <p class="flex gap-2 text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">
          <span class="font-mono text-xs text-indigo-500 dark:text-indigo-400">${String(index + 1).padStart(2, "0")}</span>
          <span>${escapeHtml(question.q)}</span>
        </p>
        <div class="mt-3 grid gap-2">
          ${question.options
            .map(
              (option, optionIndex) => `
            <label class="quiz-option" data-option="${optionIndex}">
              <input type="radio" name="quiz-${index}" value="${optionIndex}">
              <span class="option-letter">${letters[optionIndex]}</span>
              <span>${escapeHtml(option)}</span>
            </label>`
            )
            .join("")}
        </div>
        <p class="quiz-explain" hidden></p>
      </fieldset>`
    ).join("");

    if (scoreEl) scoreEl.textContent = "0 / 10";
    if (resultEl) resultEl.textContent = "";
    if (checkBtn) checkBtn.hidden = false;
    if (retryBtn) retryBtn.hidden = true;
  }

  function checkQuiz() {
    let score = 0;

    QUESTIONS.forEach((question, index) => {
      const item = $(`#quiz-item-${index}`);
      if (!item) return;

      const options = $$(".quiz-option", item);
      const selected = $(`input[name="quiz-${index}"]:checked`, item);
      const selectedIndex = selected ? Number(selected.value) : -1;
      const explain = $(".quiz-explain", item);

      options.forEach((option, optionIndex) => {
        option.classList.remove("is-correct", "is-wrong", "is-answer");
        const input = $("input", option);
        if (input) input.disabled = true;
        if (optionIndex === question.answer) option.classList.add("is-answer");
      });

      if (selectedIndex === question.answer) {
        score += 1;
        options[selectedIndex]?.classList.add("is-correct");
      } else if (selectedIndex >= 0) {
        options[selectedIndex]?.classList.add("is-wrong");
      }

      if (explain) {
        explain.hidden = false;
        const prefix =
          selectedIndex === question.answer
            ? "<strong>Correct.</strong> "
            : selectedIndex === -1
              ? "<strong>No answer.</strong> "
              : "<strong>Not quite.</strong> ";
        const answer = selectedIndex === question.answer
          ? ""
          : `Correct answer: <strong>${escapeHtml(question.options[question.answer])}</strong>. `;
        explain.innerHTML = `${prefix}${answer}${escapeHtml(question.explain)}`;
      }

      item.classList.add("is-graded");
    });

    if (scoreEl) scoreEl.textContent = `${score} / ${QUESTIONS.length}`;
    if (resultEl) {
      const message =
        score === QUESTIONS.length
          ? "Perfect score. You are ready to build."
          : score >= 8
            ? "Strong recap. Skim the sections you missed and move on to React."
            : score >= 5
              ? "Solid start. Re-run the examples for the questions you missed."
              : "Worth another pass — the runnable examples are the fastest way back.";
      resultEl.textContent = message;
    }

    if (checkBtn) checkBtn.hidden = true;
    if (retryBtn) retryBtn.hidden = false;

    quizRoot?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  function resetQuiz() {
    renderQuiz();
    quizRoot?.querySelectorAll("input").forEach((input) => {
      input.checked = false;
      input.disabled = false;
    });
    quizRoot?.querySelectorAll(".quiz-explain").forEach((el) => {
      el.hidden = true;
      el.innerHTML = "";
    });
    quizRoot?.querySelectorAll(".quiz-item").forEach((el) => el.classList.remove("is-graded"));
    quizRoot?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  checkBtn?.addEventListener("click", checkQuiz);
  retryBtn?.addEventListener("click", resetQuiz);
  renderQuiz();

  /* ==========================================================
     Initial hash: re-align after snippets and fonts settle
     ========================================================== */

  function alignToHash() {
    if (!window.location.hash) return;
    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch (_) {
      target = null;
    }
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    updateScrollUI();
  }

  if (document.readyState === "complete") alignToHash();
  else window.addEventListener("load", alignToHash);
  window.setTimeout(alignToHash, 160);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => alignToHash()).catch(() => {});
  }
})();
