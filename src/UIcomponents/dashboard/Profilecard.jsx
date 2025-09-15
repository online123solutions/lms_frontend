import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchTraineeDashboard,
  fetchTraineeNotifications,
  markNotificationRead,
} from "../../api/traineeAPIservice";
import "../../UIcomponents/dashboard/profilecard.css";
import Social from "../../UIcomponents/dashboard/Social";
import PerformanceChart from "./PerformanceChart";
import BarGraph from "./BarGraph";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../index.css";

// small helpers
const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || seconds <= 0) return "ended";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// ---------------- BannerSlider -----------------
const BannerSlider = ({ data }) => {
  const slides = Array.isArray(data?.admin_news_list) && data.admin_news_list.length
    ? data.admin_news_list
    : [
        {
          title: "New Training Module Available!",
          content:
            "We are excited to announce a new training module on advanced techniques. Start learning today!",
          image:
            "https://images.unsplash.com/photo-1723384747376-90f201a3bd55?q=80&w=1971&auto=format&fit=crop",
        },
        {
          title: "Planner Updated",
          content:
            "Your weekly planner has been refreshed. Check the new tasks and timelines.",
          image:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1971&auto=format&fit=crop",
        },
        {
          title: "Assessments Live",
          content:
            "Mid-term assessments are live. Attempt them before the deadline.",
          image:
            "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1971&auto=format&fit=crop",
        },
      ];

  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const go = (next) => setI((p) => (p + (next ? 1 : -1) + slides.length) % slides.length);

  return (
    <div className="slider-card">
      <div className="slider-head">
        <h2 className="slider-title">{slides[i].title}</h2>
        <div className="slider-nav">
          <button className="slider-btn" onClick={() => go(false)} aria-label="Previous">
            ‹
          </button>
          <button className="slider-btn" onClick={() => go(true)} aria-label="Next">
            ›
          </button>
        </div>
      </div>

      <div className="slider-viewport">
        {slides.map((s, idx) => (
          <div
            key={idx}
            className={`slide ${idx === i ? "active" : ""}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}
      </div>

      <p className="slider-desc">{slides[i].content}</p>

      <div className="slider-dots">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${idx === i ? "on" : ""}`}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

BannerSlider.propTypes = {
  data: PropTypes.shape({
    admin_news_list: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        content: PropTypes.string,
        image: PropTypes.string,
      })
    ),
  }),
};

// ---------------- ProfileCard -----------------
const ProfileCard = ({ username }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = localStorage.getItem("isAuthenticated");

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isAuthenticated !== "true") {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetchTraineeDashboard(username);
        if (response.success) {
          setData(response.data);
        } else {
          setError("Failed to fetch dashboard data.");
        }
      } catch {
        setError("An error occurred while fetching dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    if (username) loadDashboardData();
  }, [username, isAuthenticated]);

  if (loading) return <p>Loading...</p>;
  if (error) return <div>{error}</div>;

  return (
    <div className="profile-card">
      <img
        src="https://images.unsplash.com/photo-1723384747376-90f201a3bd55?q=80&w=1971&auto=format&fit=crop"
        className="background-pic"
        alt="Background"
      />
      <img
        src={data?.profile?.profile_picture || "https://via.placeholder.com/80"}
        alt="Profile"
        className="profile-pic"
      />
      <h4>{data?.profile?.name || "Trainee"}</h4>
      <p className="location">Department - {data?.profile?.department || "-"}</p>
      <p className="location">Designation - {data?.profile?.designation || "-"}</p>
      <div className="stats">
        <div className="stat">
          <p>{data?.subjects_count || 0}</p>
          <span>Course</span>
        </div>
        <div className="stat">
          <p>{data?.certifications?.length || 0}</p>
          <span>Certification</span>
        </div>
      </div>
    </div>
  );
};

ProfileCard.propTypes = {
  username: PropTypes.string.isRequired,
};

// ---------------- ActionCards -----------------
const ActionCards = ({ activeQuizzes }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const res = await fetchTraineeNotifications({ unread: false });
      if (res.success && Array.isArray(res.data)) {
        const items = [...res.data].sort(
          (a, b) =>
            new Date(b.delivered_at || b.notification?.created_at || 0) -
            new Date(a.delivered_at || a.notification?.created_at || 0)
        );
        setNotifications(items);
        setUnreadCount(items.filter((r) => !r.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (notificationId) => {
    try {
      const res = await markNotificationRead(notificationId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((r) =>
            r.notification?.id === notificationId
              ? { ...r, is_read: true, read_at: new Date().toISOString() }
              : r
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  return (
    <div className="action-cards">
      {/* Notifications card */}
      <div className="action-card set-target1" style={{ width: "100%" }}>
        <div className="icon-heading" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-bell-fill icon"></i>
          <h4 style={{ margin: 0 }}>
            Notifications {loadingNotif ? "" : `- ${notifications.length}`}
          </h4>
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "#e02424",
                color: "#fff",
                borderRadius: 999,
                padding: "0 8px",
                fontSize: 12,
                lineHeight: "18px",
                height: 18,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="header-con1">
          <ul style={{ paddingLeft: 16 }}>
            {loadingNotif ? (
              <li>Loading notifications…</li>
            ) : notifications.length > 0 ? (
              notifications.slice(0, 6).map((rec) => {
                const n = rec.notification || {};
                return (
                  <li key={rec.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!rec.is_read && (
                        <span
                          title="Unread"
                          style={{
                            width: 8,
                            height: 8,
                            background: "#203C6E",
                            borderRadius: "50%",
                            display: "inline-flex",
                          }}
                        />
                      )}
                      <strong>{n.subject || "Notification"}</strong>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
                        {formatDate(n.created_at || rec.delivered_at)}
                      </span>
                    </div>
                    <div style={{ color: "#374151" }}>
                      {n.message || "-"}
                      {n.link && (
                        <>
                          {" "}—{" "}
                          <a href={n.link} target="_blank" rel="noreferrer" style={{ color: "#1f6feb" }}>
                            Open
                          </a>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        From: {n.sent_by ?? "—"}
                      </span>
                      {!rec.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          style={{
                            marginLeft: "auto",
                            background: "#e5e7eb",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            ) : (
              <li>No notifications</li>
            )}
          </ul>
        </div>
      </div>

      {/* Active Quizzes card */}
      <div className="action-card set-target" style={{ width: "100%" }}>
        <div className="icon-heading">
          <i className="bi bi-bullseye icon"></i>
          <h4>Active Quizzes</h4>
        </div>
        <div className="header-con">
          <ul>
            {Array.isArray(activeQuizzes) && activeQuizzes.length > 0 ? (
              activeQuizzes.map((q) => (
                <li key={q.quiz_id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{q.quiz_name}</strong>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>({q.quiz_type})</span>
                  <span style={{ marginLeft: "auto", fontSize: 12 }}>
                    {q.has_attempted ? "Attempted" : "Not attempted"} • ends in {formatDuration(q.ends_in_seconds)}
                  </span>
                </li>
              ))
            ) : (
              <li>No active quizzes available.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

ActionCards.propTypes = {
  activeQuizzes: PropTypes.arrayOf(
    PropTypes.shape({
      quiz_id: PropTypes.number.isRequired,
      quiz_name: PropTypes.string.isRequired,
      quiz_type: PropTypes.string.isRequired,
      start_date: PropTypes.string,
      end_date: PropTypes.string,
      has_attempted: PropTypes.bool,
      ends_in_seconds: PropTypes.number,
    })
  ),
};

// ---------------- LeftContainer -----------------
const LeftContainer = ({ data }) => {
  return (
    <div className="left-container">
      <h1>
        <b>Hello, </b>
        {data?.profile?.name || "Trainee"}
      </h1>
      <h6>Nice to have you back, what an exciting day!</h6>
      <h6>Get ready and continue your lessons today.</h6>
      <BannerSlider data={data} />
      <h2>Your Performance</h2>
      <PerformanceChart />
    </div>
  );
};

LeftContainer.propTypes = {
  data: PropTypes.shape({
    profile: PropTypes.shape({
      name: PropTypes.string,
      profile_pic: PropTypes.string,
      grade: PropTypes.string,
    }),
    courses: PropTypes.arrayOf(PropTypes.object),
    certifications: PropTypes.arrayOf(PropTypes.object),
  }),
};

// ---------------- UpdatesCard -----------------
const UpdatesCard = ({ data }) => {
  const updates = data?.admin_updates || [
    { type: "Module", message: "New module 'Advanced Techniques' is now available.", endDate: "2025-10-01" },
    { type: "Planner", message: "Updated weekly planner for September is live.", endDate: "2025-09-30" },
    { type: "Assessment", message: "New assessment 'Mid-Term Review' is live.", endDate: "2025-09-15" },
    { type: "Module", message: "New module 'Advanced Techniques' is now available.", endDate: "2025-10-01" },
    { type: "Planner", message: "Updated weekly planner for September is live.", endDate: "2025-09-30" },
    { type: "Assessment", message: "New assessment 'Mid-Term Review' is live.", endDate: "2025-09-15" },
  ];

  return (
    <div className="updates-card" style={{
      background:"#fff",
      padding:"20px",
      borderRadius:"15px",
      boxShadow:"0 2px 10px rgba(0,0,0,.1)",
      marginTop:"20px",
      height:"100vh"
    }}>
      <h3 style={{ color:"#333", marginBottom:"12px" }}>Latest Updates</h3>
      <ul>
        {updates.map((update, index) => (
          <li key={index} style={{ color:"#666" }}>
            <strong style={{ fontSize:"18px"}}>{update.type}:</strong> {update.message} <br />
            <span style={{ fontSize:"14px", color:"#6b7280" }}>
              Ends on: {formatDate(update.endDate)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

UpdatesCard.propTypes = {
  data: PropTypes.shape({
    admin_updates: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
        endDate: PropTypes.string,
      })
    ),
  }),
};

// ---------------- DashboardCard -----------------
const DashboardCard = () => {
  const username = localStorage.getItem("username") || "";
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      const response = await fetchTraineeDashboard(username);
      if (response.success) {
        setData(response.data);
      }
    };
    if (username) loadDashboardData();
  }, [username]);

  const activeQuizzes = data?.active_quizzes || [];

  return (
    <div className="dashboard-container">
      <LeftContainer data={data} />
      <div className="right-container">
        <div className="top-section">
          <ProfileCard username={username} />
          <ActionCards activeQuizzes={activeQuizzes} />
        </div>
        <UpdatesCard data={data} />
      </div>
    </div>
  );
};

export default DashboardCard;
