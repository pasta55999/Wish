(() => {
  const HOST_ID = "wish-extension-root";
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.dispatchEvent(new CustomEvent("wish:focus"));
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-wish-owned", "true");
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.append(host);

  const state = {
    listings: [], fingerprint: "", open: true, prompt: "", reviewOpen: false, reviewIds: new Set(),
    selectedIds: new Set(), plan: null, mode: null, status: "", error: "", loading: false,
    budgetAnnual: "", userBudget: false, assumptions: { installments: "1", deposit: "", agencyFee: "" },
    sources: [], pageChanged: false, appliedOnce: false, observer: null, voiceListening: false, voiceMessage: ""
  };
  const savedDisplays = new Map();
  const storageKey = `wish:${location.origin}${location.pathname}`;
  let refreshTimer;
  let recognition = null;
  let voiceStartPrompt = "";
  let voiceFinalText = "";

  const css = `
    :host{all:initial}.wish-shell{font-family:ui-rounded,"SF Pro Rounded","Segoe UI",sans-serif;color:#15332d;position:fixed;right:20px;bottom:20px;z-index:2147483647;font-size:13px;line-height:1.4}.wish-bubble{position:absolute;right:0;bottom:0;min-width:92px;height:54px;padding:0 17px;border:0;border-radius:999px;background:linear-gradient(135deg,#2d6254,#83ad79);color:#fff;box-shadow:0 12px 30px #15332d52;cursor:pointer;font-weight:800;font-size:14px;letter-spacing:-.2px;transition:transform .2s}.wish-bubble:hover{transform:translateY(-2px) scale(1.02)}.wish-panel{width:min(440px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 104px));overflow:auto;background:#fffdf9;border:1px solid #d8e1d2;border-radius:20px;box-shadow:0 22px 70px #17382b42;padding:16px;margin-bottom:12px}.wish-panel[hidden]{display:none}.wish-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.wish-brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:800;letter-spacing:-.5px}.wish-spark{background:#e5f1df;border-radius:10px;width:28px;height:28px;display:grid;place-items:center;color:#31654d}.wish-x,.wish-link{border:0;background:transparent;padding:5px;color:#536560;cursor:pointer}.wish-x{font-size:21px;line-height:1}.wish-sub{margin:0 0 12px;color:#60706a;font-size:12px}.wish-prompt{display:block;width:100%;border:1px solid #d4ded0;border-radius:12px;background:#fff;padding:10px 11px;min-height:76px;resize:vertical;color:#15332d;font:inherit;outline:none}.wish-prompt:focus,.wish-input:focus{border-color:#719966;box-shadow:0 0 0 3px #dcebd6}.wish-actions{display:flex;gap:8px;align-items:center;margin-top:9px}.wish-primary,.wish-secondary{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font:600 12px inherit}.wish-primary{background:#24594b;color:white}.wish-primary:disabled{opacity:.55;cursor:not-allowed}.wish-secondary{background:#e9f0e4;color:#2e554a}.wish-secondary[aria-pressed="true"]{background:#f7d8d1;color:#833528}.wish-section{border-top:1px solid #e5e8e1;margin-top:14px;padding-top:13px}.wish-title{font-size:13px;font-weight:800;margin:0 0 5px}.wish-help{font-size:11px;color:#68746f;margin:0 0 9px}.wish-notice{margin-top:10px;border-radius:10px;padding:9px 10px;font-size:11px}.wish-notice.info{background:#edf4e9;color:#2d574a}.wish-notice.warn{background:#fff4dc;color:#785514}.wish-notice.error{background:#ffebe7;color:#8b3327}.wish-review-list{border:1px solid #e1e6dc;border-radius:10px;overflow:hidden}.wish-review-row{display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border-bottom:1px solid #edf0eb;cursor:pointer}.wish-review-row:last-child{border-bottom:0}.wish-review-row input{margin:3px 0 0}.wish-review-row b{display:block;font-size:12px}.wish-review-row span{display:block;color:#66736e;font-size:11px}.wish-badge{display:inline-flex;background:#fff1cf;color:#74500a;border-radius:99px;padding:3px 7px;font-size:10px;font-weight:700;margin-left:7px;vertical-align:middle}.wish-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wish-field{display:block;color:#53635d;font-size:11px;font-weight:600}.wish-input{display:block;width:100%;margin-top:4px;border:1px solid #d6ded1;border-radius:8px;padding:7px;background:white;color:#16332d;font:inherit}.wish-table-wrap{overflow:auto;border:1px solid #e0e6de;border-radius:10px}.wish-table{width:100%;border-collapse:collapse;font-size:11px;min-width:380px}.wish-table th{background:#f0f5ec;text-align:left;font-size:10px;color:#5b6963;padding:7px;font-weight:800}.wish-table td{padding:8px 7px;border-top:1px solid #edf0eb;vertical-align:top}.wish-empty{padding:12px;color:#6b7670;text-align:center;font-size:11px}.wish-source{display:block;border:1px solid #e1e7df;border-radius:10px;padding:9px;margin:7px 0;text-decoration:none;color:#15332d;background:#fff}.wish-source:hover{border-color:#92ad89}.wish-source b,.wish-source span{display:block}.wish-source span{color:#64716b;font-size:11px;margin-top:3px}.wish-footer{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px}.wish-small{font-size:11px}.wish-hidden-count{color:#6b756e;font-size:11px;margin:7px 0 0}.wish-capabilities{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.wish-chip{padding:3px 7px;border-radius:99px;background:#f1f5ef;color:#547052;font-size:10px}.wish-spinner{display:inline-block;width:11px;height:11px;border:2px solid #ffffff66;border-top-color:white;border-radius:50%;animation:wish-spin .7s linear infinite;margin-right:5px;vertical-align:-1px}@keyframes wish-spin{to{transform:rotate(360deg)}}@media(max-width:520px){.wish-shell{right:12px;bottom:12px}.wish-panel{max-height:calc(100vh - 88px)}}`;
  const style = document.createElement("style");
  style.textContent = css;
  shadow.append(style);

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.value !== undefined) node.value = options.value;
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.checked !== undefined) node.checked = options.checked;
    if (options.disabled !== undefined) node.disabled = options.disabled;
    if (options.title) node.title = options.title;
    if (options.ariaLabel) node.setAttribute("aria-label", options.ariaLabel);
    if (options.href) { node.href = options.href; node.target = "_blank"; node.rel = "noopener noreferrer"; }
    if (options.min !== undefined) node.min = options.min;
    if (options.step !== undefined) node.step = options.step;
    if (options.onClick) node.addEventListener("click", options.onClick);
    if (options.onInput) node.addEventListener("input", options.onInput);
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  }
  function section(title, help, children) {
    return el("section", { className: "wish-section" }, [el("h3", { className: "wish-title", text: title }), help ? el("p", { className: "wish-help", text: help }) : null, children]);
  }
  function normalize(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function hash(value) { let number = 2166136261; for (const char of value) { number ^= char.charCodeAt(0); number = Math.imul(number, 16777619); } return (number >>> 0).toString(36); }
  function formatMoney(value, currency = currencyForPage()) { return typeof value === "number" && Number.isFinite(value) ? `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}` : "Unknown"; }
  function currencyForPage() { return state.listings[0]?.price?.currency || "AED"; }
  function annual(listing) { return listing.price.period === "annual" ? listing.price.amount : listing.price.amount * 12; }
  function sourceOfAnnual(listing) { return listing.price.period === "annual" ? "page annual rent" : "derived from page monthly rent × 12"; }
  function partial(listing) {
    const parsed = (value) => value === "" || value === null || value === undefined ? null : Number(value);
    const installments = parsed(state.assumptions.installments), deposit = parsed(state.assumptions.deposit), fee = parsed(state.assumptions.agencyFee);
    return Number.isInteger(installments) && installments > 0 && Number.isFinite(deposit) && deposit >= 0 && Number.isFinite(fee) && fee >= 0 ? annual(listing) / installments + deposit + fee : null;
  }

  function extractListings() {
    const selectors = ["[data-listing-id]", "[data-property-id]", "[data-listing]", ".property-card", "article"];
    const seen = new Set(), raw = [];
    for (const selector of selectors) for (const card of document.querySelectorAll(selector)) {
      if (seen.has(card) || card.closest(`#${HOST_ID}`) || card.hasAttribute("data-wish-owned")) continue;
      seen.add(card);
      const text = normalize(card.innerText);
      const priceMatch = text.match(/\b(AED|USD|EUR|GBP|SAR|QAR)\s*([\d,.]+)\s*(?:\/|per\s+)?\s*(year|month|annual|monthly)\b/i);
      if (!priceMatch || text.length < 20) continue;
      const title = normalize(card.querySelector("h1,h2,h3,h4,[data-title]")?.textContent) || normalize(text.split(/(?=AED|USD|EUR|GBP|SAR|QAR)/i)[0]).slice(0, 90);
      const location = normalize(card.querySelector(".meta,.location,[data-location]")?.textContent) || "Location not identified";
      const amount = Number(priceMatch[2].replace(/,/g, ""));
      if (!title || !Number.isFinite(amount)) continue;
      const facts = normalize(card.querySelector(".facts,[data-facts]")?.textContent || text);
      const beds = facts.match(/(\d+)\s*(?:beds?|br\b)/i)?.[1] ?? null;
      const baths = facts.match(/(\d+)\s*(?:baths?|ba\b)/i)?.[1] ?? null;
      const size = facts.match(/([\d,.]+\s*(?:sq\s*ft|sqm|m²))/i)?.[1] ?? null;
      raw.push({
        rawId: card.getAttribute("data-listing-id") || card.getAttribute("data-property-id") || card.getAttribute("data-listing") || hash(`${title}|${location}|${priceMatch[1]}|${amount}|${priceMatch[3]}`),
        title, location, price: { amount, currency: priceMatch[1].toUpperCase(), period: /month/i.test(priceMatch[3]) ? "monthly" : "annual" },
        bedrooms: beds ? Number(beds) : null, bathrooms: baths ? Number(baths) : null, size: size || null, excerpt: text.slice(0, 180), element: card
      });
    }
    const duplicateCounts = new Map();
    const listings = raw.map((item) => {
      const count = duplicateCounts.get(item.rawId) || 0;
      duplicateCounts.set(item.rawId, count + 1);
      return { ...item, id: count ? `${item.rawId}-${count + 1}` : item.rawId };
    });
    return listings.slice(0, 12);
  }
  function fingerprint(listings = state.listings) { return hash(`${location.href}|${listings.map((item) => `${item.id}:${item.price.amount}:${item.title}`).join("|")}`); }
  function refreshListings(markChanges = true) {
    const next = extractListings();
    const nextFingerprint = fingerprint(next);
    if (markChanges && state.fingerprint && state.fingerprint !== nextFingerprint && state.loading) state.pageChanged = true;
    if (markChanges && state.fingerprint && state.fingerprint !== nextFingerprint && state.plan) {
      state.status = "Listings changed on this page. Refresh your request before applying another plan.";
      state.pageChanged = true;
    }
    const available = new Set(next.map((item) => item.id));
    state.selectedIds = new Set([...state.selectedIds].filter((id) => available.has(id)));
    state.reviewIds = new Set([...state.reviewIds].filter((id) => available.has(id)));
    state.listings = next;
    state.fingerprint = nextFingerprint;
    syncCardControls();
  }
  function syncCardControls() {
    for (const listing of state.listings) {
      let control = listing.element.querySelector(":scope > [data-wish-card-control]");
      if (!control) {
        control = document.createElement("label");
        control.setAttribute("data-wish-card-control", "true");
        control.style.cssText = "display:flex;gap:7px;align-items:center;padding:9px 12px;background:#edf5e9;color:#2a5949;border-bottom:1px solid #d8e6d2;font:600 12px ui-sans-serif,system-ui;cursor:pointer;";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("data-wish-select", listing.id);
        const label = document.createElement("span"); label.textContent = "Compare this home";
        control.append(input, label);
        control.addEventListener("click", (event) => event.stopPropagation());
        input.addEventListener("change", () => {
          if (input.checked) state.selectedIds.add(listing.id); else state.selectedIds.delete(listing.id);
          state.error = ""; save(); render();
        });
        listing.element.prepend(control);
      }
      const checkbox = control.querySelector("input");
      checkbox.checked = state.selectedIds.has(listing.id);
      checkbox.setAttribute("data-wish-select", listing.id);
    }
    applyFilter();
  }
  function applyFilter() {
    const budget = Number(state.budgetAnnual);
    let hidden = 0;
    for (const listing of state.listings) {
      const shouldHide = Number.isFinite(budget) && budget > 0 && annual(listing) > budget;
      if (shouldHide) hidden += 1;
      const card = listing.element;
      if (!savedDisplays.has(card)) savedDisplays.set(card, card.style.display);
      card.style.display = shouldHide ? "none" : savedDisplays.get(card);
      card.setAttribute("data-wish-budget-hidden", shouldHide ? "true" : "false");
    }
    return hidden;
  }
  function restorePage() {
    for (const [card, display] of savedDisplays) { card.style.display = display; card.removeAttribute("data-wish-budget-hidden"); }
    document.querySelectorAll("[data-wish-card-control]").forEach((node) => node.remove());
  }
  function message(type, payload) {
    return new Promise((resolve) => chrome.runtime.sendMessage({ type, ...payload }, (response) => resolve(response || { ok: false, error: { message: "Extension messaging failed." } })));
  }
  async function request(path, payload) {
    const response = await message("wish:request", { path, payload });
    if (!response.ok) throw Object.assign(new Error(response.error?.message || "Request failed."), { code: response.error?.code });
    return response.data;
  }
  function storedState() {
    return { fingerprint: state.fingerprint, selectedIds: [...state.selectedIds], budgetAnnual: state.budgetAnnual, userBudget: state.userBudget, assumptions: state.assumptions, plan: state.plan, mode: state.mode, appliedOnce: state.appliedOnce, sources: state.sources };
  }
  async function save() { await message("wish:save", { key: storageKey, value: storedState() }); }
  async function hydrate() {
    const response = await message("wish:load", { key: storageKey });
    const saved = response.ok ? response.value : null;
    if (saved?.fingerprint === state.fingerprint) {
      state.selectedIds = new Set((saved.selectedIds || []).filter((id) => state.listings.some((item) => item.id === id)));
      state.budgetAnnual = saved.budgetAnnual || ""; state.userBudget = Boolean(saved.userBudget);
      state.assumptions = { ...state.assumptions, ...(saved.assumptions || {}) }; state.plan = saved.plan || null;
      state.mode = saved.mode || null; state.appliedOnce = Boolean(saved.appliedOnce); state.sources = Array.isArray(saved.sources) ? saved.sources : [];
      state.status = "Saved Wish setup restored for this unchanged page.";
      syncCardControls();
    }
    render();
  }
  function selectedListings() { return state.listings.filter((item) => state.selectedIds.has(item.id)); }
  function reviewedListings() { return state.listings.filter((item) => state.reviewIds.has(item.id)); }
  function inputField(label, value, options, onInput) {
    const input = el("input", { className: "wish-input", value, type: options.type || "number", min: options.min, step: options.step, ariaLabel: label, onInput: (event) => onInput(event.target.value) });
    return el("label", { className: "wish-field", text: label }, [input]);
  }
  function renderComparison() {
    const picked = selectedListings();
    const wrap = el("div", { className: "wish-table-wrap" });
    if (!picked.length) { wrap.append(el("div", { className: "wish-empty", text: "Use the green checkboxes on listing cards to choose homes to compare." })); return wrap; }
    const table = el("table", { className: "wish-table" });
    const header = el("tr", {}, ["Home", "Annual rent", "Beds / baths", "Size", "Partial upfront*"].map((name) => el("th", { text: name })));
    const rows = picked.map((listing) => {
      const partialValue = partial(listing);
      return el("tr", {}, [
        el("td", {}, [el("b", { text: listing.title }), el("div", { className: "wish-small", text: listing.location })]),
        el("td", { title: sourceOfAnnual(listing), text: formatMoney(annual(listing), listing.price.currency) }),
        el("td", { text: `${listing.bedrooms ?? "—"} / ${listing.bathrooms ?? "—"}` }),
        el("td", { text: listing.size || "—" }),
        el("td", { text: partialValue === null ? "Enter assumptions" : formatMoney(partialValue, listing.price.currency) })
      ]);
    });
    table.append(el("thead", {}, [header]), el("tbody", {}, rows)); wrap.append(table); return wrap;
  }
  function renderSources() {
    const container = el("div");
    for (const group of state.sources) for (const result of group.results || []) {
      const link = el("a", { className: "wish-source", href: result.url }, [el("b", { text: result.title }), el("span", { text: result.excerpt }), el("span", { text: `For: ${group.query} · Retrieved ${new Date(group.retrievedAt).toLocaleString()}` })]);
      container.append(link);
    }
    return container;
  }
  function voiceErrorMessage(error) {
    const code = error?.error || "unknown";
    if (["not-allowed", "service-not-allowed"].includes(code)) return "Microphone access was not granted. You can still type your request.";
    if (code === "no-speech") return "No speech was detected. Try again or type your request.";
    if (code === "audio-capture") return "No microphone is available. You can still type your request.";
    if (code === "network") return "The browser speech service is unavailable. You can still type your request.";
    return "Voice input could not start in this browser. You can still type your request.";
  }
  function updateVoiceTranscript(interim = "") {
    const combined = [voiceStartPrompt, voiceFinalText, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    state.prompt = combined;
    const prompt = shadow.querySelector(".wish-prompt");
    if (prompt) prompt.value = state.prompt;
  }
  function stopVoice() {
    if (recognition && state.voiceListening) {
      state.voiceMessage = "Finishing your voice description…";
      recognition.stop();
    }
  }
  function toggleVoice() {
    if (state.voiceListening) { stopVoice(); render(); return; }
    const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Recognition) {
      state.voiceMessage = "Voice input is not supported here. Type your request instead.";
      state.error = "";
      render();
      return;
    }
    voiceStartPrompt = normalize(state.prompt);
    voiceFinalText = "";
    recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => { state.voiceListening = true; state.voiceMessage = "Listening… describe the feature you want."; state.error = ""; render(); };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) voiceFinalText += `${transcript} `;
        else interim += transcript;
      }
      updateVoiceTranscript(interim);
      state.voiceMessage = interim ? "Listening…" : "Voice description captured. Review or edit it before continuing.";
      render();
    };
    recognition.onerror = (event) => { state.voiceListening = false; state.voiceMessage = voiceErrorMessage(event); recognition = null; render(); };
    recognition.onend = () => {
      if (state.voiceListening) state.voiceMessage = state.prompt ? "Voice description captured. Review or edit it before continuing." : "Voice input ended. You can try again or type your request.";
      state.voiceListening = false;
      recognition = null;
      render();
    };
    try { recognition.start(); }
    catch { state.voiceMessage = "Voice input is busy or unavailable. You can still type your request."; recognition = null; render(); }
  }
  function render() {
    shadow.querySelector(".wish-shell")?.remove();
    const shell = el("div", { className: "wish-shell" });
    const panel = el("aside", { className: "wish-panel", ariaLabel: "Wish page tools" });
    panel.hidden = !state.open;
    const close = el("button", { className: "wish-x", text: "×", ariaLabel: "Minimize Wish", onClick: () => { state.open = false; render(); } });
    panel.append(el("div", { className: "wish-top" }, [el("div", { className: "wish-brand" }, [el("span", { className: "wish-spark", text: "✦" }), el("span", { text: "Wish" })]), close]));

    if (!state.listings.length) {
      panel.append(el("p", { className: "wish-sub", text: "Wish could not reliably identify property listings on this page." }), el("div", { className: "wish-notice warn", text: "This adapter supports structured property cards with a visible currency, price period, and title. Try the included illustrative playground or provide a saved page sample." }));
    } else {
      const subtitle = el("p", { className: "wish-sub", text: `Wish found ${state.listings.length} listing${state.listings.length === 1 ? "" : "s"}. Type or describe the tool you wish this page had.` });
      const prompt = el("textarea", { className: "wish-prompt", value: state.prompt, placeholder: "e.g. Compare these homes, add a AED 150k budget, and show upfront costs.", ariaLabel: "What feature do you wish this page had?", onInput: (event) => { state.prompt = event.target.value; } });
      prompt.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") beginReview(); });
      const submit = el("button", { className: "wish-primary", disabled: state.loading, onClick: beginReview }, [state.loading ? el("span", { className: "wish-spinner" }) : null, document.createTextNode(state.loading ? "Working…" : "Plan my tools")]);
      const voice = el("button", { className: "wish-secondary", text: state.voiceListening ? "■ Stop voice" : "🎙 Describe by voice", ariaLabel: state.voiceListening ? "Stop voice description" : "Describe your request by voice", onClick: toggleVoice });
      voice.setAttribute("aria-pressed", String(state.voiceListening));
      panel.append(subtitle, prompt, el("div", { className: "wish-actions" }, [submit, voice, el("button", { className: "wish-link", text: "Example", onClick: () => { state.prompt = "Compare these apartments side by side. Add a AED 150k budget and let me enter deposit and agency fees."; render(); } })]), state.voiceMessage ? el("div", { className: `wish-notice ${state.voiceListening ? "info" : "warn"}`, text: state.voiceMessage }) : null, el("p", { className: "wish-help", text: "Voice starts only when you press the button. No audio goes to Wish; your browser may use its speech-recognition service. Review the transcript before continuing." }), el("div", { className: "wish-capabilities" }, ["Compare", "Budget", "Upfront estimate", "Research"].map((value) => el("span", { className: "wish-chip", text: value }))));

      if (state.reviewOpen) panel.append(renderReview());
      if (state.error) panel.append(el("div", { className: "wish-notice error", text: state.error }));
      if (state.status) panel.append(el("div", { className: "wish-notice info", text: state.status }));
      if (state.mode === "local-demo") panel.append(el("div", { className: "wish-notice warn", text: "Offline/demo mode — this configuration was made locally. It did not call OpenRouter." }));
      if (state.plan) panel.append(renderToolArea());
    }
    const bubble = el("button", { className: "wish-bubble", text: "✦  Wish", ariaLabel: state.open ? "Minimize Wish" : "Open Wish", onClick: () => { state.open = !state.open; render(); } });
    shell.append(panel, bubble); shadow.append(shell);
  }
  function renderReview() {
    const block = el("div", { className: "wish-section" });
    block.append(el("h3", { className: "wish-title", text: "Review page data before sending" }), el("p", { className: "wish-help", text: "Only checked listings — title, location, price, and a short visible excerpt — will go to the local Wish backend and then OpenRouter if configured." }));
    const list = el("div", { className: "wish-review-list" });
    for (const listing of state.listings) {
      const input = el("input", { type: "checkbox", checked: state.reviewIds.has(listing.id), ariaLabel: `Share ${listing.title}` });
      input.addEventListener("change", () => { if (input.checked) state.reviewIds.add(listing.id); else state.reviewIds.delete(listing.id); render(); });
      list.append(el("label", { className: "wish-review-row" }, [input, el("span", {}, [el("b", { text: listing.title }), el("span", { text: `${listing.location} · ${formatMoney(listing.price.amount, listing.price.currency)} / ${listing.price.period}` })]) ]));
    }
    const selected = reviewedListings().length;
    block.append(list, el("div", { className: "wish-actions" }, [el("button", { className: "wish-primary", disabled: !selected || state.loading, text: `Send ${selected} listing${selected === 1 ? "" : "s"} to Wish` , onClick: sendPlan }), el("button", { className: "wish-link", text: "Cancel", onClick: () => { state.reviewOpen = false; render(); } })]));
    return block;
  }
  function renderToolArea() {
    const tool = el("div");
    const planTitle = el("h3", { className: "wish-title", text: "Your page tools" });
    if (state.mode === "live") planTitle.append(el("span", { className: "wish-badge", text: "LIVE PLAN" }));
    tool.append(section("Configured", state.plan.explanation, [planTitle]));
    if (state.plan.components.includes("budget")) {
      const hidden = applyFilter();
      tool.append(section("Annual-rent budget", "Homes above this annual-rent amount are temporarily hidden. Values with another currency are never compared.", [inputField(`Maximum (${currencyForPage()})`, state.budgetAnnual, { min: "0", step: "1000" }, (value) => { state.budgetAnnual = value; state.userBudget = true; state.error = ""; syncCardControls(); save(); render(); }), hidden ? el("p", { className: "wish-hidden-count", text: `${hidden} listing${hidden === 1 ? " is" : "s are"} hidden by the budget.` }) : null]));
    }
    if (state.plan.components.includes("assumptions")) {
      const fields = el("div", { className: "wish-config-grid" }, [
        inputField("Equal rent installments", state.assumptions.installments, { min: "1", step: "1" }, (value) => { state.assumptions.installments = value; save(); render(); }),
        inputField(`Refundable deposit (${currencyForPage()})`, state.assumptions.deposit, { min: "0", step: "100" }, (value) => { state.assumptions.deposit = value; save(); render(); }),
        inputField(`Agency fee — fixed amount (${currencyForPage()})`, state.assumptions.agencyFee, { min: "0", step: "100" }, (value) => { state.assumptions.agencyFee = value; save(); render(); })
      ]);
      tool.append(section("Upfront assumptions", "Partial upfront estimate = first equal rent installment + refundable deposit + agency fee. Unlisted charges are excluded; percentage fees are not treated as amounts.", [fields]));
    }
    tool.append(section("Side-by-side comparison", "Annual rent keeps its page provenance; missing data stays unknown.", [renderComparison(), el("p", { className: "wish-help", text: "* Partial upfront cost is not annual expenditure. Refundable deposits are not recurring costs." })]));
    if (state.plan.researchRequested) {
      const queries = el("div", { className: "wish-review-list" }, state.plan.searchQueries.map((query) => el("div", { className: "wish-review-row", text: query })));
      const button = el("button", { className: "wish-secondary", disabled: state.loading, text: "Search Exa now", onClick: runResearch });
      tool.append(section("Research sources", "These proposed queries will be sent to Exa only if you click Search. At most 2 queries and 3 results each.", [queries, el("div", { className: "wish-actions" }, [button]), state.sources.length ? renderSources() : null]));
    }
    tool.append(el("div", { className: "wish-footer" }, [el("button", { className: "wish-link", text: "Export CSV", onClick: exportCsv }), el("button", { className: "wish-link", text: "Clear saved setup", onClick: clearSaved }), el("button", { className: "wish-link", text: "Remove Wish from page", onClick: destroy })]));
    return tool;
  }
  function beginReview() {
    const prompt = normalize(state.prompt);
    if (!prompt) { state.error = "Describe the feature you want first."; render(); return; }
    refreshListings(false);
    if (!state.listings.length) { state.error = "The page no longer contains supported listing cards."; render(); return; }
    state.error = ""; state.status = ""; state.reviewOpen = true;
    if (!state.reviewIds.size) state.reviewIds = new Set(state.listings.map((item) => item.id));
    render();
  }
  async function sendPlan() {
    const listings = reviewedListings();
    if (!listings.length) { state.error = "Choose at least one listing to share."; render(); return; }
    state.loading = true; state.error = ""; state.status = "Interpreting your request…"; const sentFingerprint = state.fingerprint; render();
    try {
      const data = await request("/api/plan", { prompt: normalize(state.prompt), listings: listings.map(({ element, ...item }) => item), pageFingerprint: sentFingerprint });
      refreshListings(false);
      if (state.fingerprint !== sentFingerprint || state.pageChanged || data.pageFingerprint !== sentFingerprint) throw Object.assign(new Error("The listing page changed while Wish was working. Refresh your request so a plan is never applied to the wrong home."), { code: "STALE_PAGE" });
      state.plan = data.plan; state.mode = data.mode; state.reviewOpen = false; state.pageChanged = false;
      if (!state.appliedOnce) state.selectedIds = new Set(data.plan.listingIds);
      if (data.plan.budgetAnnual !== null) { state.budgetAnnual = String(data.plan.budgetAnnual); state.userBudget = false; }
      state.appliedOnce = true; state.status = data.mode === "live" ? "Live OpenRouter plan validated and applied." : "Local demo plan applied. Add OpenRouter credentials to switch to live interpretation.";
      syncCardControls(); await save();
    } catch (error) { state.error = error.message || "Wish could not create a safe plan."; state.status = ""; }
    finally { state.loading = false; render(); }
  }
  async function runResearch() {
    state.loading = true; state.error = ""; state.status = "Searching Exa for the approved queries…"; render();
    try {
      const data = await request("/api/research", { queries: state.plan.searchQueries });
      state.sources = data.research || []; state.status = "Exa sources retrieved. Inspect the linked evidence before relying on it."; await save();
    } catch (error) { state.error = error.code === "EXA_NOT_CONFIGURED" ? "Exa is not configured yet. Your comparison remains available." : (error.message || "Research could not be completed. Your comparison remains available."); state.status = ""; }
    finally { state.loading = false; render(); }
  }
  function csvCell(value) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
  function exportCsv() {
    const rows = [["listing_id", "title", "location", "annual_rent", "currency", "annual_rent_provenance", "bedrooms", "bathrooms", "size", "deposit_user_entered", "agency_fee_user_entered", "equal_installments_user_entered", "partial_upfront_estimate", "partial_upfront_note"]];
    for (const listing of selectedListings()) rows.push([listing.id, listing.title, listing.location, annual(listing), listing.price.currency, sourceOfAnnual(listing), listing.bedrooms ?? "", listing.bathrooms ?? "", listing.size ?? "", state.assumptions.deposit || "unknown", state.assumptions.agencyFee || "unknown", state.assumptions.installments || "unknown", partial(listing) ?? "unknown", "first equal rent installment + refundable deposit + fixed agency fee; unlisted charges excluded"]);
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "wish-comparison.csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.status = "CSV exported with value provenance."; render();
  }
  async function clearSaved() { await message("wish:remove-saved", { key: storageKey }); state.status = "Saved Wish setup cleared for this page."; render(); }
  function destroy() { try { recognition?.abort(); } catch {} recognition = null; state.observer?.disconnect(); clearTimeout(refreshTimer); restorePage(); host.remove(); }
  host.addEventListener("wish:focus", () => { state.open = true; render(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && state.open) { state.open = false; render(); } });
  refreshListings(false);
  state.observer = new MutationObserver(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { refreshListings(true); render(); }, 450); });
  state.observer.observe(document.documentElement, { childList: true, subtree: true });
  render(); hydrate();
})();

