import React, { useState, useEffect } from "react";
import { Dropdown, Button, Modal, Form, Alert } from "react-bootstrap";
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
  sendTrainerNotification,
  apiClient,
} from "../../api/trainerAPIservice";
import { logout } from "../../api/apiservice";
import logoSO from "../../assets/logo1.png";
import "../../index.css";
import { mediaUrl } from "../../api/traineeAPIservice";

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
  const [profilePic, setProfilePic] = useState(""); // final resolved URL via mediaUrl

  const [recentActivityData, setRecentActivityData] = useState({
    recent_logins: [],
    recent_homework_submissions: [],
    recent_uploads: [],
  });

  const [activeLearners, setActiveLearners] = useState([]);
  const [showActiveLearnersModal, setShowActiveLearnersModal] = useState(false);
  const [showActiveLearnersPage, setShowActiveLearnersPage] = useState(false);

  const username = localStorage.getItem("username") || "";

  // ---- Send modal state ----
  const initialForm = {
    subject: "",
    message: "",
    link: "",
    notification_type: "info",
    mode: "group",
    audience: "both", // employee+trainee
    department: "",
    usernames: "",
  };

  const [showSendModal, setShowSendModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [responseMsg, setResponseMsg] = useState(null);
  const [sending, setSending] = useState(false);

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

          setTeacherName(
            data.profile?.profile?.name ||
              data.profile?.name ||
              data.profile?.profile?.full_name ||
              ""
          );
          setCourses(data.courses || []);

          // Resolve trainer profile picture -> mediaUrl
          const rawPic =
            data.profile?.profile?.profile_picture ||
            data.profile?.profile_picture ||
            data.profile_picture ||
            "";
          setProfilePic(mediaUrl(rawPic) || "");

          // Active users
          setActiveLearners(
            (data.active_users || []).map((user) => ({
              id: user.id,
              username: user.username,
              full_name: user.full_name || user.profile?.name || "",
              email: user.email,
              profile_type: user.profile_type || user.profile?.profile_type || "Unknown",
              department: user.department || user.profile?.department || "",
            }))
          );
        } else {
          console.error("fetchTrainerDashboard error:", result.error);
        }
      } catch (e) {
        console.error("fetchTrainerDashboard failed:", e);
      }
    };
    if (username) loadDashboard();
  }, [username]);

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

  // ---------- Send handlers ----------
  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const closeAndReset = () => {
    setShowSendModal(false);
    setFormData(initialForm);
    setResponseMsg(null);
  };

  const buildPayload = () => {
    const payload = {
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      link: formData.link.trim() || undefined,
      notification_type: formData.notification_type,
      mode: formData.mode,
    };

    if (formData.mode === "group") {
      payload.audience = formData.audience; // trainee | employee | trainer | both | all
      // department only if employees are in scope
      const includesEmployees = ["employee", "both", "all"].includes(formData.audience);
      if (includesEmployees) {
        payload.department = formData.department.trim() || undefined;
      }
    } else {
      // individual mode
      payload.usernames = (formData.usernames || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
    }
    return payload;
  };

  const validate = () => {
    if (!formData.subject.trim()) return "Subject is required.";
    if (!formData.message.trim()) return "Message is required.";
    if (formData.mode === "individual") {
      const list = (formData.usernames || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
      if (!list.length) return "Provide at least one username for Individual mode.";
    }
    return null;
  };

  const firstError = (errObj) => {
    if (!errObj || typeof errObj === "string") return errObj;
    const parts = [];
    Object.entries(errObj).forEach(([k, v]) => {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
    });
    return parts.join(" • ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMsg(null);
    const v = validate();
    if (v) {
      setResponseMsg({ type: "danger", text: v });
      return;
    }
    setSending(true);
    try {
      const { success, data, error } = await sendTrainerNotification(buildPayload());
      if (success) {
        setResponseMsg({ type: "success", text: data?.message || "Notification sent." });
        setFormData(initialForm);
      } else {
        setResponseMsg({
          type: "danger",
          text: firstError(error) || "Failed to send notification.",
        });
      }
    } finally {
      setSending(false);
    }
  };

  // department field enabled only if group mode and audience includes employees
  const deptDisabled =
    formData.mode !== "group" || !["employee", "both", "all"].includes(formData.audience);

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
    if (names.length > 1) initials += names[names.length - 1][0].toUpperCase();
    return initials;
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
                  {learner.name} ({learner.username}, {learner.profile_type}, {learner.department})
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
            <div className="quick-activities-grid1 three-col">
              <div
                className="quick-activity-card1 purple"
                onClick={() => setShowSendModal(true)}
              >
                <div className="text1">Push Notification</div>
              </div>

              {/* Circle in the middle column */}
              <div className="quick-activities-circle1">
                <span>Quick<br />Activities</span>
              </div>

              <div
                className="quick-activity-card1 purple"
                onClick={() => (window.location.href = "#")}
              >
                <div className="text1">Add Lesson</div>
              </div>
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
                <div className="chart-inner1">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      <Modal show={showSendModal} onHide={closeAndReset} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Trainer Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {responseMsg && <Alert variant={responseMsg.type}>{responseMsg.text}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="e.g., Assessment Window"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Write the notification message…"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Link (optional)</Form.Label>
              <Form.Control
                type="url"
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="https://…"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Notification Type</Form.Label>
                  <Form.Select
                    name="notification_type"
                    value={formData.notification_type}
                    onChange={handleChange}
                  >
                    <option value="info">Info</option>
                    <option value="module">Module</option>
                    <option value="assessment">Assessment</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Mode</Form.Label>
                  <Form.Select name="mode" value={formData.mode} onChange={handleChange}>
                    <option value="group">Group</option>
                    <option value="individual">Individual</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Audience</Form.Label>
                  <Form.Select
                    name="audience"
                    value={formData.audience}
                    onChange={handleChange}
                    disabled={formData.mode !== "group"}
                  >
                    <option value="trainee">Trainee</option>
                    <option value="employee">Employee</option>
                    <option value="trainer">Trainer</option>
                    <option value="both">Both (Emp+Trainee)</option>
                    <option value="all">All (Emp+Trainee+Trainer)</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {formData.mode === "group" && (
              <Form.Group className="mb-3">
                <Form.Label>Department (employees only, optional)</Form.Label>
                <Form.Control
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={deptDisabled}
                  placeholder={
                    deptDisabled
                      ? "Not applicable"
                      : "Leave blank to use trainer's department"
                  }
                />
              </Form.Group>
            )}

            {formData.mode === "individual" && (
              <Form.Group className="mb-3">
                <Form.Label>Usernames (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  name="usernames"
                  value={formData.usernames}
                  onChange={handleChange}
                  placeholder="e.g., emp_riya, shahnawaz_786"
                  required
                />
              </Form.Group>
            )}

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeAndReset}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="ms-2" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TeacherDashboardContent;