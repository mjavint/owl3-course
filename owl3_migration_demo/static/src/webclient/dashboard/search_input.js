/** @odoo-module **/
import { Component, useRef } from '@odoo/owl';

/**
 * Campo de búsqueda reutilizable (Owl 2).
 *
 * - El estado lo posee el PADRE: aquí llega `value` y avisamos por `onInput`
 *   (el hijo no muta nada por su cuenta).
 * - `useRef` da acceso al elemento real del input (`this.inputRef.el`) para
 *   vaciarlo y devolverle el foco tras "Limpiar".
 */
export class SearchInput extends Component {
  static template = 'owl3_migration_demo.SearchInput';

  static props = {
    value: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    onInput: { type: Function, optional: true },
  };

  setup() {
    this.inputRef = useRef('input');
  }

  onInput(ev) {
    if (this.props.onInput) {
      this.props.onInput(ev.target.value);
    }
  }

  clear() {
    if (this.inputRef.el) {
      this.inputRef.el.value = '';
      this.inputRef.el.focus();
    }
    if (this.props.onInput) {
      this.props.onInput('');
    }
  }
}
