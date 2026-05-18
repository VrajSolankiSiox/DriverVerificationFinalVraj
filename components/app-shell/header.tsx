import Image from "next/image";

function getHeaderCopy(pathname: string) {
  if (pathname === "/dashboard") {
    return {
      title: "Dashboard",
      subtitle: "Internal sales intelligence workspace for hotel demos.",
    };
  }
  if (pathname === "/hotels") {
    return {
      title: "Hotels",
      subtitle: "Main Property and comp property profiles.",
    };
  }
  if (pathname === "/hotels/new") {
    return {
      title: "Create hotel",
      subtitle: "Add the main property or a comp property profile.",
    };
  }
  if (/^\/hotels\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: "Edit hotel",
      subtitle: "Update hotel profile details.",
    };
  }
  if (/^\/hotels\/[^/]+$/.test(pathname)) {
    return {
      title: "Hotel details",
      subtitle: "Property profile, audits, and review snapshots.",
    };
  }
  if (pathname === "/compsets") {
    return {
      title: "CompSets",
      subtitle: "Manage your manual compsets before starting demo analysis.",
    };
  }
  if (pathname === "/compsets/new") {
    return {
      title: "Create manual compset",
      subtitle: "Main property plus manually selected comp properties.",
    };
  }
  if (/^\/compsets\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: "Edit compset",
      subtitle: "Update compset members and settings.",
    };
  }
  if (/^\/compsets\/[^/]+$/.test(pathname)) {
    return {
      title: "CompSet details",
      subtitle: "Review members and run website audits.",
    };
  }
  if (pathname === "/uploads") {
    return {
      title: "Uploads",
      subtitle: "Expedia files, mappings, validation, and import batches.",
    };
  }
  if (pathname === "/uploads/new") {
    return {
      title: "Upload Expedia rate file",
      subtitle: "Upload, select a sheet, map columns, validate, and import.",
    };
  }
  if (/^\/uploads\/[^/]+$/.test(pathname)) {
    return {
      title: "Upload batch",
      subtitle: "Preview, validate, and import spreadsheet observations.",
    };
  }
  if (pathname === "/reports") {
    return {
      title: "Reports",
      subtitle:
        "Analysis workspaces, approval flow, presentation mode, and exports.",
    };
  }
  if (pathname === "/presentations") {
    return {
      title: "Presentations",
      subtitle:
        "Saved presentation versions with editable slide titles and report name.",
    };
  }
  if (/^\/presentations\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: "Edit presentation",
      subtitle: "Customize titles with autosave and present when ready.",
    };
  }
  if (pathname === "/reports/new") {
    return {
      title: "Create report",
      subtitle:
        "Choose a main property and compset, then use imported data or enter rates manually.",
    };
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return {
      title: "Report details",
      subtitle:
        "Review rate analytics, website findings, and export artifacts.",
    };
  }
  if (pathname === "/templates") {
    return {
      title: "Templates",
      subtitle: "Reusable upload mapping templates by source.",
    };
  }
  if (pathname === "/exports") {
    return {
      title: "Export center",
      subtitle: "Generated PPTX and PDF artifacts.",
    };
  }
  if (pathname === "/settings") {
    return {
      title: "Settings",
      subtitle: "Operational settings and feature flags.",
    };
  }

  return {
    title: "Hotel Demo Intelligence",
    subtitle: "Sales intelligence workspace",
  };
}

export function Header({ pathname }: { pathname: string }) {
  const headerCopy = getHeaderCopy(pathname);

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="min-w-0">
        <p className="truncate text-xl mx-auto font-semibold text-foreground">
          {headerCopy.title}
        </p>
      </div>
      <div className="inline-flex items-end gap-2     er  px-3 py-1.5   transition-all duration-200  ">
        <span className="text-[11px] font-medium text-slate-500">
          Powered by
        </span>

        <Image
          src="/rank-me-now-full-logo.webp"
          alt="RankMeNow Logo"
          width={70}
          height={14}
          className="h-auto w-auto object-contain opacity-90"
        />
      </div>
    </header>
  );
}
