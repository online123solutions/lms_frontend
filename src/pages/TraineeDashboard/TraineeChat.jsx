import { useEffect, useMemo, useRef, useState } from "react";
import {
  getQueries,
  createQuery,
  respondToQuery,
  submitFeedback,
  listConcerns,
  createConcern,
  addConcernComment,
  mediaUrl,
} from "../../api/traineeAPIservice";
import "../../utils/css/Trainee CSS/chat.css";
import "../../index.css";

const DEPARTMENTS = [
  "IT",
  "Development",
  "HR",
  "Operations",
  "Sales",
  "Marketing",
  "Finance",
  "Support",
];
const CATEGORIES = ["general", "training", "assessment", "technical"];

export default function TraineeChat() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [newCategory, setNewCategory] = useState("general");
  const [newQueryText, setNewQueryText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // "raise" | "feedback" | "concern"
  const [feedback, setFeedback] = useState({
    communication: 0,
    subjectKnowledge: 0,
    mentorship: 0,
    customFeedback: "",
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const currentUsername = (localStorage.getItem("username") || "").trim();
  const listEndRef = useRef(null);

  // --- Concern Section State ---
  const [concerns, setConcerns] = useState([]);
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [newConcern, setNewConcern] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    attachment: null,
  });
  const [cloading, setCLoading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const messageCount = useMemo(
    () => (selectedQuery?.responses?.length || 0) + (selectedQuery ? 1 : 0),
    [selectedQuery]
  );

  // --------------- Fetch Queries ---------------
  const fetchQueries = async () => {
    setIsLoading(true);
    try {
      const data = await getQueries();
      setQueries(data || []);
      setError(null);
      if (selectedQuery && data?.length) {
        const updated = data.find((q) => q.id === selectedQuery.id);
        if (updated) setSelectedQuery(updated);
      }
    } catch (err) {
      console.error("Failed to fetch queries:", err);
      setError("Failed to load queries. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "raise") fetchQueries();
    const interval =
      activeSection === "raise" ? setInterval(fetchQueries, 10000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSection]);

  // scroll to latest messages
  useEffect(() => {
    if (listEndRef.current)
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedQuery, messageCount]);

  // exit key listener
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && activeSection === "raise") {
        setActiveSection(null);
        setSelectedQuery(null);
        setFilter("");
        setError(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [activeSection]);

  const whoForResponse = (resp, query) => {
    const type =
      resp.sender_type ||
      ((resp.responder_username || "").toLowerCase() ===
      (query.raised_by || "").toLowerCase()
        ? "trainee"
        : "trainer");
    if (type === "trainee")
      return query.raised_by === currentUsername ? "You" : "Trainee";
    return "Trainer";
  };

  const bubbleClass = (who) => (who === "Trainer" ? "trainer" : "trainee");

  const handleNewQuery = async () => {
    const text = newQueryText.trim();
    if (!text) return;
    try {
      const fd = new FormData();
      fd.append("question", text);
      if (newCategory) fd.append("category", newCategory);
      const created = await createQuery(fd);
      setNewQueryText("");
      if (created && created.id)
        setSelectedQuery({ responses: [], ...created });
      await fetchQueries();
    } catch (err) {
      console.error("Failed to create query:", err);
      setError("Failed to create query. Please try again.");
    }
  };

  const handleReply = async () => {
    const text = replyText.trim();
    if (!selectedQuery || !text) return;
    try {
      const fd = new FormData();
      fd.append("response", text);
      await respondToQuery(selectedQuery.id, fd);
      setReplyText("");
      setError(null);
      await fetchQueries();
    } catch (err) {
      console.error("Failed to send reply:", err);
      setError("Failed to send reply. Please try again.");
    }
  };

  const onReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return queries;
    return queries.filter((q) =>
      (q.question || "").toLowerCase().includes(filter.trim().toLowerCase())
    );
  }, [queries, filter]);

  const handleFeedbackChange = (param, value) => {
    setFeedback((prev) => ({ ...prev, [param]: value }));
  };

  const handleSubmitFeedback = async () => {
    try {
      const response = await submitFeedback({
        username: currentUsername,
        communication: feedback.communication,
        subjectKnowledge: feedback.subjectKnowledge,
        mentorship: feedback.mentorship,
        custom_feedback: feedback.customFeedback,
      });

      if (response.success) {
        setSubmitSuccess(true);
        setFeedback({
          communication: 0,
          subjectKnowledge: 0,
          mentorship: 0,
          customFeedback: "",
        });
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setError("Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError("Failed to submit feedback. Please try again.");
    }
  };

  // ---------- Concern handlers ----------
  const loadConcerns = async () => {
    setCLoading(true);
    const { success, data } = await listConcerns();
    if (success) setConcerns(data);
    setCLoading(false);
  };

  useEffect(() => {
    if (activeSection === "concern") loadConcerns();
  }, [activeSection]);

  const handleCreateConcern = async () => {
    if (!newConcern.title.trim() || !newConcern.description.trim()) {
      alert("Please fill title and description.");
      return;
    }
    const fd = new FormData();
    fd.append("title", newConcern.title);
    fd.append("description", newConcern.description);
    if (newConcern.category) fd.append("category", newConcern.category);
    if (newConcern.priority) fd.append("priority", newConcern.priority);
    if (newConcern.attachment) fd.append("attachment", newConcern.attachment);
    const { success } = await createConcern(fd);
    if (success) {
      setNewConcern({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        attachment: null,
      });
      await loadConcerns();
    } else alert("Failed to submit concern.");
  };

  const handleAddComment = async (id) => {
    if (!commentText.trim()) return;
    const fd = new FormData();
    fd.append("message", commentText);
    const { success } = await addConcernComment(id, fd);
    if (success) {
      setCommentText("");
      await loadConcerns();
      const updated = await listConcerns();
      const selected = updated.data.find((x) => x.id === id);
      setSelectedConcern(selected);
    }
  };

  // ------------------- RENDER -------------------
  return (
    <div className="qc-root">
      <div className="qc-shell">
        {/* Top Bar */}
        <div className="qc-topbar">
          <div className="qc-top-left">
            <h2>Trainee Queries & Feedback</h2>
            {error && <div className="error-message">{error}</div>}
            {submitSuccess && (
              <div className="success-message">
                Feedback submitted successfully!
              </div>
            )}
          </div>
        </div>

        {/* --- OPTIONS MENU --- */}
        {activeSection === null ? (
          <div className="query-options">
            <h3>Select an Option</h3>
            <div className="options-row">
              <button
                className="btn-option"
                onClick={() => setActiveSection("feedback")}
              >
                Feedback
              </button>
              <button
                className="btn-option"
                onClick={() => setActiveSection("raise")}
              >
                Raise Queries
              </button>
              <button
                className="btn-option"
                onClick={() => setActiveSection("concern")}
              >
                Concerns
              </button>
            </div>
          </div>
        ) : activeSection === "raise" ? (
          // --- QUERIES SECTION ---
          <div className="query-chat-container">
            <aside className="query-list">
              <div className="list-search">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search queries..."
                />
              </div>
              {isLoading ? (
                <div className="loading-state">Loading queries...</div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-emoji">📝</div>
                  <div>No queries found</div>
                  <button
                    className="btn-outline"
                    onClick={() => setSelectedQuery(null)}
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <ul className="list-items">
                  {filtered.map((q) => (
                    <li
                      key={q.id}
                      className={`chat-list-item ${
                        selectedQuery?.id === q.id ? "active" : ""
                      }`}
                      onClick={() => setSelectedQuery(q)}
                    >
                      <div className="item-title">Query #{q.id}</div>
                      <div className="item-sub">
                        {q.question || "No question"}
                      </div>
                      <div className="item-meta">
                        <span>{q.category || "general"}</span>
                        <span>{timeAgo(q.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Chat/New Query */}
            <main className="chat-main">
              {!selectedQuery ? (
                <div className="new-query-form card">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c[0].toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="form-label">Write your query</label>
                  <textarea
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    placeholder="Type your question for the trainer…"
                  />

                  <div className="actions">
                    <button className="btn-primary" onClick={handleNewQuery}>
                      Send
                    </button>
                    <button
                      className="btn-back"
                      onClick={() => setActiveSection(null)}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="thread-header">
                    <div className="thread-title">
                      {selectedQuery.question?.slice(0, 120) ||
                        `Query #${selectedQuery.id}`}
                    </div>
                  </div>

                  <div className="message-area">
                    <div className="bubble-row left">
                      <div className="bubble trainee">
                        <div className="bubble-text">
                          {selectedQuery.question}
                        </div>
                        <div className="bubble-meta">
                          {selectedQuery.raised_by === currentUsername
                            ? "You"
                            : selectedQuery.raised_by}{" "}
                          · {timeAgo(selectedQuery.created_at)}
                        </div>
                      </div>
                    </div>

                    {selectedQuery.responses?.map((r, idx) => {
                      const who = whoForResponse(r, selectedQuery);
                      const side = who === "Trainer" ? "right" : "left";
                      const name = who === "You" ? currentUsername : who;
                      return (
                        <div
                          key={r.id || idx}
                          className={`bubble-row ${side}`}
                        >
                          <div className={`bubble ${bubbleClass(who)}`}>
                            <div className="bubble-text">{r.response}</div>
                            <div className="bubble-meta">
                              {name} · {timeAgo(r.responded_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={listEndRef} />
                  </div>

                  <div className="reply-box sticky">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={onReplyKeyDown}
                      placeholder="Type your reply and press Enter…"
                    />
                    <button className="btn-primary" onClick={handleReply}>
                      Send
                    </button>
                  </div>
                </>
              )}
            </main>
          </div>
        ) : activeSection === "feedback" ? (
          // --- FEEDBACK SECTION ---
          <div className="feedback-section card">
            <h3>Provide Feedback for Trainer</h3>
            <div className="feedback-form">
              <div className="form-group">
                <label>Communication (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.communication}
                  onChange={(e) =>
                    handleFeedbackChange("communication", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Subject Knowledge (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.subjectKnowledge}
                  onChange={(e) =>
                    handleFeedbackChange("subjectKnowledge", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Mentorship (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.mentorship}
                  onChange={(e) =>
                    handleFeedbackChange("mentorship", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Custom Feedback</label>
                <textarea
                  rows={3}
                  value={feedback.customFeedback}
                  onChange={(e) =>
                    handleFeedbackChange("customFeedback", e.target.value)
                  }
                  placeholder="Any suggestions?"
                />
              </div>
              <div className="actions">
                <button
                  className="btn-primary"
                  onClick={handleSubmitFeedback}
                >
                  Submit
                </button>
                <button
                  className="btn-back"
                  onClick={() => setActiveSection(null)}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        ) : (
          // --- CONCERN SECTION ---
          <div className="concern-section card">
            <h3>Raise or Track a Concern</h3>

            {/* New Concern Form */}
            <div className="new-concern-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={newConcern.title}
                    placeholder="Enter concern title"
                    onChange={(e) =>
                      setNewConcern((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newConcern.category}
                    onChange={(e) =>
                      setNewConcern((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    <option value="">Select category</option>
                    <option value="HR">HR</option>
                    <option value="Technical">Technical</option>
                    <option value="Training">Training</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newConcern.priority}
                    onChange={(e) =>
                      setNewConcern((p) => ({ ...p, priority: e.target.value }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Write your concern</label>
                <textarea
                  rows={3}
                  placeholder="Describe your concern"
                  value={newConcern.description}
                  onChange={(e) =>
                    setNewConcern((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              {/* <div className="form-group">
                <label>Attachment (optional)</label>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewConcern((p) => ({
                      ...p,
                      attachment: e.target.files[0],
                    }))
                  }
                />
              </div> */}

              <div className="actions">
                <button className="btn-primary" onClick={handleCreateConcern}>
                  Submit Concern
                </button>
              </div>
            </div>

            <hr />

            {/* Concern List */}
            <h4>Your Raised Concerns</h4>
            {cloading ? (
              <div className="loading-state">Loading concerns...</div>
            ) : concerns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-emoji">📬</div>
                <p>No concerns raised yet.</p>
              </div>
            ) : (
              <div className="concern-list">
                {concerns.map((c) => (
                  <div
                    key={c.id}
                    className={`concern-card ${
                      selectedConcern?.id === c.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedConcern(c)}
                  >
                    <div className="concern-top">
                      <div className="concern-title">{c.title}</div>
                      <div className="chip">{c.status.toUpperCase()}</div>
                    </div>
                    <div className="concern-meta">
                      {c.category} • {timeAgo(c.created_at)} •{" "}
                      <span className="priority-chip">{c.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Concern Detail */}
            {selectedConcern && (
            <div className="concern-detail">
              <div className="concern-detail-header">
                <button
                  className="btn-back-inline"
                  onClick={() => setSelectedConcern(null)}
                >
                  ← Back to list
                </button>

                <h5>
                  #{selectedConcern.id} — {selectedConcern.title}
                </h5>

                <span className={`chip status-${selectedConcern.status?.toLowerCase?.()}`}>
                  {selectedConcern.status?.toUpperCase?.() || "OPEN"}
                </span>
              </div>

              <p>{selectedConcern.description}</p>

              {selectedConcern.attachment && (
                <a href={mediaUrl(selectedConcern.attachment)} target="_blank" rel="noreferrer">
                  View Attachment
                </a>
              )}

              <h6>Comments</h6>
              <div className="comments-box">
                {selectedConcern.comments?.length ? (
                  selectedConcern.comments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <b>{c.author_username}:</b> {c.message}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No comments yet.</div>
                )}
              </div>

              <div className="reply-box mt-3">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button className="btn-outline" onClick={() => handleAddComment(selectedConcern.id)}>
                  Send
                </button>
              </div>
            </div>
          )}
            <div className="concern-back">
              <button
                className="btn-back btn-back-inline"
                onClick={() => setActiveSection(null)}
              >
                ← Back to Options
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
