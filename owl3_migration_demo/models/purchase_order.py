from odoo import api, fields, models


class PurchaseOrder(models.Model):
    _inherit = "purchase.order"

    # Tope de presupuesto de demo: si el total supera este importe, se pide aprobación.
    owl3_budget_limit = fields.Monetary(
        string="Tope de presupuesto",
        currency_field="currency_id",
        default=5000.0,
        help="Importe máximo sin aprobación. Campo de demo del curso Owl 3.",
    )
    owl3_requires_approval = fields.Boolean(
        string="Requiere aprobación",
        compute="_compute_owl3_requires_approval",
    )

    # Sin @api.depends el campo computado no se recalcula al editar el total.
    @api.depends("amount_total", "owl3_budget_limit")
    def _compute_owl3_requires_approval(self):
        for order in self:
            order.owl3_requires_approval = order.amount_total > order.owl3_budget_limit
