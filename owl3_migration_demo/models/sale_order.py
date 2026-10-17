from odoo import api, fields, models


class SaleOrder(models.Model):
    _inherit = "sale.order"

    # Campo de demo usado por el dashboard de ventas (client action).
    owl3_margin_percent = fields.Float(
        string="Margen (%)",
        compute="_compute_owl3_margin_percent",
        help="Margen estimado sobre el total. Campo de demo del curso Owl 3.",
    )

    @api.depends("amount_untaxed")
    def _compute_owl3_margin_percent(self):
        for order in self:
            if order.amount_untaxed:
                # Margen de demo: 12% fijo (no depende de costes reales).
                order.owl3_margin_percent = 12.0
            else:
                order.owl3_margin_percent = 0.0
