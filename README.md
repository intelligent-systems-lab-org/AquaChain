# AquaChain

## Tokens

| Token | Symbol | Description | Block Data
|---|---|---|---|
| WaterToken | WTK | Transacted every cubic meter of water usage to the consumer. | <ul><li>[Devnet](https://explorer.solana.com/address/DNVaLEjKvXXVitRqSsECzxSUi7ASDzmteTn5WeCqxoPE?cluster=devnet)</li><li>Mainnet</li></ul> |
| WaterCapacityToken | WATC | Represents the contracted water capacity a consumer has at the start of the billing cycle. | <ul><li>[Devnet](https://explorer.solana.com/address/FV2Exaqv4p9j4qkrSFffybqXsWWUgZkBeN4UiRSrnhWc?cluster=devnet)</li><li>Mainnet</li></ul> |
| WasteToken | WST | Transacted every cubic meter of waste to be treated. | <ul><li>[Devnet](https://explorer.solana.com/address/6Z5ENchymACuNgXpVr3XLRDK2bQexj3RPpcJCN6Cpbfs?cluster=devnet)</li><li>Mainnet</li></ul> |
| WasteCapacityToken | WSTC | Represents the amount of allowable waste. | <ul><li>[Devnet](https://explorer.solana.com/address/AkQWseWZxey8PHisBVQrmn1xQJzT3E12xEobNc9vnS59?cluster=devnet)</li><li>Mainnet</li></ul> |
| ReservoirCapacityToken | RCT | The total water capacity within the reservoir. | <ul><li>[Devnet](https://explorer.solana.com/address/Hvik5e4dKiznG2cS1sfqqy1g4ivYGrcny6ra4k1hFQqX?cluster=devnet)</li><li>Mainnet</li></ul> |

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
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged per **WaterToken\*(1- ReservoirCapacityToken%)** where for lower reservoir capacity the water rates increase in block.
- **WasteToken:** The consumer is transacted a waste token every $X \ m^3$ to be treated.
- **ReservoirCapacityToken:** The total water capacity within the reservoir.

### SC3: Seasonal Tariff (Decreasing block rate)
Justification: The nations within the Caribbean are impacted by the dry and rainy season, where replenishment of the natural resources occur during the latter season and conservation efforts are needed in the former.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start which is determined based on the WaterCapacity contracted amount. Higher contracted Water Capacity selected results in higher contracted rate per $X \ m^3$.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. If the WaterToken usage is less than the WaterToken 
- **WasteToken:** The consumer is transacted a waste token every $X\ m^3$ to be treated.
- **ReservoirCapacityToken:** The total water capacity within the reservoir.

### SC4: Geographic Tariff (Increasing block rate)
Justification: Various sources of ground and surface water are used to supply various regions. If the resource being extracted from the user is severely depleted, conservation measures must be taken once the initial contracted amount is agreed.

Rules: 	
- **WaterToken:** A water token that is transacted every $X \ m^3$ to the consumer. There is a flat rate at the start and then block rate increases as the reservoir capacity decreases.
- **WaterCapacityToken:** The amount that the consumer is contracted at the start. Once the contracted amount is completed the consumer is then charged per **WaterToken\*(1- ReservoirCapacityToken%)** where for lower reservoir capacity the water rates increase in block. In this case consumers can purchase Water Tokens from other users.  
- **WasteToken:** The consumer is transacted a waste token every $X \ m^3$ to be treated.
- **ReservoirCapacityToken:** The water capacity within reservoir T.
