// pages/TraineeDashboard/TraineeDashboardContent.jsx
import PropTypes from "prop-types";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import "../../utils/css/Trainee CSS/trainee-dashboard-content.css";
import { useState } from "react";  

export default function EmployeeDashboardContent({ data }) {
  // ---- Safe reads + fallbacks (adapt keys to your API) ----
  const name   = data?.profile?.name || "Employee";
  const pic    = data?.profile?.profile_pic || "";
  const courses = data?.courses_count ?? data?.courses?.length ?? 0;
  const certs   = data?.certifications_count ?? 0;

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
          <img src={pic || "/placeholder-avatar.png"} alt="profile" />
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

EmployeeDashboardContent.propTypes = { data: PropTypes.object };
