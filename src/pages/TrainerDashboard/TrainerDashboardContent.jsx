import React, { useState, useEffect } from "react";
import { Dropdown, Button, Modal } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/TDContent.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  fetchTrainerDashboard,
  fetchRecentActivity,
  fetchLMSEngagement,
} from "../../api/trainerAPIservice";
import { logout } from "../../api/apiservice";
import logoSO from "../../assets/logo1.png";
import "../../index.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ---- helpers ---------------------------------------------------
const getISO = (row) => row?.login_datetime || row?.login_date || "";
const toYyyyMm = (iso) => (iso ? (iso.split("T")[0] || "").slice(0, 7) : "");
const toYyyyMmDd = (iso) => (iso ? (iso.split("T")[0] || iso).slice(0, 10) : "");

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

// ---- profile picture URL (no envs, no base) --------------------
const isAbsolute = (url) => /^https?:\/\//i.test(url || "");

const normalizeMediaPath = (url) => {
  if (!url) return "";
  if (isAbsolute(url)) return url;
  // "/media/..." | "media/..." | "default_profile.jpg"
  if (url.startsWith("/media/")) return url;
  if (url.startsWith("media/")) return `/${url}`;
  return `/media/${url}`;
};

/**
 * Build candidate URLs to try, in order:
 * 1) the raw relative "/media/..." (works if your web server proxies /media)
 * 2) absolute on current origin (https://your-frontend/media/...)
 * 3) if running on port 3000, try backend on port 8000 (http://host:8000/media/...)
 */
const buildMediaCandidates = (rawUrl) => {
  const norm = normalizeMediaPath(rawUrl);
  if (!norm) return [];

  // If API already returned absolute, just use it
  if (isAbsolute(norm)) return [norm];

  const { protocol, hostname, port } = window.location;
  const currentOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

  const list = [];
  // 1) raw relative (useful if nginx serves /media on same domain)
  list.push(norm);
  // 2) absolute to current origin
  list.push(`${currentOrigin}${norm}`);
  // 3) dev helper: if React runs on 3000, try backend on 8000
  if (port === "3000") {
    const altOrigin = `${protocol}//${hostname}:8000`;
    list.push(`${altOrigin}${norm}`);
  }
  return list;
};

