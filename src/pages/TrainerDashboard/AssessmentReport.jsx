// src/pages/TrainerDashboard/TrainerAssessmentReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../utils/css/Trainer CSS/TrainerAssessmentReports.css";
import { getQuizzes, getAssessmentReports, getPeopleBrief } from "../../api/apiservice";
import "../../index.css";

const AUDIENCES = [
  { value: "trainee", label: "Trainee" },
  { value: "employee", label: "Employee" },
];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function timeAgo(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

function exportCSV(rows, filename = "assessment-results.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(",")]
    .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const Avatar = ({ name = "", fallback = "U", src }) => {
  const initials =
    name
      ?.split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || fallback.toUpperCase();
  return src ? (
    <img className="av-img" src={src} alt={initials} />
  ) : (
    <div className="av">{initials}</div>
  );
};

export default function TrainerAssessmentReports() {
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState("");
  const [audience, setAudience] = useState("trainee");

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qLoading, setQLoading] = useState(false);
  const [error, setError] = useState("");

  const [showResults, setShowResults] = useState({}); // { [reportId]: bool }
  const [peopleMap, setPeopleMap] = useState({}); // { usernameLower: {full_name, department, designation, avatar_url?} }

  const normalizeQuizzes = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    return [];
  };

  useEffect(() => {
    (async () => {
      setQLoading(true);
      setError("");
      try {
        const { success, data, error } = await getQuizzes();
        if (!success) throw error;
        const list = normalizeQuizzes(data);
        setQuizzes(list);
        if (list.length && list[0]?.id) setQuizId(String(list[0].id));
      } catch (e) {
        setError(typeof e === "string" ? e : e?.detail || e?.error || "Failed to load quizzes.");
      } finally {
        setQLoading(false);
      }
    })();
  }, []);

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => String(q.id) === String(quizId)),
    [quizzes, quizId]
  );

  const usernameFromRow = (row) =>
    (row.employee_username || row.trainee_username || row.username || row.user || "").toLowerCase();

  const personFromRow = (row) => {
    const u = usernameFromRow(row);
    const p = peopleMap[u] || {};
    const display = p.full_name || p.name || u || "-";
    return {
      username: u,
      full_name: display,
      department: p.department || row.department || "-",
      designation: p.designation || p.title || row.designation || "-",
      avatar_url: p.avatar_url,
    };
  };

  const loadReports = async ({ doRefresh = true, doAutocreate = true } = {}) => {
    if (!quizId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getAssessmentReports({
        quizId,
        audience,
        refresh: doRefresh,
        autocreate: doAutocreate,
      });
      const arr = Array.isArray(data) ? data : [];
      setReports(arr);

      // Get usernames to enrich with people brief (if available)
      const usernames = [
        ...new Set(
          arr.flatMap((r) => r?.results || []).map(usernameFromRow).filter(Boolean)
        ),
      ];
      if (usernames.length) {
        const mp = await getPeopleBrief(usernames);
        setPeopleMap(mp);
      } else {
        setPeopleMap({});
      }

      if (arr[0]?.id) setShowResults((s) => ({ ...s, [arr[0].id]: true }));
    } catch (e) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when quiz or audience changes (nice UX)
  useEffect(() => {
    if (quizId) loadReports({ doRefresh: true, doAutocreate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, audience]);

  // Export CSV using enriched data
  const firstReport = reports?.[0];
  const flatResults = useMemo(() => {
    if (!firstReport?.results?.length) return [];
    return firstReport.results.map((r) => ({
        name: r.display_name || r.username || "-",
        username: r.username || "-",
        department: r.department || "-",
        designation: r.designation || "-",
        score: r.score ?? "",
        quiz_id: r.quiz,
        attempted_at: r.date_attempted || "",
    }));
    }, [firstReport]);

  // Helpers for metrics (handle employee/trainee naming)
  const totalOf = (r) => r.total_employee ?? r.total_trainee ?? r.total ?? 0;
  const attemptedOf = (r) => r.employee_attempted ?? r.trainee_attempted ?? r.attempted ?? 0;

  return (
    <div className="ar-wrap">
      <div className="ar-toolbar">
        <div className="ar-controls">
          <div className="field">
            <label>Quiz</label>
            <select value={quizId} onChange={(e) => setQuizId(e.target.value)} disabled={qLoading}>
              {!quizzes.length && <option value="">No quizzes available</option>}
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quiz_name || q.name || `Quiz-${q.topic}`}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={() => loadReports({ doRefresh: true, doAutocreate: true })}
            disabled={loading || !quizId}
            title="Create missing reports and refresh metrics"
          >
            {loading ? "Loading..." : "Load / Refresh"}
          </button>

          <button
            className="btn-outline"
            onClick={() => loadReports({ doRefresh: false, doAutocreate: false })}
            disabled={loading || !quizId}
            title="Fetch without recompute"
          >
            Fetch Only
          </button>
        </div>

        <div className="ar-actions">
          <button
            className="btn-outline"
            disabled={!flatResults.length}
            onClick={() => exportCSV(flatResults, "assessment-results.csv")}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="ar-alert error">{error}</div>}

      {!reports.length && !loading ? (
        <div className="ar-empty">
          <div className="emoji">📊</div>
          <div>{quizId ? "No reports yet. Click “Load / Refresh”." : "Pick a quiz to begin."}</div>
        </div>
      ) : (
        <div className="ar-grid">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="ar-card skeleton" />)
            : reports.map((r) => (
                <div key={r.id} className="ar-card">
                  <div className="ar-top">
                    <div className="ar-title">{selectedQuiz?.quiz_name || `Quiz #${r.quiz}`}</div>
                    <div className="ar-sub">
                      {cap((r.report_type || "").replace("-", " "))} • {cap(r.audience)} • {timeAgo(r.last_updated)}
                    </div>
                  </div>

                  <div className="ar-metrics">
                    <div className="metric">
                      <div className="metric-k">Total</div>
                      <div className="metric-v">{totalOf(r)}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-k">Attempted</div>
                      <div className="metric-v">{attemptedOf(r)}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-k">Avg Score</div>
                      <div className="metric-v">{r.average_score ?? 0}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-k">Completion</div>
                      <div className="metric-v">{(r.completion_rate ?? 0).toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="ar-divider" />

                  <div className="ar-results">
                    <button
                      className="btn-chip"
                      onClick={() => setShowResults((s) => ({ ...s, [r.id]: !s[r.id] }))}
                    >
                      {showResults[r.id] ? "Hide" : "Show"} Attempts ({r?.results?.length || 0})
                    </button>

                    {showResults[r.id] && (
                      <div className="table-wrap">
                        {!r.results?.length ? (
                          <div className="muted">No attempts yet.</div>
                        ) : (
                          <table className="results-table">
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Score</th>
                                <th>Attempted</th>
                              </tr>
                            </thead>
                                <tbody>
                                {r.results.map((row) => (
                                    <tr key={row.id || `${row.username}-${row.quiz}`}>
                                    <td>
                                        <td>
                                          <div className="user-cell no-avatar">
                                            <div className="user-meta">
                                              <div className="name">{row.display_name || row.username || "-"}</div>
                                              <div className="muted">@{row.username}</div>
                                            </div>
                                          </div>
                                        </td>
                                    </td>
                                    <td>{row.department || "-"}</td>
                                    <td>{row.designation || "-"}</td>
                                    <td>{row.score ?? "-"}</td>
                                    <td>
                                        {row.date_attempted
                                        ? new Date(row.date_attempted).toLocaleString()
                                        : "-"}
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
