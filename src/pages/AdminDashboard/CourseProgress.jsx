// src/components/CourseProgress.jsx  (Admin view)
import React, { useEffect, useMemo, useState } from "react";
import { fetchAdminLessonRows } from "../../api/adminAPIservice";
import "../../utils/css/Trainer CSS/TrainerProgress.css";

const toArray = (d) =>
  Array.isArray(d)
    ? d
    : Array.isArray(d?.results)
    ? d.results
    : Array.isArray(d?.data)
    ? d.data
    : [];

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

const Badge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const tone =
    s === "completed"
      ? "success"
      : s === "in_progress" || s === "in progress"
      ? "warning"
      : "secondary";
  const label =
    s === "in_progress"
      ? "In Progress"
      : (s || "—").replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`badge badge-${tone}`}>{label}</span>;
};

export default function CourseProgress() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchAdminLessonRows();
        if (!res.success) throw new Error(res.error?.message || "Failed");
        setRows(toArray(res.data));
      } catch (e) {
        console.error(e);
        setErr("Failed to load admin lesson progress.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Build: courses[] -> {
   *   courseId, courseName, courseCode,
   *   trainers: [{trainerId, trainer, dept, lessons:[{lessonId, lessonName, ...}], total, completed, percent}],
   *   trainerCount, totalLessonsObserved, avgPercent
   * }
   */
  const courses = useMemo(() => {
    const byCourse = new Map();

    for (const r of rows) {
      const courseId  = r.course_id ?? r.course_pk ?? r.course;
      const courseName = r.course_name || "";     // NEW name from API
      const courseCode = r.course_code || "";     // NEW code/slug from API

      if (!byCourse.has(courseId)) {
        byCourse.set(courseId, {
          courseId,
          courseName,               // store name if present
          courseCode,               // store code if present
          trainers: new Map(),      // trainerId -> trainer bucket
          lessonIdsUnique: new Set()
        });
      }
      const bucket = byCourse.get(courseId);
      // backfill if subsequent rows carry names
      if (!bucket.courseName && courseName) bucket.courseName = courseName;
      if (!bucket.courseCode && courseCode) bucket.courseCode = courseCode;

      const trainerId = r.trainer_id ?? r.trainer_user_id ?? r.trainer;
      if (!bucket.trainers.has(trainerId)) {
        bucket.trainers.set(trainerId, {
          trainerId,
          trainer: r.trainer_name || r.trainer_username || `trainer-${trainerId}`,
          dept: r.department || "—",
          lessons: []
        });
      }
      const T = bucket.trainers.get(trainerId);

      // push lesson row with lesson name
      T.lessons.push({
        lessonId: r.lesson_id,
        lessonName: r.lesson_name || `#${r.lesson_id}`, // name if present, else #id
        status: r.status,
        percent: Number(r.percent) || 0,
        started_at: r.started_at,
        completed_at: r.completed_at,
        last_accessed_at: r.last_accessed_at
      });

      if (r.lesson_id != null) bucket.lessonIdsUnique.add(r.lesson_id);
    }

    // finalize array + compute trainer and course percentages
    const out = [];
    for (const [, c] of byCourse.entries()) {
      const trainers = Array.from(c.trainers.values()).map((t) => {
        const total = t.lessons.length;
        const done = t.lessons.filter((L) => (L.status || "").toLowerCase() === "completed").length;
        return {
          ...t,
          total,
          completed: done,
          percent: pct(done, total)
        };
      });

      const trainerCount = trainers.length || 1;
      const avgPercent =
        Math.round(
          trainers.reduce((a, t) => a + (Number(t.percent) || 0), 0) / trainerCount
        ) || 0;

      out.push({
        courseId: c.courseId,
        courseName: c.courseName,      // kept
        courseCode: c.courseCode,      // kept
        trainers,
        trainerCount,
        totalLessonsObserved: c.lessonIdsUnique.size,
        avgPercent
      });
    }

    // sort by course avg desc, then by course name/code/id
    out.sort((a, b) => {
      const p = b.avgPercent - a.avgPercent;
      if (p) return p;
      const aKey = (a.courseName || a.courseCode || String(a.courseId)).toLowerCase();
      const bKey = (b.courseName || b.courseCode || String(b.courseId)).toLowerCase();
      return aKey.localeCompare(bKey);
    });

    return out;
  }, [rows]);

  // Overall header
  const overall = useMemo(() => {
    if (!courses.length) return { avg: 0, courses: 0, trainers: 0 };
    const avg =
      Math.round(
        courses.reduce((a, c) => a + (Number(c.avgPercent) || 0), 0) / courses.length
      ) || 0;
    const trainers = courses.reduce((a, c) => a + c.trainerCount, 0);
    return { avg, courses: courses.length, trainers };
  }, [courses]);

  if (loading) return <div className="loader">Loading...</div>;
  if (err) return <div className="error">{err}</div>;

  return (
    <div className="training-report-container mt-2 mb-4 shadow-none rounded">
      <div className="report-card">
        <h2 className="report-title m-0">
          <i className="bi bi-bar-chart-line-fill" style={{ color: "#FFFFFF" }}></i>{" "}
          Admin · Course Progress
        </h2>

        <div className="overall-wrap">
          <div className="overall-chip">
            Avg Completion
            <span className="overall-value">{overall.avg}%</span>
          </div>
          <div className="overall-mini">
            {overall.courses} courses · {overall.trainers} trainers
          </div>
        </div>

        <div className="mt-3">
          {!courses.length ? (
            <p className="no-data">No data.</p>
          ) : (
            courses.map((course) => (
              <section key={course.courseId} className="mb-4 course-block">
                {/* Course header */}
                {/* === Course header === */}
                <div className="course-header is-admin">
                <div className="course-title">
                    <div className="course-line">
                    <strong className="mono course-code">
                        {course.courseCode || `course_${course.courseId}`}
                    </strong>
                    {course.courseName && <span className="divider">·</span>}
                    <span className="course-name">{course.courseName || "Intro to Course"}</span>
                    </div>

                    <div className="muted-line">
                    <span className="muted">{course.trainerCount} trainer{course.trainerCount !== 1 ? "s" : ""}</span>
                    <span className="dot" />
                    <span className="muted">{course.totalLessonsObserved} observed lessons</span>
                    </div>
                </div>

                <div className="course-stats">
                    <div className="progress slim pretty">
                    <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${course.avgPercent}%` }}
                        aria-valuenow={course.avgPercent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                    />
                    </div>
                    <div className="pill-value">{course.avgPercent}%</div>
                </div>
                </div>


                {/* Trainer breakdown table */}
                <div className="table-wrapper table-responsive mt-2">
                  <table className="report-table bordered table-hover">
                    <thead>
                      <tr>
                        <th>Trainer</th>
                        <th>Department</th>
                        <th style={{ width: 130, textAlign: "right" }}>Completed</th>
                        <th style={{ width: 140 }}>Percent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.trainers
                        .sort(
                          (a, b) =>
                            b.percent - a.percent ||
                            String(a.trainer).localeCompare(String(b.trainer))
                        )
                        .map((t) => (
                          <React.Fragment key={`${course.courseId}-${t.trainerId}`}>
                            <tr>
                              <td>{t.trainer}</td>
                              <td className="mono">{t.dept}</td>
                              <td className="mono" style={{ textAlign: "right" }}>
                                {t.completed} / {t.total}
                              </td>
                              <td>
                                <div className="progress tiny">
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${t.percent}%` }}
                                    aria-valuenow={t.percent}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  >
                                    {t.percent}%
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded: raw lesson rows for this trainer/course with names */}
                            <tr>
                              <td colSpan={4} style={{ background: "#fafafa" }}>
                                <div className="text-muted small">
                                  {t.lessons.length ? (
                                    <div className="lesson-rows">
                                      <div className="lesson-rows-title">Lesson rows:</div>
                                      <div className="lesson-rows-grid">
                                        {t.lessons.map((L) => (
                                          <div key={`${t.trainerId}-${L.lessonId}`} className="lesson-row-pill pretty">
                                            <div className="pill-left">
                                                <span className="pill-title">{L.lessonName || `#${L.lessonId}`}</span>
                                                <Badge status={L.status} />
                                            </div>
                                            <div className="pill-right">
                                                {/* <span className="mono strong">{L.percent}%</span> */}
                                                <span className="muted">
                                                {L.completed_at
                                                    ? new Date(L.completed_at).toLocaleString()
                                                    : L.started_at
                                                    ? new Date(L.started_at).toLocaleString()
                                                    : L.last_accessed_at
                                                    ? new Date(L.last_accessed_at).toLocaleString()
                                                    : "—"}
                                                </span>
                                            </div>
                                            </div>

                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <em>No lesson rows</em>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                  <div className="text-muted small mt-2">
                    {course.trainerCount} trainer record
                    {course.trainerCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
