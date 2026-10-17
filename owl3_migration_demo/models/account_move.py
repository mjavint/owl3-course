from odoo import api, fields, models


class AccountMove(models.Model):
    _inherit = "account.move"

    # "Riesgo de cobro" de demo: 0 = bajo, 1 = medio, 2 = alto.
    # Lo pinta un field widget (clase 2) con badges de color.
    owl3_risk_level = fields.Selection(
        selection=[
            ("low", "Bajo"),
            ("medium", "Medio"),
            ("high", "Alto"),
        ],
        string="Riesgo de cobro",
        compute="_compute_owl3_risk_level",
    )

    @api.depends("amount_residual", "amount_total", "invoice_date_due")
    def _compute_owl3_risk_level(self):
        for move in self:
            if move.state != "posted" or move.payment_state == "paid":
                move.owl3_risk_level = "low"
                continue
            residual = move.amount_residual or 0.0
            total = move.amount_total or 0.0
            ratio = (residual / total) if total else 0.0
            if ratio > 0.7:
                move.owl3_risk_level = "high"
            elif ratio > 0.3:
                move.owl3_risk_level = "medium"
            else:
                move.owl3_risk_level = "low"
