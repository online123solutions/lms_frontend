import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

const Linegraph = () => {
  const monthData = {
    labels: [
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ],
    hours: [20, 25, 15, 18, 19, 22, 23, 17, 19],
  };

  const [selectedMonth, setSelectedMonth] = useState("April");
  const [selectedDate, setSelectedDate] = useState(new Date(2024, 3, 1));

  useEffect(() => {
    setSelectedMonth("April");
    setSelectedDate(new Date(2024, 3, 1));
  }, []);

  const handleMonthClick = (event, activeElements) => {
    if (activeElements.length > 0) {
      const selectedIndex = activeElements[0].index;
      const month = monthData.labels[selectedIndex];
      setSelectedMonth(month);
      const newDate = new Date(2024, 3 + selectedIndex, 1); // Adjust to start from April 2024
      setSelectedDate(newDate);
    }
  };

  const data = {
    labels: monthData.labels,
    datasets: [
      {
        label: "Study Hours",
        data: monthData.hours,
        fill: false,
        borderColor: "rgba(36, 199, 199, 1)",
        tension: 0.1,
        pointRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, activeElements) => handleMonthClick(event, activeElements),
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.raw} hours`;
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
        },
      },
      y: {
        beginAtZero: true,
        max: 40,
        ticks: {
          font: {
            size: 14,
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "140%", width: "120%", padding: "5px" }}>
      <div style={{ height: "100%", width: "90%", padding: "5px" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default Linegraph;
