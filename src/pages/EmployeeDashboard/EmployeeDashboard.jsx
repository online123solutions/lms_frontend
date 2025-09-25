import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Card from "../../UIcomponents/dashboard/card";
import { fetchEmployeeDashboard, mediaUrl, fetchEmployeeNotifications,fetchSOP } from "../../api/employeeAPIservice";
import { logout } from "../../api/apiservice";
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
import logoSO from "../../assets/logo4.png"; 
import { Dropdown,Form,Button,Modal } from "react-bootstrap";
import { requestPasswordReset, confirmPasswordReset } from "../../api/apiservice";

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0); 
  const [showDropdown, setShowDropdown] = useState(false);
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError,   setSopsError]   = useState("");

  const username = localStorage.getItem("username") || "";
  const isAuthenticated = localStorage.getItem("isAuthenticated");

  const [showResetRequestModal, setShowResetRequestModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetRequestMessage, setResetRequestMessage] = useState("");
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
    const [uidb64, setUidb64] = useState("");
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetConfirmMessage, setResetConfirmMessage] = useState("");

  const [activeContent, setActiveContent] = useState(() => {
    return localStorage.getItem("activeContent") || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile toggle

  useEffect(() => {
    localStorage.setItem("activeContent", activeContent);
  }, [activeContent]);

   // ✅ Unread badge loader (exposed so child can refresh after marking read)
  const reloadBadge = useCallback(async () => {
    try {
      const res = await fetchEmployeeNotifications({ unread: true });
      if (res.success) setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      // keep silent; badge is optional
    }
  }, []);

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

  useEffect(() => {
      if (isAuthenticated !== "true") {
        navigate("/login");
        return;
      }

      const fetchData = async () => {
        try {
          const result = await fetchEmployeeDashboard(username);
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
        reloadBadge(); // ✅ also load unread count
      }
    }, [username, navigate, isAuthenticated, reloadBadge]);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      navigate("/login");
    } else {
      setError("Logout failed.");
    }
  };

  // Password Reset Handlers
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
                    <Card
                      title={subject.name}
                      image={mediaUrl(subject.image)}
                    />
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
        return <EmployeeLoginActivity  />;
      case "notifications": // ✅ NEW
        return (
          <EmployeeNotificationsPage
            // 👇 Let the notifications page call this after mark-as-read/send
            onRefreshBadge={reloadBadge}
          />
        );
      case "sops":
        if (sopsLoading) return <Loader />;
        if (sopsError)   return <div style={{padding:16,color:"crimson"}}>{sopsError}</div>;
        if (!sops?.length) return <div style={{padding:16}}>No SOPs assigned to you yet.</div>;

        return (
          <div style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Your SOPs</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {sops.map((sop) => (
                <div key={sop.id} style={{
                  background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                  padding:16, display:"grid", gap:6
                }}>
                  <div style={{fontWeight:700}}>{sop.title}</div>
                  {sop.note && <div style={{opacity:.8, fontSize:14}}>{sop.note}</div>}
                  <div style={{fontSize:12, opacity:.7}}>
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
              ))}
            </div>
          </div>
        );
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
        <div
          className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isSidebarOpen ? "open" : ""}`}
          style={{
            flex: isCollapsed ? "0 0 60px" : "0 0 250px", // Adjust width based on collapse state
            overflowY: "scroll",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            transition: "flex 0.3s ease", // Smooth transition for collapse/expand
          }}
        >
          <div className="sidebar-content" style={{ marginTop: isCollapsed ? "60px" : "0" }}>
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
            ].map((key) => {
              const labelMap = {
                dashboard: "Dashboard",
                subjects: "Subjects",
                macroplanner: "Road Map",
                microplanner: "Planner",
                quizzes: "Assessments",
                assessment: "Assessment Report",
                notifications: "Notifications",
                queries: "Queries",
                loginActivity: "Login Activity",
                sops: "SOP",
              };
              const iconMap = {
                dashboard: "bi-house",
                subjects: "bi-book",
                macroplanner: "bi-calendar",
                microplanner: "bi-calendar",
                quizzes: "bi-question-circle",
                assessment: "bi-check2-square",
                projects: "bi-lightbulb",
                notifications: "bi-bell",
                queries: "bi-chat-left-dots",
                loginActivity: "bi-clock-history",
                sops: "bi-file-earmark-text",
              };
              return (
                <div
                  key={key}
                  className={`sidebar-item ${activeContent === key ? "active" : ""}`}
                  onClick={() => {
                    setActiveContent(key);
                    localStorage.setItem("activeContent", key);
                    setSidebarVisible(false); // close overlay backdrop
                    setIsSidebarOpen(false); // hide sidebar on click
                  }}
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
              <Dropdown show={showDropdown} onToggle={() => setShowDropdown(!showDropdown)} className="settings-dropdown">
                <Dropdown.Menu align="end" className="bg-gray-800 text-white rounded-lg shadow-lg">
                  <Dropdown.Item as={Link} to="#/profile" className="hover:bg-gray-700 py-2 px-4">
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setShowResetRequestModal(true)}>Reset Password</Dropdown.Item>
                  {/* <Dropdown.Item onClick={handleLogout} className="hover:bg-gray-700 py-2 px-4">
                    Logout
                  </Dropdown.Item> */}
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
        </div>

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
            {resetRequestMessage && <p className={resetRequestMessage.includes("Error") ? "text-danger" : "text-success"}>{resetRequestMessage}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetRequestModal(false)}>Close</Button>
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
            {resetConfirmMessage && <p className={resetConfirmMessage.includes("Error") ? "text-danger" : "text-success"}>{resetConfirmMessage}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetConfirmModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
};

EmployeeDashboard.propTypes = {
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

export default EmployeeDashboard;