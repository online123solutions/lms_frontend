import React, { useState } from "react";
import Modal from "./Modal";
import { createQuiz, updateQuiz } from "../../../api/quizAdminAPI";

// API datetimes come back in IST ("2026-10-07T10:00:00+05:30"); <input type="datetime-local"> wants "2026-10-07T10:00"
const toInput = (iso) => (iso ? iso.slice(0, 16) : "");

const pad = (n) => String(n).padStart(2, "0");
const localInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function QuizFormModal({ quiz, options, onClose, onSaved }) {
  const now = new Date();
  const [form, setForm] = useState(() => ({
    quiz_name: quiz?.quiz_name || "",
    topic: quiz?.topic || "",
    department: quiz?.department || options.departments[0]?.value || "",
    quiz_type: quiz?.quiz_type || "daily-quiz",
    time: quiz?.time ?? 10,
    passing_score_percentage: quiz?.passing_score_percentage ?? 60,
    start_date: quiz ? toInput(quiz.start_date) : localInput(now),
    end_date: quiz ? toInput(quiz.end_date) : localInput(new Date(now.getTime() + 7 * 24 * 3600 * 1000)),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!form.quiz_name.trim() || !form.topic.trim()) return setError("Enter a quiz name and topic.");
    if (!form.start_date || !form.end_date) return setError("Set when the quiz opens and closes.");
    setSaving(true);
    const payload = {
      ...form,
      quiz_name: form.quiz_name.trim(),
      topic: form.topic.trim(),
      time: Number(form.time),
      passing_score_percentage: Number(form.passing_score_percentage),
    };
    const res = quiz ? await updateQuiz(quiz.id, payload) : await createQuiz(payload);
    setSaving(false);
    if (res.success) onSaved(res.data, !quiz);
    else setError(res.error);
  };

  return (
    <Modal
      title={quiz ? "Edit quiz" : "New quiz"}
      onClose={onClose}
      footer={
        <>
          <button className="qm-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="qm-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : quiz ? "Save changes" : "Create quiz"}
          </button>
        </>
      }
    >
      {error && <div className="qm-alert error">{error}</div>}
      <form className="qm-grid" onSubmit={submit}>
        <div className="qm-field full">
          <label>Quiz name</label>
          <input className="qm-input" value={form.quiz_name} onChange={set("quiz_name")} maxLength={150} autoFocus placeholder="e.g. Tekla Basics – Week 1" />
        </div>
        <div className="qm-field full">
          <label>Topic</label>
          <input className="qm-input" value={form.topic} onChange={set("topic")} maxLength={150} placeholder="Shown to learners on the quiz card" />
        </div>
        <div className="qm-field">
          <label>Department</label>
          <select className="qm-select" value={form.department} onChange={set("department")}>
            {options.departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <div className="qm-hint">Only learners in this department see the quiz.</div>
        </div>
        <div className="qm-field">
          <label>Quiz type</label>
          <select className="qm-select" value={form.quiz_type} onChange={set("quiz_type")}>
            {options.quiz_types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="qm-field">
          <label>Time limit (minutes)</label>
          <input className="qm-input" type="number" min={1} max={1440} value={form.time} onChange={set("time")} />
        </div>
        <div className="qm-field">
          <label>Pass mark (%)</label>
          <input className="qm-input" type="number" min={0} max={100} value={form.passing_score_percentage} onChange={set("passing_score_percentage")} />
        </div>
        <div className="qm-field">
          <label>Opens</label>
          <input className="qm-input" type="datetime-local" value={form.start_date} onChange={set("start_date")} />
        </div>
        <div className="qm-field">
          <label>Closes</label>
          <input className="qm-input" type="datetime-local" value={form.end_date} onChange={set("end_date")} />
        </div>
        <div className="qm-hint full">Times are in Indian Standard Time (IST). Learners can only take the quiz between these times.</div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