// ---- small modal for courses ----
const CourseModal = ({ show, handleClose, courses }) => (
  <Modal show={show} onHide={handleClose}>
    <Modal.Header closeButton>
      <Modal.Title>Courses</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {courses.length > 0 ? (
        <ul>
          {courses.map((course) => (
            <li key={course.course_id}>
              {course.course_name} ({course.department}, {course.is_approved ? "Approved" : "Pending"})
            </li>
          ))}
        </ul>
      ) : (
        <p>No courses found.</p>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={handleClose}>Close</Button>
    </Modal.Footer>
  </Modal>
);

const TeacherDashboardContent = () => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [lmsEngagementData, setLmsEngagementData] = useState([]);

  const [showModal, setShowModal] = useState(false);

  const [traineeCount, setTraineeCount] = useState(0);
  const [activeLearnerCount, setActiveLearnerCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [teacherName, setTeacherName] = useState("");

  // Profile pic handling (no env)
  const [profilePicRaw, setProfilePicRaw] = useState("");
  const [profilePicCandidates, setProfilePicCandidates] = useState([]);
  const [profilePicIndex, setProfilePicIndex] = useState(0);
  const profilePic = profilePicCandidates[profilePicIndex] || "";

  const [recentActivityData, setRecentActivityData] = useState({
    recent_logins: [],
    recent_homework_submissions: [],
    recent_uploads: [],
  });

  const [activeLearners, setActiveLearners] = useState([]);
  const [showActiveLearnersModal, setShowActiveLearnersModal] = useState(false);
  const [showActiveLearnersPage, setShowActiveLearnersPage] = useState(false);

  const username = localStorage.getItem("username") || "";

  // Dashboard header info
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await fetchTrainerDashboard(username);
        if (result.success) {
          const data = result.data;

          setTraineeCount(data.trainee_count ?? 0);
          setActiveLearnerCount(data.active_count ?? 0);
          setCourseCount(data.course_count ?? 0);

          // Backend you showed is: data.profile.name / data.profile.profile_picture
          setTeacherName(
            data.profile?.profile?.name ||
            data.profile?.name ||
            data.profile?.profile?.full_name ||
            ""
          );
          setCourses(data.courses || []);

          // Store raw URL, then compute candidates below
          const rawPic =
            data.profile?.profile?.profile_picture ||
            data.profile?.profile_picture ||
            data.profile_picture ||
            "";
          setProfilePicRaw(rawPic);

          // Active users
          setActiveLearners((data.active_users || []).map((user) => ({
            id: user.id,
            username: user.username,
            full_name: user.full_name || user.profile?.name || "",
            email: user.email,
            profile_type: user.profile_type || user.profile?.profile_type || "Unknown",
            department: user.department || user.profile?.department || "",
          })));
        } else {
          console.error("fetchTrainerDashboard error:", result.error);
        }
      } catch (e) {
        console.error("fetchTrainerDashboard failed:", e);
      }
    };
    if (username) loadDashboard();
  }, [username]);

  // Build candidate URLs for the image whenever raw path changes
  useEffect(() => {
    const candidates = buildMediaCandidates(profilePicRaw);
    setProfilePicCandidates(candidates);
    setProfilePicIndex(0);
  }, [profilePicRaw]);

  // LMS Engagement
  useEffect(() => {
    const loadAll = async () => {
      const res = await fetchLMSEngagement({});
      if (res.success) {
        const rows = normalizeRows(res.data);
        const months = Array.from(
          new Set(rows.map((r) => toYyyyMm(getISO(r))).filter(Boolean))
        ).sort();
        setAvailableMonths(months);

        const latest = months[months.length - 1] || "";
        setSelectedMonth(latest);
        setLmsEngagementData(rows.filter((r) => toYyyyMm(getISO(r)) === latest));
      } else {
        console.error("fetchLMSEngagement(all) error:", res.error);
        setAvailableMonths([]);
        setSelectedMonth("");
        setLmsEngagementData([]);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    const loadMonth = async () => {
      if (!selectedMonth) return;
      const res = await fetchLMSEngagement({ month: selectedMonth });
      if (res.success) {
        setLmsEngagementData(normalizeRows(res.data));
      } else {
        console.error("fetchLMSEngagement(month) error:", res.error);
        setLmsEngagementData([]);
      }
    };
    loadMonth();
  }, [selectedMonth]);

  // Recent activities
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const result = await fetchRecentActivity();
        if (result.success) {
          setRecentActivityData(result.data.recent_activity);
        } else {
          console.error("fetchRecentActivity error:", result.error);
        }
      } catch (e) {
        console.error("fetchRecentActivity failed:", e);
      }
    };
    loadRecent();
  }, []);

  const handleActiveLearnersClick = () => setShowActiveLearnersPage(true);
  const handleBackToDashboard = () => setShowActiveLearnersPage(false);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        alert("Logged out successfully!");
        window.location.href = "/login";
      } else {
        alert(result.error);
      }
    } catch {
      alert("An error occurred while logging out.");
    }
  };

  // Build chart series for selectedMonth
  const buildEngagementSeries = (rows = [], month = "") => {
    if (!Array.isArray(rows) || !month) return { labels: [], data: [] };
    const byDay = rows.reduce((acc, r) => {
      const day = toYyyyMmDd(getISO(r));
      if (!day || !day.startsWith(month)) return acc;
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(byDay).sort();
    const data = labels.map((d) => byDay[d]);
    return { labels, data };
  };

  const { labels, data } = buildEngagementSeries(lmsEngagementData, selectedMonth);

  const lineChartData = {
    labels,
    datasets: [
      {
        label: `Engagement Count (${selectedMonth || "—"})`,
        data,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      x: { title: { display: true, text: "Date" } },
      y: { title: { display: true, text: "Count" }, beginAtZero: true, precision: 0 },
    },
  };

  const processRecentLoginsData = (loginsData) => {
    const byDate = (loginsData || []).reduce((acc, login) => {
      const date = login.login_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(byDate).sort().slice(-5);
    return { labels, data: labels.map((d) => byDate[d]) };
  };

  const processRecentHomeworkData = (homeworkData) => {
    const byDate = (homeworkData || []).reduce((acc, hw) => {
      const date = hw.last_updated.split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(byDate).sort().slice(-5);
    return { labels, data: labels.map((d) => byDate[d]) };
  };

  const recentLoginsChartData = processRecentLoginsData(recentActivityData?.recent_logins);
  const recentHomeworkChartData = processRecentHomeworkData(
    recentActivityData?.recent_homework_submissions
  );

  const recentLoginsChartConfig = {
    labels: recentLoginsChartData.labels,
    datasets: [
      {
        label: "Recent Logins",
        data: recentLoginsChartData.data,
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        fill: true,
      },
    ],
  };

  const recentHomeworkChartConfig = {
    labels: recentHomeworkChartData.labels,
    datasets: [
      {
        label: "Recent Homework Submissions",
        data: recentHomeworkChartData.data,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
    ],
  };

  const notices = [
    { id: 1, message: "Upcoming training session on August 30, 2025.", date: "2025-08-27" },
    { id: 2, message: "Deadline for homework submission extended to September 5, 2025.", date: "2025-08-27" },
    { id: 3, message: "New course materials uploaded for review.", date: "2025-08-26" },
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    let initials = names[0][0].toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1][0].toUpperCase();
    }
    return initials;
  };

  // Image error fallback: try next candidate
  const handleImgError = () => {
    if (profilePicIndex + 1 < profilePicCandidates.length) {
      setProfilePicIndex(profilePicIndex + 1);
    } else {
      // Exhausted all candidates -> show initials
      if (profilePic) {
        // prevent infinite loop
        setProfilePicIndex(profilePicCandidates.length); 
      }
    }
  };

  return (
    <div className="teacher-dashboard-content1">
      <div className="top-bar1">
        <div className="top-bar-left1">
          {[
            { number: activeLearnerCount, text: "Active Learners", className: "purple", onClick: () => setShowActiveLearnersPage(true) },
            { number: courseCount, text: "Courses", className: "pink", onClick: () => setShowModal(true) },
            { number: traineeCount, text: "Total Trainees", className: "cyan" },
          ].map((item, index) => (
            <div
              key={index}
              className={`top-bar-card1 ${item.className}`}
              onClick={item.onClick}
              style={{ cursor: item.onClick ? "pointer" : "default" }}
            >
              <div className="number1">{item.number}</div>
              <div className="text1">{item.text}</div>
            </div>
          ))}
        </div>

        <div className="top-bar-middle1">
          <img
            src={logoSO}
            alt="Trainer Logo"
            style={{ height: "60px", width: "auto", objectFit: "contain", borderRadius: "8px" }}
          />
        </div>

        <div className="top-bar-right1">
          <div className="profile-pic-frame">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                onError={handleImgError}
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "#aeadae",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#fff",
                }}
              >
                {getInitials(teacherName)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Learners Modal */}
      <Modal show={showActiveLearnersModal} onHide={() => setShowActiveLearnersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Active Learners</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeLearners.length > 0 ? (
            <ul>
              {activeLearners.map((learner) => (
                <li key={learner.id}>
                  {learner.full_name} ({learner.username}, {learner.profile_type}, {learner.department})
                </li>
              ))}
            </ul>
          ) : (
            <p>No active learners found.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActiveLearnersModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Course Modal */}
      <CourseModal show={showModal} handleClose={() => setShowModal(false)} courses={courses} />

      {/* Main cards / chart */}
      {showActiveLearnersPage ? (
        <div className="active-learners-page">
          <div className="active-learners-header">
            <h3>Active Learners</h3>
            <Button variant="secondary" onClick={handleBackToDashboard} style={{ marginBottom: 20 }}>
              Back
            </Button>
          </div>
          {activeLearners.length > 0 ? (
            <table className="macro-planner-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Profile Type</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {activeLearners.map((learner) => (
                  <tr key={learner.id}>
                    <td>{learner.username}</td>
                    <td>{learner.full_name}</td>
                    <td>{learner.email}</td>
                    <td>{learner.profile_type}</td>
                    <td>{learner.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No active learners found.</p>
          )}
        </div>
      ) : (
        <div className="cards-container1">
          <div className="left-column1">
            <div className="content-card1 overview-card1">
              <h3>Overview</h3>
              <div className="overview-row1">
                {[
                  { number: courseCount, text: "Courses", className: "pink", onClick: () => setShowModal(true) },
                  { number: activeLearnerCount, text: "Active Learners", className: "purple", onClick: () => setShowActiveLearnersPage(true) },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`overview-card-item1 ${item.className}`}
                    onClick={item.onClick}
                    style={{ cursor: item.onClick ? "pointer" : "default" }}
                  >
                    <div className="number1">{item.number}</div>
                    <div className="text1">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="content-card1 recent-activities-card1">
              <h3>Recent Activities</h3>
              <div className="recent-activities-content1">
                <div className="recent-activities-scroll1">
                  <h4>Logins</h4>
                  <ul>
                    {(recentActivityData?.recent_logins || []).map((l, i) => (
                      <li key={i}>{l.login_username}</li>
                    ))}
                  </ul>

                  <h4>Homework Submissions</h4>
                  <ul>
                    {(recentActivityData?.recent_homework_submissions || []).map((h, i) => (
                      <li key={i}>{h.quiz__quiz_name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="content-card1 notice-board-card1">
              <h3>Notice Board</h3>
              <div className="notice-board-content1">
                <div className="notice-board-scroll1">
                  {notices.length > 0 ? (
                    <ul>
                      {notices.map((notice) => (
                        <li key={notice.id}>
                          {notice.message} <span className="notice-date">({notice.date})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No notices available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="right-column1">
            <div className="quick-activities1">
              <div className="quick-activities-circle1">
                <span>Quick Activities</span>
              </div>
              <div className="quick-activities-grid1">
                {[
                  { text: "Add Courses", className: "pink", link: "#", disabled: false },
                  { text: "Push Notification", className: "purple", link: "#", disabled: false },
                  { text: "Add Lesson", className: "purple", link: "#", disabled: false },
                  { text: "Add User", className: "pink", link: "#", disabled: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`quick-activity-card1 ${item.className} ${item.disabled ? "disabled" : ""}`}
                    onClick={() => {
                      if (!item.disabled) item.onClick ? item.onClick() : (window.location.href = item.link);
                    }}
                    style={{ cursor: item.disabled ? "not-allowed" : "pointer", opacity: item.disabled ? 0.5 : 1 }}
                  >
                    <div className="text1">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="content-card1 lms-engagement-card1">
              <div className="lms-engagement-header1">
                <h3>LMS Engagement</h3>
                <Dropdown>
                  <Dropdown.Toggle className="grey" id="dropdown-basic">
                    {selectedMonth || "Select month"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {availableMonths.length ? (
                      availableMonths.map((m) => (
                        <Dropdown.Item key={m} onClick={() => setSelectedMonth(m)}>
                          {m}
                        </Dropdown.Item>
                      ))
                    ) : (
                      <Dropdown.Item disabled>No data</Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="chart-container1">
                <div style={{ height: 260 }}>
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardContent;
