// src/components/TrainingReport.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { trainingService } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainingReport.css";

const TrainingReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(""); // NEW: search query
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (!token) {
          navigate("/login");
          return;
        }
        const data = await trainingService();
        setReportData(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to fetch training report. Please try again or contact an admin.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [navigate, token]);

  // NEW: memoized filtered rows (search by employee_id or name; also checks username)
  const filteredRows = useMemo(() => {
    if (!query.trim()) return reportData;
    const q = query.trim().toLowerCase();

    return reportData.filter((u) => {
      const empId = (u.employee_id ?? "").toString().toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      const username = (u.username ?? "").toLowerCase();
      return empId.includes(q) || name.includes(q) || username.includes(q);
    });
  }, [reportData, query]);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="training-report-container mb-4 shadow-sm rounded">
      <div className="report-card">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
          <h2 className="report-title m-0">
            <i className="bi bi-file-earmark-bar-graph" style={{ color: "#FFFFFF" }}></i>
            {" "}
            Training Report
          </h2>

          {/* NEW: Search box */}
          <div className="search-wrap d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Employee ID or Name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: 260 }}
              aria-label="Search by Employee ID or Name"
            />
            {query && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <p className="no-data mt-3">
            {reportData.length === 0
              ? "No data available."
              : "No matches found for your search."}
          </p>
        ) : (
          <div className="table-wrapper table-responsive mt-3">
            <table className="report-table bordered table-hover">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  {/* <th>Role</th> */}
                  <th>Employee ID</th>
                  <th>Department</th>
                  {/* <th>Designation</th> */}
                  {/* <th>Trainer Name</th> */}
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.username}</td>
                    <td>{user.name || "N/A"}</td>
                    {/* <td>{user.role}</td> */}
                    <td>{user.employee_id || "N/A"}</td>
                    <td>{user.department || "N/A"}</td>
                    {/* <td>{user.designation || "N/A"}</td> */}
                    {/* <td>{user.trainer_name || "N/A"}</td> */}
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

            {/* Optional: small helper text */}
            <div className="text-muted small mt-2">
              Showing {filteredRows.length} of {reportData.length} records
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingReport;
