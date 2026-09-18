import projectRepository from "../src/features/project/services/projectRepository";
import type { StoredShotRecord } from "../src/features/project/types";
import type { ShotGroupRecord } from "../src/features/group/types";
import { reconcileShotGroups } from "../src/features/group/services/reconcileShotGroups";
import { canApplyRuntimeTaskResult, RuntimeContractError } from "../src/types/runtime";
import { planProjectDatabaseMigration } from "../src/features/project/services/projectDatabaseMigration";
import { importProjectBackup } from "../src/features/project/services/projectBackupService";

function makeShot(projectId: string, id: string, order: number): StoredShotRecord {
  const timestamp = new Date(0).toISOString();
  return {
    id,
    projectId,
    order,
    startFrame: order * 10,
    endFrame: order * 10 + 10,
    status: "confirmed",
    detection: null,
    primaryScreenshotId: null,
    screenshotIds: [],
    firstFrameScreenshotId: null,
    lastFrameScreenshotId: null,
    analysisFields: {},
    description: "",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeGroup(projectId: string, id: string, kind: ShotGroupRecord["kind"], shotIds: string[]): ShotGroupRecord {
  const timestamp = new Date(0).toISOString();
  return { id, projectId, kind, title: id, summary: "", shotIds, createdAt: timestamp, updatedAt: timestamp };
}

function crc32(input: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of input) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const output = new Uint8Array(2);
  new DataView(output.buffer).setUint16(0, value, true);
  return output;
}

function u32(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value, true);
  return output;
}

function join(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function manifestZip(value: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const path = encoder.encode("manifest.json");
  const data = encoder.encode(JSON.stringify(value));
  const checksum = crc32(data);
  const local = join([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(path.length), u16(0), path, data]);
  const central = join([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(path.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), path]);
  return join([local, central, u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0)]);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB fixture request failed"));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB fixture transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB fixture transaction aborted"));
  });
}

async function openDatabase(name: string, version: number, onUpgrade?: (request: IDBOpenDBRequest) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => onUpgrade?.(request);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB fixture open failed"));
  });
}

async function verifyAtomicUpgradeRollback(): Promise<boolean> {
  const name = `aisenlens-phase02-migration-${crypto.randomUUID()}`;
  try {
    const v1 = await openDatabase(name, 1, (request) => {
      request.result.createObjectStore("canonical", { keyPath: "id" });
    });
    const seed = v1.transaction("canonical", "readwrite");
    seed.objectStore("canonical").put({ id: "kept", value: "before-upgrade" });
    await transactionResult(seed);
    v1.close();

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("new-store", { keyPath: "id" });
        request.transaction?.abort();
      };
      request.onsuccess = () => {
        request.result.close();
        reject(new Error("aborted upgrade unexpectedly succeeded"));
      };
      request.onerror = () => resolve();
    });

    const reopened = await openDatabase(name, 1);
    const preservedVersion = reopened.version === 1;
    const noPartialStore = !reopened.objectStoreNames.contains("new-store");
    const read = reopened.transaction("canonical", "readonly");
    const record = await requestResult(read.objectStore("canonical").get("kept")) as { value?: string } | undefined;
    await transactionResult(read);
    reopened.close();
    return preservedVersion && noPartialStore && record?.value === "before-upgrade";
  } finally {
    indexedDB.deleteDatabase(name);
  }
}

export async function runProjectRuntimeBaselineVerification() {
  const migrationPlan = planProjectDatabaseMigration(17, 18);
  const atomicUpgradeRollback = await verifyAtomicUpgradeRollback();
  const projectCountBeforeInvalidImport = (await projectRepository.listProjects()).length;
  let malformedBackupRejected = false;
  let tooNewBackupRejected = false;
  try {
    await importProjectBackup(new File([new Uint8Array([1, 2, 3, 4])], "corrupt.aisenlens-backup.zip", { type: "application/zip" }));
  } catch {
    malformedBackupRejected = true;
  }
  try {
    const bytes = manifestZip({ format: "aisenlens-project-backup", version: 4 });
    await importProjectBackup(new File([bytes], "future.aisenlens-backup.zip", { type: "application/zip" }));
  } catch (error) {
    tooNewBackupRejected = error instanceof RuntimeContractError && error.code === "VALIDATION_ERROR";
  }
  const backupTrustBoundary = malformedBackupRejected
    && tooNewBackupRejected
    && (await projectRepository.listProjects()).length === projectCountBeforeInvalidImport;
  const project = await projectRepository.createProject({ title: "Phase 02 runtime fixture" });

  try {
    await projectRepository.replaceProjectShots(project.id, [
      makeShot(project.id, "shot-1", 0),
      makeShot(project.id, "shot-2", 1),
      makeShot(project.id, "shot-3", 2),
    ]);
    const state = await projectRepository.readProjectEditorState(project.id);
    if (!state) throw new Error("runtime fixture project missing");

    const groups = [
      makeGroup(project.id, "scene-1", "scene", ["shot-1"]),
      makeGroup(project.id, "sequence-1", "sequence", ["shot-1", "shot-2"]),
      makeGroup(project.id, "section-1", "section", ["shot-1", "shot-2", "shot-3"]),
    ];
    const savedProject = await projectRepository.saveProjectEditorState({ ...state, groups }, state.project.updatedAt);
    const roundTrip = await projectRepository.readProjectEditorState(project.id);
    if (!roundTrip) throw new Error("runtime fixture round-trip missing");

    const structureRoundTrip = groups.every((expected) => {
      const actual = roundTrip.groups.find((group) => group.id === expected.id);
      return actual?.kind === expected.kind && JSON.stringify(actual.shotIds) === JSON.stringify(expected.shotIds);
    });

    const reconciled = reconcileShotGroups(roundTrip.groups, ["shot-1", "shot-2"]);
    const restructureNeedsReview = reconciled.find((group) => group.id === "section-1")?.validity?.status === "needs-review";

    const groupWriteProject = await projectRepository.replaceProjectShotGroups(project.id, roundTrip.groups, savedProject.updatedAt);
    let directGroupRevisionConflict = false;
    try {
      await projectRepository.replaceProjectShotGroups(project.id, roundTrip.groups, savedProject.updatedAt);
    } catch (error) {
      directGroupRevisionConflict = error instanceof RuntimeContractError
        && error.code === "REVISION_CONFLICT"
        && error.context.operation === "replace-project-shot-groups";
    }

    let staleProjectConflict = false;
    try {
      await projectRepository.saveProjectEditorState({ ...state, groups }, state.project.updatedAt);
    } catch (error) {
      staleProjectConflict = error instanceof RuntimeContractError
        && error.code === "REVISION_CONFLICT"
        && error.context.operation === "save-project-editor-state";
    }

    const lateResultDiscarded = !canApplyRuntimeTaskResult({
      status: "succeeded",
      dependencyRevision: savedProject.updatedAt,
      cancelRequested: false,
    }, groupWriteProject.updatedAt);
    const cancelledResultDiscarded = !canApplyRuntimeTaskResult({
      status: "succeeded",
      dependencyRevision: savedProject.updatedAt,
      cancelRequested: true,
    }, savedProject.updatedAt);

    return {
      migrationPlan,
      atomicUpgradeRollback,
      backupTrustBoundary,
      structureRoundTrip,
      restructureNeedsReview,
      directGroupRevisionConflict,
      staleProjectConflict,
      lateResultDiscarded,
      cancelledResultDiscarded,
    };
  } finally {
    await projectRepository.deleteProject(project.id);
  }
}
