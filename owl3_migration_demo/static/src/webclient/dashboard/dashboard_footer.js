/** @odoo-module **/
import { Component } from '@odoo/owl';

/**
 * Pie presentacional: solo pinta el total (Owl 2).
 */
export class DashboardFooter extends Component {
  static template = 'owl3_migration_demo.DashboardFooter';

  static props = {
    total: Number,
  };
}
