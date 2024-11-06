interface ConsumerRequest {
  tariff_key: string;
  reservoir_key: string;
  contracted_capacity: number;
  block_rate: number;
}

export { ConsumerRequest };
