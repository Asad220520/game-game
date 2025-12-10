// ==========================================
// ⚙️ НАСТРОЙКИ FIREBASE
// ==========================================
// Используйте свои настройки. Убедитесь, что в базе данных Realtime DB
// правила безопасности установлены на ".read": true, ".write": true
const firebaseConfig = {
  apiKey: "AIzaSyAIQ6T04uz9ZzK435d3NSVIKfoFfbgRDow",
  authDomain: "games-563b9.firebaseapp.com",
  databaseURL: "https://games-563b9-default-rtdb.firebaseio.com", // <-- ПРАВИЛЬНЫЙ URL (без слэша)
  projectId: "games-563b9",
};

// Инициализация Firebase и DB
if (typeof firebase !== "undefined") {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();

  // Глобальные переменные для онлайн-режима
  window.db = db;
  window.currentRoomRef = null;
  window.isOnline = false;
  window.isHost = false;
  window.playerNum = 0; // 1 (Красные, Хост) или 2 (Синие, Гость)
} else {
  console.error("Firebase SDK не загружен. Онлайн-режим недоступен.");
}

// ==========================================
// 🧩 ГЛОБАЛЬНЫЕ НАСТРОЙКИ / СОСТОЯНИЕ
// ==========================================
let settings = {
  difficulty: "20",
  team1Name: "Красные",
  team2Name: "Синие",
  winOffset: 45, // Процент смещения каната для победы
  step: 6, // Процент сдвига за правильный ответ
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
  // Элементы онлайн-режима
  onlineOptions: document.getElementById("online-options"),
  waitingInfo: document.getElementById("waiting-info"),
  displayRoomCode: document.getElementById("display-room-code"),
  waitingMessage: document.getElementById("waiting-message"),
};

// ==========================================
// 🚀 ОСНОВНАЯ ЛОГИКА ИГРЫ (ЛОКАЛЬНЫЙ РЕЖИМ)
// ==========================================

// Функция старта из меню (localMode: true/false)
function startGame(isOnlineMode) {
  // Считываем настройки
  const t1 = document.getElementById("name-team-1").value;
  const t2 = document.getElementById("name-team-2").value;
  const diff = document.getElementById("difficulty-select").value;

  settings.team1Name = t1 || "Красные";
  settings.team2Name = t2 || "Синие";
  settings.difficulty = diff;
  window.isOnline = isOnlineMode;

  // Применяем настройки UI
  els.label1.textContent = settings.team1Name;
  els.label2.textContent = settings.team2Name;

  // Переключаем экраны
  screens.setup.classList.add("hidden");
  screens.game.classList.remove("hidden");

  // Старт логики
  gameState.active = true;

  if (window.isOnline) {
    // В онлайн-режиме Хост генерирует вопросы для обоих команд
    if (window.isHost) {
      generateQuestion(1);
      generateQuestion(2);
    }
  } else {
    // Локальный режим
    generateQuestion(1);
    generateQuestion(2);
  }
}

// Рандомайзер
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Генератор вопросов по уровню сложности
function generateQuestion(teamId) {
  let a, b, ans, text;
  const diff = settings.difficulty;

  if (diff === "hard") {
    // Умножение/Деление
    if (Math.random() > 0.5) {
      a = rand(2, 12);
      b = rand(2, 12);
      ans = a * b;
      text = `${a} × ${b} = ?`;
    } else {
      b = rand(2, 10);
      ans = rand(2, 12);
      a = b * ans;
      text = `${a} ÷ ${b} = ?`;
    }
  } else {
    // Сложение/Вычитание
    let maxVal = parseInt(diff);
    let op = Math.random() > 0.5 ? "+" : "-";

    if (op === "+") {
      a = rand(1, maxVal - 1);
      b = rand(1, maxVal - a);
      ans = a + b;
      text = `${a} + ${b} = ?`;
    } else {
      a = rand(2, maxVal);
      b = rand(1, a - 1);
      ans = a - b;
      text = `${a} - ${b} = ?`;
    }
  }

  // Сохраняем состояние локально
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

  // 🔥 ОНЛАЙН: Если хост, публикуем вопрос в БД
  if (window.isOnline && window.isHost) {
    if (teamId === 1) {
      window.currentRoomRef.child("q1").set({ text: text, ans: ans });
    } else if (teamId === 2) {
      window.currentRoomRef.child("q2").set({ text: text, ans: ans });
    }
  }
}

// Обработка ввода
window.pressKey = function (teamId, key) {
  if (!gameState.active) return;

  // 🔥 ОНЛАЙН: Игрок управляет только своей панелью
  if (window.isOnline && teamId !== window.playerNum) return;

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

    els.sound.currentTime = 0;
    els.sound.play().catch(() => {});

    team.score++;

    // Очки и канат
    if (teamId === 1) {
      els.score1.textContent = team.score;
      gameState.ropePos -= settings.step;
    } else {
      els.score2.textContent = team.score;
      gameState.ropePos += settings.step;
    }

    updateRope();
    generateQuestion(teamId);

    // 🔥 ОНЛАЙН: Отправляем новое состояние в БД
    if (window.isOnline) {
      window.currentRoomRef.update({
        ropePos: gameState.ropePos,
        score1: gameState.team1.score,
        score2: gameState.team2.score,
        lastWinner: teamId,
      });
    }
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

  // 🔥 ОНЛАЙН: Отключаем слушатель комнаты
  if (window.currentRoomRef) window.currentRoomRef.off();
}

