{
    "name": "Owl 3 Migration Demo (Odoo 19 / Owl 2)",
    "version": "19.0.1.0.0",
    "category": "Technical",
    "summary": "Addon demo del curso 'Migración OWL 2 → OWL 3'. Versión ANTES (Odoo 19).",
    "description": """
Addon de ejemplo para el curso de migración Owl 2 → Owl 3.

Esta es la versión ANTES: código tal como se escribe en Odoo 19 (Owl 2).
La versión DESPUÉS vive en `addon/odoo20_owl3/owl3_migration_demo`.

Muestra, sobre Sale, Purchase y Account:
  - client action (dashboard de ventas)
  - field widget (riesgo de cobro)
  - servicio propio (tope de presupuesto de compras)
  - notificaciones y diálogos (aprobación de compras)
  - t-portal (vista previa de factura)
""",
    "depends": ["sale", "purchase", "account"],
    "data": [
        "views/sale_dashboard_action.xml",
        "views/purchase_order_views.xml",
        "views/account_move_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "owl3_migration_demo/static/src/**/*.js",
            "owl3_migration_demo/static/src/**/*.xml",
            "owl3_migration_demo/static/src/**/*.scss",
        ],
        "web.assets_unit_tests": [
            "owl3_migration_demo/static/tests/*.test.js",
        ],
    },
    "license": "LGPL-3",
    "installable": True,
    "application": False,
}
