"use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { cloneElement, isValidElement } from "react";
// import type { ReactElement } from "react";

import {
  PresentationView,
  type Slide,
} from "@/components/reports/presentation-view";
// import { Button } from "@/components/ui/button";

export function PresentationRuntime({
  slides,
  demoMode,
  // editor,
  // reportId,
  // demoQuery,
  // defaultReportTitle,
}: {
  slides: Slide[];
  demoMode: boolean;
  // Temporarily disabled editable presentation mode.
  editor?: {
    presentationId: string;
    initialName: string;
    initialReportTitle: string;
    initialSlideTitles: Record<string, string>;
    editableSlideIds: string[];
  } | null;
  reportId?: string;
  demoQuery?: string;
  defaultReportTitle?: string;
}) {
  /*
    TEMPORARILY DISABLED (commented out for easy restore):
    - Edit In Present Mode UI
    - Autosave behavior
    - Presentation overrides (titles/report title)
  */
  return <PresentationView slides={slides} demoMode={demoMode} />;
}
