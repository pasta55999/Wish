(() => {
  if (document.getElementById("wish-playground-preview")) return;
  const host = document.createElement("div");
  host.id = "wish-playground-preview";
  const shadow = host.attachShadow({ mode: "open" });
  document.body.append(host);

  const state = { open: false, prompt: "", consent: false, listening: false, voiceNote: "", loading: false, error: "", plan: null, mode: null, selected: new Set(), budget: "" };
  let recognition = null;
  let voiceBase = "";
  let voiceFinal = "";
  const savedDisplay = new Map();

  const style = document.createElement("style");
  style.textContent = `
    :host{all:initial}.wish-wrap{font-family:ui-rounded,"SF Pro Rounded","Segoe UI",sans-serif;color:#12322b;position:fixed;z-index:2147483647;right:22px;bottom:22px;font-size:13px}.wish-launch{border:0;border-radius:999px;background:linear-gradient(135deg,#275f4f,#83ae76);color:white;font:800 15px ui-rounded,"Segoe UI",sans-serif;padding:16px 21px;box-shadow:0 14px 35px #17382b55;cursor:pointer;letter-spacing:-.2px;transition:transform .18s}.wish-launch:hover{transform:translateY(-2px)}.wish-card{width:min(410px,calc(100vw - 32px));max-height:min(690px,calc(100vh - 98px));overflow:auto;margin-bottom:12px;background:#fffdf9;border:1px solid #d8e4d2;border-radius:20px;padding:17px;box-shadow:0 25px 70px #16362c42}.wish-card[hidden]{display:none}.wish-head{display:flex;align-items:center;justify-content:space-between}.wish-brand{font-size:18px;font-weight:800;letter-spacing:-.5px}.wish-brand span{display:inline-grid;place-items:center;width:28px;height:28px;margin-right:7px;border-radius:9px;background:#e3f0de;color:#2d664d}.wish-close,.wish-link{border:0;background:transparent;color:#557068;cursor:pointer;padding:5px;font:inherit}.wish-close{font-size:21px}.wish-copy{font-size:12px;line-height:1.5;color:#60736b;margin:11px 0}.wish-text{box-sizing:border-box;width:100%;min-height:82px;resize:vertical;padding:10px 11px;border:1px solid #d1dfca;border-radius:11px;background:#fff;color:#18362e;font:inherit;outline:none}.wish-text:focus{border-color:#709b66;box-shadow:0 0 0 3px #e1efdc}.wish-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.wish-primary,.wish-secondary{border:0;border-radius:10px;padding:9px 11px;cursor:pointer;font:700 12px ui-rounded,"Segoe UI",sans-serif}.wish-primary{background:#24594b;color:#fff}.wish-primary:disabled{opacity:.48;cursor:not-allowed}.wish-secondary{background:#e9f1e5;color:#2c5548}.wish-secondary[data-active="true"]{background:#f6dcd4;color:#843b2e}.wish-consent{display:flex;gap:8px;align-items:flex-start;margin-top:12px;padding:9px;border-radius:10px;background:#f2f6ee;color:#53665e;font-size:11px;line-height:1.4}.wish-consent input{margin-top:2px}.wish-note{padding:9px 10px;margin-top:10px;border-radius:10px;font-size:11px;line-height:1.45}.wish-note.info{background:#eaf3e6;color:#315d4d}.wish-note.warn{background:#fff3d8;color:#765513}.wish-note.error{background:#ffebe7;color:#8d382c}.wish-result{margin-top:14px;padding-top:13px;border-top:1px solid #e5eae2}.wish-result h3{margin:0 0 5px;font-size:13px}.wish-result p{margin:0 0 8px;color:#5f706a;font-size:11px;line-height:1.45}.wish-badge{display:inline-block;border-radius:99px;background:#fff1cb;color:#79530b;padding:3px 7px;font-size:10px;font-weight:800;margin-left:5px}.wish-compare{border:1px solid #dce6d8;border-radius:10px;overflow:hidden}.wish-row{display:flex;justify-content:space-between;gap:8px;padding:8px 9px;border-bottom:1px solid #edf1ea;font-size:11px}.wish-row:last-child{border-bottom:0}.wish-row b{font-size:12px}.wish-budget{display:block;margin:9px 0 0;color:#51665d;font-size:11px;font-weight:700}.wish-budget input{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:7px;border:1px solid #d6e0d1;border-radius:8px;font:inherit;color:#17362e}.wish-privacy{margin:9px 0 0;color:#728079;font-size:10px;line-height:1.35}@media(max-width:520px){.wish-wrap{right:12px;bottom:12px}.wish-launch{padding:14px 18px}.wish-card{max-height:calc(100vh - 82px)}}`;
  shadow.append(style);

  const money = (value) => `AED ${new Intl.NumberFormat().format(value)}`;
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const hash = (value) => { let number = 5381; for (const character of value) number = ((number << 5) + number) ^ character.charCodeAt(0); return (number >>> 0).toString(36); };
  const list = () => [...document.querySelectorAll(".property-card")].map((card) => {
    const text = clean(card.innerText);
    const price = text.match(/\bAED\s*([\d,.]+)\s*\/\s*(year|month)/i);
    const title = clean(card.querySelector("h3")?.textContent);
    const location = clean(card.querySelector(".meta")?.textContent);
    const facts = clean(card.querySelector(".facts")?.textContent);
    return { id: card.dataset.listingId || hash(`${title}|${location}`), title, location, price: { amount: Number(price?.[1]?.replace(/,/g, "")), currency: "AED", period: price?.[2] === "month" ? "monthly" : "annual" }, bedrooms: Number(facts.match(/(\d+)\s+bed/i)?.[1]) || null, bathrooms: Number(facts.match(/(\d+)\s+bath/i)?.[1]) || null, size: facts.match(/[\d,]+\s+sq\s*ft/i)?.[0] || null, excerpt: text.slice(0, 160), card };
  }).filter((item) => item.title && Number.isFinite(item.price.amount));
  const annual = (listing) => listing.price.period === "monthly" ? listing.price.amount * 12 : listing.price.amount;
  const fingerprint = () => hash(list().map((item) => `${item.id}:${item.price.amount}`).join("|"));

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.value !== undefined) node.value = options.value;
    if (options.checked !== undefined) node.checked = options.checked;
    if (options.disabled !== undefined) node.disabled = options.disabled;
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.ariaLabel) node.setAttribute("aria-label", options.ariaLabel);
    if (options.onClick) node.addEventListener("click", options.onClick);
    if (options.onInput) node.addEventListener("input", options.onInput);
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  }
  function syncPrompt() { const input = shadow.querySelector("textarea"); if (input) input.value = state.prompt; }
  function voiceError(event) {
    if (["not-allowed", "service-not-allowed"].includes(event?.error)) return "Microphone access was not granted. Type your request instead.";
    if (event?.error === "no-speech") return "No speech was detected. Try again or type your request.";
    return "Voice input is unavailable in this browser. Type your request instead.";
  }
  function toggleVoice() {
    if (state.listening) { recognition?.stop(); return; }
    const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Recognition) { state.voiceNote = "Voice input is not supported in this browser. Type your request instead."; render(); return; }
    voiceBase = clean(state.prompt); voiceFinal = "";
    recognition = new Recognition(); recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1; recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => { state.listening = true; state.voiceNote = "Listening… say what you wish this page could do for you."; render(); };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) voiceFinal += `${phrase} `; else interim += phrase;
      }
      state.prompt = [voiceBase, voiceFinal, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      state.voiceNote = interim ? "Listening…" : "Voice description captured. Review or edit it before creating your tool.";
      syncPrompt(); render();
    };
    recognition.onerror = (event) => { state.listening = false; state.voiceNote = voiceError(event); recognition = null; render(); };
    recognition.onend = () => { if (state.listening) state.voiceNote = state.prompt ? "Voice description captured. Review or edit it before creating your tool." : "Voice input ended. Try again or type your request."; state.listening = false; recognition = null; render(); };
    try { recognition.start(); } catch { state.voiceNote = "Voice input is busy or unavailable. Type your request instead."; recognition = null; render(); }
  }
  function clearCardControls() { document.querySelectorAll("[data-wish-preview-control]").forEach((node) => node.remove()); }
  function applyBudget() {
    const ceiling = Number(state.budget);
    for (const item of list()) {
      if (!savedDisplay.has(item.card)) savedDisplay.set(item.card, item.card.style.display);
      item.card.style.display = Number.isFinite(ceiling) && ceiling > 0 && annual(item) > ceiling ? "none" : savedDisplay.get(item.card);
    }
  }
  function addCardControls() {
    clearCardControls();
    for (const item of list()) {
      const label = document.createElement("label");
      label.setAttribute("data-wish-preview-control", "true");
      label.style.cssText = "display:flex;align-items:center;gap:7px;padding:9px 12px;background:#edf5e9;color:#2a5949;border-bottom:1px solid #d8e6d2;font:600 12px ui-sans-serif,system-ui;cursor:pointer;";
      const box = document.createElement("input"); box.type = "checkbox"; box.checked = state.selected.has(item.id);
      box.addEventListener("change", () => { if (box.checked) state.selected.add(item.id); else state.selected.delete(item.id); render(); });
      const text = document.createElement("span"); text.textContent = "Compare this home";
      label.append(box, text); item.card.prepend(label);
    }
    applyBudget();
  }
  async function createWish() {
    const prompt = clean(state.prompt);
    if (!prompt) { state.error = "Type or describe what you want Wish to add."; render(); return; }
    if (!state.consent) { state.error = "Confirm the illustrative listing data first."; render(); return; }
    const listings = list();
    state.loading = true; state.error = ""; render();
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, listings: listings.map(({ card, ...item }) => item), pageFingerprint: fingerprint() }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data?.error?.message || "Wish could not create a safe configuration.");
      if (data.pageFingerprint !== fingerprint()) throw new Error("The listings changed while Wish was working. Please try again.");
      state.plan = data.plan; state.mode = data.mode;
      if (!state.selected.size) state.selected = new Set(data.plan.listingIds);
      if (data.plan.budgetAnnual !== null) state.budget = String(data.plan.budgetAnnual);
      addCardControls();
    } catch (error) { state.error = error.message || "Wish could not create a safe configuration."; }
    finally { state.loading = false; render(); }
  }
  function resultPanel() {
    if (!state.plan) return null;
    const selected = list().filter((item) => state.selected.has(item.id));
    const result = el("section", { className: "wish-result" }, [el("h3", { text: "Your Wish is ready" }), el("p", { text: state.plan.explanation }), state.mode === "local-demo" ? el("span", { className: "wish-badge", text: "DEMO PLAN" }) : el("span", { className: "wish-badge", text: "LIVE PLAN" })]);
    const comparison = el("div", { className: "wish-compare" }, selected.length ? selected.map((item) => el("div", { className: "wish-row" }, [el("b", { text: item.title }), el("span", { text: `${money(annual(item))} / year` })])) : el("div", { className: "wish-row", text: "Choose homes using the green controls on each card." }));
    result.append(el("p", { text: "Selection controls have been added to the listing cards." }), comparison);
    if (state.plan.components.includes("budget")) {
      const input = el("input", { type: "number", value: state.budget, placeholder: "Annual-rent budget", onInput: (event) => { state.budget = event.target.value; applyBudget(); render(); } });
      result.append(el("label", { className: "wish-budget", text: "Annual-rent budget (AED)" }, [input]));
    }
    return result;
  }
  function render() {
    shadow.querySelector(".wish-wrap")?.remove();
    const wrap = el("div", { className: "wish-wrap" });
    const panel = el("aside", { className: "wish-card" }); panel.hidden = !state.open;
    panel.append(el("div", { className: "wish-head" }, [el("div", { className: "wish-brand" }, [el("span", { text: "✦" }), document.createTextNode("Wish")]), el("button", { className: "wish-close", text: "×", ariaLabel: "Close Wish", onClick: () => { state.open = false; render(); } })]));
    panel.append(el("p", { className: "wish-copy", text: "What do you wish this page could do for you? Type it, or tell Wish out loud." }));
    const input = el("textarea", { className: "wish-text", value: state.prompt, placeholder: "Compare these homes, add a AED 150k budget, and show upfront costs.", ariaLabel: "Describe your Wish", onInput: (event) => { state.prompt = event.target.value; } });
    panel.append(input);
    const voice = el("button", { className: "wish-secondary", text: state.listening ? "■ Stop voice" : "🎙 Talk to Wish", onClick: toggleVoice }); voice.dataset.active = String(state.listening);
    panel.append(el("div", { className: "wish-actions" }, [el("button", { className: "wish-primary", text: state.loading ? "Creating…" : "Create my Wish", disabled: state.loading, onClick: createWish }), voice]));
    if (state.voiceNote) panel.append(el("div", { className: `wish-note ${state.listening ? "info" : "warn"}`, text: state.voiceNote }));
    const consent = el("input", { type: "checkbox", checked: state.consent, ariaLabel: "Allow Wish to use the illustrative listing data" }); consent.addEventListener("change", () => { state.consent = consent.checked; state.error = ""; });
    panel.append(el("label", { className: "wish-consent" }, [consent, el("span", { text: `Use the ${list().length} clearly labeled illustrative listings to create this tool. You can review or edit your request before it is sent.` })]));
    panel.append(el("p", { className: "wish-privacy", text: "Voice starts only after you click it. No audio goes to Wish; your browser may use a speech-recognition service. Wish receives only the resulting text." }));
    if (state.error) panel.append(el("div", { className: "wish-note error", text: state.error }));
    const result = resultPanel(); if (result) panel.append(result);
    const launch = el("button", { className: "wish-launch", text: "✦  Wish", ariaLabel: state.open ? "Close Wish" : "Open Wish", onClick: () => { state.open = !state.open; render(); } });
    wrap.append(panel, launch); shadow.append(wrap);
  }
  render();
})();

