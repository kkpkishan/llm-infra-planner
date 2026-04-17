/**
 * Minimal YAML parser for the cloud-overrides.yml and hardware.yml files.
 * Supports the subset of YAML used in this project:
 *   - Top-level keys
 *   - Lists of objects (- key: value)
 *   - Nested objects (indented key: value)
 *   - Nested lists (- item)
 *   - String, number, boolean, null values
 *   - Comments (#)
 *   - Quoted strings
 *
 * This is intentionally minimal — not a full YAML spec implementation.
 * For production use, consider adding the 'js-yaml' package.
 */

type YAMLValue = string | number | boolean | null | YAMLObject | YAMLValue[];
type YAMLObject = { [key: string]: YAMLValue };

function parseValue(raw: string): YAMLValue {
  const s = raw.trim();
  if (s === "null" || s === "~" || s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  // Quoted string
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Number
  const n = Number(s);
  if (!isNaN(n) && s !== "") return n;
  return s;
}

function getIndent(line: string): number {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return i;
}

/**
 * Parse a YAML string into a JavaScript object.
 * Handles the subset of YAML used in cloud-overrides.yml and hardware.yml.
 */
export function parseYAML(yaml: string): YAMLObject {
  const lines = yaml.split("\n");
  // Remove comments and blank lines for processing, but keep track of originals
  const cleaned = lines.map((line) => {
    // Remove inline comments (but not inside quotes)
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "'" && !inDouble) inSingle = !inSingle;
      else if (line[i] === '"' && !inSingle) inDouble = !inDouble;
      else if (line[i] === "#" && !inSingle && !inDouble) {
        return line.slice(0, i).trimEnd();
      }
    }
    return line;
  });

  return parseBlock(cleaned, 0, 0).value as YAMLObject;
}

interface ParseResult {
  value: YAMLValue;
  nextLine: number;
}

function parseBlock(lines: string[], startLine: number, baseIndent: number): ParseResult {
  // Skip blank lines
  let i = startLine;
  while (i < lines.length && lines[i].trim() === "") i++;

  if (i >= lines.length) return { value: null, nextLine: i };

  const firstLine = lines[i];
  const indent = getIndent(firstLine);
  const trimmed = firstLine.trim();

  // List item
  if (trimmed.startsWith("- ") || trimmed === "-") {
    return parseList(lines, i, indent);
  }

  // Object
  if (trimmed.includes(":")) {
    return parseObject(lines, i, indent);
  }

  return { value: parseValue(trimmed), nextLine: i + 1 };
}

function parseList(lines: string[], startLine: number, baseIndent: number): ParseResult {
  const result: YAMLValue[] = [];
  let i = startLine;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    const indent = getIndent(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }

    const trimmed = line.trim();
    if (!trimmed.startsWith("- ") && trimmed !== "-") break;

    const rest = trimmed.slice(2).trim();

    if (rest === "" || rest === "|" || rest === ">") {
      // Block scalar or empty — look ahead for nested content
      i++;
      const nextNonEmpty = skipBlanks(lines, i);
      if (nextNonEmpty < lines.length && getIndent(lines[nextNonEmpty]) > baseIndent) {
        const nested = parseBlock(lines, nextNonEmpty, getIndent(lines[nextNonEmpty]));
        result.push(nested.value);
        i = nested.nextLine;
      } else {
        result.push(null);
      }
    } else if (rest.includes(":") && !rest.startsWith('"') && !rest.startsWith("'")) {
      // Inline object start: "- key: value" or "- key:"
      const objLines: string[] = [];
      // First line: convert "- key: value" to "  key: value" at baseIndent+2
      const objIndent = baseIndent + 2;
      objLines.push(" ".repeat(objIndent) + rest);
      i++;
      // Collect continuation lines at deeper indent
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine.trim() === "") { i++; continue; }
        const nextIndent = getIndent(nextLine);
        if (nextIndent <= baseIndent) break;
        objLines.push(nextLine);
        i++;
      }
      const obj = parseObject(objLines, 0, objIndent);
      result.push(obj.value);
    } else {
      // Simple scalar
      result.push(parseValue(rest));
      i++;
    }
  }

  return { value: result, nextLine: i };
}

function skipBlanks(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length && lines[i].trim() === "") i++;
  return i;
}

function parseObject(lines: string[], startLine: number, baseIndent: number): ParseResult {
  const result: YAMLObject = {};
  let i = startLine;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    const indent = getIndent(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }

    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) break; // list item at this level

    const colonIdx = findColon(trimmed);
    if (colonIdx === -1) { i++; continue; }

    const rawKey = trimmed.slice(0, colonIdx).trim();
    const key = rawKey.replace(/^['"]|['"]$/g, "");
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      // Value is on next lines
      i++;
      const nextNonEmpty = skipBlanks(lines, i);
      if (nextNonEmpty < lines.length) {
        const nextIndent = getIndent(lines[nextNonEmpty]);
        if (nextIndent > baseIndent) {
          const nextTrimmed = lines[nextNonEmpty].trim();
          if (nextTrimmed.startsWith("- ") || nextTrimmed === "-") {
            const listResult = parseList(lines, nextNonEmpty, nextIndent);
            result[key] = listResult.value;
            i = listResult.nextLine;
          } else {
            const objResult = parseObject(lines, nextNonEmpty, nextIndent);
            result[key] = objResult.value;
            i = objResult.nextLine;
          }
        } else {
          result[key] = null;
        }
      } else {
        result[key] = null;
      }
    } else {
      result[key] = parseValue(rawValue);
      i++;
    }
  }

  return { value: result, nextLine: i };
}

function findColon(s: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'" && !inDouble) inSingle = !inSingle;
    else if (s[i] === '"' && !inSingle) inDouble = !inDouble;
    else if (s[i] === ":" && !inSingle && !inDouble) return i;
  }
  return -1;
}
