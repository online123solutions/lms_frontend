// src/components/TrainerProgress.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchTrainerLessonProgress,   // progress rows for touched lessons
  fetchTrainerCourseProgress,   // per-course summary (codes, sanity)
  updateTrainerLessonProgress,  // POST: { lesson: <int>, action: "start"|"complete" }
  fetchLessons,                 // FULL lesson catalog
  fetchCourses,                 // course meta (id, course_code, course_name)
} from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainerProgress.css";

/* ---------------- helpers ---------------- */

const toArray = (d) =>
  Array.isArray(d)
    ? d
    : Array.isArray(d?.results)
    ? d.results
    : Array.isArray(d?.data)
    ? d.data
    : [];

const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const getLessonPk = (obj) =>
  toInt(obj?.lessonId) ??
  toInt(obj?.lesson_id) ??
  toInt(obj?.lesson) ??
  toInt(obj?.db_id) ??
  toInt(obj?.id);

const getCourseIdFromLesson = (l) =>
  toInt(l?.courseId) ?? toInt(l?.course) ?? toInt(l?.course_id);

const pick = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "") ?? "—";

const Badge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    completed: "success",
    in_progress: "warning",
    "in progress": "warning",
    not_started: "secondary",
    "not started": "secondary",
  };
  const tone = map[s] || "secondary";
  const label =
    s === "in_progress"
      ? "In Progress"
      : (s || "—").replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`badge badge-${tone}`}>{label}</span>;
};

/* --------------- main ---------------- */

