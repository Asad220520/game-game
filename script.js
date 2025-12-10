// ==========================================
// ⚙️ НАСТРОЙКИ FIREBASE (ЗАМЕНИТЕ НА СВОИ!)
// ==========================================
// ВАЖНО: Ваши настройки должны быть публичными для чтения/записи (см. предыдущий ответ)
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY", // <--- ЗАМЕНИТЕ НА СВОЙ
//   authDomain: "YOUR_DOMAIN.firebaseapp.com", // <--- ЗАМЕНИТЕ НА СВОЙ
//   databaseURL: "YOUR_DATABASE_URL", // <--- ЗАМЕНИТЕ НА СВОЙ
//   projectId: "YOUR_PROJECT_ID", // <--- ЗАМЕНИТЕ НА СВОЙ
//   // Остальные поля не критичны для Realtime DB
// };

const firebaseConfig = {
  apiKey: "AIzaSyAIQ6T04uz9ZzK435d3NSVIKfoFfbgRDow",
  authDomain: "games-563b9.firebaseapp.com",
  databaseURL: "https://games-563b9-default-rtdb.firebaseio.com/", // <--- ЗАМЕНИТЕ НА СВОЙ
  projectId: "games-563b9",
  // storageBucket: "games-563b9.firebasestorage.app",
  // messagingSenderId: "84338898086",
  // appId: "1:84338898086:web:a096e8766d65f7129ef067",
  // measurementId: "G-032GZRR0EJ",
};

// Запасные настройки, если вы не хотите менять код:
// const firebaseConfig = {
//     apiKey: "AIzaSyAIQ6T04uz9ZzK435d3NSVIKfoFfbgRDow",
//     authDomain: "games-563b9.firebaseapp.com",
//     databaseURL: "https://games-563b9-default-rtdb.firebaseio.com",
//     projectId: "games-563b9",
// };

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
  window.playerNum = 0; // 1 (Красные) или 2 (Синие)
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
  winOffset: 45,
  step: 6,
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
  // Новые элементы
  onlineOptions: document.getElementById("online-options"),
  waitingInfo: document.getElementById("waiting-info"),
  displayRoomCode: document.getElementById("display-room-code"),
  waitingMessage: document.getElementById("waiting-message"),
};

// ==========================================
// 🚀 ЛОКАЛЬНАЯ ЛОГИКА (НЕ ИЗМЕНЕНА)
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
    // В онлайн-режиме вопросы генерируются хостом в БД
    if (window.isHost) generateQuestion(1); // Хост всегда команда 1
  } else {
    // Локальный режим: генерируем вопросы для обоих
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

  // [Логика генерации вопросов - Оставлена без изменений]
  // ... (Ваш код generateQuestion)

  if (diff === "hard") {
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
  // [Конец логики генерации вопросов]

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

  // 🔥 ОНЛАЙН: В онлайн-режиме игрок управляет только своей панелью
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

    // 🔥 ОНЛАЙН: Отправляем новое состояние каната и счета в БД
    if (window.isOnline) {
      window.currentRoomRef.update({
        ropePos: gameState.ropePos,
        score1: gameState.team1.score,
        score2: gameState.team2.score,
        lastWinner: teamId, // Полезно для синхронизации
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

    // 1. Ждем игрока 2
    if (roomData.player2) {
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

    // 2. Синхронизация состояния игры (для игрока 2)
    if (!window.isHost && gameState.active) {
      gameState.ropePos = roomData.ropePos || 0;
      gameState.team1.score = roomData.score1 || 0;
      gameState.team2.score = roomData.score2 || 0;

      els.score1.textContent = gameState.team1.score;
      els.score2.textContent = gameState.team2.score;
      updateRope();

      // Синхронизация вопросов
      const qKey = window.playerNum === 1 ? "q1" : "q2";
      if (roomData[qKey]) {
        const qData = roomData[qKey];
        const team = window.playerNum === 1 ? gameState.team1 : gameState.team2;
        const qEl = window.playerNum === 1 ? els.q1 : els.q2;

        team.ans = qData.ans;
        team.buf = "";
        qEl.textContent = qData.text;
        updateScreen(window.playerNum);
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
    })
    .then(() => {
      // Назначаем имя для команды 1
      document.getElementById("name-team-1").value =
        document.getElementById("name-team-1").value || "Хост";
      // Блокируем имя команды 2, пока не присоединится
      document.getElementById("name-team-2").disabled = true;
      enterWaitingRoom(roomId);
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

  roomRef.get().then((snapshot) => {
    if (!snapshot.exists()) {
      return alert("Комната не найдена.");
    }

    const data = snapshot.val();
    if (data.player2 !== null) {
      return alert("Комната уже заполнена.");
    }

    // Обновляем БД и присоединяемся
    roomRef
      .update({
        player2: "Guest_" + Date.now(),
      })
      .then(() => {
        // Назначаем имя для команды 2
        document.getElementById("name-team-2").value =
          document.getElementById("name-team-2").value || "Гость";
        // Блокируем имя команды 1
        document.getElementById("name-team-1").disabled = true;
        enterWaitingRoom(roomId);
      });
  });
};
