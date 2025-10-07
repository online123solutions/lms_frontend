// src/components/Trainer/TrainerTaskReviews.jsx (new component for trainer dashboard)
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  listTraineeTasks,  // Reuse trainee API but trainer role filters dept
  reviewTraineeTask,
  mediaUrl
} from "../../api/traineeAPIservice";  // Assume shared; trainer uses same endpoints
import "../../utils/css/Trainer CSS/trainernotification.css"; // Reuse grid/card styles

const timeAgo = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

const initialReviewForm = { marks: "", feedback: "", review_file: null };

export default function TrainerTaskReviews() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("submitted"); // Default to unsubmitted
  const [traineeFilter, setTraineeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [reviewMsg, setReviewMsg] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const debRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (traineeFilter.trim()) params.trainee = traineeFilter.trim();
      // No dept filter; backend auto-filters by trainer's dept
      const { success, data, error } = await listTraineeTasks(params);
      if (!success) throw error;
      
      // Adjust for non-paginated response
      let results = [];
      let totalCount = 0;
      if (Array.isArray(data)) {
        results = data;
        totalCount = data.length;
      } else if (data && Array.isArray(data.results)) {
        results = data.results;
        totalCount = data.count || results.length;
      } else {
        results = [];
        totalCount = 0;
      }
      setItems(results);
      setCount(totalCount);
    } catch (e) {
      setErr(e?.detail || e?.error || "Failed to load submissions.");
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
  }, [statusFilter, traineeFilter]);

  const openReview = (task) => {
    setSelectedTask(task);
    setReviewForm(initialReviewForm);
    setReviewMsg(null);
    setShowReview(true);
  };

  const onReviewChange = (e) => {
    const { name, value, files } = e.target;
    setReviewForm((s) => ({ ...s, [name]: files ? files[0] : value }));
  };

  const closeReview = () => {
    setShowReview(false);
    setSelectedTask(null);
    setReviewForm(initialReviewForm);
    setReviewMsg(null);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setReviewMsg(null);
    const marks = parseInt(reviewForm.marks);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      setReviewMsg({ type: "danger", text: "Marks must be a number between 0 and 100." });
      return;
    }
    setReviewing(true);
    try {
      const { success, data, error } = await reviewTraineeTask(selectedTask.id, {
        marks,
        feedback: reviewForm.feedback.trim(),
        review_file: reviewForm.review_file
      });
      if (success) {
        setReviewMsg({ type: "success", text: "Reviewed successfully." });
        await load();  // Reload list
        setTimeout(closeReview, 1500);
      } else {
        const msg = typeof error === "string" ? error :
          error?.non_field_errors?.join(", ") ||
          Object.entries(error || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" • ") ||
          "Failed to review.";
        setReviewMsg({ type: "danger", text: msg });
      }
    } finally {
      setReviewing(false);
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
            <option value="submitted">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="">All</option>
          </Form.Select>
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
          <div className="emoji">📋</div>
          <div>No submissions to review.</div>
        </div>
      ) : (
        <>
          <div className="tn-grid">
            {items.map((s) => (
              <div key={s.id} className="tn-card" onClick={() => openReview(s)}>
                <div className="tn-card-top">
                  <div className="tn-title">
                    {s.department || "No department"} - {s.trainee_username}
                  </div>
                  <div className="tn-when">{timeAgo(s.submitted_at)}</div>
                </div>

                {s.text && <div className="tn-body">{s.text}</div>}

                <div className="tn-chips">
                  <span className={`chip ${s.status === "reviewed" ? "chip-read" : "chip-unread"}`}>
                    {s.status === "reviewed" ? "Reviewed" : "Pending"}
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
                </div>

                {s.feedback && (
                  <div className="tn-body" style={{ marginTop: 8 }}>
                    <b>Your Feedback:</b> {s.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="tn-pager">
            <span className="tn-count">
              Showing {items.length} of {count}
            </span>
          </div>
        </>
      )}

      {/* Review Modal */}
      <Modal show={showReview} onHide={closeReview} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Review Submission #{selectedTask?.id} - {selectedTask?.trainee_username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <>
              <div className="mb-3">
                <strong>Department:</strong> {selectedTask.department || "None"}
              </div>
              {selectedTask.text && (
                <div className="mb-3">
                  <strong>Text:</strong> {selectedTask.text}
                </div>
              )}
              {selectedTask.file && (
                <div className="mb-3">
                  <a href={mediaUrl(selectedTask.file)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                    View File
                  </a>
                </div>
              )}
              <hr />
            </>
          )}
          {reviewMsg && <Alert variant={reviewMsg.type}>{reviewMsg.text}</Alert>}
          <Form onSubmit={handleReview}>
            <Form.Group className="mb-3">
              <Form.Label>Marks (required, 0-100)</Form.Label>
              <Form.Control
                type="number"
                name="marks"
                value={reviewForm.marks}
                onChange={onReviewChange}
                min="0"
                max="100"
                placeholder="e.g., 85"
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
                placeholder="Provide feedback..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Review File (optional)</Form.Label>
              <Form.Control type="file" name="review_file" onChange={onReviewChange} />
              <Form.Text muted>Attach a review document if needed.</Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeReview} disabled={reviewing}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="ms-2" disabled={reviewing}>
                {reviewing ? <><Spinner size="sm" /> Reviewing...</> : "Review"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}