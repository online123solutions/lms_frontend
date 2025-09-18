import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import {
  fetchMacroPlanner
} from "../../api/traineeAPIservice";

const MacroPlanner = () => {
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

  const durationOptions = [
    "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months"
  ];

  const departmentOptions = [
    "HR", "IT", "Finance", "Marketing", "Sales",
    "Operations", "Support", "Training", "Development", "Design"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMacroPlanner();
        if (result.success) {
          setPlanners(result.data);
          const uniqueWeeks = [...new Set(result.data.map((p) => p.week))];
          setWeeks(uniqueWeeks);
        } else {
          setError("Failed to fetch macroplanner data.");
        }
      } catch (error) {
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

  const filteredPlanners = planners.filter((p) =>
    selectedWeek ? p.week === selectedWeek : true
  );

  return (
    <div className="macro-planner container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white">📅 Road Map</h2>
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
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle shadow-sm macro-planner-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Duration</th>
                <th>Department</th>
                <th>Module</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanners.length > 0 ? (
                filteredPlanners.map((planner) => (
                  <tr key={planner.id}>
                    <td className="fw-medium">{planner.week}</td>
                    <td>{planner.duration}</td>
                    <td>{planner.department}</td>
                    <td>{planner.module}</td>
                    <td>{planner.mode || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No Macroplanner found for selected week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MacroPlanner;