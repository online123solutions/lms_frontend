import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Card from "../../UIcomponents/dashboard/card";
import { fetchTraineeDashboard, mediaUrl, fetchTraineeNotifications } from "../../api/traineeAPIservice";
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
import { Dropdown } from "react-bootstrap";

const TraineeDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0); 
  const [showDropdown, setShowDropdown] = useState(false);

  const username = localStorage.getItem("username") || "";
  const isAuthenticated = localStorage.getItem("isAuthenticated");

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
        const res = await fetchTraineeNotifications({ unread: true });
        if (res.success) setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        // keep silent; badge is optional
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
      case "events":
        return <div>Upcoming Events Will be here...</div>;
      case "queries":
        return <QueryChat />;
      case "loginActivity":
        return <TraineeLoginActivity />;
      case "notifications": // ✅ NEW
        return (
          <TraineeNotificationPage
            onRefreshBadge={reloadBadge}
          />
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
            ].map((key) => {
              const labelMap = {
                dashboard: "Dashboard",
                subjects: "Subjects",
                macroplanner: "Road map",
                microplanner: "Planner",
                quizzes: "Assessments",
                assessment: "Assessment Report",
                notifications: "Notifications",
                queries: "Trainee Queries",
                loginActivity: "Login Activity",
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
              };
              return (
                <div
                  key={key}
                  className={`sidebar-item ${activeContent === key ? "active" : ""}`}
                  onClick={() => {
                    setActiveContent(key);
                    localStorage.setItem("activeContent", key);
                    setSidebarVisible(false);
                    setIsSidebarOpen(false);
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
                  <Dropdown.Item as={Link} to="#/my-reflections" className="hover:bg-gray-700 py-2 px-4">
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