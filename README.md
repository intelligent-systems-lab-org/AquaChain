![Aquachain Logo](Aquachain.png)

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

> [!NOTE]  
> This section is a work in progress.

## Tokens

| Token | Symbol | Description |
|---|---|---|
| WaterToken | WTK | Transacted every cubic meter of water usage to the consumer. |
| WaterCapacityToken | WATC | Represents the contracted water capacity a consumer has at the start of the billing cycle. |
| WasteToken | WST | Transacted every cubic meter of waste to be treated. |
| ReservoirCapacityToken | RCT | The total water capacity within the reservoir. |

## Smart Contracts

### SC1: Two-Part Tariff (Uniform and Increasing Block Rate)
Justification: This tariff structure incentivizes conservation of the water resource.

Rules: 	
- **WaterToken:** A water token that is transacted every $X\ m^3$ to the consumer.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start is block rated, meaning a consumer contracted to $X \ m^3$ for that period would pay $Y rate and a consumer contracted to $A \ m^3$ for that period would pay $B rate.
- **WasteToken:** The consumer is transacted a waste token every $X \ m^3$ to be treated.
- **ReservoirCapacityToken:** The total water capacity within the reservoir.


### SC2: Seasonal Tariff (Increasing block rate)
Justification: The nations within the Caribbean are impacted by the dry and rainy season, where replenishment of the natural resources occur during the latter season and conservation efforts are needed in the former.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start and then block rate increases as the reservoir capacity decreases during the dry season.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged based on the difference between the maximum reservoir capacity and the current reservoir capacity (i.e., `chargedRate = blockRate * (maxCapacity - currentCapacity`). This means lower reservoir capacities increase the water rates in block.
- **WasteToken:** The consumer is transacted a waste token every $X \ m^3$ to be treated.
- **ReservoirCapacityToken:** The total water capacity within the reservoir.

### SC3: Seasonal Tariff (Decreasing block rate)
Justification: The nations within the Caribbean are impacted by the dry and rainy season, where replenishment of the natural resources occur during the latter season and conservation efforts are needed in the former.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start which is determined based on the WaterCapacity contracted amount. Higher contracted Water Capacity selected results in higher contracted rate per $X \ m^3$.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged based on the the maximum and current reservoir capacity such that reservoir capacities exceeding the maximum capacity decrease the water rates in block (i.e., `chargedRate = blockRate * (2 - (currentCapacity / maxCapacity)`). 
- **WasteToken:** The consumer is transacted a waste token every $X\ m^3$ to be treated.
- **ReservoirCapacityToken:** The total water capacity within the reservoir.