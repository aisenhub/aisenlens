import type { FeedbackKind } from "../../features/feedback/types";
import { supabase } from "./client";

interface CreateFeedbackInput {
  kind: FeedbackKind;
  title: string;
  content: string;
}

export async function createFeedbackRequest({ kind, title, content }: CreateFeedbackInput) {
  const { data, error } = await supabase.rpc("create_feedback_request", {
    p_kind: kind,
    p_title: title,
    p_content: content,
  });

  if (error) throw error;

  return data as string;
}
