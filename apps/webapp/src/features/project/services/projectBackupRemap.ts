import type {
  AnalysisCandidate,
  AnalysisContextManifest,
  AnalysisEvidenceRecord,
  AnalysisRecord,
  AnalysisSubjectRef,
  EvidenceRef,
} from "../../analysis/types.ts"

export interface BackupAnalysisRemapInput {
  newProjectId: string
  now: string
  records: readonly AnalysisRecord[]
  candidates: readonly AnalysisCandidate[]
  evidence: readonly AnalysisEvidenceRecord[]
  contextManifests: readonly AnalysisContextManifest[]
  shotIdMap: ReadonlyMap<string, string>
  groupIdMap: ReadonlyMap<string, string>
  screenshotIdMap: ReadonlyMap<string, string>
  markerIdMap: ReadonlyMap<string, string>
  assetIdMap: ReadonlyMap<string, string>
  createId?: () => string
}

export interface BackupAnalysisRemapResult {
  records: AnalysisRecord[]
  candidates: AnalysisCandidate[]
  evidence: AnalysisEvidenceRecord[]
  contextManifests: AnalysisContextManifest[]
}

export function remapAnalysisBackupData(input: BackupAnalysisRemapInput): BackupAnalysisRemapResult {
  const createId = input.createId ?? (() => crypto.randomUUID())
  const candidateIdMap = new Map(input.candidates.map((item) => [item.id, createId()]))
  const evidenceIdMap = new Map(input.evidence.map((item) => [item.id, createId()]))
  const contextManifestIdMap = new Map(input.contextManifests.map((item) => [item.id, createId()]))

  const remapSubject = (subject: AnalysisSubjectRef): AnalysisSubjectRef => {
    if (subject.kind === "shot") return { ...subject, id: input.shotIdMap.get(subject.id) ?? subject.id }
    if (subject.kind === "scene" || subject.kind === "sequence" || subject.kind === "section") {
      return { ...subject, id: input.groupIdMap.get(subject.id) ?? subject.id }
    }
    return { ...subject, id: input.newProjectId }
  }

  const remapEvidenceRef = (ref: EvidenceRef): EvidenceRef => {
    if (ref.kind === "screenshot") return { ...ref, id: createId(), projectId: input.newProjectId, screenshotId: input.screenshotIdMap.get(ref.screenshotId) ?? ref.screenshotId }
    if (ref.kind === "shot") return { ...ref, id: createId(), projectId: input.newProjectId, shotId: input.shotIdMap.get(ref.shotId) ?? ref.shotId }
    if (ref.kind === "marker") return { ...ref, id: createId(), projectId: input.newProjectId, markerId: input.markerIdMap.get(ref.markerId) ?? ref.markerId }
    if (ref.kind === "audio-range") return { ...ref, id: createId(), projectId: input.newProjectId, assetId: input.assetIdMap.get(ref.assetId) ?? ref.assetId }
    if (ref.kind === "frame" || ref.kind === "range" || ref.kind === "dialogue" || ref.kind === "statistic") return { ...ref, id: createId(), projectId: input.newProjectId }
    return { ...ref, id: createId() }
  }

  const records = input.records.map((record) => {
    const subject = remapSubject(record.subject)
    return {
      ...structuredClone(record),
      id: [input.newProjectId, subject.kind, subject.id, record.fieldId].join(":"),
      projectId: input.newProjectId,
      subject,
      evidenceRefs: record.evidenceRefs.map((id) => evidenceIdMap.get(id) ?? id),
      createdAt: input.now,
      updatedAt: input.now,
      revision: 1,
    }
  })
  const recordIdMap = new Map(input.records.map((record, index) => [record.id, records[index].id]))

  const contextManifests = input.contextManifests.map((manifest) => ({
    ...structuredClone(manifest),
    id: contextManifestIdMap.get(manifest.id)!,
    projectId: input.newProjectId,
    subject: remapSubject(manifest.subject),
    evidenceRefs: manifest.evidenceRefs.map((id) => evidenceIdMap.get(id) ?? id),
    createdAt: input.now,
  }))

  const candidates = input.candidates.map((candidate) => ({
    ...structuredClone(candidate),
    id: candidateIdMap.get(candidate.id)!,
    projectId: input.newProjectId,
    subject: remapSubject(candidate.subject),
    evidenceRefs: candidate.evidenceRefs.map((id) => evidenceIdMap.get(id) ?? id),
    contextManifestId: candidate.contextManifestId ? contextManifestIdMap.get(candidate.contextManifestId) ?? null : null,
    acceptedRecordId: candidate.acceptedRecordId ? recordIdMap.get(candidate.acceptedRecordId) ?? null : null,
    createdAt: input.now,
    updatedAt: input.now,
    revision: 1,
  }))

  const evidence = input.evidence.map((item) => ({
    ...structuredClone(item),
    id: evidenceIdMap.get(item.id)!,
    projectId: input.newProjectId,
    ref: remapEvidenceRef(item.ref),
    recordId: item.recordId ? recordIdMap.get(item.recordId) ?? null : null,
    candidateId: item.candidateId ? candidateIdMap.get(item.candidateId) ?? null : null,
    createdAt: input.now,
    updatedAt: input.now,
    revision: 1,
  }))

  return { records, candidates, evidence, contextManifests }
}
