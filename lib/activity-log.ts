import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  message?: string;
  metadata?: unknown;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      message: input.message,
      metadata: input.metadata as object | undefined,
    },
  });
}
