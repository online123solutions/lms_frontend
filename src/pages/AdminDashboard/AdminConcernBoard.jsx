// src/pages/AdminConcernBoard.jsx
import { useEffect, useState } from "react";
import {
  adminListConcerns,
  adminGetConcern,
  adminChangeStatus,
  adminAssignConcern,
  adminAddComment,
} from "../../api/adminAPIservice";

const STATUS = ["open", "in_progress", "resolved", "closed"];

export default function AdminConcernBoard() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    status: "", priority: "", department: "", assignee: "", creator: "", category: ""
  });
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");

  const load = async () => {
    const data = await adminListConcerns(
      Object.fromEntries(Object.entries(filters).filter(([_,v]) => v))
    );
    setList(data || []);
  };

  useEffect(() => { load(); }, []); // initial

  const open = async (id) => setSelected(await adminGetConcern(id));

  const changeStatus = async (s) => {
    if (!selected) return;
    const updated = await adminChangeStatus(selected.id, s);
    setSelected(updated);
    load();
  };

  const assign = async () => {
    if (!selected || !assignee.trim()) return;
    const updated = await adminAssignConcern(selected.id, assignee.trim());
    setSelected(updated);
    setAssignee("");
    load();
  };

  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    await adminAddComment(selected.id, comment.trim());
    setComment("");
    open(selected.id);
  };

  return (
    <div className="qc-root">
      <div className="qc-shell">
        <div className="qc-topbar">
          <div className="qc-top-left">
            <h2>Admin • Concerns</h2>
            <small>Filter, view, assign, change status, and comment</small>
          </div>
        </div>

        <div className="admin-concern-grid">
          {/* LEFT: filters + list */}
          <aside className="admin-list-panel">
            <form className="admin-filters" onSubmit={(e)=>{e.preventDefault(); load();}}>
              <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
                <option value="">Status: All</option>
                {STATUS.map(s=> <option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
              <select value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}>
                <option value="">Priority: All</option>
                <option>low</option><option>medium</option><option>high</option>
              </select>
              <input placeholder="Department" value={filters.department} onChange={e=>setFilters(f=>({...f,department:e.target.value}))}/>
              <input placeholder="Assignee (username)" value={filters.assignee} onChange={e=>setFilters(f=>({...f,assignee:e.target.value}))}/>
              <input placeholder="Creator (username)" value={filters.creator} onChange={e=>setFilters(f=>({...f,creator:e.target.value}))}/>
              <input placeholder="Category" value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}/>
              <button className="btn-primary" type="submit">Apply</button>
            </form>

            <ul className="admin-list">
              {(list||[]).map(c=>(
                <li key={c.id} className={`admin-item ${selected?.id===c.id?'active':''}`} onClick={()=>open(c.id)}>
                  <div className="ai-title">{c.title}</div>
                  <div className="ai-sub">
                    <span className={`badge status-${(c.status||'open').toLowerCase()}`}>{(c.status||'OPEN').toUpperCase()}</span>
                    <span className={`badge pri-${(c.priority||'medium').toLowerCase()}`}>{(c.priority||'medium').toUpperCase()}</span>
                    <span className="ai-dot">{c.category||'General'}</span>
                    <span className="ai-dot">Dept: {c.department||'-'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* RIGHT: detail */}
          <main className="admin-detail">
            {!selected ? (
              <div className="empty-state">Select a concern to view details.</div>
            ) : (
              <div className="concern-detail">
                <div className="concern-detail-header">
                  <button className="btn-back-inline" onClick={()=>setSelected(null)}>← Back to list</button>
                  <h5>#{selected.id} — {selected.title}</h5>
                  <span className={`chip status-${(selected.status||'open').toLowerCase()}`}>{(selected.status||'OPEN').toUpperCase()}</span>
                </div>

                <div className="admin-meta-row">
                  <label>Status</label>
                  <select value={selected.status||"open"} onChange={e=>changeStatus(e.target.value)}>
                    {STATUS.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>

                  <label>Priority</label>
                  <input value={selected.priority||""} disabled />

                  <label>Assign to (username)</label>
                  <div className="assign-inline">
                    <input value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="e.g. trainer01"/>
                    <button className="btn-outline" onClick={assign}>Assign</button>
                  </div>
                </div>

                <p className="admin-desc">{selected.description}</p>

                <h6>Comments</h6>
                <div className="comments-box">
                  {selected.comments?.length ? selected.comments.map(cm=>(
                    <div key={cm.id} className="comment-item"><b>{cm.author_username}:</b> {cm.message}</div>
                  )) : <div className="empty-state">No comments yet.</div>}
                </div>

                <div className="reply-box mt-3">
                  <input
                    placeholder="Write an admin comment…"
                    value={comment}
                    onChange={(e)=>setComment(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); addComment(); } }}
                  />
                  <button className="btn-outline" onClick={addComment}>Send</button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
