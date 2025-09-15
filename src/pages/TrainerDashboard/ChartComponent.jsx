import React from "react";
import { Line } from "react-chartjs-2";

const ChartComponent = ({ data }) => {
  const chartData = {
    labels: data?.map((item) => item.date),
    datasets: [
      {
        label: "Engagement Count",
        data: data?.map((item) => item.count),
        fill: true,
        borderColor: "#3b82f6",
        tension: 0.3,
      },
    ],
  };

  return <Line data={chartData} />;
};

export default ChartComponent;
