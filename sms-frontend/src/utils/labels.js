// Utilities to normalize values for display in tables and chips

export function toLabel(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((v) => toLabel(v))
      .filter((s) => !!s)
      .join(", ");
  }
  if (typeof value === "object") {
    const candidates = [
      value.name,
      value.title,
      value.label,
      value.username,
      value.code,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
      if (typeof c === "object" && c !== null) {
        if (typeof c.name === "string" && c.name.trim()) return c.name;
        if (typeof c.label === "string" && c.label.trim()) return c.label;
      }
    }
    if (value._id !== undefined && value._id !== null) return String(value._id);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function toLabelArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => toLabel(v))
    .map((s) => (typeof s === "string" ? s.trim() : s))
    .filter((s) => !!s);
}
