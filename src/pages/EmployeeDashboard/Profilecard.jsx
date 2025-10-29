import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchEmployeeDashboard,
  fetchEmployeeNotifications,
  markNotificationRead,
  getEmployeeProgress,
} from "../../api/employeeAPIservice";
import { mediaUrl, fetchBanners } from "../../api/traineeAPIservice"; // <-- reuse helpers
import "../../UIcomponents/dashboard/profilecard.css";
import PerformanceChart from "./PerformanceChart";
import "bootstrap-icons/font/bootstrap-icons.css";
import traineeLogo from "../../assets/sol_log1.png";

/* ---------------- small helpers ---------------- */
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

const toImageUrl = (maybeUrl) => {
  if (!maybeUrl) return "";
  return mediaUrl(maybeUrl);
};

/* ---------------- BannerSlider ----------------- */
const BannerSlider = ({ banners = [], fallbackSlides = [] }) => {
  const apiSlides =
    Array.isArray(banners) && banners.length
      ? banners.map((b) => ({
          title: b.title || "—",
          content: b.text || "",
          image: toImageUrl(b.image_url || b.image || ""),
        }))
      : [];

  const defaults = [
    {
      title: "Welcome aboard!",
      content: "Check your tasks, updates, and assessments right here.",
      image:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1971&auto=format&fit=crop",
    },
  ];

  const slides = apiSlides.length
    ? apiSlides
    : (Array.isArray(fallbackSlides) && fallbackSlides.length ? fallbackSlides : defaults);

  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const go = (next) => setI((p) => (p + (next ? 1 : -1) + slides.length) % slides.length);

  return (
    <div className="slider-card">
      <div className="slider-head">
        <h2 className="slider-title">{slides[i]?.title || ""}</h2>
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
            style={{ backgroundImage: s.image ? `url(${s.image})` : "none" }}
            aria-label={s.title}
            role="img"
          />
        ))}
      </div>

      {slides[i]?.content ? <p className="slider-desc">{slides[i].content}</p> : null}

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
  banners: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      text: PropTypes.string,
      image: PropTypes.string,
      image_url: PropTypes.string,
    })
  ),
  fallbackSlides: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      content: PropTypes.string,
      image: PropTypes.string,
    })
  ),
};

