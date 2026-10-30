/** @odoo-module **/
import { Component } from '@odoo/owl';
import { Dialog } from '@web/core/dialog/dialog';

/**
 * Diálogo de confirmación (Owl 2), aislado para poder reutilizarlo.
 *
 * El servicio de diálogos inyecta `close`; el consumidor aporta `confirm` y
 * el resumen del impacto. En las plantillas de Owl 2 los props se leen SIEMPRE
 * como `props.x` (nunca como variable libre, que falla).
 */
export class ConfirmApprovalDialog extends Component {
  static template = 'owl3_migration_demo.ConfirmApprovalDialog';
  static components = { Dialog };
  static props = {
    close: Function,
    confirm: Function,
    orderName: { type: String, optional: true },
    available: Number,
    total: Number,
    resulting: Number,
    confirmLabel: { type: String, optional: true },
  };

  format(value) {
    return Number(value || 0).toFixed(2);
  }

  async onConfirm() {
    if (this.props.confirm) {
      await this.props.confirm();
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
