const passwordInput = document.getElementById("password");
const meterFill = document.getElementById("meter-fill");
const strengthText = document.getElementById("strength-text");
const feedbackList = document.getElementById("feedback");

// Bundled locally so scoring never needs the network.
const commonPasswords = [
  "123456", "1234567", "12345678", "123456789", "1234567890", "111111",
  "000000", "123123", "654321", "666666", "121212", "112233", "123321",
  "abc123", "password", "passw0rd", "password1", "qwerty", "qwertyuiop",
  "asdfgh", "zxcvbn", "1q2w3e4r", "1qaz2wsx", "qazwsx", "iloveyou",
  "admin", "administrator", "letmein", "welcome", "monkey", "dragon",
  "master", "sunshine", "princess", "football", "baseball", "superman",
  "batman", "trustno1", "shadow", "michael", "jennifer", "hunter",
  "charlie", "freedom", "whatever", "starwars", "secret", "login",
  "access", "changeme", "default", "root", "guest", "test", "hello",
  "computer", "internet", "summer", "winter", "spring", "autumn",
  "love", "god", "pass", "user", "temp", "mustang", "ninja", "pokemon",
];
const commonPasswordSet = new Set(commonPasswords);

const keyboardRows = [
  "`1234567890-=",
  "qwertyuiop[]\\",
  "asdfghjkl;'",
  "zxcvbnm,./",
  "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
];

const leetSubstitutions = {
  "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "9": "g", "@": "a", "$": "s", "!": "i", "+": "t", "|": "l",
};

const MAX_ANALYZED_LENGTH = 128;

passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;
  const result = evaluatePassword(password);
  updateUI(result);
});

function characterSpace(text) {
  let space = 0;
  if (/[a-z]/.test(text)) space += 26;
  if (/[A-Z]/.test(text)) space += 26;
  if (/[0-9]/.test(text)) space += 10;
  if (/[^A-Za-z0-9]/.test(text)) space += 33;
  return Math.max(space, 10);
}

function unleet(text) {
  return Array.from(text.toLowerCase(), ch => leetSubstitutions[ch] || ch).join("");
}

function isSequence(segment) {
  if (segment.length < 3) return false;
  const delta = segment.charCodeAt(1) - segment.charCodeAt(0);
  if (Math.abs(delta) !== 1) return false;
  for (let i = 2; i < segment.length; i++) {
    if (segment.charCodeAt(i) - segment.charCodeAt(i - 1) !== delta) return false;
  }
  return true;
}

function isKeyboardRun(segment) {
  if (segment.length < 3) return false;
  const lower = segment.toLowerCase();
  const reversed = Array.from(lower).reverse().join("");
  return keyboardRows.some(row => row.includes(lower) || row.includes(reversed));
}

// Cheapest way (in bits of guessing work) to produce password[start, end)
// as one pattern, or null when no pattern covers the whole span.
function patternMatch(segment, cache) {
  const lower = segment.toLowerCase();
  const variantBits = segment === lower ? 0 : 1;
  const matches = [];

  if (segment.length >= 3) {
    if (commonPasswordSet.has(lower)) {
      matches.push({ kind: "common", bits: Math.log2(commonPasswords.length) + variantBits });
    } else if (commonPasswordSet.has(unleet(segment))) {
      matches.push({ kind: "common", bits: Math.log2(commonPasswords.length) + variantBits + 2 });
    }
  }
  if (isSequence(lower)) {
    matches.push({ kind: "sequence", bits: Math.log2(26) + Math.log2(segment.length) + 1 + variantBits });
  }
  if (isKeyboardRun(segment)) {
    matches.push({ kind: "keyboard", bits: Math.log2(keyboardRows.length * 12) + Math.log2(segment.length) + 1 + variantBits });
  }
  if (/^(19|20)\d\d$/.test(segment)) {
    matches.push({ kind: "year", bits: Math.log2(200) });
  }

  for (let blockLength = 1; segment.length >= 3 && blockLength <= segment.length / 2; blockLength++) {
    if (segment.length % blockLength !== 0) continue;
    const block = segment.slice(0, blockLength);
    if (block.repeat(segment.length / blockLength) === segment) {
      const blockBits = estimate(block, cache).bits;
      matches.push({
        kind: blockLength === 1 ? "repeatedCharacter" : "repeatedBlock",
        bits: blockBits + Math.log2(segment.length / blockLength),
      });
      break;
    }
  }

  if (!matches.length) return null;
  return matches.reduce((best, match) => (match.bits < best.bits ? match : best));
}

