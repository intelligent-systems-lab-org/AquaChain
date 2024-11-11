# Aquachain API Documentation

Welcome to the **Aquachain API** documentation! This API provides secure and efficient access to Aquachain’s system for managing industrial water and waste resources. Designed for developers and partners in the water management sector, the API enables seamless interactions with Aquachain's resources and services.

## Main Features

- **Tariff Management**: Manage tariffs for water and waste usage, including retrieval and updates.
- **Reservoir Data**: Create, access, and update information about reservoir capacity and water levels.
- **Consumer Accounts**: Register and manage consumer accounts to track resource usage.
- **Payments**: Facilitate payments by consumers for water usage and waste treatment.

## Environment URLs

- **Local**: [http://localhost:3000](http://localhost:3000) (for testing and development)
- **Production**: **WIP** (to be updated upon deployment)

## Connections

Set the provider for Aquachain that the API connects to using the `ANCHOR_PROVIDER_URL` environment variable. The following URLs can be used based on your network environment:

- **Localnet**: `<YOUR-LOCALNET-URL>`, e.g., [http://127.0.0.1:8899](http://127.0.0.1:8899) (default set by solana-test-validator)
- **Devnet**: **WIP**
- **Mainnet**: **WIP**

## Documentation

The Aquachain API documentation, based on the OpenAPI v3.0.0 standard, is accessible from the root environment URL and provides a comprehensive guide to all available endpoints.

To get started locally, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the API server** (ensure that your Aquachain instance is running):
   ```bash
   npm run start
   ```

Each available endpoint is listed in the navigation panel on the left, with individual documentation pages for each operation. These pages allow users to explore the API, send test requests directly from the documentation, and view response examples.

## Authentication

Aquachain API uses key-based authentication for secure access. Include an `Authorization` header in each request with your API key as follows:

```plaintext
Authorization: <YOUR-WALLET-PRIVATE-KEY>
```

- **Authorization Header**: This header is required for agency-authorized requests, such as creating or updating Aquachain accounts.

Additionally, some endpoints require a **Consumer Authorization** header for consumer-specific operations like charging and paying for water usage and waste treatment:

```plaintext
Consumer-Authorization: <CONSUMER-KEY>
```

To set your API keys conveniently, navigate to the **Authentication** page, where you can input and manage your authorization keys.