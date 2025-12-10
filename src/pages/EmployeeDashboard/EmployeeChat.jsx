import { useEffect, useMemo, useRef, useState } from "react";
import { getQueries, createQuery, respondToQuery } from "../../api/employeeAPIservice";
import "../../utils/css/Trainee CSS/chat.css"; // Updated to remove space in folder name

const DEPARTMENTS = ["IT", "Development", "HR", "Operations", "Sales", "Marketing", "Finance", "Support"];
const CATEGORIES = ["general", "training", "assessment", "technical"];

export default function EmployeeChat() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [newDepartment, setNewDepartment] = useState(localStorage.getItem("department") || "");
  const [newCategory, setNewCategory] = useState("general");
  const [newQueryText, setNewQueryText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // null, "raise", "feedback", "concern"
  const [feedback, setFeedback] = useState({ communication: 0, subjectKnowledge: 0, mentorship: 0 });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const currentUsername = (localStorage.getItem("username") || "").trim();
  const listEndRef = useRef(null);

  const messageCount = useMemo(
    () => (selectedQuery?.responses?.length || 0) + (selectedQuery ? 1 : 0),
    [selectedQuery]
  );

  useEffect(() => {
    if (activeSection === "raise") {
      fetchQueries();
    }
    const interval = activeSection === "raise" ? setInterval(fetchQueries, 10000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSection]);

  useEffect(() => {
    console.log("Queries state:", queries); // Debug: Log queries state
  }, [queries]);

  useEffect(() => {
    if (listEndRef.current) listEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedQuery, messageCount]);

  const fetchQueries = async () => {
    setIsLoading(true);
    try {
      const data = await getQueries();
      console.log("fetchQueries data:", data); // Debug: Log API response
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

  const whoForResponse = (resp, query) => {
    const type =
      resp.sender_type ||
      ((resp.responder_username || "").toLowerCase() === (query.raised_by || "").toLowerCase()
        ? "employee"
        : "trainer");
    if (type === "employee") return query.raised_by === currentUsername ? "You" : "Employee";
    return "Trainer";
  };

  const bubbleClass = (who) => (who === "Trainer" ? "trainer" : "employee");

  const handleNewQuery = async () => {
    const text = newQueryText.trim();
    if (!text) return;

    try {
      const fd = new FormData();
      fd.append("question", text);
      if (newDepartment) fd.append("department", newDepartment);
      if (newCategory) fd.append("category", newCategory);

      const created = await createQuery(fd);
      console.log("Created query:", created); // Debug: Log created query
      setNewQueryText("");
      setFilter(""); // Reset filter to show all queries
      if (created && created.id) setSelectedQuery({ responses: [], ...created });
      await fetchQueries();
    } catch (err) {
      console.error("Failed to create query:", err);
      setError("Failed to create query. Please try again.");
    }
  };

  const handleReply = async () => {
    const text = replyText.trim();
    if (!selectedQuery || !text) return;
    if (!selectedQuery.id) {
      setError("Cannot reply: query ID missing.");
      return;
    }
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
    const result = queries.filter((q) =>
      (q.question || "").toLowerCase().includes(filter.trim().toLowerCase())
    );
    console.log("Filtered queries:", result); // Debug: Log filtered queries
    return result;
  }, [queries, filter]);

  const handleFeedbackChange = (param, value) => {
    setFeedback((prev) => ({ ...prev, [param]: value }));
  };

  const handleSubmitFeedback = async () => {
    try {
      // Hypothetical API call to submit feedback (to be implemented)
      const response = await submitFeedback({
        username: currentUsername,
        communication: feedback.communication,
        subjectKnowledge: feedback.subjectKnowledge,
        mentorship: feedback.mentorship,
      });
      if (response.success) {
        setSubmitSuccess(true);
        setFeedback({ communication: 0, subjectKnowledge: 0, mentorship: 0 });
        setTimeout(() => setSubmitSuccess(false), 3000); // Hide success message after 3 seconds
      } else {
        setError("Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError("Failed to submit feedback. Please try again.");
    }
  };

  return (
    <div className="qc-root" style={{ paddingTop: '70px' }}>
      <div className="qc-shell">
        {/* Top bar */}
        <div className="qc-topbar">
          <div className="qc-top-left">
            <h2>Employee Queries</h2>
            {error && <div className="error-message">{error}</div>}
            {submitSuccess && <div className="success-message">Feedback submitted successfully!</div>}
            {selectedQuery && activeSection === "raise" && (
              <div className="qc-chips">
                {selectedQuery.category && <span className="chip">{selectedQuery.category}</span>}
                {selectedQuery.department && <span className="chip chip-outline">{selectedQuery.department}</span>}
                {selectedQuery.created_at && (
                  <span className="chip chip-light">Opened {timeAgo(selectedQuery.created_at)}</span>
                )}
              </div>
            )}
          </div>
          <div className="qc-top-actions">
            {activeSection === "raise" && (
              <>
                <button
                  className="btn-back"
                  onClick={() => {
                    setActiveSection(null);
                    setSelectedQuery(null);
                    setFilter("");
                    setError(null);
                  }}
                >
                  ← Back
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setSelectedQuery(null)}
                >
                  + New Query
                </button>
              </>
            )}
          </div>
        </div>

        {activeSection === null ? (
          <div className="query-options">
            <h3>Select an Option</h3>
            <div className="options-row">
              <button className="btn-option" onClick={() => setActiveSection("feedback")}>
                Feedback
              </button>
              <button className="btn-option" onClick={() => setActiveSection("raise")}>
                Raise Queries
              </button>
              <button className="btn-option" onClick={() => setActiveSection("concern")}>
                Feedback/Concern
              </button>
            </div>
          </div>
        ) : activeSection === "raise" ? (
          <div className="query-chat-container">
            {/* List */}
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
                  <button className="btn-outline" onClick={() => setSelectedQuery(null)}>Create one</button>
                </div>
              ) : (
                <ul className="list-items">
                  {filtered.map((q) => (
                    <li
                      key={q.id}
                      className={`chat-list-item ${selectedQuery?.id === q.id ? "active" : ""}`}
                      onClick={() => setSelectedQuery(q)}
                    >
                      <div className="item-title">Query #{q.id}</div>
                      <div className="item-sub">{q.question || "No question"}</div>
                      <div className="item-meta">
                        <span className="meta-left">{q.category || "general"}</span>
                        <span className="meta-right">{timeAgo(q.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Chat / New Query */}
            <main className="chat-main">
              {!selectedQuery ? (
                <div className="new-query-form card">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Department</label>
                      <select value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                        <option value="">-- Select department --</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="form-label">Write your query</label>
                  <textarea
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    placeholder="Type your question for the trainer…"
                  />

                  <div className="actions">
                    <button className="btn-primary" onClick={handleNewQuery}>Send</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="thread-header">
                    <div className="thread-title">
                      {selectedQuery.question?.slice(0, 120) || `Query #${selectedQuery.id}`}
                    </div>
                    <div className="thread-sub">
                      {selectedQuery.raised_by === currentUsername ? "You" : selectedQuery.raised_by} •{" "}
                      {new Date(selectedQuery.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="message-area">
                    <div className={`bubble-row left`}>
                      <div className="avatar">{(selectedQuery.raised_by || "U").slice(0, 1).toUpperCase()}</div>
                      <div className={`bubble trainee`}>
                        <div className="bubble-text">{selectedQuery.question}</div>
                        <div className="bubble-meta">
                          {selectedQuery.raised_by === currentUsername ? "You" : selectedQuery.raised_by} ·{" "}
                          {timeAgo(selectedQuery.created_at)}
                        </div>
                      </div>
                    </div>

                    {selectedQuery.responses?.map((r, idx) => {
                      const who = whoForResponse(r, selectedQuery);
                      const side = who === "Trainer" ? "right" : "left";
                      const name = who === "You" ? currentUsername : who;
                      const initials = (r.responder_username || name || "U").slice(0, 1).toUpperCase();
                      return (
                        <div key={r.id || r.responded_at || idx} className={`bubble-row ${side}`}>
                          <div className="avatar">{initials}</div>
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
                    <button className="btn-primary" onClick={handleReply}>Send</button>
                  </div>
                </>
              )}
            </main>
          </div>
        ) : activeSection === "feedback" ? (
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
                  onChange={(e) => handleFeedbackChange("communication", Math.max(1, Math.min(5, e.target.value)))}
                  placeholder="Rate 1-5"
                />
              </div>
              <div className="form-group">
                <label>Subject Knowledge (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.subjectKnowledge}
                  onChange={(e) => handleFeedbackChange("subjectKnowledge", Math.max(1, Math.min(5, e.target.value)))}
                  placeholder="Rate 1-5"
                />
              </div>
              <div className="form-group">
                <label>Mentorship (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.mentorship}
                  onChange={(e) => handleFeedbackChange("mentorship", Math.max(1, Math.min(5, e.target.value)))}
                  placeholder="Rate 1-5"
                />
              </div>
              <div className="actions">
                <button className="btn-primary" onClick={handleSubmitFeedback} disabled={Object.values(feedback).some(val => val < 1 || val > 5)}>
                  Submit Feedback
                </button>
                <button className="btn-back" onClick={() => setActiveSection(null)}>Back to Options</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="selected-section">
            <h3>{activeSection === "concern" ? "Feedback/Concern" : "Feedback/Concern"} Section</h3>
            <p>This section is under development. Coming soon!</p>
            <button className="btn-back" onClick={() => setActiveSection(null)}>Back to Options</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Hypothetical submitFeedback function (to be implemented in api/employeeAPIservice.js)
async function submitFeedback(feedbackData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true }); // Replace with actual API call
    }, 1000);
  });
}