"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { reuploadFileAction } from "@/app/(app)/uploads/actions";

export default function ReuploadForm({ uploadId, fileName }: { uploadId: string; fileName: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await reuploadFileAction(uploadId, formData);

    if (result?.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/uploads/${uploadId}`);
        router.refresh();
      }, 1500);
    } else {
      setError(result?.error || "Failed to re-upload file.");
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/uploads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to uploads
          </Link>
        </Button>
      </div>

      <Card className="border-muted/50 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Edit Upload Data</CardTitle>
          <CardDescription>
            Upload a new Excel file to replace the data for <span className="font-semibold text-foreground">"{fileName}"</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Upload Successful!</h3>
                <p className="text-sm text-muted-foreground">Redirecting you back to the upload details...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-8 transition-colors hover:bg-muted/10">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <FileUp className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="file" className="cursor-pointer text-base font-semibold hover:text-primary">
                      Click to select new Excel file
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only .xlsx, .xls, and .csv files are supported.
                    </p>
                  </div>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    required
                    className="max-w-xs cursor-pointer"
                    disabled={isUploading}
                  />
                </div>
              </div>

              {error && (
                <Alert className="border-destructive/50 bg-destructive/5 text-destructive">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Error</span>
                  </div>
                  <div className="mt-1">{error}</div>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" asChild disabled={isUploading}>
                  <Link href={`/uploads/${uploadId}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isUploading} className="min-w-[140px] gap-2 shadow-sm">
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Replace File
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {!success && (
        <Alert className="border-blue-100 bg-blue-50/50 text-blue-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">Important Note</span>
          </div>
          <div className="mt-1 text-blue-800 text-sm leading-relaxed">
            Re-uploading will delete all previous rate observations for this batch. 
            You will need to re-validate and re-import the data to see it in reports.
          </div>
        </Alert>
      )}
    </div>
  );
}
