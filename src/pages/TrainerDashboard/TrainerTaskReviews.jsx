// src/components/Trainer/TrainerTaskReviews.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  listTraineeTasks,
  reviewTraineeTask,
} from "../../api/traineeTaskAPI";
import "../../utils/css/Trainer CSS/trainernotification.css";

const timeAgo = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

const initialReview = { id: null, marks: "", feedback: "", review_file: null };

export default function TrainerTaskReviews() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // filters
  const [statusFilter, setStatusFilter] = useState("submitted"); // default to submitted
  const [deptFilter, setDeptFilter] = useState("");
  const [traineeFilter, setTraineeFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // review modal
  const [show, setShow] = useState(false);
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [responseMsg, setResponseMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const debRef = useRef(null);

  const load = async ({ pageArg = page } = {}) => {
    setLoading(true);
    setErr("");
    try {
      const params = { page: pageArg, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (deptFilter.trim()) params.department = deptFilter.trim();
      if (traineeFilter.trim()) params.trainee = traineeFilter.trim();
      const { success, data, error } = await listTraineeTasks(params);
      if (!success) throw error;
      const results = Array.isArray(data.results) ? data.results : [];
      setItems(results);
      setCount(typeof data.count === "number" ? data.count : results.length);
      setNext(data.next || null);
      setPrev(data.previous || null);
      setPage(pageArg);
    } catch (e) {
      setErr(
        e?.detail || e?.error || "Failed to load submissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ pageArg: 1 });
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load({ pageArg: 1 }), 350);
    return () => clearTimeout(debRef.current);
  }, [statusFilter, deptFilter, traineeFilter]); // eslint-disable-line

  const openReview = (submission) => {
    setReviewForm({
      id: submission.id,
      marks: submission.marks ?? "",
      feedback: submission.feedback ?? "",
      review_file: null,
    });
    setResponseMsg(null);
    setShow(true);
  };

  const closeReview = () => {
    setShow(false);
    setReviewForm(initialReview);
    setResponseMsg(null);
  };

  const onReviewChange = (e) => {
    const { name, value, files } = e.target;
    setReviewForm((s) => ({ ...s, [name]: files ? files[0] : value }));
  };

  const doReview = async (e) => {
    e.preventDefault();
    setResponseMsg(null);

    // minimal validation
    const n = parseInt(reviewForm.marks, 10);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setResponseMsg({ type: "danger", text: "Marks must be a number between 0 and 100." });
      return;
    }

    setSaving(true);
    try {
      const { success, data, error } = await reviewTraineeTask(reviewForm.id, {
        marks: n,
        feedback: reviewForm.feedback?.trim(),
        review_file: reviewForm.review_file,
      });
      if (!success) {
        const msg =
          typeof error === "string"
            ? error
            : error?.non_field_errors?.join(", ") ||
              Object.entries(error || {})
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" • ") ||
              "Failed to save review.";
        setResponseMsg({ type: "danger", text: msg });
        return;
      }
      setResponseMsg({ type: "success", text: "Review saved." });
      await load({ pageArg: page }); // refresh current page
      setShow(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tn-wrap">
      <div className="tn-header">
        <div className="d-flex gap-2 align-items-center flex-wrap">
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

          <Form.Control
            style={{ width: 220 }}
            placeholder="Filter by trainee username"
            value={traineeFilter}
            onChange={(e) => setTraineeFilter(e.target.value)}
          />
        </div>
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
          <div className="emoji">📬</div>
          <div>No submissions found.</div>
        </div>
      ) : (
        <>
          <div className="tn-grid">
            {items.map((s) => (
              <div key={s.id} className="tn-card">
                <div className="tn-card-top">
                  <div className="tn-title">
                    {s.trainee_username || "(unknown)"} — {s.department || "No dept"}
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
                  {s.reviewed_by_username && (
                    <span className="chip chip-sender">By: {s.reviewed_by_username}</span>
                  )}
                </div>

                <div className="tn-link d-flex flex-column">
                  {s.file && (
                    <a href={s.file} target="_blank" rel="noreferrer">
                      View submitted file
                    </a>
                  )}
                  {s.review_file && (
                    <a href={s.review_file} target="_blank" rel="noreferrer">
                      View review file
                    </a>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-2">
                  <Button
                    size="sm"
                    variant={s.status === "reviewed" ? "outline-secondary" : "primary"}
                    onClick={() => openReview(s)}
                  >
                    {s.status === "reviewed" ? "Update Review" : "Review"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="tn-pager">
            <span className="tn-count">
              Showing {items.length} of {count}
            </span>
            <div className="tn-page-controls">
              <button
                className="btn-outline"
                disabled={!prev || page <= 1}
                onClick={() => load({ pageArg: Math.max(1, page - 1) })}
              >
                ← Prev
              </button>
              <span className="tn-page">Page {page}</span>
              <button
                className="btn-primary"
                disabled={!next}
                onClick={() => load({ pageArg: page + 1 })}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Review modal */}
      <Modal show={show} onHide={closeReview} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Review Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {responseMsg && <Alert variant={responseMsg.type}>{responseMsg.text}</Alert>}

          <Form onSubmit={doReview}>
            <Form.Group className="mb-3">
              <Form.Label>Marks (0–100)</Form.Label>
              <Form.Control
                type="number"
                name="marks"
                value={reviewForm.marks}
                onChange={onReviewChange}
                min={0}
                max={100}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Feedback (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="feedback"
                value={reviewForm.feedback}
                onChange={onReviewChange}
                placeholder="Write feedback for the trainee…"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attach Review File (optional)</Form.Label>
              <Form.Control
                type="file"
                name="review_file"
                onChange={onReviewChange}
              />
              <Form.Text muted>Attach annotated PDF, DOCX, images, etc.</Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeReview}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="ms-2" disabled={saving}>
                {saving ? "Saving..." : "Save Review"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
