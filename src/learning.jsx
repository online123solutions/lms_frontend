import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faVideo,
  faLaptopCode,
  faQuestionCircle,
  faQuestion,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import { curriculum1, markLessonCompleted } from "./api/apiservice";
import * as traineeService from "./api/traineeAPIservice";
import * as employeeService from "./api/employeeAPIservice";
import "./utils/css/learn.css";
import Loader from "./UIcomponents/dashboard/loader";
import DocumentViewer from "./hint";
import Popup from "./popup";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

const isSharePoint = (url) => /sharepoint\.com\/|1drv\.ms\//i.test(url) || /my\.sharepoint\.com/i.test(url);


/** Build SharePoint WOPI embed view (works if tenant allows embedding) */
const buildSharePointWopiEmbed = (rawUrl) => {
  try {
    // If already a WOPI frame embed, return as-is
    if (/WopiFrame\.aspx/i.test(rawUrl) && /action=embedview/i.test(rawUrl)) return rawUrl;

    // Use the same host and add the WOPI path; pass the file link in `sourcedoc`
    const u = new URL(rawUrl);
    const host = `${u.protocol}//${u.host}`;
    return `${host}/_layouts/15/WopiFrame.aspx?sourcedoc=${encodeURIComponent(rawUrl)}&action=embedview`;
  } catch {
    return rawUrl;
  }
};

/** Office Online viewer (requires publicly accessible file) */
const buildOfficeOnlineEmbed = (rawUrl) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;


const Learning = () => {
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
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
    if (isSharePoint(url)) {
      // Try WOPI first, but fallback to Office Online
      const wopiUrl = buildSharePointWopiEmbed(url);
      return wopiUrl.includes('WopiFrame.aspx') ? wopiUrl : buildOfficeOnlineEmbed(url);
    }
    return url;
  };

  const getPdfEmbedUrl = (url) => {
    if (!url) return "";
    
    // Handle Google Drive links using Google Docs Viewer
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        // Use Google Docs Viewer for a more reliable embed
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    
    // For other URLs, try to use Google Docs viewer if it's a direct PDF
    if (url.endsWith('.pdf') || url.includes('pdf')) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
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

  const handleBack = () => {
    // Go back if possible; otherwise fall back to a sensible route
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/learning"); // <-- adjust if your subject list lives elsewhere
    }
  };

  const handleNextPdf = () => {
    if (currentPdfIndex < sectionData.lesson_pdfs_urls.length - 1) {
      setCurrentPdfIndex(currentPdfIndex + 1);
    }
  };

  const handlePrevPdf = () => {
    if (currentPdfIndex > 0) {
      setCurrentPdfIndex(currentPdfIndex - 1);
    }
  };

  return (
    <div className="learning-container" key={currentCircle}> 
      <nav className="navbar1">
        <div className="left-block">
          <button className="back-button" onClick={handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span className="back-text">Back</span>
          </button>
          <div className="lesson-title">{lessonName || "Lesson"}</div>
        </div>

        <div className="center-block">
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
        </div>

        <button className="mark-completed-button" onClick={handleMarkAsCompleted}>
          Mark as Completed
        </button>
      </nav>

      <div className="content-layout">
        <div className="left-menu">
          {[
            { label: "Content", icon: faBook, value: "content" },
            { label: "Video", icon: faVideo, value: "video" },
            // { label: "Simulator", icon: faLaptopCode, value: "simulator" },
            { label: "PDFs", icon: faFilePdf, value: "pdfs" },
            { label: "Quiz", icon: faQuestionCircle, value: "quiz" },
            // { label: "Hint", icon: faQuestion, value: "hint" },
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
                  onError={() => setError("Embed failed—check file permissions or try downloading.")}
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
              ) : selectedButton === "pdfs" && sectionData.lesson_pdfs_urls && sectionData.lesson_pdfs_urls.length > 0 ? (
                <div className="pdf-container">
                  <h3>Lesson PDFs</h3>
                  <div style={{ textAlign: "center" }}>
                    {sectionData.lesson_pdfs_urls.length > 1 && (
                      <div style={{ marginBottom: "20px", textAlign: "center" }}>
                        <span style={{ marginRight: "15px", fontSize: "16px", fontWeight: "bold" }}>
                          PDF {currentPdfIndex + 1} of {sectionData.lesson_pdfs_urls.length}
                        </span>
                        <button
                          onClick={handlePrevPdf}
                          disabled={currentPdfIndex === 0}
                          style={{
                            marginRight: "10px",
                            padding: "8px 16px",
                            backgroundColor: currentPdfIndex === 0 ? "#ccc" : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: currentPdfIndex === 0 ? "not-allowed" : "pointer"
                          }}
                        >
                          Previous
                        </button>
                        <button
                          onClick={handleNextPdf}
                          disabled={currentPdfIndex === sectionData.lesson_pdfs_urls.length - 1}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: currentPdfIndex === sectionData.lesson_pdfs_urls.length - 1 ? "#ccc" : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: currentPdfIndex === sectionData.lesson_pdfs_urls.length - 1 ? "not-allowed" : "pointer"
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                    <iframe
                      src={getPdfEmbedUrl(sectionData.lesson_pdfs_urls[currentPdfIndex])}
                      title={`PDF ${currentPdfIndex + 1}`}
                      width="100%"
                      className="pdf-iframe"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        document.getElementById(`pdf-fallback`).style.display = 'block';
                      }}
                      onLoad={(e) => {
                        // Check if iframe loaded the sign-in page or error page
                        try {
                          const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                          if (iframeDoc.title.includes('Sign in') || iframeDoc.title.includes('Google')) {
                            e.target.style.display = 'none';
                            document.getElementById(`pdf-fallback`).style.display = 'block';
                          }
                        } catch (error) {
                          // Cross-origin error, likely means PDF loaded successfully
                        }
                      }}
                    />
                    <div id="pdf-fallback" style={{ display: "none", padding: "20px", border: "1px solid #ccc", textAlign: "center" }}>
                      <p style={{ marginBottom: "15px", fontSize: "16px" }}>
                        This PDF cannot be embedded directly. Click the buttons below to open them in new tabs.
                      </p>
                      {sectionData.lesson_pdfs_urls.map((pdfUrl, index) => (
                        <div key={index} style={{ marginBottom: "10px" }}>
                          <a 
                            href={sectionData.lesson_pdfs[index] || pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "12px 24px",
                              backgroundColor: "#007bff",
                              color: "white",
                              textDecoration: "none",
                              borderRadius: "6px",
                              fontSize: "16px",
                              fontWeight: "bold",
                              marginRight: "10px"
                            }}
                          >
                            Open PDF {index + 1} in New Tab
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedButton === "pdfs" && (!sectionData.lesson_pdfs_urls || sectionData.lesson_pdfs_urls.length === 0) ? (
                <p>No PDFs available for this lesson.</p>
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