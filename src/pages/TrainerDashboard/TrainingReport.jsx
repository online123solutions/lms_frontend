// src/components/TrainingReport.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import { trainingService, getDetailedTrainingReport } from "../../api/trainerAPIservice";
import "../../utils/css/Trainer CSS/TrainingReport.css";

const TrainingReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  const uniqueDepts = useMemo(() => {
    const depts = [...new Set(reportData.map(u => u.department).filter(Boolean))].sort();
    return depts;
  }, [reportData]);

  const filteredRows = useMemo(() => {
    let rows = reportData;
    if (selectedDept) {
      rows = rows.filter(u => (u.department ?? "") === selectedDept);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((u) => {
        const empId = (u.employee_id ?? "").toString().toLowerCase();
        const name = (u.name ?? "").toLowerCase();
        const username = (u.username ?? "").toLowerCase();
        return empId.includes(q) || name.includes(q) || username.includes(q);
      });
    }
    return rows;
  }, [reportData, query, selectedDept]);

  // Fetch user details when a user is selected
  useEffect(() => {
    if (selectedUser) {
      const fetchUserDetails = async () => {
        try {
          setDetailsLoading(true);
          setDetailsError(null);
          const data = await getDetailedTrainingReport(selectedUser.user_id);
          setUserDetails(data);
          setShowModal(true);
        } catch (err) {
          setDetailsError("Failed to fetch user details. Please try again.");
          console.error(err);
        } finally {
          setDetailsLoading(false);
        }
      };

      fetchUserDetails();
    }
  }, [selectedUser]);

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setUserDetails(null);
    setDetailsError(null);
  };

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
    <div className="training-report">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white m-0">
          <i className="bi bi-file-earmark-bar-graph" style={{ color: "#FFFFFF" }}></i>
          {" "}
          Training Report
        </h2>

        {/* Search box */}
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

        {filteredRows.length === 0 ? (
          <div className="text-center my-5">
            <div className="alert alert-info">
              {reportData.length === 0
                ? "No data available."
                : "No matches found for your search."}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle shadow-sm">
              <thead className="table-custom">
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  {/* <th>Role</th> */}
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
                        onClick={() => setSelectedUser(user)}
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

      {/* User Details Modal */}
      <Modal 
        show={showModal} 
        onHide={handleCloseModal}
        size="lg"
        centered
        className="user-details-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-bar-graph me-2"></i>
            Detailed Training Report - {selectedUser?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsLoading && (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading user details...</p>
            </div>
          )}
          
          {detailsError && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {detailsError}
            </div>
          )}
          
          {userDetails && !detailsLoading && (
            <div className="user-details-content">
              {/* User Information */}
              <div className="user-info-section mb-4">
                <h5 className="mb-3">
                  <i className="bi bi-person-circle me-2"></i>
                  User Information
                </h5>
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>User ID:</strong> {userDetails.user_id}</p>
                    <p><strong>Name:</strong> {userDetails.name}</p>
                    <p><strong>Username:</strong> {userDetails.username}</p>
                    <p><strong>Role:</strong> {userDetails.role}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Employee ID:</strong> {userDetails.employee_id || "N/A"}</p>
                    <p><strong>Department:</strong> {userDetails.department || "N/A"}</p>
                    <p><strong>Trainer:</strong> {userDetails.trainer_name || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Lessons Table */}
              <div className="lessons-section">
                <h5 className="mb-3">
                  <i className="bi bi-book me-2"></i>
                  Training Progress
                </h5>
                {userDetails.completed_lessons && userDetails.completed_lessons.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Lesson Title</th>
                          <th>Status</th>
                          <th>Completed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetails.completed_lessons.map((lesson, index) => (
                          <tr key={index}>
                            <td>{lesson.lesson_title || lesson.title || "N/A"}</td>
                            <td>
                              <span className="badge bg-success">
                                Completed
                              </span>
                            </td>
                            <td>{lesson.completed_at || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No lessons found for this user.
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            <i className="bi bi-x-circle me-2"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TrainingReport;
