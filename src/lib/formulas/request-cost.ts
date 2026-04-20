/**
 * Request cost calculator.
 *
 * Computes cost per request, per 1M tokens, per user per hour/month.
 */

export interface RequestCostResult {
  costPerRequest: number;
  costPerMInputTokens: number;
  costPerMOutputTokens: number;
  costPerUserPerHour: number;
  costPerUserPerMonth: number;
  breakevenRequestsPerHour: number;
}

/**
 * Compute request costs.
 *
 * @param hourlyCloudCost       - Cloud instance cost per hour in USD
 * @param concurrentUsers       - Number of concurrent users
 * @param ttftMs                - Time to first token in ms
 * @param tpotMs                - Time per output token in ms
 * @param avgOutputTokens       - Average output tokens per request
 * @param prefillThroughput     - Prefill throughput in tokens/s
 * @param decodeThroughput      - Decode throughput in tokens/s (aggregate)
 * @param apiCostPerMTokens     - API cost per 1M tokens for breakeven calc (default $0.50)
 */
export function computeRequestCost(
  hourlyCloudCost: number,
  concurrentUsers: number,
  ttftMs: number,
  tpotMs: number,
  avgOutputTokens: number,
  prefillThroughput: number,
  decodeThroughput: number,
  apiCostPerMTokens: number = 0.5,
): RequestCostResult {
  const users = Math.max(1, concurrentUsers);

  // E2E time per request in seconds
  const e2eSeconds = (ttftMs + avgOutputTokens * tpotMs) / 1000;

  // cost_per_request = (hourly_cost / 3600) × E2E_seconds
  const costPerRequest = (hourlyCloudCost / 3600) * e2eSeconds;

  // cost_per_M_input_tokens = hourly_cost / (prefill_throughput × 3600) × 1e6
  // = hourly_cost / (prefill_throughput × 3.6)
  const costPerMInputTokens = prefillThroughput > 0
    ? hourlyCloudCost / (prefillThroughput * 3.6)
    : 0;

  // cost_per_M_output_tokens = hourly_cost / (decode_throughput × 3600) × 1e6
  // = hourly_cost / (decode_throughput × 3.6)
  const costPerMOutputTokens = decodeThroughput > 0
    ? hourlyCloudCost / (decodeThroughput * 3.6)
    : 0;

  // cost_per_user_per_hour = hourly_cost / concurrent_users
  const costPerUserPerHour = hourlyCloudCost / users;

  // cost_per_user_per_month = cost_per_user_per_hour × 8h/day × 22 days
  const costPerUserPerMonth = costPerUserPerHour * 8 * 22;

  // Breakeven: self-hosting is cheaper than API at >X requests/hour
  // API cost per request = apiCostPerMTokens / 1e6 × (prompt + output tokens)
  // For simplicity, use output tokens as proxy
  const apiCostPerRequest = (apiCostPerMTokens / 1e6) * avgOutputTokens;
  const selfHostCostPerRequest = costPerRequest;
  const breakevenRequestsPerHour = apiCostPerRequest > selfHostCostPerRequest && selfHostCostPerRequest > 0
    ? Math.ceil(hourlyCloudCost / (apiCostPerRequest - selfHostCostPerRequest))
    : 0;

  return {
    costPerRequest,
    costPerMInputTokens,
    costPerMOutputTokens,
    costPerUserPerHour,
    costPerUserPerMonth,
    breakevenRequestsPerHour,
  };
}
