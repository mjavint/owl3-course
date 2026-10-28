/* @odoo-module */
import { App } from '@odoo/owl';
import { expect, test } from '@odoo/hoot';
import { DashboardList } from '@owl3_migration_demo/webclient/dashboard/dashboard_list';

/**
 * Test sobre el subcomponente PRESENTACIONAL `DashboardList` (Owl 2).
 * No necesita servicios, así que es un test unitario puro `props` → template.
 */
test('DashboardList renderiza los pedidos recibidos', async () => {
  const app = new App(DashboardList, {
    props: {
      orders: [
        { id: 1, name: 'S0001', partner_id: [1, 'Cliente demo'], amount_total: 120 },
      ],
      onSelect: () => {},
    },
    target: document.body,
  });
  await app.mount();

  expect(document.body).toHaveText('S0001');

  app.destroy();
});
