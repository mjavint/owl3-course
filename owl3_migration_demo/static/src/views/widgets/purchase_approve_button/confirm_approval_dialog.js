/** @odoo-module **/
import { Component } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

/**
 * Diálogo de confirmación (Owl 2), aislado para poder reutilizarlo.
 *
 * El servicio de diálogos inyecta `close`; el consumidor aporta `confirm` y
 * `orderName`. En las plantillas de Owl 2 los props se leen SIEMPRE como
 * `props.x` (nunca como variable libre, que falla).
 */
export class ConfirmApprovalDialog extends Component {
    static template = "owl3_migration_demo.ConfirmApprovalDialog";
    static components = { Dialog };
    static props = ["close", "confirm", "orderName"];

    onConfirm() {
        if (this.props.confirm) {
            this.props.confirm();
        }
        if (this.props.close) {
            this.props.close();
        }
    }

    onCancel() {
        if (this.props.close) {
            this.props.close();
        }
    }
}
