from odoo import api, fields, models
from odoo.exceptions import UserError

OWL3_BUDGET_PARAM = "owl3_migration_demo.purchase_budget_limit"
OWL3_DEFAULT_BUDGET = 5000.0


class PurchaseOrder(models.Model):
    _inherit = "purchase.order"

    owl3_requires_approval = fields.Boolean(
        string="Requiere aprobación",
        compute="_compute_owl3_requires_approval",
    )
    owl3_can_approve = fields.Boolean(
        string="Puede aprobar el presupuesto",
        compute="_compute_owl3_can_approve",
    )
    owl3_can_manage_budget = fields.Boolean(
        string="Puede gestionar el presupuesto",
        compute="_compute_owl3_can_manage_budget",
    )
    owl3_company_currency_id = fields.Many2one(
        "res.currency",
        string="Moneda de la compañía",
        related="company_id.currency_id",
    )
    owl3_total_company_currency = fields.Monetary(
        string="Total en moneda de la compañía",
        currency_field="owl3_company_currency_id",
        compute="_compute_owl3_total_company_currency",
    )
    # Trazabilidad mínima por pedido: evita descontar dos veces el mismo
    # compromiso y permite devolver el importe exacto al cancelar o resetear.
    owl3_budget_deducted = fields.Boolean(
        string="Presupuesto descontado",
        default=False,
        copy=False,
        readonly=True,
    )
    owl3_budget_deducted_amount = fields.Monetary(
        string="Importe descontado del presupuesto",
        currency_field="owl3_company_currency_id",
        default=0.0,
        copy=False,
        readonly=True,
    )

    # -------------------------------------------------------------------------
    # Presupuesto global (compartido por todos los pedidos)
    # -------------------------------------------------------------------------
    def _owl3_get_budget(self):
        """Devuelve el presupuesto global en la moneda de la compañía."""
        value = (
            self.env["ir.config_parameter"]
            .sudo()
            .get_param(OWL3_BUDGET_PARAM, str(OWL3_DEFAULT_BUDGET))
        )
        return float(value)

    def _owl3_set_budget(self, value):
        """Guarda el presupuesto global. Puede quedar negativo."""
        self.env["ir.config_parameter"].sudo().set_param(OWL3_BUDGET_PARAM, str(value))

    def _owl3_user_can_manage_budget(self):
        """El tope global solo lo ajustan responsables de compras o admins."""
        user = self.env.user
        return user.has_group("purchase.group_purchase_manager") or user.has_group(
            "base.group_system"
        )

    @api.model
    def owl3_get_budget(self):
        """RPC: devuelve el presupuesto global disponible."""
        return self._owl3_get_budget()

    @api.model
    def owl3_set_budget(self, value):
        """RPC: fija el presupuesto global y devuelve el valor guardado.

        El valor que se puede fijar manualmente nunca es negativo: el saldo
        negativo solo lo produce una aprobación que supera el tope.
        """
        if not self._owl3_user_can_manage_budget():
            raise UserError(
                self.env._(
                    "Solo un responsable de compras puede ajustar el tope "
                    "de presupuesto."
                )
            )
        try:
            budget = float(value)
        except (TypeError, ValueError):
            raise UserError(self.env._("El tope de presupuesto debe ser un número."))
        if budget < 0:
            raise UserError(self.env._("El tope de presupuesto no puede ser negativo."))
        budget = self.env.company.currency_id.round(budget)
        self._owl3_set_budget(budget)
        return budget

    def _owl3_total_in_company_currency(self):
        """Importe del pedido convertido a la moneda de la compañía."""
        self.ensure_one()
        company = self.company_id or self.env.company
        currency = self.currency_id or company.currency_id
        return currency._convert(
            self.amount_total,
            company.currency_id,
            company,
            self.date_order or fields.Date.today(),
        )

    @api.depends("amount_total", "currency_id", "company_id", "date_order")
    def _compute_owl3_total_company_currency(self):
        for order in self:
            order.owl3_total_company_currency = order._owl3_total_in_company_currency()

    @api.depends("amount_total", "currency_id", "company_id", "date_order")
    def _compute_owl3_requires_approval(self):
        budget = self._owl3_get_budget()
        for order in self:
            order.owl3_requires_approval = (
                order._owl3_total_in_company_currency() > budget
            )

    @api.depends("amount_total", "currency_id", "company_id", "date_order")
    @api.depends_context("uid")
    def _compute_owl3_can_approve(self):
        for order in self:
            order.owl3_can_approve = order._approval_allowed()

    @api.depends_context("uid")
    def _compute_owl3_can_manage_budget(self):
        allowed = self._owl3_user_can_manage_budget()
        for order in self:
            order.owl3_can_manage_budget = allowed

    # -------------------------------------------------------------------------
    # Confirmación / aprobación
    # -------------------------------------------------------------------------
    def button_confirm(self):
        """Impide confirmar por la vía normal si el pedido supera el presupuesto.

        El exceso se autoriza con el widget "Aprobar el tope de presupuesto",
        que llama a `owl3_confirm_over_budget` y conserva el flujo estándar de
        confirmación (validaciones, doble validación, etc.).
        """
        for order in self:
            if order.state in ("draft", "sent") and order.owl3_requires_approval:
                raise UserError(
                    self.env._(
                        "El pedido %(order)s supera el presupuesto disponible. "
                        "Usa 'Aprobar el tope de presupuesto'.",
                        order=order.display_name,
                    )
                )
        return super().button_confirm()

    def owl3_confirm_over_budget(self):
        """Confirma un pedido que supera el tope usando el flujo estándar.

        Solo se salta el guard de presupuesto de `button_confirm`; el resto de
        validaciones y la doble validación de compras se mantienen. Si el
        usuario no puede aprobar, el pedido queda en `to approve` y el
        presupuesto se descontará cuando lo apruebe un responsable.
        """
        self.ensure_one()
        if self.state not in ("draft", "sent"):
            raise UserError(
                self.env._("Solo se pueden confirmar pedidos en borrador o enviados.")
            )
        if not self.owl3_requires_approval:
            return self.button_confirm()
        # `super()` evita el guard de esta clase y entra en el flujo estándar.
        return super().button_confirm()

    def button_approve(self, force=False):
        """Aprueba el pedido y descuenta su total del presupuesto global.

        Si el total supera el presupuesto, el saldo queda negativo: representa
        el exceso autorizado (deuda) que el pedido ha generado. El descuento
        se hace una sola vez por pedido; al cancelar o resetear se devuelve el
        importe exacto descontado.
        """
        pending = self.filtered(
            lambda order: (
                order.state in ("draft", "sent", "to approve")
                and not order.owl3_budget_deducted
            )
        )
        res = super().button_approve(force=force)
        approved = pending.filtered(lambda order: order.state == "purchase")
        if approved:
            budget = self._owl3_get_budget()
            for order in approved:
                amount = order._owl3_total_in_company_currency()
                budget -= amount
                order.owl3_budget_deducted_amount = amount
                order.owl3_budget_deducted = True
            # Redondea a la precisión de la moneda para evitar ruido flotante
            # al acumular deducciones con impuestos/descuentos.
            budget = approved[0].company_id.currency_id.round(budget)
            self._owl3_set_budget(budget)
        return res

    def _owl3_refund_budget(self):
        """Devuelve al tope el importe exacto descontado por estos pedidos."""
        deducted = self.filtered(lambda order: order.owl3_budget_deducted)
        if not deducted:
            return
        budget = self._owl3_get_budget()
        for order in deducted:
            budget += order.owl3_budget_deducted_amount
        budget = deducted[0].company_id.currency_id.round(budget)
        self._owl3_set_budget(budget)
        deducted.write(
            {
                "owl3_budget_deducted": False,
                "owl3_budget_deducted_amount": 0.0,
            }
        )

    def button_draft(self):
        res = super().button_draft()
        self._owl3_refund_budget()
        return res

    def button_cancel(self):
        res = super().button_cancel()
        self._owl3_refund_budget()
        return res
