/** @odoo-module **/
import { Component } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useBus, useService } from '@web/core/utils/hooks';

/**
 * Botón que consume el servicio de presupuesto (Owl 2).
 *
 * El servicio avisa por `env.bus`; usamos `useBus` (y no `addEventListener`
 * directo) porque limpia el listener cuando el componente se destruye.
 */
export class BudgetButton extends Component {
  static template = 'owl3_migration_demo.BudgetButton';

  setup() {
    this.budgetService = useService('purchase_budget');
    // refresca la UI cuando cambia el tope, con limpieza automática
    useBus(this.env.bus, 'budget-changed', () => this.render());
  }

  onClick() {
    this.budgetService.setBudget(this.budgetService.budget + 1000);
  }
}

// Se monta en la cabecera del formulario de compras (ver purchase_order_views.xml).
registry.category('view_widgets').add('budget_button', { component: BudgetButton });
