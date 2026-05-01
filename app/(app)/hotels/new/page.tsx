import { HotelForm } from "@/components/forms/hotel-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewHotelPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Hotel profile</CardTitle></CardHeader>
        <CardContent><HotelForm /></CardContent>
      </Card>
    </div>
  );
}
