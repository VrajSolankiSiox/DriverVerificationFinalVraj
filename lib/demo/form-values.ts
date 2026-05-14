export type DemoFormValues = {
  hotelId: string;
  hotelName: string;
  hotelOwnerName: string;
  scheduledDate: string;
  outcome: string;
  conductedBy: string;
  demoDate: string;
  ownerFeedback: string;
  additionalNotes: string;
};

function toInputDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

export function mapDemoToFormValues(demo: {
  hotelId: string;
  hotelName: string;
  hotelOwnerName: string | null;
  scheduledDate: string | Date | null;
  outcome: string;
  conductedBy: string | null;
  demoDate: string | Date | null;
  ownerFeedback: string | null;
  additionalNotes: string | null;
}): DemoFormValues {
  return {
    hotelId: demo.hotelId,
    hotelName: demo.hotelName,
    hotelOwnerName: demo.hotelOwnerName ?? "",
    scheduledDate: toInputDate(demo.scheduledDate),
    outcome: demo.outcome ?? "PENDING",
    conductedBy: demo.conductedBy ?? "",
    demoDate: toInputDate(demo.demoDate),
    ownerFeedback: demo.ownerFeedback ?? "",
    additionalNotes: demo.additionalNotes ?? "",
  };
}
