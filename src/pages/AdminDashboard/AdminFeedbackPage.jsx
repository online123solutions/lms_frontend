import React, { useEffect, useMemo, useState } from "react";
import { fetchTraineeFeedback } from "../../api/adminAPIservice";
import "../../utils/css/Admin CSS/admin-feedback.css";

const AdminFeedbackPage = () => {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const [filters, setFilters] = useState({
    username: "",
    search: "",
    date_from: "",
    date_to: "",
    min_comm: "",
    max_comm: "",
    min_subj: "",
    max_subj: "",
    min_ment: "",
    max_ment: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    setError(null);
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    );
    const res = await fetchTraineeFeedback(clean);
    if (res.success) setRows(res.data || []);
    else setError("Failed to load feedback. Check permissions or try again.");
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, []); // eslint-disable-line

  const averages = useMemo(() => {
    if (!rows.length) return { comm: 0, subj: 0, ment: 0 };
    const sum = rows.reduce((acc, r) => {
      acc.comm += Number(r.communication || 0);
      acc.subj += Number(r.subject_knowledge || 0);
      acc.ment += Number(r.mentorship || 0);
      return acc;
    }, { comm: 0, subj: 0, ment: 0 });
    const n = rows.length;
    const fix = (x) => (n ? (x / n).toFixed(2) : "0.00");
    return { comm: fix(sum.comm), subj: fix(sum.subj), ment: fix(sum.ment) };
  }, [rows]);

  const onChange = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const exportCSV = () => {
    const header = [
      "Trainee",
      "Trainer",
      "Communication",
      "SubjectKnowledge",
      "Mentorship",
      "Comment",
      "CreatedAt",
    ];
    const lines = rows.map(r => {
      const trainerName = 
        r.trainer?.name || 
        r.trainer_name || 
        r.trainer?.username || 
        r.trainer_username ||
        r.trainer?.user?.name ||
        r.trainer?.user?.username ||
        "";
      return [
        r.trainee_username,
        trainerName,
        r.communication,
        r.subject_knowledge,
        r.mentorship,
        (r.custom_feedback || "").replace(/\n/g, " ").replace(/"/g, '""'),
        new Date(r.created_at).toLocaleString(),
      ];
    });
    const csv = [header, ...lines]
      .map(arr => arr.map(x => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `trainee_feedback_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="afp-wrap">
        <div className="afp-card">
          <h3>Access Denied</h3>
          <p>You must be an <b>admin</b> to view trainee feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="afp-wrap">
      <div className="afp-header">
        <h2>All Trainee Feedback</h2>
        <div className="afp-averages">
          <span><b>Avg Comm:</b> {averages.comm}</span>
          <span><b>Avg Subject:</b> {averages.subj}</span>
          <span><b>Avg Mentorship:</b> {averages.ment}</span>
        </div>
      </div>

      <div className="afp-filters">
        <input placeholder="Username"
               value={filters.username}
               onChange={(e)=>onChange("username", e.target.value)} />
        <input placeholder="Search comments/username"
               value={filters.search}
               onChange={(e)=>onChange("search", e.target.value)} />
        <input type="date" value={filters.date_from}
               onChange={(e)=>onChange("date_from", e.target.value)}
               title="Date From" />
        <input type="date" value={filters.date_to}
               onChange={(e)=>onChange("date_to", e.target.value)}
               title="Date To" />

        <input type="number" placeholder="Min Comm"
               value={filters.min_comm}
               onChange={(e)=>onChange("min_comm", e.target.value)} />
        <input type="number" placeholder="Max Comm"
               value={filters.max_comm}
               onChange={(e)=>onChange("max_comm", e.target.value)} />

        <input type="number" placeholder="Min Subject"
               value={filters.min_subj}
               onChange={(e)=>onChange("min_subj", e.target.value)} />
        <input type="number" placeholder="Max Subject"
               value={filters.max_subj}
               onChange={(e)=>onChange("max_subj", e.target.value)} />

        <input type="number" placeholder="Min Mentorship"
               value={filters.min_ment}
               onChange={(e)=>onChange("min_ment", e.target.value)} />
        <input type="number" placeholder="Max Mentorship"
               value={filters.max_ment}
               onChange={(e)=>onChange("max_ment", e.target.value)} />

        <button className="btn-primary" onClick={load}>Apply</button>
        <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>

      {loading ? (
        <div className="afp-card">Loading...</div>
      ) : error ? (
        <div className="afp-card error">{String(error)}</div>
      ) : (
        <div className="afp-tablewrap">
          <table className="afp-table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Trainer</th>
                <th>Communication</th>
                <th>Subject Knowledge</th>
                <th>Mentorship</th>
                <th>Comment</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="7" className="empty">No feedback found.</td></tr>
              ) : rows.map(r => {
                // Extract trainer name from various possible field structures
                const trainerName = 
                  r.trainer?.name || 
                  r.trainer_name || 
                  r.trainer?.username || 
                  r.trainer_username ||
                  r.trainer?.user?.name ||
                  r.trainer?.user?.username ||
                  "-";
                return (
                  <tr key={r.id}>
                    <td>{r.trainee_username}</td>
                    <td>{trainerName}</td>
                    <td>{r.communication}</td>
                    <td>{r.subject_knowledge}</td>
                    <td>{r.mentorship}</td>
                    <td className="truncate" title={r.custom_feedback || ""}>
                      {r.custom_feedback || "-"}
                    </td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackPage;
