// UIcomponents/trainer/TrainerQueries.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTrainerQueries,
  respondToTrainerQuery,
  assignTrainerToQuery,
} from "../../api/trainerAPIservice";

// Reuse your existing Trainee chat styles
import "../../utils/css/Trainer CSS/trainerchat.css";
import "../../"

// If you already keep username/role/department in LS, we’ll use that for convenience
const currentUsername = (localStorage.getItem("username") || "").trim();
const currentDepartment = (localStorage.getItem("department") || "").trim();

const DEPARTMENTS = ["IT", "Development", "HR", "Operations", "Sales", "Marketing", "Finance", "Support"];
const CATEGORIES = ["general", "training", "assessment", "technical"];

export default function TrainerQueries() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);

  // Reply composer
  const [replyText, setReplyText] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [depFilter, setDepFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [assignFilter, setAssignFilter] = useState("all"); // all | unassigned | mine | others

  // Assign UI
  const [assignValue, setAssignValue] = useState(""); // username / id string for assignment

  const listEndRef = useRef(null);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (listEndRef.current) listEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedQuery]);

  async function fetchAll() {
    try {
      const data = await getTrainerQueries();
      setQueries(data || []);
      if (selectedQuery && data?.length) {
        const fresh = data.find((q) => q.id === selectedQuery.id);
        if (fresh) setSelectedQuery(fresh);
      }
    } catch (e) {
      console.error("Failed to load trainer queries:", e);
    }
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  // Figure out who sent each response (trainer vs trainee/employee)
  function whoForResponse(resp, query) {
    const type =
      resp.sender_type ||
      ((resp.responder_username || "").toLowerCase() === (query.raised_by || "").toLowerCase()
        ? "trainee"
        : "trainer");
    if (type === "trainee") return query.raised_by === currentUsername ? "You" : (query.raised_by || "Trainee/Employee");
    return resp.responder_username === currentUsername ? "You" : (resp.responder_username || "Trainer");
  }
  const bubbleClass = (who) => (who === "Trainer" || who === "You" ? "trainer" : "trainee");

  // Derived filtered list
  const filtered = useMemo(() => {
    let r = queries.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(
        (x) =>
          (x.question || "").toLowerCase().includes(q) ||
          (x.raised_by || "").toLowerCase().includes(q) ||
          (x.category || "").toLowerCase().includes(q) ||
          (x.department || "").toLowerCase().includes(q)
      );
    }
    if (depFilter) r = r.filter((x) => (x.department || "") === depFilter);
    if (catFilter) r = r.filter((x) => (x.category || "") === catFilter);

    if (assignFilter === "unassigned") {
      r = r.filter((x) => !x.assigned_trainer_username && !x.assigned_trainer);
    } else if (assignFilter === "mine") {
      r = r.filter(
        (x) =>
          (x.assigned_trainer_username || "").toLowerCase() === currentUsername.toLowerCase() ||
          (x.assigned_trainer || "").toString().toLowerCase() === currentUsername.toLowerCase()
      );
    } else if (assignFilter === "others") {
      r = r.filter(
        (x) =>
          x.assigned_trainer_username &&
          x.assigned_trainer_username.toLowerCase() !== currentUsername.toLowerCase()
      );
    }

    return r;
  }, [queries, search, depFilter, catFilter, assignFilter]);

  function onReplyKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleReply();
  }
}

  // Reply
async function handleReply() {
  const text = replyText.trim();
  if (!selectedQuery || !text) return;
  try {
    const fd = new FormData();
    fd.append("response", text);
    await respondToTrainerQuery(selectedQuery.id, fd);
    setReplyText("");
    await fetchAll();
  } catch (e) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.error || "Failed to send response.";
    // 🔁 If 403, try "Assign to Me" once, then retry send
    if (status === 403) {
      try {
        await assignTrainerToQuery(selectedQuery.id, currentUsername);
        const fd2 = new FormData();
        fd2.append("response", text);
        await respondToTrainerQuery(selectedQuery.id, fd2);
        setReplyText("");
        await fetchAll();
        return;
      } catch (inner) {
        alert(msg);
        return;
      }
    }
    alert(msg);
  }
}

const [assignBusy, setAssignBusy] = useState(false);

async function assignTo(value) {
  if (!selectedQuery || !value?.trim()) return;
  try {
    setAssignBusy(true);
    await assignTrainerToQuery(selectedQuery.id, value.trim());
    setAssignValue("");
    await fetchAll();
  } catch (e) {
    alert(e?.response?.data?.error || "Assignment failed.");
  } finally {
    setAssignBusy(false);
  }
}

