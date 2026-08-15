import type { PaymentChannel } from "../../features/support/types";
import { supabase } from "./client";

interface CreateSupportRequestInput {
  tierId: string;
  message: string;
  paymentChannel: PaymentChannel;
}

type SupportRequestEvent = "payment_cancelled" | "payment_claimed_paid";

export async function createSupportRequest({ tierId, message, paymentChannel }: CreateSupportRequestInput) {
  const { data, error } = await supabase.rpc("create_support_request", {
    p_tier_id: tierId,
    p_message: message,
    p_payment_channel: paymentChannel,
  });

  if (error) throw error;

  return data as string;
}

export async function recordSupportRequestEvent(requestId: string, eventType: SupportRequestEvent) {
  const { error } = await supabase.rpc("record_support_request_event", {
    p_request_id: requestId,
    p_event_type: eventType,
  });

  if (error) throw error;
}
