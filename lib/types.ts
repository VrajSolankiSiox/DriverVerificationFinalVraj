export type RateObservationInput = {
  hotelId: string;
  stayDate: Date;
  captureDate: Date;
  roomType?: string | null;
  ratePlan?: string | null;
  refundableFlag?: boolean | null;
  nightlyRate: number;
  currency: string;
  availabilityStatus?: string | null;
  sourceHotelName?: string | null;
  sourceHotelCode?: string | null;
};

export type UploadWorkbookSheet = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

export type UploadMapping = Record<string, string | null>;

export type WebsiteScoreBreakdown = {
  total: number;
  directBookingUx: number;
  contentCompleteness: number;
  technicalHygiene: number;
  offerVisibility: number;
  trustContactClarity: number;
  notes: string[];
};
