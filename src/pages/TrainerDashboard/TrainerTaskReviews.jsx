// src/components/Trainer/TrainerTaskReviews.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  listTraineeTasks,    // existing
  reviewTraineeTask,   // existing
  mediaUrl,            // existing
  createTaskAssignment,
  listAssignments
} from "../../api/traineeAPIservice";
import "../../utils/css/Trainer CSS/trainernotification.css";

const timeAgo = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

const initialReviewForm = { marks: "", feedback: "", review_file: null };
const initialAssignForm = {
  title: "",
  assigned_to: "",       // username (backend receives user id? -> see helper note)
  department: "",
  priority: "medium",
  due_at: "",            // yyyy-mm-ddThh:mm (local)
  instructions: "",
  attachment: null,
  max_marks: "",
  requires_submission: true
};

export default function TrainerTaskReviews() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [traineeFilter, setTraineeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [reviewMsg, setReviewMsg] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [assignMsg, setAssignMsg] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const [assigned, setAssigned] = useState([]);
  const [assgLoading, setAssgLoading] = useState(false);
  const [assgErr, setAssgErr] = useState("");

  const debRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (traineeFilter.trim()) params.trainee = traineeFilter.trim();
      const { success, data, error } = await listTraineeTasks(params);
      if (!success) throw error;

      let results = [];
      let totalCount = 0;
      if (Array.isArray(data)) {
        results = data;
        totalCount = data.length;
      } else if (data && Array.isArray(data.results)) {
        results = data.results;
        totalCount = data.count || results.length;
      }
      setItems(results);
      setCount(totalCount);
    } catch (e) {
      setErr(e?.detail || e?.error || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    setAssgLoading(true); setAssgErr("");
    const { success, data, error } = await listAssignments({});
    if (success) setAssigned(Array.isArray(data) ? data : (data?.results || []));
    else setAssgErr(error);
    setAssgLoading(false);
  };
  useEffect(() => { loadAssignments(); }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(), 350);
    return () => clearTimeout(debRef.current);
  }, [statusFilter, traineeFilter]);

  // ----- Review handlers -----
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
        await load();
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

  // ----- Assign task handlers -----
  const openAssign = (prefillUsername = "") => {
    setAssignForm((s) => ({ ...initialAssignForm, assigned_to: prefillUsername || "" }));
    setAssignMsg(null);
    setShowAssign(true);
  };
  const closeAssign = () => {
    setShowAssign(false);
    setAssignForm(initialAssignForm);
    setAssignMsg(null);
  };
  const onAssignChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    let v = value;
    if (type === "checkbox") v = !!checked;
    if (files) v = files[0];
    setAssignForm((s) => ({ ...s, [name]: v }));
  };
  const handleAssign = async (e) => {
    e.preventDefault();
    setAssignMsg(null);

    if (!assignForm.title.trim()) {
      setAssignMsg({ type: "danger", text: "Title is required." });
      return;
    }
    if (!assignForm.assigned_to.trim()) {
      setAssignMsg({ type: "danger", text: "Assigned To (username) is required." });
      return;
    }

    // Build multipart form data
    const fd = new FormData();
    fd.append("title", assignForm.title.trim());
    fd.append("assigned_to", assignForm.assigned_to.trim()); // API helper resolves username->id
    if (assignForm.instructions.trim()) fd.append("instructions", assignForm.instructions.trim());
    if (assignForm.department.trim()) fd.append("department", assignForm.department.trim());
    if (assignForm.priority) fd.append("priority", assignForm.priority);
    if (assignForm.due_at) {
      // send as local string; backend can parse ISO or naive
      fd.append("due_at", assignForm.due_at);
    }
    if (assignForm.attachment) fd.append("attachment", assignForm.attachment);
    if (assignForm.max_marks !== "" && assignForm.max_marks !== null) fd.append("max_marks", String(assignForm.max_marks));
    fd.append("requires_submission", assignForm.requires_submission ? "true" : "false");

    setAssigning(true);
    try {
      const { success, data, error } = await createTaskAssignment(fd);
      if (success) {
        setAssignMsg({ type: "success", text: "Task assigned successfully." });
        setTimeout(() => {
          closeAssign();
          // optional: you might refresh an assignments list here if/when you add it
        }, 1000);
      } else {
        const msg = typeof error === "string" ? error :
          error?.non_field_errors?.join(", ") ||
          Object.entries(error || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" • ") ||
          "Failed to assign task.";
        setAssignMsg({ type: "danger", text: msg });
      }
    } finally {
      setAssigning(false);
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
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => openAssign()}>
            Assign Task
          </Button>
        </div>
      </div>

      <h5>Submissions Received from Trainees</h5>
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
              <div key={s.id} className="tn-card">
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

                <div className="d-flex gap-2 mt-2">
                  <Button size="sm" variant="outline-success" onClick={() => openReview(s)}>
                    Review
                  </Button>
                </div>

                <div className="tn-link d-flex flex-column mt-2">
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

      <h5 className="mt-4 mb-2">Tasks Assigned by You</h5>
      {assgErr && <div className="tn-alert tn-alert-error">{String(assgErr)}</div>}
      {assgLoading ? (
        <div className="tn-grid">{Array.from({ length: 4 }).map((_,i)=><div key={i} className="tn-card skeleton" />)}</div>
      ) : assigned.length === 0 ? (
        <div className="tn-empty"><div className="emoji">📋</div><div>No tasks assigned yet.</div></div>
      ) : (
        <div className="tn-grid">
          {assigned.map(a => (
            <div key={a.id} className="tn-card">
              <div className="tn-card-top">
                <div className="tn-title">{a.title}</div>
                <div className="tn-when">{a.due_at ? timeAgo(a.due_at) : "No due date"}</div>
              </div>
              {a.instructions && <div className="tn-body">{a.instructions}</div>}
              <div className="tn-chips">
                <span className="chip">{a.status}</span>
                {a.priority && <span className="chip chip-type">{a.priority}</span>}
                {a.max_marks != null && <span className="chip chip-type">Max: {a.max_marks}</span>}
              </div>
              {a.attachment && (
                <div className="mt-2">
                  <a href={mediaUrl(a.attachment)} target="_blank" rel="noreferrer">View attachment</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal show={showReview} onHide={closeReview} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Review Submission #{selectedTask?.id} - {selectedTask?.trainee_username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <>
              <div className="mb-3"><strong>Department:</strong> {selectedTask.department || "None"}</div>
              {selectedTask.text && <div className="mb-3"><strong>Text:</strong> {selectedTask.text}</div>}
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

      {/* Assign Task Modal */}
      <Modal show={showAssign} onHide={closeAssign} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Assign Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {assignMsg && <Alert variant={assignMsg.type}>{assignMsg.text}</Alert>}
          <Form onSubmit={handleAssign}>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={assignForm.title}
                onChange={onAssignChange}
                placeholder="e.g., Build a Temperature Logger"
                required
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Assign To (username) *</Form.Label>
                <Form.Control
                  type="text"
                  name="assigned_to"
                  value={assignForm.assigned_to}
                  onChange={onAssignChange}
                  placeholder="e.g., john_doe"
                  required
                />
                <Form.Text muted>Type trainee/employee username; trainer’s dept filter applies server-side.</Form.Text>
              </div>
              <div className="col-md-3 mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select name="priority" value={assignForm.priority} onChange={onAssignChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Form.Select>
              </div>
              <div className="col-md-3 mb-3">
                <Form.Label>Max Marks</Form.Label>
                <Form.Control
                  type="number"
                  name="max_marks"
                  min="0"
                  max="100"
                  value={assignForm.max_marks}
                  onChange={onAssignChange}
                  placeholder="e.g., 20"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Department (optional)</Form.Label>
                <Form.Control
                  type="text"
                  name="department"
                  value={assignForm.department}
                  onChange={onAssignChange}
                  placeholder="e.g., Robotics"
                />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Due At</Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="due_at"
                  value={assignForm.due_at}
                  onChange={onAssignChange}
                />
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="instructions"
                value={assignForm.instructions}
                onChange={onAssignChange}
                placeholder="Write clear instructions..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attachment</Form.Label>
              <Form.Control type="file" name="attachment" onChange={onAssignChange} />
            </Form.Group>

            <Form.Check
              className="mb-3"
              type="checkbox"
              name="requires_submission"
              label="Requires submission"
              checked={assignForm.requires_submission}
              onChange={onAssignChange}
            />

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeAssign} disabled={assigning}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="ms-2" disabled={assigning}>
                {assigning ? <><Spinner size="sm" /> Assigning…</> : "Assign Task"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