// Minimum-bits segmentation of the password into patterns and
// brute-forced characters (a small zxcvbn-style estimate).
function estimate(password, cache = new Map()) {
  if (cache.has(password)) return cache.get(password);
  const length = password.length;
  const perCharacter = Math.log2(characterSpace(password));
  const best = [{ bits: 0, kinds: [] }];
  for (let end = 1; end <= length; end++) {
    let candidate = { bits: best[end - 1].bits + perCharacter, kinds: best[end - 1].kinds };
    for (let start = 0; start <= end - 2; start++) {
      const match = patternMatch(password.slice(start, end), cache);
      if (!match) continue;
      const bits = best[start].bits + match.bits + 1;
      if (bits < candidate.bits) {
        candidate = { bits, kinds: best[start].kinds.concat(match.kind) };
      }
    }
    best[end] = candidate;
  }
  cache.set(password, best[length]);
  return best[length];
}

function scoreFromBits(bits) {
  if (bits < 28) return 0;
  if (bits < 40) return 1;
  if (bits < 56) return 2;
  if (bits < 72) return 3;
  return 4;
}

function evaluatePassword(password) {
  if (!password) {
    return { score: 0, feedback: [] };
  }

  const feedback = [];
  const analyzed = password.slice(0, MAX_ANALYZED_LENGTH);
  const extraBits = (password.length - analyzed.length) * Math.log2(characterSpace(password));
  const estimateResult = estimate(analyzed);
  const kinds = new Set(estimateResult.kinds);
  const usesPredictableTerm = kinds.has("common") || kinds.has("keyboard");

  let score;
  if (password.length < 8) score = 0;
  else if (password.length < 12) score = 1;
  else if (password.length < 16) score = 2;
  else if (password.length < 20) score = 3;
  else score = 4;

  const characterClasses = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter(pattern => pattern.test(password)).length;
  if (password.length >= 12 && characterClasses >= 3) {
    score += 1;
  }

  score = Math.min(score, scoreFromBits(estimateResult.bits + extraBits));

  if (password.length < 12) {
    feedback.push("Use a longer password or passphrase");
  }

  if (usesPredictableTerm) {
    score = Math.min(score, 1);
    feedback.push("Avoid predictable words and keyboard patterns");
  }

  if (kinds.has("sequence")) {
    feedback.push("Avoid sequences like abc or 1234");
  }

  if (kinds.has("year")) {
    feedback.push("Avoid years and dates");
  }

  if (/(.)\1{2,}/.test(password) || kinds.has("repeatedCharacter")) {
    score = Math.min(score, 1);
    feedback.push("Avoid repeated characters");
  }

  if (kinds.has("repeatedBlock")) {
    feedback.push("Avoid repeating the same block of characters");
  }

  if (score < 3 && password.length >= 12 && !usesPredictableTerm) {
    feedback.push("Prefer several unrelated words or a generated password");
  }

  score = Math.max(0, Math.min(score, 4));

  return { score, feedback };
}

function updateUI({ score, feedback }) {
  const percentage = (score / 4) * 100;
  meterFill.style.width = percentage + "%";

  let color;
  let label;

  if (score === 0) {
    color = "#ff4d4d";
    label = "Very Weak";
  } else if (score === 1) {
    color = "#ffa500";
    label = "Weak";
  } else if (score === 2) {
    color = "#ffd000";
    label = "Fair";
  } else if (score === 3) {
    color = "#9be15d";
    label = "Strong";
  } else {
    color = "#00ff88";
    label = "Very Strong";
  }

  meterFill.style.backgroundColor = color;
  strengthText.textContent = label;
  strengthText.setAttribute("data-score", String(score));

  feedbackList.innerHTML = "";
  feedback.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    feedbackList.appendChild(li);
  });
}
