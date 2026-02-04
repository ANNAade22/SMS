// src/components/DashboardChart.jsx
import { useEffect, useRef } from "react";

const DashboardChart = ({
  type = "bar",
  data,
  title,
  height = 300,
  className = "",
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const ctx = canvasRef.current.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Set canvas size
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width;
    canvasRef.current.height = height;

    // Chart drawing functions
    const drawBarChart = (ctx, data, width, height) => {
      const { labels, datasets } = data;
      const barWidth = (width - 100) / labels.length;
      const maxValue = Math.max(...datasets[0].data);

      // Draw bars
      datasets[0].data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 100);
        const x = 60 + index * barWidth;
        const y = height - 50 - barHeight;

        // Bar
        ctx.fillStyle = datasets[0].backgroundColor || "#3B82F6";
        ctx.fillRect(x, y, barWidth - 10, barHeight);

        // Bar border
        ctx.strokeStyle = datasets[0].borderColor || "#1E40AF";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth - 10, barHeight);

        // Value label
        ctx.fillStyle = "#374151";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(value.toString(), x + (barWidth - 10) / 2, y - 5);

        // X-axis label
        ctx.fillStyle = "#6B7280";
        ctx.font = "10px Arial";
        ctx.fillText(labels[index], x + (barWidth - 10) / 2, height - 20);
      });

      // Y-axis
      ctx.strokeStyle = "#D1D5DB";
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(50, height - 50);
      ctx.stroke();

      // Y-axis labels
      for (let i = 0; i <= 5; i++) {
        const y = height - 50 - (i * (height - 100)) / 5;
        const value = Math.round((maxValue / 5) * i);

        ctx.fillStyle = "#6B7280";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.fillText(value.toString(), 40, y + 3);

        // Grid line
        ctx.strokeStyle = "#F3F4F6";
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    };

    const drawLineChart = (ctx, data, width, height) => {
      const { labels, datasets } = data;
      const maxValue = Math.max(...datasets[0].data);
      const points = [];

      // Calculate points
      datasets[0].data.forEach((value, index) => {
        const x = 60 + (index * (width - 100)) / (labels.length - 1);
        const y = height - 50 - (value / maxValue) * (height - 100);
        points.push({ x, y, value });
      });

      // Draw line
      ctx.strokeStyle = datasets[0].borderColor || "#3B82F6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      points.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      // Draw points
      points.forEach((point) => {
        ctx.fillStyle = datasets[0].backgroundColor || "#3B82F6";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Point border
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw axes and labels
      drawAxesAndLabels(ctx, labels, maxValue, width, height, points);
    };

    const drawPieChart = (ctx, data, width, height) => {
      const { labels, datasets } = data;
      const values = datasets[0].data;
      const colors = datasets[0].backgroundColor || [
        "#3B82F6",
        "#EF4444",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#06B6D4",
      ];

      const total = values.reduce((sum, value) => sum + value, 0);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 40;

      let startAngle = -Math.PI / 2;

      values.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;

        // Draw slice
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        // Draw slice border
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        const labelAngle = startAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${labels[index]}: ${value}`, labelX, labelY);

        startAngle += sliceAngle;
      });

      // Draw center circle for doughnut effect if needed
      if (data.type === "doughnut") {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    const drawDoughnutChart = (ctx, data, width, height) => {
      drawPieChart(ctx, { ...data, type: "doughnut" }, width, height);
    };

    const drawAxesAndLabels = (
      ctx,
      labels,
      maxValue,
      width,
      height,
      points
    ) => {
      // Y-axis
      ctx.strokeStyle = "#D1D5DB";
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(50, height - 50);
      ctx.stroke();

      // X-axis
      ctx.beginPath();
      ctx.moveTo(50, height - 50);
      ctx.lineTo(width - 20, height - 50);
      ctx.stroke();

      // Y-axis labels
      for (let i = 0; i <= 5; i++) {
        const y = height - 50 - (i * (height - 100)) / 5;
        const value = Math.round((maxValue / 5) * i);

        ctx.fillStyle = "#6B7280";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.fillText(value.toString(), 40, y + 3);
      }

      // X-axis labels
      points.forEach((point, index) => {
        ctx.fillStyle = "#6B7280";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(labels[index], point.x, height - 20);
      });
    };

    // Draw chart based on type
    if (type === "bar") {
      drawBarChart(ctx, data, canvasRef.current.width, height);
    } else if (type === "line") {
      drawLineChart(ctx, data, canvasRef.current.width, height);
    } else if (type === "pie") {
      drawPieChart(ctx, data, canvasRef.current.width, height);
    } else if (type === "doughnut") {
      drawDoughnutChart(ctx, data, canvasRef.current.width, height);
    }
  }, [data, type, height]);

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
};

export default DashboardChart;
