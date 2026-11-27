import { prisma } from "../../db/prisma";

export class AllocationService {
  /**
   * Run allocation simulation / preview based on published merit list and seat pools
   */
  static async runAllocationPreview(roundId: string, officerId: string) {
    const round = await prisma.admissionRound.findUnique({
      where: { id: roundId },
      include: {
        meritRuns: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            entries: {
              orderBy: { rank: "asc" },
              include: { application: true },
            },
          },
        },
        admissionTrack: {
          include: {
            program: {
              include: {
                seatPools: {
                  include: { category: true },
                },
              },
            },
          },
        },
      },
    });

    if (!round) throw new Error("Round not found.");
    const meritRun = round.meritRuns[0];
    if (!meritRun) {
      throw new Error("No published merit list found for this round. Please publish merit list first.");
    }

    const pools = round.admissionTrack.program.seatPools;
    const poolCapacityMap = new Map<string, { pool: typeof pools[0]; available: number }>();

    for (const p of pools) {
      const available = p.capacity - (p.heldCount + p.confirmedCount);
      poolCapacityMap.set(p.category.code, { pool: p, available: Math.max(0, available) });
    }

    // Allocate seats in merit rank order
    const plannedOffers: Array<{
      applicationId: string;
      seatPoolId: string;
      programName: string;
      categoryCode: string;
    }> = [];

    for (const entry of meritRun.entries) {
      const category = entry.categoryCode;
      // 1. Try category specific quota first
      let targetPool = poolCapacityMap.get(category);

      // If category pool empty and category is not GENERAL, see if OPEN/GENERAL has seats
      if (!targetPool || targetPool.available <= 0) {
        if (category !== "GENERAL") {
          targetPool = poolCapacityMap.get("GENERAL");
        }
      }

      if (targetPool && targetPool.available > 0) {
        targetPool.available -= 1;
        plannedOffers.push({
          applicationId: entry.applicationId,
          seatPoolId: targetPool.pool.id,
          programName: round.admissionTrack.program.name,
          categoryCode: targetPool.pool.category.code,
        });
      }
    }

    return prisma.$transaction(async (tx) => {
      // Create allocation run in PREVIEW
      const alloc = await tx.seatAllocationRun.create({
        data: {
          admissionRoundId: roundId,
          status: "PREVIEW",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: officerId,
          action: "ALLOCATION_PREVIEW_GENERATED",
          entityType: "SeatAllocationRun",
          entityId: alloc.id,
          afterState: JSON.stringify({ plannedOffersCount: plannedOffers.length }),
        },
      });

      return {
        allocationId: alloc.id,
        totalPlanned: plannedOffers.length,
        offers: plannedOffers,
      };
    });
  }

  /**
   * Publish allocation run and atomically issue seat offers & holds
   */
  static async publishAllocation(allocationId: string, officerId: string) {
    return prisma.$transaction(async (tx) => {
      const alloc = await tx.seatAllocationRun.findUnique({
        where: { id: allocationId },
        include: {
          admissionRound: {
            include: {
              meritRuns: {
                where: { status: "PUBLISHED" },
                orderBy: { createdAt: "desc" },
                take: 1,
                include: {
                  entries: {
                    orderBy: { rank: "asc" },
                    include: { application: true },
                  },
                },
              },
              admissionTrack: {
                include: {
                  program: {
                    include: {
                      seatPools: { include: { category: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!alloc) throw new Error("Allocation preview not found.");
      if (alloc.status === "PUBLISHED") return alloc;

      const round = alloc.admissionRound;
      const meritRun = round.meritRuns[0];
      const pools = await tx.seatPool.findMany({
        where: { programId: round.admissionTrack.programId },
        include: { category: true },
      });

      const poolCapacityMap = new Map(
        pools.map((p) => [
          p.id,
          {
            ...p,
            heldCount: p.heldCount,
            confirmedCount: p.confirmedCount,
            capacity: p.capacity,
          },
        ])
      );

      const acceptDeadlineDays = round.offerAcceptDays || 3;
      const acceptBy = new Date(Date.now() + acceptDeadlineDays * 24 * 60 * 60 * 1000);
      const payBy = new Date(acceptBy.getTime() + 2 * 24 * 60 * 60 * 1000);

      const createdOffers = [];

      for (const entry of meritRun.entries) {
        // Find matching seat pool with capacity
        const preferredCat = entry.categoryCode;
        let pool = Array.from(poolCapacityMap.values()).find(
          (p) => p.category.code === preferredCat && p.heldCount + p.confirmedCount < p.capacity
        );

        if (!pool && preferredCat !== "GENERAL") {
          pool = Array.from(poolCapacityMap.values()).find(
            (p) => p.category.code === "GENERAL" && p.heldCount + p.confirmedCount < p.capacity
          );
        }

        if (pool) {
          // Check if applicant already has an active offer
          const existingOffer = await tx.allotmentOffer.findFirst({
            where: {
              applicationId: entry.applicationId,
              status: { in: ["OFFERED", "ACCEPTED", "CONFIRMED"] },
            },
          });

          if (!existingOffer) {
            // Verify DB state and invariant: heldCount + confirmedCount < capacity
            const freshPool = await tx.seatPool.findUnique({ where: { id: pool.id } });
            if (freshPool && freshPool.heldCount + freshPool.confirmedCount < freshPool.capacity) {
              await tx.seatPool.update({
                where: { id: pool.id },
                data: {
                  heldCount: { increment: 1 },
                  version: { increment: 1 },
                },
              });

              pool.heldCount += 1;

              const offer = await tx.allotmentOffer.create({
                data: {
                  allocationId: alloc.id,
                  roundId: round.id,
                  applicationId: entry.applicationId,
                  seatPoolId: pool.id,
                  programName: round.admissionTrack.program.name,
                  categoryCode: pool.category.code,
                  status: "OFFERED",
                  acceptBy,
                  payBy,
                },
              });

              createdOffers.push(offer);

              // Notify applicant
              await tx.notification.create({
                data: {
                  userId: entry.application.applicantId,
                  title: `Provisional Seat Offer Issued! (${round.admissionTrack.program.name})`,
                  message: `Congratulations! You have been offered a provisional seat under ${pool.category.code} category. Please accept before ${acceptBy.toLocaleDateString()}.`,
                  linkUrl: "/student/offers",
                },
              });
            }
          }
        }
      }

      await tx.seatAllocationRun.update({
        where: { id: allocationId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: officerId,
          action: "ALLOCATION_PUBLISHED",
          entityType: "SeatAllocationRun",
          entityId: allocationId,
          afterState: JSON.stringify({ offersIssued: createdOffers.length }),
        },
      });

      return { allocationId, offersIssued: createdOffers.length };
    });
  }

  /**
   * Student accepts a provisional seat offer
   */
  static async acceptSeatOffer(offerId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.allotmentOffer.findUnique({
        where: { id: offerId },
        include: { application: true },
      });

      if (!offer) throw new Error("Offer not found.");
      if (offer.application.applicantId !== userId) throw new Error("Unauthorized.");
      if (offer.status !== "OFFERED") {
        throw new Error(`Cannot accept offer in ${offer.status} status.`);
      }

      if (new Date() > offer.acceptBy) {
        throw new Error("Offer acceptance deadline has passed.");
      }

      const updated = await tx.allotmentOffer.update({
        where: { id: offerId },
        data: {
          status: "ACCEPTED",
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "SEAT_OFFER_ACCEPTED",
          entityType: "AllotmentOffer",
          entityId: offerId,
        },
      });

      return updated;
    });
  }

  /**
   * Student declines a seat offer, releasing the held seat atomically
   */
  static async declineSeatOffer(offerId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.allotmentOffer.findUnique({
        where: { id: offerId },
        include: { application: true, seatPool: true },
      });

      if (!offer) throw new Error("Offer not found.");
      if (offer.application.applicantId !== userId) throw new Error("Unauthorized.");
      if (offer.status !== "OFFERED" && offer.status !== "ACCEPTED") {
        throw new Error(`Cannot decline offer in ${offer.status} status.`);
      }

      // Release seat hold atomically: heldCount - 1
      await tx.seatPool.update({
        where: { id: offer.seatPoolId },
        data: {
          heldCount: { decrement: 1 },
          version: { increment: 1 },
        },
      });

      const updated = await tx.allotmentOffer.update({
        where: { id: offerId },
        data: {
          status: "DECLINED",
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "SEAT_OFFER_DECLINED",
          entityType: "AllotmentOffer",
          entityId: offerId,
        },
      });

      return updated;
    });
  }
}
