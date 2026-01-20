import React, { useState, useEffect, Component } from "react";
import { Dropdown, Button, Modal, Form } from "react-bootstrap";
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
  Filler,
} from "chart.js";
import { fetchAdminDashboard, fetchLMSEngagement, fetchRecentActivity } from "../../api/adminAPIservice";
import { logout, changePassword } from "../../api/apiservice";
import logoSO from "../../assets/logo1.png";
import { mediaUrl } from "../../api/traineeAPIservice";
import logoS1 from "../../assets/sol_log1.png";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend,Filler);

// ---- Error Boundary ---------------------------------------------------
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return <div style={{ padding: 20, color: "red" }}>Error: {this.state.error}</div>;
    }
    return this.props.children;
  }
}

// ---- Helpers ---------------------------------------------------
const getISO = (row) => row?.login_datetime || row?.login_date || row?.submission_date || row?.completed_date || row?.created_date || row?.upload_date || "";
const toYyyyMm = (iso) => (iso ? (iso.split("T")[0] || "").slice(0, 7) : "");
const toYyyyMmDd = (iso) => (iso ? (iso.split("T")[0] || iso).slice(0, 10) : "");

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

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

const AdminDashboardContent = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [lmsEngagementData, setLmsEngagementData] = useState([]);
  const [lmsError, setLmsError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [traineeCount, setTraineeCount] = useState(0);
  const [activeLearnerCount, setActiveLearnerCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [teacherName, setTeacherName] = useState("");
  const [recentActivityData, setRecentActivityData] = useState({
    recent_logins: [],
    recent_homework_submissions: [],
    recent_completions: [],
    recent_queries: [],
    recent_uploads: [],
  });
  const [recentActivityError, setRecentActivityError] = useState(null);
  const [activeLearners, setActiveLearners] = useState([]);
  const [showActiveLearnersModal, setShowActiveLearnersModal] = useState(false);
  const [showActiveLearnersPage, setShowActiveLearnersPage] = useState(false);
  const [error, setError] = useState(null);

  // Change Password States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordMessage, setChangePasswordMessage] = useState("");
  const [profilePic, setProfilePic] = useState(""); 

  const username = localStorage.getItem("username") || "";

  // Dashboard header info
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await fetchAdminDashboard(username);
        if (result.success) {
          const data = result.data;
          setTraineeCount(
            data.departments?.reduce((sum, dept) => sum + (dept.trainee_count || 0), 0) || 0
          );
          setActiveLearnerCount(data.active_users_count || 0);
          setCourseCount(data.total_courses || 0);
          setTeacherName(data.profile?.name || "");
          setCourses(
            data.departments?.flatMap((dept) => dept.courses || []) || []
          );

          // Resolve trainer profile picture -> mediaUrl
          const rawPic =
            data.profile?.profile?.profile_picture ||
            data.profile?.profile_picture ||
            data.profile_picture ||
            "";
          setProfilePic(mediaUrl(rawPic) || "");
          setActiveLearners(
            (data.active_users || []).map((user) => ({
              id: user.id,
              username: user.username,
              full_name: user.full_name || "",
              email: user.email || "",
              profile_type: user.profile_type || "Unknown",
              department: user.department || "",
            }))
          );
        } else {
          setError(result.error || "Failed to load admin dashboard data.");
        }
      } catch (e) {
        setError(e.message || "Failed to load admin dashboard data.");
      }
    };
    if (username) loadDashboard();
  }, [username]);

  // LMS Engagement
  useEffect(() => {
    const loadAll = async () => {
      try {
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
          setLmsError(res.error || "Failed to fetch LMS engagement data.");
          setAvailableMonths([]);
          setSelectedMonth("");
          setLmsEngagementData([]);
        }
      } catch (e) {
        setLmsError(e.message || "Failed to fetch LMS engagement data.");
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
      try {
        const res = await fetchLMSEngagement({ month: selectedMonth });
        if (res.success) {
          const rows = normalizeRows(res.data);
          setLmsEngagementData(rows);
        } else {
          setLmsError(res.error || "Failed to fetch LMS engagement data for selected month.");
          setLmsEngagementData([]);
        }
      } catch (e) {
        setLmsError(e.message || "Failed to fetch LMS engagement data for selected month.");
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
          setRecentActivityData(result.data.recent_activity || {
            recent_logins: [],
            recent_homework_submissions: [],
            recent_completions: [],
            recent_queries: [],
            recent_uploads: [],
          });
          setRecentActivityError(null);
        } else {
          setRecentActivityError(result.error || "Failed to fetch recent activity data.");
        }
      } catch (e) {
        setRecentActivityError(e.message || "Failed to fetch recent activity data.");
      }
    };
    loadRecent();
  }, []);

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordMessage("");
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setChangePasswordMessage("All fields are required.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setChangePasswordMessage("New password and confirm password do not match.");
      return;
    }
    
    if (newPassword.length < 8) {
      setChangePasswordMessage("New password must be at least 8 characters long.");
      return;
    }
    
    try {
      const result = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      
      if (result.success) {
        setChangePasswordMessage("Password changed successfully!");
        // Clear form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setChangePasswordMessage("");
        }, 2000);
      } else {
        setChangePasswordMessage(`Error: ${result.error || "Failed to change password."}`);
      }
    } catch (error) {
      setChangePasswordMessage(`Error: ${error.message || "Failed to change password."}`);
    }
  };

  // Handlers
  const handleDropdownToggle = () => setShowDropdown((s) => !s);
  const handleMonthChange = (month) => setSelectedMonth(month);
  const handleActiveLearnersClick = () => {
    setShowActiveLearnersPage(true);
  };
  const handleBackToDashboard = () => setShowActiveLearnersPage(false);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        alert("Logged out successfully!");
        localStorage.clear();
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
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "LMS Engagement by Day",
      },
    },
    scales: {
      x: { title: { display: true, text: "Date" } },
      y: { title: { display: true, text: "Login Count" }, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  // Recent activity charts
  const processRecentLoginsData = (loginsData) => {
    try {
      const byDate = (loginsData || []).reduce((acc, login) => {
        const date = login?.login_date || "";
        if (!date) return acc;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      const labels = Object.keys(byDate).sort().slice(-5);
      return { labels, data: labels.map((d) => byDate[d]) };
    } catch (e) {
      console.error("Error in processRecentLoginsData:", e);
      return { labels: [], data: [] };
    }
  };

  const processRecentHomeworkData = (homeworkData) => {
    try {
      const byDate = (homeworkData || []).reduce((acc, hw) => {
        const date = hw?.submission_date || "";
        if (!date) return acc;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      const labels = Object.keys(byDate).sort().slice(-5);
      return { labels, data: labels.map((d) => byDate[d]) };
    } catch (e) {
      console.error("Error in processRecentHomeworkData:", e);
      return { labels: [], data: [] };
    }
  };

  const recentLoginsChartData = processRecentLoginsData(recentActivityData?.recent_logins);
  const recentHomeworkChartData = processRecentHomeworkData(recentActivityData?.recent_homework_submissions);

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

  // Sample notices data
  const notices = [
    { id: 1, message: "Upcoming training session on August 30, 2025.", date: "2025-08-27" },
    { id: 2, message: "Deadline for homework submission extended to September 5, 2025.", date: "2025-08-27" },
    { id: 3, message: "New course materials uploaded for review.", date: "2025-08-26" },
  ];

    const getInitials = (name) => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    let initials = names[0][0].toUpperCase();
    if (names.length > 1) initials += names[names.length - 1][0].toUpperCase();
    return initials;
  };

  return (
    <ErrorBoundary>
      <div className="teacher-dashboard-content1">
        {error && <div style={{ padding: 20, color: "red" }}>Error: {error}</div>}
        <div className="top-bar1">
          <div className="top-bar-left1">
            {[
              { number: activeLearnerCount, text: "Active Learners", className: "purple", onClick: handleActiveLearnersClick },
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
              src={logoS1}
              alt="Trainer Logo"
              style={{
                height: "80px",
                width: "auto",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>

          <div className="top-bar-right1">
            <div className="greeting" style={{ marginRight: "15px", display: "flex", alignItems: "center" }}>
              <span style={{ color: "#333", fontSize: "16px", fontWeight: "500" }}>Hi, {teacherName}</span>
            </div>
          <div className="profile-pic-frame">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                onError={() => setProfilePic("")} // if 404, show initials
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

          {/* <div className="top-bar-right1">
            <Dropdown show={showDropdown} onToggle={handleDropdownToggle}>
              <Dropdown.Toggle className="cyan" id="dropdown-basic">
                <i className="bi bi-gear"></i>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item href="#/profile">Profile</Dropdown.Item>
                <Dropdown.Item onClick={() => setShowChangePasswordModal(true)}>Change Password</Dropdown.Item>
                <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div> */}
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
        <CourseModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          courses={courses}
        />

        {/* Change Password Modal */}
        <Modal 
          show={showChangePasswordModal} 
          onHide={() => {
            setShowChangePasswordModal(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setChangePasswordMessage("");
          }}
          centered
          size="md"
          className="change-password-modal"
          style={{ zIndex: 1050 }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Change Password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleChangePassword}>
              <Form.Group controlId="oldPassword">
                <Form.Label>Current Password</Form.Label>
                <Form.Control
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
              </Form.Group>
              <Form.Group controlId="newPassword" className="mt-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
              </Form.Group>
              <Form.Group controlId="confirmPassword" className="mt-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
              </Form.Group>
              {changePasswordMessage && (
                <div className={`mt-3 ${changePasswordMessage.includes("Error") ? "text-danger" : "text-success"}`}>
                  {changePasswordMessage}
                </div>
              )}
              <Button variant="primary" type="submit" className="mt-3">
                Change Password
              </Button>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowChangePasswordModal(false);
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setChangePasswordMessage("");
            }}>Close</Button>
          </Modal.Footer>
        </Modal>

        {/* Main cards / chart */}
        {showActiveLearnersPage ? (
          <div className="active-learners-page">
            <div className="active-learners-header">
              <h3>Active Learners</h3>
              <Button variant="secondary" onClick={handleBackToDashboard} style={{ marginBottom: "20px" }}>
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
                    { number: activeLearnerCount, text: "Active Learners", className: "purple", onClick: handleActiveLearnersClick },
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
                {recentActivityError ? (
                  <div style={{ padding: 20, color: "red" }}>Error: {recentActivityError}</div>
                ) : (
                  <div className="recent-activities-content1">
                    <div className="recent-activities-scroll1">
                      <h4>Logins</h4>
                      <ul>
                        {recentActivityData?.recent_logins?.length ? (
                          recentActivityData.recent_logins.map((l, i) => (
                            <li key={i}>{l.login_username} (Date: {l.login_date || "N/A"})</li>
                          ))
                        ) : (
                          <li>No recent logins</li>
                        )}
                      </ul>

                      <h4>Assessment Submissions</h4>
                      <ul>
                        {recentActivityData?.recent_homework_submissions?.length ? (
                          recentActivityData.recent_homework_submissions.map((h, i) => (
                            <li key={i}>
                              {h.username || "Unknown"}: {h.quiz_name || "N/A"} (Date: {h.submission_date || "N/A"})
                            </li>
                          ))
                        ) : (
                          <li>No recent submissions</li>
                        )}
                      </ul>

                      <h4>Lesson Completions</h4>
                      <ul>
                        {recentActivityData?.recent_completions?.length ? (
                          recentActivityData.recent_completions.map((c, i) => (
                            <li key={i}>
                              {c.username || "Unknown"} completed {c.lesson_name || "N/A"} (Date: {c.completed_date || "N/A"})
                            </li>
                          ))
                        ) : (
                          <li>No recent completions</li>
                        )}
                      </ul>

                      <h4>Queries Raised</h4>
                      <ul>
                        {recentActivityData?.recent_queries?.length ? (
                          recentActivityData.recent_queries.map((q, i) => (
                            <li key={i}>
                              {q.username || "Unknown"}: {q.question ? q.question.slice(0, 30) + "..." : "N/A"} (Date: {q.created_date || "N/A"})
                            </li>
                          ))
                        ) : (
                          <li>No recent queries</li>
                        )}
                      </ul>

                      <h4>Lesson Plan/PPT Uploads</h4>
                      <ul>
                        {recentActivityData?.recent_uploads?.length ? (
                          recentActivityData.recent_uploads.map((u, i) => (
                            <li key={i}>{u.lesson_name || "N/A"} (Date: {u.upload_date || "N/A"})</li>
                          ))
                        ) : (
                          <li>No recent uploads</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
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
              {/* --- Quick Activities (Redesigned) --- */}
              <div className="qa-card">
                <div className="qa-header">
                  <h3>Quick Activities</h3>
                </div>

                <div className="qa-grid">
                  {[
                    { text: "Add Courses",       icon: "bi-journal-plus",  className: "pink",   link: "https://lms.steel.study/admin/" },
                    { text: "Push Notification", icon: "bi-megaphone",     className: "purple", link: "#", onClick: () => alert("Open notification modal") },
                    { text: "Add Lesson",        icon: "bi-file-earmark-plus", className: "purple", link: "https://lms.steel.study/admin/" },
                    { text: "Add User",          icon: "bi-person-plus",   className: "pink",   link: "https://lms.steel.study/admin/" },
                    { text: "Add Quiz",          icon: "bi-patch-question",className: "cyan",   link: "https://lms.steel.study/admin/" },
                  ].map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`qa-btn ${item.className}`}
                      onClick={() => (item.onClick ? item.onClick() : (window.location.href = item.link))}
                      aria-label={item.text}
                      title={item.text}
                    >
                      <i className={`bi ${item.icon}`} />
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="content-card1 lms-engagement-card1">
                <div className="lms-engagement-header1">
                  <h3>LMS Engagement</h3>
                  <Dropdown>
                    <Dropdown.Toggle className="cyan" id="dropdown-basic">
                      {selectedMonth || "Select month"}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {availableMonths.length ? (
                        availableMonths.map((m) => (
                          <Dropdown.Item key={m} onClick={() => handleMonthChange(m)}>
                            {m}
                          </Dropdown.Item>
                        ))
                      ) : (
                        <Dropdown.Item disabled>No data</Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                {lmsError ? (
                  <div style={{ padding: 20, color: "red" }}>Error: {lmsError}</div>
                ) : lmsEngagementData.length === 0 ? (
                  <div style={{ padding: 20 }}>No engagement data available for {selectedMonth || "this period"}.</div>
                ) : (
                  <div className="chart-container1">
                    <div className="chart-inner1">
                      <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboardContent;