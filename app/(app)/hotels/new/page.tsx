import { HotelForm } from "@/components/forms/hotel-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewHotelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create hotel</h1>
        <p className="text-sm text-muted-foreground">Add the subject hotel or a comp property profile.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Hotel profile</CardTitle></CardHeader>
        <CardContent><HotelForm /></CardContent>
      </Card>
    </div>
  );
}
