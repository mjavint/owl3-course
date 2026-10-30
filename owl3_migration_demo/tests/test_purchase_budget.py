from odoo.exceptions import UserError
from odoo.tests import TransactionCase, tagged

from odoo.addons.owl3_migration_demo.models.purchase_order import (
    OWL3_BUDGET_PARAM,
)


@tagged("post_install", "-at_install")
class TestPurchaseBudget(TransactionCase):
    """Pruebas del presupuesto global y del ciclo confirmar/aprobar/cancelar."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env.company.po_double_validation = "one_step"
        # En tests el usuario es admin; aseguramos también el grupo de compras
        # para que pueda ajustar el tope global.
        cls.env.user.sudo().write(
            {
                "group_ids": [
                    (4, cls.env.ref("purchase.group_purchase_manager").id)
                ]
            }
        )
        cls.purchase_user = cls.env["res.users"].create(
            {
                "name": "Comprador de prueba",
                "login": "comprador_prueba",
                "email": "comprador.prueba@example.com",
                "company_id": cls.env.company.id,
                "company_ids": [(6, 0, [cls.env.company.id])],
                "group_ids": [
                    (
                        6,
                        0,
                        [
                            cls.env.ref("base.group_user").id,
                            cls.env.ref("purchase.group_purchase_user").id,
                        ],
                    )
                ],
            }
        )
        cls.partner = cls.env["res.partner"].create(
            {
                "name": "Proveedor de prueba",
                "supplier_rank": 1,
            }
        )
        cls.product = cls.env["product.product"].create(
            {
                "name": "Producto de prueba",
                "type": "consu",
                "purchase_ok": True,
                "sale_ok": False,
                "taxes_id": [(6, 0, [])],
                "supplier_taxes_id": [(6, 0, [])],
            }
        )

    def setUp(self):
        super().setUp()
        self.env["ir.config_parameter"].sudo().set_param(
            OWL3_BUDGET_PARAM, "5000.0"
        )

    def _create_po(self, price_unit):
        return self.env["purchase.order"].create(
            {
                "partner_id": self.partner.id,
                "order_line": [
                    (
                        0,
                        0,
                        {
                            "product_id": self.product.id,
                            "product_qty": 1.0,
                            "price_unit": price_unit,
                            "tax_ids": [(6, 0, [])],
                        },
                    )
                ],
            }
        )

    def _budget(self):
        return self.env["purchase.order"]._owl3_get_budget()

    def test_within_budget_confirms_and_deducts(self):
        order = self._create_po(3000.0)
        self.assertFalse(order.owl3_requires_approval)
        self.assertAlmostEqual(order.owl3_total_company_currency, 3000.0)
        order.button_confirm()
        self.assertEqual(order.state, "purchase")
        self.assertTrue(order.owl3_budget_deducted)
        self.assertAlmostEqual(order.owl3_budget_deducted_amount, 3000.0)
        self.assertAlmostEqual(self._budget(), 2000.0)

    def test_over_budget_cannot_confirm_normally(self):
        order = self._create_po(7000.0)
        self.assertTrue(order.owl3_requires_approval)
        with self.assertRaises(UserError):
            order.button_confirm()
        self.assertEqual(order.state, "draft")
        self.assertAlmostEqual(self._budget(), 5000.0)

    def test_over_budget_approval_leaves_negative_budget(self):
        order = self._create_po(7000.0)
        order.owl3_confirm_over_budget()
        self.assertEqual(order.state, "purchase")
        self.assertTrue(order.owl3_budget_deducted)
        self.assertAlmostEqual(order.owl3_budget_deducted_amount, 7000.0)
        self.assertAlmostEqual(self._budget(), -2000.0)

    def test_approve_is_idempotent(self):
        order = self._create_po(3000.0)
        order.button_confirm()
        self.assertAlmostEqual(self._budget(), 2000.0)
        order.button_approve()
        self.assertAlmostEqual(self._budget(), 2000.0)

    def test_cancel_refunds_exact_amount(self):
        order = self._create_po(3000.0)
        order.button_confirm()
        self.assertAlmostEqual(self._budget(), 2000.0)
        order.button_cancel()
        self.assertEqual(order.state, "cancel")
        self.assertFalse(order.owl3_budget_deducted)
        self.assertAlmostEqual(self._budget(), 5000.0)
        order.button_cancel()
        self.assertAlmostEqual(self._budget(), 5000.0)

    def test_reset_and_reapprove_does_not_double_deduct(self):
        order = self._create_po(3000.0)
        order.button_confirm()
        self.assertAlmostEqual(self._budget(), 2000.0)
        order.button_draft()
        self.assertAlmostEqual(self._budget(), 5000.0)
        order.button_confirm()
        self.assertAlmostEqual(self._budget(), 2000.0)

    def test_exact_budget_is_allowed(self):
        order = self._create_po(5000.0)
        self.assertFalse(order.owl3_requires_approval)
        order.button_confirm()
        self.assertAlmostEqual(self._budget(), 0.0)

    def test_negative_budget_cannot_be_set_manually(self):
        order_model = self.env["purchase.order"]
        with self.assertRaises(UserError):
            order_model.owl3_set_budget(-1)
        self.assertAlmostEqual(self._budget(), 5000.0)

    def test_set_budget_rounds_to_currency(self):
        order_model = self.env["purchase.order"]
        expected = self.env.company.currency_id.round(1234.567)
        stored = order_model.owl3_set_budget(1234.567)
        self.assertAlmostEqual(stored, expected)
        self.assertAlmostEqual(self._budget(), expected)

    def test_purchase_user_cannot_set_budget(self):
        with self.assertRaises(UserError):
            self.env["purchase.order"].with_user(
                self.purchase_user
            ).owl3_set_budget(6000.0)
        self.assertAlmostEqual(self._budget(), 5000.0)

    def test_two_step_non_manager_sends_to_approval(self):
        self.env.company.write(
            {
                "po_double_validation": "two_step",
                "po_double_validation_amount": 1000.0,
            }
        )
        order = self._create_po(7000.0)
        order.with_user(self.purchase_user).owl3_confirm_over_budget()
        self.assertEqual(order.state, "to approve")
        self.assertFalse(order.owl3_budget_deducted)
        self.assertAlmostEqual(self._budget(), 5000.0)
        # El responsable de compras aprueba y es cuando se descuenta.
        order.with_user(self.env.user).button_approve()
        self.assertEqual(order.state, "purchase")
        self.assertTrue(order.owl3_budget_deducted)
        self.assertAlmostEqual(self._budget(), -2000.0)
