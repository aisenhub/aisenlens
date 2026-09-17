# AUTHORITY MAP

| Domain | Who creates | Who modifies | Who confirms | Who deletes | Read-only consumers | Persistence | Version/Stale owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Media | Import/Project service | Media service | N/A | Project delete flow | all workspaces read | IndexedDB via repository | media identity/versioning |
| Official Shot / Boundary | Detection candidate + user/manual command | Shot Authority in Preparation | User confirms structural mutation | Shot Authority only | Analysis/Timeline/Results read | Project repository | structure revision + stale propagation |
| Scene/Sequence/Section | Analysis structure commands | Analysis Structure Authority | User/explicit command | Analysis Structure Authority | Timeline/Results read | target repository | structure revision |
| AnalysisRecord | Human input or accepted candidate | Analysis Authority | Human input / explicit acceptance | Analysis Authority | Results read | target Analysis repository | record revision/stale |
| AnalysisCandidate | AI/Application | Candidate service | User accept/reject | Candidate service | Inspector reads | candidate repository | candidate lifecycle |
| Result Dataset | Derived query | Results application | No confirmation creates fact | read-only derived | Export/Creative reads | derived/cache only | inherits analysis revision |
| Template/Profile | Template service | Template Authority | User/profile management | Template Authority | Analysis/Results/AI read | Project profile store | profile version |
| Evidence/Provenance | Analysis/Candidate commands | Evidence/Provenance Authority | with owning record | Analysis Authority | Inspector/Results read | with/adjacent record | immutable provenance entries preferred |
| Timeline View | UI | UI only | N/A | viewport/selection only | N/A | workspace preference only | no domain revision |
| AI Output | AI provider/application | Candidate only | must be reviewed for formal fact | never direct formal mutation | Inspector reads | candidate/provenance | model/prompt/context version |

## Frozen authority chain

`Media → DetectionCandidate → Boundary Review → Shot Authority → Official Shot → Analysis Authority → Confirmed AnalysisRecord → Results Consumption`.

Timeline View、Inspector、Results 和 AI 均不得绕过该链成为正式 Shot 或 Analysis Fact 的隐式写入源。
