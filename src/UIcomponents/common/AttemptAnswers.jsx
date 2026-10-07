import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "../../utils/css/AttemptAnswers.css";
import { getQuizAttempt, markResultAnswer } from "../../api/apiservice";

const isAnswered = (q) => Boolean(q.selected_answer_id || q.custom_answer);

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "review", label: "Written answers", test: (q) => Boolean(q.custom_answer) },
  { key: "wrong", label: "Wrong", test: (q) => isAnswered(q) && !q.is_correct },
  { key: "skipped", label: "Not answered", test: (q) => !isAnswered(q) },
];

const initials = (name = "") =>
  name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";

/**
 * Dialog showing every question of a quiz with one user's answers.
 * Admins/trainers can mark each answer correct or wrong; the score is recalculated on the server.
 * onScoreChange(score) lets the parent table update its score column.
 */
export default function AttemptAnswers({ quizId, username, onScoreChange, onClose }) {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null); // result_answer_id being saved
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      const res = await getQuizAttempt(quizId, username);
      if (res.success) setAttempt(res.data);
      else setError(typeof res.error === "string" ? res.error : "Failed to load answers.");
      setLoading(false);
    })();
  }, [quizId, username]);

  // Close on Escape and stop the page behind from scrolling
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const questions = attempt?.questions || [];
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, questions.filter(f.test).length])),
    [questions]
  );
  const visible = questions.filter(FILTERS.find((f) => f.key === filter).test);

  const mark = async (q, isCorrect) => {
    if (!q.result_answer_id || q.is_correct === isCorrect) return;
    setSaving(q.result_answer_id);
    setError("");
    const res = await markResultAnswer(q.result_answer_id, isCorrect);
    if (res.success) {
      const d = res.data;
      setAttempt((a) => ({
        ...a,
        score: d.score,
        correct_questions: d.correct_questions,
        wrong_questions: d.wrong_questions,
        questions: a.questions.map((x) =>
          x.result_answer_id === q.result_answer_id ? { ...x, is_correct: d.is_correct } : x
        ),
      }));
      onScoreChange?.(d.score);
    } else {
      setError(typeof res.error === "string" ? res.error : "Failed to update answer.");
    }
    setSaving(null);
  };

  const passed = attempt && attempt.score >= (attempt.passing_score_percentage ?? 0);
  const name = attempt?.name || username;

  // Portal to <body> so the dashboard's own stacking contexts can't cover the dialog
  return createPortal(
    <div className="aa-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="aa-dialog" role="dialog" aria-modal="true" aria-label={`Answers of ${name}`}>
        <div className="aa-header">
          <div className="aa-header-top">
            <div className="aa-avatar">{initials(name)}</div>
            <div className="aa-title">
              <p className="aa-name">{name}</p>
              <div className="aa-sub">
                @{username}
                {attempt && <> · {attempt.quiz_name}</>}
                {attempt?.date_attempted && <> · {new Date(attempt.date_attempted).toLocaleString()}</>}
              </div>
            </div>
            <button className="aa-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          {attempt && (
            <>
              <div className="aa-stats">
                <div className={`aa-stat score ${passed ? "pass" : "fail"}`}>
                  <div className="aa-stat-k">
                    Score
                    <span className="aa-pass-tag">
                      {passed ? "Passed" : "Failed"} (pass {attempt.passing_score_percentage}%)
                    </span>
                  </div>
                  <div className="aa-stat-v">{attempt.score}%</div>
                </div>
                <div className="aa-stat">
                  <div className="aa-stat-k">Correct</div>
                  <div className="aa-stat-v">{attempt.correct_questions}</div>
                </div>
                <div className="aa-stat">
                  <div className="aa-stat-k">Wrong</div>
                  <div className="aa-stat-v">{attempt.wrong_questions}</div>
                </div>
                <div className="aa-stat">
                  <div className="aa-stat-k">Not answered</div>
                  <div className="aa-stat-v">{counts.skipped}</div>
                </div>
              </div>

              <div className="aa-tabs">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`aa-tab ${filter === f.key ? "active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                    <span className="count">({counts[f.key]})</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="aa-body">
          {error && <div className="aa-error">{error}</div>}
          {loading && <div className="aa-empty">Loading answers…</div>}
          {!loading && attempt && !visible.length && (
            <div className="aa-empty">No questions in this list.</div>
          )}

          {visible.map((q) => {
            const answered = isAnswered(q);
            const status = !answered ? "skipped" : q.is_correct ? "correct" : "wrong";
            const index = questions.indexOf(q) + 1;
            return (
              <div key={q.question_id} className={`aa-card ${answered ? status : ""}`}>
                <div className="aa-card-head">
                  <span className="aa-qnum">Question {index}</span>
                  <span>
                    {q.custom_answer && <span className="aa-badge review">Written</span>}
                    <span className={`aa-badge ${status}`}>
                      {status === "skipped" ? "Not answered" : status === "correct" ? "Correct" : "Wrong"}
                    </span>
                  </span>
                </div>
                {q.question && <p className="aa-qtext">{q.question}</p>}
                {q.question_image && (
                  <a href={q.question_image} target="_blank" rel="noreferrer" title="Open full size">
                    <img className="aa-qimg" src={q.question_image} alt={`Question ${index}`} />
                  </a>
                )}

                {q.options.length > 0 && (
                  <ul className="aa-options">
                    {q.options.map((opt, j) => {
                      const chosen = opt.id === q.selected_answer_id;
                      const cls = opt.correct ? "is-correct" : chosen ? "is-chosen-wrong" : "";
                      return (
                        <li key={opt.id} className={`aa-opt ${cls}`}>
                          <span className="aa-opt-letter">{String.fromCharCode(65 + j)}</span>
                          <span className="aa-opt-body">
                            {opt.answer}
                            {opt.answer_image && <img className="aa-opt-img" src={opt.answer_image} alt="" />}
                          </span>
                          {chosen && <span className="aa-tag chosen">Their answer</span>}
                          {opt.correct && <span className="aa-tag correct">Correct answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {q.custom_answer && (
                  <div className="aa-written">
                    <div className="aa-written-k">Their written answer</div>
                    <div className="aa-written-v">{q.custom_answer}</div>
                    <div className="aa-expected">
                      Expected: <strong>{q.correct_answer || "not set — please review"}</strong>
                    </div>
                  </div>
                )}
                {!q.options.length && !q.custom_answer && q.correct_answer && (
                  <div className="aa-expected">Expected: <strong>{q.correct_answer}</strong></div>
                )}

                {answered && (
                  <div className="aa-mark">
                    <span className="aa-mark-label">Mark as:</span>
                    <button
                      className={`aa-mark-btn ok ${q.is_correct ? "active" : ""}`}
                      disabled={saving === q.result_answer_id}
                      onClick={() => mark(q, true)}
                    >
                      ✓ Correct
                    </button>
                    <button
                      className={`aa-mark-btn no ${!q.is_correct ? "active" : ""}`}
                      disabled={saving === q.result_answer_id}
                      onClick={() => mark(q, false)}
                    >
                      ✗ Wrong
                    </button>
                    {saving === q.result_answer_id && <span className="aa-mark-label">Saving…</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
