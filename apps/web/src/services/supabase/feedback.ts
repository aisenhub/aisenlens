import type { FeedbackKind, FeedbackSource } from "../../features/feedback/types";
import { supabase } from "./client";

interface CreateFeedbackInput {
  kind: FeedbackKind;
  title: string;
  content: string;
  source: FeedbackSource;
}

export async function createFeedbackRequest({ kind, title, content, source }: CreateFeedbackInput) {
  const { data, error } = await supabase.rpc("create_feedback_request", {
    p_kind: kind,
    p_title: title,
    p_content: content,
    p_source: source,
  });

  if (error) throw error;

  return data as string;
}

export async function canAccessSupporterFeedback() {
  const { data, error } = await supabase.rpc("can_access_supporter_feedback");

  if (error) throw error;

  return Boolean(data);
}
