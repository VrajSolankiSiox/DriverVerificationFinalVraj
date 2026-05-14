import { addDays, format, isWeekend, startOfDay } from "date-fns";

import { aboveThreshold, belowThreshold } from "@/lib/constants";
import { mean, median } from "@/lib/utils";

export type AnalyticsObservation = {
  hotelId: string;
  hotelName: string;
  roleType: "SUBJECT" | "COMP";
  stayDate: Date;
  captureDate: Date;
  nightlyRate: number;
  currency: string;
  availabilityStatus?: string | null;
  roomType?: string | null;
};

export type DailyPositioning = {
  date: string;
  subjectRate: number | null;
  compAverage: number;
  compMedian: number;
  compMin: number;
  compMax: number;
  gapToCompAverage: number | null;
  rateIndex: number | null;
  subjectRank: "LOWEST" | "MIDDLE" | "HIGHEST" | "MISSING";
  compCount: number;
  subjectSoldOut: boolean;
  allCompsSoldOut: boolean;
};

export type RateAnalyticsResult = {
  daily: DailyPositioning[];
  summariesByWindow: Record<string, {
    nights: number;
    avgSubjectRate: number;
    avgCompAverageRate: number;
    avgRateIndex: number;
    medianGap: number;
    subjectLowestCount: number;
    subjectHighestCount: number;
    belowThresholdCount: number;
    aboveThresholdCount: number;
  }>;
  weekdayWeekend: {
    weekdaySubjectAverage: number;
    weekendSubjectAverage: number;
    weekdayCompAverage: number;
    weekendCompAverage: number;
  };
  rankDistribution: {
    lowest: number;
    middle: number;
    highest: number;
    missing: number;
  };
  outlierNights: Array<{
    date: string;
    subjectRate: number | null;
    compAverage: number;
    gap: number;
  }>;
  compressionLikeNights: Array<{
    date: string;
    spread: number;
    compAverage: number;
  }>;
  missingRateNights: string[];
  staleRatePatternDates: string[];
  compSummaryTable: Array<{
    hotelId: string;
    hotelName: string;
    averageRate: number;
    nightsObserved: number;
  }>;
  confidenceLevel: "LOW" | "MODERATE" | "HIGH";
};

