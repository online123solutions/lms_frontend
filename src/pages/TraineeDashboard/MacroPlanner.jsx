// MacroPlanner.jsx (Trainee view — read-only, uses trainee API only)
import React, { useState, useEffect } from "react";
import { Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import { fetchMacroPlanner } from "../../api/traineeAPIservice"; // trainee API
import "../../index.css";

const MacroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
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

  // fetch data (trainee endpoint)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMacroPlanner();
        if (result && result.success) {
          setPlanners(result.data || []);
        } else {
          setError("Failed to fetch macroplanner data.");
        }
      } catch (err) {
        console.error("fetchMacroPlanner error:", err);
        setError("An error occurred while fetching macroplanner data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPlanners = planners.filter((p) =>
    selectedWeek ? p.week === selectedWeek : true
  );

  return (
    <div className="macro-planner container">
      {/* Header layout (matches Trainer visual layout) */}
      <div className="header d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-white mb-0" title="Road Map">
          {/* inline svg fallback for icon (safe if icon font not loaded) */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            style={{ width: 34, height: 34, marginRight: 8 }}
          >
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="1.6" fill="none" />
            <path d="M16 3v4M8 3v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>Road Map</h2>

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

        {/* Trainee view: no Add button (read-only) */}
        <div style={{ minWidth: 120 }} /> {/* placeholder to keep spacing consistent */}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-muted">
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
