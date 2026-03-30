import bcrypt from "bcryptjs";
import { addDays, format, startOfDay } from "date-fns";
import { PrismaClient, type Prisma } from "@prisma/client";
import 'dotenv/config';

import { computeRateAnalytics } from "../lib/analytics/rate-analytics";
import { buildReportSections } from "../lib/reports/sections";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // forces pooler (port 6543)
    },
  },
});
async function main() {
  await prisma.exportArtifact.deleteMany();
  await prisma.reportSection.deleteMany();
  await prisma.report.deleteMany();
  await prisma.websitePageSnapshot.deleteMany();
  await prisma.websiteSnapshot.deleteMany();
  await prisma.rateObservation.deleteMany();
  await prisma.uploadBatch.deleteMany();
  await prisma.uploadMappingTemplate.deleteMany();
  await prisma.compSetMember.deleteMany();
  await prisma.compSet.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.activityLog.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const [admin, manager, rep] = await Promise.all([
    prisma.user.create({ data: { name: "Ava Admin", email: "admin@rankmenow.io", passwordHash, role: "ADMIN" } }),
    prisma.user.create({ data: { name: "Mason Manager", email: "manager@rankmenow.io", passwordHash, role: "MANAGER" } }),
    prisma.user.create({ data: { name: "Riley Rep", email: "rep@rankmenow.io", passwordHash, role: "REP" } }),
  ]);

  const subjectHotel = await prisma.hotel.create({
    data: {
      name: "The Atlantic Grand Atlanta",
      brand: "Independent Luxury",
      addressLine1: "190 Peachtree Street NE",
      city: "Atlanta",
      state: "GA",
      country: "United States",
      websiteUrl: "https://example.com/atlantic-grand",
      bookingUrl: "https://example.com/atlantic-grand/book",
      phone: "+1 404 555 0112",
      email: "stay@atlanticgrand.com",
      roomCount: 230,
      starLevel: 4.5,
      ownershipNotes: "Owned by regional hospitality group",
      managementNotes: "Managed by in-house commercial team",
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const compHotels = await Promise.all([
    prisma.hotel.create({ data: { name: "Peachtree Plaza Hotel", brand: "Upper Upscale", addressLine1: "240 Baker St NW", city: "Atlanta", state: "GA", country: "United States", websiteUrl: "https://example.com/peachtree-plaza", createdById: admin.id, updatedById: admin.id } }),
    prisma.hotel.create({ data: { name: "Midtown Meridian Suites", brand: "Upscale", addressLine1: "480 Midtown Ave", city: "Atlanta", state: "GA", country: "United States", websiteUrl: "https://example.com/midtown-meridian", createdById: admin.id, updatedById: admin.id } }),
    prisma.hotel.create({ data: { name: "Skyline Convention Hotel", brand: "Upper Upscale", addressLine1: "820 Centennial Blvd", city: "Atlanta", state: "GA", country: "United States", websiteUrl: "https://example.com/skyline-convention", createdById: admin.id, updatedById: admin.id } }),
    prisma.hotel.create({ data: { name: "Buckhead Manor Hotel", brand: "Luxury", addressLine1: "15 Buckhead Circle", city: "Atlanta", state: "GA", country: "United States", websiteUrl: "https://example.com/buckhead-manor", createdById: admin.id, updatedById: admin.id } }),
  ]);

  const compSet = await prisma.compSet.create({
    data: {
      name: "Atlanta Luxury Demo CompSet",
      subjectHotelId: subjectHotel.id,
      version: 1,
      notes: "Manual compset created by sales engineering.",
      createdById: manager.id,
      updatedById: manager.id,
      members: {
        create: [
          { hotelId: subjectHotel.id, roleType: "SUBJECT", displayOrder: 0 },
          ...compHotels.map((hotel, index) => ({ hotelId: hotel.id, roleType: "COMP" as const, displayOrder: index + 1 })),
        ],
      },
    },
    include: {
      members: { include: { hotel: true }, orderBy: { displayOrder: "asc" } },
    },
  });

  await prisma.uploadMappingTemplate.create({
    data: {
      organizationKey: "rank-me-now",
      sourceName: "Expedia",
      name: "Seed Expedia Standard",
      mappingJson: {
        hotel_name: "Hotel Name",
        stay_date: "Stay Date",
        capture_date: "Capture Date",
        nightly_rate: "Nightly Rate",
        currency: "Currency",
        room_type: "Room Type",
        rate_plan: "Rate Plan",
        refundable_flag: "Refundable",
      },
      normalizationJson: {
        dateFormat: "MM/dd/yyyy",
        currencyDefault: "USD",
        stripCurrencySymbols: true,
        stripCommas: true,
      },
      createdById: manager.id,
      updatedById: manager.id,
      lastUsedAt: new Date(),
    },
  });

  const uploadBatch = await prisma.uploadBatch.create({
    data: {
      sourceName: "Expedia",
      fileName: "seed-expedia-atlanta.csv",
      fileType: "text/csv",
      fileSizeBytes: 1024,
      storagePath: "storage/uploads/seed-expedia-atlanta.csv",
      subjectHotelId: subjectHotel.id,
      compSetId: compSet.id,
      status: "IMPORTED",
      importMode: "UPSERT_MATCHING",
      selectedSheet: "Rates",
      workbookMetaJson: { sheetNames: ["Rates"] },
      summaryJson: { inserted: 450, updated: 0, skipped: 0, totalRows: 450, validRows: 450 },
      createdById: rep.id,
      updatedById: rep.id,
    },
  });

  const today = startOfDay(new Date());
  const captureDate = today;
  const allHotels = [subjectHotel, ...compHotels];
  const observations: Prisma.RateObservationCreateManyInput[] = [];

  for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
    const stayDate = addDays(today, dayIndex);
    const weekend = [0, 6].includes(stayDate.getDay());

    allHotels.forEach((hotel, hotelIndex) => {
      const base = 210 + hotelIndex * 12 + (weekend ? 25 : 0) + Math.sin(dayIndex / 4) * 18;
      const adjustment = hotel.id === subjectHotel.id ? (weekend ? -12 : -6) : hotelIndex * 4;
      const nightlyRate = Math.round(base + adjustment + (dayIndex % 7) * 2);
      const roomType = hotel.id === subjectHotel.id && dayIndex % 10 === 0 ? "Deluxe King" : null;
      const ratePlan = dayIndex % 3 === 0 ? "BAR" : "Advance Purchase";
      const refundableFlag = dayIndex % 4 !== 0;
      const uniqueKey = [
        hotel.id,
        format(stayDate, "yyyy-MM-dd"),
        format(captureDate, "yyyy-MM-dd"),
        roomType ?? "null",
        ratePlan,
        String(refundableFlag),
        "USD",
      ].join("|");
      observations.push({
        hotelId: hotel.id,
        uploadBatchId: uploadBatch.id,
        stayDate,
        captureDate,
        roomType,
        ratePlan,
        refundableFlag,
        nightlyRate,
        currency: "USD",
        availabilityStatus: dayIndex % 17 === 0 && hotel.id === subjectHotel.id ? "LIMITED" : "AVAILABLE",
        sourceHotelName: hotel.name,
        sourceHotelCode: null,
        uniqueKey,
        createdById: rep.id,
        updatedById: rep.id,
      });
    });
  }

  await prisma.rateObservation.createMany({ data: observations });

  const websiteSnapshot = await prisma.websiteSnapshot.create({
    data: {
      hotelId: subjectHotel.id,
      baseUrl: subjectHotel.websiteUrl!,
      status: "COMPLETE",
      scoreTotal: 71,
      directBookingUxScore: 15,
      contentCompletenessScore: 14,
      technicalHygieneScore: 13,
      offerVisibilityScore: 12,
      trustContactScore: 17,
      summaryJson: {
        notes: [
          "Booking pathways are present but inconsistent across core commercial pages.",
          "Meta descriptions and canonical tags are not consistently deployed.",
          "Trust/contact clarity is relatively strong compared with offer visibility.",
        ],
      },
      rawFindingsJson: {},
      completedAt: new Date(),
      createdById: manager.id,
      updatedById: manager.id,
    },
  });

  await prisma.websitePageSnapshot.createMany({
    data: [
      {
        snapshotId: websiteSnapshot.id,
        url: "https://example.com/atlantic-grand",
        pageType: "home",
        crawlDepth: 0,
        title: "The Atlantic Grand Atlanta | Luxury Hotel",
        metaDescription: "Luxury downtown Atlanta hotel with suites, dining, and meeting space.",
        h1Count: 1,
        canonical: "https://example.com/atlantic-grand",
        robotsMeta: "index,follow",
        bookingCtaDetected: true,
        bookingCtaCount: 3,
        bookingEngineDetected: true,
        phoneDetected: true,
        emailDetected: true,
        addressDetected: true,
        faqDetected: false,
        structuredDataDetected: true,
        sitemapReference: true,
        imageCount: 14,
        imageAltCoverage: 0.71,
        internalLinksJson: ["https://example.com/atlantic-grand/rooms", "https://example.com/atlantic-grand/offers"],
        extractedJson: { brandConsistencyNotes: [] },
        rawHtml: "<html><body>Seed home page</body></html>",
      },
      {
        snapshotId: websiteSnapshot.id,
        url: "https://example.com/atlantic-grand/offers",
        pageType: "offers",
        crawlDepth: 1,
        title: "Offers | The Atlantic Grand Atlanta",
        metaDescription: "Packages and exclusive direct booking offers.",
        h1Count: 1,
        canonical: "https://example.com/atlantic-grand/offers",
        robotsMeta: "index,follow",
        bookingCtaDetected: true,
        bookingCtaCount: 2,
        bookingEngineDetected: true,
        phoneDetected: false,
        emailDetected: false,
        addressDetected: false,
        faqDetected: false,
        structuredDataDetected: false,
        sitemapReference: true,
        imageCount: 8,
        imageAltCoverage: 0.5,
        internalLinksJson: ["https://example.com/atlantic-grand/book"],
        extractedJson: { brandConsistencyNotes: ["Offer page could expose CTA higher above the fold."] },
        rawHtml: "<html><body>Seed offers page</body></html>",
      },
    ],
  });

  const report = await prisma.report.create({
    data: {
      name: "Atlantic Grand Atlanta — Demo Intelligence",
      subjectHotelId: subjectHotel.id,
      compSetId: compSet.id,
      compSetVersion: compSet.version,
      status: "APPROVED",
      confidenceLevel: "HIGH",
      executiveSummary: "Across the observed 90-day window, the subject property showed repeated below-comp positioning on near-term dates, with a relatively weaker weekend stance and several clear website merchandising opportunities.",
      manualOpportunityNotes: "Use pricing gaps as the lead-in, then pivot quickly to direct-booking and website execution improvements.",
      methodologyNote: "Insights are based on uploaded market rate observations and publicly observable website data. This is not a substitute for PMS, CRS, STR, or proprietary financial records. Observations represent available data at the time of analysis.",
      createdById: manager.id,
      updatedById: manager.id,
      approvedAt: new Date(),
      approvedById: manager.id,
    },
  });

  const analyticsInput = observations.map((observation) => ({
    hotelId: observation.hotelId,
    hotelName: allHotels.find((hotel) => hotel.id === observation.hotelId)!.name,
    roleType: observation.hotelId === subjectHotel.id ? ("SUBJECT" as const) : ("COMP" as const),
    stayDate: observation.stayDate instanceof Date ? observation.stayDate : new Date(observation.stayDate),
    captureDate: observation.captureDate instanceof Date ? observation.captureDate : new Date(observation.captureDate),
    nightlyRate: Number(observation.nightlyRate),
    currency: observation.currency,
    availabilityStatus: observation.availabilityStatus,
    roomType: observation.roomType,
  }));
  const analytics = computeRateAnalytics(analyticsInput, subjectHotel.id, 90);

  const viewModel = {
    reportId: report.id,
    reportName: report.name,
    status: report.status,
    confidenceLevel: analytics.confidenceLevel,
    subjectHotel: {
      id: subjectHotel.id,
      name: subjectHotel.name,
      brand: subjectHotel.brand,
      city: subjectHotel.city,
      state: subjectHotel.state,
      country: subjectHotel.country,
      websiteUrl: subjectHotel.websiteUrl,
      roomCount: subjectHotel.roomCount,
      starLevel: Number(subjectHotel.starLevel ?? 0),
    },
    compSet: {
      id: compSet.id,
      name: compSet.name,
      version: compSet.version,
      members: compSet.members.map((member) => ({
        id: member.hotel.id,
        name: member.hotel.name,
        roleType: member.roleType,
      })),
    },
    analytics,
    websiteAudit: {
      scoreTotal: 71,
      directBookingUxScore: 15,
      contentCompletenessScore: 14,
      technicalHygieneScore: 13,
      offerVisibilityScore: 12,
      trustContactScore: 17,
      notes: [
        "Booking pathways are present but inconsistent across core commercial pages.",
        "Meta descriptions and canonical tags are not consistently deployed.",
        "Trust/contact clarity is relatively strong compared with offer visibility.",
      ],
    },
    manualExecutiveSummary: report.executiveSummary,
    manualOpportunityNotes: report.manualOpportunityNotes,
    methodologyNote: report.methodologyNote,
  };

  const sections = buildReportSections(viewModel);

  await prisma.report.update({
    where: { id: report.id },
    data: {
      analysisJson: { analytics, websiteAudit: viewModel.websiteAudit },
      compSnapshotJson: viewModel.compSet,
      confidenceLevel: analytics.confidenceLevel,
    },
  });

  await prisma.reportSection.createMany({
    data: sections.map((section) => ({
      reportId: report.id,
      type: section.type,
      title: section.title,
      displayOrder: section.displayOrder,
      visibility: section.visibility,
      enabled: section.enabled,
      contentJson: section.content as Prisma.InputJsonValue,
    })),
  });

  await prisma.activityLog.createMany({
    data: [
      { actorId: manager.id, entityType: "Hotel", entityId: subjectHotel.id, action: "CREATED", message: "Seeded subject hotel" },
      { actorId: manager.id, entityType: "CompSet", entityId: compSet.id, action: "CREATED", message: "Seeded compset" },
      { actorId: rep.id, entityType: "UploadBatch", entityId: uploadBatch.id, action: "IMPORTED", message: "Seeded rate observations" },
      { actorId: manager.id, entityType: "Report", entityId: report.id, action: "APPROVED", message: "Seeded approved report" },
    ],
  });

  console.log("Seeded users:");
  console.log("admin@rankmenow.io / Password123!");
  console.log("manager@rankmenow.io / Password123!");
  console.log("rep@rankmenow.io / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
