type uniformIbt = { uniformIbt: {} };
type seasonalIbt = { seasonalIbt: {} };
type seasonalDbt = { seasonalDbt: {} };

type TariffType = uniformIbt | seasonalIbt | seasonalDbt;
type TariffTypeString = "uniformIbt" | "seasonalIbt" | "seasonalDbt";

interface TariffRequest {
  water_rate: number;
  waste_rate: number;
  tariff_type?: TariffTypeString; // Allow string input for tariff_type
}

function isValidTariffType(tariff_type: TariffTypeString): boolean {
  const validTypes: TariffTypeString[] = [
    "uniformIbt",
    "seasonalIbt",
    "seasonalDbt",
  ];
  return validTypes.includes(tariff_type);
}

function convertStringToTariffType(tariff_type: TariffTypeString): TariffType {
  switch (tariff_type) {
    case "uniformIbt":
      return { uniformIbt: {} };
    case "seasonalIbt":
      return { seasonalIbt: {} };
    case "seasonalDbt":
      return { seasonalDbt: {} };
    default:
      throw new Error("Invalid tariff type");
  }
}

function convertTariffTypeToString(tariff_type: TariffType): TariffTypeString {
  if ("uniformIbt" in tariff_type) {
    return "uniformIbt";
  } else if ("seasonalIbt" in tariff_type) {
    return "seasonalIbt";
  } else if ("seasonalDbt" in tariff_type) {
    return "seasonalDbt";
  } else {
    throw new Error("Invalid tariff type");
  }
}

export {
  TariffRequest,
  TariffType,
  TariffTypeString,
  isValidTariffType,
  convertStringToTariffType,
  convertTariffTypeToString,
};
