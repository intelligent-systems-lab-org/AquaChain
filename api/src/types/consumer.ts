interface ConsumerRequest {
  tariff_key: string;
  reservoir_key: string;
  contracted_capacity: number;
  block_rate: number;
}

interface KeyChangeRequest {
  current_key: string;
  new_key: string;
}

export { ConsumerRequest, KeyChangeRequest };
