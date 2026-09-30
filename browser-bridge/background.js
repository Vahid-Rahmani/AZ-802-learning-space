/* global chrome */
const GOOGLE_URL = "https://www.google.com/ai";
const requests = new Map();

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isWinCraftUrl(url = "") {
  return url.startsWith("http://localhost:5173/")
    || url.startsWith("https://az-802-eosin.vercel.app/")
    || url.startsWith("https://wincraft-az802.vahid-rahmani.chatgpt.site/");
}

async function createGoogleTab() {
  const createdWindow = await chrome.windows.create({ url: GOOGLE_URL, type: "popup", focused: true, width: 1100, height: 820 });
  const createdTab = createdWindow.tabs?.[0];
  if (!createdTab?.id) throw new Error("GOOGLE_AI_MODE_TAB_FAILED");
  return { tabId: createdTab.id, windowId: createdWindow.id, created: true };
}

async function sendPromptWhenReady(tabId, request) {
  let lastError = "GOOGLE_AI_MODE_CONTENT_NOT_READY";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: "WINCRAFT_SUBMIT_PROMPT", requestId: request.requestId, prompt: request.prompt });
      if (result?.ok) return;
      lastError = result?.errorCode || lastError;
      if (result?.terminal) break;
    } catch (error) {
      lastError = String(error?.message || lastError);
    }
    await wait(500);
  }
  throw new Error(lastError);
}

async function runRequest(payload, appTabId) {
  const request = { requestId: payload.requestId, prompt: payload.prompt, appTabId, tabId: null, windowId: null };
  requests.set(request.requestId, request);
  try {
    const google = await createGoogleTab();
    request.tabId = google.tabId;
    request.windowId = google.windowId;
    await sendPromptWhenReady(google.tabId, request);
  } catch (error) {
    requests.delete(request.requestId);
    await chrome.tabs.sendMessage(appTabId, {
      type: "WINCRAFT_GOOGLE_AI_MODE_ERROR",
      requestId: request.requestId,
      errorCode: String(error?.message || "GOOGLE_AI_MODE_REQUEST_FAILED"),
    }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "WINCRAFT_AI_REQUEST") {
    const tabId = sender.tab?.id;
    const payload = message.payload;
    if (!tabId || !isWinCraftUrl(sender.tab?.url) || !payload?.requestId || !payload?.prompt) {
      sendResponse({ ok: false, errorCode: "INVALID_WINCRAFT_REQUEST" });
      return false;
    }
    void runRequest(payload, tabId);
    sendResponse({ ok: true, requestId: payload.requestId });
    return false;
  }

  if (message?.type === "WINCRAFT_AI_RESPONSE") {
    const request = requests.get(message.requestId);
    if (!request || sender.tab?.id !== request.tabId || !String(message.responseText || "").trim()) return false;
    requests.delete(message.requestId);
    void chrome.tabs.sendMessage(request.appTabId, {
      type: "WINCRAFT_GOOGLE_AI_MODE_RESPONSE",
      requestId: request.requestId,
      responseText: String(message.responseText).trim(),
    }).catch(() => {});
    return false;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [requestId, request] of requests) {
    if (request.tabId !== tabId) continue;
    requests.delete(requestId);
    void chrome.tabs.sendMessage(request.appTabId, {
      type: "WINCRAFT_GOOGLE_AI_MODE_ERROR",
      requestId,
      errorCode: "GOOGLE_AI_MODE_TAB_CLOSED",
    }).catch(() => {});
  }
});
