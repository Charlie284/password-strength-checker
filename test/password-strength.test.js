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

test("a repeated multi-character block is not labeled strong", () => {
  const result = evaluatePassword("Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("block")));
});

test("alphabetic and numeric sequences are weak", () => {
  for (const password of ["abcdefghijklmnopqrstuvwxyz", "12345678901234567890", "zyxwvutsrqponmlk"]) {
    const result = evaluatePassword(password);
    assert.ok(result.score <= 1, `${password}: unexpected score ${result.score}`);
  }
});

test("keyboard walks are flagged as predictable", () => {
  const result = evaluatePassword("qwertyuiopasdfghjkl");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("keyboard")));
});

test("leetspeak common passwords with a year are weak", () => {
  const result = evaluatePassword("P@ssw0rd2024!");

  assert.ok(result.score <= 1, `unexpected score: ${result.score}`);
  assert.ok(result.feedback.some(item => item.includes("predictable")));
});

test("a long random password keeps a strong rating", () => {
  const result = evaluatePassword("vT8#qL2!mZ9@rX4$");

  assert.ok(result.score >= 3, `unexpected score: ${result.score}`);
});

test("very long input is evaluated quickly", () => {
  const started = Date.now();
  evaluatePassword("Ab1!".repeat(250));
  evaluatePassword("x9#Lq".repeat(200) + "abcdefghijklmnop".repeat(10));

  assert.ok(Date.now() - started < 1000, "evaluation took too long");
});

test("the estimator makes no network calls", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

  for (const api of ["fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "import("]) {
    assert.ok(!source.includes(api), `script.js references ${api}`);
  }
});
