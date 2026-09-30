# WinCraft Google AI Mode Bridge

This is an optional, separate Chrome MV3 extension for the fully automated explanation flow. It is modelled after the read-only Zova architecture: the WinCraft page sends a request to an app content bridge, the service worker opens or reuses a Google AI Mode tab, the Google content bridge inserts/submits the prompt and observes the response, and the response is returned to the question panel.

It uses the learner's signed-in Google web session. It does not use a Google AI API key, Gemini API key, WebSocket key, server proxy, or paid quota. The Google page may still ask the learner to sign in or may change its DOM; the bridge reports that state instead of bypassing it.

## Install for local testing

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `browser-bridge` folder.
4. Open or refresh WinCraft, answer a question, and choose **Copy & open Google AI Mode**. With the bridge installed, the prompt is submitted automatically and the captured response appears in the question explanation panel.

The extension is intentionally separate from `zova`; no Zova file is required or modified. Google selectors are isolated in `google-bridge.js` so they can be reviewed or updated without touching the learning app.
