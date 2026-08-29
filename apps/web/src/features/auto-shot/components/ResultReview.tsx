import { Checkbox } from "../../../components/ui/checkbox";
import type { AutoShotCandidate } from "../types";

interface ResultReviewProps {
  candidates: AutoShotCandidate[];
  excludedCandidateIds: string[];
  onToggle: (candidateId: string, included: boolean) => void;
}

export default function ResultReview({ candidates, excludedCandidateIds, onToggle }: ResultReviewProps) {
  return (
    <div className="mt-2 max-h-28 space-y-1 overflow-auto border-t border-green-400/10 pt-2">
      {candidates.map((candidate, index) => {
        const included = !excludedCandidateIds.includes(candidate.id);
        return (
          <label key={candidate.id} className="flex cursor-pointer items-center gap-2 text-text-muted">
            <Checkbox checked={included} onCheckedChange={(checked) => onToggle(candidate.id, checked === true)} />
            <span>片段 {index + 1} · {candidate.kind === "tail" ? "尾段" : candidate.kind === "fade" ? "淡入淡出" : "硬切"}</span>
          </label>
        );
      })}
    </div>
  );
}
