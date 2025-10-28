import React, { useState, useEffect } from "react";
import { Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import { fetchMacroPlanner } from "../../api/employeeAPIservice";

const MacroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(""); // "" => All Weeks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize helper => "week 2"
  const normalizeWeek = (w) =>
    String(w || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchMacroPlanner();
        if (result.success) {
          // normalize week values in data
          const data = result.data.map((p) => ({
            ...p,
            week: normalizeWeek(p.week),
          }));
          setPlanners(data);

          // unique, sorted weeks for dropdown
          const uniqueWeeks = [...new Set(data.map((p) => p.week))].sort(
            (a, b) => {
              const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
              const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
              return na - nb;
            }
          );
          setWeeks(uniqueWeeks);
        } else {
          setError("Failed to fetch macroplanner data.");
        }
      } catch {
        setError("An error occurred while fetching macroplanner data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPlanners = planners.filter((p) =>
    selectedWeek ? p.week === normalizeWeek(selectedWeek) : true
  );

  const prettyWeek = (w) =>
    w.replace(/^week\s/, (m) => m.charAt(0).toUpperCase() + m.slice(1)); // "Week 2"

  return (
    <div className="macro-planner container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white">
          <i className="bi bi-calendar me-2"></i>
          Road Map
        </h2>
        {/* <Form.Select
          className="w-auto border-primary shadow-sm"
          onChange={(e) => setSelectedWeek(e.target.value)}
          value={selectedWeek}
        >
          <option value="">All Weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              {prettyWeek(w)}
            </option>
          ))}
        </Form.Select> */}
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
            <thead className="table-custom">
              <tr>
                {/* <th>Week</th> */}
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
                    {/* <td className="fw-medium">{prettyWeek(planner.week)}</td> */}
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
