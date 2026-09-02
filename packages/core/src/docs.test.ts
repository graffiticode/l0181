// SPDX-License-Identifier: MIT
/**
 * Docs must compile.
 *
 * This is not a documentation nit. The code generator writes from instructions.md and is
 * retrieved against spec.md, so a wrong example is reproduced verbatim into generated
 * programs — and unlike a wrong sentence, it is learned.
 *
 * Read paths are relative, so these run with packages/core as the cwd, which is what
 * `npm run -w packages/core test` does.
 */
import { test, describe, expect } from "vitest";
import { readFileSync } from "fs";
// Draft 2020-12 needs ajv's 2020 entry point; the default export only knows draft-07.
import Ajv2020 from "ajv/dist/2020.js";
import { compile } from "./testing.js";

/** Files whose fenced blocks are programs. examples.md holds prompts and is checked separately. */
const SPEC_FILES = ["spec/spec.md", "spec/instructions.md"];

/** Every fenced block in a markdown file, in order, with its 1-based start line. */
function blocks(path: string): { line: number; src: string }[] {
  const out: { line: number; src: string }[] = [];
  const lines = readFileSync(path, "utf-8").split("\n");
  let start = -1;
  let cur: string[] | null = null;
  let fence = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(/^```(.*)$/);
    if (m && cur === null) {
      cur = [];
      start = i + 1;
      fence = lines[i].match(/^\s*/)![0];
      continue;
    }
    if (m && cur !== null) {
      out.push({ line: start, src: cur.join("\n") });
      cur = null;
      continue;
    }
    if (cur !== null)
      cur.push(lines[i].startsWith(fence) ? lines[i].slice(fence.length) : lines[i]);
  }
  return out;
}

describe("every program in the docs compiles", () => {
  for (const file of SPEC_FILES) {
    const found = blocks(file);
    test(`${file} has programs to check`, () => {
      expect(found.length).toBeGreaterThan(0);
    });
    found.forEach(({ line, src }) => {
      test(`${file}:${line}`, async () => {
        const out = await compile(src);
        expect(out).toBeTypeOf("object");
      });
    });
  }

  test("spec/template.gc compiles", async () => {
    const out = await compile(readFileSync("spec/template.gc", "utf-8"));
    expect(out.cards.length).toBeGreaterThan(0);
  });
});

describe("compiled output matches the published schema", () => {
  // schema.json is served to consumers as the contract for L0181's output. A compiler change
  // that outgrows it should update it, not quietly diverge from it.
  const ajv = new (Ajv2020 as any)({ strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync("spec/schema.json", "utf-8")));

  test("the template validates", async () => {
    const out = await compile(readFileSync("spec/template.gc", "utf-8"));
    expect(validate(out) || ajv.errorsText(validate.errors)).toBe(true);
  });

  test("a fully-configured deck with study state validates", async () => {
    const out = await compile(
      'cards [["a" "b"] ["c" "d"]] title "T" instructions "I" theme DARK {}',
      { response: { marks: { "0": "known" }, cardId: 1, stack: "all" } },
    );
    expect(validate(out) || ajv.errorsText(validate.errors)).toBe(true);
  });
});

describe("examples.md numbering is coherent", () => {
  // The corpus generator numbers what it creates by the LABEL written here, so a repeated or
  // skipped number silently mislabels a run and there is no way to tell afterwards which
  // prompt produced which item.
  const text = readFileSync("spec/examples.md", "utf-8");
  const lines = text.split("\n");
  const numbered = lines
    .map((l) => l.match(/^(\d+)\.\s+\S/))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  const headers = lines
    .map((l) => l.match(/^##\s+Category\s+(\d+):\s+.*\((\d+)[–-](\d+)\)\s*$/))
    .filter(Boolean)
    .map((m) => ({ n: Number(m![1]), from: Number(m![2]), to: Number(m![3]) }));

  test("prompts run 1..N with no gaps or repeats", () => {
    expect(numbered.length).toBeGreaterThan(0);
    expect(numbered).toEqual(Array.from({ length: numbered.length }, (_, i) => i + 1));
  });

  test("categories are numbered in order and their ranges tile the whole list", () => {
    expect(headers.map((h) => h.n)).toEqual(headers.map((_, i) => i + 1));
    expect(headers[0].from).toBe(1);
    expect(headers[headers.length - 1].to).toBe(numbered.length);
    for (let i = 1; i < headers.length; i++) {
      expect(headers[i].from, `category ${headers[i].n} does not follow ${headers[i - 1].n}`).toBe(
        headers[i - 1].to + 1,
      );
    }
  });

  test("the count stated in the preamble is the count actually present", () => {
    const stated = text.match(/^(\d+) example prompts/m);
    expect(stated, "examples.md should open with 'N example prompts'").toBeTruthy();
    expect(Number(stated![1])).toBe(numbered.length);
  });

  test("prompts ask for content, not for code", () => {
    // A prompt that writes the program teaches the generator to echo syntax instead of
    // reading intent — and these are the retrieval corpus, so it is learned.
    const codey = numbered
      .map((_, i) => lines.find((l) => l.startsWith(`${i + 1}. `)))
      .filter((l) => l && /\bcards \[|\{\}\.\.|\btitle "|\btheme (DARK|LIGHT)\b/.test(l));
    expect(codey).toEqual([]);
  });

  test("no prompt asks for a matching or memory game — those are L0159", () => {
    const offside = lines.filter(
      (l) => /^\d+\. /.test(l) && /\b(matching game|memory game|concentration)\b/i.test(l),
    );
    expect(offside).toEqual([]);
  });
});
