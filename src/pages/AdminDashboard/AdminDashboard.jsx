import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { fetchAdminDashboard,fetchSOP,mediaUrl,fetchStandardLibrary } from '../../api/adminAPIservice';
import { logout,requestPasswordReset, confirmPasswordReset } from '../../api/apiservice';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Loader from '../../UIcomponents/dashboard/loader';
import logoS from '../../assets/logo4.png';
import HamButton from '../../Components/Hamburger';
import AdminDashboardContent from './AdminDashboardContent';
import Curriculum from './Curriculum';
import MacroPlanner from './MacroPlanner';
import MicroPlanner from './MicroPlanner';
import TrainingReport from './TrainingReport';
import AdminAssessmentReports from './AssessmentReport';
import { Dropdown,Button, Modal, Form  } from "react-bootstrap";
import AdminNotification from './AdminNotification';
import AdminFeedbackPage from './AdminFeedbackPage';
import CourseProgress from './CourseProgress';
import AdminUserImportCard from './AdminUserImportCard';

const MENU = [
  { label: 'Dashboard', key: 'dashboard', icon: 'bi-house' },
  { label: 'Curriculum', key: 'curriculum', icon: 'bi-book' },
  { label: 'Road Map', key: 'macroPlanner', icon: 'bi-calendar' },
  { label: 'Planner', key: 'microPlanner', icon: 'bi-calendar-check' },
  { label: 'Training Report', key: 'report', icon: 'bi-file-earmark-bar-graph' },
  { label: 'Assessment Report', key: 'assessmentReport', icon: 'bi-graph-up' },
  { label: 'Notifications', key: 'notifications', icon: 'bi-bell' },
  { label: 'SOP', key: 'sops', icon: 'bi-file-earmark-text' },
  { label: 'Feedback', key: 'feedback', icon: 'bi-chat-dots' },
  { label: 'Course Progress', key: 'courseProgress', icon: 'bi-bar-chart' },
  { label: 'User Import', key: 'userImport', icon: 'bi-upload', component: AdminUserImportCard },  
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [activeContent, setActiveContent] = useState(
    () => localStorage.getItem('activeContent') || 'dashboard'
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // SOPs + Standard Library
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);
  const [sopsError, setSopsError] = useState("");
  const [library, setLibrary] = useState([]);                 // ✅ NEW
  const [libraryLoading, setLibraryLoading] = useState(false); // ✅ NEW
  const [libraryError, setLibraryError] = useState("");        // ✅ NEW
  const [sopsTab, setSopsTab] = useState(() => localStorage.getItem("sopsTab") || "sops"); // ✅ NEW

  const isAuthenticated = localStorage.getItem('isAuthenticated');
  const name = data?.profile?.name || (username ? username : 'Admin');
  const initial = useMemo(() => (username ? username[0].toUpperCase() : 'A'), [username]);

  // Password Reset States
    const [showResetRequestModal, setShowResetRequestModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetRequestMessage, setResetRequestMessage] = useState("");
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
    const [uidb64, setUidb64] = useState("");
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetConfirmMessage, setResetConfirmMessage] = useState("");

  useEffect(() => {
    localStorage.setItem('activeContent', activeContent);
  }, [activeContent]);

  useEffect(() => {
  const html = document.documentElement;
  const body = document.body;
  if (isSidebarOpen) {
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  } else {
    html.style.overflow = '';
    body.style.overflow = '';
  }
  return () => {
    html.style.overflow = '';
    body.style.overflow = '';
  };
}, [isSidebarOpen]);


  useEffect(() => {
    if (isAuthenticated !== 'true') {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const result = await fetchAdminDashboard(username);
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load admin dashboard data.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load admin dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    if (username) load();
  }, [username, isAuthenticated, navigate]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result.success) {
      localStorage.clear();
      localStorage.setItem('activeContent', 'dashboard');
      navigate('/login');
    } else {
      setError('Logout failed.');
    }
  }, [navigate]);

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
  
      // URL Parameter Handling for Confirmation
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
      case 'dashboard':
        return <AdminDashboardContent data={data} />;
      case 'curriculum':
        return <Curriculum />;
      case 'macroPlanner':
        return <MacroPlanner />;
      case 'microPlanner':
        return <MicroPlanner />;
      case 'report': 
        return <TrainingReport />;
      case 'assessmentReport':
        return <AdminAssessmentReports />;
      case 'notifications':
        return <AdminNotification />;
      case 'feedback':
        return <AdminFeedbackPage />;
      case 'courseProgress':
        return <CourseProgress />;
      case 'userImport':
        return <AdminUserImportCard />;

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
        return <div style={{ padding: 20 }}>Select an option</div>;
    }
  };

  if (loading) return <Loader />;
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;

  return (
    <div className="dashboard">
      <div className="mobile-sidebar-toggle" aria-hidden={isSidebarOpen}>
        <HamButton onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar" />
      </div>
      <div
        className={`mobile-backdrop ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        role="button"
        aria-label="Close sidebar backdrop"
        tabIndex={-1}
      />
      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-content">
          <div className="sidebar-header brand" title={name ? `Logged in as ${name}` : ''}>
            <div className="profile-chip">
              {!isCollapsed && <img src={logoS} alt="SO" className="sidebar-logo" />}
            </div>
          </div>
          <div className="sidebar-sep" />
          {MENU.map((item) => (
            <div
              key={item.key}
              className={`sidebar-item ${activeContent === item.key ? 'active' : ''}`}
              onClick={() => {
                setActiveContent(item.key);
                localStorage.setItem('activeContent', item.key);
                setIsSidebarOpen(false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveContent(item.key);
                  localStorage.setItem('activeContent', item.key);
                  setIsSidebarOpen(false);
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <i className={`bi ${item.icon} sidebar-icon`} />
              {!isCollapsed && <span className="sidebar-text">{item.label}</span>}
              {activeContent === item.key && <span className="active-glow" aria-hidden="true" />}
            </div>
          ))}
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
                <Dropdown.Item className="hover:bg-gray-700 py-2 px-4" onClick={() => setShowResetRequestModal(true)}>
                  Change Password
                </Dropdown.Item>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleLogout();
            }}
          >
            <i className="bi bi-box-arrow-right sidebar-icon"></i>
            {!isCollapsed && <span className="sidebar-text">Logout</span>}
          </div>
        </div>
      </aside>

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

      <main className="content-panel" style={{ marginLeft: 0, paddingLeft: 0 }}>
        {renderContent()}
      </main>
    </div>
  );
};

AdminDashboard.propTypes = {
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

export default AdminDashboard;