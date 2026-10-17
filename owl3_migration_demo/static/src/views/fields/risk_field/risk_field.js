/** @odoo-module **/
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

/**
 * Field widget "owl3_risk" para `account.move.owl3_risk_level` (Owl 2).
 * El registro NO cambia en Owl 3; lo que cambia es `static props` → `useProps`.
 */
export class RiskField extends Component {
    static template = "owl3_migration_demo.RiskField";

    static props = {
        ...standardFieldProps,
    };

    get level() {
        return this.props.record.data[this.props.name];
    }

    get className() {
        const classes = {
            low: "text-bg-success",
            medium: "text-bg-warning",
            high: "text-bg-danger",
        };
        return classes[this.level] || "text-bg-secondary";
    }

    get label() {
        const labels = { low: "Bajo", medium: "Medio", high: "Alto" };
        return labels[this.level] || "—";
    }
}

export const riskField = {
    component: RiskField,
    displayName: "Riesgo de cobro",
    supportedTypes: ["selection"],
};

registry.category("fields").add("owl3_risk", riskField);
