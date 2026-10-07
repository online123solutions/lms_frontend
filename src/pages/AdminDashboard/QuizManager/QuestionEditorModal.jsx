import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { saveQuestion } from "../../../api/quizAdminAPI";

let keySeq = 0;
const newKey = () => `opt-${++keySeq}`;
const blankOption = () => ({ key: newKey(), answer: "", correct: false, imageUrl: null, file: null, removeImage: false });

const MAX_IMAGE_MB = 5;

// File input + preview + remove button
function ImagePicker({ url, onPick, onRemove, small, label = "Add image" }) {
  const ref = useRef(null);
  return (
    <div className={`qm-image ${small ? "small" : ""}`}>
      {url && <img src={url} alt="" />}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="qm-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
      <button type="button" className="qm-btn sm" onClick={() => ref.current?.click()}>
        {url ? "Change" : `🖼 ${label}`}
      </button>
      {url && (
        <button type="button" className="qm-btn sm danger" onClick={onRemove}>Remove</button>
      )}
    </div>
  );
}

export default function QuestionEditorModal({ quizId, question, nextNumber, onClose, onSaved }) {
  const [number, setNumber] = useState(question?.question_number ?? nextNumber);
  const [text, setText] = useState(question?.question || "");
  const [image, setImage] = useState({ url: question?.question_image || null, file: null, remove: false });
  const [options, setOptions] = useState(() =>
    question
      ? question.answers.map((a) => ({
          key: newKey(), id: a.id, answer: a.answer, correct: a.correct,
          imageUrl: a.answer_image, file: null, removeImage: false,
        }))
      : [blankOption(), blankOption(), blankOption(), blankOption()]
  );
  const [allowWritten, setAllowWritten] = useState(question?.allow_custom_answer ?? true);
  const [expected, setExpected] = useState(question?.expected_answer || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Free object URLs created for previews
  const objectUrls = useRef([]);
  useEffect(() => () => objectUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const preview = (file) => {
    const u = URL.createObjectURL(file);
    objectUrls.current.push(u);
    return u;
  };
  const checkSize = (file) => {
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Images must be under ${MAX_IMAGE_MB} MB.`);
      return false;
    }
    return true;
  };

  const updateOption = (key, patch) => setOptions((os) => os.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const setCorrect = (key) => setOptions((os) => os.map((o) => ({ ...o, correct: o.key === key ? !o.correct : false })));

  // Options left blank (no text, no image) are ignored when saving
  const filled = options.filter((o) => o.answer.trim() || o.imageUrl);
  const writtenOnly = filled.length === 0;

  const submit = async () => {
    setError("");
    if (!text.trim() && !image.url) return setError("Enter the question text or add an image.");
    if (!writtenOnly && !filled.some((o) => o.correct) && !expected.trim() && !allowWritten)
      return setError("Mark which option is correct.");

    const fd = new FormData();
    if (!question) fd.append("quiz", quizId);
    fd.append("question_number", number || nextNumber);
    fd.append("question", text.trim());
    fd.append("allow_custom_answer", writtenOnly || allowWritten ? "true" : "false");
    fd.append("expected_answer", expected.trim());
    if (image.file) fd.append("question_image", image.file);
    else if (image.remove) fd.append("remove_question_image", "true");

    const answers = filled.map((o, i) => {
      const item = { answer: o.answer.trim(), correct: o.correct };
      if (o.id) item.id = o.id;
      if (o.file) {
        item.image_field = `answer_image_${i}`;
        fd.append(item.image_field, o.file);
      } else if (o.removeImage) {
        item.remove_image = true;
      }
      return item;
    });
    fd.append("answers", JSON.stringify(answers));

    setSaving(true);
    const res = await saveQuestion(question?.id, fd);
    setSaving(false);
    if (res.success) onSaved(res.data, !question);
    else setError(res.error);
  };

  return (
    <Modal
      title={question ? `Edit question ${question.question_number}` : "Add question"}
      onClose={onClose}
      footer={
        <>
          <button className="qm-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="qm-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save question"}
          </button>
        </>
      }
    >
      {error && <div className="qm-alert error">{error}</div>}

      <div className="qm-grid">
        <div className="qm-field full">
          <label>Question</label>
          <textarea
            className="qm-textarea"
            rows={2}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type the question, or leave empty if the image is the whole question"
            autoFocus
          />
        </div>
        <div className="qm-field full">
          <label>Question image / diagram <span className="qm-muted">(optional)</span></label>
          <ImagePicker
            url={image.url}
            label="Add diagram"
            onPick={(f) => checkSize(f) && setImage({ url: preview(f), file: f, remove: false })}
            onRemove={() => setImage({ url: null, file: null, remove: true })}
          />
        </div>
      </div>

      <div className="qm-section">
        <div className="qm-section-title">
          <span>Options</span>
          <button type="button" className="qm-btn sm" onClick={() => setOptions((os) => [...os, blankOption()])}>
            + Add option
          </button>
        </div>
        <div className="qm-hint" style={{ marginTop: -4, marginBottom: 8 }}>
          Each option can be text, an image, or both. Tick the correct one. Leave all options empty for a written-answer question.
        </div>
        {options.map((o, i) => (
          <div key={o.key} className={`qm-option ${o.correct ? "correct" : ""}`}>
            <span className="qm-option-letter">{String.fromCharCode(65 + i)}</span>
            <input
              className="qm-input"
              value={o.answer}
              maxLength={500}
              onChange={(e) => updateOption(o.key, { answer: e.target.value })}
              placeholder={o.imageUrl ? "Text (optional)" : `Option ${String.fromCharCode(65 + i)}`}
            />
            <ImagePicker
              small
              url={o.imageUrl}
              label="Image"
              onPick={(f) => checkSize(f) && updateOption(o.key, { imageUrl: preview(f), file: f, removeImage: false })}
              onRemove={() => updateOption(o.key, { imageUrl: null, file: null, removeImage: true })}
            />
            <label className="qm-correct" title="Mark as the correct answer">
              <input type="radio" name="correct-option" checked={o.correct} onChange={() => setCorrect(o.key)} onClick={() => o.correct && setCorrect(o.key)} />
              Correct
            </label>
            <button
              type="button"
              className="qm-icon-btn"
              title="Remove option"
              onClick={() => setOptions((os) => os.filter((x) => x.key !== o.key))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="qm-section">
        <div className="qm-section-title"><span>Written answers</span></div>
        {writtenOnly ? (
          <div className="qm-alert info" style={{ marginBottom: 10 }}>
            No options — learners will type their answer.
          </div>
        ) : (
          <label className="qm-toggle" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={allowWritten} onChange={(e) => setAllowWritten(e.target.checked)} />
            <span>
              Let learners write their own answer if none of the options fit
              <div className="qm-hint">A written answer is correct if it matches the expected answer or the correct option's text.</div>
            </span>
          </label>
        )}
        {(writtenOnly || allowWritten) && (
          <div className="qm-field">
            <label>Expected answer <span className="qm-muted">(optional)</span></label>
            <input
              className="qm-input"
              value={expected}
              maxLength={500}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Matching written answers are marked correct automatically"
            />
            <div className="qm-hint">
              Leave empty to review written answers yourself in Assessment Report → Review answers. Capital letters and extra spaces are ignored.
            </div>
          </div>
        )}
      </div>

      <div className="qm-section">
        <div className="qm-field" style={{ maxWidth: 160 }}>
          <label>Question number</label>
          <input className="qm-input" type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
