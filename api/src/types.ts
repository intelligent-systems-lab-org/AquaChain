
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
    const validTypes: TariffTypeString[] = ["uniformIbt", "seasonalIbt", "seasonalDbt"];
    return validTypes.includes(tariff_type);
}

function convertTariffType(tariff_type: TariffTypeString): TariffType {
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

export {
    TariffRequest, TariffType, TariffTypeString, isValidTariffType, convertTariffType
}