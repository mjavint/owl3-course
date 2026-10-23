/** @odoo-module **/
import { Component, onWillStart, signal, computed } from '@odoo/owl';
import { rpc } from '@web/core/network/rpc';
import { useService } from '@web/core/utils/hooks';
import { DashboardHeader } from './dashboard_header';
import { DashboardList } from './dashboard_list';
import { DashboardFooter } from './dashboard_footer';
import { SearchInput } from './search_input';
import { DashboardChart } from './dashboard_chart';

/**
 * Dashboard de ventas (Owl 2): presentación + carga de datos.
 *
 * Compone cinco subcomponentes reutilizables (búsqueda, cabecera, gráfico,
 * lista y pie) y carga los datos con el servicio `orm` y con la función `rpc`
 * importada: en Odoo 19 `rpc` ya es un import directo de
 * `@web/core/network/rpc`. NO conoce el servicio de acciones: eso lo aporta
 * `SaleDashboardAction` mediante props (composición, no herencia).
 */
export class SaleDashboard extends Component {
  static template = 'owl3_migration_demo.SaleDashboard';
  static components = {
    SearchInput,
    DashboardHeader,
    DashboardChart,
    DashboardList,
    DashboardFooter,
  };

  static props = {
    onSelect: { type: Function, optional: true },
    onNewOrder: { type: Function, optional: true },
  };

  orders = signal.Array([]);
  total = signal(0);
  searchText = signal('');

  setup() {
    this.orm = useService('orm');

    onWillStart(async () => {
      await this.loadOrders();
    });
  }

  async loadOrders() {
    const rows = await this.orm.searchRead(
      'sale.order',
      [['state', '!=', 'cancel']],
      ['name', 'partner_id', 'amount_total', 'currency_id', 'state'],
      { limit: 20, order: 'date_order desc' }
    );
    this.orders.set(rows || []);
    const stats = await rpc('/owl3_migration_demo/sale_stats', {
      order_ids: (this.orders() || []).map((o) => o.id),
    });
    this.total.set(stats && stats.total ? stats.total : 0);
  }

  openOrder(orderId) {
    if (this.props.onSelect) {
      this.props.onSelect(orderId);
    }
  }

  openNewOrder() {
    if (this.props.onNewOrder) {
      this.props.onNewOrder();
    }
  }

  onSearch(text) {
    this.searchText.set(text);
  }

  count = computed(() => (this.orders() || []).length);

  // Filtro derivado del estado: al leer `state` en render, Owl repinta solo.
  filteredOrders = computed(() => {
    const text = (this.searchText() || '').trim().toLowerCase();
    const orders = this.orders();
    if (!text) {
      return orders;
    }
    return orders.filter(
      (o) =>
        (o.name || '').toLowerCase().includes(text) ||
        ((o.partner_id && o.partner_id[1]) || '').toLowerCase().includes(text)
    );
  });

  avg = computed(() => (this.count() ? this.total() / this.count() : 0));

  formatCurrency(val) {
    const n = Number(val) || 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  totalFormatted = computed(() => this.formatCurrency(this.total()));

  avgFormatted = computed(() => this.formatCurrency(this.avg()));

  chartData = computed(() => {
    const orders = this.orders();
    const buckets = { draft: 0, sent: 0, sale: 0, other: 0 };
    for (const o of orders) {
      const st = (o.state || '').toLowerCase();
      if (st === 'draft') buckets.draft += 1;
      else if (st === 'sent') buckets.sent += 1;
      else if (st === 'sale') buckets.sale += 1;
      else buckets.other += 1;
    }
    return buckets;
  });

  // El dashboard conoce los estados de `sale.order`; el gráfico, no.
  chartSeries = computed(() => {
    const data = this.chartData();
    return [
      { label: 'Borrador', value: data.draft },
      { label: 'Enviado', value: data.sent },
      { label: 'Pedido', value: data.sale },
      { label: 'Otros', value: data.other },
    ];
  });
}
