"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { deleteUploadAction } from "@/app/(app)/uploads/actions";

export function DeleteUploadButton({ id, fileName }: { id: string; fileName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete the upload batch "${fileName}"? This will also delete all imported rate observations.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteUploadAction(id);
      if (result.success) {
        toast.success("Upload batch deleted successfully.");
      } else {
        toast.error(result.error || "Failed to delete upload batch.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete upload"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
