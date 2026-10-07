import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../../../utils/css/QuizManager.css";
import { getQuizOptions, listManagedQuizzes, deleteQuiz } from "../../../api/quizAdminAPI";
import QuizFormModal from "./QuizFormModal";
import QuizQuestions from "./QuizQuestions";
import { ConfirmModal } from "./Modal";
import QuizStatus from "./QuizStatus";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function QuizManager() {
  const [options, setOptions] = useState({ departments: [], quiz_types: [] });
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const [formQuiz, setFormQuiz] = useState(null); // quiz being edited, or "new"
  const [openQuizId, setOpenQuizId] = useState(null); // questions view
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listManagedQuizzes(department ? { department } : {});
    if (res.success) setQuizzes(Array.isArray(res.data) ? res.data : res.data?.results || []);
    else setError(res.error);
    setLoading(false);
  }, [department]);

  useEffect(() => {
    (async () => {
      const res = await getQuizOptions();
      if (res.success) setOptions(res.data);
      else setError(res.error);
    })();
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? quizzes.filter((q) => `${q.quiz_name} ${q.topic}`.toLowerCase().includes(s)) : quizzes;
  }, [quizzes, search]);

  const typeLabel = (v) => options.quiz_types.find((t) => t.value === v)?.label || v;
  const openQuiz = quizzes.find((q) => q.id === openQuizId);

  const closeForm = useCallback(() => setFormQuiz(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const onQuizSaved = (saved, created) => {
    setFormQuiz(null);
    setQuizzes((qs) => (created ? [{ question_count: 0, attempts_count: 0, ...saved }, ...qs] : qs.map((q) => (q.id === saved.id ? { ...q, ...saved } : q))));
    if (created) {
      setOpenQuizId(saved.id); // go straight to adding questions
      setNotice("");
    } else {
      setNotice("Quiz saved.");
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    const res = await deleteQuiz(deleting.id, deleting.attempts_count > 0);
    setBusy(false);
    if (res.success) {
      setQuizzes((qs) => qs.filter((q) => q.id !== deleting.id));
      setNotice(`Deleted “${deleting.quiz_name}”.`);
    } else {
      setError(res.error);
    }
    setDeleting(null);
  };

  return (
    <div className="qm-wrap">
      {openQuiz ? (
        <QuizQuestions
          quiz={openQuiz}
          onBack={() => { setOpenQuizId(null); load(); }}
          onEditQuiz={() => setFormQuiz(openQuiz)}
          onChanged={load}
        />
      ) : (
        <>
          <div className="qm-toolbar">
            <div>
              <h2 className="qm-title">Quizzes</h2>
              <div className="qm-subtitle">Create quizzes, add questions with images, options and written answers.</div>
            </div>
            <button className="qm-btn primary" onClick={() => setFormQuiz("new")} disabled={!options.departments.length}>
              + New quiz
            </button>
          </div>

          <div className="qm-filters" style={{ marginBottom: 14 }}>
            <input className="qm-input" placeholder="Search by name or topic" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="qm-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {options.departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          {error && <div className="qm-alert error">{error}</div>}
          {notice && <div className="qm-alert success">{notice}</div>}

          {loading ? (
            <div className="qm-empty">Loading quizzes…</div>
          ) : !visible.length ? (
            <div className="qm-empty">
              <div className="big">🗂️</div>
              <div>{quizzes.length ? "No quizzes match your search." : "No quizzes yet."}</div>
              {!quizzes.length && (
                <button className="qm-btn primary" style={{ marginTop: 12 }} onClick={() => setFormQuiz("new")}>
                  + Create your first quiz
                </button>
              )}
            </div>
          ) : (
            <div className="qm-table-wrap">
              <table className="qm-table">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Department</th>
                    <th>Questions</th>
                    <th>Open window</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <div className="qm-qname">{q.quiz_name}</div>
                        <div className="qm-muted">{q.topic} · {typeLabel(q.quiz_type)} · {q.time} min · pass {q.passing_score_percentage}%</div>
                      </td>
                      <td data-label="Department">{q.department}</td>
                      <td data-label="Questions">{q.question_count}</td>
                      <td data-label="Open window" className="qm-muted">{fmt(q.start_date)} → {fmt(q.end_date)}</td>
                      <td data-label="Status"><QuizStatus quiz={q} /></td>
                      <td data-label="Attempts">{q.attempts_count}</td>
                      <td>
                        <div className="qm-actions">
                          <button className="qm-btn sm primary" onClick={() => setOpenQuizId(q.id)}>Questions</button>
                          <button className="qm-btn sm" onClick={() => setFormQuiz(q)}>Edit</button>
                          <button className="qm-btn sm danger" onClick={() => setDeleting(q)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {formQuiz && (
        <QuizFormModal
          quiz={formQuiz === "new" ? null : formQuiz}
          options={options}
          onClose={closeForm}
          onSaved={onQuizSaved}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete quiz?"
          message={
            <>
              Delete “{deleting.quiz_name}” and its {deleting.question_count} question(s)? This cannot be undone.
              {deleting.attempts_count > 0 && (
                <div className="qm-alert error" style={{ marginTop: 10, marginBottom: 0 }}>
                  {deleting.attempts_count} learner attempt(s) and their scores will also be deleted.
                </div>
              )}
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
