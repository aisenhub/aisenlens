import { supabase } from "./client";

export interface RedemptionResult {
  role: "supporter";
}

export async function redeemSupportCode(code: string): Promise<RedemptionResult> {
  const { data, error } = await supabase.rpc("redeem_support_code", { p_code: code.trim() });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("兑换结果无效，请稍后重试。");

  return {
    role: result.role,
  };
}
