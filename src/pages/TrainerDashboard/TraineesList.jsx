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
  const [selectedDept, setSelectedDept] = useState("");

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

  const uniqueDepts = useMemo(() => {
    return [...new Set(trainees.map(t => t.department).filter(Boolean))].sort();
  }, [trainees]);

  const filteredTrainees = useMemo(() => {
    let rows = trainees;
    if (selectedDept) {
      rows = rows.filter(t => (t.department || "") === selectedDept);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((t) => {
        const name = (t.name || "").toLowerCase();
        const empId = (t.employee_id || "").toLowerCase();
        const email = (t.user?.email || "").toLowerCase();
        const username = (t.user?.username || "").toLowerCase();
        const dept = (t.department || "").toLowerCase();
        return name.includes(q) || empId.includes(q) || email.includes(q) || username.includes(q) || dept.includes(q);
      });
    }
    return rows;
  }, [trainees, query, selectedDept]);

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
    <>
      <div className="trainees-list">
        <div className="d-flex justify-content-between align-items-center mb-4 header">
          <h2 className="fw-bold text-white m-0">
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
            {(query || selectedDept) && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => { setQuery(""); setSelectedDept(""); }}
                aria-label="Clear filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredTrainees.length === 0 ? (
          <div className="text-center my-5">
            <div className="alert alert-info">
              {query ? "No trainees found matching your search." : "No trainees found."}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover className="table table-bordered table-hover align-middle shadow-sm">
              <thead className="table-custom">
                <tr>
                  <th style={{ width: "70px" }}>Photo</th>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>
                    <select
                      value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: "auto",
                        background: "transparent",
                        color: "#fff",
                        border: "none",
                        outline: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        appearance: "auto",
                        padding: 0,
                      }}
                    >
                      <option value="" style={{ color: "#333", background: "#fff", fontWeight: 600 }}>All Departments</option>
                      {uniqueDepts.map(d => (
                        <option key={d} value={d} style={{ color: "#333", background: "#fff", fontWeight: 400, textTransform: "none" }}>{d}</option>
                      ))}
                    </select>
                  </th>
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
                      ) : (
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
                            display: "flex",
                          }}
                        >
                          {getInitials(trainee.name)}
                        </div>
                      )}
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
        {(query || selectedDept) && filteredTrainees.length > 0 && (
          <div className="p-2 text-muted small text-end">
            Showing {filteredTrainees.length} of {trainees.length} trainees
          </div>
        )}
      </div>
    </>
  );
};

export default TraineesList;