const TrainerProgress = () => {
  // catalogs
  const [lessonCatalog, setLessonCatalog] = useState([]); // all lessons
  const [courseCatalog, setCourseCatalog] = useState([]); // course meta

  // progress + summary
  const [lessonProgress, setLessonProgress] = useState([]); // touched lessons only
  const [courseSummary, setCourseSummary] = useState([]);   // backend per-course summary

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatingKey, setUpdatingKey] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [lc, lp, cs, cc] = await Promise.all([
          fetchLessons(),
          fetchTrainerLessonProgress(),
          fetchTrainerCourseProgress(),
          fetchCourses(),
        ]);

        if (!lc.success) throw lc.error;
        setLessonCatalog(toArray(lc.data));

        setLessonProgress(lp.success ? toArray(lp.data) : []);
        setCourseSummary(cs.success ? toArray(cs.data) : []);
        setCourseCatalog(cc.success ? toArray(cc.data) : []);
      } catch (e) {
        console.error(e);
        setErr("Failed to load trainer progress. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- build maps ---------- */

  // lessonId -> progress row
  const progressByLessonId = useMemo(() => {
    const m = new Map();
    for (const p of toArray(lessonProgress)) {
      const lid = getLessonPk(p);
      if (lid != null) m.set(lid, p);
    }
    return m;
  }, [lessonProgress]);

  // courseId -> { code, name }
  const courseMetaById = useMemo(() => {
    const m = new Map();

    // from /courses/
    for (const c of toArray(courseCatalog)) {
      const cid = toInt(c.id) ?? toInt(c.course_id) ?? toInt(c.pk);
      if (cid != null) {
        m.set(cid, {
          id: cid,
          code: pick(c.course_code, c.course_id, c.code, c.slug),
          name: pick(c.course_name, c.name, c.title),
        });
      }
    }

    // backfill from course summary
    for (const c of toArray(courseSummary)) {
      const cid = toInt(c.course_id) ?? toInt(c.id);
      if (cid == null) continue;
      const prev = m.get(cid) || {};
      m.set(cid, {
        id: cid,
        code: prev.code ?? pick(c.course_code),
        name: prev.name ?? pick(c.course_name),
      });
    }

    // last resort: derive from lessons
    for (const l of toArray(lessonCatalog)) {
      const cid = getCourseIdFromLesson(l);
      if (cid == null) continue;
      const prev = m.get(cid) || {};
      m.set(cid, {
        id: cid,
        code: prev.code ?? pick(l.course_code),
        name: prev.name ?? pick(l.courseName, l.course_name),
      });
    }

    return m;
  }, [courseCatalog, courseSummary, lessonCatalog]);

  // group FULL lesson catalog by course
  const lessonsByCourse = useMemo(() => {
    const m = new Map();
    for (const l of toArray(lessonCatalog)) {
      const cid = getCourseIdFromLesson(l);
      if (cid == null) continue;
      if (!m.has(cid)) m.set(cid, []);
      m.get(cid).push(l);
    }
    return m;
  }, [lessonCatalog]);

  // build render sections from catalog + merged progress
  const sections = useMemo(() => {
    const out = [];
    for (const [courseId, courseLessons] of lessonsByCourse.entries()) {
      const meta = courseMetaById.get(courseId) || {
        id: courseId,
        code: "",
        name: "—",
      };

      // merge per-lesson progress (default to not_started)
      const mergedLessons = courseLessons.map((L) => {
        const lid = getLessonPk(L) ?? toInt(L.id);
        const p = lid != null ? progressByLessonId.get(lid) : null;
        return {
          lessonId: lid,
          lessonName: pick(L.name, L.lesson_name, L.title),
          status: (p?.status || "not_started"),
          percent: p?.percent ?? 0,
          started_at: p?.started_at ?? null,
          completed_at: p?.completed_at ?? null,
          last_accessed_at: p?.last_accessed_at ?? null,
        };
      });

      // compute counts from merged data (truth is catalog, not progress list)
      const total = mergedLessons.length;
      const done = mergedLessons.filter(
        (r) => (r.status || "").toLowerCase() === "completed"
      ).length;
      const percent = total ? Math.round((done / total) * 100) : 0;

      out.push({
        id: courseId,
        code: meta.code,
        name: meta.name,
        totalLessons: total,
        completedLessons: done,
        percent,                // derive from catalog to avoid mismatches
        lessons: mergedLessons,
      });
    }

    // sort by percent desc, then by name
    out.sort(
      (a, b) =>
        (b.percent - a.percent) ||
        String(a.name).localeCompare(String(b.name))
    );
    return out;
  }, [lessonsByCourse, courseMetaById, progressByLessonId]);

  // overall
  const overall = useMemo(() => {
    const total = sections.reduce((a, s) => a + s.totalLessons, 0);
    const done = sections.reduce((a, s) => a + s.completedLessons, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [sections]);

  /* ---------- update ---------- */

  const handleUpdate = async (_courseId, lessonRow, action) => {
    const lessonId = getLessonPk(lessonRow);
    if (!lessonId) return;

    const key = `${lessonId}:${action}`;
    setUpdatingKey(key);
    try {
      const res = await updateTrainerLessonProgress(lessonId, action);
      if (!res.success) {
        alert("Failed to update progress");
        return;
      }

      // optimistic local merge
      setLessonProgress((prev) => {
        const next = toArray(prev).slice();
        const idx = next.findIndex((p) => getLessonPk(p) === lessonId);
        const nowISO = new Date().toISOString();
        const base =
          idx >= 0
            ? { ...next[idx] }
            : { lesson: lessonId, percent: 0, status: "not_started" };

        if (action === "start") {
          base.status = "in_progress";
          base.started_at = base.started_at || nowISO;
        } else if (action === "complete") {
          base.status = "completed";
          base.percent = 100;
          base.started_at = base.started_at || nowISO;
          base.completed_at = nowISO;
        }

        if (idx >= 0) next[idx] = base;
        else next.push(base);
        return next;
      });

      // refresh server summary (optional, our header already derives)
      const cs = await fetchTrainerCourseProgress();
      if (cs.success) setCourseSummary(toArray(cs.data));
    } catch (e) {
      console.error(e);
      alert("Error updating progress");
    } finally {
      setUpdatingKey(null);
    }
  };

  /* ---------- render ---------- */

  if (loading) return <div className="loader">Loading...</div>;
  if (err) return <div className="error">{err}</div>;

  return (
    <div className="training-report-container mt-4 mb-4 shadow-none rounded">
      <div className="report-card">
        <h2 className="report-title m-0">
          <i className="bi bi-bar-chart-line-fill" style={{ color: "#FFFFFF" }}></i>{" "}
          Trainer Progress
        </h2>

        {/* Overall */}
        <div className="overall-wrap">
          <div className="overall-chip">
            Overall Completion
            <span className="overall-value">{overall.pct}%</span>
          </div>
          <div className="overall-mini">
            {overall.done} / {overall.total} lessons
          </div>
        </div>

        {/* Per-course sections */}
        <div className="mt-3">
          {sections.length === 0 ? (
            <p className="no-data">No courses found.</p>
          ) : (
            sections.map((course) => (
              <section key={course.id} className="mb-4 course-block">
                {/* Course header */}
                <div className="course-header">
                  <div className="course-title">
                    <strong className="mono">{course.code || "—"}</strong>
                    <span className="ms-2">{course.name}</span>
                  </div>
                  <div className="course-stats">
                    <div className="progress slim">
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${course.percent || 0}%` }}
                        aria-valuenow={course.percent || 0}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        {course.percent || 0}%
                      </div>
                    </div>
                    <div className="text-muted small ms-2">
                      {course.completedLessons} / {course.totalLessons} lessons
                    </div>
                  </div>
                </div>

                {/* Lesson table */}
                <div className="table-wrapper table-responsive mt-2">
                  <table className="report-table bordered table-hover">
                    <thead>
                      <tr>
                        <th>Lesson</th>
                        <th style={{ width: 140 }}>Status</th>
                        <th style={{ width: 110 }}>Percent</th>
                        <th style={{ width: 180 }}>Started</th>
                        <th style={{ width: 180 }}>Completed</th>
                        <th style={{ width: 180 }}>Last Accessed</th>
                        <th style={{ width: 230 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.lessons.map((l) => {
                        const lid = getLessonPk(l);
                        const updatingStart = updatingKey === `${lid}:start`;
                        const updatingComplete = updatingKey === `${lid}:complete`;
                        return (
                          <tr key={lid ?? `${course.id}-${l.lessonName}`}>
                            <td>{l.lessonName}</td>
                            <td><Badge status={l.status} /></td>
                            <td className="mono">{l.percent}%</td>
                            <td>
                              {l.started_at
                                ? new Date(l.started_at).toLocaleString()
                                : "—"}
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
                                    onClick={() => handleUpdate(course.id, l, "start")}
                                  >
                                    {updatingStart ? "..." : "Mark Started"}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-success"
                                    disabled={updatingComplete}
                                    onClick={() => handleUpdate(course.id, l, "complete")}
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
                    Showing {course.lessons.length} record
                    {course.lessons.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerProgress;
