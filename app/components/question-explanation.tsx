"use client";

import { useMemo, useState } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { QuestionReferenceMedia, getOfficialQuestionMedia } from "@/app/components/question-reference-media";
import { QuestionSchematic } from "@/app/components/question-schematic";

type QuestionForExplanation = {
  id: string;
  text: string;
  domain: string;
  source: string;
  options: string[];
  correct: number;
  rationale: { en: string; fa: string; de: string };
  topic?: string;
  difficulty?: string;
  objective?: string;
  keyPoints?: string[];
  whyOthers?: string[];
  requirements?: string;
  sourceRefs?: string[];
  commandPath?: { label: string; command: string }[];
};

type Props = {
  question: QuestionForExplanation;
  selectedAnswer: number;
  showTranslations: boolean;
  /**
   * AZ-802 replaced the generic domain schematic with question-specific
   * evidence (deciding facts, real command path, exact Learn pages). Other
   * courses keep the schematic, so the default preserves their behaviour.
   */
  showSchematic?: boolean;
};

/** Turns a Microsoft Learn URL into a short, still-precise label. */
function learnLabel(reference: string) {
  return reference.replace(/^https:\/\/learn\.microsoft\.com\/[a-z-]+\//, "");
}

/**
 * A self-contained explanation for the current question. It uses the reviewed
 * answer and rationale already stored with that question, so all questions work
 * inside CertPath without an API, extension, popup, or copy/paste flow.
 */
export function QuestionExplanation({ question, selectedAnswer, showTranslations, showSchematic = true }: Props) {
  const [open, setOpen] = useState(false);
  const correctAnswer = question.options[question.correct] ?? "Correct answer";
  const selectedOption = question.options[selectedAnswer] ?? "No answer";
  const media = useMemo(() => getOfficialQuestionMedia(question.domain, question.text), [question.domain, question.text]);
  const distractors = question.options
    .map((option, optionIndex) => ({ option, optionIndex, reason: question.whyOthers?.[optionIndex]?.trim() }))
    .filter(({ optionIndex }) => optionIndex !== question.correct);
  const keyPoints = question.keyPoints ?? [];
  const commandPath = question.commandPath ?? [];
  const references = question.sourceRefs ?? [];

  return <section className="question-learning-tools" aria-label={`Explanation for ${question.id}`}>
    <div className="question-learning-tools-header">
      <div>
        <p className="question-learning-tools-kicker">Question explain · {question.id}</p>
        <h3>Understand this exact question</h3>
        <p className="question-learning-tools-copy">The direct answer, the facts in this scenario that decide it, why every other option fails, and the exact Microsoft Learn page behind the objective.</p>
      </div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="question-explain-button">
        {open ? "Close explanation" : "Explain this question"}
      </button>
    </div>

    {open && <div className="question-explanation-body">
      <div className="question-explanation-summary">
        <span className="question-explanation-provider">Built into CertPath · question-specific</span>
        <strong>Correct answer: {correctAnswer}</strong>
        <GoogleSubtitle text={question.rationale.en} enabled={showTranslations} />
      </div>

      {keyPoints.length > 0 && <div className="question-explanation-section">
        <h4>What decides this answer</h4>
        <ul className="question-key-points">
          {keyPoints.map((point) => <li key={point}><GoogleSubtitle text={point} enabled={showTranslations} /></li>)}
        </ul>
      </div>}

      {question.requirements && <div className="question-explanation-section">
        <h4>Version, prerequisites, and limits</h4>
        <GoogleSubtitle text={question.requirements} enabled={showTranslations} />
      </div>}

      <div className={`question-explanation-choice ${selectedAnswer === question.correct ? "is-correct" : "is-incorrect"}`}>
        <h4>Your answer</h4>
        <strong>{selectedOption}</strong>
        <GoogleSubtitle
          text={selectedAnswer === question.correct
            ? `Your choice matches the required result: ${correctAnswer}.`
            : `Your choice does not match the required result. The reviewed answer is ${correctAnswer}.`}
          enabled={showTranslations}
        />
      </div>

      <div className="question-explanation-section">
        <h4>Why the other options do not fit</h4>
        <div className="question-distractor-list">{distractors.map((item) => <article key={item.optionIndex} className="question-distractor">
          <strong>{item.option}</strong>
          <p className="question-distractor-reason">
            <GoogleSubtitle
              text={item.reason || `${item.option} does not satisfy the requirement in this scenario. The reviewed answer is ${correctAnswer}. ${question.rationale.en}`}
              enabled={showTranslations}
            />
          </p>
        </article>)}</div>
      </div>

      {commandPath.length > 0 && <div className="question-explanation-section">
        <h4>What this looks like on a real server</h4>
        <div className="question-command-path">{commandPath.map((step) => <div key={`${step.label}:${step.command}`} className="question-command-step">
          <p><GoogleSubtitle text={step.label} enabled={showTranslations} /></p>
          <pre><code>{step.command}</code></pre>
        </div>)}</div>
      </div>}

      {references.length > 0 && <div className="question-explanation-section">
        <h4>Microsoft Learn documentation for this objective</h4>
        <ul className="question-source-refs">{references.map((reference) => <li key={reference}>
          <a href={reference} target="_blank" rel="noreferrer">{learnLabel(reference)} ↗</a>
        </li>)}</ul>
      </div>}

      {showSchematic && <QuestionSchematic domain={question.domain} questionText={question.text} showTranslations={showTranslations} />}
      <QuestionReferenceMedia media={media} />
      <a className="question-explanation-source" href={question.source} target="_blank" rel="noreferrer"><GoogleSubtitle text="AZ-802 study guide ↗" enabled={showTranslations} /></a>
    </div>}
  </section>;
}
