"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { QuestionReferenceMedia, getOfficialQuestionMedia } from "@/app/components/question-reference-media";
import { QuestionSchematic } from "@/app/components/question-schematic";
import type { StructuredQuestionExplanation } from "@/lib/question-explanations";

const GOOGLE_AI_MODE_URL = "https://www.google.com/ai";
const AI_MODE_CHANNEL = "wincraft-google-ai-mode";

type QuestionForExplanation = {
  id: string;
  text: string;
  domain: string;
  source: string;
  options: string[];
  correct: number;
  rationale: { en: string };
};

type Props = {
  question: QuestionForExplanation;
  showTranslations: boolean;
};

type HandoffState = {
  requestId: string;
  prompt: string;
  copied: boolean;
  opened: boolean;
  status: string;
};

function createPrompt(question: QuestionForExplanation) {
  const options = question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n");
  return [
    "Act as a careful AZ-802 Windows Server tutor.",
    "Explain this original practice question; do not reproduce or guess real Microsoft exam items or paid-course dumps.",
    "Use the supplied official source and rationale. Give: (1) the core concept, (2) why the correct option fits, (3) why each other option does not, and (4) a short troubleshooting or decision path.",
    "Keep command names and Windows Server terms in English in parentheses when translating.",
    "Return clear plain text with short headings.",
    `Question ID: ${question.id}`,
    `Domain: ${question.domain}`,
    `Question: ${question.text}`,
    `Options:\n${options}`,
    `Correct option: ${String.fromCharCode(65 + question.correct)}. ${question.options[question.correct] ?? ""}`,
    `Reviewed rationale: ${question.rationale.en}`,
    `Official source: ${question.source}`,
  ].join("\n\n");
}

function isTrustedBridgeOrigin(origin: string) {
  return origin === window.location.origin || origin === "https://www.google.com" || origin === "https://gemini.google.com";
}

