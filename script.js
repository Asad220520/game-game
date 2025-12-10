// Глобальные настройки
let settings = {
  difficulty: "20", // 20, 50, 100, hard
  team1Name: "Team 1",
  team2Name: "Team 2",
  winOffset: 45,
  step: 6, // % сдвига за ответ
};

let gameState = {
  active: false,
  ropePos: 0,
  team1: { score: 0, ans: 0, buf: "" },
  team2: { score: 0, ans: 0, buf: "" },
};

// DOM Элементы
const screens = {
  setup: document.getElementById("setup-screen"),
  game: document.getElementById("game-screen"),
  modal: document.getElementById("winner-modal"),
};

const els = {
  rope: document.getElementById("rope-container"),
  score1: document.getElementById("score-1"),
  score2: document.getElementById("score-2"),
  label1: document.getElementById("label-1"),
  label2: document.getElementById("label-2"),
  q1: document.getElementById("q-1"),
  q2: document.getElementById("q-2"),
  in1: document.getElementById("input-1"),
  in2: document.getElementById("input-2"),
  wrapper1: document.querySelector(".team-1-panel .monitor-wrapper"),
  wrapper2: document.querySelector(".team-2-panel .monitor-wrapper"),
  winText: document.getElementById("winner-text"),
  sound: document.getElementById("sound-correct"),
};

// Функция старта из меню
function startGame() {
  // Считываем настройки
  const t1 = document.getElementById("name-team-1").value;
  const t2 = document.getElementById("name-team-2").value;
  const diff = document.getElementById("difficulty-select").value;

  settings.team1Name = t1 || "Красные";
  settings.team2Name = t2 || "Синие";
  settings.difficulty = diff;

  // Применяем настройки UI
  els.label1.textContent = settings.team1Name;
  els.label2.textContent = settings.team2Name;

  // Переключаем экраны
  screens.setup.classList.add("hidden");
  screens.game.classList.remove("hidden");

  // Старт логики
  gameState.active = true;
  generateQuestion(1);
  generateQuestion(2);
}

// Рандомайзер
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Генератор вопросов по уровню сложности
function generateQuestion(teamId) {
  let a, b, ans, text;
  const diff = settings.difficulty;

  if (diff === "hard") {
    // Режим Эйнштейн: Умножение и Деление
    if (Math.random() > 0.5) {
      // Умножение (Таблица 2..12)
      a = rand(2, 12);
      b = rand(2, 12);
      ans = a * b;
      text = `${a} × ${b} = ?`;
    } else {
      // Деление (Чтобы делилось нацело)
      b = rand(2, 10); // делитель
      ans = rand(2, 12); // ответ
      a = b * ans; // делимое
      text = `${a} ÷ ${b} = ?`;
    }
  } else {
    // Режимы сложения/вычитания
    let maxVal = parseInt(diff); // 20, 50, 100
    let op = Math.random() > 0.5 ? "+" : "-";

    if (op === "+") {
      a = rand(1, maxVal - 1);
      b = rand(1, maxVal - a);
      ans = a + b;
      text = `${a} + ${b} = ?`;
    } else {
      a = rand(2, maxVal);
      b = rand(1, a - 1); // Чтобы не 0 и не минус
      ans = a - b;
      text = `${a} - ${b} = ?`;
    }
  }

  // Сохраняем состояние
  if (teamId === 1) {
    gameState.team1.ans = ans;
    gameState.team1.buf = "";
    els.q1.textContent = text;
    updateScreen(1);
  } else {
    gameState.team2.ans = ans;
    gameState.team2.buf = "";
    els.q2.textContent = text;
    updateScreen(2);
  }
}

// Обработка ввода
window.pressKey = function (teamId, key) {
  if (!gameState.active) return;
  const team = teamId === 1 ? gameState.team1 : gameState.team2;

  if (key === "C") {
    team.buf = "";
  } else if (key === "OK") {
    checkAnswer(teamId);
    return;
  } else {
    if (team.buf.length < 3) team.buf += key;
  }
  updateScreen(teamId);
};

function updateScreen(teamId) {
  if (teamId === 1) els.in1.textContent = gameState.team1.buf;
  else els.in2.textContent = gameState.team2.buf;
}

function checkAnswer(teamId) {
  const team = teamId === 1 ? gameState.team1 : gameState.team2;
  const wrap = teamId === 1 ? els.wrapper1 : els.wrapper2;
  const val = parseInt(team.buf);

  if (val === team.ans) {
    // Верно
    wrap.classList.add("correct");
    setTimeout(() => wrap.classList.remove("correct"), 300);

    // Звук
    els.sound.currentTime = 0;
    els.sound.play().catch(() => {});

    // Очки и канат
    team.score++;
    if (teamId === 1) {
      els.score1.textContent = team.score;
      gameState.ropePos -= settings.step;
    } else {
      els.score2.textContent = team.score;
      gameState.ropePos += settings.step;
    }

    updateRope();
    generateQuestion(teamId);
  } else {
    // Ошибка
    wrap.classList.add("wrong");
    setTimeout(() => wrap.classList.remove("wrong"), 300);
    if (navigator.vibrate) navigator.vibrate(200);
    team.buf = "";
    updateScreen(teamId);
  }
}

function updateRope() {
  els.rope.style.transform = `translateX(${gameState.ropePos}vw)`;

  if (gameState.ropePos <= -settings.winOffset) win(settings.team1Name);
  else if (gameState.ropePos >= settings.winOffset) win(settings.team2Name);
}

function win(name) {
  gameState.active = false;
  els.winText.textContent = `${name} ПОБЕДИЛИ!`;
  screens.modal.classList.remove("hidden");
}

// Блокировка контекстного меню
document.addEventListener("contextmenu", (e) => e.preventDefault());
