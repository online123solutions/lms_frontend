// src/components/Trainer/Curriculum.jsx
import { useEffect, useMemo, useState } from "react";
import {
  fetchCourses,
  fetchLessons,
  fetchTrainerLessonProgress,
  updateTrainerLessonProgress,
} from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/Curriculum.css";
import "../../index.css";

/* ------------------- ENV / URL HELPERS ------------------- */
const IS_DEV = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const DEV_API = `${window.location.protocol}//${window.location.hostname}:8000`;

const toAbsolute = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) {
    const base = IS_DEV
      ? DEV_API
      : `${window.location.protocol}//${window.location.host}`;
    return `${base}${url}`;
  }
  return url;
};

const makeOfficeViewer = (u) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(u)}`;
const makeGooglePDFViewer = (u) =>
  `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(u)}`;

const makeYouTubeEmbed = (u) => {
  if (!u) return null;
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

/* ------------------- UI HELPERS ------------------- */
const StatusBadge = ({ status }) => {
  const s = (status || "not_started").toLowerCase();
  const text =
    s === "in_progress"
      ? "In Progress"
      : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const tone =
    s === "completed"
      ? "success"
      : s === "in_progress"
      ? "warning"
      : "secondary";
  return <span className={`badge badge-${tone}`}>{text}</span>;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
const Curriculum = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [lessons, setLessons] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [progressMap, setProgressMap] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewerUrl, setViewerUrl] = useState("");
  const [rawUrl, setRawUrl] = useState("");
  const [isPdfNative, setIsPdfNative] = useState(false);

  /* ------------------- LOAD DATA ------------------- */
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [coursesRes, lessonsRes, progressRes] = await Promise.all([
          fetchCourses(),
          fetchLessons(),
          fetchTrainerLessonProgress(),
        ]);

        if (coursesRes.success) {
          const uniqueSubjects = (coursesRes.data || []).map((c) => ({
            id: c.id, // numeric id from backend
            name: c.course_name,
          }));
          setSubjects(uniqueSubjects);
        } else {
          setError("Failed to load courses.");
        }

        if (lessonsRes.success) {
          const arr = Array.isArray(lessonsRes.data) ? lessonsRes.data : [];
          setLessons(arr);
        } else {
          setLessons([]);
        }

        if (progressRes.success && Array.isArray(progressRes.data)) {
          const map = {};
          for (const row of progressRes.data) {
            if (!row.lesson) continue;
            map[row.lesson] = {
              status: row.status ?? "not_started",
              percent: row.percent ?? 0,
              started_at: row.started_at ?? null,
              completed_at: row.completed_at ?? null,
              last_accessed_at: row.last_accessed_at ?? null,
            };
          }
          setProgressMap(map);
        } else {
          setProgressMap({});
        }
      } catch (e) {
        console.error(e);
        setError("Unexpected error while loading curriculum.");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  /* ------------------- FILTER TOPICS ------------------- */
  useEffect(() => {
    if (selectedSubject && lessons.length > 0) {
      const filtered = lessons.filter((l) => l.courseName === selectedSubject);
      setTopics(filtered);
      setSelectedTopic(null);
      setViewerUrl("");
      setRawUrl("");
      setIsPdfNative(false);
    } else {
      setTopics([]);
      setSelectedTopic(null);
    }
  }, [selectedSubject, lessons]);

  /* ------------------- SELECT TOPIC ------------------- */
  const handleTopicSelect = (topicName) => {
    const selectedLesson = topics.find((l) => l.name === topicName);
    setSelectedTopic(selectedLesson || null);
    setViewerUrl("");
    setRawUrl("");
    setIsPdfNative(false);
  };

  /* ------------------- VIEWER ------------------- */
  const buildViewerForUrl = (absUrl) => {
    const yt = makeYouTubeEmbed(absUrl);
    if (yt) return { url: yt, kind: "youtube" };

    const lower = absUrl.toLowerCase();

    if (IS_DEV) {
      if (lower.endsWith(".pdf")) return { url: absUrl, kind: "pdf-native" };
      if (/\.(ppt|pptx|doc|docx)$/i.test(lower))
        return { url: "", kind: "office-dev" };
      return { url: absUrl, kind: "direct" };
    }

    if (/\.(ppt|pptx|doc|docx)$/i.test(lower))
      return { url: makeOfficeViewer(absUrl), kind: "office" };
    if (lower.endsWith(".pdf"))
      return { url: makeGooglePDFViewer(absUrl), kind: "pdf" };
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
    } else {
      setViewerUrl(vUrl);
    }
  };

  /* ------------------- PROGRESS ------------------- */
  const selectedProgress = useMemo(() => {
    if (!selectedTopic) return { status: "not_started", percent: 0 };
    return (
      progressMap[selectedTopic.db_id] || { status: "not_started", percent: 0 }
    );
  }, [selectedTopic, progressMap]);

  const updateProgress = async (action) => {
    if (!selectedTopic?.db_id) {
      alert("Lesson ID missing. Please refresh.");
      console.warn("No numeric PK for selected lesson:", selectedTopic);
      return;
    }

    const pk = selectedTopic.db_id;
    const key = `${pk}:${action}`;
    setSavingKey(key);

    try {
      const res = await updateTrainerLessonProgress(pk, action);
      if (!res.success) {
        alert(
          typeof res.error === "object"
            ? JSON.stringify(res.error)
            : "Failed to update progress"
        );
        return;
      }
      setProgressMap((prev) => {
        const next = { ...prev };
        const now = new Date().toISOString();
        if (!next[pk]) next[pk] = { status: "not_started", percent: 0 };
        if (action === "start") {
          next[pk] = {
            ...next[pk],
            status: "in_progress",
            started_at: next[pk].started_at || now,
          };
        } else if (action === "complete") {
          next[pk] = {
            ...next[pk],
            status: "completed",
            percent: 100,
            started_at: next[pk].started_at || now,
            completed_at: now,
          };
        } else if (action === "reset") {
          next[pk] = {
            status: "not_started",
            percent: 0,
            started_at: null,
            completed_at: null,
            last_accessed_at: null,
          };
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Error updating progress.");
    } finally {
      setSavingKey(null);
    }
  };

  /* ------------------- RENDER ------------------- */
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
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {selectedSubject && (
          <select
            onChange={(e) => handleTopicSelect(e.target.value)}
            value={selectedTopic?.name ?? ""}
          >
            <option value="">Select a Topic</option>
            {topics.map((l) => (
              <option key={l.db_id || l.lesson_id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        )}

        {selectedTopic && (
          <>
            <div className="progress-meta">
              <div>
                <b>Status:</b> <StatusBadge status={selectedProgress.status} />
              </div>
              <div className="mono">
                <b>Percent:</b> {selectedProgress.percent ?? 0}%
              </div>
            </div>

            <div className="lesson-buttons">
              {selectedTopic.lessonPlanUrl && (
                <button
                  onClick={() =>
                    handleContentDisplay(selectedTopic.lessonPlanUrl)
                  }
                >
                  Lesson Plan
                </button>
              )}
              {selectedTopic.lessonPpt && (
                <button
                  onClick={() => handleContentDisplay(selectedTopic.lessonPpt)}
                >
                  Lesson PPT
                </button>
              )}
              {selectedTopic.videoUrl && (
                <button
                  onClick={() => handleContentDisplay(selectedTopic.videoUrl)}
                >
                  Tutorial Video
                </button>
              )}
            </div>

            <div className="lesson-buttons" style={{ marginTop: 8 }}>
              {selectedProgress.status !== "completed" && (
                <>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={savingKey === `${selectedTopic.db_id}:start`}
                    onClick={() => updateProgress("start")}
                  >
                    {savingKey === `${selectedTopic.db_id}:start`
                      ? "..."
                      : "Mark Started"}
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    disabled={savingKey === `${selectedTopic.db_id}:complete`}
                    onClick={() => updateProgress("complete")}
                  >
                    {savingKey === `${selectedTopic.db_id}:complete`
                      ? "..."
                      : "Mark Completed"}
                  </button>
                </>
              )}
              {["completed", "in_progress"].includes(
                (selectedProgress.status || "").toLowerCase()
              ) && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={savingKey === `${selectedTopic.db_id}:reset`}
                  onClick={() => updateProgress("reset")}
                >
                  {savingKey === `${selectedTopic.db_id}:reset` ? "..." : "Reset"}
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      <main className="content1">
        <div className="lesson-content1">
          {selectedTopic ? (
            <>
              <h3 className="lesson-title">{selectedTopic.name}</h3>

              {IS_DEV && rawUrl && /\.(ppt|pptx|doc|docx)$/i.test(rawUrl) && (
                <div className="dev-fallback">
                  <b>Preview unavailable in development.</b>
                  <div style={{ marginTop: 8 }}>
                    <a href={rawUrl} target="_blank" rel="noreferrer">
                      Open original file
                    </a>{" "}
                    |{" "}
                    <a href={rawUrl} download>
                      Download
                    </a>
                  </div>
                </div>
              )}

              <div className="viewer-wrapper">
                {IS_DEV &&
                isPdfNative &&
                rawUrl.toLowerCase().endsWith(".pdf") ? (
                  <object
                    key={rawUrl}
                    data={rawUrl}
                    type="application/pdf"
                    className="viewer-frame"
                  >
                    <p>
                      PDF preview not supported.{" "}
                      <a href={rawUrl} target="_blank" rel="noreferrer">
                        Open PDF
                      </a>
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
                      <a href={rawUrl} target="_blank" rel="noreferrer">
                        Open original file
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="empty-space1">
                    <p>Select content to view</p>
                  </div>
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

export default Curriculum;
