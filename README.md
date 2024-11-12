![Aquachain Logo](/assets/Aquachain.png)

-----


<div align="center">

| <img src="https://solana.com/src/img/branding/solanaLogoMark.png" width="48" height="48"> <br> **Solana** | <img src="https://vectorified.com/images/rust-icon-15.png" width="48" height="48"> <br> **Rust** | <img src="https://img.icons8.com/color/48/typescript.png" width="48" height="48"> <br> **TypeScript** | <img src="https://nodejs.org/static/logos/jsIconGreen.svg" width="48" height="48"> <br> **Express.js** | <img src="https://www.anchor-lang.com/_next/image?url=%2Flogo.png&w=48&q=100" width="48" height="48"> <br> **Anchor** |
|:--:|:--:|:--:|:--:|:--:|

</div>

<p align = "center">
<b>A smart-contract based system for industrial water & waste resource management.</b> <i>Powered by the Solana blockchain.</i>
</p>

-----

<p align="center">
  <img src="https://img.shields.io/github/repo-size/intelligent-systems-lab-org/Aquachain?style=for-the-badge&color=green&logo=github" alt="Repo size">
  <a href="https://github.com/intelligent-systems-lab-org/Aquachain/issues">
    <img src="https://img.shields.io/github/issues/intelligent-systems-lab-org/Aquachain?style=for-the-badge&logo=github" alt="GitHub issues">
  </a>
  <img src="https://img.shields.io/github/last-commit/intelligent-systems-lab-org/Aquachain/main?style=for-the-badge&logo=github"
  alt="GitHub last development commit">
</p>

## Introduction

Aquachain is a blockchain-powered solution for managing industrial water and waste resources, leveraging the **Solana blockchain** to ensure transparency, efficiency, and security in resource tracking and billing. This system uses smart contracts to define and manage tariffs, allowing for a flexible and decentralized approach to resource management, especially in regions facing water scarcity and seasonal variability.

### Background

Water resource management is a critical issue in many regions, especially those prone to seasonal variations in water availability. Traditional billing systems lack flexibility and adaptability to such conditions, often leading to inefficient resource use and unsustainable practices. Aquachain aims to address these challenges by using **smart contracts** to implement dynamic tariffs that incentivize conservation and fair usage of water resources. By building on Solana, Aquachain benefits from high transaction speeds and low costs, making it suitable for large-scale, real-time applications.

### Key Features
- **Smart Contract-based Tariffs**: Implements various tariff structures including uniform, seasonal increasing, and seasonal decreasing block rates
- **Resource Tracking**: Monitors water usage and waste treatment through blockchain tokens
- **Automated Billing**: Handles billing cycles and payments through smart contracts
- **RESTful API**: Provides easy integration with existing systems via a comprehensive API

### Tokens

| Token | Symbol | Description |
|---|---|---|
| WaterToken | WTK | Transacted every cubic meter of water usage to the consumer. |
| WaterCapacityToken | WATC | Represents the contracted water capacity a consumer has at the start of the billing cycle. |
| WasteToken | WST | Transacted every cubic meter of waste to be treated. |

### Smart Contracts

#### SC1: Two-Part Tariff (Uniform and Increasing Block Rate)
Justification: This tariff structure incentivizes conservation of the water resource.

Rules: 	
- **WaterToken:** A water token that is transacted every $X\ m^3$ to the consumer.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start is block rated, meaning a consumer contracted to $X \ m^3$ for that period would pay $Y rate and a consumer contracted to $A \ m^3$ for that period would pay $B rate.
- **WasteToken:** The consumer is transacted a waste token every $X \ m^3$ to be treated.


#### SC2: Seasonal Tariff (Increasing block rate)
Justification: The nations within the Caribbean are impacted by the dry and rainy season, where replenishment of the natural resources occur during the latter season and conservation efforts are needed in the former.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start and then block rate increases as the reservoir capacity decreases during the dry season.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged based on the difference between the maximum reservoir capacity and the current reservoir capacity (i.e., `chargedRate = blockRate * (maxCapacity - currentCapacity`). This means lower reservoir capacities increase the water rates in block.


#### SC3: Seasonal Tariff (Decreasing block rate)
Justification: The nations within the Caribbean are impacted by the dry and rainy season, where replenishment of the natural resources occur during the latter season and conservation efforts are needed in the former.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start which is determined based on the WaterCapacity contracted amount. Higher contracted Water Capacity selected results in higher contracted rate per $X \ m^3$.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged based on the the maximum and current reservoir capacity such that reservoir capacities exceeding the maximum capacity decrease the water rates in block (i.e., `chargedRate = blockRate * (2 - (currentCapacity / maxCapacity)`). 

### Project Structure
```
aquachain/
├── api/            # Express.js REST API server
├── assets/         # Documentation resources
├── programs/       # Solana smart contracts written in
└── tests/          # Integration & unit tests
```

## Installation

> [!NOTE]
> If you are on **Windows**, you will need **WSL (Windows Subsystem for Linux)** to run Anchor and Solana programs.

To set up Aquachain on your local machine, follow these steps:

1. **Install the required dependencies**: Aquachain uses **Rust** and **Anchor** for the Solana-based smart contracts. To install, follow the instructions on the [Anchor documentation](https://www.anchor-lang.com/docs/installation).

2. **Environment Setup**:
   - Install Solana CLI and configure it for localnet or your desired network.

3. **Run Solana Local Validator**:
   - For testing purposes, use `solana-test-validator` to set up a local Solana blockchain instance.

4. **Start the API**:
   - Navigate to the `/api` folder, install dependencies, and start the Express server:
     ```bash
     cd api
     npm install
     npm start
     ```

## API

The **API** is built with **Express.js** and provides a RESTful interface to interact with Aquachain’s smart contracts and resources. It includes endpoints for managing tariffs, consumers, and reservoirs, as well as for processing payments. The API documentation, generated via **Swagger** and viewable with **RapiDoc**, allows developers to test and integrate Aquachain functionalities into their applications seamlessly.

## Usage

- **Localnet**: To test the Aquachain system locally, use the **Solana Local Validator** (`solana-test-validator`). This allows you to simulate blockchain interactions in a local environment before deploying to a public network.
- **Endpoints**: The API provides endpoints for interacting with smart contracts, managing resources, and handling payments. You can explore these endpoints using the RapiDoc interface, which provides a user-friendly documentation and testing interface.