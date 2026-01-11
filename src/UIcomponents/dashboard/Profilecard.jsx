// src/components/Trainee/DashboardCard.jsx
import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchTraineeDashboard,
  fetchTraineeNotifications,
  markNotificationRead,
  mediaUrl,
  getTraineeProgress,
  fetchBanners,        // <-- added
} from "../../api/traineeAPIservice";
import "../../UIcomponents/dashboard/profilecard.css";
import PerformanceChart from "./PerformanceChart";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../index.css";
import UpdatesCard from "../../pages/TraineeDashboard/UpdatesCard";
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
  // mediaUrl already handles absolute/relative in your codebase
  return mediaUrl(maybeUrl);
};

/* ---------------- BannerSlider ----------------- */
const BannerSlider = ({ data, banners = [] }) => {
  // Prefer backend banners -> fallback to admin_news_list -> static
  const apiSlides =
    Array.isArray(banners) && banners.length
      ? banners.map((b) => ({
          title: b.title || "—",
          content: b.text || "",
          image: toImageUrl(b.image_url || b.image || ""),
        }))
      : [];

  const fallbackSlidesFromData =
    Array.isArray(data?.admin_news_list) && data.admin_news_list.length
      ? data.admin_news_list
      : [];

  const defaultSlides = [
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

  const slides =
    apiSlides.length > 0
      ? apiSlides
      : fallbackSlidesFromData.length > 0
      ? fallbackSlidesFromData
      : defaultSlides;

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
  data: PropTypes.shape({
    admin_news_list: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        content: PropTypes.string,
        image: PropTypes.string,
      })
    ),
  }),
  banners: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      text: PropTypes.string,
      image: PropTypes.string,
      image_url: PropTypes.string,
    })
  ),
};

