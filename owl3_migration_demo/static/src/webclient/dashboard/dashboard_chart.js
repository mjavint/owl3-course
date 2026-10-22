/** @odoo-module **/
import { Component, onWillStart, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { loadBundle } from "@web/core/assets";
import { getColor, lightenColor } from "@web/core/colors/colors";

const LABEL_COLOR = "#111827";

/**
 * Gráfico de líneas presentacional y reutilizable (Owl 2).
 *
 * Carga Chart.js bajo demanda y pinta la serie sobre el canvas.
 * No conoce el dominio: recibe la serie ya agregada (`[{ label, value }]`).
 */
export class DashboardChart extends Component {
    static template = "owl3_migration_demo.DashboardChart";

    static props = {
        series: { type: Array, element: Object },
        title: { type: String, optional: true },
        color: { type: String, optional: true },
    };

    setup() {
        this.canvasRef = useRef("canvas");
        this.chart = null;

        onWillStart(async () => {
            await loadBundle("web.chartjs_lib");
        });

        // Como en el core: tras cada render se recrea la gráfica; el guard
        // evita hacerlo mientras no hay datos.
        useEffect(() => this.renderChart());
        onWillUnmount(() => this.destroyChart());
    }

    get total() {
        return this.props.series.reduce((acc, s) => acc + s.value, 0);
    }

    get chartColor() {
        return this.props.color || getColor(0, "light", 1);
    }

    get chartConfig() {
        const color = this.chartColor;
        return {
            type: "line",
            data: {
                labels: this.props.series.map((s) => s.label),
                datasets: [
                    {
                        data: this.props.series.map((s) => s.value),
                        borderColor: color,
                        backgroundColor: lightenColor(color, 0.5),
                        borderWidth: 2,
                        cubicInterpolationMode: "monotone",
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: color,
                        hoverBackgroundColor: color,
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                elements: { line: { tension: 0, fill: false } },
                scales: {
                    x: {
                        type: "category",
                        ticks: { color: LABEL_COLOR },
                        grid: { color: "transparent" },
                        border: { display: false },
                    },
                    y: {
                        type: "linear",
                        beginAtZero: true,
                        suggestedMin: 0,
                        suggestedMax: 0,
                        ticks: { color: LABEL_COLOR, precision: 0 },
                        grid: { display: false },
                        border: { display: false },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: "index", intersect: false, position: "average" },
                },
            },
        };
    }

    renderChart() {
        this.destroyChart();
        if (!this.canvasRef.el || !this.total) {
            return;
        }
        // `Chart` es el global que publica el bundle `web.chartjs_lib`.
        this.chart = new Chart(this.canvasRef.el, this.chartConfig);
    }

    destroyChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
