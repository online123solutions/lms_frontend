import { useState, useEffect } from "react";
import { fetchLessons, fetchCourses } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/Curriculum.css";
import "../../index.css"

const IS_DEV = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const DEV_API = `${window.location.protocol}//${window.location.hostname}:8000`;

const toAbsolute = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) {
    const base = IS_DEV ? DEV_API : `${window.location.protocol}//${window.location.host}`;
    return `${base}${url}`;
  }
  return url;
};

const makeOfficeViewer = (u) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(u)}`;
const makeGooglePDFViewer = (u) =>
  `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(u)}`;

const makeYouTubeEmbed = (u) => {
  if (u.includes("youtube.com/watch?v=")) {
    const id = u.split("watch?v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${id}?rel=0&showinfo=0&fs=1`;
  }
  if (u.includes("youtu.be/")) {
    const id = u.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${id}?rel=0&showinfo=0&fs=1`;
  }
  return null;
};

const Courses = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewerUrl, setViewerUrl] = useState(""); // iframe/object src
  const [rawUrl, setRawUrl] = useState("");       // original absolute file URL
  const [isPdfNative, setIsPdfNative] = useState(false); // dev-only native pdf

  // Load Courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const result = await fetchCourses();
        if (result.success) {
          const uniqueSubjects = result.data.map((course) => ({
            id: course.course_id,
            name: course.course_name,
          }));
          setSubjects(uniqueSubjects);
        } else {
          setError("Failed to load courses.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  // Load Lessons
  useEffect(() => {
    const loadLessons = async () => {
      try {
        const result = await fetchLessons();
        if (result.success) {
          setLessons(Array.isArray(result.data) ? result.data : []);
        } else {
          setLessons([]);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setLessons([]);
      }
    };
    loadLessons();
  }, []);

  // Filter topics by subject
  useEffect(() => {
    if (selectedSubject && lessons.length > 0) {
      const filtered = lessons.filter((lesson) => lesson.courseName === selectedSubject);
      setTopics(filtered);
      setSelectedTopic(null);
      setViewerUrl("");
      setRawUrl("");
      setIsPdfNative(false);
    }
  }, [selectedSubject, lessons]);

  const handleTopicSelect = (topicName) => {
    const selectedLesson = topics.find((lesson) => lesson.name === topicName);
    setSelectedTopic(selectedLesson || null);
    setViewerUrl("");
    setRawUrl("");
    setIsPdfNative(false);
  };

  // Decide best viewer for URL (dev vs prod)
  const buildViewerForUrl = (absUrl) => {
    const yt = makeYouTubeEmbed(absUrl);
    if (yt) return { url: yt, kind: "youtube" };

    const lower = absUrl.toLowerCase();

    if (IS_DEV) {
      if (lower.endsWith(".pdf")) return { url: absUrl, kind: "pdf-native" };
      if (/\.(ppt|pptx|doc|docx)$/.test(lower)) return { url: "", kind: "office-dev" };
      return { url: absUrl, kind: "direct" };
    }

    if (/\.(ppt|pptx|doc|docx)$/.test(lower)) return { url: makeOfficeViewer(absUrl), kind: "office" };
    if (lower.endsWith(".pdf")) return { url: makeGooglePDFViewer(absUrl), kind: "pdf" };
    return { url: absUrl, kind: "direct" };
  };

  const handleContentDisplay = (url) => {
    if (!url) return;
    const abs = toAbsolute(url);
    setRawUrl(abs);
    setIsPdfNative(false);

    const { url: vUrl, kind } = buildViewerForUrl(abs);
    if (kind === "pdf-native") {
      setIsPdfNative(true);
      setViewerUrl(abs);
      return;
    }
    setViewerUrl(vUrl);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="container1">
      <aside className="sidebar1">
        <h2>Curriculum</h2>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="">Select a Subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>

        {selectedSubject && (
          <select
            onChange={(e) => handleTopicSelect(e.target.value)}
            value={selectedTopic?.name ?? ""}
          >
            <option value="">Select a Topic</option>
            {topics.map((lesson) => (
              <option key={lesson.id} value={lesson.name}>
                {lesson.name}
              </option>
            ))}
          </select>
        )}

        {selectedTopic && (
          <div className="lesson-buttons">
            {selectedTopic.lessonPlanUrl && (
              <button onClick={() => handleContentDisplay(selectedTopic.lessonPlanUrl)}>
                Lesson Plan
              </button>
            )}
            {selectedTopic.lessonPpt && (
              <button onClick={() => handleContentDisplay(selectedTopic.lessonPpt)}>
                Lesson PPT
              </button>
            )}
            {selectedTopic.videoUrl && (
              <button onClick={() => handleContentDisplay(selectedTopic.videoUrl)}>
                Tutorial Video
              </button>
            )}
          </div>
        )}
      </aside>

      <main className="content1">
        <div className="lesson-content1">
          {selectedTopic ? (
            <>
              <h3 className="lesson-title">{selectedTopic.name}</h3>

              {/* DEV: PPT/DOC fallback message */}
              {IS_DEV && rawUrl && /\.(ppt|pptx|doc|docx)$/i.test(rawUrl) && (
                <div className="dev-fallback">
                  <b>Preview unavailable in development.</b> Online viewers can’t access localhost.
                  <div style={{ marginTop: 8 }}>
                    <a href={rawUrl} target="_blank" rel="noreferrer">Open original file</a> &nbsp;|&nbsp;
                    <a href={rawUrl} download>Download</a>
                  </div>
                </div>
              )}

              {/* Viewer wrapper fills remaining height */}
              <div className="viewer-wrapper">
                {/* DEV: native PDF */}
                {IS_DEV && isPdfNative && rawUrl.toLowerCase().endsWith(".pdf") ? (
                  <object key={rawUrl} data={rawUrl} type="application/pdf" className="viewer-frame">
                    <p>
                      PDF preview not supported by this browser.{" "}
                      <a href={rawUrl} target="_blank" rel="noreferrer">Open PDF</a>
                    </p>
                  </object>
                ) : viewerUrl ? (
                  <>
                    <iframe
                      key={viewerUrl}
                      src={viewerUrl}
                      title="Lesson Content"
                      className="viewer-frame"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="viewer-footer">
                      <a href={rawUrl} target="_blank" rel="noreferrer">Open original file</a>
                    </div>
                  </>
                ) : (
                  // nothing chosen yet or dev office fallback already shown above
                  <div className="empty-space1"><p>Select content to view</p></div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-space1">
              <p>Select a lesson to view content</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Courses;