// Блокировка контекстного меню
document.addEventListener("contextmenu", (e) => e.preventDefault());

// ==========================================
// 🌐 ЛОГИКА FIREBASE (ОНЛАЙН-РЕЖИМ)
// ==========================================

function enterWaitingRoom(roomId) {
  els.onlineOptions.classList.add("hidden");
  els.waitingInfo.classList.remove("hidden");
  els.displayRoomCode.textContent = roomId;

  window.currentRoomRef = window.db.ref("rooms/" + roomId);

  // Слушаем изменения в комнате
  window.currentRoomRef.on("value", (snapshot) => {
    const roomData = snapshot.val();
    if (!roomData) return;

    // 🔥 Синхронизация имен команд (обновляем UI сразу)
    if (roomData.team1Name && roomData.team2Name) {
      settings.team1Name = roomData.team1Name;
      settings.team2Name = roomData.team2Name;
      els.label1.textContent = settings.team1Name;
      els.label2.textContent = settings.team2Name;
    }

    // 1. Ждем игрока 2
    if (roomData.player2 && !gameState.active) {
      // Условие !gameState.active предотвращает повторный запуск
      els.waitingMessage.textContent = "Игрок 2 присоединился! НАЧИНАЕМ!";

      // Запускаем игру, когда оба готовы
      setTimeout(() => {
        startGame(true);
      }, 1000);
    } else {
      els.waitingMessage.textContent = window.isHost
        ? "Ожидание второго игрока. Поделитесь кодом: " + roomId
        : "Ожидание хоста...";
    }

    // 2. Синхронизация состояния игры (для Гостя - Player 2)
    if (window.isOnline && !window.isHost && gameState.active) {
      // Обновление счета и каната
      gameState.ropePos = roomData.ropePos || 0;
      gameState.team1.score = roomData.score1 || 0;
      gameState.team2.score = roomData.score2 || 0;

      els.score1.textContent = gameState.team1.score;
      els.score2.textContent = gameState.team2.score;
      updateRope();

      // Синхронизация вопросов

      // Обновление вопроса для Команды 1 (Хоста)
      if (roomData.q1) {
        gameState.team1.ans = roomData.q1.ans;
        els.q1.textContent = roomData.q1.text;
      }

      // Обновление вопроса для Команды 2 (Гостя)
      if (roomData.q2) {
        gameState.team2.ans = roomData.q2.ans;
        els.q2.textContent = roomData.q2.text;
      }

      // Обнуляем буферы ввода Гостя, чтобы он видел только свое
      if (window.playerNum === 2) {
        gameState.team2.buf = "";
        updateScreen(2);
      }
    }
  });
}

// Создание комнаты
window.createOnlineRoom = function () {
  if (!window.db)
    return alert("Онлайн-режим недоступен (Firebase не загружен).");

  const roomId = Math.floor(1000 + Math.random() * 9000).toString();
  window.isHost = true;
  window.playerNum = 1;

  // Получаем имя команды 1 до записи в БД
  const t1Name = document.getElementById("name-team-1").value || "Хост";

  // Создаем комнату в БД
  window.db
    .ref("rooms/" + roomId)
    .set({
      status: "waiting",
      player1: "Host_" + Date.now(),
      player2: null,
      difficulty: document.getElementById("difficulty-select").value,
      ropePos: 0,
      score1: 0,
      score2: 0,
      team1Name: t1Name,
      team2Name: document.getElementById("name-team-2").value || "Синие",
    })
    .then(() => {
      // Обновляем UI локально
      document.getElementById("name-team-1").value = t1Name;
      document.getElementById("name-team-2").disabled = true;
      enterWaitingRoom(roomId);

      // Автоматическое удаление комнаты при закрытии
      if (window.isHost) {
        window.currentRoomRef.onDisconnect().remove();
      }
    });
};

// Присоединение к комнате
window.joinOnlineRoom = function () {
  if (!window.db)
    return alert("Онлайн-режим недоступен (Firebase не загружен).");

  const roomId = document.getElementById("room-code-input").value;
  if (roomId.length !== 4) return alert("Введите 4-значный код комнаты.");

  window.isHost = false;
  window.playerNum = 2; // Игрок 2 всегда синие

  const roomRef = window.db.ref("rooms/" + roomId);
  const t2Name = document.getElementById("name-team-2").value || "Гость";

  // Используем once('value') для гарантированного получения свежих данных (защита от кеша)
  roomRef.once("value").then((snapshot) => {
    if (!snapshot.exists()) {
      return alert("Комната не найдена.");
    }

    const data = snapshot.val();

    // 🔥 НАДЕЖНАЯ ПРОВЕРКА: Если player2 имеет ЛЮБОЕ значение (не null/undefined/false), он занят
    if (data.player2) {
      return alert("Комната уже заполнена.");
    }

    // Обновляем БД и присоединяемся
    roomRef
      .update({
        player2: "Guest_" + Date.now(),
        team2Name: t2Name, // Гость обновляет имя своей команды
      })
      .then(() => {
        // Обновляем UI локально
        document.getElementById("name-team-2").value = t2Name;
        document.getElementById("name-team-1").disabled = true;
        enterWaitingRoom(roomId);
      });
  });
};
