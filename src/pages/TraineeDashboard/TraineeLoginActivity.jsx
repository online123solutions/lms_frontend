import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchLoginActivity } from "../../api/traineeAPIservice";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import "../../index.css"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TraineeLoginActivity = ({ setActiveContent }) => {
  const [loginData, setLoginData] = useState([]);
  const [traineeProfile, settraineeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchLoginActivity();
        if (result.success) {
          const summary = result.data.login_summary;

          // Extract unique years and months from the login summary
          const years = [...new Set(summary.map((entry) => new Date(entry.date).getFullYear()))];
          setAvailableYears(years);

          settraineeProfile(result.data.trainee_profile);
          setLoginData(summary);

          // Set the most recent year and month as default
          if (years.length > 0) {
            const recentYear = Math.max(...years);
            setSelectedYear(recentYear);

            const months = [
              ...new Set(
                summary
                  .filter((entry) => new Date(entry.date).getFullYear() === recentYear)
                  .map((entry) => new Date(entry.date).getMonth())
              ),
            ];
            setAvailableMonths(months);
            if (months.length > 0) {
              const recentMonth = Math.max(...months);
              setSelectedMonth(recentMonth);
            }
          }
        } else {
          setError(result.error || "Failed to fetch login activity.");
        }
      } catch (err) {
        setError("An error occurred while fetching login activity.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      // Extract unique months for the selected year
      const months = [
        ...new Set(
          loginData
            .filter((entry) => new Date(entry.date).getFullYear() === selectedYear)
            .map((entry) => new Date(entry.date).getMonth())
        ),
      ];
      setAvailableMonths(months);
      if (!months.includes(selectedMonth)) {
        setSelectedMonth(months[0]); // Reset to the first available month if the current month is invalid
      }
    }
  }, [selectedYear, loginData]);

  const getBarChartData = () => {
    if (!selectedYear || selectedMonth === null) return { labels: [], datasets: [] };

    // Get the number of days in the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // Initialize an array with 0 login counts for each day of the month
    const dailyLogins = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      login_count: 0,
    }));

    // Populate the dailyLogins array with actual login data
    loginData
      .filter(
        (entry) =>
          new Date(entry.date).getFullYear() === selectedYear &&
          new Date(entry.date).getMonth() === selectedMonth
      )
      .forEach((entry) => {
        const day = new Date(entry.date).getDate();
        dailyLogins[day - 1].login_count = entry.login_count;
      });

    // Prepare data for the bar chart
    const labels = dailyLogins.map((entry) => entry.day);
    const data = dailyLogins.map((entry) => entry.login_count);

    return {
      labels,
      datasets: [
        {
          label: "Login Count",
          data,
          backgroundColor: "#b497d6",
          borderColor: "#b497d6",
          borderWidth: 1,
        },
      ],
    };
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.raw} logins`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 14,
          },
          color: "#333",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 14,
          },
          color: "#333",
        },
      },
    },
  };

  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="login-activity">
      {/* Student Profile Display */}
      {traineeProfile && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Student Profile</h2>
          <p>
            <strong>Name:</strong> {traineeProfile.name}
          </p>
          <p>
            <strong>Department:</strong> {traineeProfile.department}
          </p>
        </div>
      )}

      {/* Dropdowns for Year and Month */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="form-select"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
          className="form-select"
          disabled={!selectedYear}
        >
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {new Date(0, month).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {/* Login Trends Bar Graph */}
      <div className="bg-white shadow-md rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Login Trends</h2>
        <div style={{ height: "300px", width: "100%" }}>
          <Bar data={getBarChartData()} options={barChartOptions} />
        </div>
      </div>
    </div>
  );
};

TraineeLoginActivity.propTypes = {
  setActiveContent: PropTypes.func.isRequired, // Ensure setActiveContent is passed
};

export default TraineeLoginActivity;
