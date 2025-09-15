// TrainerNotification.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { sendTrainerNotification, apiClient } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/trainernotification.css";

const initialForm = {
  subject: "",
  message: "",
  link: "",
  notification_type: "info",
  mode: "group",
  audience: "both",
  department: "",
  usernames: "",
};

function timeAgo(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function TrainerNotify() {
  // send-modal state
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [responseMsg, setResponseMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // sent-list state
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const debRef = useRef(null);

  // ====== Sent list loader ======
  const loadSent = async ({ pageArg = page, searchArg = search } = {}) => {
    setListLoading(true);
    setListError("");
    try {
      const res = await apiClient.get("/notifications/send/", {
        params: { page: pageArg, page_size: pageSize, search: searchArg || undefined },
      });
      const data = res.data || {};
      setItems(Array.isArray(data.results) ? data.results : []);
      setCount(typeof data.count === "number" ? data.count : (data.results || []).length);
      setNext(data.next || null);
      setPrev(data.previous || null);
      setPage(pageArg);
    } catch (err) {
      setListError(
        err?.response?.data?.detail || err?.response?.data?.error || "Failed to load sent notifications."
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadSent({ pageArg: 1 }); /* mount */ }, []);
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => loadSent({ pageArg: 1, searchArg: search.trim() }), 350);
    return () => clearTimeout(debRef.current);
  }, [search]);

  // ====== Send modal handlers ======
  const handleChange = (e) => setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  const closeAndReset = () => { setShow(false); setFormData(initialForm); setResponseMsg(null); };

  const buildPayload = () => {
    const payload = {
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      link: formData.link.trim() || undefined,
      notification_type: formData.notification_type,
      mode: formData.mode,
      audience: formData.mode === "group" ? formData.audience : "both",
    };
    if (formData.mode === "individual") {
      payload.usernames = (formData.usernames || "").split(",").map((u) => u.trim()).filter(Boolean);
    } else if (formData.audience !== "trainee") {
      payload.department = formData.department.trim() || undefined;
    }
    return payload;
  };

  const validate = () => {
    if (!formData.subject.trim()) return "Subject is required.";
    if (!formData.message.trim()) return "Message is required.";
    if (formData.mode === "individual") {
      const list = (formData.usernames || "").split(",").map((u) => u.trim()).filter(Boolean);
      if (!list.length) return "Provide at least one username for Individual mode.";
    }
    return null;
  };

  const firstError = (errObj) => {
    if (!errObj || typeof errObj === "string") return errObj;
    const parts = [];
    Object.entries(errObj).forEach(([k, v]) => {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
    });
    return parts.join(" • ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setResponseMsg(null);
    const v = validate(); if (v) { setResponseMsg({ type: "danger", text: v }); return; }
    setLoading(true);
    try {
      const { success, data, error } = await sendTrainerNotification(buildPayload());
      if (success) {
        setResponseMsg({ type: "success", text: data?.message || "Notification sent." });
        setFormData(initialForm);
        await loadSent({ pageArg: 1, searchArg: search.trim() });
      } else {
        setResponseMsg({ type: "danger", text: firstError(error) || "Failed to send notification." });
      }
    } finally { setLoading(false); }
  };

  const deptDisabled = formData.mode !== "group" || formData.audience === "trainee";

  return (
    <div className="tn-wrap">
      {/* Top actions */}
      <div className="tn-header">
        <Button className="tn-send-btn" onClick={() => setShow(true)}>Send Notification</Button>
        <input
          className="tn-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject/message…"
        />
      </div>

      {/* List */}
      {listError && <div className="tn-alert tn-alert-error">{listError}</div>}

      {listLoading ? (
        <div className="tn-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="tn-card skeleton" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="tn-empty">
          <div className="emoji">📭</div>
          <div>No notifications sent yet.</div>
        </div>
      ) : (
        <>
          <div className="tn-grid">
            {items.map((n) => (
              <div key={n.id} className="tn-card">
                <div className="tn-card-top">
                  <div className="tn-title">{n.subject || "(No subject)"}</div>
                  <div className="tn-when">{timeAgo(n.created_at)}</div>
                </div>

                {n.message && <div className="tn-body">{n.message}</div>}

                <div className="tn-chips">
                  <span className="chip chip-type">Type: {n.notification_type}</span>
                  <span className="chip chip-count">Recipients: {n.recipients_count}</span>
                </div>

                {n.link && (
                  <div className="tn-link">
                    <a href={n.link} target="_blank" rel="noreferrer">{n.link}</a>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="tn-pager">
            <span className="tn-count">Showing {items.length} of {count}</span>
            <div className="tn-page-controls">
              <button className="btn-outline" disabled={!prev || page <= 1} onClick={() => loadSent({ pageArg: Math.max(1, page - 1) })}>← Prev</button>
              <span className="tn-page">Page {page}</span>
              <button className="btn-primary" disabled={!next} onClick={() => loadSent({ pageArg: page + 1 })}>Next →</button>
            </div>
          </div>
        </>
      )}

      {/* Send Modal */}
      <Modal show={show} onHide={closeAndReset} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Trainer Notification</Modal.Title></Modal.Header>
        <Modal.Body>
          {responseMsg && <Alert variant={responseMsg.type}>{responseMsg.text}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control type="text" name="subject" value={formData.subject}
                onChange={handleChange} required placeholder="e.g., Assessment Window" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control as="textarea" rows={3} name="message" value={formData.message}
                onChange={handleChange} required placeholder="Write the notification message…" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Link (optional)</Form.Label>
              <Form.Control type="url" name="link" value={formData.link}
                onChange={handleChange} placeholder="https://…" />
            </Form.Group>

            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Notification Type</Form.Label>
                  <Form.Select name="notification_type" value={formData.notification_type} onChange={handleChange}>
                    <option value="info">Info</option>
                    <option value="module">Module</option>
                    <option value="assessment">Assessment</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Mode</Form.Label>
                  <Form.Select name="mode" value={formData.mode} onChange={handleChange}>
                    <option value="group">Group</option>
                    <option value="individual">Individual</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Audience</Form.Label>
                  <Form.Select name="audience" value={formData.audience}
                    onChange={handleChange} disabled={formData.mode !== "group"}>
                    <option value="trainee">Trainee</option>
                    <option value="employee">Employee</option>
                    <option value="both">Both</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {formData.mode === "group" && (
              <Form.Group className="mb-3">
                <Form.Label>Department (employees only, optional)</Form.Label>
                <Form.Control type="text" name="department" value={formData.department}
                  onChange={handleChange} disabled={deptDisabled}
                  placeholder={deptDisabled ? "Not applicable" : "Leave blank to use trainer's department"} />
              </Form.Group>
            )}

            {formData.mode === "individual" && (
              <Form.Group className="mb-3">
                <Form.Label>Usernames (comma-separated)</Form.Label>
                <Form.Control type="text" name="usernames" value={formData.usernames}
                  onChange={handleChange} placeholder="e.g., emp_riya, shahnawaz_786" required />
              </Form.Group>
            )}

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeAndReset}>Cancel</Button>
              <Button type="submit" variant="success" className="ms-2" disabled={loading}>
                {loading ? "Sending..." : "Send"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
