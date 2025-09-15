// src/components/DetailedTrainingReport.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDetailedTrainingReport } from '../../api/trainerAPIservice';
import "../../utils/css/Trainer CSS/TrainingReport.css";

const DetailedTrainingReport = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetailedReport = async () => {
      try {
        const data = await getDetailedTrainingReport(userId);
        setReportData(data);
      } catch (err) {
        setError("Failed to fetch detailed training report. Please try again or contact an admin.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedReport();
  }, [userId]);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!reportData) return <div className="no-data">No data available.</div>;

  return (
    <div className="training-report-container mt-4 mb-4 shadow-sm rounded">
      <div className="report-card">
        <h2 className="report-title">
          <svg
            className="icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="3.5" width="16" height="17" rx="2.5"/>
            <rect x="9" y="2" width="6" height="3" rx="1.5"/>
            <polygon points="12,6.5 16,8.2 12,9.9 8,8.2 12,6.5"/>
            <path d="M16 8.2v2.1"/>
            <path d="M7 11h10"/>
            <path d="M7 14h4"/>
            <path d="M8 16.5l2 2l4-4"/>
          </svg>
          Detailed Training Report - {reportData.username}
        </h2>
        <div className="table-wrapper table-responsive">
          <table className="report-table bordered table-hover">
            <thead>
              <tr>
                <th>Lesson Title</th>
                <th>Status</th>
                <th>Completed At</th>
                <th>Duration</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {reportData.completed_lessons.map((lesson, index) => (
                <tr key={index}>
                  <td>{lesson.lesson_title}</td>
                  <td>{lesson.completed ? "Completed" : "In Progress"}</td>
                  <td>{lesson.completed_at ? new Date(lesson.completed_at).toLocaleString() : "N/A"}</td>
                  <td>{lesson.duration || "N/A"}</td>
                  <td>{lesson.score || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/training-report')}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedTrainingReport;