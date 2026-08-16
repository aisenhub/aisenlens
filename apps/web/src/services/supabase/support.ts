import type { PaymentChannel } from "../../features/support/types";
import { supabase } from "./client";

interface CreateSupportRequestInput {
  paymentChannel: PaymentChannel;
}

type SupportRequestEvent = "payment_cancelled" | "payment_claimed_paid" | "payment_expired";

export async function createSupportRequest({ paymentChannel }: CreateSupportRequestInput) {
  const { data, error } = await supabase.rpc("create_support_request", {
    p_payment_channel: paymentChannel,
  });

  if (error) throw error;

  return data as string;
}

export async function recordSupportRequestEvent(requestId: string, eventType: SupportRequestEvent, paymentReferenceLast4?: string) {
  const { data, error } = await supabase.rpc("record_support_request_event", {
    p_request_id: requestId,
    p_event_type: eventType,
    p_payment_reference_last4: paymentReferenceLast4 ?? null,
  });

  if (error) throw error;

  return data as "cancelled" | "expired" | "user_claimed_paid";
}
