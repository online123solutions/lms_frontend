import React, { useState, useEffect } from "react";
import { Form, Spinner } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import { fetchMacroPlanner } from "../../api/traineeAPIservice";

const MacroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(""); // "" = All Weeks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // helper: normalize any week string -> "week 1" / "week 2" etc.
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
          // normalize week values once
          const data = result.data.map((p) => ({
            ...p,
            week: normalizeWeek(p.week),
          }));
          setPlanners(data);

          // unique week list for dropdown
          const uniqueWeeks = [...new Set(data.map((p) => p.week))].sort(
            (a, b) => {
              // sort by week number if present
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
          {weeks.map((week) => (
            <option key={week} value={week}>
              {week.replace(/^week\s/, (m) => m.charAt(0).toUpperCase() + m.slice(1))} {/* "Week 2" */}
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
                    {/* <td className="fw-medium">
                      {planner.week.replace(/^week\s/, (m) => m.charAt(0).toUpperCase() + m.slice(1))}
                    </td> */}
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
