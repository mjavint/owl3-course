/** @odoo-module **/
import { Component, onWillStart } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useBus, useService } from '@web/core/utils/hooks';
import { useRecordObserver } from '@web/model/relational_model/utils';
import { standardWidgetProps } from '@web/views/widgets/standard_widget_props';
import { BudgetDialog } from './budget_dialog';

/**
 * Botón que muestra y ajusta el presupuesto global (Owl 2).
 *
 * El presupuesto no es un campo del pedido: es un único valor compartido por
 * todos los pedidos. El servicio avisa por `env.bus`; usamos `useBus` (y no
 * `addEventListener` directo) porque limpia el listener al destruirse.
 *
 * El ajuste se hace en un diálogo con `useState`/`useRef`/`t-model`, no con un
 * incremento fijo: así el ejemplo cubre un formulario completo y el usuario
 * decide el nuevo tope global.
 */
export class BudgetButton extends Component {
  static template = 'owl3_migration_demo.BudgetButton';
  // Como view widget, Odoo inyecta `record` y `readonly`.
  static props = {
    ...standardWidgetProps,
  };

  setup() {
    this.budgetService = useService('purchase_budget');
    this.dialog = useService('dialog');
    this.notification = useService('notification');
    // Al montar, asegura el valor real aunque otra pestaña o una confirmación
    // estándar hayan cambiado el presupuesto global.
    onWillStart(() => this.budgetService.refresh().catch(() => {}));
    // Refresca la UI cuando cambia el presupuesto, con limpieza automática.
    useBus(this.env.bus, 'budget-changed', () => this.render());

    // La confirmación estándar también descuenta en el backend. Al pasar a
    // `purchase`, refrescamos el servicio para que el tope mostrado no quede
    // desfasado respecto al valor guardado.
    let previousState = this.props.record.data.state;
    useRecordObserver((record) => {
      const state = record.data.state;
      if (state === 'purchase' && previousState !== 'purchase') {
        this.budgetService.refresh().catch(() => {});
      }
      previousState = state;
    });
  }

  get displayBudget() {
    return Number(this.budgetService.budget || 0).toFixed(2);
  }

  /**
   * Solo un responsable de compras (o un admin) puede cambiar el tope global.
   * El backend vuelve a comprobarlo en `owl3_set_budget`.
   */
  get isEditable() {
    return !this.props.readonly && !!this.props.record.data.owl3_can_manage_budget;
  }

  onClick() {
    if (!this.isEditable) {
      return;
    }
    this.dialog.add(BudgetDialog, {
      currentBudget: Number(this.budgetService.budget || 0),
      confirm: (newBudget) => this.applyBudget(newBudget),
    });
  }

  async applyBudget(newBudget) {
    const record = this.props.record;
    // Guarda cambios pendientes: el recálculo del tope necesita el total
    // actual y así `record.load()` no descarta nada.
    const saved = await record.save();
    if (!saved) {
      return;
    }
    const value = await this.budgetService.setBudget(newBudget);
    // Refresca `owl3_requires_approval` y la visibilidad de los botones.
    await record.load();
    this.notification.add(
      `Tope de presupuesto actualizado a ${Number(value).toFixed(2)}.`,
      { type: 'success' }
    );
  }
}

// Se monta en la cabecera del formulario de compras (ver purchase_order_views.xml).
registry.category('view_widgets').add('budget_button', { component: BudgetButton });
