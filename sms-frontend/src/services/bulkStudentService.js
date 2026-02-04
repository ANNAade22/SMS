import api from "./apiClient";

export async function bulkCreateStudents(students, { atomic = true } = {}) {
  const url = atomic
    ? "/api/v1/students/bulk"
    : "/api/v1/students/bulk?atomic=false";
  const res = await api.post(url, { students, atomic });
  return res.data;
}

export async function bulkPreflightStudents(students) {
  const res = await api.post("/api/v1/students/bulk/preflight", { students });
  return res.data;
}

export function buildStudentCsvTemplate() {
  const headers = [
    "username",
    "name",
    "surname",
    "email",
    "address",
    "sex",
    "birthday(YYYY-MM-DD)",
    "parentId",
    "classId",
    "gradeId",
    "phone(optional)",
    "bloodType(optional)",
  ];
  const example = [
    "johnsmith01",
    "John",
    "Smith",
    "john.smith@example.com",
    "123 Main St",
    "MALE",
    "2010-05-14",
    "<parentObjectId>",
    "<classObjectId>",
    "<gradeObjectId>",
    "5551234567",
    "O+",
  ];
  return `${headers.join(",")}\n${example.join(",")}`;
}

export function parseStudentCsv(text) {
  if (!text || typeof text !== "string") return { headers: [], rows: [] };
  // Strip BOM and normalize newlines
  let src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  src = src.trim();
  if (!src) return { headers: [], rows: [] };

  // Detect delimiter: prefer comma, fallback to semicolon if it dominates
  const firstLine = src.split("\n", 1)[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  // Simple CSV tokenizer supporting quotes and escaped quotes
  const tokenize = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };

  const lines = src.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = tokenize(lines[0]).map((h) =>
    h.replace(/^\ufeff/, "").trim()
  );

  // Header normalization to provide friendly aliases
  const norm = (h) =>
    h
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\(.*?\)/g, "") // remove parentheses like (YYYY-MM-DD) or (optional)
      .replace(/[^a-z0-9]/g, "");

  const headerAliases = {
    username: "username",
    name: "name",
    surname: "surname",
    email: "email",
    address: "address",
    sex: "sex",
    birthday: "birthday",
    parentid: "parentId",
    classid: "classId",
    gradeid: "gradeId",
    phone: "phone",
    bloodtype: "bloodType",
  };

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = tokenize(lines[i]);
    // Skip empty records
    if (cols.every((c) => c === "")) continue;
    const obj = {};
    rawHeaders.forEach((h, idx) => {
      const v = cols[idx] !== undefined ? cols[idx] : "";
      obj[h] = v;
      const key = headerAliases[norm(h)];
      if (key) obj[key] = v;
    });
    rows.push(obj);
  }

  return { headers: rawHeaders, rows };
}
