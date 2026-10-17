from odoo import http
from odoo.http import request


class Owl3MigrationDemoController(http.Controller):
    """Endpoints de demo.

    Ojo: el tipo de ruta NO cambia entre Odoo 19 y 20: sigue siendo `type="jsonrpc"`.
    Lo único que cambia en el cliente es CÓMO se llama (servicio `rpc` en Owl 2;
    función `rpc` importada de `@web/core/network/rpc` en Owl 3).
    """

    @http.route(
        "/owl3_migration_demo/sale_stats",
        type="jsonrpc",
        auth="user",
    )
    def sale_stats(self, order_ids):
        orders = request.env["sale.order"].browse(order_ids).exists()
        return {
            "count": len(orders),
            "total": sum(orders.mapped("amount_total")),
            "average": (sum(orders.mapped("amount_total")) / len(orders)) if orders else 0.0,
        }
