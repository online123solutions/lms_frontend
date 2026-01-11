// pages/TraineeDashboard/TraineeDashboardContent.jsx
import PropTypes from "prop-types";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import "../../utils/css/Trainee CSS/trainee-dashboard-content.css";
import { useState, useEffect } from "react";  
import "../../index.css"

function ProgressCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getTraineeProgress(); // GET /trainee-progress/
        setData(res);
      } catch (e) {
        setErr("Failed to load progress.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-3">Loading…</div>;
  if (err) return <div className="text-danger text-center py-3">{err}</div>;
  if (!data) return null;

  const t = data.totals || {
    subjects_total: 0,
    lessons_total: 0,
    lessons_completed: 0,
    lessons_pending: 0,
    progress_pct: 0,
  };

  return (
    <div className="td-progress-wrap">
      {/* Top mini KPIs */}
      <div className="td-progress-kpis">
        <div className="mini">
          <div className="label">Subjects</div>
          <div className="value">{t.subjects_total}</div>
        </div>
        <div className="mini">
          <div className="label">Lessons</div>
          <div className="value">{t.lessons_total}</div>
        </div>
        <div className="mini">
          <div className="label">Completed</div>
          <div className="value">{t.lessons_completed}</div>
        </div>
        <div className="bar">
          <div className="bar-head">
            <span>Overall Progress</span>
            <b>{t.progress_pct}%</b>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${t.progress_pct}%` }} />
          </div>
        </div>
      </div>

      {/* Compact table (3 cols like your screenshot) */}
      <div className="table-responsive mt-3">
        <table className="table table-bordered table-hover align-middle shadow-sm">
          <thead style={{ background: "#eaf4ff" }}>
            <tr>
              <th>Subject</th>
              <th className="text-center">Total</th>
              <th className="text-center">Completed</th>
            </tr>
          </thead>
          <tbody>
            {data.subjects?.length ? (
              data.subjects.map((s) => (
                <tr key={s.subject_id}>
                  <td className="fw-medium">{s.subject_name}</td>
                  <td className="text-center">{s.total_lessons}</td>
                  <td className="text-center">{s.completed_lessons}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  No subject data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default function TraineeDashboardContent({ data }) {
  // ---- Safe reads + fallbacks (adapt keys to your API) ----
  const name   = data?.profile?.name || "Trainee";
  const pic    = data?.profile?.profile_pic || "";
  const courses = data?.courses_count ?? data?.courses?.length ?? 0;
  const certs   = data?.certifications_count ?? 0;
  const [imageError, setImageError] = useState(false);
  const firstLetter = name.charAt(0).toUpperCase();

  const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
  const activeHW      = Array.isArray(data?.active_homework) ? data.active_homework : [];

  // Performance (use your real numbers when available)
  const perfLabels = ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6","Unit 7","Unit 8"];
  const perfStudent = data?.performance?.student ?? Array(perfLabels.length).fill(0);
  const perfAverage = data?.performance?.average ?? Array(perfLabels.length).fill(0);
  const perfHighest = data?.performance?.highest ?? Array(perfLabels.length).fill(0);

  const performanceData = {
    labels: perfLabels,
    datasets: [
      { label: "Student Marks", data: perfStudent, borderWidth: 2, tension: 0.3, borderColor: "rgba(107, 33, 168, .9)", backgroundColor: "rgba(107, 33, 168, .12)", pointRadius: 0, fill: true },
      { label: "Average Marks", data: perfAverage, borderWidth: 2, tension: 0.3, borderColor: "rgba(147, 51, 234, .9)", backgroundColor: "rgba(147, 51, 234, .10)", pointRadius: 0, fill: true },
      { label: "Highest Marks", data: perfHighest, borderWidth: 2, tension: 0.3, borderColor: "rgba(234, 179, 8, .9)", backgroundColor: "rgba(234, 179, 8, .10)", pointRadius: 0, fill: true },
    ],
  };

  const perfOptions = {
    plugins: { legend: { position: "top", labels: { boxWidth: 12 } } },
    scales: {
      x: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { color: "#6b7280" } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,.06)" }, ticks: { color: "#6b7280" } },
    },
  };

  // Login activity
  const loginRaw = data?.login_activity || [];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byIndex = Array.isArray(loginRaw) && loginRaw.length === 12;
  const loginCounts = byIndex ? loginRaw : months.map(m => (loginRaw.find?.(r => r.month === m)?.count || 0));
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];
  const [year, setYear] = useState(currentYear); // simple selector; swap data if you add by-year data

  const loginChart = {
    labels: months,
    datasets: [{
      label: "Logins",
      data: loginCounts,
      borderRadius: 6,
      barThickness: 18,
      backgroundColor: "rgba(16, 185, 129, .3)",
      borderColor: "rgba(16, 185, 129, .8)",
      borderWidth: 1,
    }],
  };

  const loginOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6b7280" } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,.06)" }, ticks: { color: "#6b7280", stepSize: 10 } },
    },
  };

  return (
    <div className="td-grid">
      {/* LEFT COLUMN */}
      <section className="card td-hello">
        <h1>Hello, <span className="accent">{name}</span></h1>
        <p>Nice to have you back, what an exciting day!<br/>Get ready and continue your lessons today.</p>

        <div className="td-section-head">
          <div className="td-card-title">Your Performance</div>
          <select className="td-mini-select" defaultValue="Homework">
            <option>Homework</option>
            <option>Assessments</option>
            <option>Quizzes</option>
          </select>
        </div>

        <div className="td-perf-card">
          <Line data={performanceData} options={perfOptions} />
        </div>

        <div className="td-follow card-lite">
          <div className="follow-gradient">
            <div className="follow-inner">
              <div className="follow-title">Follow Us</div>
              <div className="follow-sub">Stay tuned for updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN */}
      <aside className="card td-profile">
        <div className="td-profile-banner" />
        <div className="td-profile-top">
          {pic && !imageError ? (
            <img 
              src={pic} 
              alt="profile" 
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                backgroundColor: "#6366f1",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: "bold",
                border: "3px solid #fff",
                boxShadow: "0 6px 20px rgba(0,0,0,.1)",
              }}
            >
              {firstLetter}
            </div>
          )}
          <div>
            <h3>{name}</h3>
            {/* <div className="muted">Class — {grade}</div> */}
          </div>
        </div>
        <div className="td-metrics">
          <div className="metric">
            <div className="num">{courses}</div>
            <div className="label">Course</div>
          </div>
          <div className="metric">
            <div className="num">{certs}</div>
            <div className="label">Certification</div>
          </div>
        </div>
      </aside>

      <aside className="card td-notifs">
        <div className="td-card-title with-icon">
          <i className="bi bi-bell-fill"></i> Notifications — {notifications.length}
        </div>
        <ul className="td-list lined bright">
          {notifications.length ? notifications.slice(0, 8).map((n, i) => (
            <li key={i}>
              <span className="dot dot-white" />
              <div className="li-text">
                <b>{n.title || "Homework"}</b> — {n.message || n.text || ""}
                {n.by && <span className="muted light"> — {n.by}</span>}
              </div>
            </li>
          )) : <li className="muted light">No notifications.</li>}
        </ul>
      </aside>

      <aside className="card td-assign">
        <div className="td-card-title with-icon">
          <i className="bi bi-journal-check"></i> Active Assignments
        </div>
        <ul className="td-list lined on-orange">
          {activeHW.length ? activeHW.map((hw, i) => (
            <li key={i}>
              <span className="dot dot-dark" />
              <div className="li-text">
                <b>{hw.title || hw.name}</b>
                {hw.due_date && <span className="chip chip-dark">Due {hw.due_date}</span>}
              </div>
            </li>
          )) : <li className="muted dark">No active homework available.</li>}
        </ul>
      </aside>

      <section className="card td-login-chart">
        <div className="td-card-head">
          <div className="td-card-title">Login Activity</div>
          <select
            className="td-mini-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Bar data={loginChart} options={loginOptions} />
      </section>
    </div>
  );
}

TraineeDashboardContent.propTypes = { data: PropTypes.object };
