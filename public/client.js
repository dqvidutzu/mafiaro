const socket = io(window.location.origin);

// Elements
const lobbyDiv = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playersList = document.getElementById("playersList");
const yourWordP = document.getElementById("yourWord");
let currentRoomCode = "";
let currentHostId = "";
document.getElementById("createBtn").onclick = () => {
    const maxPlayers = parseInt(document.getElementById("maxPlayers").value);

    if (isNaN(maxPlayers) || maxPlayers < 2) {
        alert("enter a valid number");
        return;
    }

    console.log("Emitting createRoom event with:", { maxPlayers });
    socket.emit("createRoom", { maxPlayers }); // remove impostorCount
};

document.getElementById("joinBtn").onclick = () => {
    const code = document.getElementById("joinCode").value.trim();
    if (!code) return alert("enter a room code");
    socket.emit("joinRoom", code);
};
document.getElementById("startBtn").onclick = () => {
    if (!currentRoomCode) return;
    socket.emit("startGame", currentRoomCode);
};
socket.on("roomCreated", ({ code, hostId }) => {
    currentRoomCode = code;
    currentHostId = hostId;
    lobbyDiv.style.display = "none";
    gameDiv.style.display = "block";
    roomCodeDisplay.innerText = code;
});
socket.on("updatePlayers", ({ players, hostId }) => {
    currentHostId = hostId;
    playersList.innerHTML = "";
    players.forEach((id, idx) => {
        const li = document.createElement("li");
        li.innerText = `player${idx + 1}`;
        if (socket.id === currentHostId && socket.id !== id) {
            const kickBtn = document.createElement("button");
            kickBtn.innerText = "kick";
            kickBtn.style.marginLeft = "10px";
            kickBtn.onclick = () => {
                socket.emit("kickPlayer", { roomCode: currentRoomCode, playerId: id });
            };
            li.appendChild(kickBtn);
        }

        playersList.appendChild(li);
    });
    const startBtn = document.getElementById("startBtn");
    if (socket.id === currentHostId) {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }
});
socket.on("yourCard", ({ card, role, image }) => {
    roomCodeDisplay.style.display = "none";
    playersList.style.display = "none";
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("tohide").style.display = "none";

    yourWordP.innerHTML = `<img src="cards/${image}" alt="${role}" style="width:200px; height:auto;">`; 
    yourWordP.innerHTML += `<p style="font-size:20px; font-weight:bold;">you're the ${role}</p>`;
    yourWordP.style.animation = "fade 3s ease";
});

socket.on("kicked", () => {
    alert("you got your ass kicked!");
    location.reload();
});
socket.on("error", (msg) => {
    alert(msg);
});

socket.on("waitingForHost", () => {
    lobbyDiv.style.display = "none";
    gameDiv.style.display = "block";
    roomCodeDisplay.innerText = currentRoomCode;
    playersList.innerHTML = "<li>waiting for host...</li>";
    document.getElementById("tohide").style.display = "none";
});
