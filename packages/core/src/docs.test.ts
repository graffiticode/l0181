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

/** Files whose fenced blocks are programs. */
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
