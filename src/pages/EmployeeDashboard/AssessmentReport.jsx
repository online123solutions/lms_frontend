import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useState, useEffect } from "react";
import { fetchEmployeeDashboard } from "../../api/employeeAPIservice";
import { Dropdown } from "react-bootstrap";
import "../../index.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement
);

const AssessmentReport = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [clickedExam, setClickedExam] = useState(null);
  const [examMarks, setExamMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState("pre_assessment_reports");

  const handleReportTypeChange = (type) => {
    setSelectedReportType(type);
    const firstReport = dashboardData[type]?.[0];
    if (firstReport) {
      setClickedExam(`${typeLabel(type)} - ${firstReport.exam_name}`);
      setExamMarks(firstReport);
    }
  };

  const typeLabel = (type) => {
    switch (type) {
      case "homework_reports":
        return "Homework";
      case "pre_assessment_reports":
        return "Pre-Assessment";
      case "post_assessment_reports":
        return "Post-Assessment";
      case "daily_quiz_reports":
        return "Daily-Quiz";
      case "weekly_quiz_reports":
        return "Weekly-Quiz";
      case "monthly_quiz_reports":
        return "Monthly-Quiz";
      case "annual_reports":
        return "Annual";
      default:
        return "";
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const username = localStorage.getItem("username");
        const response = await fetchEmployeeDashboard(username);
        if (response.success) {
          setDashboardData(response.data);
          if (response.data.pre_assessment_reports.length > 0) {
            setSelectedReportType("pre_assessment_reports");
            setClickedExam(`Pre-Assessment - ${response.data.pre_assessment_reports[0].exam_name}`);
            setExamMarks(response.data.pre_assessment_reports[0]);
          }
        } else {
          setError("Failed to load dashboard data.");
        }
      } catch (err) {
        setError("An error occurred while fetching dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <div>{error}</div>;
  if (!dashboardData || Object.keys(dashboardData).length === 0) {
    return <div>No data is available for the trainee.</div>;
  }

  const filteredReports = dashboardData[selectedReportType] || [];
  const chartLabels = filteredReports.map((report, i) => `${typeLabel(selectedReportType)} - ${report.exam_name}`);
  const employeeMarks = filteredReports.map((report) => report.employee_score || 0);
  const averageMarks = filteredReports.map((report) => report.average_score || 0);
  const highestMarks = filteredReports.map((report) => report.highest_score || 0);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Employee Marks",
        data: employeeMarks,
        backgroundColor: "#b497d6",
      },
      // {
      //   label: "Average Marks",
      //   data: averageMarks,
      //   backgroundColor: "rgba(153, 102, 255, 0.8)",
      // },
      // {
      //   label: "Highest Marks",
      //   data: highestMarks,
      //   backgroundColor: "rgba(255, 159, 64, 0.8)",
      // },
    ],
  };

  const handleChartClick = (event, chartElement) => {
    const activeElement = chartElement[0];
    if (activeElement) {
      const index = activeElement.index;
      const selectedReport = filteredReports[index];
      setClickedExam(chartLabels[index]);
      setExamMarks(selectedReport);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100 },
    },
    onClick: handleChartClick,
  };

  const pieChartData = {
    labels: ["Correct", "Wrong", "Unattempted"],
    datasets: [
      {
        label: "Exam Performance",
        data: [
          examMarks?.correct_questions || 0,
          examMarks?.wrong_questions || 0,
          examMarks?.unattempted_questions || 0,
        ],
        backgroundColor: ["#4caf50", "#f44336", "#ffeb3b"],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div style={{ width: "100%", padding: "20px" }}>
      <div className="chart-section" style={{ position: "relative", height: "308px", width: "100%" }}>
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10 }}>
          <Dropdown>
            <Dropdown.Toggle
              variant="light"
              id="dropdown-basic"
              style={{
                backgroundColor: "white",
                border: "1px solid #ccc",
                textAlign: "left",
                color: "black",
                boxShadow: "none",
                width: "auto",
                minWidth: "100px",
              }}
            >
              {typeLabel(selectedReportType)}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleReportTypeChange("homework_reports")}>Homework</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("pre_assessment_reports")}>Pre-Assessment</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("post_assessment_reports")}>Post-Assessment</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("daily_quiz_reports")}>Daily-Quiz</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("weekly_quiz_reports")}>Weekly-Quiz</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("monthly_quiz_reports")}>Monthly-Quiz</Dropdown.Item>
              <Dropdown.Item onClick={() => handleReportTypeChange("annual_reports")}>Annual</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", height: "40%" }}>
        <div
          style={{
            width: "48%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            height: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ width: "50%" }}>
            <h4>Marks Overview</h4>
            <h5 style={{ marginTop: "20px", fontStyle: "italic", color: "#555" }}>
              Exam : {clickedExam}
            </h5>
            <br />
            <p>
              <strong style={{ color: "#1976d2", fontSize: "1.1em" }}>
                🎯 Your Score: {examMarks?.employee_score || "N/A"}%
              </strong>
            </p>
            <p><strong>Total Questions:</strong> {examMarks?.total_questions || "N/A"}</p>
            <p><strong>Correct Questions:</strong> {examMarks?.correct_questions || "N/A"}</p>
            <p><strong>Wrong Questions:</strong> {examMarks?.wrong_questions || "N/A"}</p>
            <p><strong>Unattempted Questions:</strong> {examMarks?.unattempted_questions || "N/A"}</p>

            {examMarks?.certificate_url && (
              <a
                href={`https://mechanzo.com${examMarks.certificate_url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", marginTop: "10px", color: "#1976d2" }}
              >
                <button class="btn btn-primary">Download Certificate</button>
              </a>
            )}
          </div>
          <div style={{ width: "45%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Pie data={pieChartData} />
          </div>
        </div>

        <div
          style={{
            width: "48%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            height: "100%",
          }}
        >
          <h4>Question-wise Feedback</h4>
          {examMarks?.questions_feedback && examMarks.questions_feedback.length > 0 ? (
            <div
              style={{
                maxHeight: "335px",
                overflowY: "auto",
                marginTop: "10px",
              }}
            >
              {examMarks.questions_feedback.map((q, index) => (
                <div
                  key={index}
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <p><strong>Q{index + 1}:</strong> {q.question}</p>
                  <p>
                    <strong>Your Answer:</strong>{" "}
                    <span
                      style={{
                        color: q.is_correct ? "green" : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {q.trainee_answer || "Not Answered"}
                    </span>
                  </p>
                  <p>
                    <strong>Correct Answer:</strong> {q.correct_answer}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: q.is_correct ? "green" : "red" }}>
                      {q.is_correct ? "✔ Correct" : "✘ Incorrect"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#888", marginTop: "10px" }}>No question feedback available.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AssessmentReport;