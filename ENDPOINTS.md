A table that lists the endpoints from API stack, indicates whether they are secured or not.

## Current Endpoints 

|      Endpoint       | Method | Secured (Cognito) | API Key Required |     Category     | Query |                  Body                  |   Headers    |          Special Criteria/Notes          |
| :-----------------: | :----: | :---------------: | :--------------: | :--------------: | :---: | :------------------------------------: | :----------: | :--------------------------------------: |
|       `/api`        |  GET   |        No         |       Yes        | General Consumer |  No   |                   No                   |   API Key    | Basic health check, secured with API key |
|   `/admin/plans`    |  GET   |        Yes        |        No        |  Plans Actions   |  No   |                   No                   | Bearer Token |          Requires Cognito auth           |
| `/admin/plans/{id}` |  GET   |        Yes        |        No        |  Plans Actions   |  No   |                   No                   | Bearer Token |          Requires Cognito auth           |
|    `/admin/keys`    |  GET   |        Yes        |        No        |   Key Actions    |  No   |                   No                   | Bearer Token |          Requires Cognito auth           |
|    `/admin/keys`    |  POST  |        Yes        |        No        |   Key Actions    |  No   |   planId, enabled, name, description   | Bearer Token |          Requires Cognito auth           |
| `/admin/keys/{id}`  |  GET   |        Yes        |        No        |   Key Actions    |  No   |                   No                   | Bearer Token |          Requires Cognito auth           |
| `/admin/keys/{id}`  |  PUT   |        Yes        |        No        |   Key Actions    |  No   | id, planId, enabled, name, description | Bearer Token |           Requires Cognito aut           |
| `/admin/keys/{id}`  | DELETE |        Yes        |        No        |   Key Actions    |  No   |                   No                   | Bearer Token |          Requires Cognito auth           |
|  `/admin/credits`   |  GET   |        Yes        |        No        | Credits Actions  |  Yes  |                   No                   | Bearer Token |          Requires Cognito auth           |
|  `/admin/credits`   |  POST  |        Yes        |        No        | Credits Actions  |  No   |             keyId, credits             | Bearer Token |          Requites Cognito auth           |
|  `/admin/credits`   |  PUT   |        Yes        |        No        | Credits Actions  |  No   |           keyId, newBalance            | Bearer Token |                                          |

## Auth Endpoints ( to check )

| Endpoint                | Method | Secured (Cognito) | API Key Required | Category              | Description                                        | Done                                                         |
| ----------------------- | ------ | ----------------- | ---------------- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| `/auth/login`           | POST   | No                | No               | Authorization Actions | Logs a user in and returns an authorization token. | Yes ( need to check how it work and if endpoint /auth/login is correct ) |
| `/auth/register`        | POST   | No                | No               | Authorization Actions | Registers a new user.                              | Yes ( need to check how it work and if endpoint /auth/register is correct ) |
| `/auth/logout`          | POST   | Yes               | No               | Authorization Actions | Logs a user out.                                   | Yes ( need to check how it work and if endpoint /auth/logout is correct ) |
| `/auth/forgot-password` | POST   | No                | No               | Authorization Actions | Initiates the password reset process.              | Yes ( need to check how it work and if endpoint /auth/forgot-password is correct ) |
| `/auth/reset-password`  | POST   | No                | No               | Authorization Actions | Resets the user's password.                        | Yes ( need to check how it work and if endpoint /auth/reset-password is correct ) |
| `/auth/change-password` | POST   | Yes               | No               | Authorization Actions | Changes the user's password.                       | Yes ( need to check how it work and if endpoint /auth/change-password is correct ) |

## Billing Endpoints

| Endpoint                         | Method | Secured (Cognito) | API Key Required | Category        | Description                                    | Done |
| -------------------------------- | ------ | ----------------- | ---------------- | --------------- | ---------------------------------------------- | ---- |
| `/billing/invoice`               | GET    | Yes               | No               | Billing Actions | Retrieves the latest invoice for the tenant.   | No   |
| `/billing/invoices`              | GET    | Yes               | No               | Billing Actions | Lists all invoices for the tenant.             | No   |
| `/billing/payment-method`        | GET    | Yes               | No               | Billing Actions | Retrieves the tenant's payment method on file. | No   |
| `/billing/update-payment-method` | POST   | Yes               | No               | Billing Actions | Updates the tenant's payment method.           | No   |

## Extra admin endpoints including credits endpoints and payments endpoints and notificaitons : 

| Endpoint                    | Method | Secured (Cognito) | API Key Required | Category              | Query | Body | Headers | Description                                                  | Done |
| --------------------------- | ------ | ----------------- | ---------------- | --------------------- | ----- | ---- | ------- | ------------------------------------------------------------ | ---- |
| `/admin/plans/subscribe`    | POST   | Yes               | No               | Plans Actions         |       |      |         | Subscribes the tenant to a new plan.                         | No   |
| `/admin/plans/cancel`       | POST   | Yes               | No               | Plans Actions         |       |      |         | Cancels the tenant's subscription plan.                      | No   |
| `/admin/credits/balance`    | GET    | Yes               | No               | Credits Actions       |       |      |         | Retrieves the current credit balance for the authenticated tenant. | No   |
| `/admin/credits/purchase`   | POST   | Yes               | No               | Payments Actions      |       |      |         | Allows a tenant to purchase additional credits. Interacts with a payment gateway. | No   |
| `/admin/credits/usage`      | GET    | Yes               | No               | Credits Actions       |       |      |         | Retrieves a report of credit consumption by the tenant.      | No   |
| `/admin/credits/update`     | PUT    | Yes               | No               | Credits Actions       |       |      |         | Updates the credit balance for the tenant, typically after a successful purchase. | No   |
| `/payments/create-intent`   | POST   | Yes               | No               | Payments Actions      |       |      |         | Creates a payment intent with the payment gateway for purchasing credits. | No   |
| `/payments/webhook`         | POST   | No                | No               | Payments Actions      |       |      |         | Webhook endpoint for receiving payment confirmation from the payment gateway. | No   |
| `/notifications/low-credit` | POST   | Yes               | No               | Notifications Actions |       |      |         | Sends a notification to the tenant when their credit balance is low. | No   |
| `/notifications/high-usage` | POST   | Yes               | No               | Notifications Actions |       |      |         | Sends a notification to the tenant when their credit usage is high. | No   |