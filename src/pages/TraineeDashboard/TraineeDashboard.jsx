import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Card from "../../UIcomponents/dashboard/card";
import {
  fetchTraineeDashboard,
  mediaUrl,
  fetchTraineeNotifications,
  fetchSOP,
  fetchStandardLibrary, // ✅ NEW
} from "../../api/traineeAPIservice";
import { logout } from "../../api/apiservice";
import "../../utils/css/sidebar.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Loader from "../../UIcomponents/dashboard/loader";
import HamButton from "../../Components/Hamburger";
import QuizComponent from "../../UIcomponents/dashboard/QuizComponent";
import QueryChat from "./TraineeChat";
import ProfileCard from "../../UIcomponents/dashboard/Profilecard";
import TraineeLoginActivity from "./TraineeLoginActivity";
import AssessmentReport from "../../UIcomponents/dashboard/AssessmentReport";
import MacroPlanner from "./MacroPlanner";
import MicroPlanner from "./MicroPlanner";
import TraineeNotificationPage from "./TraineeNotification";
import logoSO from "../../assets/logo4.png";
import { Dropdown, Form, Button, Modal } from "react-bootstrap";
import { requestPasswordReset, confirmPasswordReset } from "../../api/apiservice";
import TraineeProgress from "./TraineeProgress";

const TraineeDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // SOPs + Standard Library
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError, setSopsError] = useState("");
  const [library, setLibrary] = useState([]);                 // ✅ NEW
  const [libraryLoading, setLibraryLoading] = useState(false); // ✅ NEW
  const [libraryError, setLibraryError] = useState("");        // ✅ NEW
  const [sopsTab, setSopsTab] = useState(() => localStorage.getItem("sopsTab") || "sops"); // ✅ NEW

  // Password reset modals
  const [showResetRequestModal, setShowResetRequestModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetRequestMessage, setResetRequestMessage] = useState("");
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [uidb64, setUidb64] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetConfirmMessage, setResetConfirmMessage] = useState("");

  const username = localStorage.getItem("username") || "";
  const isAuthenticated = localStorage.getItem("isAuthenticated");

  const [activeContent, setActiveContent] = useState(() => {
    return localStorage.getItem("activeContent") || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("activeContent", activeContent);
  }, [activeContent]);

  // keep sops tab persistent
  useEffect(() => {
    localStorage.setItem("sopsTab", sopsTab);
  }, [sopsTab]);

  // unread badge
  const reloadBadge = useCallback(async () => {
    try {
      const res = await fetchTraineeNotifications({ unread: true });
      if (res.success) setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated !== "true") {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const result = await fetchTraineeDashboard(username);
        if (result.success) {
          setData(result.data);
        } else {
          setError("An error occurred while fetching dashboard data.");
        }
      } catch (error) {
        setError("An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
      reloadBadge();
    }
  }, [username, navigate, isAuthenticated, reloadBadge]);

  // Load SOPs when SOPs tab opens (or stays default)
  useEffect(() => {
    const loadSOPs = async () => {
      setSopsLoading(true);
      setSopsError("");
      const res = await fetchSOP();
      if (res.success) setSops(res.data || []);
      else setSopsError(res.error || "Failed to load SOPs.");
      setSopsLoading(false);
    };
    if (activeContent === "sops" && sopsTab === "sops") loadSOPs();
  }, [activeContent, sopsTab]);

  // Load Standard Library when Library tab opens
  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      const res = await fetchStandardLibrary(); // backend should filter by user role
      if (res.success) setLibrary(res.data || []);
      else setLibraryError(res.error || "Failed to load Standard Library.");
      setLibraryLoading(false);
    };
    if (activeContent === "sops" && sopsTab === "library") loadLibrary();
  }, [activeContent, sopsTab]);

  // Password Reset Handlers
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      navigate("/login");
    } else {
      setError("Logout failed.");
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    try {
      const result = await requestPasswordReset({ email: resetEmail });
      if (result.success) {
        setResetRequestMessage("Password reset email sent successfully. Check your inbox.");
      } else {
        setResetRequestMessage(`Error: ${result.error || "Failed to send reset email."}`);
      }
    } catch (e) {
      setResetRequestMessage(`Error: ${e.message || "Failed to send reset email."}`);
    }
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetConfirmMessage("Passwords do not match.");
      return;
    }
    try {
      const result = await confirmPasswordReset({ uidb64, token, new_password: newPassword });
      if (result.success) {
        setResetConfirmMessage("Password reset successfully. You can now log in.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        setResetConfirmMessage(`Error: ${result.error || "Failed to reset password."}`);
      }
    } catch (e) {
      setResetConfirmMessage(`Error: ${e.message || "Failed to reset password."}`);
    }
  };
  

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("uidb64");
    const tok = urlParams.get("token");
    if (uid && tok) {
      setUidb64(uid);
      setToken(tok);
      setShowResetConfirmModal(true);
    }
  }, []);

  // ---- renderers -------------------------------------------------

  const renderSOPItem = (sop) => (
    <div
      key={sop.id}
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
        padding: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 700 }}>{sop.title}</div>
      {sop.note && <div style={{ opacity: 0.8, fontSize: 14 }}>{sop.note}</div>}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {sop.department ? <>Dept: {sop.department} · </> : null}
        {sop.target_role ? <>Role: {sop.target_role}</> : null}
        {sop.created_at ? <> · {new Date(sop.created_at).toLocaleString()}</> : null}
      </div>
      {sop.file && (
        <div style={{ marginTop: 6 }}>
          <a
            href={mediaUrl ? mediaUrl(sop.file) : sop.file}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-primary"
          >
            View PDF
          </a>
        </div>
      )}
    </div>
  );

  const renderLibraryItem = (item) => (
    <div
      key={item.id}
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
        padding: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 700 }}>{item.title}</div>
      {item.note && <div style={{ opacity: 0.8, fontSize: 14 }}>{item.note}</div>}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {item.department ? <>Dept: {item.department} · </> : null}
        {item.target_role ? <>Role: {item.target_role}</> : null}
        {Array.isArray(item.tags) && item.tags.length ? (
          <> · Tags: {item.tags.join(", ")}</>
        ) : null}
        {item.created_at ? <> · {new Date(item.created_at).toLocaleString()}</> : null}
      </div>
      {item.file && (
        <div style={{ marginTop: 6 }}>
          <a
            href={mediaUrl ? mediaUrl(item.file) : item.file}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-primary"
          >
            View File
          </a>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeContent) {
      case "dashboard":
        return (
          <div className="maindash">
            <ProfileCard
              name={data?.profile?.name}
              department={data?.profile?.department}
              loginCount={data?.login_count}
            />
          </div>
        );
      case "subjects":
        return (
          <div className="subject-cards-container">
            {data?.subjects?.length > 0 ? (
              data.subjects.map((subject) => (
                <div key={subject.id} className="subject-card">
                  <Link
                    to={`/learning/${subject.slug}`}
                    onClick={(e) => {
                      if (!subject.slug) {
                        e.preventDefault();
                        setError("Subject slug is missing.");
                      }
                    }}
                  >
                    <Card title={subject.name} image={mediaUrl(subject.image)} />
                  </Link>
                </div>
              ))
            ) : (
              "No subjects available."
            )}
          </div>
        );
      case "quizzes":
        return <QuizComponent setActiveContent={setActiveContent} />;
      case "assessment":
        return <AssessmentReport />;
      case "macroplanner":
        return <MacroPlanner />;
      case "microplanner":
        return <MicroPlanner />;
      case "events":
        return <div>Upcoming Events Will be here...</div>;
      case "queries":
        return <QueryChat />;
      case "loginActivity":
        return <TraineeLoginActivity />;
      case "notifications":
        return <TraineeNotificationPage onRefreshBadge={reloadBadge} />;
      case "progress":
        return <TraineeProgress />;

      // Combined SOPs + Standard Library view with tabs
      case "sops": {
        return (
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="segmented" role="tablist" aria-label="SOPs and Library">
                <button
                  type="button"
                  className={`seg-btn ${sopsTab === "sops" ? "active" : ""}`}
                  role="tab"
                  aria-selected={sopsTab === "sops"}
                  onClick={() => {
                    setSopsTab("sops");
                    localStorage.setItem("sopsTab", "sops");
                  }}
                >
                  SOPs
                </button>

                <button
                  type="button"
                  className={`seg-btn ${sopsTab === "library" ? "active" : ""}`}
                  role="tab"
                  aria-selected={sopsTab === "library"}
                  onClick={() => {
                    setSopsTab("library");
                    localStorage.setItem("sopsTab", "library");
                  }}
                >
                  Standard Library
                </button>
              </div>
            </div>

            {sopsTab === "sops" ? (
              sopsLoading ? (
                <Loader />
              ) : sopsError ? (
                <div style={{ padding: 16, color: "crimson" }}>{sopsError}</div>
              ) : !sops?.length ? (
                <div style={{ padding: 16 }}>No SOPs assigned to you yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>{sops.map(renderSOPItem)}</div>
              )
            ) : libraryLoading ? (
              <Loader />
            ) : libraryError ? (
              <div style={{ padding: 16, color: "crimson" }}>{libraryError}</div>
            ) : !library?.length ? (
              <div style={{ padding: 16 }}>No items available in the Standard Library for your role.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>{library.map(renderLibraryItem)}</div>
            )}
          </div>
        );
      }

      default:
        return <div>Select an option</div>;
    }
  };

  if (loading) return <Loader />;
  if (error) return <div>{error}</div>;

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarVisible && (
        <div
          onClick={() => setSidebarVisible(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "100vw",
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 998,
          }}
        />
      )}

      <div className="dashboard" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <div
          className="mobile-sidebar-toggle"
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            zIndex: 1101,
            display: "block",
          }}
        >
          <HamButton onClick={() => setIsSidebarOpen((prev) => !prev)} />
        </div>

        {/* SIDEBAR */}
        <div
          className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isSidebarOpen ? "open" : ""}`}
          style={{
            flex: isCollapsed ? "0 0 60px" : "0 0 250px",
            overflowY: "scroll",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            transition: "flex 0.3s ease",
          }}
        >
          <div className="sidebar-content">
            {!isCollapsed && (
              <div className="sidebar-header">
                <img src={logoSO} alt="Structures Online" className="sidebar-logo" />
              </div>
            )}
            {isCollapsed && (
              <div className="sidebar-header sidebar-header--mini">
                <img src={logoSO} alt="SO" className="sidebar-logo sidebar-logo--mini" />
              </div>
            )}

            {[
              "dashboard",
              "subjects",
              "macroplanner",
              "microplanner",
              "quizzes",
              "assessment",
              "notifications",
              "queries",
              "loginActivity",
              "sops",
              "progress",
            ].map((key) => {
              const labelMap = {
                dashboard: "Dashboard",
                subjects: "Subjects",
                macroplanner: "Road Map",
                microplanner: "Planner",
                quizzes: "Assessments",
                assessment: "Assessment Report",
                notifications: "Notifications",
                queries: "Trainee Queries",
                loginActivity: "Login Activity",
                sops: "SOPs",
                progress: "Progress",
              };
              const iconMap = {
                dashboard: "bi-house",
                subjects: "bi-book",
                macroplanner: "bi-calendar",
                microplanner: "bi-calendar",
                quizzes: "bi-question-circle",
                assessment: "bi-check2-square",
                leaderboard: "bi-trophy",
                projects: "bi-lightbulb",
                notifications: "bi-bell",
                queries: "bi-chat-left-dots",
                loginActivity: "bi-clock-history",
                sops: "bi-file-earmark-text",
                progress: "bi-bar-chart",
              };

              const onClick = () => {
                // If user clicks actual "SOPs" set tab to SOPs view
                if (key === "sops") setSopsTab("sops");
                // If user clicks "Standard Library" we deep-link to SOPs page with Library tab
                if (key === "standardlibrary") {
                  setSopsTab("library");
                  localStorage.setItem("sopsTab", "library");
                  key = "sops"; // show the same combined page
                }
                setActiveContent(key === "standardlibrary" ? "sops" : key);
                localStorage.setItem("activeContent", key === "standardlibrary" ? "sops" : key);
                setSidebarVisible(false);
                setIsSidebarOpen(false);
              };

              return (
                <div
                  key={key}
                  className={`sidebar-item ${
                    (activeContent === key) ||
                    (key === "standardlibrary" && activeContent === "sops" && sopsTab === "library")
                      ? "active"
                      : ""
                  }`}
                  onClick={onClick}
                >
                  <i className={`bi ${iconMap[key]} sidebar-icon`}></i>
                  {!isCollapsed && <span className="sidebar-text">{labelMap[key]}</span>}
                </div>
              );
            })}
          </div>

          <div className="sidebar-bottom-section">
            <div className="sidebar-item" onClick={() => setShowDropdown(!showDropdown)}>
              <i className="bi bi-gear sidebar-icon"></i>
              {!isCollapsed && <span className="sidebar-text">Settings</span>}
              <Dropdown
                show={showDropdown}
                onToggle={() => setShowDropdown(!showDropdown)}
                className="settings-dropdown"
              >
                <Dropdown.Menu align="end" className="bg-gray-800 text-white rounded-lg shadow-lg">
                  <Dropdown.Item as={Link} to="#/profile" className="hover:bg-gray-700 py-2 px-4">
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setShowResetRequestModal(true)}>
                    Reset Password
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div
              className="sidebar-item"
              onClick={handleLogout}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleLogout();
              }}
            >
              <i className="bi bi-box-arrow-right sidebar-icon"></i>
              {!isCollapsed && <span className="sidebar-text">Logout</span>}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div
          className={`content-panel ${activeContent === "curriculum" ? "curriculum-panel" : ""}`}
          style={{
            flex: "1",
            overflowY: "scroll",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            transition: "flex 0.3s ease",
          }}
        >
          {renderContent()}
        </div>

        {/* Password Reset Request Modal */}
        <Modal show={showResetRequestModal} onHide={() => setShowResetRequestModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Request Password Reset</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleResetRequest}>
              <Form.Group controlId="resetEmail">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="mt-3">
                Send Reset Email
              </Button>
            </Form>
            {resetRequestMessage && (
              <p className={resetRequestMessage.includes("Error") ? "text-danger" : "text-success"}>
                {resetRequestMessage}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetRequestModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Password Reset Confirmation Modal */}
        <Modal show={showResetConfirmModal} onHide={() => setShowResetConfirmModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Reset Your Password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleResetConfirm}>
              <Form.Group controlId="newPassword">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </Form.Group>
              <Form.Group controlId="confirmPassword" className="mt-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="mt-3">
                Reset Password
              </Button>
            </Form>
            {resetConfirmMessage && (
              <p className={resetConfirmMessage.includes("Error") ? "text-danger" : "text-success"}>
                {resetConfirmMessage}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetConfirmModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
};

TraineeDashboard.propTypes = {
  data: PropTypes.shape({
    profile: PropTypes.shape({
      grade: PropTypes.string.isRequired,
      name: PropTypes.string,
      profile_pic: PropTypes.string,
      user: PropTypes.shape({
        username: PropTypes.string.isRequired,
      }),
    }),
    subjects: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        image: PropTypes.string,
        description: PropTypes.string,
        slug: PropTypes.string,
      })
    ),
  }),
};

export default TraineeDashboard;
