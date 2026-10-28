/** @odoo-module **/
import { Component } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useService } from '@web/core/utils/hooks';
import { SaleDashboard } from './dashboard';

/**
 * Envoltorio de ACCIÓN del dashboard (Owl 2).
 *
 * Usa COMPOSICIÓN: no hereda de `SaleDashboard`; lo renderiza y le inyecta los
 * callbacks que necesitan el servicio de acciones. Así el dashboard sigue
 * siendo presentacional y reutilizable en cualquier sitio.
 */
export class SaleDashboardAction extends Component {
  static template = 'owl3_migration_demo.SaleDashboardAction';
  static components = { SaleDashboard };

  setup() {
    this.actionService = useService('action');
  }

  openOrder(orderId) {
    this.actionService.doAction({
      type: 'ir.actions.act_window',
      res_model: 'sale.order',
      res_id: orderId,
      views: [[false, 'form']],
    });
  }

  openNewOrder() {
    this.actionService.doAction('sale.action_quotations');
  }
}

registry
  .category('actions')
  .add('owl3_migration_demo.sale_dashboard', SaleDashboardAction);
