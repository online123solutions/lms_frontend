import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchEmployeeDashboard,
  fetchEmployeeNotifications,
  markNotificationRead,
} from "../../api/employeeAPIservice";
import "../../UIcomponents/dashboard/profilecard.css";
import Social from "../../UIcomponents/dashboard/Social";
import PerformanceChart from "./PerformanceChart";
import BarGraph from "./BarGraph";
import "bootstrap-icons/font/bootstrap-icons.css";

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
        const response = await fetchEmployeeDashboard(username);
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
        src="https://images.unsplash.com/photo-1723384747376-90f201a3bd55?q=80&w=1971&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        className="background-pic"
        alt="Background"
      />
      {/* <img
        src={data?.profile?.profile_pic || "https://via.placeholder.com/80"}
        alt="Profile"
        className="profile-pic"
      /> */}
      <h4>{data?.profile?.name || "Employee"}</h4>
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

const ActionCards = ({ activeQuizzes }) => {
  const [notifications, setNotifications] = useState([]); // list of NotificationReceipt
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const res = await fetchEmployeeNotifications({ unread: false });
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
                            display: "inline-block",
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
                          {" "}
                          —{" "}
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

      {/* Active Quizzes card (replaces Active Assignments) */}
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

const LeftContainer = ({ data }) => {
  return (
    <div className="left-container">
      <h1>
        <b>Hello, </b>
        {data?.profile?.name || "Employee"}
      </h1>
      <h6>Nice to have you back, what an exciting day!</h6>
      <h6>Get ready and continue your lessons today.</h6>
      <Newsletter data={data} /> {/* Added Newsletter above PerformanceChart */}
      <h2>Your Performance</h2>
      <PerformanceChart /> {/* Moved PerformanceChart below Newsletter */}
      {/* <div className="bottom-card">
        <Social />
      </div> */}
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

const Newsletter = ({ data }) => {
  const newsItem = data?.admin_news || {
    title: "New Training Module Available!",
    content: "We are excited to announce a new training module on advanced techniques. Start learning today!",
    image: "https://images.unsplash.com/photo-1723384747376-90f201a3bd55?q=80&w=1971&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  };

  return (
    <div className="newsletter-card" style={{
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      marginBottom: "20px",
    }}>
      <h2 style={{ color: "#333", marginBottom: "10px" }}>{newsItem.title}</h2>
      <img
        src={newsItem.image}
        alt={newsItem.title}
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          borderRadius: "4px",
          marginBottom: "15px",
        }}
      />
      <p style={{ color: "#666", marginBottom: "15px" }}>{newsItem.content}</p>
    </div>
  );
};

Newsletter.propTypes = {
  data: PropTypes.shape({
    admin_news: PropTypes.shape({
      title: PropTypes.string,
      content: PropTypes.string,
      image: PropTypes.string,
    }),
  }),
};

const UpdatesCard = ({ data }) => {
  const updates = data?.admin_updates || [
    {
      type: "Module",
      message: "New module 'Advanced Techniques' is now available.",
      endDate: "2025-10-01",
    },
    {
      type: "Planner",
      message: "Updated weekly planner for September is live.",
      endDate: "2025-09-30",
    },
    {
      type: "Assessment",
      message: "New assessment 'Mid-Term Review' is live.",
      endDate: "2025-09-15",
    },
  ];

  return (
    <div className="updates-card" style={{
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      marginTop: "20px",
    }}>
      <h3 style={{ color: "#333", marginBottom: "15px" }}>Latest Updates</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {updates.map((update, index) => (
          <li key={index} style={{ marginBottom: "15px", color: "#666" }}>
            <strong>{update.type}:</strong> {update.message} <br />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
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

const DashboardCard = () => {
  const username = localStorage.getItem("username") || "";
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      const response = await fetchEmployeeDashboard(username);
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
        <UpdatesCard data={data} /> {/* Replaced LearningActivity with UpdatesCard */}
      </div>
    </div>
  );
};

export default DashboardCard;