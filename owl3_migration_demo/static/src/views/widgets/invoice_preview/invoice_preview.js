/** @odoo-module **/
import {
  Component,
  onMounted,
  useExternalListener,
  useState,
  loadFile,
  onWillStart,
} from '@odoo/owl';
import { useService } from '@web/core/utils/hooks';
import { registry } from '@web/core/registry';
import { standardWidgetProps } from '@web/views/widgets/standard_widget_props';
import { PreviewModal } from './preview_modal';

/**
 * View widget "owl3_invoice_preview" (Owl 2).
 *
 * - `useState` con `helpText` dentro: si se asigna a una propiedad plana en
 *   `onMounted` la plantilla no se vuelve a pintar (bug clásico).
 * - `onKeydown` como campo arrow para conservar `this` en el listener.
 * - La factura se carga a partir de `record.resId`, no de un id fijo.
 */
export class InvoicePreview extends Component {
  static template = 'owl3_migration_demo.InvoicePreview';
  static components = { PreviewModal };
  static props = {
    ...standardWidgetProps,
  };

  setup() {
    this.orm = useService('orm');
    this.state = useState({ show: false, move: null, helpText: '' });

    onWillStart(async () => {
      const [move] = await this.orm.read(
        'account.move',
        [this.props.record?.resId],
        ['name', 'partner_id', 'amount_total']
      );
      this.state.move = move;
    });

    useExternalListener(window, 'keydown', (ev) => this.onKeydown(ev));

    onMounted(async () => {
      this.state.helpText = await loadFile('/owl3_migration_demo/static/src/help.txt');
    });
  }

  openPreview() {
    this.state.show = true;
  }

  closePreview() {
    this.state.show = false;
  }

  onKeydown(ev) {
    if (ev.key === 'Escape' && this.state.show) {
      this.closePreview();
    }
  }
}

registry.category('view_widgets').add('owl3_invoice_preview', {
  component: InvoicePreview,
});
