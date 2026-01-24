const passwordInput = document.getElementById("password");
const meterFill = document.getElementById("meter-fill");
const strengthText = document.getElementById("strength-text");
const feedbackList = document.getElementById("feedback");

passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;
  const result = evaluatePassword(password);
  updateUI(result);
});

function evaluatePassword(password) {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) score += 1;
  else feedback.push("Use at least 8 characters");

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push("Add symbols");

  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push("Avoid repeated characters");
  }

  score = Math.max(0, Math.min(score, 6));

  return { score, feedback };
}

function updateUI({ score, feedback }) {
  const percentage = (score / 6) * 100;
  meterFill.style.width = percentage + "%";

  let color;
  let label;

  if (score <= 1) {
    color = "#ff4d4d";
    label = "Very Weak";
  } else if (score <= 3) {
    color = "#ffa500";
    label = "Weak";
  } else if (score <= 4) {
    color = "#ffd000";
    label = "Fair";
  } else if (score <= 5) {
    color = "#9be15d";
    label = "Strong";
  } else {
    color = "#00ff88";
    label = "Very Strong";
  }

  meterFill.style.backgroundColor = color;
  strengthText.textContent = label;

  feedbackList.innerHTML = "";
  feedback.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    feedbackList.appendChild(li);
  });
}
