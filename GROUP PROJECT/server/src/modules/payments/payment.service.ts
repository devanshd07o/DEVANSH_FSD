import crypto from "crypto";
import { prisma } from "../../db/prisma";

export class PaymentService {
  /**
   * Create an idempotent payment order for admission fee or application fee
   */
  static async createOrder(
    applicationId: string,
    userId: string,
    feeType: "APPLICATION_FEE" | "ADMISSION_FEE",
    offerId?: string
  ) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        admissionTrack: true,
        offers: offerId ? { where: { id: offerId } } : false,
      },
    });

    if (!app) throw new Error("Application not found.");
    if (app.applicantId !== userId) throw new Error("Unauthorized.");

    let amountPaise = 100000; // Default ₹1000

    if (feeType === "APPLICATION_FEE") {
      amountPaise = app.admissionTrack.appFeePaise || 100000;
    } else if (feeType === "ADMISSION_FEE") {
      if (!offerId) throw new Error("Offer ID required for admission fee payment.");
      const offer = await prisma.allotmentOffer.findUnique({ where: { id: offerId } });
      if (!offer || (offer.status !== "ACCEPTED" && offer.status !== "PAYMENT_PENDING")) {
        throw new Error("Valid accepted offer required to pay admission fee.");
      }
      if (new Date() > offer.payBy) {
        throw new Error("Payment deadline for this seat offer has expired.");
      }

      // Fetch official fee schedule from database
      const fee = await prisma.feeSchedule.findFirst({
        where: { institutionId: app.institutionId },
      });
      amountPaise = fee ? fee.amountPaise : 8500000; // ₹85,000 default
    }

    // Check for existing pending/paid order
    const existingOrder = await prisma.paymentOrder.findFirst({
      where: {
        applicationId,
        offerId: offerId || null,
        feeType,
        status: { in: ["CREATED", "PENDING", "PAID"] },
      },
      include: { transactions: true },
    });

    if (existingOrder && existingOrder.status === "PAID") {
      return existingOrder;
    }

    if (existingOrder) {
      return existingOrder;
    }

    // Provider order ID
    const providerOrderId = `order_${process.env.PAYMENT_PROVIDER || "mock"}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.create({
        data: {
          applicationId,
          offerId: offerId || null,
          feeType,
          amountPaise,
          currency: "INR",
          status: "CREATED",
          provider: process.env.PAYMENT_PROVIDER || "mock",
          providerOrderId,
        },
      });

      if (offerId) {
        await tx.allotmentOffer.update({
          where: { id: offerId },
          data: { status: "PAYMENT_PENDING" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "PAYMENT_ORDER_CREATED",
          entityType: "PaymentOrder",
          entityId: order.id,
          applicationId,
          afterState: JSON.stringify({ amountPaise, providerOrderId }),
        },
      });

      return order;
    });
  }

  /**
   * Process payment confirmation (mock or webhook)
   */
  static async confirmPayment(orderId: string, gatewayPaymentId: string, signature?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { id: orderId },
        include: { offer: { include: { seatPool: true } } },
      });

      if (!order) throw new Error("Payment order not found.");
      if (order.status === "PAID") {
        return { success: true, message: "Order is already paid.", order };
      }

      // Record transaction
      await tx.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          gatewayPaymentId: gatewayPaymentId || `pay_mock_${Date.now()}`,
          amountPaise: order.amountPaise,
          status: "CAPTURED",
          rawResponse: JSON.stringify({ confirmedAt: new Date(), signature }),
        },
      });

      // Mark order PAID
      const updatedOrder = await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // If admission fee for offer, transition offer to CONFIRMED and shift seat pool
      if (order.offerId && order.offer && order.offer.status !== "CONFIRMED") {
        await tx.allotmentOffer.update({
          where: { id: order.offerId },
          data: {
            status: "CONFIRMED",
            version: { increment: 1 },
          },
        });

        // Atomic shift from heldCount to confirmedCount
        await tx.seatPool.update({
          where: { id: order.offer.seatPoolId },
          data: {
            heldCount: { decrement: 1 },
            confirmedCount: { increment: 1 },
            version: { increment: 1 },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_CONFIRMED",
          entityType: "PaymentOrder",
          entityId: order.id,
          applicationId: order.applicationId,
          afterState: JSON.stringify({ status: "PAID", gatewayPaymentId }),
        },
      });

      return { success: true, order: updatedOrder };
    });
  }

  /**
   * Verify razorpay webhook signature
   */
  static verifyWebhookSignature(bodyText: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Process incoming payment webhook event idempotently with event deduplication & journal
   */
  static async handleWebhook(
    provider: string,
    providerEventId: string,
    rawBody: string,
    signature: string,
    eventPayload: any
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret";
    if (provider === "razorpay" && process.env.NODE_ENV === "production") {
      const isValid = this.verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        throw new Error("INVALID_WEBHOOK_SIGNATURE");
      }
    }

    // 1. Check for duplicate providerEventId (Idempotency deduplication)
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider,
          providerEventId,
        },
      },
    });

    if (existingEvent) {
      return { duplicate: true, message: "Webhook event already processed." };
    }

    // 2. Process event under database transaction
    return prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          provider,
          providerEventId,
          signatureStatus: "VERIFIED",
          payloadJson: typeof eventPayload === "string" ? eventPayload : JSON.stringify(eventPayload),
        },
      });

      const eventType = eventPayload?.event || eventPayload?.type || "payment.captured";
      const orderId =
        eventPayload?.payload?.payment?.entity?.order_id ||
        eventPayload?.orderId ||
        eventPayload?.order_id;
      const gatewayPaymentId =
        eventPayload?.payload?.payment?.entity?.id ||
        eventPayload?.paymentId ||
        eventPayload?.gatewayPaymentId ||
        `pay_${provider}_${providerEventId}`;

      if (eventType === "payment.captured" || eventType === "order.paid" || eventType === "payment.success") {
        const order = await tx.paymentOrder.findFirst({
          where: {
            OR: [
              { providerOrderId: orderId },
              { id: orderId },
            ],
          },
        });

        if (order && order.status !== "PAID") {
          await tx.paymentTransaction.create({
            data: {
              paymentOrderId: order.id,
              gatewayPaymentId,
              amountPaise: order.amountPaise,
              status: "CAPTURED",
              rawResponse: JSON.stringify({ provider, providerEventId, eventType }),
            },
          });

          await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
            },
          });

          if (order.offerId) {
            const offer = await tx.allotmentOffer.findUnique({ where: { id: order.offerId } });
            if (offer && offer.status !== "CONFIRMED") {
              await tx.allotmentOffer.update({
                where: { id: order.offerId },
                data: { status: "CONFIRMED", version: { increment: 1 } },
              });

              await tx.seatPool.update({
                where: { id: offer.seatPoolId },
                data: {
                  heldCount: { decrement: 1 },
                  confirmedCount: { increment: 1 },
                  version: { increment: 1 },
                },
              });
            }
          }

          await tx.auditLog.create({
            data: {
              action: "PAYMENT_CONFIRMED_WEBHOOK",
              entityType: "PaymentOrder",
              entityId: order.id,
              applicationId: order.applicationId,
              afterState: JSON.stringify({ status: "PAID", providerEventId, gatewayPaymentId }),
            },
          });
        }
      } else if (eventType === "payment.failed") {
        // Invariant 10: Late failed webhook cannot downgrade previously confirmed/paid order
        const order = await tx.paymentOrder.findFirst({
          where: {
            OR: [
              { providerOrderId: orderId },
              { id: orderId },
            ],
          },
        });

        if (order && order.status !== "PAID") {
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status: "FAILED" },
          });

          await tx.auditLog.create({
            data: {
              action: "PAYMENT_FAILED_WEBHOOK",
              entityType: "PaymentOrder",
              entityId: order.id,
              applicationId: order.applicationId,
              afterState: JSON.stringify({ status: "FAILED", providerEventId }),
            },
          });
        }
      }

      return { success: true, processed: true };
    });
  }
}
