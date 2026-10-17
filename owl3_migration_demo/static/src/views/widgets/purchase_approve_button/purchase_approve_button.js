/** @odoo-module **/
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardWidgetProps } from "@web/views/widgets/standard_widget_props";
import { ConfirmApprovalDialog } from "./confirm_approval_dialog";

/**
 * View widget "Aprobar pedido" (Owl 2), con los servicios de siempre.
 * No se pasa `close`: lo inyecta el servicio de diálogos.
 */
export class PurchaseApproveButton extends Component {
    static template = "owl3_migration_demo.PurchaseApproveButton";
    // `standardWidgetProps` (record + readonly): Odoo siempre inyecta `readonly`
    // en los view widgets; si no se declara, en modo debug falla la validación.
    static props = {
        ...standardWidgetProps,
    };

    setup() {
        this.orm = useService("orm");
        this.dialog = useService("dialog");
        this.notification = useService("notification");
    }

    onApprove() {
        const record = this.props.record;
        const orderName = record && record.data ? record.data.name : "";
        this.dialog.add(ConfirmApprovalDialog, {
            orderName,
            confirm: () => this.doApprove(),
        });
    }

    async doApprove() {
        const id = this.props.record && this.props.record.resId;
        if (!id) {
            this.notification.add("No se pudo determinar el pedido a aprobar.", { type: "warning" });
            return;
        }
        await this.orm.call("purchase.order", "button_approve", [id]);
        this.notification.add("Pedido aprobado", { type: "success" });
    }
}

registry.category("view_widgets").add("purchase_approve_button", {
    component: PurchaseApproveButton,
});
