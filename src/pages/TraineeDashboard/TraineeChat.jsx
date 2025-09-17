import { useEffect, useMemo, useRef, useState } from "react";
import { getQueries, createQuery, respondToQuery } from "../../api/traineeAPIservice";
// TIP: consider renaming the folder to remove the space: TraineeCSS/chat.css
import "../../utils/css/Trainee CSS/chat.css";
import "../../index.css"

const DEPARTMENTS = ["IT", "Development", "HR", "Operations", "Sales", "Marketing", "Finance", "Support"];
const CATEGORIES = ["general", "training", "assessment", "technical"];

export default function TraineeChat() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);

  // New-query form state (no is_resolved)
  const [newDepartment, setNewDepartment] = useState(localStorage.getItem("department") || "");
  const [newCategory, setNewCategory] = useState("general");
  const [newQueryText, setNewQueryText] = useState("");

  // Reply state
  const [replyText, setReplyText] = useState("");

  const [filter, setFilter] = useState("");
  const currentUsername = (localStorage.getItem("username") || "").trim();
  const listEndRef = useRef(null);

  const messageCount = useMemo(
    () => (selectedQuery?.responses?.length || 0) + (selectedQuery ? 1 : 0),
    [selectedQuery]
  );

  useEffect(() => {
    fetchQueries();
    const interval = setInterval(fetchQueries, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listEndRef.current) listEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedQuery, messageCount]);

  const fetchQueries = async () => {
    try {
      const data = await getQueries();
      setQueries(data || []);
      if (selectedQuery && data?.length) {
        const updated = data.find((q) => q.id === selectedQuery.id);
        if (updated) setSelectedQuery(updated);
      }
    } catch (err) {
      console.error("Failed to fetch queries:", err);
    }
  };

  const whoForResponse = (resp, query) => {
    const type =
      resp.sender_type ||
      ((resp.responder_username || "").toLowerCase() === (query.raised_by || "").toLowerCase()
        ? "trainee"
        : "trainer");
    if (type === "trainee") return query.raised_by === currentUsername ? "You" : "Trainee";
    return "Trainer";
  };
  const bubbleClass = (who) => (who === "Trainer" ? "trainer" : "trainee");

  // === Create Query === (no is_resolved)
  const handleNewQuery = async () => {
    const text = newQueryText.trim();
    if (!text) return;

    try {
      const fd = new FormData();
      fd.append("question", text);
      if (newDepartment) fd.append("department", newDepartment);
      if (newCategory) fd.append("category", newCategory);

      const created = await createQuery(fd);
      setNewQueryText("");

      if (created && created.id) setSelectedQuery({ responses: [], ...created });
      await fetchQueries();
    } catch (err) {
      console.error("Failed to create query:", err);
    }
  };

  // === Reply ===
  const handleReply = async () => {
    const text = replyText.trim();
    if (!selectedQuery || !text) return;
    if (!selectedQuery.id) {
      alert("Cannot reply: query id missing. Ensure QuerySerializer includes 'id'.");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("response", text);
      await respondToQuery(selectedQuery.id, fd);
      setReplyText("");
      await fetchQueries();
    } catch (err) {
      console.error("Failed to send reply:", err);
      console.log("Server said:", err?.response?.data);
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

  return (
    <div className="qc-root">
      <div className="qc-shell">
        {/* Top bar */}
        <div className="qc-topbar">
          <div className="qc-top-left">
            <h2>Trainee Queries</h2>
            {selectedQuery && (
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
            <button className="btn-outline" onClick={() => setSelectedQuery(null)}>
              + New Query
            </button>
          </div>
        </div>

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

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-emoji">📝</div>
                <div>No queries found</div>
                <button className="btn-outline" onClick={() => setSelectedQuery(null)}>Create one</button>
              </div>
            ) : (
              <ul className="list-items">
                {filtered.map((q, idx) => (
                  <li
                    key={q.id ?? q.created_at ?? idx}
                    className={`chat-list-item ${selectedQuery?.id === q.id ? "active" : ""}`}
                    onClick={() => setSelectedQuery(q)}
                  >
                    <div className="item-title">Query #{idx + 1}</div>
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
                  {/* Root question */}
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

                  {/* Responses */}
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

                {/* Composer */}
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
      </div>
    </div>
  );
}