/* ---------------- ProfileCard ----------------- */
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

  const profilePicRaw =
    data?.profile?.profile_picture ||
    data?.profile_picture ||
    data?.profile?.profile_pic ||
    data?.profile?.user?.profile_picture ||
    "";

  const profilePic = toImageUrl(profilePicRaw) || "https://via.placeholder.com/80";

  return (
    <div className="profile-card centered-profile">
      <img src={profilePic} alt="Profile" className="profile-pic centered" />
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

/* ---------------- ActionCards ----------------- */
const ActionCards = ({ activeQuizzes }) => {
  const [notifications, setNotifications] = useState([]);
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

/* ---------------- Newsletter (kept) ----------------- */
// const Newsletter = ({ data }) => {
//   const newsItem = data?.admin_news || {
//     title: "New Training Module Available!",
//     content:
//       "We are excited to announce a new training module on advanced techniques. Start learning today!",
//     image:
//       "https://images.unsplash.com/photo-1723384747376-90f201a3bd55?q=80&w=1971&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
//   };

//   return (
//     <div
//       className="newsletter-card"
//       style={{
//         backgroundColor: "#fff",
//         padding: "20px",
//         borderRadius: "8px",
//         boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
//         marginBottom: "20px",
//       }}
//     >
//       <h2 style={{ color: "#333", marginBottom: "10px" }}>{newsItem.title}</h2>
//       <img
//         src={newsItem.image}
//         alt={newsItem.title}
//         style={{
//           width: "100%",
//           height: "200px",
//           objectFit: "cover",
//           borderRadius: "4px",
//           marginBottom: "15px",
//         }}
//       />
//       <p style={{ color: "#666", marginBottom: "15px" }}>{newsItem.content}</p>
//     </div>
//   );
// };

// Newsletter.propTypes = {
//   data: PropTypes.shape({
//     admin_news: PropTypes.shape({
//       title: PropTypes.string,
//       content: PropTypes.string,
//       image: PropTypes.string,
//     }),
//   }),
// };

/* ---------------- UpdatesCard ----------------- */
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
    <div
      className="updates-card"
      style={{
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        marginTop: "20px",
      }}
    >
      <h3 style={{ color: "#333", marginBottom: "15px" }}>Latest Updates</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {updates.map((update, index) => (
          <li key={index} style={{ marginBottom: "15px", color: "black" }}>
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

/* ---------------- LeftContainer ----------------- */
const LeftContainer = ({ data, banners }) => {
  return (
    <div className="left-container">
    <h1
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "nowrap",
      }}
    >
      <span>
        <b>Hello, </b>
        {data?.profile?.name || "Trainee"}
      </span>

      {/* logo at the END of the same line */}
      <img
        src={traineeLogo}
        alt="Trainee Logo"
        style={{
          height: "48px",
          width: "auto",
          marginLeft: "438px",
          verticalAlign: "middle",
        }}
      />
    </h1>
      {/* <h6>Nice to have you back, what an exciting day!</h6> */}
      <h6>Get ready and continue your lessons today.</h6>

      {/* Backend banners slider */}
      <BannerSlider banners={banners} />

      {/* Keep newsletter below slider */}
      {/* <Newsletter data={data} /> */}

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
  banners: PropTypes.array,
};

/* --- My Progress (summary only) --- */
const ProgressMiniCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getEmployeeProgress();
        setData(res);
      } catch (e) {
        setErr("Failed to load progress.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <section className="card mp-card">
        <div className="text-center py-2">Loading…</div>
      </section>
    );
  if (err)
    return (
      <section className="card mp-card">
        <div className="text-danger text-center py-2">{err}</div>
      </section>
    );
  if (!data) return null;

  const t = data.totals || {
    subjects_total: 0,
    lessons_total: 0,
    lessons_completed: 0,
    progress_pct: 0,
  };

  return (
    <section className="card mp-card">
      <div className="mp-header">
        <div className="mp-title">
          <i className="bi bi-bar-chart-line"></i>
          <span>My Progress</span>
        </div>
      </div>

      <div className="mp-kpis">
        <div className="mp-chip">
          <span className="mp-chip-icon bg-blue">
            <i className="bi bi-journal"></i>
          </span>
          <div>
            <div className="mp-chip-label">Subjects</div>
            <div className="mp-chip-value">{t.subjects_total}</div>
          </div>
        </div>
        <div className="mp-chip">
          <span className="mp-chip-icon bg-amber">
            <i className="bi bi-puzzle"></i>
          </span>
          <div>
            <div className="mp-chip-label">Lessons</div>
            <div className="mp-chip-value">{t.lessons_total}</div>
          </div>
        </div>
        <div className="mp-chip">
          <span className="mp-chip-icon bg-green">
            <i className="bi bi-check2-circle"></i>
          </span>
          <div>
            <div className="mp-chip-label">Completed</div>
            <div className="mp-chip-value">{t.lessons_completed}</div>
          </div>
        </div>
      </div>

      <div className="mp-progress">
        <div className="mp-donut" style={{ "--p": t.progress_pct }} data-label={`${t.progress_pct}%`} />
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Overall Progress</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Keep going! <b>{t.lessons_completed}</b> of <b>{t.lessons_total}</b> lessons done.
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------- DashboardCard ----------------- */
const DashboardCard = () => {
  const username = localStorage.getItem("username") || "";
  const [data, setData] = useState(null);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (username) {
          const response = await fetchEmployeeDashboard(username);
          if (response.success) setData(response.data);
        }
      } catch (e) {
        console.error("Failed to load employee dashboard", e);
      }

      // Load global/active banners from the same endpoint we used for trainees
      try {
        const list = await fetchBanners({ is_active: true });
        setBanners(list);
      } catch (e) {
        console.error("Failed to load banners", e);
        setBanners([]);
      }
    };

    load();
  }, [username]);

  const activeQuizzes = data?.active_quizzes || [];

  return (
    <div className="dashboard-container">
      <LeftContainer data={data} banners={banners} />
      <div className="right-container">
        <div className="top-section">
          <ProfileCard username={username} />
          <ActionCards activeQuizzes={activeQuizzes} />
        </div>
        <UpdatesCard data={data} />
        <ProgressMiniCard />
      </div>
    </div>
  );
};

export default DashboardCard;