function latestByHotelDate(observations: AnalyticsObservation[]) {
  const map = new Map<string, AnalyticsObservation>();
  for (const observation of observations) {
    const key = `${observation.hotelId}|${toDateKey(observation.stayDate)}`;
    const existing = map.get(key);
    if (!existing || existing.captureDate < observation.captureDate) {
      map.set(key, observation);
    }
  }
  return [...map.values()];
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isSoldOut(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  return s.includes("sold_out") || s.includes("sold out");
}

export function computeRateAnalytics(
  observations: AnalyticsObservation[],
  subjectHotelId: string,
  windowDays = 90,
): RateAnalyticsResult {
  const latest = latestByHotelDate(observations);
  const byDate = new Map<string, AnalyticsObservation[]>();

  for (const observation of latest) {
    const key = toDateKey(observation.stayDate);
    const current = byDate.get(key) ?? [];
    current.push(observation);
    byDate.set(key, current);
  }

  const allDates = [...byDate.keys()].sort();
  const firstDate = allDates[0]
    ? new Date(`${allDates[0]}T00:00:00.000Z`)
    : startOfDay(new Date());
  const daily: DailyPositioning[] = [];

  for (let i = 0; i < windowDays; i += 1) {
    const date = format(addDays(firstDate, i), "yyyy-MM-dd");
    const rows = byDate.get(date) ?? [];
    const rawSubject = rows.find((row) => row.hotelId === subjectHotelId);
    const subjectSoldOut = Boolean(rawSubject && isSoldOut(rawSubject.availabilityStatus));
    const subject = rows.find((row) => row.hotelId === subjectHotelId && !isSoldOut(row.availabilityStatus));
    const rawComps = rows.filter((row) => row.hotelId !== subjectHotelId && row.roleType === "COMP");
    const allCompsSoldOut = rawComps.length > 0 && rawComps.every((row) => isSoldOut(row.availabilityStatus));
    const comps = rows.filter(
      (row) => row.hotelId !== subjectHotelId && row.roleType === "COMP" && !isSoldOut(row.availabilityStatus),
    );
    const compRates = comps.map((row) => row.nightlyRate);
    const subjectRate = subject?.nightlyRate ?? null;
    const compAverage = compRates.length ? mean(compRates) : 0;
    const compMedian = compRates.length ? median(compRates) : 0;
    const compMin = compRates.length ? Math.min(...compRates) : 0;
    const compMax = compRates.length ? Math.max(...compRates) : 0;
    const gapToCompAverage = subjectRate !== null && compAverage ? subjectRate - compAverage : null;
    const rateIndex = subjectRate !== null && compAverage ? subjectRate / compAverage : null;
    let subjectRank: DailyPositioning["subjectRank"] = "MISSING";

    if (subjectRate !== null && compRates.length) {
      const allRates = [subjectRate, ...compRates].sort((a, b) => a - b);
      const index = allRates.indexOf(subjectRate);
      if (index === 0) {
        subjectRank = "LOWEST";
      } else if (index === allRates.length - 1) {
        subjectRank = "HIGHEST";
      } else {
        subjectRank = "MIDDLE";
      }
    }

    daily.push({
      date,
      subjectRate,
      compAverage,
      compMedian,
      compMin,
      compMax,
      gapToCompAverage,
      rateIndex,
      subjectRank,
      compCount: compRates.length,
      subjectSoldOut,
      allCompsSoldOut,
    });
  }

  const byWindow = [7, 14, 30, 90].reduce<Record<string, RateAnalyticsResult["summariesByWindow"][string]>>(
    (acc, days) => {
      const slice = daily.slice(0, days);
      const subjectRates = slice.map((row) => row.subjectRate).filter((value): value is number => value !== null);
      const compAverages = slice.map((row) => row.compAverage).filter((value) => value > 0);
      const rateIndexes = slice.map((row) => row.rateIndex).filter((value): value is number => value !== null);
      const gaps = slice.map((row) => row.gapToCompAverage).filter((value): value is number => value !== null);
      acc[String(days)] = {
        nights: slice.length,
        avgSubjectRate: mean(subjectRates),
        avgCompAverageRate: mean(compAverages),
        avgRateIndex: mean(rateIndexes),
        medianGap: median(gaps),
        subjectLowestCount: slice.filter((row) => row.subjectRank === "LOWEST").length,
        subjectHighestCount: slice.filter((row) => row.subjectRank === "HIGHEST").length,
        belowThresholdCount: slice.filter((row) => (row.gapToCompAverage ?? 0) <= belowThreshold).length,
        aboveThresholdCount: slice.filter((row) => (row.gapToCompAverage ?? 0) >= aboveThreshold).length,
      };
      return acc;
    },
    {},
  );

  const weekdayRows = daily.filter((row) => !isWeekend(new Date(row.date)));
  const weekendRows = daily.filter((row) => isWeekend(new Date(row.date)));

  const rankDistribution = {
    lowest: daily.filter((row) => row.subjectRank === "LOWEST").length,
    middle: daily.filter((row) => row.subjectRank === "MIDDLE").length,
    highest: daily.filter((row) => row.subjectRank === "HIGHEST").length,
    missing: daily.filter((row) => row.subjectRank === "MISSING").length,
  };

  const outlierNights = daily
    .filter((row) => Math.abs(row.gapToCompAverage ?? 0) >= 20)
    .map((row) => ({
      date: row.date,
      subjectRate: row.subjectRate,
      compAverage: row.compAverage,
      gap: row.gapToCompAverage ?? 0,
    }))
    .slice(0, 12);

  const compressionLikeNights = daily
    .filter((row) => row.compCount > 1 && row.compMax - row.compMin >= 40)
    .map((row) => ({
      date: row.date,
      spread: row.compMax - row.compMin,
      compAverage: row.compAverage,
    }))
    .slice(0, 12);

  const missingRateNights = daily.filter((row) => row.subjectRate === null).map((row) => row.date);
  const staleRatePatternDates = daily
    .filter((row, index) => index > 0 && row.subjectRate !== null && row.subjectRate === daily[index - 1]?.subjectRate)
    .map((row) => row.date)
    .slice(0, 20);

  const compSummaryMap = new Map<string, { hotelId: string; hotelName: string; rates: number[] }>();
  latest
    .filter((row) => row.hotelId !== subjectHotelId && !isSoldOut(row.availabilityStatus))
    .forEach((row) => {
      const current = compSummaryMap.get(row.hotelId) ?? { hotelId: row.hotelId, hotelName: row.hotelName, rates: [] };
      current.rates.push(row.nightlyRate);
      compSummaryMap.set(row.hotelId, current);
    });

  const compSummaryTable = [...compSummaryMap.values()].map((row) => ({
    hotelId: row.hotelId,
    hotelName: row.hotelName,
    averageRate: mean(row.rates),
    nightsObserved: row.rates.length,
  }));

  const coverage = daily.filter((row) => row.subjectRate !== null && row.compCount > 0).length / Math.max(daily.length, 1);
  const confidenceLevel = coverage >= 0.75 ? "HIGH" : coverage >= 0.45 ? "MODERATE" : "LOW";

  return {
    daily,
    summariesByWindow: byWindow,
    weekdayWeekend: {
      weekdaySubjectAverage: mean(weekdayRows.map((row) => row.subjectRate).filter((value): value is number => value !== null)),
      weekendSubjectAverage: mean(weekendRows.map((row) => row.subjectRate).filter((value): value is number => value !== null)),
      weekdayCompAverage: mean(weekdayRows.map((row) => row.compAverage).filter((value) => value > 0)),
      weekendCompAverage: mean(weekendRows.map((row) => row.compAverage).filter((value) => value > 0)),
    },
    rankDistribution,
    outlierNights,
    compressionLikeNights,
    missingRateNights,
    staleRatePatternDates,
    compSummaryTable,
    confidenceLevel,
  };
}
