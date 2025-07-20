
let day = 1;
let suspects = [];
let vanished = [];
let actionPoints = 5;
let maxActionPoints = 5;

const explorationLocations = [
  { id: "cave", label: "Inspect the Cave", cost: 2 },
  { id: "camp", label: "Search the Campsite", cost: 1 },
  { id: "cliff", label: "Climb the Cliffside", cost: 3 },
  { id: "talk", label: "Eavesdrop on Conversations", cost: 2 },
  { id: "woods", label: "Wander the Woods", cost: 1 }
];

async function fetchCharactersFromGPT() {
  const res = await fetch("/api/gpt-characters", {
    method: "POST"
  });
  const data = await res.json();
  return data.characters;
}

async function generateClueForDay() {
  const killer = suspects.find(s => s.isKiller);
  const res = await fetch("/api/gpt-clue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      killerName: killer.name,
      killerBehavior: killer.behavior,
      day
    })
  });
  const data = await res.json();
  return data.clue || "The air feels heavy with tension.";
}

async function generateAlibis(clueText) {
  const res = await fetch("/api/gpt-alibis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      day,
      clue: clueText,
      suspects
    })
  });

  const data = await res.json();

  // SAFETY: Make sure response is a valid array
  if (!Array.isArray(data.alibis)) {
    console.error("Bad alibi response from server:", data);
    console.warn("Bad alibi data from GPT:", data);
    return [];
  }

  return data.alibis;
}


async function startGame() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("game").style.display = "block";

  const music = document.getElementById("bg-music");
  if (music) music.play();

  suspects = await fetchCharactersFromGPT();
  suspects.forEach(s => s.status = "alive");

  const notepad = document.getElementById("notepad");

// Reset notepad fresh on every new game
notepad.value = "Suspects:\n" + suspects.map(s => `- ${s.name}`).join("\n") + "\n\nNotes:\n";
localStorage.setItem("suspicion-notes", notepad.value);

// Save changes on input
notepad.addEventListener("input", () => {
  localStorage.setItem("suspicion-notes", notepad.value);
});

  day = 1;
  vanished = [];
  maxActionPoints = 5;
  actionPoints = 5;
  document.getElementById("cheat-section").style.display = "block";
  nextDay();
}

function updateActionDisplay() {
  const display = document.getElementById("action-display");
  display.textContent = `Action Points: ${actionPoints} / ${maxActionPoints}`;
}


async function nextDay() {
  const log = document.getElementById("log");
  const judgment = document.getElementById("judgment");
  const choices = document.getElementById("choices");
  const dayDisplay = document.getElementById("day-display");

  log.innerHTML = "";
  judgment.innerHTML = "";
  choices.innerHTML = "";
  dayDisplay.innerHTML = `<h2>Day ${day}</h2>`;

  actionPoints = maxActionPoints;
  updateActionDisplay();

  if (day > 1) {
    const candidates = suspects.filter(s => s.status === "alive" && !s.isKiller);
    const victim = candidates[Math.floor(Math.random() * candidates.length)];
    if (victim) {
      victim.status = "vanished";
      vanished.push(victim.name);
      log.innerHTML += `<p>${victim.name} has vanished overnight...</p>`;
    }
  }

  const clue = await generateClueForDay();
  log.innerHTML += `<p><em>${clue}</em></p><hr>`;

  const alibis = await generateAlibis(clue);
if (alibis.length === 0) {
  log.innerHTML += `<p><em>(No one gave a convincing alibi today...)</em></p>`;
}
alibis.forEach(({ name, alibi }) => {
  log.innerHTML += `<p><strong>${name}</strong>: "${alibi}"</p>`;
});

  explorationLocations.forEach(loc => {
    const btn = document.createElement("button");
    btn.textContent = `${loc.label} (-${loc.cost} AP)`;
    btn.onclick = () => exploreLocation(loc);
    choices.appendChild(btn);
  });

  const accuseBtn = document.createElement("button");
  accuseBtn.textContent = "Accuse the Shadow One";
  accuseBtn.onclick = () => showAccusationOptions();
  choices.appendChild(accuseBtn);

  const passBtn = document.createElement("button");
  passBtn.textContent = "Pass the Day";
  passBtn.onclick = () => {
    day++;
    suspects.forEach(s => delete s.alibi);
    nextDay();
  };
  choices.appendChild(passBtn);
}

async function exploreLocation(location) {
  if (actionPoints < location.cost) {
    alert("Not enough action points.");
    return;
  }

  actionPoints -= location.cost;
  updateActionDisplay();

  const killer = suspects.find(s => s.isKiller);

  const res = await fetch("http://localhost:3000/api/gpt-clue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      killerBehavior: killer.behavior,
      day,
      location: location.label
    })
  });

  const data = await res.json();
  const clue = data.clue || "You don’t find anything useful.";

  const log = document.getElementById("log");
  log.innerHTML += `<p><strong>${location.label}:</strong> ${clue}</p>`;
}

function showAccusationOptions() {
  const visible = suspects.filter(s => s.status === "alive");
  const choices = document.getElementById("choices");
  choices.innerHTML = "<p>Who do you accuse?</p>";

  visible.forEach(s => {
    const btn = document.createElement("button");
    btn.textContent = s.name;
    btn.onclick = () => handleAccusation(s);
    choices.appendChild(btn);
  });
}

function handleAccusation(suspect) {
  const judgment = document.getElementById("judgment");
  const choices = document.getElementById("choices");

  if (suspect.isKiller) {
    judgment.innerHTML = `<p>You accuse ${suspect.name}... and you're right. The Shadow One is defeated. You win!</p>`;
    choices.innerHTML = "";
  } else {
    maxActionPoints = Math.max(0, maxActionPoints - 1);
    actionPoints = Math.min(actionPoints, maxActionPoints);
    updateActionDisplay();

    if (maxActionPoints === 0) {
      judgment.innerHTML = `<p>You accuse ${suspect.name}... but you're wrong. You've lost all your ability to act. The Shadow One wins.</p>`;
      choices.innerHTML = "";
    } else {
      judgment.innerHTML = `<p>${suspect.name} was not the killer. You permanently lose 1 max action point. (${maxActionPoints} remaining)</p>`;
      choices.innerHTML = "";
    }
  }
  window.startGame = startGame;
}
