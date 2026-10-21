/** @odoo-module **/
import { registry } from '@web/core/registry';

/**
 * Servicio propio "purchase_budget" (Owl 2).
 * El estado vive en un cierre; para que la UI reaccione hay que disparar el
 * bus a mano — justo el trabajo que en Owl 3 desaparece (señal).
 */
export const purchaseBudgetService = {
  dependencies: ['notification'],
  start(env, { notification }) {
    let budget = 5000;

    return {
      get budget() {
        return budget;
      },
      async assertWithinBudget(amount) {
        if (amount > budget) {
          notification.add(`Importe ${amount} supera el tope de ${budget}`, {
            type: 'danger',
          });
          return false;
        }
        return true;
      },
      setBudget(newBudget) {
        budget = newBudget;
        env.bus.trigger('budget-changed', budget);
      },
    };
  },
};

registry.category('services').add('purchase_budget', purchaseBudgetService);
