export type ChannelDiscountReportQuery = {
  doctorId?: string;
  locationId?: string;
  specialityId?: string;
  discountSchemeId?: string;
  fromDateTime?: string; // YYYY-MM-DDTHH:mm
  toDateTime?: string; // YYYY-MM-DDTHH:mm
};

export type ChannelDiscountReportRow = {
  id: string;
  bookingDate: Date | null;
  sessionDate: Date | null;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  billNo: string;
  patientName: string;
  doctor: string;
  type: string;
  hospitalFee: number;
  hospitalFeeDiscount: number;
  professionalFee: number;
  professionalFeeDiscount: number;
  discount: number;
  autoDiscountScheme: string;
  discountScheme: string;
};

export type ChannelDiscountReportResult = {
  success: boolean;
  data?: ChannelDiscountReportRow[];
  totalRecords?: number;
  message?: string;
};

export type ChannelDiscountReportExportRow = {
  bookingDate: string;
  session: string;
  billNo: string;
  patientName: string;
  doctor: string;
  type: string;
  hospitalFee: string;
  hospitalFeeDiscount: string;
  professionalFee: string;
  professionalFeeDiscount: string;
  discount: string;
  autoDiscountScheme: string;
  discountScheme: string;
};
