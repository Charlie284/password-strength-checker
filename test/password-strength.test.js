const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

function loadEvaluator() {
  const nodes = {
    password: { addEventListener() {}, value: "" },
    "meter-fill": { style: {} },
    "strength-text": { textContent: "" },
    feedback: { appendChild() {}, innerHTML: "" },
  };
  const context = vm.createContext({
    document: {
      createElement: () => ({ textContent: "" }),
      getElementById: id => nodes[id],
    },
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  vm.runInContext(source, context);
  return context.evaluatePassword;
}

const evaluatePassword = loadEvaluator();

test("a predictable decorated password is weaker than a long passphrase", () => {
  const decorated = evaluatePassword("Password1!");
  const passphrase = evaluatePassword("correct horse battery staple");

  assert.ok(decorated.score <= 1, `unexpected score: ${decorated.score}`);
  assert.ok(passphrase.score >= 3, `unexpected score: ${passphrase.score}`);
  assert.ok(passphrase.score > decorated.score);
});

test("common password roots produce specific guidance", () => {
  const result = evaluatePassword("qwerty2026!");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("predictable")));
});

test("short passwords remain weak even with mixed character classes", () => {
  const result = evaluatePassword("A1!bc");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("longer")));
});

test("a long repeated password is not labeled strong", () => {
  const result = evaluatePassword("aaaaaaaaaaaaaaaaaaaaaaaa");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("repeated")));
});
