import type { PricingType } from "@/components/services/types";

export type { PricingType };

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  pricingType: PricingType;
  monthlyFixedPrice?: number;
  hourlyRate?: number;
  oneTimePrice?: number;
  commissionRatePct?: number;
  createdAt: string;
}
