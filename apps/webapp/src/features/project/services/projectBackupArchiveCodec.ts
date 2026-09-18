const encoder = new TextEncoder()
const decoder = new TextDecoder()

function crc32(input: Uint8Array) {
  let crc = 0xffffffff
  for (const value of input) {
    crc ^= value
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function join(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function u16(value: number) {
  const output = new Uint8Array(2)
  new DataView(output.buffer).setUint16(0, value, true)
  return output
}

function u32(value: number) {
  const output = new Uint8Array(4)
  new DataView(output.buffer).setUint32(0, value, true)
  return output
}

export interface BackupArchiveResource {
  path: string
  data: Uint8Array
}

export function encodeBackupArchive(manifest: unknown, resourceFiles: BackupArchiveResource[] = []): Uint8Array {
  const files = [{ path: "manifest.json", data: encoder.encode(JSON.stringify(manifest)) }, ...resourceFiles]
  let offset = 0
  const localEntries: Uint8Array[] = []
  const centralEntries: Uint8Array[] = []
  for (const file of files) {
    const path = encoder.encode(file.path)
    const checksum = crc32(file.data)
    const local = join([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(file.data.length), u32(file.data.length), u16(path.length), u16(0), path, file.data])
    localEntries.push(local)
    centralEntries.push(join([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(file.data.length), u32(file.data.length), u16(path.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), path]))
    offset += local.length
  }
  const directory = join(centralEntries)
  return join([...localEntries, directory, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(directory.length), u32(offset), u16(0)])
}

export function decodeBackupArchive(input: Uint8Array, maxBackupBytes: number): { manifest: unknown; manifestBytes: Uint8Array; entries: Map<string, Uint8Array> } {
  if (input.byteLength > maxBackupBytes) throw new Error("备份文件超过安全上限。")
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  let end = -1
  for (let index = input.length - 22; index >= Math.max(0, input.length - 65_557); index--) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index
      break
    }
  }
  if (end < 0) throw new Error("备份文件不是有效的 ZIP 包。")
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const entries = new Map<string, Uint8Array>()
  for (let index = 0; index < count; index++) {
    if (offset < 0 || offset + 46 > input.length) throw new Error("备份目录越界。")
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("备份目录损坏。")
    const method = view.getUint16(offset + 10, true)
    const checksum = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const size = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    if (offset + 46 + nameLength + extraLength + commentLength > input.length || localOffset + 30 > input.length) throw new Error("备份目录条目越界。")
    const name = decoder.decode(input.slice(offset + 46, offset + 46 + nameLength))
    if (!name || name.startsWith("/") || name.includes("..") || method !== 0 || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("备份包含不安全或不受支持的资源。")
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    if (compressedSize !== size || dataStart + size > input.length || entries.has(name)) throw new Error("备份资源大小或名称校验失败。")
    const data = input.slice(dataStart, dataStart + size)
    if (crc32(data) !== checksum) throw new Error(`备份资源校验失败：${name}`)
    entries.set(name, data)
    offset += 46 + nameLength + extraLength + commentLength
  }
  const manifestBytes = entries.get("manifest.json")
  if (!manifestBytes) throw new Error("备份缺少 manifest.json。")
  let manifest: unknown
  try {
    manifest = JSON.parse(decoder.decode(manifestBytes))
  } catch {
    throw new Error("备份清单无法读取。")
  }
  return { manifest, manifestBytes, entries }
}