export function QuestionExplanation({ question, showTranslations }: Props) {
  const [explanation, setExplanation] = useState<StructuredQuestionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [pastedResponse, setPastedResponse] = useState("");
  const [externalResponse, setExternalResponse] = useState("");
  const media = useMemo(() => getOfficialQuestionMedia(question.domain, question.text), [question.domain, question.text]);

  useEffect(() => {
    const receive = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const data = message as { type?: unknown; requestId?: unknown; responseText?: unknown; response?: unknown };
      if (data.type !== "WINCRAFT_GOOGLE_AI_MODE_RESPONSE" || typeof data.requestId !== "string") return;
      if (typeof data.responseText !== "string" && typeof data.response !== "string") return;
      const responseText = String(data.responseText ?? data.response).trim();
      if (!responseText) return;
      setExternalResponse(responseText);
      setHandoff((current) => current && current.requestId === data.requestId
        ? { ...current, status: "Google AI Mode response received." }
        : current);
    };
    const onWindowMessage = (event: MessageEvent) => {
      if (!isTrustedBridgeOrigin(event.origin)) return;
      receive(event.data);
    };
    window.addEventListener("message", onWindowMessage);
    let channel: BroadcastChannel | null = null;
    if (typeof window.BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(AI_MODE_CHANNEL);
      channel.addEventListener("message", (event) => receive(event.data));
    }
    return () => {
      window.removeEventListener("message", onWindowMessage);
      channel?.close();
    };
  }, []);

  const loadExplanation = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/question-explanations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id, locale: "en" }),
      });
      const body = await response.json().catch(() => ({})) as StructuredQuestionExplanation & { error?: string };
      if (!response.ok || !body.questionId) throw new Error(body.error ?? "The explanation service is unavailable.");
      setExplanation(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The explanation service is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const openGoogleAiMode = async () => {
    if (!explanation) void loadExplanation();
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const prompt = createPrompt(question);
    let copied = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      // Clipboard permissions are optional; the read-only prompt remains visible.
    }
    if (typeof window.BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AI_MODE_CHANNEL);
      channel.postMessage({ type: "WINCRAFT_GOOGLE_AI_MODE_REQUEST", requestId, prompt, questionId: question.id });
      channel.close();
    }
    const popup = window.open(GOOGLE_AI_MODE_URL, "wincraft-google-ai-mode", "popup,width=1100,height=820,resizable=yes,scrollbars=yes");
    setHandoff({
      requestId,
      prompt,
      copied,
      opened: Boolean(popup),
      status: popup ? "Google AI Mode opened. Paste and send the copied prompt there." : "The browser blocked the popup. Use the link below to open Google AI Mode.",
    });
  };

  const copyPrompt = async () => {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.prompt);
      setHandoff({ ...handoff, copied: true, status: "Prompt copied. Paste it into Google AI Mode and send it." });
    } catch {
      setHandoff({ ...handoff, status: "Copy was blocked; select the prompt below and copy it manually." });
    }
  };

  const usePastedResponse = () => {
    const response = pastedResponse.trim();
    if (!response) return;
    setExternalResponse(response);
    setHandoff((current) => current ? { ...current, status: "Your Google AI Mode response is shown in the explanation panel." } : current);
  };

  return <div className="question-learning-tools">
    <div className="question-learning-tools-header">
      <div>
        <p className="question-learning-tools-kicker">Learning aid</p>
        <h3>Understand this question</h3>
        <p className="question-learning-tools-copy">Get a source-linked explanation without an API key. You can also open the free Google AI Mode web app for a second explanation.</p>
      </div>
      <div className="question-learning-tools-actions">
        <button type="button" onClick={() => void loadExplanation()} disabled={loading} className="question-explain-button">
          {loading ? "Building explanation…" : explanation ? "Refresh source explanation" : "Show explanation"}
        </button>
        <button type="button" onClick={() => void openGoogleAiMode()} className="question-google-ai-button">
          Copy &amp; open Google AI Mode
        </button>
      </div>
    </div>
    {error && <p role="alert" className="question-explanation-error">{error}</p>}
    {handoff && <section className="question-ai-handoff" aria-label="Google AI Mode hand-off">
      <div className="question-ai-handoff-heading">
        <div><strong>Copy → paste workflow</strong><p>{handoff.status}</p></div>
        <button type="button" onClick={() => void copyPrompt()}>{handoff.copied ? "Prompt copied" : "Copy prompt"}</button>
      </div>
      <textarea className="question-ai-prompt" value={handoff.prompt} readOnly aria-label="Prompt for Google AI Mode" rows={7} />
      <label className="question-ai-response-label">Optional: paste the Google AI Mode response here to keep it beside the explanation
        <textarea className="question-ai-response" value={pastedResponse} onChange={(event) => setPastedResponse(event.target.value)} rows={4} />
      </label>
      <button type="button" onClick={usePastedResponse} disabled={!pastedResponse.trim()} className="question-ai-apply-button">Use pasted response</button>
      <a href={GOOGLE_AI_MODE_URL} target="_blank" rel="noreferrer" className="question-ai-open-link">Open Google AI Mode in a new tab ↗</a>
    </section>}
    {externalResponse && <section className="question-ai-response-panel" aria-live="polite"><h4>Google AI Mode response</h4><p>{externalResponse}</p></section>}
    {explanation && <div className="question-explanation-body">
      <div className="question-explanation-summary"><span className="question-explanation-provider">Microsoft Learn linked · no API key</span><GoogleSubtitle text={explanation.summary} enabled={showTranslations} /></div>
      <div className="question-explanation-section"><h4>Why the correct answer fits</h4><GoogleSubtitle text={explanation.whyCorrect} enabled={showTranslations} /></div>
      <div className="question-explanation-section"><h4>Decision path</h4><ol>{explanation.decisionSteps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><GoogleSubtitle text={step} enabled={showTranslations} /></li>)}</ol></div>
      <div className="question-explanation-section"><h4>Why the other options do not fit</h4><div className="question-distractor-list">{explanation.distractors.map((item) => <div key={item.optionIndex} className="question-distractor"><strong>{item.option}</strong><GoogleSubtitle text={item.reason} enabled={showTranslations} /></div>)}</div></div>
      <QuestionSchematic domain={question.domain} questionText={question.text} />
      <QuestionReferenceMedia media={media} />
      <a className="question-explanation-source" href={explanation.source.url || question.source} target="_blank" rel="noreferrer">{explanation.source.title} ↗</a>
    </div>}
  </div>;
}
