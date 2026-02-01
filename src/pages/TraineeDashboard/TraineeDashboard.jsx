import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Card from "../../UIcomponents/dashboard/card";
import {
  fetchTraineeDashboard,
  mediaUrl,
  fetchTraineeNotifications,
  fetchSOP,
  fetchStandardLibrary,
} from "../../api/traineeAPIservice";
import { logout, changePassword } from "../../api/apiservice";
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
import { Dropdown, Form, Button, Modal } from "react-bootstrap";
import TraineeProgress from "./TraineeProgress";
import TraineeTasks from "./TraineeTasks";
import TraineeProfileEdit from "./TraineeProfileEdit";
import logoS1 from "../../assets/sol_logo.png";

/* ---------------- MENU to mirror Trainer ---------------- */
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
  { label: "Progress", key: "progress", icon: "bi-bar-chart" },
  { label: "Tasks", key: "tasks", icon: "bi-list-check" },
];

const TraineeDashboard = () => {
  const navigate = useNavigate();

  // ---------- core state ----------
  const [data, setData] = useState(null);
  const [activeContent, setActiveContent] = useState(
    () => localStorage.getItem("activeContent") || "dashboard"
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // sidebar layout (mirror Trainer)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile
  const [showDropdown, setShowDropdown] = useState(false);

  // unread badge (kept)
  const [unreadCount, setUnreadCount] = useState(0);

  // SOP + Library
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError, setSopsError] = useState("");
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [sopsTab, setSopsTab] = useState(() => localStorage.getItem("sopsTab") || "sops");

  // Change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordMessage, setChangePasswordMessage] = useState("");

  const username = localStorage.getItem("username") || "";
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const name = data?.profile?.name || (username || "Trainee");
  const initial = useMemo(() => (username ? username[0].toUpperCase() : "T"), [username]);

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

  // lock body scroll when mobile sidebar open (mirror Trainer)
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

  // unread badge loader (kept)
  const reloadBadge = useCallback(async () => {
    try {
      const res = await fetchTraineeNotifications({ unread: true });
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
        const result = await fetchTraineeDashboard(username);
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

  // SOPs load when SOP tab visible and tab is "sops"
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

  // Library load when "library" tab visible
  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      const res = await fetchStandardLibrary(); // role-filtered backend
      if (res.success) setLibrary(res.data || []);
      else setLibraryError(res.error || "Failed to load Standard Library.");
      setLibraryLoading(false);
    };
    if (activeContent === "sops" && sopsTab === "library") loadLibrary();
  }, [activeContent, sopsTab]);


  useEffect(() => {
    const close = () => setShowDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // handlers
  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      localStorage.setItem("activeContent", "dashboard");
      navigate("/login");
    } else {
      setError("Logout failed.");
    }
  }, [navigate]);

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
    
    // Check if password contains only numbers
    if (/^\d+$/.test(newPassword)) {
      setChangePasswordMessage("Password cannot be only numbers. Please use a combination of numbers and characters.");
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
        // Check if error message mentions numeric password
        const errorMsg = result.error || "Failed to change password.";
        if (typeof errorMsg === 'string' && (
          errorMsg.toLowerCase().includes('numeric') || 
          errorMsg.toLowerCase().includes('number') ||
          errorMsg.toLowerCase().includes('digit')
        )) {
          setChangePasswordMessage("Password cannot be only numbers. Please use a combination of numbers and characters.");
        } else {
          setChangePasswordMessage(`Error: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error.message || "Failed to change password.";
      // Check if error message mentions numeric password
      if (errorMsg.toLowerCase().includes('numeric') || 
          errorMsg.toLowerCase().includes('number') ||
          errorMsg.toLowerCase().includes('digit')) {
        setChangePasswordMessage("Password cannot be only numbers. Please use a combination of numbers and characters.");
      } else {
        setChangePasswordMessage(`Error: ${errorMsg}`);
      }
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
        {
          console.log("Subjects data before filtering:", data.subjects);
          const filteredSubjects = data.subjects?.filter(subject => subject.display_on_frontend !== false) || [];
          console.log("Subjects after filtering:", filteredSubjects);
        }
        return (
          <div className="subject-cards-container">
            {data?.subjects?.length > 0 ? (
              data.subjects
                .filter(subject => subject.display_on_frontend !== false)
                .map((subject) => (
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
      case "tasks":
        return <TraineeTasks />;
      case "profile":
        return (
          <TraineeProfileEdit 
            username={username}
            dashboardData={data}
            onCancel={() => setActiveContent("dashboard")}
            onUpdate={(updatedData) => {
              // Refresh dashboard data when profile is updated
              if (data?.profile) {
                setData({
                  ...data,
                  profile: {
                    ...data.profile,
                    ...updatedData,
                  },
                });
              }
              // Reload dashboard to get fresh data
              const fetchData = async () => {
                try {
                  const result = await fetchTraineeDashboard(username);
                  if (result.success) setData(result.data);
                } catch (err) {
                  console.error("Failed to refresh dashboard:", err);
                }
              };
              if (username) fetchData();
            }}
          />
        );
      case "sops": {
        return (
          <div className="sop-page" style={{ padding: 16 }}>
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
      default:
        return <div>Select an option</div>;
    }
  };

  // ----- Layout parity with Trainer -----
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
        style={{
          position: "fixed", 
          top: 0,
          left: 0,
          width: sidebarWidth,
          height: isMobile ? "100vh" : "auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 2000,
          transition: sidebarTransition,
          overflow: "visible",      // 🔥 KEY
          paddingTop: 16,
          backgroundColor: "#393939",
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
                alt="Steel Study"
                className="sidebar-logo"
              />
            ) : (
              <img
                src={logoS1}
                alt="Steel Study"
                className="sidebar-logo"
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
        <div
            className="sidebar-bottom-section"
            style={{
              flexShrink: 0,
              paddingBottom: 12,
            }}
          >
          {/* Settings */}
          <div
            className={`sidebar-item settings-item ${showDropdown ? "open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
          >
            <i className="bi bi-gear sidebar-icon"></i>
            <span className="sidebar-text">Settings</span>
          </div>

          {/* Custom dropdown menu */}
          {showDropdown && (
            <div className="sidebar-settings-menu">
              <div
                className="settings-menu-item"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveContent("profile");
                  setShowDropdown(false);
                  if (isMobile && isSidebarOpen) {
                    setTimeout(() => setIsSidebarOpen(false), 150);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveContent("profile");
                    setShowDropdown(false);
                    if (isMobile && isSidebarOpen) {
                      setTimeout(() => setIsSidebarOpen(false), 150);
                    }
                  }
                }}
              >
                <i className="bi bi-person"></i>
                <span>Profile</span>
              </div>

              <div
                className="settings-menu-item"
                onClick={() => {
                  setShowDropdown(false);
                  setShowChangePasswordModal(true);
                }}
              >
                <i className="bi bi-key"></i>
                <span>Change Password</span>
              </div>
            </div>
          )}

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
        className="content-panel"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          padding: "16px",            // ⬅ reduced from 20px
          height: "calc(100vh - 20px)", // Account for margin (10px top + 10px bottom)
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",          // Allow scrolling
          overflowX: "hidden",        // Prevent horizontal scroll
          transition: "margin-left 0.3s ease",
          WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
        }}
      >
        {renderContent()}
      </main>

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
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

TraineeDashboard.propTypes = {
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
        name: PropTypes.string,
        image: PropTypes.string,
        description: PropTypes.string,
        slug: PropTypes.string,
      })
    ),
  }),
};

export default TraineeDashboard;