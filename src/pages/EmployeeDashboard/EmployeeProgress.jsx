// src/components/trainee/TraineeProgress.jsx
import { useEffect, useState, useMemo } from "react";
import { Form, Spinner, ProgressBar } from "react-bootstrap";
import { getEmployeeProgress } from "../../api/employeeAPIservice";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css"; // reuse header + table styles

export default function EmployeeProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getEmployeeProgress(); // ensure endpoint is correct
        setData(res);
      } catch (e) {
        setErr("Failed to load progress.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = useMemo(() => {
    if (!data?.subjects) return [];
    return subjectFilter
      ? data.subjects.filter((s) => String(s.subject_id) === subjectFilter)
      : data.subjects;
  }, [data, subjectFilter]);

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
      </div>
    );
  }
  if (err) return <p className="text-danger text-center">{err}</p>;
  if (!data) return null;

  const totals = data.totals || {
    subjects_total: 0,
    lessons_total: 0,
    lessons_completed: 0,
    lessons_pending: 0,
    progress_pct: 0,
  };

  return (
    <div className="container mt-4">
      {/* Header bar (same look as Planner) */}
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white m-0 d-flex align-items-center gap-2">
          <i className="bi bi-bar-chart-line"></i> Progress
        </h2>

        {/* Subject filter (optional) */}
        <Form.Select
          className="w-auto border-primary shadow-sm"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="">All Subjects</option>
          {data.subjects.map((s) => (
            <option key={s.subject_id} value={s.subject_id}>
              {s.subject_name}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Overall row, Planner-like compact KPIs */}
      <div
        className="row g-3 mb-3"
        style={{ marginLeft: 0, marginRight: 0 }}
      >
        <div className="col-md-2">
          <div className="p-3 bg-white rounded-3 shadow-sm">
            <div className="text-muted small">Subjects</div>
            <div className="fs-4 fw-bold">{totals.subjects_total}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="p-3 bg-white rounded-3 shadow-sm">
            <div className="text-muted small">Lessons</div>
            <div className="fs-4 fw-bold">{totals.lessons_total}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="p-3 bg-white rounded-3 shadow-sm">
            <div className="text-muted small">Completed</div>
            <div className="fs-4 fw-bold">{totals.lessons_completed}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p-3 bg-white rounded-3 shadow-sm">
            <div className="d-flex justify-content-between">
              <div className="text-muted small">Overall Progress</div>
              <div className="fw-semibold">{totals.progress_pct}%</div>
            </div>
            <ProgressBar now={totals.progress_pct} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Subject-wise table (same visual language as Planner) */}
      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle shadow-sm macro-planner-table">
          <thead className="table-custom">
            <tr>
              <th>Subject</th>
              <th className="text-center">Total</th>
              <th className="text-center">Completed</th>
              <th className="text-center">Pending</th>
              <th style={{ width: 280 }}>Progress</th>
              <th>Last Completed</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length ? (
              subjects.map((s) => (
                <tr key={s.subject_id}>
                  <td className="fw-medium">{s.subject_name}</td>
                  <td className="text-center">{s.total_lessons}</td>
                  <td className="text-center">{s.completed_lessons}</td>
                  <td className="text-center">{s.pending_lessons}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="small fw-semibold" style={{ width: 42, textAlign: "right" }}>
                        {s.progress_pct}%
                      </span>
                      <ProgressBar now={s.progress_pct} style={{ width: 200 }} />
                    </div>
                  </td>
                  <td>
                    {s.last_completed_at
                      ? new Date(s.last_completed_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No progress available for the selected subject.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
