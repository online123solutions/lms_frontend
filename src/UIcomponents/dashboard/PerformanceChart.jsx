import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { useState, useEffect } from "react";
import { fetchTraineeDashboard } from "../../api/traineeAPIservice";
import { Dropdown } from "react-bootstrap";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PerformanceChart = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState("homework_reports");

  const typeLabel = (type) => {
    switch (type) {
      case "homework_reports": return "Homework";
      case "pre_assessment_reports": return "Pre-Assessment";
      case "post_assessment_reports": return "Post-Assessment";
      case "daily_quiz_reports": return "Daily-Quiz";
      case "weekly_quiz_reports": return "Weekly-Quiz";
      case "monthly_quiz_reports": return "Monthly-Quiz";
      case "annual_reports": return "Annual";
      default: return "";
    }
  };

  const handleReportTypeChange = (type) => setSelectedReportType(type);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const response = await fetchTraineeDashboard(localStorage.getItem("username"));
        if (response.success) {
          setDashboardData(response.data);
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
    return <div>No data is available for the student.</div>;
  }

  const filteredReports = dashboardData[selectedReportType] || [];
  const chartLabels = filteredReports.map((report) => `${typeLabel(selectedReportType)} ${report.id}`);
  const studentMarks = filteredReports.map((report) => report.your_result?.score || 0);
  const averageMarks = filteredReports.map((report) => report.average_score || 0);
  const highestMarks = filteredReports.map((report) => report.highest_score || 10);

  const chartData = {
    labels: chartLabels,
    datasets: [
      { label: "Student Marks", data: studentMarks, backgroundColor: "rgba(75, 192, 192, 0.8)" },
      // { label: "Average Marks", data: averageMarks, backgroundColor: "rgba(153, 102, 255, 0.8)" },
      // { label: "Highest Marks", data: highestMarks, backgroundColor: "rgba(255, 159, 64, 0.8)" },
    ],
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
  };

  return (
    <div
      className="chart-section"
      style={{
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        position: "relative",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* Chart Dropdown */}
      <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10 }}>
        <Dropdown>
          <Dropdown.Toggle
            variant="light"
            id="dropdown-basic"
            style={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              color: "black",
              boxShadow: "none",
              minWidth: "90px",
              height: "32px",
              fontSize: "13px",
              padding: "4px 8px",
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

      {/* Chart Wrapper */}
      <div style={{ width: "100%", height: "300px", marginTop: "40px" }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default PerformanceChart;
