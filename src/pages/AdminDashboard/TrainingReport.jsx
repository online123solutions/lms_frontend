// src/components/TrainingReport.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import { trainingService, getDetailedTrainingReport } from "../../api/adminAPIservice"; 
import "../../utils/css/Trainer CSS/TrainingReport.css";

const TrainingReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const token = localStorage.getItem("authToken");

  // Filter report data based on department
  const filteredReportData = useMemo(() => {
    if (!departmentFilter) return reportData;
    return reportData.filter(item => item.department === departmentFilter);
  }, [reportData, departmentFilter]);

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

  const handleViewDetails = (user) => {
    setSelectedUser(user);
  };

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
    <div className="admin-training-report">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white m-0">
          <i className="bi bi-file-earmark-bar-graph" style={{ color: "#FFFFFF" }}></i>
          {" "}
          Training Report
        </h2>
      </div>
      <div className="report-content">
        {filteredReportData.length === 0 ? (
          <p className="no-data">
            {departmentFilter ? `No data available for department: ${departmentFilter}` : 'No data available.'}
          </p>
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
                  <th>
                    <Form.Select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="form-select form-select-sm"
                      style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                    >
                      <option value="">All Departments</option>
                      {[...new Set(reportData.map(item => item.department).filter(Boolean))].map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </Form.Select>
                  </th>
                  <th>Designation</th>
                  <th>Trainer Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportData.map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.user_id}</td>
                    <td>{user.username}</td>
                    <td>{user.name || "N/A"}</td>
                    <td>{user.role}</td>
                    <td>{user.employee_id || "N/A"}</td>
                    <td>{user.department || "N/A"}</td>
                    <td>{user.designation || "N/A"}</td>
                    <td>{user.trainer_name || "N/A"}</td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
    </>
  );
};

export default TrainingReport;