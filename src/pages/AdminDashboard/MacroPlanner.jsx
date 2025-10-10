import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/Trainer CSS/Macroplanner.css";
import {
  fetchMacroPlanner,
  addMacroPlanner,
  updateMacroPlanner,
} from "../../api/adminAPIservice";

const durationOptions = [
  "1 Month","2 Months","3 Months","4 Months","5 Months","6 Months"
];
const defaultDepartmentOptions = [
  "HR","IT","Finance","Marketing","Sales","Operations","Support","Training","Development","Design"
];
const staticWeekOptions = ["week 1","week 2","week 3","week 4"];
const modeOptions = ["Theoretical","Practical"];

const MacroPlanner = () => {
  const [planners, setPlanners] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPlanner, setCurrentPlanner] = useState(null);
  const [form, setForm] = useState({
    month: "",
    week: "",
    duration: "",
    department: "",
    module: "",
    mode: "Theoretical",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchMacroPlanner();
        if (result?.success) setPlanners(Array.isArray(result.data) ? result.data : []);
        else setError("Failed to fetch macroplanner data.");
      } catch {
        setError("An error occurred while fetching macroplanner data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const departmentOptions = useMemo(() => {
    const set = new Set(planners.map(p => p.department).filter(Boolean));
    const fromData = Array.from(set);
    return fromData.length ? fromData : defaultDepartmentOptions;
  }, [planners]);

  const weekOptions = useMemo(() => {
    const set = new Set(planners.map(p => p.week).filter(Boolean));
    const fromData = staticWeekOptions.filter(w => set.has(w));
    return fromData.length ? fromData : staticWeekOptions;
  }, [planners]);

  const filteredPlanners = useMemo(() => {
    return planners.filter(p => {
      const deptOk = selectedDepartment ? p.department === selectedDepartment : true;
      const weekOk = selectedWeek ? p.week === selectedWeek : true;
      return deptOk && weekOk;
    });
  }, [planners, selectedDepartment, selectedWeek]);

  const handleShowModal = (planner = null) => {
    setCurrentPlanner(planner);
    setError(null);
    setForm({
      month: planner?.month || "",
      week: planner?.week || "",
      duration: planner?.duration || "",
      department: planner?.department || (departmentOptions[0] || ""),
      module: planner?.module || "",
      mode: planner?.mode || "Theoretical",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentPlanner(null);
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePlanner = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      id: currentPlanner ? currentPlanner.id : null,
      month: form.month,
      week: form.week,
      duration: form.duration,
      department: form.department,
      module: form.module,
      mode: form.mode,
    };
    try {
      const result = currentPlanner
        ? await updateMacroPlanner(payload)
        : await addMacroPlanner(payload);

      if (!result?.success) {
        setError(result?.error || "Failed to save macroplanner.");
        return;
      }
      const refreshed = await fetchMacroPlanner();
      if (refreshed?.success) setPlanners(Array.isArray(refreshed.data) ? refreshed.data : []);
      handleCloseModal();
    } catch {
      setError("Failed to save macroplanner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="macro-planner container mt-4">
      {/* Dark header bar like your screenshot */}
      <div className="d-flex justify-content-between align-items-center mb-4 header">
        <h2 className="fw-bold text-white">
          <i className="bi bi-calendar" style={{ color: "#FFFFFF" }}></i> Road Map
        </h2>

        <Button variant="info macro-btn" className="mp-add" onClick={() => handleShowModal()}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Road Map
          </Button>
      </div>
      <div className="mp-header">
        <div className="mp-actions">
          <Form.Select
            className="mp-select"
            onChange={(e) => setSelectedDepartment(e.target.value)}
            value={selectedDepartment}
            aria-label="Filter by Department"
          >
            <option value="">All Departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </Form.Select>

          {/* <Form.Select
            className="mp-select"
            onChange={(e) => setSelectedWeek(e.target.value)}
            value={selectedWeek}
            aria-label="Filter by Week"
          >
            <option value="">All Weeks</option>
            {weekOptions.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </Form.Select> */}

        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Alert variant="danger" className="my-3">{error}</Alert>
      ) : (
        <div className="table-responsive">
          <table className="macro-planner-table">
            <thead>
              <tr>
                {/* <th>Week</th> */}
                <th>Duration</th>
                <th>Department</th>
                <th>Module</th>
                <th>Mode</th>
                <th>Modify</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanners.length > 0 ? (
                filteredPlanners.map((planner) => (
                  <tr key={planner.id}>
                    {/* <td className="fw-medium">{planner.week}</td> */}
                    <td>{planner.duration}</td>
                    <td>{planner.department}</td>
                    <td className="truncate">{planner.module}</td>
                    <td>{planner.mode}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleShowModal(planner)}
                      >
                        <i className="bi bi-pencil"></i> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No Macroplanner found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{currentPlanner ? "Modify MacroPlanner" : "Add MacroPlanner"}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSavePlanner}>
          <Modal.Body>
            {/* Keep Month if backend expects it (not used for filtering) */}
            <Form.Group className="mb-3" controlId="formMonth">
              <Form.Label>Month (optional)</Form.Label>
              <Form.Control
                type="text"
                name="month"
                placeholder="e.g., September"
                value={form.month}
                onChange={onFormChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formWeek">
              <Form.Label>Week</Form.Label>
              <Form.Select name="week" value={form.week} onChange={onFormChange} required>
                <option value="" disabled>Select week</option>
                {staticWeekOptions.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDuration">
              <Form.Label>Duration</Form.Label>
              <Form.Select name="duration" value={form.duration} onChange={onFormChange} required>
                <option value="" disabled>Select duration</option>
                {durationOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDepartment">
              <Form.Label>Department</Form.Label>
              <Form.Select name="department" value={form.department} onChange={onFormChange} required>
                <option value="" disabled>Select department</option>
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
                value={form.module}
                onChange={onFormChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-0" controlId="formMode">
              <Form.Label>Mode</Form.Label>
              <Form.Select name="mode" value={form.mode} onChange={onFormChange} required>
                {modeOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (<><Spinner size="sm" className="me-2" /> Saving…</>) : (currentPlanner ? "Save Changes" : "Add MacroPlanner")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MacroPlanner;
