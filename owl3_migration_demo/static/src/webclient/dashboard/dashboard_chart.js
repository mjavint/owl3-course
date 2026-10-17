/** @odoo-module **/
import { Component, onWillStart, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { loadBundle } from "@web/core/assets";
import { getColor, lightenColor } from "@web/core/colors/colors";

// Mismos valores que `GraphRenderer` en modo claro (Odoo real lee la cookie
// `color_scheme` para alternar claro y oscuro).
const GRID_COLOR = "rgba(0, 0, 0, .1)";
const LABEL_COLOR = "#111827";

/**
 * Plugin estándar de las gráficas de línea del core (ver `GraphRenderer`):
 * pinta la rejilla del eje Y ENCIMA de la línea y marca ambos ejes.
 */
const gridOnTop = {
    id: "gridOnTop",
    afterDraw: (chart) => {
        const ctx = chart.ctx;
        const { top, right, bottom, left } = chart.chartArea;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = GRID_COLOR;
        chart.scales.y.ticks.forEach((value, index) => {
            const y = chart.scales.y.getPixelForTick(index);
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.moveTo(left - 8, y);
            ctx.lineTo(left, y);
            ctx.stroke();
        });
        chart.scales.x.ticks.forEach((value, index) => {
            const x = chart.scales.x.getPixelForTick(index);
            ctx.beginPath();
            ctx.moveTo(x, bottom);
            ctx.lineTo(x, bottom + 8);
            ctx.stroke();
        });
        // Guía vertical sobre el punto activo (el que sigue el ratón).
        const points = chart.getDatasetMeta(0).data || [];
        points.forEach((point, index) => {
            if (point.active) {
                const x = chart.scales.x.getPixelForTick(index);
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
        ctx.restore();
    },
};

/**
 * Gráfico de líneas presentacional y reutilizable (Owl 2).
 *
 * Sigue el patrón estándar de Odoo (ver `GraphRenderer` en el core): carga el
 * bundle `web.chartjs_lib` bajo demanda y construye un `Chart` de Chart.js
 * sobre el canvas. No conoce el dominio: recibe la serie ya agregada
 * (`[{ label, value }]`).
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
            plugins: [gridOnTop],
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
