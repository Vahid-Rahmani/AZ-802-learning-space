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
};

type Props = {
  question: QuestionForExplanation;
  selectedAnswer: number;
  showTranslations: boolean;
};

/**
 * A self-contained explanation for the current question. It uses the reviewed
 * answer and rationale already stored with that question, so all 300 questions
 * work inside CertPath without an API, extension, popup, or copy/paste flow.
 */
export function QuestionExplanation({ question, selectedAnswer, showTranslations }: Props) {
  const [open, setOpen] = useState(false);
  const correctAnswer = question.options[question.correct] ?? "Correct answer";
  const selectedOption = question.options[selectedAnswer] ?? "No answer";
  const media = useMemo(() => getOfficialQuestionMedia(question.domain, question.text), [question.domain, question.text]);
  const distractors = question.options
    .map((option, optionIndex) => ({ option, optionIndex }))
    .filter(({ optionIndex }) => optionIndex !== question.correct);

  return <section className="question-learning-tools" aria-label={`Explanation for ${question.id}`}>
    <div className="question-learning-tools-header">
      <div>
        <p className="question-learning-tools-kicker">Question explain · {question.id}</p>
        <h3>Understand this exact question</h3>
        <p className="question-learning-tools-copy">The explanation uses this question&apos;s own answer, rationale, options, domain, and Microsoft Learn source.</p>
      </div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="question-explain-button">
        {open ? "Close explanation" : "Explain this question"}
      </button>
    </div>

    {open && <div className="question-explanation-body">
      <div className="question-explanation-summary">
        <span className="question-explanation-provider">Built into CertPath · question-specific</span>
        <strong>Correct answer: {correctAnswer}</strong>
        <GoogleSubtitle text={`This question asks: ${question.text}`} enabled={showTranslations} />
      </div>

      <div className="question-explanation-section">
        <h4>Why the correct answer fits</h4>
        <GoogleSubtitle text={question.rationale.en} enabled={showTranslations} />
      </div>

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
            <GoogleSubtitle text={`${item.option} does not meet the requirement in this scenario. The reviewed answer is ${correctAnswer}. ${question.rationale.en}`} enabled={showTranslations} />
          </p>
        </article>)}</div>
      </div>

      <QuestionSchematic domain={question.domain} questionText={question.text} showTranslations={showTranslations} />
      <QuestionReferenceMedia media={media} />
      <a className="question-explanation-source" href={question.source} target="_blank" rel="noreferrer"><GoogleSubtitle text="Microsoft Learn source ↗" enabled={showTranslations} /></a>
    </div>}
  </section>;
}
