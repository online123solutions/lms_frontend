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
    <div className="training-report-container mt-2 mb-4 shadow-sm rounded">
      <div className="report-card">
        <h2 className="report-title">
          <i className="bi bi-file-earmark-bar-graph" style={{ color: "#FFFFFF" }}></i>Training Report
        </h2>
        {reportData.length === 0 ? (
          <p className="no-data">No data available.</p>
        ) : (
          <div className="table-wrapper table-responsive">
            <table className="report-table bordered table-hover">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Trainer Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.username}</td>
                    <td>{user.name || "N/A"}</td>
                    <td>{user.role}</td>
                    <td>{user.employee_id || "N/A"}</td>
                    <td>{user.department || "N/A"}</td>
                    <td>{user.designation || "N/A"}</td>
                    <td>{user.trainer_name || "N/A"}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/training-report/${user.user_id}`)}
                      >
                        View Details
                      </button>
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