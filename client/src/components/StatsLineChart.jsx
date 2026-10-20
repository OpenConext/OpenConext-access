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

const resolveColor = (varName, fallback) => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
};

// Gradient fill from the line color at the top of the chart area to transparent at the bottom
const areaGradient = color => context => {
    const {chart} = context;
    if (!chart.chartArea) {
        return "transparent";
    }
    const {top, bottom} = chart.chartArea;
    const hex = color.replace("#", "");
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.substring(i, i + 2), 16));
    const gradient = chart.ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.35)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    return gradient;
};

const StatsLineChart = ({data, labels, showUnique = true, fluent = false, maxXTicks = undefined}) => {
    if (!data || data.length === 0) {
        return null;
    }

    const blue = resolveColor("--info-hover", "#053eaa");
    const green = resolveColor("--primary", "#00d37f");

    const pointRadius = fluent ? 0 : 5;
    const pointHoverRadius = fluent ? 4 : 7;
    const tension = fluent ? 0.2 : 0.4;
    const borderWidth = fluent ? 1.5 : 1;

    const logins = data.map(d => d.count_user_id || 0);
    const unique = data.map(d => d.distinct_count_user_id || 0);

    const datasets = [
        {
            label: I18n.t("statistics.logins"),
            data: logins,
            borderColor: blue,
            backgroundColor: fluent ? blue : areaGradient(blue),
            pointBackgroundColor: blue,
            fill: !fluent,
            pointStyle: "circle",
            pointRadius,
            pointHoverRadius,
            tension,
            borderWidth,
        },
    ];

    if (showUnique) {
        datasets.push({
            label: I18n.t("statistics.uniqueUsers"),
            data: unique,
            borderColor: green,
            backgroundColor: fluent ? green : areaGradient(green),
            pointBackgroundColor: green,
            fill: !fluent,
            pointStyle: "rect",
            pointRadius,
            pointHoverRadius,
            tension,
            borderWidth,
        });
    }

    const chartData = {labels, datasets};

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
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
                    ...(maxXTicks !== undefined ? {maxTicksLimit: maxXTicks} : {}),
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
            <div className="chart-header">
                <h4 className="m-0">{I18n.t("statistics.overTime")}</h4>
                <div className="chart-legend">
                    <span className="legend-item">
                        <span className="legend-dot blue"/>
                        {I18n.t("statistics.logins")}
                    </span>
                    {showUnique && (
                        <span className="legend-item">
                            <span className="legend-dot green"/>
                            {I18n.t("statistics.uniqueUsers")}
                        </span>
                    )}
                </div>
            </div>
            <div className="chart-wrapper">
                <Line data={chartData} options={options}/>
            </div>
        </div>
    );
};

export default StatsLineChart;
