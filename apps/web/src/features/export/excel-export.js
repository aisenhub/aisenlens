export function escapeExcelXml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[character]));
}

export function getExcelColumnName(index) {
  let value = Number(index) + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

export function dataUrlToUint8Array(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  if (parts.length < 2) return new Uint8Array();
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
