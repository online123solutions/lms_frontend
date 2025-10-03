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
  audience: "both", // employee+trainee
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
  // ---- Send modal state ----
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [responseMsg, setResponseMsg] = useState(null);
  const [sending, setSending] = useState(false);

  // ---- Tabs: sent | inbox ----
  const [activeTab, setActiveTab] = useState("sent");

  // ---- Sent list state ----
  const [sentItems, setSentItems] = useState([]);
  const [sentCount, setSentCount] = useState(0);
  const [sentNext, setSentNext] = useState(null);
  const [sentPrev, setSentPrev] = useState(null);
  const [sentPage, setSentPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState("");

  // ---- Inbox list state ----
  const [inboxItems, setInboxItems] = useState([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [inboxNext, setInboxNext] = useState(null);
  const [inboxPrev, setInboxPrev] = useState(null);
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [fromAdminOnly, setFromAdminOnly] = useState(false);

  const debRef = useRef(null);

  // ---------- Loaders ----------
  const loadSent = async ({ pageArg = sentPage, searchArg = search } = {}) => {
    setSentLoading(true);
    setSentError("");
    try {
      const res = await apiClient.get("/notifications/", {
        params: {
          box: "sent",
          page: pageArg,
          page_size: pageSize,
          search: searchArg || undefined,
        },
      });
      const data = res.data || {};
      const results = Array.isArray(data.results) ? data.results : [];
      setSentItems(results);
      setSentCount(typeof data.count === "number" ? data.count : results.length);
      setSentNext(data.next || null);
      setSentPrev(data.previous || null);
      setSentPage(pageArg);
    } catch (err) {
      setSentError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load sent notifications."
      );
    } finally {
      setSentLoading(false);
    }
  };

  const loadInbox = async ({
    pageArg = inboxPage,
    searchArg = search,
    fromAdminArg = fromAdminOnly,
  } = {}) => {
    setInboxLoading(true);
    setInboxError("");
    try {
      const res = await apiClient.get("/notifications/", {
        params: {
          box: "inbox",
          page: pageArg,
          page_size: pageSize,
          search: searchArg || undefined,
          from_admin: fromAdminArg ? "true" : undefined,
        },
      });
      const data = res.data || {};
      const results = Array.isArray(data.results) ? data.results : [];
      setInboxItems(results);
      setInboxCount(typeof data.count === "number" ? data.count : results.length);
      setInboxNext(data.next || null);
      setInboxPrev(data.previous || null);
      setInboxPage(pageArg);
    } catch (err) {
      setInboxError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load inbox notifications."
      );
    } finally {
      setInboxLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    loadSent({ pageArg: 1 });
  }, []);

  // search debounce applied to active tab
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      if (activeTab === "sent") {
        loadSent({ pageArg: 1, searchArg: search.trim() });
      } else {
        loadInbox({ pageArg: 1, searchArg: search.trim(), fromAdminArg: fromAdminOnly });
      }
    }, 350);
    return () => clearTimeout(debRef.current);
  }, [search, activeTab]); // eslint-disable-line

  // from_admin filter refreshes inbox
  useEffect(() => {
    if (activeTab === "inbox") {
      loadInbox({ pageArg: 1, searchArg: search.trim(), fromAdminArg: fromAdminOnly });
    }
    // eslint-disable-next-line
  }, [fromAdminOnly]);

  // ---------- Send handlers ----------
  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const closeAndReset = () => {
    setShow(false);
    setFormData(initialForm);
    setResponseMsg(null);
  };

  const buildPayload = () => {
    const payload = {
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      link: formData.link.trim() || undefined,
      notification_type: formData.notification_type,
      mode: formData.mode,
    };

    if (formData.mode === "group") {
      payload.audience = formData.audience; // trainee | employee | trainer | both | all
      // department only if employees are in scope
      const includesEmployees = ["employee", "both", "all"].includes(formData.audience);
      if (includesEmployees) {
        payload.department = formData.department.trim() || undefined;
      }
    } else {
      // individual mode
      payload.usernames = (formData.usernames || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
    }
    return payload;
  };

  const validate = () => {
    if (!formData.subject.trim()) return "Subject is required.";
    if (!formData.message.trim()) return "Message is required.";
    if (formData.mode === "individual") {
      const list = (formData.usernames || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
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
    e.preventDefault();
    setResponseMsg(null);
    const v = validate();
    if (v) {
      setResponseMsg({ type: "danger", text: v });
      return;
    }
    setSending(true);
    try {
      const { success, data, error } = await sendTrainerNotification(buildPayload());
      if (success) {
        setResponseMsg({ type: "success", text: data?.message || "Notification sent." });
        setFormData(initialForm);
        // refresh sent tab immediately
        await loadSent({ pageArg: 1, searchArg: search.trim() });
        setActiveTab("sent");
      } else {
        setResponseMsg({
          type: "danger",
          text: firstError(error) || "Failed to send notification.",
        });
      }
    } finally {
      setSending(false);
    }
  };

  // department field enabled only if group mode and audience includes employees
  const deptDisabled =
    formData.mode !== "group" || !["employee", "both", "all"].includes(formData.audience);

  return (
    <div className="tn-wrap">
      {/* Header / Controls */}
      <div className="tn-header">
        <div className="tn-tabs">
          <button
            className={`tn-tab ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("sent");
              loadSent({ pageArg: 1, searchArg: search.trim() });
            }}
          >
            Sent
          </button>
          <button
            className={`tn-tab ${activeTab === "inbox" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("inbox");
              loadInbox({ pageArg: 1, searchArg: search.trim(), fromAdminArg: fromAdminOnly });
            }}
          >
            Inbox
          </button>
        </div>

        <div className="tn-actions">
          <input
            className="tn-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject/message…"
          />
          {activeTab === "inbox" && (
            <label className="tn-inline-filter">
              <input
                type="checkbox"
                checked={fromAdminOnly}
                onChange={(e) => setFromAdminOnly(e.target.checked)}
              />
              <span> From Admin only</span>
            </label>
          )}
          <Button className="tn-send-btn" onClick={() => setShow(true)}>
            Send Notification
          </Button>
        </div>
      </div>

      {/* Lists */}
      {activeTab === "sent" ? (
        <>
          {sentError && <div className="tn-alert tn-alert-error">{sentError}</div>}
          {sentLoading ? (
            <div className="tn-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tn-card skeleton" />
              ))}
            </div>
          ) : sentItems.length === 0 ? (
            <div className="tn-empty">
              <div className="emoji">📭</div>
              <div>No notifications sent yet.</div>
            </div>
          ) : (
            <>
              <div className="tn-grid">
                {sentItems.map((n) => (
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
                        <a href={n.link} target="_blank" rel="noreferrer">
                          {n.link}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="tn-pager">
                <span className="tn-count">
                  Showing {sentItems.length} of {sentCount}
                </span>
                <div className="tn-page-controls">
                  <button
                    className="btn-outline"
                    disabled={!sentPrev || sentPage <= 1}
                    onClick={() =>
                      loadSent({ pageArg: Math.max(1, sentPage - 1), searchArg: search.trim() })
                    }
                  >
                    ← Prev
                  </button>
                  <span className="tn-page">Page {sentPage}</span>
                  <button
                    className="btn-primary"
                    disabled={!sentNext}
                    onClick={() => loadSent({ pageArg: sentPage + 1, searchArg: search.trim() })}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {inboxError && <div className="tn-alert tn-alert-error">{inboxError}</div>}
          {inboxLoading ? (
            <div className="tn-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tn-card skeleton" />
              ))}
            </div>
          ) : inboxItems.length === 0 ? (
            <div className="tn-empty">
              <div className="emoji">📬</div>
              <div>No notifications received yet.</div>
            </div>
          ) : (
            <>
              <div className="tn-grid">
                {inboxItems.map((n) => (
                  <div key={n.id} className="tn-card">
                    <div className="tn-card-top">
                      <div className="tn-title">{n.subject || "(No subject)"}</div>
                      <div className="tn-when">{timeAgo(n.created_at)}</div>
                    </div>

                    {n.message && <div className="tn-body">{n.message}</div>}

                    <div className="tn-chips">
                      {/* n.sent_by = {username, role} from InboxNotificationSerializer */}
                      {n.sent_by?.username && (
                        <span className="chip chip-sender">
                          From: {n.sent_by.username}
                          {n.sent_by.role ? ` (${n.sent_by.role})` : ""}
                        </span>
                      )}
                      <span className="chip chip-type">Type: {n.notification_type || "info"}</span>
                      <span className={`chip ${n.read_at ? "chip-read" : "chip-unread"}`}>
                        {n.read_at ? `Read: ${timeAgo(n.read_at)}` : "Unread"}
                      </span>
                    </div>

                    {n.link && (
                      <div className="tn-link">
                        <a href={n.link} target="_blank" rel="noreferrer">
                          {n.link}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="tn-pager">
                <span className="tn-count">
                  Showing {inboxItems.length} of {inboxCount}
                </span>
                <div className="tn-page-controls">
                  <button
                    className="btn-outline"
                    disabled={!inboxPrev || inboxPage <= 1}
                    onClick={() =>
                      loadInbox({
                        pageArg: Math.max(1, inboxPage - 1),
                        searchArg: search.trim(),
                        fromAdminArg: fromAdminOnly,
                      })
                    }
                  >
                    ← Prev
                  </button>
                  <span className="tn-page">Page {inboxPage}</span>
                  <button
                    className="btn-primary"
                    disabled={!inboxNext}
                    onClick={() =>
                      loadInbox({
                        pageArg: inboxPage + 1,
                        searchArg: search.trim(),
                        fromAdminArg: fromAdminOnly,
                      })
                    }
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Send Modal */}
      <Modal show={show} onHide={closeAndReset} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Trainer Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {responseMsg && <Alert variant={responseMsg.type}>{responseMsg.text}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="e.g., Assessment Window"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Write the notification message…"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Link (optional)</Form.Label>
              <Form.Control
                type="url"
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="https://…"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Notification Type</Form.Label>
                  <Form.Select
                    name="notification_type"
                    value={formData.notification_type}
                    onChange={handleChange}
                  >
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
                  <Form.Select
                    name="audience"
                    value={formData.audience}
                    onChange={handleChange}
                    disabled={formData.mode !== "group"}
                  >
                    <option value="trainee">Trainee</option>
                    <option value="employee">Employee</option>
                    <option value="trainer">Trainer</option>
                    <option value="both">Both (Emp+Trainee)</option>
                    <option value="all">All (Emp+Trainee+Trainer)</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {formData.mode === "group" && (
              <Form.Group className="mb-3">
                <Form.Label>Department (employees only, optional)</Form.Label>
                <Form.Control
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={deptDisabled}
                  placeholder={
                    deptDisabled
                      ? "Not applicable"
                      : "Leave blank to use trainer's department"
                  }
                />
              </Form.Group>
            )}

            {formData.mode === "individual" && (
              <Form.Group className="mb-3">
                <Form.Label>Usernames (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  name="usernames"
                  value={formData.usernames}
                  onChange={handleChange}
                  placeholder="e.g., emp_riya, shahnawaz_786"
                  required
                />
              </Form.Group>
            )}

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeAndReset}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="ms-2" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
