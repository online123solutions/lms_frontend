// src/pages/TrainerDashboard/DetailedTrainingReport.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDetailedTrainingReport } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainingReport.css";

const DetailedTrainingReport = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getDetailedTrainingReport(userId);
        if (!cancelled) setReportData(data);
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.statusText ||
          err?.message ||
          "Failed to fetch detailed training report.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, navigate]);

  if (loading) return <div className="loader">Loading...</div>;
  if (error)   return <div className="error">{error}</div>;
  if (!reportData) return <div className="no-data">No data available.</div>;

  const lessons = Array.isArray(reportData.completed_lessons)
    ? reportData.completed_lessons
    : [];

  return (
    <div className="training-report-container mt-4 mb-4 shadow-sm rounded">
      <div className="report-card">
        <h2 className="report-title">
          <i className="bi bi-file-earmark-bar-graph" />
          &nbsp;Detailed Training Report — {reportData.username}
        </h2>

        <div className="mb-3">
          <strong>User ID:</strong> {reportData.user_id} &nbsp;|&nbsp;
          <strong>Name:</strong> {reportData.name || "N/A"} &nbsp;|&nbsp;
          <strong>Role:</strong> {reportData.role} &nbsp;|&nbsp;
          <strong>Dept:</strong> {reportData.department || "N/A"} &nbsp;|&nbsp;
          <strong>Trainer:</strong> {reportData.trainer_name || "N/A"}
        </div>

        <div className="table-wrapper table-responsive">
          <table className="report-table bordered table-hover">
            <thead>
              <tr>
                <th>Lesson Title</th>
                <th>Status</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length ? (
                lessons.map((lesson, index) => (
                  <tr key={index}>
                    <td>{lesson.lesson_title || "Untitled"}</td>
                    <td>{lesson.completed ? "Completed" : "In Progress"}</td>
                    <td>{lesson.completed_at ? new Date(lesson.completed_at).toLocaleString() : "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center text-muted">No lessons found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedTrainingReport;
