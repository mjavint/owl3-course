# Owl 3 Migration Demo — versión ANTES (Odoo 19 / Owl 2)

Addon didáctico del curso **Migración Owl 2 → Owl 3**. Este addon es la
versión "antes": usa las APIs de Odoo 19 / Owl 2 para que el alumno las
migre después a Owl 3 (señales, plugins, `useProps`, `t-out`, `<Portal>`...).

## Flujo de presupuesto

El tope es **global**: un único valor para todos los pedidos de compra. No es
un campo del pedido. Se guarda en el parámetro de sistema
`owl3_migration_demo.purchase_budget_limit` (por defecto `5000.00`) y se
expresa en la moneda de la compañía.

| Situación | Qué ve el usuario | Qué ocurre |
| --- | --- | --- |
| `draft`/`sent` y total ≤ tope | “Confirmar pedido” estándar | Se confirma y se descuenta el total |
| `draft`/`sent` y total > tope | “Aprobar el tope de presupuesto” | Se confirma por el flujo estándar; el tope queda negativo |
| `to approve` | “Aprobar” estándar (responsable) | Se aprueba y se descuenta; negativo si procede |
| Pedido ya aprobado | — | No se vuelve a descontar |
| Cancelar o resetear | — | Se devuelve el importe exacto descontado |

Detalles de la lógica:

- `owl3_requires_approval` compara el total convertido a moneda de compañía
  (`owl3_total_company_currency`) con el tope global.
- `button_confirm` bloquea la confirmación normal por encima del tope.
- `owl3_confirm_over_budget` conserva el flujo estándar de `button_confirm`
  (validaciones, doble validación) y solo evita el guard del presupuesto.
- `button_approve` es el único punto que descuenta, tanto en el flujo normal
  como en el flujo de exceso.
- `owl3_budget_deducted` / `owl3_budget_deducted_amount` evitan duplicar el
  descuento y permiten devolver el importe exacto.
- Solo un responsable de compras (o un administrador) puede ajustar el tope.
  El resto ve el valor como etiqueta de solo lectura.

## Elementos de Owl 2 incluidos

| Elemento | Dónde se ve |
| --- | --- |
| Client action | `webclient/dashboard/sale_dashboard_action.js` |
| Composición + props | Dashboard y subcomponentes (`dashboard_*.js`) |
| `useState` | `dashboard.js`, `invoice_preview.js`, `budget_dialog.js` |
| `useRef` | `search_input.js`, `dashboard_chart.js`, `budget_dialog.js` |
| `onWillStart` | `dashboard.js`, `budget_button.js`, `purchase_approve_button.js` |
| `onMounted` | `invoice_preview.js`, `budget_dialog.js` |
| `onWillUnmount` / `useEffect` | `dashboard_chart.js` |
| `useExternalListener` | `invoice_preview.js` |
| `useService` | Dashboard, widgets y diálogos |
| `useBus` | `budget_button.js` (evento `budget-changed`) |
| `useRecordObserver` | `budget_button.js` |
| Servicio propio | `core/budget/budget_service.js` (`purchase_budget`) |
| Field widget | `views/fields/risk_field` (`owl3_risk`) |
| View widget | `budget_button`, `purchase_approve_button`, `invoice_preview` |
| Diálogo | `budget_dialog`, `confirm_approval_dialog` |
| Notificación | Aprobación y ajuste del tope |
| `t-model` | `budget_dialog.xml` |
| `t-portal` | `invoice_preview/preview_modal.xml` |
| `t-esc`, `t-if`, `t-foreach`, `t-on-click` | Todas las plantillas |
| `loadFile` | `invoice_preview.js` |
| `loadBundle` + Chart.js | `dashboard_chart.js` |
| `rpc` / servicio `orm` | Dashboard, servicio de presupuesto y widget de aprobación |
| Tests | `static/tests/sale_dashboard.test.js`, `tests/test_purchase_budget.py` |

## Mapa rápido Owl 2 → Owl 3

| Owl 2 (este addon) | Owl 3 |
| --- | --- |
| `useState` | `signal` / proxy reactivo |
| `useRef` | `signal.ref()` |
| `useService("orm")` | `usePlugin(ormPlugin)` (o el plugin equivalente) |
| Servicio con `env.bus` | Plugin + señales |
| `this.env` | Plugins |
| `static props` + `this.props` | `useProps` |
| `t-esc` | `t-out` |
| `t-portal` | `<Portal>` |
| `onWillStart`, `onMounted`, etc. | Se mantienen, con los cambios de ciclo de vida de Owl 3 |
| Registro en `registry.category(...)` | Se mantiene el registro de Odoo; cambia el consumo de servicios |

## Pruebas

El addon trae dos suites independientes: el test de interfaz con **Hoot** y el
test backend del presupuesto. Puedes ejecutarlas juntas o por separado.

### Test de interfaz (Hoot)

`static/tests/sale_dashboard.test.js` se publica en el bundle
`web.assets_unit_tests` (ver `__manifest__.py`). El runner de Odoo lo ejecuta en
Chrome headless contra la ruta `/web/tests`:

```bash
odoo-bin -d db_odoo19 -u owl3_migration_demo \
  --addons-path=<ruta-odoo>/addons,addon/odoo19_owl2 \
  --test-tags=/owl3_migration_demo --stop-after-init
```

- `--test-tags` ya activa el modo test: no hace falta añadir `--test-enable`.
- `-u` basta para relanzarlo; usa `-i` la primera vez, si el módulo aún no está
  instalado en la base.
- El test es `post_install`: se ejecuta al final, después de instalar o
  actualizar el módulo.
- Requiere Chrome/Chromium y el paquete `websocket-client`
  (`pip install websocket-client`). Si Chrome no está en la ruta habitual,
  indícalo con `ODOO_BROWSER_BIN=/ruta/a/chrome`.
- En el log debe aparecer `[HOOT] Test suite succeeded`. Si no aparece, el test
  no llegó a ejecutarse: revisa que el módulo esté instalado y que el manifest
  incluya `static/tests/*.test.js` en `web.assets_unit_tests`.
- En Odoo 19 conviven Hoot y el runner legacy de QUnit (`/web/tests/legacy`);
  este addon usa Hoot.

Modo interactivo (navegador, con recarga y filtros por módulo):

```bash
odoo-bin -d db_odoo19 -u owl3_migration_demo \
  --addons-path=<ruta-odoo>/addons,addon/odoo19_owl2 --dev=all
# abre http://localhost:8069/web/tests y marca owl3_migration_demo
```

### Test backend

```bash
odoo-bin -d db_odoo19 \
  --addons-path=<ruta-odoo>/addons,addon/odoo19_owl2 \
  --test-tags /owl3_migration_demo:TestPurchaseBudget \
  --stop-after-init --http-port=8071
```

Las pruebas cubren: confirmación dentro del tope, bloqueo y aprobación por
encima, presupuesto negativo, idempotencia, devolución al cancelar/resetear,
redondeo, permisos y el caso de doble validación con un comprador que no puede
aprobar.
