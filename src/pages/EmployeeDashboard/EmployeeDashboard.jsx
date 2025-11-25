import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Card from "../../UIcomponents/dashboard/card";
import {
  fetchEmployeeDashboard,
  mediaUrl,
  fetchEmployeeNotifications,
  fetchSOP,
  fetchStandardLibrary,
} from "../../api/employeeAPIservice";
import { logout, requestPasswordReset, confirmPasswordReset } from "../../api/apiservice";
import "../../utils/css/sidebar.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Loader from "../../UIcomponents/dashboard/loader";
import HamButton from "../../Components/Hamburger";
import QuizComponent from "./QuizComponent";
import QueryChat from "./EmployeeChat";
import ProfileCard from "./Profilecard";
import EmployeeLoginActivity from "./EmployeeLoginActivity";
import AssessmentReport from "./AssessmentReport";
import MacroPlanner from "./MacroPlanner";
import MicroPlanner from "./MicroPlanner";
import EmployeeNotificationsPage from "./EmployeeNotification";
import { Dropdown, Form, Button, Modal } from "react-bootstrap";
import EmployeeProgress from "./EmployeeProgress";
import logoS1 from "../../assets/sol_logo.png";

/* ---------------- MENU, in parity with other dashboards ---------------- */
const MENU = [
  { label: "Dashboard", key: "dashboard", icon: "bi-house" },
  { label: "Subjects", key: "subjects", icon: "bi-book" },
  { label: "Road Map", key: "macroplanner", icon: "bi-calendar" },
  { label: "Planner", key: "microplanner", icon: "bi-calendar-check" },
  { label: "Assessments", key: "quizzes", icon: "bi-question-circle" },
  { label: "Assessment Report", key: "assessment", icon: "bi-graph-up" },
  { label: "Notifications", key: "notifications", icon: "bi-bell" },
  { label: "Queries", key: "queries", icon: "bi-chat-left-text" },
  { label: "Login Activity", key: "loginActivity", icon: "bi-clock-history" },
  { label: "SOP", key: "sops", icon: "bi-file-earmark-text" },
  { label: "Progress", key: "progress", icon: "bi-bar-chart-line" },
];

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  // ---------- core state ----------
  const [data, setData] = useState(null);
  const [activeContent, setActiveContent] = useState(
    () => localStorage.getItem("activeContent") || "dashboard"
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // sidebar layout (aligned with Trainer/Trainee)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile
  const [showDropdown, setShowDropdown] = useState(false);

  // unread badge
  const [unreadCount, setUnreadCount] = useState(0);

  // SOP + Library
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError, setSopsError] = useState("");
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [sopsTab, setSopsTab] = useState(() => localStorage.getItem("sopsTab") || "sops");

  // Password reset
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
  const name = data?.profile?.name || (username || "Employee");
  const initial = useMemo(() => (username ? username[0].toUpperCase() : "E"), [username]);

  // Mobile detection (reactive)
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Force no collapse in mobile (overlay mode)
  useEffect(() => {
    if (isMobile) setIsCollapsed(false);
  }, [isMobile]);

  // persist active tab + sopsTab
  useEffect(() => {
    localStorage.setItem("activeContent", activeContent);
  }, [activeContent]);
  useEffect(() => {
    localStorage.setItem("sopsTab", sopsTab);
  }, [sopsTab]);

  // lock body scroll when mobile sidebar open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isSidebarOpen) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
    }
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // ESC to close mobile sidebar
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setIsSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // unread badge loader
  const reloadBadge = useCallback(async () => {
    try {
      const res = await fetchEmployeeNotifications({ unread: true });
      if (res.success) setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch { /* silent */ }
  }, []);

  // auth + profile load
  useEffect(() => {
    if (isAuthenticated !== "true") {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const result = await fetchEmployeeDashboard(username);
        if (result.success) setData(result.data);
        else setError("An error occurred while fetching dashboard data.");
      } catch {
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

  // SOPs
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

  // Library
  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      const res = await fetchStandardLibrary(); // backend filters by role
      if (res.success) setLibrary(res.data || []);
      else setLibraryError(res.error || "Failed to load Standard Library.");
      setLibraryLoading(false);
    };
    if (activeContent === "sops" && sopsTab === "library") loadLibrary();
  }, [activeContent, sopsTab]);

  // read uid/token from query for password reset
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

  // handlers
  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      localStorage.setItem("activeContent", "dashboard");
      navigate("/login");
    } else setError("Logout failed.");
  }, [navigate]);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    try {
      const result = await requestPasswordReset({ email: resetEmail });
      if (result.success) setResetRequestMessage("Password reset email sent successfully. Check your inbox.");
      else setResetRequestMessage(`Error: ${result.error || "Failed to send reset email."}`);
    } catch (e2) {
      setResetRequestMessage(`Error: ${e2.message || "Failed to send reset email."}`);
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
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      } else setResetConfirmMessage(`Error: ${result.error || "Failed to reset password."}`);
    } catch (e2) {
      setResetConfirmMessage(`Error: ${e2.message || "Failed to reset password."}`);
    }
  };

  // ---- renderers -------------------------------------------------
  const renderSOPItem = (sop) => (
    <div key={sop.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", padding: 16, display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{sop.title}</div>
      {sop.note && <div style={{ opacity: 0.8, fontSize: 14 }}>{sop.note}</div>}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {sop.department ? <>Dept: {sop.department} · </> : null}
        {sop.target_role ? <>Role: {sop.target_role}</> : null}
        {sop.created_at ? <> · {new Date(sop.created_at).toLocaleString()}</> : null}
      </div>
      {sop.file && (
        <div style={{ marginTop: 6 }}>
          <a href={mediaUrl ? mediaUrl(sop.file) : sop.file} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
            View PDF
          </a>
        </div>
      )}
    </div>
  );

  const renderLibraryItem = (item) => (
    <div key={item.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", padding: 16, display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{item.title}</div>
      {item.note && <div style={{ opacity: 0.8, fontSize: 14 }}>{item.note}</div>}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {item.department ? <>Dept: {item.department} · </> : null}
        {item.target_role ? <>Role: {item.target_role}</> : null}
        {Array.isArray(item.tags) && item.tags.length ? <> · Tags: {item.tags.join(", ")}</> : null}
        {item.created_at ? <> · {new Date(item.created_at).toLocaleString()}</> : null}
      </div>
      {item.file && (
        <div style={{ marginTop: 6 }}>
          <a href={mediaUrl ? mediaUrl(item.file) : item.file} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
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
      case "queries":
        return <QueryChat />;
      case "loginActivity":
        return <EmployeeLoginActivity />;
      case "notifications":
        return <EmployeeNotificationsPage onRefreshBadge={reloadBadge} />;
      case "sops": {
        return (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div className="segmented" role="tablist" aria-label="SOPs and Library">
                <button
                  type="button"
                  className={`seg-btn ${sopsTab === "sops" ? "active" : ""}`}
                  role="tab"
                  aria-selected={sopsTab === "sops"}
                  onClick={() => { setSopsTab("sops"); localStorage.setItem("sopsTab", "sops"); }}
                >
                  SOPs
                </button>
                <button
                  type="button"
                  className={`seg-btn ${sopsTab === "library" ? "active" : ""}`}
                  role="tab"
                  aria-selected={sopsTab === "library"}
                  onClick={() => { setSopsTab("library"); localStorage.setItem("sopsTab", "library"); }}
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
      case "progress":
        return <EmployeeProgress />;
      default:
        return <div style={{ padding: 20 }}>Select an option</div>;
    }
  };

  // ----- Layout parity with Trainer/Trainee -----
  const sidebarWidth = isCollapsed ? 60 : 280;
  // Updated: Mobile uses transform transition; desktop uses width
  const sidebarTransition = isMobile ? "transform 0.25s ease" : "width 0.4s ease-in-out";

  if (loading) return <Loader />;
  if (error) return <div style={{ padding: 20 }}>{error}</div>;

  return (
    <div className="dashboard">
      {/* Mobile hamburger */}
      <div className="mobile-sidebar-toggle" aria-hidden={isSidebarOpen}>
        <HamButton onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar" />
      </div>

      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop ${isSidebarOpen ? "show" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        role="button"
        aria-label="Close sidebar backdrop"
        tabIndex={-1}
      />

      {/* Updated: Sidebar styles for consistent width/animation */}
      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isSidebarOpen ? "open" : ""}`}
        aria-label="Main navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: sidebarWidth,  // Always full width; slide handles visibility
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 2000,
          transition: sidebarTransition,  // Mobile: transform; Desktop: width
          overflow: "hidden",
          paddingTop: 50,  // Consistent with CSS
          margin: 10,
          backgroundColor: "#393939",  // Inline for reliability
        }}
      >
        {/* Brand */}
        <div
          className="sidebar-header brand"
          title={name ? `Logged in as ${name}` : ""}
          style={{ background: "transparent", border: "none", padding: "0px 0 0 0", marginTop: 0, flexShrink: 0 }}
        >
          <div className="profile-chip" style={{ margin: 0, padding: 0 }}>
            {!isCollapsed ? (
              <img
                src={logoS1}
                alt="SO"
                className="sidebar-logo"
                style={{ width: "220px", height: "auto", background: "transparent", border: "none", boxShadow: "none", filter: "none", opacity: 1, display: "block", margin: 0, padding: 0 }}
              />
            ) : (
              <img
                src={logoS1}
                alt="SO"
                className="sidebar-logo sidebar-logo--mini"
                style={{ width: "50px", height: "auto", background: "transparent", border: "none", boxShadow: "none", filter: "none", opacity: 1, display: "block", margin: 0, padding: 0 }}
              />
            )}
          </div>
        </div>

        <div className="sidebar-sep" style={{ flexShrink: 0 }} />

        {/* Menu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {MENU.map((item) => (
            <div
              key={item.key}
              className={`sidebar-item ${activeContent === item.key ? "active" : ""}`}
              onClick={() => {
                if (item.key === "sops") setSopsTab("sops");
                const newContent = item.key;
                setActiveContent(newContent);
                localStorage.setItem("activeContent", newContent);
                // Updated: Delay close in mobile to allow content switch to render
                if (isMobile && isSidebarOpen) {
                  setTimeout(() => setIsSidebarOpen(false), 150);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (item.key === "sops") setSopsTab("sops");
                  const newContent = item.key;
                  setActiveContent(newContent);
                  localStorage.setItem("activeContent", newContent);
                  if (isMobile && isSidebarOpen) {
                    setTimeout(() => setIsSidebarOpen(false), 150);
                  }
                  e.preventDefault();  // Prevent scroll jump
                }
              }}
              title={isCollapsed ? item.label : undefined}
              style={{ pointerEvents: "auto" }}  // Explicit for mobile
            >
              <i className={`bi ${item.icon} sidebar-icon`} />
              {!isCollapsed && (
                <span className="sidebar-text">
                  {item.label}
                  {item.key === "notifications" && unreadCount > 0 ? (
                    <span className="badge rounded-pill bg-danger ms-2">{unreadCount}</span>
                  ) : null}
                </span>
              )}
              {activeContent === item.key && <span className="active-glow" aria-hidden="true" />}
            </div>
          ))}
        </div>

        {/* Bottom settings / logout */}
        <div className="sidebar-bottom-section" style={{ flexShrink: 0, marginTop: "auto" }}>
          <div className="sidebar-item" onClick={() => setShowDropdown(!showDropdown)}>
            <i className="bi bi-gear sidebar-icon"></i>
            {!isCollapsed && <span className="sidebar-text">Settings</span>}
            <Dropdown show={showDropdown} onToggle={() => setShowDropdown(!showDropdown)} className="settings-dropdown">
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
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleLogout(); }}
          >
            <i className="bi bi-box-arrow-right sidebar-icon"></i>
            {!isCollapsed && <span className="sidebar-text">Logout</span>}
          </div>
        </div>
      </aside>

      {/* Updated: Main content margin only for desktop (overlay in mobile) */}
      <main
        className={`content-panel ${activeContent === "curriculum" ? "curriculum-panel" : ""}`}
        style={{
          marginLeft: isMobile ? 20 : sidebarWidth + 20,  // Mobile: small left margin; Desktop: full sidebar offset
          padding: "20px",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
          overflowY: "auto",
        }}
      >
        {renderContent()}
      </main>

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
  );
};

EmployeeDashboard.propTypes = {
  data: PropTypes.shape({
    profile: PropTypes.shape({
      grade: PropTypes.string,
      name: PropTypes.string,
      profile_pic: PropTypes.string,
      user: PropTypes.shape({
        username: PropTypes.string,
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

export default EmployeeDashboard;