/** @odoo-module **/
import { Component, onMounted, useRef, useState } from '@odoo/owl';
import { Dialog } from '@web/core/dialog/dialog';

/**
 * Diálogo para ajustar el tope global de compras (Owl 2).
 *
 * Es el ejemplo de formulario dentro de un diálogo:
 * - `useState` guarda el valor editable (en Owl 3 será una señal).
 * - `useRef` + `onMounted` enfocan y seleccionan el input al abrir.
 * - `t-model` enlaza el input con el estado (en Owl 3, con la señal).
 *
 * El diálogo no conoce RPC ni el pedido: solo valida y delega en `confirm`.
 * Así se puede reutilizar y testear de forma aislada.
 */
export class BudgetDialog extends Component {
  static template = 'owl3_migration_demo.BudgetDialog';
  static components = { Dialog };

  static props = {
    close: Function,
    currentBudget: Number,
    confirm: Function,
  };

  setup() {
    this.state = useState({
      value: this.props.currentBudget,
    });
    this.inputRef = useRef('budgetInput');
    onMounted(() => {
      this.inputRef.el?.focus();
      this.inputRef.el?.select();
    });
  }

  get newBudget() {
    return Number(this.state.value);
  }

  get isValid() {
    return Number.isFinite(this.newBudget) && this.newBudget >= 0;
  }

  get formattedCurrentBudget() {
    return Number(this.props.currentBudget || 0).toFixed(2);
  }

  async onConfirm() {
    if (!this.isValid) {
      return;
    }
    await this.props.confirm(this.newBudget);
    this.props.close();
  }

  onCancel() {
    this.props.close();
  }
}
