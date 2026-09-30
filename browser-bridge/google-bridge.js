/* global chrome, InputEvent, HTMLInputElement, HTMLTextAreaElement */
(() => {
  if (globalThis.__wincraftGoogleAiContentLoaded) return;
  globalThis.__wincraftGoogleAiContentLoaded = true;

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const isVisible = (node) => {
    const rect = node?.getBoundingClientRect?.();
    const style = node && getComputedStyle(node);
    return Boolean(rect?.width > 0 && rect?.height > 0 && style?.display !== "none" && style?.visibility !== "hidden");
  };
  const label = (node) => `${node?.getAttribute?.("aria-label") || ""} ${node?.getAttribute?.("title") || ""} ${node?.getAttribute?.("data-testid") || ""} ${node?.textContent || ""}`.toLowerCase();
  const composerSelectors = ["rich-textarea", "textarea", '[contenteditable="true"]', '[role="textbox"]', 'input[type="text"]'];
  const responseSelectors = [
    'main [data-message-author-role="model"]',
    'main [data-message-author-role="assistant"]',
    '[data-message-author-role="model"]',
    '[data-message-author-role="assistant"]',
    "main model-response",
    "model-response",
    "message-content",
    "main .response-container",
    "main .markdown",
    'main [role="article"]',
    'main [role="region"]',
  ];

  const innerComposer = (field) => field?.matches?.("rich-textarea") && (field.shadowRoot?.querySelector?.('[contenteditable="true"]') || field.querySelector?.('[contenteditable="true"]'));
  const readComposer = (field) => {
    const target = innerComposer(field) || field;
    return normalize(target?.value || target?.innerText || target?.textContent || "");
  };
  const findComposer = () => composerSelectors
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter((node) => isVisible(node) && !/search|address|url/i.test(label(node)))
    .sort((a, b) => Number(isVisible(b)) - Number(isVisible(a)))[0] || null;
  const setComposer = (field, value) => {
    const target = innerComposer(field) || field;
    target.focus();
    if (target.isContentEditable) {
      target.textContent = value;
      target.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: value }));
      return;
    }
    const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : target instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    Object.getOwnPropertyDescriptor(proto || {}, "value")?.set?.call(target, value);
    if (!proto) target.textContent = value;
    target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const findSend = (field) => {
    const nearby = field?.closest?.("form")?.querySelectorAll?.("button,[role=button]") || [];
    const candidates = [...nearby, ...document.querySelectorAll("button,[role=button]")];
    return [...new Set(candidates)].find((node) => isVisible(node)
      && !node.disabled
      && node.getAttribute("aria-disabled") !== "true"
      && /send|submit|ask|enter/i.test(label(node))
      && !/microphone|attach|upload|stop|cancel|new chat/i.test(label(node))) || null;
  };
  const collectResponseCandidates = () => responseSelectors
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter((node) => isVisible(node) && !node.closest("form") && !node.matches("button,a,input,textarea"));
  const responseText = (baseline, prompt) => {
    const candidates = [...new Set(collectResponseCandidates())]
      .map((node) => normalize(node.innerText || node.textContent || ""))
      .filter((text) => text.length >= 30 && !text.includes(normalize(prompt).slice(0, 80)) && !baseline.has(text));
    return candidates.sort((a, b) => b.length - a.length)[0] || "";
  };
  const waitForResponse = (requestId, prompt, baseline) => new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let lastText = "";
    let stableTicks = 0;
    const finish = (text) => {
      clearInterval(timer);
      observer.disconnect();
      chrome.runtime.sendMessage({ type: "WINCRAFT_AI_RESPONSE", requestId, responseText: text });
      resolve(text);
    };
    const check = () => {
      const text = responseText(baseline, prompt);
      if (text && text === lastText) stableTicks += 1; else stableTicks = 0;
      lastText = text;
      if (text && stableTicks >= 2) finish(text);
      else if (Date.now() - startedAt > 120_000) { clearInterval(timer); observer.disconnect(); reject(new Error("GOOGLE_AI_MODE_RESPONSE_TIMEOUT")); }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    const timer = setInterval(check, 700);
    check();
  });

  const submit = async ({ requestId, prompt }) => {
    const fieldStarted = Date.now();
    let field = findComposer();
    while (!field && Date.now() - fieldStarted < 15_000) { await new Promise((resolve) => setTimeout(resolve, 300)); field = findComposer(); }
    if (!field) return { ok: false, terminal: true, errorCode: "GOOGLE_AI_MODE_COMPOSER_NOT_FOUND" };
    const baseline = new Set(collectResponseCandidates().map((node) => normalize(node.innerText || node.textContent || "")).filter(Boolean));
    setComposer(field, prompt);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!readComposer(field).includes(normalize(prompt).slice(0, 60))) return { ok: false, terminal: true, errorCode: "GOOGLE_AI_MODE_PROMPT_INSERT_FAILED" };
    const button = findSend(field);
    if (button) button.click();
    else {
      const target = innerComposer(field) || field;
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, composed: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true, composed: true }));
    }
    void waitForResponse(requestId, prompt, baseline).catch((error) => {
      chrome.runtime.sendMessage({ type: "WINCRAFT_AI_RESPONSE", requestId, responseText: `Unable to capture the Google AI Mode response: ${String(error?.message || error)}` });
    });
    return { ok: true };
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "WINCRAFT_SUBMIT_PROMPT") return false;
    void submit(message).then(sendResponse);
    return true;
  });
})();
