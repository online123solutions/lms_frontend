import React, { useCallback, useEffect, useState } from "react";
import { listQuestions, deleteQuestion } from "../../../api/quizAdminAPI";
import QuestionEditorModal from "./QuestionEditorModal";
import { ConfirmModal } from "./Modal";
import QuizStatus from "./QuizStatus";

export default function QuizQuestions({ quiz, onBack, onEditQuiz, onChanged }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // question object, or "new"
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listQuestions(quiz.id);
    if (res.success) setQuestions(res.data);
    else setError(res.error);
    setLoading(false);
  }, [quiz.id]);

  useEffect(() => { load(); }, [load]);

  const closeEditor = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const nextNumber = questions.reduce((m, q) => Math.max(m, q.question_number), 0) + 1;

  const onSaved = (saved, created) => {
    setEditing(null);
    setNotice(created ? "Question added." : "Question saved.");
    setQuestions((qs) => {
      const rest = qs.filter((q) => q.id !== saved.id);
      return [...rest, saved].sort((a, b) => a.question_number - b.question_number || a.id - b.id);
    });
    onChanged?.();
  };

  const confirmDelete = async () => {
    setBusy(true);
    const res = await deleteQuestion(deleting.id);
    setBusy(false);
    if (res.success) {
      setQuestions((qs) => qs.filter((q) => q.id !== deleting.id));
      setNotice("Question deleted.");
      onChanged?.();
    } else {
      setError(res.error);
    }
    setDeleting(null);
  };

  return (
    <div>
      <button className="qm-btn link qm-back" onClick={onBack}>← All quizzes</button>

      <div className="qm-quiz-head">
        <div>
          <h2 className="qm-title">{quiz.quiz_name}</h2>
          <div className="qm-subtitle">{quiz.topic}</div>
          <div className="qm-meta">
            <QuizStatus quiz={quiz} />
            <span className="qm-chip neutral">{quiz.department}</span>
            <span className="qm-chip neutral">{quiz.time} min</span>
            <span className="qm-chip neutral">Pass {quiz.passing_score_percentage}%</span>
            <span className="qm-chip neutral">{questions.length} question{questions.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="qm-actions">
          <button className="qm-btn" onClick={onEditQuiz}>✎ Edit quiz details</button>
          <button className="qm-btn primary" onClick={() => setEditing("new")}>+ Add question</button>
        </div>
      </div>

      {quiz.attempts_count > 0 && (
        <div className="qm-alert info">
          {quiz.attempts_count} learner(s) have already taken this quiz. Changing or deleting questions does not
          re-grade their past attempts; deleting a question removes their answer to it.
        </div>
      )}
      {error && <div className="qm-alert error">{error}</div>}
      {notice && <div className="qm-alert success">{notice}</div>}

      {loading ? (
        <div className="qm-empty">Loading questions…</div>
      ) : !questions.length ? (
        <div className="qm-empty">
          <div className="big">📝</div>
          <div>No questions yet.</div>
          <button className="qm-btn primary" style={{ marginTop: 12 }} onClick={() => setEditing("new")}>
            + Add the first question
          </button>
        </div>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="qm-qcard">
            <div className="qm-qnum">{q.question_number}</div>
            <div className="qm-qbody">
              {q.question && <p className="qm-qtext">{q.question}</p>}
              {q.question_image && <img className="qm-qimg" src={q.question_image} alt="" />}
              {q.answers.length > 0 ? (
                <ul className="qm-opts">
                  {q.answers.map((a, i) => (
                    <li key={a.id} className={`qm-opt ${a.correct ? "correct" : ""}`}>
                      <strong>{String.fromCharCode(65 + i)}.</strong>
                      {a.answer_image && <img src={a.answer_image} alt="" />}
                      {a.answer}
                      {a.correct && " ✓"}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="qm-muted" style={{ marginBottom: 8 }}>Written answer only</div>
              )}
              <div className="qm-meta" style={{ marginTop: 0 }}>
                {q.allow_custom_answer && <span className="qm-chip draft">Written answers allowed</span>}
                {q.expected_answer && <span className="qm-chip live">Expected: {q.expected_answer}</span>}
                {q.answers.length > 0 && !q.answers.some((a) => a.correct) && !q.expected_answer && (
                  <span className="qm-chip ended">No correct option set</span>
                )}
              </div>
            </div>
            <div className="qm-qactions">
              <button className="qm-btn sm" onClick={() => setEditing(q)}>Edit</button>
              <button className="qm-btn sm danger" onClick={() => setDeleting(q)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {editing && (
        <QuestionEditorModal
          quizId={quiz.id}
          question={editing === "new" ? null : editing}
          nextNumber={nextNumber}
          onClose={closeEditor}
          onSaved={onSaved}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete question?"
          message={
            <>
              Delete question {deleting.question_number}
              {deleting.question ? <> — “{deleting.question}”</> : null}? This cannot be undone.
              {quiz.attempts_count > 0 && <> Learners' answers to this question will also be removed.</>}
            </>
          }
          busy={busy}
          onConfirm={confirmDelete}
          onClose={closeDelete}
        />
      )}
    </div>
  );
}
