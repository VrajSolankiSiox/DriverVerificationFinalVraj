import { requireRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  // await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>App Base URL:</strong> {env.APP_BASE_URL}
          </p>
          <p>
            <strong>Crawl page limit:</strong> {env.WEBSITE_CRAWL_PAGE_LIMIT}
          </p>
          <p>
            <strong>Crawl max depth:</strong> {env.WEBSITE_CRAWL_MAX_DEPTH}
          </p>
          <p>
            <strong>Page speed adapter enabled:</strong>{" "}
            {String(env.FEATURE_PAGE_SPEED_ADAPTER)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