async function assignToMe() {
  await assignTo(currentUsername || "");
}



  // Assign actions
  async function assignTo(value) {
    if (!selectedQuery) return;
    if (!value) return alert("Enter a trainer username / id first.");
    try {
      await assignTrainerToQuery(selectedQuery.id, value);
      setAssignValue("");
      await fetchAll();
    } catch (e) {
      console.error("Failed to assign:", e?.response?.data || e);
      alert("Assignment failed.");
    }
  }

  async function assignToMe() {
    await assignTo(currentUsername || "");
  }

  // Quick display helpers
  function headerChips(q) {
    return (
      <div className="qc-chips">
        {q.category && <span className="chip">{q.category}</span>}
        {q.department && <span className="chip chip-outline">{q.department}</span>}
        {q.created_at && <span className="chip chip-light">Opened {timeAgo(q.created_at)}</span>}
        {"is_resolved" in q && (
          <span className={`chip ${q.is_resolved ? "chip-success" : "chip-warn"}`}>
            {q.is_resolved ? "Resolved" : "Open"}
          </span>
        )}
        {(q.assigned_trainer_username || q.assigned_trainer) && (
          <span className="chip chip-dark">
            Assigned: {q.assigned_trainer_username || q.assigned_trainer}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="trainer-queries-scope">
    <div className="qc-root">
      <div className="qc-shell">
        {/* Top bar */}
        <div className="qc-topbar">
          <div className="qc-top-left">
            <h2><i className="bi bi-chat-left-text" style={{ color: "#FFFFFF" }}></i> Trainer Queries</h2>
            {selectedQuery && headerChips(selectedQuery)}
          </div>
          <div className="qc-top-actions">
            <button
              type="button"
              className="btn-outline back-button-mobile"
              onClick={() => setSelectedQuery(null)}
              aria-label="Back to list"
            >
              ← Back to list
            </button>
          </div>
        </div>

        <div className="query-chat-container">
          {/* LEFT: List & Filters */}
          <aside className="query-list">
            <div className="list-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by text, user, category, department…"
              />
            </div>

            <div className="filter-bar">
                <div className="filter">
                    <label>Department</label>
                    <select value={depFilter} onChange={(e) => setDepFilter(e.target.value)}>
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                    </select>
                </div>

                <div className="filter">
                    <label>Category</label>
                    <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                    ))}
                    </select>
                </div>

                <div className="filter">
                    <label>Assigned</label>
                    <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="mine">Assigned to Me</option>
                    <option value="others">Assigned to Others</option>
                    </select>
                </div>
                </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-emoji">📥</div>
                <div>No queries match your filters</div>
              </div>
            ) : (
              <ul className="list-items">
                {filtered.map((q) => (
                  <li
                    key={q.id}
                    className={`chat-list-item ${selectedQuery?.id === q.id ? "active" : ""}`}
                    onClick={() => setSelectedQuery(q)}
                  >
                    <div className="item-title">
                      {(q.raised_by || "User")} · {q.category || "general"}
                    </div>
                    <div className="item-sub">{q.question || "No question"}</div>
                    <div className="item-meta">
                      <span className="meta-left">
                        {q.assigned_trainer_username
                          ? `Assigned: ${q.assigned_trainer_username}`
                          : "Unassigned"}
                      </span>
                      <span className="meta-right">{timeAgo(q.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* RIGHT: Thread */}
          <main className="chat-main">
            {!selectedQuery ? (
              <div className="empty-state card">
                <div className="empty-emoji">👈</div>
                <div>Select a query from the list to view and respond</div>
                {currentDepartment && (
                  <div className="tips">
                    Tip: you’re in <b>{currentDepartment}</b> — use filters to narrow results.
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="thread-header">
                  <div className="thread-title">
                    {selectedQuery.question?.slice(0, 140) || `Query #${selectedQuery.id}`}
                  </div>
                  <div className="thread-sub">
                    {(selectedQuery.raised_by || "User")} •{" "}
                    {new Date(selectedQuery.created_at).toLocaleString()}
                  </div>

                  {/* Assign controls */}
                    <div className="assign-row">
                        <div className="assign-left">
                            <span className="chip chip-dark">
                            Assigned: {selectedQuery.assigned_trainer_username || selectedQuery.assigned_trainer || "—"}
                            </span>
                        </div>

                        <div className="assign-controls">
                            <input
                            className="assign-input"
                            placeholder="trainer username / id"
                            value={assignValue}
                            onChange={(e) => setAssignValue(e.target.value)}
                            />
                            <button
                            className="btn-outline assign-btn"
                            onClick={() => assignTo(assignValue)}
                            disabled={!assignValue?.trim() || assignBusy}
                            title="Assign to the entered trainer"
                            >
                            Assign
                            </button>
                            <button
                            className="btn-primary assign-btn"
                            onClick={assignToMe}
                            disabled={assignBusy}
                            title="Assign this query to me"
                            >
                            Assign to Me
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="message-area">
                  {/* Root question */}
                  <div className="bubble-row left">
                    <div className="avatar">
                      {(selectedQuery.raised_by || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="bubble trainee">
                      <div className="bubble-text">{selectedQuery.question}</div>
                      <div className="bubble-meta">
                        {(selectedQuery.raised_by || "User")} · {timeAgo(selectedQuery.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Responses */}
                  {selectedQuery.responses?.map((r, idx) => {
                    const who = whoForResponse(r, selectedQuery);
                    const side = who === "Trainer" || who === "You" ? "right" : "left";
                    const name =
                      who === "You"
                        ? currentUsername
                        : r.responder_username || who || "Trainer";
                    const initials = (name || "U").slice(0, 1).toUpperCase();
                    return (
                      <div key={r.id || idx} className={`bubble-row ${side}`}>
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
    </div>
  );
}
