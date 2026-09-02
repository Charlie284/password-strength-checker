const passwordInput = document.getElementById("password");
const meterFill = document.getElementById("meter-fill");
const strengthText = document.getElementById("strength-text");
const feedbackList = document.getElementById("feedback");

const predictableTerms = [
  "admin",
  "letmein",
  "password",
  "qwerty",
  "welcome",
];

passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;
  const result = evaluatePassword(password);
  updateUI(result);
});

function evaluatePassword(password) {
  if (!password) {
    return { score: 0, feedback: [] };
  }

  const feedback = [];
  const normalizedLetters = password.toLowerCase().replace(/[^a-z]/g, "");
  const usesPredictableTerm = predictableTerms.some(term => normalizedLetters.includes(term));

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

  if (password.length < 12) {
    feedback.push("Use a longer password or passphrase");
  }

  if (usesPredictableTerm) {
    score = Math.min(score, 1);
    feedback.push("Avoid predictable words and keyboard patterns");
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.min(score, 1);
    feedback.push("Avoid repeated characters");
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
