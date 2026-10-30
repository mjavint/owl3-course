/** @odoo-module **/
import { registry } from '@web/core/registry';

/**
 * Servicio global "purchase_budget" (Owl 2).
 *
 * El presupuesto es único para todos los pedidos: vive en un parámetro del
 * sistema y se comparte entre formularios. El estado en memoria se avisa por
 * `env.bus` para que la UI reaccione.
 *
 * En Owl 3 este servicio pasa a ser un plugin y `env.bus` se sustituye por
 * señales: el estado reactivo viaja con el plugin, no con el objeto `env`.
 */
export const purchaseBudgetService = {
  dependencies: ['orm'],
  async start(env, { orm }) {
    let budget = 5000;
    let refreshPromise = null;

    const applyBudget = (value) => {
      const next = Number(value);
      if (!Number.isNaN(next) && next !== budget) {
        budget = next;
        env.bus.trigger('budget-changed', budget);
      }
    };

    const loadBudget = async () => {
      applyBudget(await orm.call('purchase.order', 'owl3_get_budget', []));
      return budget;
    };

    // Carga el valor real al arrancar; si falla, se mantiene el valor por defecto.
    try {
      await loadBudget();
    } catch (error) {
      console.error('No se pudo cargar el presupuesto global', error);
    }

    return {
      get budget() {
        return budget;
      },
      /**
       * Regla de negocio compartida: el pedido necesita autorización cuando su
       * total (ya convertido a moneda de la compañía) supera el tope.
       */
      needsApproval(total) {
        return Number(total) > budget;
      },
      async setBudget(newBudget) {
        const value = await orm.call('purchase.order', 'owl3_set_budget', [newBudget]);
        applyBudget(value);
        return budget;
      },
      /**
       * Las dos widgets de la cabecera pueden pedir refresco a la vez. Se
       * comparte la misma promesa para no lanzar dos RPC idénticos.
       */
      async refresh() {
        if (!refreshPromise) {
          refreshPromise = loadBudget().finally(() => {
            refreshPromise = null;
          });
        }
        return refreshPromise;
      },
    };
  },
};

registry.category('services').add('purchase_budget', purchaseBudgetService);
