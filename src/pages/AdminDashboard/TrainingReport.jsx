// src/components/TrainingReport.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trainingService } from "../../api/adminAPIservice"; // Import from trainerAPIservice.js
import "../../utils/css/Trainer CSS/TrainingReport.css";

const TrainingReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (!token) {
          navigate("/login");
          return;
        }
        const data = await trainingService();
        setReportData(data);
      } catch (err) {
        setError("Failed to fetch training report. Please try again or contact an admin.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [navigate, token]);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="training-report-container">
      <div className="report-card">
        <h2 className="report-title">Training Report</h2>
        {reportData.length === 0 ? (
          <p className="no-data">No data available.</p>
        ) : (
          <div className="table-responsive">
            <table className="report-table table table-bordered table-hover align-middle shadow-sm">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Trainer Name</th>
                  <th>Completed Lessons</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.username}</td>
                    <td>{user.name || "N/A"}</td>
                    <td>{user.role}</td>
                    <td>{user.employee_id || "N/A"}</td>
                    <td>{user.department || "N/A"}</td>
                    <td>{user.designation || "N/A"}</td>
                    <td>{user.trainer_name || "N/A"}</td>
                    <td>
                      <ul className="lesson-list">
                        {user.completed_lessons.map((lesson, index) => (
                          <li key={index}>
                            {lesson.lesson_title} - {lesson.completed ? "Completed" : "In Progress"} ({new Date(lesson.completed_at).toLocaleString()})
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingReport;