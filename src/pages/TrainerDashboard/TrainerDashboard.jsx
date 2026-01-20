// src/pages/Trainer/TrainerDashboard.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchTrainerDashboard, mediaUrl, fetchSOP, fetchStandardLibrary } from "../../api/trainerAPIservice";
import { logout, changePassword } from "../../api/apiservice";
import { Dropdown, Button, Modal, Form } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import Loader from "../../UIcomponents/dashboard/loader";
import TeacherDashboardContent from "./TrainerDashboardContent";
import MacroPlanner from "./MacroPlanner";
import MicroPlanner from "./MicroPlanner";
import AssessmentReport from "./AssessmentReport";
import Curriculum from "./Curriculum";
import TrainerChat from "./TrainerChat";
import TrainerNotification from "./TrainerNotification";
import TrainingReport from "./TrainingReport";
import TrainerProgress from "./TrainerProgress";
import TrainerTaskReviews from "./TrainerTaskReviews";
import TrainerProfileEdit from "./TrainerProfileEdit";
import HamButton from "../../Components/Hamburger";
import logoS1 from "../../assets/sol_logo.png";

const MENU = [
  { label: "Dashboard", key: "dashboard", icon: "bi-house" },
  { label: "Curriculum", key: "curriculum", icon: "bi-book" },
  { label: "Road Map", key: "macroPlanner", icon: "bi-calendar" },
  { label: "Planner", key: "microPlanner", icon: "bi-calendar-check" },
  { label: "Training Report", key: "report", icon: "bi-file-earmark-bar-graph" },
  { label: "Assessment Report", key: "assessmentReport", icon: "bi-graph-up" },
  { label: "Notifications", key: "notifications", icon: "bi-bell" },
  { label: "Queries", key: "queries", icon: "bi-chat-left-text" },
  { label: "Progress", key: "trainerProgress", icon: "bi-bar-chart" },
  { label: "SOP", key: "sops", icon: "bi-file-earmark-text" },
  { label: "Task Reviews", key: "taskReviews", icon: "bi-journal-check" },
];

const TrainerDashboard = () => {
  const navigate = useNavigate();

  // --- shared state ---
  const [data, setData] = useState(null);
  const [activeContent, setActiveContent] = useState(
    () => localStorage.getItem("activeContent") || "dashboard"
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // SOP & Library
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError, setSopsError] = useState("");
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [sopsTab, setSopsTab] = useState(() => localStorage.getItem("sopsTab") || "sops");

  const username = localStorage.getItem("username") || "";
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const name = data?.profile?.name || (username ? username : "Trainer");
  const initial = useMemo(() => (username ? username[0].toUpperCase() : "T"), [username]);

  // Change Password
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordMessage, setChangePasswordMessage] = useState("");

  // near the top of the component (after hooks)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);


  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sidebarWidth = isCollapsed ? 60 : 280;
  const sidebarTransition = isMobile ? "transform 0.25s ease" : "width 0.4s ease-in-out";

  // Force no collapse in mobile (overlay mode)
  useEffect(() => {
    if (isMobile) setIsCollapsed(false);
  }, [isMobile]);

  // --- persist the active tab like Admin ---
  useEffect(() => {
    localStorage.setItem("activeContent", activeContent);
  }, [activeContent]);

  // --- lock body scroll when mobile sidebar is open (same as Admin) ---
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

  // --- auth + load profile ---
  useEffect(() => {
    if (isAuthenticated !== "true") {
      navigate("/login");
      return;
    }
    const load = async () => {
      try {
        const result = await fetchTrainerDashboard(username);
        if (result.success) setData(result.data);
        else setError("An error occurred while fetching teacher dashboard data.");
      } catch {
        setError("An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };
    if (username) load();
  }, [username, isAuthenticated, navigate]);

  // --- load SOPs on tab open ---
  useEffect(() => {
    const load = async () => {
      setSopsLoading(true);
      setSopsError("");
      const res = await fetchSOP();
      if (res.success) setSops(res.data || []);
      else setSopsError(res.error || "Failed to load SOPs.");
      setSopsLoading(false);
    };
    if (activeContent === "sops") load();
  }, [activeContent]);

  // --- load Library when library tab visible ---
  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      const res = await fetchStandardLibrary();
      if (res.success) setLibrary(res.data || []);
      else setLibraryError(res.error || "Failed to load Standard Library.");
      setLibraryLoading(false);
    };
    if (activeContent === "sops" && sopsTab === "library") loadLibrary();
  }, [activeContent, sopsTab]);

  // --- close mobile sidebar with ESC ---
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setIsSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

