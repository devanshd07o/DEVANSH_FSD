import crypto from "crypto";
import { prisma } from "../../db/prisma";

export interface MeritComputationResult {
  applicationId: string;
  applicationNumber: string;
  applicantName: string;
  score: number;
  rank: number;
  categoryRank: number;
  categoryCode: string;
  explanation: {
    basePercentage: number;
    dob: string;
    submissionTime: string;
    tieBreakersApplied: string[];
  };
}

export class MeritService {
  /**
   * Compute deterministic merit rankings for verified candidates in a round
   */
  static async computeMeritRun(roundId: string, officerId: string) {
    const round = await prisma.admissionRound.findUnique({
      where: { id: roundId },
      include: {
        admissionTrack: {
          include: { program: true },
        },
      },
    });

    if (!round) throw new Error("Admission round not found.");

    // Fetch all VERIFIED applications for this track
    const apps = await prisma.application.findMany({
      where: {
        admissionTrackId: round.admissionTrackId,
        status: "VERIFIED",
      },
      include: {
        applicant: {
          include: { profile: true },
        },
        revisions: {
          orderBy: { revisionNo: "desc" },
          take: 1,
          include: { records: true, claims: true },
        },
      },
    });

    if (apps.length === 0) {
      throw new Error("No verified applications found to compute merit list.");
    }

    // Extract scoring metrics
    const candidates = apps.map((app) => {
      const latestRev = app.revisions[0];
      const rec = latestRev?.records[0];
      const claim = latestRev?.claims[0];
      const percentage = rec?.percentage ?? 0;
      const dob = app.applicant.profile?.dob ?? new Date("2005-01-01");
      const submittedAt = app.submittedAt ?? new Date();

      return {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        applicantName: app.applicant.name,
        categoryCode: claim?.categoryCode ?? "GENERAL",
        percentage,
        dob,
        submittedAt,
      };
    });

    // Deterministic sorting via AST:
    // 1. Percentage (descending)
    // 2. DOB (older candidate has earlier DOB, ascending)
    // 3. SubmittedAt (earlier submission, ascending)
    // 4. Application ID (lexicographical fallback)
    candidates.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      if (a.dob.getTime() !== b.dob.getTime()) {
        return a.dob.getTime() - b.dob.getTime();
      }
      if (a.submittedAt.getTime() !== b.submittedAt.getTime()) {
        return a.submittedAt.getTime() - b.submittedAt.getTime();
      }
      return a.applicationId.localeCompare(b.applicationId);
    });

    // Category counters
    const categoryCounts: Record<string, number> = {};
    const rankedResults: MeritComputationResult[] = candidates.map((cand, idx) => {
      const overallRank = idx + 1;
      const cat = cand.categoryCode;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      const catRank = categoryCounts[cat];

      const ties: string[] = [];
      if (idx > 0 && candidates[idx - 1].percentage === cand.percentage) {
        ties.push("Percentage tied with adjacent candidate; ranked by DOB senior precedence.");
      }

      return {
        applicationId: cand.applicationId,
        applicationNumber: cand.applicationNumber,
        applicantName: cand.applicantName,
        score: cand.percentage,
        rank: overallRank,
        categoryRank: catRank,
        categoryCode: cat,
        explanation: {
          basePercentage: cand.percentage,
          dob: cand.dob.toISOString().split("T")[0],
          submissionTime: cand.submittedAt.toISOString(),
          tieBreakersApplied: ties,
        },
      };
    });

    // Hash the input and results for reproducibility
    const inputHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(rankedResults))
      .digest("hex");

    return prisma.$transaction(async (tx) => {
      // Create new MeritRun in DRAFT
      const run = await tx.meritRun.create({
        data: {
          admissionRoundId: roundId,
          algorithmVersion: "1.0.0",
          inputHash,
          status: "DRAFT",
        },
      });

      for (const res of rankedResults) {
        await tx.meritEntry.create({
          data: {
            meritRunId: run.id,
            applicationId: res.applicationId,
            score: res.score,
            rank: res.rank,
            categoryRank: res.categoryRank,
            categoryCode: res.categoryCode,
            explanation: JSON.stringify(res.explanation),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: officerId,
          action: "MERIT_RUN_PREVIEW_GENERATED",
          entityType: "MeritRun",
          entityId: run.id,
          afterState: JSON.stringify({ totalCandidates: rankedResults.length, inputHash }),
        },
      });

      return { runId: run.id, inputHash, results: rankedResults };
    });
  }

  /**
   * Publish approved merit run
   */
  static async publishMeritRun(meritRunId: string, officerId: string) {
    return prisma.$transaction(async (tx) => {
      const run = await tx.meritRun.findUnique({
        where: { id: meritRunId },
        include: { entries: true },
      });

      if (!run) throw new Error("Merit run not found.");
      if (run.status === "PUBLISHED") return run;

      const updated = await tx.meritRun.update({
        where: { id: meritRunId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      // Update round status
      await tx.admissionRound.update({
        where: { id: run.admissionRoundId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: officerId,
          action: "MERIT_RUN_PUBLISHED",
          entityType: "MeritRun",
          entityId: meritRunId,
        },
      });

      return updated;
    });
  }
}
