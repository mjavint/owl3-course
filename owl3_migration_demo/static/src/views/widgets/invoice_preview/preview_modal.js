/** @odoo-module **/
import { Component } from '@odoo/owl';

/**
 * Modal de vista previa REUTILIZABLE (Owl 2).
 * El teletransporte se hace con la directiva `t-portal` (en Owl 3 desaparece
 * y pasa a ser el componente `<Portal>`).
 */
export class PreviewModal extends Component {
  static template = 'owl3_migration_demo.PreviewModal';

  // Si el componente declara props, debe declarar también `slots` (en modo
  // debug Owl valida los props y un `slots` no declarado da error).
  static props = {
    title: String,
    onClose: { type: Function, optional: true },
    slots: { type: Object, optional: true },
  };
}
