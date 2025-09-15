import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faVideo,
  faLaptopCode,
  faQuestionCircle,
  faQuestion,
} from "@fortawesome/free-solid-svg-icons";
import { curriculum1, markLessonCompleted } from "./api/apiservice";
import * as traineeService from "./api/traineeAPIservice";
import * as employeeService from "./api/employeeAPIservice";
import "./utils/css/learn.css";
import Loader from "./UIcomponents/dashboard/loader";
import DocumentViewer from "./hint";
import Popup from "./popup";

const Learning = () => {
  const [totalCircles, setTotalCircles] = useState(0);
  const [currentCircle, setCurrentCircle] = useState(0);
  const [completedCircles, setCompletedCircles] = useState([]);
  const [circleStatus, setCircleStatus] = useState([]);
  const [countdown, setCountdown] = useState(2);
  const [sectionData, setSectionData] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedButton, setSelectedButton] = useState("content");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [lessonName, setLessonName] = useState("");
  const [isTrainee, setIsTrainee] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const { subjectSlug } = useParams();
  const navigate = useNavigate();

  const getRoleBasedClient = () => {
    const role = localStorage.getItem("role") || "";
    return role.toLowerCase() === "trainee" ? traineeService.apiClient : employeeService.apiClient;
  };

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const username = localStorage.getItem("username");
      if (!username) throw new Error("No username found.");

      const roleClient = getRoleBasedClient();
      const response = await roleClient.get(`/${username}/`);
      console.log("Dashboard Response:", response.data);

      if (response.data) {
        setIsTrainee(response.data.is_trainee || localStorage.getItem("role") === "trainee");
        setCompletedLessonIds(response.data.completed_lesson_ids || []);
      } else {
        throw new Error("No data returned from dashboard API.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err.response ? err.response.data : err.message);
      setError(`Failed to load user data: ${err.message}. Please check your login or contact support.`);
      setCompletedLessonIds([]);
      setIsTrainee(localStorage.getItem("role") === "trainee");
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    console.log("subject received:", subjectSlug);
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!subjectSlug) {
          setError("No subject slug provided.");
          return;
        }
        const response = await curriculum1(subjectSlug);
        console.log("API response:", response);
        if (response.success) {
          const lessons = Array.isArray(response.data) ? response.data : [];
          lessons.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          setAllLessons(lessons);
          setTotalCircles(lessons.length);
          const initialStatus = lessons.map((lesson) =>
            completedLessonIds.includes(lesson.id) ? "green" : "white"
          );
          setCircleStatus(initialStatus);
          setCompletedCircles(
            lessons
              .map((lesson, index) => (completedLessonIds.includes(lesson.id) ? index : null))
              .filter((index) => index !== null)
          );
          // Set currentCircle to the first uncompleted lesson or the last completed one
          const nextUncompleted = lessons.findIndex(
            (lesson) => !completedLessonIds.includes(lesson.id)
          );
          setCurrentCircle(nextUncompleted >= 0 ? nextUncompleted : Math.max(0, completedCircles[completedCircles.length - 1] || 0));
          const firstLesson = lessons.find((item) => item.position === 1) || lessons[0];
          if (firstLesson) {
            setSectionData(firstLesson);
            setLessonName(firstLesson.name);
          } else {
            setError("No lessons found for this subject.");
          }
        } else {
          setError(response.error || "Unable to fetch data.");
        }
      } catch (err) {
        console.error("Fetch error:", err.response ? err.response.data : err.message);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (subjectSlug && !dashboardLoading) fetchContent();
  }, [subjectSlug, completedLessonIds, dashboardLoading]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!sectionData || !selectedButton) return;
      const token = localStorage.getItem("authToken");
      if (!token) return;
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedButton, sectionData, subjectSlug]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleMarkAsCompleted = async () => {
    if (!allLessons.length || !sectionData) {
      console.log("Cannot mark: No lessons or section data");
      return;
    }

    try {
      const result = await markLessonCompleted(sectionData.slug);
      console.log("Completion Response:", result);

      if (result.success) {
        const { message, completed_at } = result.data || {};
        console.log("Current Circle:", currentCircle, "Total Circles:", totalCircles);

        // Update completion state
        setCompletedCircles((prev) => [...new Set([...prev, currentCircle])]); // Ensure no duplicates
        setCircleStatus((prev) =>
          prev.map((status, index) => (index === currentCircle ? "green" : status))
        );
        setCompletedLessonIds((prev) => [...new Set([...prev, sectionData.id])]); // Ensure no duplicates
        console.log("Updated completedLessonIds:", [...completedLessonIds, sectionData.id]);

        // Check if it's the last lesson
        if (currentCircle === totalCircles - 1) {
          setPopupMessage("Bravo! You have completed the subject.");
          setShowPopup(true);
          return;
        }

        // Move to the next lesson
        const nextIndex = currentCircle + 1;
        console.log("Next Index:", nextIndex);
        setCurrentCircle(nextIndex);
        setCountdown(2);

        const nextLesson =
          allLessons.find((item) => item.position === nextIndex + 1) || allLessons[nextIndex];
        console.log("Next Lesson:", nextLesson);
        if (nextLesson) {
          setSectionData(nextLesson);
          setLessonName(nextLesson.name);
        } else {
          setSectionData(null);
          setLessonName("");
          console.log("No next lesson found");
        }

        setPopupMessage(message || "Lesson marked as completed.");
        setShowPopup(true);
      } else {
        setPopupMessage(result.error || "Failed to mark lesson as completed.");
        setShowPopup(true);
      }
    } catch (err) {
      console.error("Mark completed error:", err);
      setPopupMessage(`An error occurred while marking the lesson: ${err.message}`);
      setShowPopup(true);
    }
  };

  const getCircleColor = (index) => {
    if (completedCircles.includes(index)) return "green";
    if (index === currentCircle) return "orange";
    return "white";
  };

  const handleButtonClick = (button) => setSelectedButton(button);

  const getEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      const base = url.replace("watch?v=", "embed/");
      return base.split("&")[0];
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const handleCircleClick = (index) => {
    if (index > currentCircle) return;
    setCurrentCircle(index);

    const lesson =
      allLessons.find((item) => item.position === index + 1) || allLessons[index];
    console.log("Clicked Lesson:", lesson);
    if (lesson) {
      setSectionData(lesson);
      setLessonName(lesson.name);
    } else {
      setSectionData(null);
      setLessonName("");
    }
  };

  return (
    <div className="learning-container" key={currentCircle}> 
      <nav className="navbar1">
        <div className="circle-container">
          {Array.from({ length: totalCircles }).map((_, index) => (
            <div
              key={index}
              className="circle"
              style={{ backgroundColor: getCircleColor(index) }}
              onClick={() => handleCircleClick(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <div className="navbar-text">{lessonName || "Lesson"}</div>
        <button
          className="mark-completed-button"
          onClick={handleMarkAsCompleted}
          disabled={countdown > 0 || !allLessons.length}
          style={{
            marginLeft: "auto",
            marginRight: "20px",
            padding: "10px 15px",
            backgroundColor: countdown > 0 ? "#ccc" : "#393939",
            color: countdown > 0 ? "#555" : "#fff",
            border: "none",
            borderRadius: "15px",
            cursor: countdown > 0 ? "not-allowed" : "pointer",
          }}
        >
          {countdown > 0 ? `Wait ${countdown} sec` : "Mark as Completed"}
        </button>
      </nav>

      <div className="content-layout">
        <div className="left-menu">
          {[
            { label: "Content", icon: faBook, value: "content" },
            { label: "Video", icon: faVideo, value: "video" },
            { label: "Simulator", icon: faLaptopCode, value: "simulator" },
            { label: "Quiz", icon: faQuestionCircle, value: "quiz" },
            { label: "Hint", icon: faQuestion, value: "hint" },
          ].map(({ label, icon, value }) => (
            <button
              key={value}
              className={`menu-button ${selectedButton === value ? "active" : ""}`}
              onClick={() => handleButtonClick(value)}
              aria-label={`Navigate to ${label}`}
            >
              <FontAwesomeIcon icon={icon} className="menu-icon" />
              <span className="menu-text">{label}</span>
            </button>
          ))}
        </div>

        <div className="content-display">
          {loading || dashboardLoading ? (
            <Loader />
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : !sectionData ? (
            <p>Content not available</p>
          ) : (
            <div className="section-content">
              {selectedButton === "content" && sectionData.content ? (
                <iframe
                  src={getEmbedUrl(sectionData.content)}
                  title="Content Frame"
                  width="100%"
                  height="570px"
                />
              ) : selectedButton === "video" && sectionData.tutorial_video ? (
                <iframe
                  src={getEmbedUrl(sectionData.tutorial_video)}
                  title="Video Frame"
                  width="100%"
                  height="570px"
                  allowFullScreen
                />
              ) : selectedButton === "simulator" && sectionData.editor ? (
                <iframe
                  src={getEmbedUrl(sectionData.editor)}
                  title="Simulator Frame"
                  width="100%"
                  height="570px"
                />
              ) : selectedButton === "quiz" && sectionData.quiz ? (
                <iframe
                  src={getEmbedUrl(sectionData.quiz)}
                  title="Quiz Frame"
                  width="100%"
                  height="570px"
                />
              ) : selectedButton === "hint" && sectionData.hint ? (
                <DocumentViewer url={sectionData.hint} />
              ) : (
                <p>
                  {selectedButton.charAt(0).toUpperCase() + selectedButton.slice(1)} not
                  available
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showPopup && (
        <Popup
          isOpen={showPopup}
          message={popupMessage}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
};

export default Learning;