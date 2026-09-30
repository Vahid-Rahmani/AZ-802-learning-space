"use client";

import { useState } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { QuestionReferenceMedia, getOfficialQuestionMedia } from "@/app/components/question-reference-media";
import { QuestionSchematic } from "@/app/components/question-schematic";
import type { StructuredQuestionExplanation } from "@/lib/question-explanations";

type QuestionForExplanation = {
  id: string;
  text: string;
  domain: string;
  source: string;
  rationale: { en: string };
};

type Props = {
  question: QuestionForExplanation;
  showTranslations: boolean;
};

export function QuestionExplanation({ question, showTranslations }: Props) {
  const [explanation, setExplanation] = useState<StructuredQuestionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const media = getOfficialQuestionMedia(question.domain, question.text);

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

  return <div className="question-learning-tools">
    <div className="question-learning-tools-header">
      <div>
        <p className="question-learning-tools-kicker">Learning aid</p>
        <h3>Understand this question</h3>
        <p className="question-learning-tools-copy">Get an original, source-linked explanation and a short decision path. It never reveals or recreates real exam items.</p>
      </div>
      <button type="button" onClick={() => void loadExplanation()} disabled={loading} className="question-explain-button">
        {loading ? "Building explanation…" : explanation ? "Refresh AI explanation" : "Explain with AI"}
      </button>
    </div>
    {error && <p role="alert" className="question-explanation-error">{error}</p>}
    {explanation && <div className="question-explanation-body">
      <div className="question-explanation-summary"><span className="question-explanation-provider">{explanation.provider === "gemini" ? "Google Gemini" : "Source-linked fallback"}</span><GoogleSubtitle text={explanation.summary} enabled={showTranslations} /></div>
      <div className="question-explanation-section"><h4>Why the correct answer fits</h4><GoogleSubtitle text={explanation.whyCorrect} enabled={showTranslations} /></div>
      <div className="question-explanation-section"><h4>Decision path</h4><ol>{explanation.decisionSteps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><GoogleSubtitle text={step} enabled={showTranslations} /></li>)}</ol></div>
      <div className="question-explanation-section"><h4>Why the other options do not fit</h4><div className="question-distractor-list">{explanation.distractors.map((item) => <div key={item.optionIndex} className="question-distractor"><strong>{item.option}</strong><GoogleSubtitle text={item.reason} enabled={showTranslations} /></div>)}</div></div>
      <QuestionSchematic domain={question.domain} questionText={question.text} />
      <QuestionReferenceMedia media={media} />
      <a className="question-explanation-source" href={explanation.source.url || question.source} target="_blank" rel="noreferrer">{explanation.source.title} ↗</a>
    </div>}
  </div>;
}
