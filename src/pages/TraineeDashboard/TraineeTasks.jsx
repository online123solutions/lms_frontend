// src/components/Trainee/TraineeTasks.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  listTraineeTasks,
  submitTraineeTask,
  mediaUrl
} from "../../api/traineeAPIservice";
import "../../utils/css/Trainer CSS/trainernotification.css"; // reuse grid/card styles

const timeAgo = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

const initialForm = { department: "", text: "", file: null };

export default function TraineeTasks() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(""); // "", "submitted", "reviewed"
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const debRef = useRef(null);

  const load = async ({ pageArg = page, pageSize = 20 } = {}) => {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deptFilter.trim()) params.department = deptFilter.trim();
      // No pagination params since backend has it disabled
      const { success, data, error } = await listTraineeTasks(params);
      if (!success) throw error;
      
      // Adjust for non-paginated response (direct array)
      let results = [];
      let totalCount = 0;
      if (Array.isArray(data)) {
        results = data;
        totalCount = data.length;
      } else if (data && Array.isArray(data.results)) {
        // Fallback for if pagination is re-enabled later
        results = data.results;
        totalCount = data.count || results.length;
      } else {
        results = [];
        totalCount = 0;
      }
      setItems(results);
      setCount(totalCount);
      setNext(null); // No pagination
      setPrev(null);
      setPage(1); // Always page 1 since no pagination
    } catch (e) {
      setErr(
        e?.detail || e?.error || "Failed to load your submissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(), 350);
    return () => clearTimeout(debRef.current);
  }, [statusFilter, deptFilter]); // eslint-disable-line

  const onChange = (e) => {
    const { name, value, files } = e.target;
    setForm((s) => ({ ...s, [name]: files ? files[0] : value }));
  };

  const close = () => {
    setShow(false);
    setForm(initialForm);
    setSubmitMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!form.text.trim() && !form.file) {
      setSubmitMsg({ type: "danger", text: "Provide either text or a file." });
      return;
    }
    setSubmitting(true);
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      if (form.department.trim()) formData.append("department", form.department.trim());
      if (form.text.trim()) formData.append("text", form.text.trim());
      if (form.file) formData.append("file", form.file);
      
      const { success, data, error } = await submitTraineeTask(formData);
      if (success) {
        setSubmitMsg({ type: "success", text: "Submitted successfully." });
        setForm(initialForm);
        await load();
        setShow(false);
      } else {
        const msg =
          typeof error === "string"
            ? error
            : error?.non_field_errors?.join(", ") ||
              Object.entries(error || {})
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" • ") ||
              "Failed to submit.";
        setSubmitMsg({ type: "danger", text: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tn-wrap">
      <div className="tn-header">
        <div className="d-flex gap-2 align-items-center">
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
          </Form.Select>
          <Form.Control
            style={{ width: 220 }}
            placeholder="Filter by department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          />
        </div>
        <Button className="tn-send-btn" onClick={() => setShow(true)}>
          New Submission
        </Button>
      </div>

      {err && <div className="tn-alert tn-alert-error">{String(err)}</div>}

      {loading ? (
        <div className="tn-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tn-card skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="tn-empty">
          <div className="emoji">📭</div>
          <div>No submissions yet.</div>
        </div>
      ) : (
        <>
          <div className="tn-grid">
            {items.map((s) => (
              <div key={s.id} className="tn-card">
                <div className="tn-card-top">
                  <div className="tn-title">
                    {s.department || "No department"}
                  </div>
                  <div className="tn-when">{timeAgo(s.submitted_at)}</div>
                </div>

                {s.text && <div className="tn-body">{s.text}</div>}

                <div className="tn-chips">
                  <span className={`chip ${s.status === "reviewed" ? "chip-read" : "chip-unread"}`}>
                    {s.status === "reviewed" ? "Reviewed" : "Submitted"}
                  </span>
                  {s.marks !== null && s.marks !== undefined && (
                    <span className="chip chip-type">Marks: {s.marks}</span>
                  )}
                </div>

                <div className="tn-link d-flex flex-column">
                  {s.file && (
                    <a href={mediaUrl(s.file)} target="_blank" rel="noreferrer">
                      View submitted file
                    </a>
                  )}
                  {s.review_file && (
                    <a href={mediaUrl(s.review_file)} target="_blank" rel="noreferrer">
                      View review file
                    </a>
                  )}
                </div>

                {s.feedback && (
                  <div className="tn-body" style={{ marginTop: 8 }}>
                    <b>Feedback:</b> {s.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Simplified pager since no pagination */}
          <div className="tn-pager">
            <span className="tn-count">
              Showing {items.length} of {count}
            </span>
          </div>
        </>
      )}

      <Modal show={show} onHide={close} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Submit Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submitMsg && <Alert variant={submitMsg.type}>{submitMsg.text}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Department (optional)</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={form.department}
                onChange={onChange}
                placeholder="e.g., Robotics"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Text (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="text"
                value={form.text}
                onChange={onChange}
                placeholder="Describe your submission…"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>File (any type)</Form.Label>
              <Form.Control type="file" name="file" onChange={onChange} />
              <Form.Text muted>
                PDF, Word, images, Excel, etc. are supported.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="ms-2" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}