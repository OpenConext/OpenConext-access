import "./StatsLineChart.scss";
import React from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Legend,
    Tooltip,
    Filler
} from "chart.js";
import {Line} from "react-chartjs-2";
import I18n from "../locale/I18n";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip, Filler);

const formatAxisValue = (value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".", ",")}K`;
    return value.toString();
};

const StatsLineChart = ({data, labels}) => {
    if (!data || data.length === 0) {
        return null;
    }

    const logins = data.map(d => d.count_user_id || 0);
    const unique = data.map(d => d.distinct_count_user_id || 0);

    const chartData = {
        labels,
        datasets: [
            {
                label: I18n.t("statistics.logins"),
                data: logins,
                borderColor: "var(--sds--color--blue--400, #0077c8)",
                backgroundColor: "var(--sds--color--blue--400, #0077c8)",
                pointStyle: "circle",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.1,
                borderWidth: 2,
            },
            {
                label: I18n.t("statistics.uniqueUsers"),
                data: unique,
                borderColor: "var(--sds--color--green--400, #00a650)",
                backgroundColor: "var(--sds--color--green--400, #00a650)",
                pointStyle: "rect",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.1,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                position: "top",
                align: "start",
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {size: 13},
                },
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatAxisValue(context.parsed.y)}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: "rgba(0, 0, 0, 0.06)",
                },
                ticks: {
                    font: {size: 12},
                },
            },
            y: {
                grid: {
                    color: "rgba(0, 0, 0, 0.06)",
                },
                ticks: {
                    callback: formatAxisValue,
                    font: {size: 12},
                },
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="stats-line-chart">
            <h4>{I18n.t("statistics.overTime")}</h4>
            <div className="chart-wrapper">
                <Line data={chartData} options={options}/>
            </div>
        </div>
    );
};

export default StatsLineChart;
