/** @odoo-module **/
import { Component, onWillStart } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useService } from '@web/core/utils/hooks';
import { standardWidgetProps } from '@web/views/widgets/standard_widget_props';
import { ConfirmApprovalDialog } from './confirm_approval_dialog';

/**
 * View widget "Aprobar el tope de presupuesto" (Owl 2).
 *
 * Solo aparece en borrador/enviado cuando el total supera el tope. No llama
 * directamente a `button_approve`: usa `owl3_confirm_over_budget`, que conserva
 * las validaciones y la doble validación estándar de compras. El descuento
 * real del presupuesto lo sigue haciendo `button_approve` en el backend.
 */
export class PurchaseApproveButton extends Component {
  static template = 'owl3_migration_demo.PurchaseApproveButton';
  // `standardWidgetProps` (record + readonly): Odoo siempre inyecta `readonly`
  // en los view widgets; si no se declara, en modo debug falla la validación.
  static props = {
    ...standardWidgetProps,
  };

  setup() {
    this.orm = useService('orm');
    this.dialog = useService('dialog');
    this.notification = useService('notification');
    this.budget = useService('purchase_budget');
    // El diálogo muestra el impacto: asegura el tope real antes de abrirlo.
    onWillStart(() => this.budget.refresh().catch(() => {}));
  }

  /**
   * Solo se muestra cuando el pedido supera el presupuesto global
   * (presupuesto < total del PO) y todavía se puede confirmar.
   */
  get isApprovable() {
    const { data } = this.props.record;
    return data.owl3_requires_approval && ['draft', 'sent'].includes(data.state);
  }

  /**
   * Si el usuario puede aprobar, el botón autoriza el exceso; si no, confirma
   * el pedido y lo deja pendiente de la aprobación de un responsable.
   */
  get approvalLabel() {
    return this.props.record.data.owl3_can_approve
      ? 'Aprobar el tope de presupuesto'
      : 'Confirmar y solicitar aprobación';
  }

  onApprove() {
    const data = this.props.record.data;
    const total = Number(data.owl3_total_company_currency || 0);
    const available = Number(this.budget.budget || 0);
    this.dialog.add(ConfirmApprovalDialog, {
      orderName: data.name,
      available,
      total,
      resulting: available - total,
      confirmLabel: data.owl3_can_approve ? 'Aprobar' : 'Confirmar y solicitar',
      confirm: () => this.doApprove(),
    });
  }

  async doApprove() {
    const record = this.props.record;

    // Guarda cambios pendientes antes de confirmar, como haría un botón
    // estándar. También crea el pedido si todavía no tiene id.
    const saved = await record.save();
    if (!saved) {
      return;
    }
    const id = record.resId;
    if (!id) {
      this.notification.add('No se pudo determinar el pedido a aprobar.', {
        type: 'warning',
      });
      return;
    }

    // El backend conserva el flujo estándar de confirmación y solo se salta
    // el guard del tope. El descuento lo hace `button_approve`.
    await this.orm.call('purchase.order', 'owl3_confirm_over_budget', [id]);

    // Refresca el presupuesto global y el estado del pedido.
    await this.budget.refresh().catch(() => {});
    await record.load();
    if (record.data.state === 'purchase') {
      this.notification.add(
        `Pedido aprobado. Presupuesto restante: ${this.formatAmount(
          this.budget.budget
        )}`,
        { type: 'success' }
      );
    } else if (record.data.state === 'to approve') {
      this.notification.add(
        'Pedido confirmado y pendiente de aprobación. El presupuesto se descontará al aprobar.',
        { type: 'info' }
      );
    } else {
      this.notification.add(
        'El pedido no se ha aprobado. Revisa los permisos o la doble validación de compras.',
        { type: 'warning' }
      );
    }
  }

  formatAmount(value) {
    return Number(value || 0).toFixed(2);
  }
}

registry.category('view_widgets').add('purchase_approve_button', {
  component: PurchaseApproveButton,
});
