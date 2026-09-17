# COMMAND / EVENT MAP

| Command | Owner | Input | Precondition | Mutation | Event | Undoable | Persistence | AI allowed | User confirm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ConfirmBoundary | Shot Authority | candidate/boundary + expected revision | candidate valid; media identity matches | upsert official boundary/shot | ShotStructureChanged | yes | yes | No direct AI | yes |
| MoveBoundary | Shot Authority | boundaryId,newFrame,expectedRevision | legal range/no overlap invariant | mutate structure | ShotStructureChanged | yes | yes | No | yes |
| SplitShot | Shot Authority | shotId,frame,expectedRevision | frame inside shot | replace membership preserving lineage | ShotSplit | yes | yes | No | yes |
| MergeShots | Shot Authority | adjacent shotIds,expectedRevision | adjacent/compatible | merge with lineage | ShotsMerged | yes | yes | No | yes |
| FlagShotCorrection | Analysis Application | shotId,returnContext | shot exists | no shot mutation | ShotCorrectionRequested | no | workspace only | yes | yes |
| UpdateAnalysisField | Analysis Authority | entityId,fieldId,value,evidence | field valid | record revision | AnalysisRecordChanged | yes | yes | AI cannot call as formal | human/user action |
| AcceptCandidate | Analysis Authority | candidateId,expected dependency revision | candidate pending; dependencies valid | write formal record + provenance | CandidateAccepted | yes | yes | AI proposes only | yes |
| RejectCandidate | Candidate Authority | candidateId | candidate pending | candidate status | CandidateRejected | no | yes | system may auto-expire, not reject | usually yes |
| MarkAnalysisStale | Analysis Domain/System | recordId,reason,dependencyRevision | dependency changed | eligibility state | AnalysisMarkedStale | system | yes | system allowed deterministic | no |
| ApplyTemplate/Profile | Template Authority | profileId/version | profile resolvable | workspace/project profile selection | TemplateApplied | yes | yes | AI may suggest | yes |
| CreateMarker | Timeline/Marker Authority | frame/range,label | legal time coordinate | marker create | MarkerCreated | yes | yes | AI candidate only unless policy | yes |
