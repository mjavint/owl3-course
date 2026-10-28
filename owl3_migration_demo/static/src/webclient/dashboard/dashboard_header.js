/** @odoo-module **/
import { Component } from '@odoo/owl';

/**
 * Cabecera presentacional del dashboard (Owl 2).
 * No conoce servicios ni estado: recibe el título y el callback "nuevo pedido".
 */
export class DashboardHeader extends Component {
  static template = 'owl3_migration_demo.DashboardHeader';

  static props = {
    title: String,
    onNewOrder: { type: Function, optional: true },
  };
}
