# Seed histórico del dashboard

El seed usa Prisma directamente para que `Order.createdAt` y el historial de estados sean
históricos reales. No utiliza la interfaz ni intenta enviar `createdAt` al endpoint público de
órdenes.

## Requisitos

- PostgreSQL local de pruebas.
- `PediloBackend` ejecutándose en `http://localhost:3001` y apuntando a esa misma base.
- El usuario E2E y el catálogo base preparados con `npm run e2e:seed`.
- El `DATABASE_URL` local disponible en `PediloBackend/.env`, o `E2E_DATABASE_URL`.

El script se detiene si `NODE_ENV=production`, si `BACKEND_URL` no es local o si la base de datos
no tiene un host local (`localhost`, `127.0.0.1` o `::1`). Nunca debe ejecutarse contra producción.

## Ejecución

```bash
# Terminal 1, dentro de /Users/jorgais/PediloBackend
npm run dev

# Terminal 2, dentro de /Users/jorgais/Pedilo
npm run e2e:seed
npm run e2e:seed:dashboard
CYPRESS_BASE_URL=http://localhost:3000 npx cypress run \
  --spec 'cypress/e2e/dashboard/seeded-dashboard.cy.ts' \
  --config video=false,retries=0
```

Si la base local no está en el `.env` del backend:

```bash
E2E_DATABASE_URL='postgresql://usuario:password@localhost:5432/pedilo_e2e' \
npm run e2e:seed:dashboard
```

El seed elimina únicamente órdenes del negocio E2E cuyo `notes` comienza con
`PEDILO_DASHBOARD_SEED_V1` y las órdenes antiguas marcadas por el script E2E como `E2E Cliente`.
Después crea nuevas órdenes con ventas `PREPARING`/`READY`, órdenes `CANCELLED`, combinaciones de
productos y fechas relativas a `America/Mazatlan`. También genera
`test-results/dashboard-seed-manifest.json`, que usa Cypress para calcular las expectativas sin
duplicar importes en el test.

La suite comprueba ventas, ticket promedio, tendencia, pedidos recientes, estados y exclusión de
cancelados. “Lo más vendido” y los insights se verifican como módulos visibles; sus valores se
alimentan de endpoints de productos y ventas respectivamente, no de los datos estáticos antiguos.
