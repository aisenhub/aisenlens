import projectRepository from "../../project/services/projectRepository"
import type { AnalysisRepositoryPort } from "../types"

const analysisRepository: AnalysisRepositoryPort = {
  listRecords: (projectId) => projectRepository.listProjectAnalysisRecords(projectId),
  listCandidates: (projectId) => projectRepository.listProjectAnalysisCandidates(projectId),
  listEvidence: (projectId) => projectRepository.listProjectAnalysisEvidence(projectId),
  listContextManifests: (projectId) => projectRepository.listProjectAnalysisContextManifests(projectId),
  saveRecord: (record, expectedRevision, expectedProjectRevision) => projectRepository.saveProjectAnalysisRecord(record, expectedRevision, expectedProjectRevision),
  saveCandidate: (candidate, expectedRevision) => projectRepository.saveProjectAnalysisCandidate(candidate, expectedRevision),
  saveEvidence: (evidence, expectedRevision, expectedProjectRevision) => projectRepository.saveProjectAnalysisEvidence(evidence, expectedRevision, expectedProjectRevision),
  saveContextManifest: (manifest) => projectRepository.saveProjectAnalysisContextManifest(manifest),
  acceptCandidate: (candidateId, expectedCandidateRevision, expectedProjectRevision) => projectRepository.acceptProjectAnalysisCandidate(candidateId, expectedCandidateRevision, expectedProjectRevision),
}

export default analysisRepository
