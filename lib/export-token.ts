import { createHash } from "crypto";

export function createExportToken(reportId: string, secret: string) {
  return createHash("sha256").update(`${reportId}:${secret}`).digest("hex");
}

export function verifyExportToken(reportId: string, token: string | null, secret: string) {
  if (!token) {
    return false;
  }
  return createExportToken(reportId, secret) === token;
}
