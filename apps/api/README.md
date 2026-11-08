<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Account registration

Send a `POST` request to `/register` with a full name, email, password (at least
8 characters), and an optional phone number:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "a-secure-password",
  "phone": "0900000000"
}
```

The API hashes the password before saving it, creates new accounts with the
default `CUSTOMER` role, and does not include the password hash in its response.
An email already in use returns `409 Conflict`. Database schema changes must be
applied with `npx prisma migrate dev` from this directory.

## Create an order

Send a `POST` request to `/orders`. The API creates a new order for each
successful request; it does not use an order `idempotencyKey`. Send one item for
the quick-buy flow, or multiple items for cart checkout:

```json
{
  "userId": "01234567-89ab-4cde-8f01-23456789abcd",
  "note": "Ít ngọt, nhận tại quầy",
  "items": [
    {
      "productId": "11234567-89ab-4cde-8f01-23456789abcd",
      "quantity": 2,
      "selectedSize": "L",
      "sugarLevel": "50%",
      "iceLevel": "0%",
      "selectedToppings": ["trân châu", "pudding"]
    }
  ]
}
```

For backward compatibility, a one-product request may also use `productId` and
`quantity` instead of `items`. The UI uses `items` for both flows so the selected
options are preserved. `note` is optional and limited to 500 characters. A cart
may contain multiple lines for the same product when their customizations differ;
the API checks the combined quantity against available stock.

Supported options are sizes `S`, `M`, and `L`; sugar levels `25%`, `50%`,
`75%`, and `100%`; ice levels `0%`, `50%`, and `100%`; and toppings
`trân châu`, `pudding`, and `thạch`. These options do not add a surcharge in
the current version.

In local development, a pending mock payment is created with each order. The
user selects `MOMO`, `VNPAY`, or `SHOPEEPAY` after placing the order and submits
an outcome (`SUCCESS`, `FAILED`, or `CANCELLED`) to
`POST /orders/:orderId/payments/:paymentId/mock`. Guest orders must include
their `guestAccessToken`; authenticated orders use the bearer token. A
successful outcome confirms the order; failure or cancellation restores the
reserved stock. Mock payment is disabled in production and does not connect to
a real provider or move money.

After a successful payment, registered customers earn one loyalty point for
each 10,000 VND in the paid order total, rounded down per order. Guest orders do
not earn points. `GET /orders/loyalty/mine` returns the authenticated
customer's balance and up to 100 recent transactions. Point redemption is not
included.

Product prices and order totals come from the database; price, status,
timestamps, and order codes are not accepted from the client. The response
includes the order code, status, totals, and saved order items for confirmation.

## Manage products

Product management endpoints require an active `MANAGER` bearer token:

- `GET /products?search=latte&category=COFFEE&status=AVAILABLE` searches by
  name and optionally filters by category and status. Omit filters to list all
  products, including unavailable ones.
- `GET /products/:id` finds one product.
- `POST /products` creates a product with `name` and numeric `basePrice`;
  `description`, `category`, `stockQuantity`, `imageUrl`, and `status` are
  optional. Active product names must be unique regardless of letter case;
  names belonging only to `UNAVAILABLE` products can be reused.
- `PATCH /products/:id` updates only supplied product fields.
- `DELETE /products/:id` soft-deletes by setting `status` to `UNAVAILABLE`.
  The row and its order history remain in the database.

The migration adds a PostgreSQL partial unique index for active names. If the
database already contains active products whose names differ only by case,
resolve those duplicates before applying the migration.

## Manage staff and customers

These endpoints require an active `MANAGER` bearer token. They only manage
`STAFF` and `CUSTOMER` accounts; manager accounts cannot be changed here.

- `GET /users?search=hoa&role=STAFF&status=ACTIVE` searches by name or email
  and optionally filters by role and status. Without a role filter, staff and
  customer accounts are returned.
- `GET /users/:id` gets one staff or customer account.
- `POST /users` creates a customer by default, or a staff account when
  `role` is `STAFF`. Passwords are hashed and never returned.
- `PATCH /users/:id` updates supplied account fields, including activation
  state. `BLOCKED` is reserved for the login lockout flow.
- `DELETE /users/:id` soft-deletes the account by setting status to `INACTIVE`.
- `POST /users/:id/unlock` reactivates a permanently blocked account and
  resets its failed-login count, lockout stage, and lock expiration.

## Manager statistics

Statistics endpoints require an active `MANAGER` bearer token:

- `GET /statistics/monthly-revenue?year=2026` returns the successful payment
  revenue for each month of the requested year, grouped by payment `paidAt`.
  The current year is used when `year` is omitted.
- `GET /statistics/inventory` returns stock quantities for products that are
  not `UNAVAILABLE`, marks products with fewer than 10 items, and lists those
  low-stock products separately.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
