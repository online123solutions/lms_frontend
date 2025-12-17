import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import {
  fetchMacroPlanner,
  addMacroPlanner,
  updateMacroPlanner,
} from "../../api/trainerAPIservice";
import "../../index.css";

const MacroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPlanner, setCurrentPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const monthOptions = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const durationOptions = [
    "1 Month","2 Months","3 Months","4 Months","5 Months","6 Months",
  ];

  const departmentOptions = [
    "HR","IT","Finance","Marketing","Sales",
    "Operations","Support","Training","Development","Design",
  ];

  const weekOptions = ["week 1","week 2","week 3","week 4"];

  const roleOptions = [
    { value: "trainee", label: "Trainee" },
    { value: "employee", label: "Employee" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMacroPlanner();
        if (result.success) {
          setPlanners(result.data || []);
        } else {
          setError("Failed to fetch macroplanner data.");
        }
      } catch (err) {
        setError("An error occurred while fetching macroplanner data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleShowModal = (planner = null) => {
    setCurrentPlanner(planner);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentPlanner(null);
  };

  const handleSavePlanner = async (event) => {
    event.preventDefault();
    setLoading(true);
    const form = event.target;

    const newPlanner = {
      id: currentPlanner ? currentPlanner.id : null,
      month: form.elements.month.value,
      week: form.elements.week.value,
      duration: form.elements.duration.value,
      department: form.elements.department.value,
      module: form.elements.module.value,
      role: form.elements.role.value,
    };

    const result = currentPlanner
      ? await updateMacroPlanner(newPlanner)
      : await addMacroPlanner(newPlanner);

    if (result.success) {
      const updatedData = await fetchMacroPlanner();
      if (updatedData.success) setPlanners(updatedData.data || []);
      handleCloseModal();
    } else {
      console.error("Failed to save macroplanner:", result.error);
    }
    setLoading(false);
  };

  const filteredPlanners = planners.filter((p) =>
    selectedWeek ? p.week === selectedWeek : true
  );

  return (
    <div className="macro-planner container">
      {/* HEADER: now responsive using flex-column on mobile */}
      <div className="header d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-white mb-0">
          <i className="bi bi-calendar me-2" style={{ color: "#FFFFFF" }}></i>
          Road Map
        </h2>

        <Form.Select
          className="w-auto border-primary shadow-sm macro-filter-select"
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

        <Button
          variant="info"
          onClick={() => handleShowModal()}
          className="macro-btn shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>Add Road Map
        </Button>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : (
        <div className="table-responsive">
          <table className="macro-planner-table">
            <thead>
              <tr>
                <th>Duration</th>
                <th>Department</th>
                <th>Module</th>
                <th>Role</th>
                <th>Modify</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanners.length > 0 ? (
                filteredPlanners.map((planner) => (
                  <tr key={planner.id}>
                    <td data-label="Duration">{planner.duration}</td>
                    <td data-label="Department">{planner.department}</td>
                    <td data-label="Module">{planner.module}</td>
                    <td data-label="Role" className="text-capitalize">
                      {planner.role}
                    </td>
                    <td data-label="Modify">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="w-100 w-md-auto"
                        onClick={() => handleShowModal(planner)}
                      >
                        <i className="bi bi-pencil"></i> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  {/* colSpan fixed to 5 (number of columns) */}
                  <td colSpan="5" className="text-center text-muted">
                    No Macroplanner found for selected week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentPlanner ? "Modify MacroPlanner" : "Add MacroPlanner"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSavePlanner}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="formMonth">
              <Form.Label>Month</Form.Label>
              <Form.Select
                name="month"
                defaultValue={currentPlanner?.month || ""}
                required
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formWeek">
              <Form.Label>Week</Form.Label>
              <Form.Select
                name="week"
                defaultValue={currentPlanner?.week || ""}
                required
              >
                {weekOptions.map((week) => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDuration">
              <Form.Label>Duration</Form.Label>
              <Form.Select
                name="duration"
                defaultValue={currentPlanner?.duration || ""}
                required
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>{duration}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDepartment">
              <Form.Label>Department</Form.Label>
              <Form.Select
                name="department"
                defaultValue={currentPlanner?.department || ""}
                required
              >
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formModule">
              <Form.Label>Module</Form.Label>
              <Form.Control
                type="text"
                name="module"
                placeholder="Enter module..."
                defaultValue={currentPlanner?.module || ""}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formRole">
              <Form.Label>Role</Form.Label>
              <Form.Select
                name="role"
                defaultValue={currentPlanner?.role || "trainee"}
                required
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {currentPlanner ? "Save Changes" : "Add MacroPlanner"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MacroPlanner;
