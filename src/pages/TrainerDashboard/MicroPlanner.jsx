import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Row, Col } from "react-bootstrap";
import {
  fetchMicroPlanner,
  addMicroPlanner,
  updateMicroPlanner,
} from "../../api/trainerAPIservice";
import "../../utils/css/Trainee CSS/Microplanner.css";
import "../../index.css"

const MicroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPlanner, setCurrentPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayModulePairs, setDayModulePairs] = useState([{ day: "", module: "" }]);

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekOptions = ["Week 1", "Week 2", "Week 3", "Week 4"];

  const departmentOptions = [
    "HR", "IT", "Finance", "Marketing", "Sales",
    "Operations", "Support", "Training", "Development", "Design"
  ];

  const modeOptions = ["Theoretical", "Practical"];
  const dayOptions = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMicroPlanner();
        if (result.success) {
          setPlanners(result.data);
          const uniqueMonths = [...new Set(result.data.map((p) => p.month))];
          setMonths(uniqueMonths);
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
  }, []);

  useEffect(() => {
    if (currentPlanner && currentPlanner.days && currentPlanner.name_of_topic) {
      const days = currentPlanner.days.split(",").map((d) => d.trim());
      const modules = Array.isArray(currentPlanner.name_of_topic) ? currentPlanner.name_of_topic : [];
      const pairs = days.map((day, index) => ({
        day,
        module: modules[index] || "",
      })).filter((pair) => pair.day);
      setDayModulePairs(pairs.length ? pairs : [{ day: "", module: "" }]);
    } else {
      setDayModulePairs([{ day: "", module: "" }]);
    }
  }, [currentPlanner]);

  const handleShowModal = (planner = null) => {
    setCurrentPlanner(planner);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentPlanner(null);
    setDayModulePairs([{ day: "", module: "" }]);
  };

  const addPair = () => {
    setDayModulePairs([...dayModulePairs, { day: "", module: "" }]);
  };

  const removePair = (index) => {
    const updatedPairs = dayModulePairs.filter((_, i) => i !== index);
    setDayModulePairs(updatedPairs.length ? updatedPairs : [{ day: "", module: "" }]);
  };

  const updatePair = (index, field, value) => {
    const updatedPairs = [...dayModulePairs];
    updatedPairs[index][field] = value;
    setDayModulePairs(updatedPairs);
  };

  const handleSavePlanner = async (event) => {
    event.preventDefault();
    setLoading(true);
    const form = event.target;
    const days = dayModulePairs.map((pair) => pair.day).filter((d) => d);
    const name_of_topic = dayModulePairs.map((pair) => pair.module).filter((m) => m);

    if (days.length !== name_of_topic.length || days.length === 0) {
      setError("Please provide at least one day and corresponding module.");
      setLoading(false);
      return;
    }

    const newPlanner = {
      id: currentPlanner ? currentPlanner.id : null,
      month: form.elements.month.value,
      week: form.elements.week.value,
      days: days.join(","),
      department: form.elements.department.value,
      no_of_sessions: parseInt(form.elements.no_of_sessions.value),
      name_of_topic,
      mode: form.elements.mode.value,
    };

    let result = currentPlanner
      ? await updateMicroPlanner(newPlanner)
      : await addMicroPlanner(newPlanner);

    if (result.success) {
      const updatedData = await fetchMicroPlanner();
      if (updatedData.success) {
        setPlanners(updatedData.data);
        const uniqueMonths = [...new Set(updatedData.data.map((p) => p.month))];
        setMonths(uniqueMonths);
      }
      handleCloseModal();
    } else {
      console.error("Failed to save microplanner:", result.error);
      setError("Failed to save microplanner: " + result.error);
    }
    setLoading(false);
  };

  const filteredPlanners = planners.filter((p) =>
    selectedMonth ? p.month === selectedMonth : true
  );

  return (
    <div className="macro-planner container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white">
          <i className="bi bi-calendar-check" style={{ color: "#FFFFFF" }}></i> Planner
        </h2>
        <Form.Select
          className="w-auto border-success shadow-sm"
          onChange={(e) => setSelectedMonth(e.target.value)}
          value={selectedMonth}
        >
          <option value="">All Months</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </Form.Select>
        <Button
          variant="info micro-btn"
          onClick={() => handleShowModal()}
          className="shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>Add Planner
        </Button>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="success" />
        </div>
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : (
        <div className="table-responsive">
          <table className="micro-planner-table table table-bordered table-hover align-middle shadow-sm">
            <thead>
              <tr>
                <th>Month</th>
                <th>Week</th>
                <th>Days & Modules</th>
                <th>Department</th>
                <th>Sessions</th>
                <th>Mode</th>
                <th>Modify</th>
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
                      <td>{planner.week}</td>
                      <td>{dayModuleList || "N/A"}</td>
                      <td>{planner.department}</td>
                      <td>{planner.no_of_sessions}</td>
                      <td>{planner.mode}</td>
                      <td>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleShowModal(planner)}
                        >
                          <i className="bi bi-pencil"></i> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    No Microplanner found for selected month.
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
            {currentPlanner ? "Modify MicroPlanner" : "Add MicroPlanner"}
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
                <option value="">Select Month</option>
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
                <option value="">Select Week</option>
                {weekOptions.map((week) => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Day & Module Pairs</Form.Label>
              {dayModulePairs.map((pair, index) => (
                <Row key={index} className="mb-2 align-items-end">
                  <Col md={5}>
                    <Form.Select
                      name={`day-${index}`}
                      value={pair.day}
                      onChange={(e) => updatePair(index, "day", e.target.value)}
                      required
                    >
                      <option value="">Select Day</option>
                      {dayOptions.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Enter Module"
                      value={pair.module}
                      onChange={(e) => updatePair(index, "module", e.target.value)}
                      required
                    />
                  </Col>
                  <Col md={2} className="text-end">
                    {index > 0 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removePair(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                    {index === dayModulePairs.length - 1 && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={addPair}
                        className="ms-2"
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    )}
                  </Col>
                </Row>
              ))}
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDepartment">
              <Form.Label>Department</Form.Label>
              <Form.Select
                name="department"
                defaultValue={currentPlanner?.department || ""}
                required
              >
                <option value="">Select Department</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formSessions">
              <Form.Label>No. of Sessions</Form.Label>
              <Form.Control
                type="number"
                name="no_of_sessions"
                defaultValue={currentPlanner?.no_of_sessions || 1}
                min="1"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formMode">
              <Form.Label>Mode</Form.Label>
              <Form.Select
                name="mode"
                defaultValue={currentPlanner?.mode || "Theoretical"}
                required
              >
                <option value="">Select Mode</option>
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="success" type="submit">
              {currentPlanner ? "Save Changes" : "Add MicroPlanner"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MicroPlanner;