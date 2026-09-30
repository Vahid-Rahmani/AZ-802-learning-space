/* global chrome */
(() => {
  if (globalThis.__wincraftGoogleAiBridgeLoaded) return;
  globalThis.__wincraftGoogleAiBridgeLoaded = true;

  const forwardRequest = (data) => {
    if (!data || data.type !== "WINCRAFT_GOOGLE_AI_MODE_REQUEST" || typeof data.requestId !== "string" || typeof data.prompt !== "string") return;
    chrome.runtime.sendMessage({ type: "WINCRAFT_AI_REQUEST", payload: data }, () => {
      void chrome.runtime.lastError;
    });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "WINCRAFT_GOOGLE_AI_MODE_PING") {
      window.postMessage({ type: "WINCRAFT_GOOGLE_AI_MODE_BRIDGE_READY" }, "*");
      return;
    }
    forwardRequest(event.data);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || !["WINCRAFT_GOOGLE_AI_MODE_RESPONSE", "WINCRAFT_GOOGLE_AI_MODE_ERROR"].includes(message.type)) return;
    window.postMessage(message, "*");
  });

  window.postMessage({ type: "WINCRAFT_GOOGLE_AI_MODE_BRIDGE_READY" }, "*");
})();
