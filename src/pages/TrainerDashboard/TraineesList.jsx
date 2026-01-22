// src/pages/TrainerDashboard/TraineesList.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Table, Alert, Spinner } from "react-bootstrap";
import { fetchTrainees } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainingReport.css";

const TraineesList = () => {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadTrainees = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchTrainees();
        if (result.success) {
          setTrainees(result.data?.trainees || []);
        } else {
          const errorMsg = typeof result.error === 'string' 
            ? result.error 
            : result.error?.message || result.error?.detail || "Failed to fetch trainees";
          setError(errorMsg);
          setTrainees([]);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch trainees");
        setTrainees([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrainees();
  }, []);

  // Filter trainees based on search query
  const filteredTrainees = useMemo(() => {
    if (!query.trim()) return trainees;
    const q = query.trim().toLowerCase();
    return trainees.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const empId = (t.employee_id || "").toLowerCase();
      const email = (t.user?.email || "").toLowerCase();
      const username = (t.user?.username || "").toLowerCase();
      const dept = (t.department || "").toLowerCase();
      return name.includes(q) || empId.includes(q) || email.includes(q) || username.includes(q) || dept.includes(q);
    });
  }, [trainees, query]);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (loading) {
    return <div className="loader">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="training-report-container mb-4 shadow-sm rounded">
      <div className="report-card">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
          <h2 className="report-title m-0">
            <i className="bi bi-people" style={{ color: "#FFFFFF" }}></i>
            {" "}
            Total Trainees
          </h2>

          {/* Search box */}
          <div className="search-wrap d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name, ID, Email, or Department"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: 260 }}
              aria-label="Search trainees"
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

        {filteredTrainees.length === 0 ? (
          <div className="p-4 text-center text-muted">
            <p>{query ? "No trainees found matching your search." : "No trainees found."}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "70px" }}>Photo</th>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Email</th>
                  <th>Username</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainees.map((trainee, index) => (
                  <tr key={index}>
                    <td className="text-center align-middle">
                      {trainee.profile_picture && !trainee.profile_picture.includes("default_profile") ? (
                        <img
                          src={trainee.profile_picture}
                          alt={trainee.name}
                          style={{
                            width: "45px",
                            height: "45px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: "45px",
                          height: "45px",
                          borderRadius: "50%",
                          backgroundColor: "#6c757d",
                          color: "white",
                          fontSize: "16px",
                          fontWeight: "bold",
                          margin: "0 auto",
                          display: !trainee.profile_picture || trainee.profile_picture.includes("default_profile") ? "flex" : "none",
                        }}
                      >
                        {getInitials(trainee.name)}
                      </div>
                    </td>
                    <td className="align-middle" style={{ fontWeight: "500" }}>{trainee.name || "N/A"}</td>
                    <td className="align-middle">{trainee.employee_id || "N/A"}</td>
                    <td className="align-middle">{trainee.department || "N/A"}</td>
                    <td className="align-middle">{trainee.designation || "N/A"}</td>
                    <td className="align-middle">{trainee.user?.email || "N/A"}</td>
                    <td className="align-middle">{trainee.user?.username || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        {query && filteredTrainees.length > 0 && (
          <div className="p-2 text-muted small text-end">
            Showing {filteredTrainees.length} of {trainees.length} trainees
          </div>
        )}
      </div>
    </div>
  );
};

export default TraineesList;
