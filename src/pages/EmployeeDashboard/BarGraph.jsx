import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { fetchEmployeeLoginActivity } from "../../api/employeeAPIservice"; // Adjust the import path as necessary

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BarGraph = () => {
  const [loginData, setLoginData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2025); // Default year set to 2025
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    const loadLoginData = async () => {
      try {
        const response = await fetchEmployeeLoginActivity();
        if (response.success) {
          const summary = response.data.login_summary;

          // Extract unique years from the login summary
          const years = [...new Set(summary.map((entry) => new Date(entry.date).getFullYear()))];
          setAvailableYears(years);

          // Process data for the selected year
          const processYearData = (year) => {
            const monthlyLogins = Array(12).fill(0); // Initialize array for 12 months
            summary
              .filter((entry) => new Date(entry.date).getFullYear() === year)
              .forEach((entry) => {
                const month = new Date(entry.date).getMonth(); // Get month (0-11)
                monthlyLogins[month] += entry.login_count; // Accumulate login counts
              });
            return monthlyLogins;
          };

          setLoginData(processYearData(selectedYear));
        } else {
          setError("Failed to load login data.");
        }
      } catch (err) {
        setError("An error occurred while fetching login data.");
      } finally {
        setLoading(false);
      }
    };

    loadLoginData();
  }, [selectedYear]);

  if (loading) return <p>Loading...</p>;
  if (error) return <div>{error}</div>;

  const data = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Login Count",
        data: loginData,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend
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
          color: "#333", // Ensure month names are visible
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

  return (
    <div style={{ height: "100%", width: "100%", padding: "5px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>Login Activity</h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="year-dropdown"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div style={{ height: "95%", width: "100%", padding: "5px" }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default BarGraph;
