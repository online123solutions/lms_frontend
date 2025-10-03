// src/components/TrainerProgress.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchTrainerLessonProgress,
  fetchTrainerCourseProgress,
  updateTrainerLessonProgress,
} from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainerProgress.css";

const Badge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    completed: "success",
    "in progress": "warning",
    in_progress: "warning",
    "not started": "secondary",
    not_started: "secondary",
  };
  const tone = map[s] || "secondary";
  const label =
    s === "in_progress"
      ? "In Progress"
      : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`badge badge-${tone}`}>{label || "—"}</span>;
};

const TrainerProgress = () => {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatingKey, setUpdatingKey] = useState(null); // "lessonId+action"

  const refetchAll = async () => {
    const [lr, cr] = await Promise.all([
      fetchTrainerLessonProgress(),
      fetchTrainerCourseProgress(),
    ]);
    if (!lr.success) throw lr.error;
    if (!cr.success) throw cr.error;
    setLessons(Array.isArray(lr.data) ? lr.data : []);
    setCourses(Array.isArray(cr.data) ? cr.data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await refetchAll();
      } catch (e) {
        console.error(e);
        setErr("Failed to load trainer progress. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getLessonId = (row) => row.lesson || row.lesson_id || row.id;

  const handleUpdate = async (lessonRow, action) => {
    const lessonId = getLessonId(lessonRow);
    const key = `${lessonId}:${action}`;
    setUpdatingKey(key);
    try {
      const res = await updateTrainerLessonProgress(lessonId, action);
      if (!res.success) {
        alert("Failed to update progress");
        return;
      }
      // Optimistic local update
      setLessons((prev) =>
        prev.map((l) => {
          const id = getLessonId(l);
          if (id !== lessonId) return l;
          const nowISO = new Date().toISOString();
          const next = { ...l };
          if (action === "start") {
            next.status = "in_progress";
            next.started_at = next.started_at || nowISO;
          } else if (action === "complete") {
            next.status = "completed";
            next.percent = 100;
            next.started_at = next.started_at || nowISO;
            next.completed_at = nowISO;
          }
          return next;
        })
      );
      // Refresh course summary so progress bars update
      const cr = await fetchTrainerCourseProgress();
      if (cr.success) setCourses(cr.data);
    } catch (e) {
      console.error(e);
      alert("Error updating progress");
    } finally {
      setUpdatingKey(null);
    }
  };

  const totalCourseRows = courses.length;
  const totalLessonRows = lessons.length;

  const overall = useMemo(() => {
    if (!courses.length) return { done: 0, total: 0, pct: 0 };
    const done = courses.reduce((a, c) => a + (c.completed_lessons || 0), 0);
    const total = courses.reduce((a, c) => a + (c.total_lessons || 0), 0);
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [courses]);

  if (loading) return <div className="loader">Loading...</div>;
  if (err) return <div className="error">{err}</div>;

  return (
    <div className="training-report-container mt-4 mb-4 shadow-none rounded">
      <div className="report-card">
        <h2 className="report-title m-0">
          <i className="bi bi-bar-chart-line-fill" style={{ color: "#FFFFFF" }}></i>{" "}
          Trainer Progress
        </h2>

        {/* Overall summary chip (optional) */}
        <div className="overall-wrap">
          <div className="overall-chip">
            Overall Completion
            <span className="overall-value">{overall.pct}%</span>
          </div>
          <div className="overall-mini">
            {overall.done} / {overall.total} lessons
          </div>
        </div>

        {/* Course Progress */}
        <div className="table-wrapper table-responsive mt-3">
          <h5 className="section-title">Course Progress</h5>
          {courses.length === 0 ? (
            <p className="no-data">No courses found.</p>
          ) : (
            <>
              <table className="report-table bordered table-hover">
                <thead>
                  <tr>
                    <th style={{ minWidth: 120 }}>Course Code</th>
                    <th>Course Name</th>
                    <th style={{ width: 140 }}>Lessons Completed</th>
                    <th style={{ width: 120 }}>Total Lessons</th>
                    <th style={{ width: 220 }}>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.course_id}>
                      <td className="mono">{c.course_code || "—"}</td>
                      <td>{c.course_name}</td>
                      <td className="mono">{c.completed_lessons}</td>
                      <td className="mono">{c.total_lessons}</td>
                      <td>
                        <div className="progress slim">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${c.completion_percent || 0}%` }}
                            aria-valuenow={c.completion_percent || 0}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            {c.completion_percent || 0}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-muted small mt-2">
                Showing {totalCourseRows} record{totalCourseRows !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>

        {/* Lesson Progress */}
        <div className="table-wrapper table-responsive mt-4">
          <h5 className="section-title">Lesson Progress</h5>
          {lessons.length === 0 ? (
            <p className="no-data">No lessons found.</p>
          ) : (
            <>
              <table className="report-table bordered table-hover">
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Course</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ width: 110 }}>Percent</th>
                    <th style={{ width: 180 }}>Started</th>
                    <th style={{ width: 180 }}>Completed</th>
                    <th style={{ width: 180 }}>Last Accessed</th>
                    <th style={{ width: 230 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => {
                    const lessonId = getLessonId(l);
                    const updatingStart = updatingKey === `${lessonId}:start`;
                    const updatingComplete = updatingKey === `${lessonId}:complete`;
                    return (
                      <tr key={lessonId}>
                        <td>{l.lesson_name_col || l.lesson_name || "—"}</td>
                        <td>{l.course_name_col || l.course_name || "—"}</td>
                        <td>
                          <Badge status={l.status} />
                        </td>
                        <td className="mono">{(l.percent ?? 0)}%</td>
                        <td>
                          {l.started_at ? new Date(l.started_at).toLocaleString() : "—"}
                        </td>
                        <td>
                          {l.completed_at
                            ? new Date(l.completed_at).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          {l.last_accessed_at
                            ? new Date(l.last_accessed_at).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          {l.status !== "completed" ? (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                disabled={updatingStart}
                                onClick={() => handleUpdate(l, "start")}
                              >
                                {updatingStart ? "..." : "Mark Started"}
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                disabled={updatingComplete}
                                onClick={() => handleUpdate(l, "complete")}
                              >
                                {updatingComplete ? "..." : "Mark Completed"}
                              </button>
                            </>
                          ) : (
                            <span className="text-success fw-bold">✔ Done</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-muted small mt-2">
                Showing {totalLessonRows} record{totalLessonRows !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerProgress;