/* ---------------- ProfileCard ----------------- */
const ProfileCard = ({ username }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const profilePicRaw =
    data?.profile?.profile_picture ||
    data?.profile_picture ||
    data?.profile?.profile_pic ||
    data?.profile?.user?.profile_picture ||
    "";

  const profilePic = mediaUrl(profilePicRaw);

  const courseCount = data?.subjects_count || 0;
  const certCount = data?.certifications?.length || 0;
  const userName = data?.profile?.name || "Trainee";
  const firstLetter = userName.charAt(0).toUpperCase();

  return (
    <div className="profile-card centered-profile">
      {profilePic && !imageError ? (
        <img 
          src={profilePic} 
          alt="Profile" 
          className="profile-pic centered" 
          onError={() => setImageError(true)}
        />
      ) : (
        <div 
          className="profile-pic centered"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#6366f1",
            color: "#fff",
            fontSize: "2.5rem",
            fontWeight: "bold",
          }}
        >
          {firstLetter}
        </div>
      )}
      <h4>{userName}</h4>
      <p className="location"><b>Department</b> - {data?.profile?.department || "-"}</p>
      <p className="location"><b>Designation</b> - {data?.profile?.designation || "-"}</p>

      <div className="stats">
        <div className="stat-row">
          <p className="stat-count">{courseCount}</p>
          <p className="stat-label">Course</p>
        </div>
        <div className="stat-row">
          <p className="stat-count">{certCount}</p>
          <p className="stat-label">Certification</p>
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
        <div className="icon-heading">
          <i className="bi bi-bell-fill icon"></i>
          <h4 className="icon-heading-title">
            Notifications {loadingNotif ? "" : `- ${notifications.length}`}
          </h4>
          {unreadCount > 0 && (
            <span className="unread-badge" aria-hidden="true">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="header-con1">
          <ul className="notif-list">
            {loadingNotif ? (
              <li className="notif-empty">Loading notifications…</li>
            ) : notifications.length > 0 ? (
              notifications.slice(0, 6).map((rec) => {
                const n = rec.notification || {};
                return (
                  <li key={rec.id} className={`notif-item ${rec.is_read ? "read" : "unread"}`}>
                    <div className="notif-head">
                      {!rec.is_read && <span className="notif-dot" title="Unread" />}
                      <strong className="notif-title">{n.subject || "Notification"}</strong>
                      {/* <span className="notif-meta">{formatDate(n.created_at || rec.delivered_at)}</span> */}
                    </div>

                    <div className="notif-body">
                      <div className="notif-message">
                        {n.message || "-"}
                        {n.link && (
                          <>
                            {" "}—{" "}
                            <a href={n.link} target="_blank" rel="noreferrer" className="notif-link">
                              Open
                            </a>
                          </>
                        )}
                      </div>

                      <div className="notif-footer">
                        <span className="notif-from">From: {n.sent_by ?? "—"}</span>
                        {!rec.is_read && (
                          <button
                            className="btn-mark-read"
                            onClick={() => handleMarkRead(n.id)}
                            aria-label="Mark notification as read"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="notif-empty">No notifications</li>
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

/* ---------------- LeftContainer ----------------- */
const LeftContainer = ({ data, banners }) => {
  return (
    <div className="left-container">
      <h1 className="left-header">
        <div className="left-greeting">
          <span className="greeting-name">
            <b>Hello,</b> {data?.profile?.name || "Trainee"}
          </span>
          {/* <div className="sub-greet">Nice to have you back, what an exciting day!</div> */}
        </div>

        <div className="header-logo" aria-hidden={!traineeLogo}>
          <img src={traineeLogo} alt="Trainee Logo" />
        </div>
      </h1>

      {/* <h6>Nice to have you back, what an exciting day!</h6> */}
      <h6>Nice to have you back, what an exciting day!</h6>
      <BannerSlider data={data} banners={banners} />
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
  banners: PropTypes.array, // from API
};

/* --- My Progress (summary only) --- */
const ProgressMiniCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getTraineeProgress(); // /trainee-progress/
        setData(res);
      } catch (e) {
        setErr("Failed to load progress.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <section className="card mp-card"><div className="text-center py-2">Loading…</div></section>;
  if (err) return <section className="card mp-card"><div className="text-danger text-center py-2">{err}</div></section>;
  if (!data) return null;

  const t = data.totals || { subjects_total:0, lessons_total:0, lessons_completed:0, progress_pct:0 };

  return (
    <section className="card mp-card">
      <div className="mp-header">
        <div className="mp-title">
          <i className="bi bi-bar-chart-line"></i>
          <span>My Progress</span>
        </div>
      </div>

      {/* 3 chips in a single row */}
      <div className="mp-kpis">
        <div className="mp-chip">
          <span className="mp-chip-icon bg-blue"><i className="bi bi-journal"></i></span>
          <div>
            <div className="mp-chip-label">Subjects</div>
            <div className="mp-chip-value">{t.subjects_total}</div>
          </div>
        </div>
        <div className="mp-chip">
          <span className="mp-chip-icon bg-amber"><i className="bi bi-puzzle"></i></span>
          <div>
            <div className="mp-chip-label">Lessons</div>
            <div className="mp-chip-value">{t.lessons_total}</div>
          </div>
        </div>
        <div className="mp-chip">
          <span className="mp-chip-icon bg-green"><i className="bi bi-check2-circle"></i></span>
          <div>
            <div className="mp-chip-label">Completed</div>
            <div className="mp-chip-value">{t.lessons_completed}</div>
          </div>
        </div>
      </div>

      {/* Overall meter only */}
      <div className="mp-progress">
        <div
          className="mp-donut"
          style={{ "--p": t.progress_pct }}
          data-label={`${t.progress_pct}%`}
        />
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
          const response = await fetchTraineeDashboard(username);
          if (response.success) setData(response.data);
        }
      } catch (e) {
        console.error("Failed to load trainee dashboard", e);
      }

      // Load banners (active ones)
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