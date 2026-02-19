export type PricingType =
  | "FIXED_MONTHLY"
  | "HOURLY"
  | "COMMISSION"
  | "FIXED_ONE_TIME";

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  FIXED_MONTHLY: "Fixed Monthly",
  HOURLY: "Hourly",
  COMMISSION: "Commission",
  FIXED_ONE_TIME: "Fixed One-Time",
};

export const PRICING_TYPES: PricingType[] = [
  "FIXED_MONTHLY",
  "HOURLY",
  "COMMISSION",
  "FIXED_ONE_TIME",
];

export interface Service {
  id: string;
  name: string;
  description?: string;
  pricingType: PricingType;
  createdAt: string;
}
