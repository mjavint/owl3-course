/** @odoo-module **/
import { Component } from '@odoo/owl';

/**
 * Lista presentacional de pedidos (Owl 2).
 * Recibe los pedidos ya cargados y avisa con `onSelect` al pinchar una fila.
 */
export class DashboardList extends Component {
  static template = 'owl3_migration_demo.DashboardList';

  static props = {
    orders: { type: Array, optional: true, default: () => [] },
    onSelect: { type: Function, optional: true },
  };
}