useEffect(() => {
  if (typeof window === "undefined") return;
  const aside = () => document.querySelector("aside.sidebar");
  const applySafeState = () => {
    const el = aside();
    if (!el) return;
    if (!isMobile) {
      // force safe desktop state
      el.style.transform = "none";
      el.style.webkitTransform = "none";
      el.style.transition = "width 0.4s ease-in-out";
    } else {
      // keep mobile behavior controlled by app state (open/close)
      if (isSidebarOpen) {
        el.style.transform = "translateX(0)";
        el.style.webkitTransform = "translateX(0)";
      } else {
        el.style.transform = "translateX(-110%)";
        el.style.webkitTransform = "translateX(-110%)";
      }
      el.style.transition = "transform 0.25s ease";
    }
  };

  // apply immediately
  setTimeout(applySafeState, 10);

  // Observe attribute changes so we can log and re-apply safety
  let mo;
  const setupObserver = () => {
    const el = aside();
    if (!el) return;
    mo = new MutationObserver((mutations) => {
      // log changes and reapply safe state
      mutations.forEach(m => {
        if (m.attributeName === "style" || m.attributeName === "class") {
          const computed = getComputedStyle(el).transform;
          console.warn("[sidebar-observer] style/class changed — computed transform:", computed, " classList:", el.className);
          // reapply safe state after a tiny delay (let mutating code finish)
          setTimeout(applySafeState, 5);
        }
      });
    });
    mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  };

  // initial setup (if sidebar not present immediately, wait a bit)
  const t = setInterval(() => {
    if (document.querySelector("aside.sidebar")) {
      clearInterval(t);
      setupObserver();
      applySafeState();
    }
  }, 50);

  // also re-apply whenever isMobile/isSidebarOpen changes
  applySafeState();

  return () => {
    clearInterval(t);
    if (mo) mo.disconnect();
  };
}, [isMobile, isSidebarOpen, isCollapsed]);


  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      localStorage.setItem("activeContent", "dashboard");
      navigate("/login");
    } else setError("Logout failed.");
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

  // --- Renderers (unchanged) ---
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
      case "dashboard": return <TeacherDashboardContent data={data} />;
      case "profile":
        return (
          <TrainerProfileEdit 
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
              // Reload dashboard to get fresh data in background
              const fetchData = async () => {
                try {
                  const result = await fetchTrainerDashboard(username);
                  if (result.success) setData(result.data);
                } catch (err) {
                  console.error("Failed to refresh dashboard:", err);
                }
              };
              fetchData();
              // Stay on profile page - don't redirect to dashboard
            }}
          />
        );
      case "macroPlanner": return <MacroPlanner />;
      case "microPlanner": return <MicroPlanner />;
      case "report": return <TrainingReport />;
      case "assessmentReport": return <AssessmentReport />;
      case "curriculum": return <Curriculum />;
      case "queries": return <TrainerChat />;
      case "notifications": return <TrainerNotification />;
      case "trainerProgress": return <TrainerProgress />;
      case "taskReviews": return <TrainerTaskReviews />;
      case "sops": {
        return (
          <div className="sop-page">
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
              sopsLoading ? <Loader /> :
              sopsError ? <div style={{ padding: 16, color: "crimson" }}>{sopsError}</div> :
              !sops?.length ? <div style={{ padding: 16 }}>No SOPs assigned to you yet.</div> :
              <div style={{ display: "grid", gap: 12 }}>{sops.map(renderSOPItem)}</div>
            ) : (
              libraryLoading ? <Loader /> :
              libraryError ? <div style={{ padding: 16, color: "crimson" }}>{libraryError}</div> :
              !library?.length ? <div style={{ padding: 16 }}>No items available in the Standard Library for your role.</div> :
              <div style={{ display: "grid", gap: 12 }}>{library.map(renderLibraryItem)}</div>
            )}
          </div>
        );
      }
      default: return <div style={{ padding: 20 }}>Select an option</div>;
    }
  };

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
        <div className="sidebar-header brand" title={name ? `Logged in as ${name}` : ""} style={{ background: "transparent", border: "none", padding: "0px 0 0 0", marginTop: 0, flexShrink: 0 }}>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {MENU.map((item) => (
            <div
              key={item.key}
              className={`sidebar-item ${activeContent === item.key ? "active" : ""}`}
              onClick={() => {
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
              {!isCollapsed && <span className="sidebar-text">{item.label}</span>}
              {activeContent === item.key && <span className="active-glow" aria-hidden="true" />}
            </div>
          ))}
        </div>

        {/* Bottom settings / logout (same spot as Admin) */}
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
                onClick={() => {
                  setActiveContent("profile");
                  setShowDropdown(false);
                  if (isMobile && isSidebarOpen) {
                    setTimeout(() => setIsSidebarOpen(false), 150);
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

      {/* Updated: Main content margin only for desktop */}
      <main
        className="content-panel"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth, // 🔥 offset for fixed sidebar
          padding: "20px",
          height: "100vh",
          overflowY: "auto",      // 🔥 SCROLL HERE ONLY
          transition: "margin-left 0.3s ease",
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
};

TrainerDashboard.propTypes = {
  data: PropTypes.shape({
    profile: PropTypes.shape({
      user: PropTypes.shape({
        username: PropTypes.string,
        email: PropTypes.string,
        role: PropTypes.string,
        profile_pic: PropTypes.string,
      }),
    }),
  }),
};

export default TrainerDashboard;