const BACKEND = "http://127.0.0.1:8787";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || /^(chrome|edge|about):/.test(tab.url)) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (error) {
    console.warn("Wish could not activate on this page", error?.message);
  }
});

async function backend(path, payload) {
  const response = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data?.error?.message || `Backend request failed (${response.status}).`);
    error.code = data?.error?.code || "BACKEND_UNAVAILABLE";
    throw error;
  }
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "wish:request") {
    backend(message.path, message.payload).then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: { code: error.code || "BACKEND_UNAVAILABLE", message: error.message } }));
    return true;
  }
  if (message?.type === "wish:save") {
    chrome.storage.local.set({ [message.key]: message.value }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: { message: error.message } }));
    return true;
  }
  if (message?.type === "wish:load") {
    chrome.storage.local.get(message.key).then((items) => sendResponse({ ok: true, value: items[message.key] || null })).catch((error) => sendResponse({ ok: false, error: { message: error.message } }));
    return true;
  }
  if (message?.type === "wish:remove-saved") {
    chrome.storage.local.remove(message.key).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: { message: error.message } }));
    return true;
  }
});

