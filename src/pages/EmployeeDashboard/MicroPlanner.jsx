import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainee CSS/Microplanner.css";
import {
  fetchMicroPlanner,
} from "../../api/employeeAPIservice";

const MicroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPlanner, setCurrentPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekOptions = [
    "Week 1", "Week 2", "Week 3", "Week 4"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMicroPlanner();
        if (result.success) {
          setPlanners(result.data);
          const uniqueWeeks = [...new Set(result.data.map((p) => p.week))];
          setWeeks(uniqueWeeks);
        } else {
          setError("Failed to fetch microplanner data.");
        }
      } catch (error) {
        setError("An error occurred while fetching microplanner data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    console.log("Component mounted and data fetched");
  }, []);

  const handleShowModal = (planner) => {
    setCurrentPlanner(planner);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentPlanner(null);
  };

  const filteredPlanners = planners.filter((p) =>
    selectedWeek ? p.week === selectedWeek : true
  );

  return (
    <div className="macro-planner container">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white">
          <i className="bi bi-calendar-check me-2"></i>
          Planner
        </h2>
        <Form.Select
          className="w-auto border-primary shadow-sm"
          onChange={(e) => setSelectedWeek(e.target.value)}
          value={selectedWeek}
        >
          <option value="">All Weeks</option>
          {weekOptions.map((week) => (
            <option key={week} value={week}>
              {week}
            </option>
          ))}
        </Form.Select>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="success" />
        </div>
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle shadow-sm macro-planner-table">
            <thead className="table-custom">
              <tr>
                <th>Month</th>
                <th>Week</th> {/* Updated from Month to Week */}
                <th>Days & Modules</th>
                <th>Department</th>
                <th>Sessions</th>
                <th>Mode</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanners.length > 0 ? (
                filteredPlanners.map((planner) => {
                  const days = planner.days ? planner.days.split(",").map((d) => d.trim()) : [];
                  const modules = Array.isArray(planner.name_of_topic) ? planner.name_of_topic : [];
                  const dayModuleList = days.map((day, index) => `${day}: ${modules[index] || "N/A"}`).join(", ");
                  return (
                    <tr key={planner.id}>
                      <td>{planner.month}</td>
                      <td>{planner.week}</td> {/* Updated from Month to Week */}
                      <td>{dayModuleList || "N/A"}</td>
                      <td>{planner.department}</td>
                      <td>{planner.no_of_sessions}</td>
                      <td>{planner.mode}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleShowModal(planner)}
                        >
                          <i className="bi bi-eye"></i> View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No Microplanner found for selected week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} centered className="microplanner-modal">
        <Modal.Header closeButton>
          <Modal.Title>MicroPlanner Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body-scroll">
          {currentPlanner && (
            <Form>
              <Form.Group className="mb-3" controlId="formWeek">
                <Form.Label>Week</Form.Label>
                <Form.Control
                  type="text"
                  value={currentPlanner.week}
                  readOnly
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formDays">
                <Form.Label>Days & Modules</Form.Label>
                <Form.Control
                  as="textarea"
                  value={
                    currentPlanner.days
                      ? currentPlanner.days
                          .split(",")
                          .map((d) => d.trim())
                          .map((day, index) => `${day}: ${currentPlanner.name_of_topic[index] || "N/A"}`)
                          .join("\n")
                      : "N/A"
                  }
                  readOnly
                  style={{ height: "auto", minHeight: "60px", maxHeight: "120px", overflowY: "auto" }}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formDepartment">
                <Form.Label>Department</Form.Label>
                <Form.Control
                  type="text"
                  value={currentPlanner.department}
                  readOnly
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formSessions">
                <Form.Label>No. of Sessions</Form.Label>
                <Form.Control
                  type="text"
                  value={currentPlanner.no_of_sessions}
                  readOnly
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formMode">
                <Form.Label>Mode</Form.Label>
                <Form.Control
                  type="text"
                  value={currentPlanner.mode}
                  readOnly
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MicroPlanner;