const API_KEY = "37bf7db35a5e05dba6330db62345eb83"; 

// Store all matches (needed for search)
let allMatches = []; 

// Top leagues in order
const TOP_LEAGUES = [
    "England:Premier League",
    "Spain:La Liga",
    "Italy:Serie A",
    "Germany:Bundesliga",
    "France:Ligue 1",
    "World:UEFA Champions League",
    "World:UEFA Europa League",
    "World:UEFA Europa Conference League"
];

function formatMatchTime(apiDate) {
    const d = new Date(apiDate);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Load today's matches
async function loadMatches() {
    const today = new Date().toISOString().split("T")[0];

    const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${today}`,
        { method: "GET", headers: { "x-apisports-key": API_KEY } }
    );

    const data = await res.json();
    allMatches = data.response;

    renderMatchList(allMatches);
}

// Main Function
function renderMatchList(matches) {
    const list = document.getElementById("matches-list");
    list.innerHTML = "";

    let leagues = {};

    for (let m of matches) {
        const key = m.league.country + ":" + m.league.name;
        if (!leagues[key]) leagues[key] = [];
        leagues[key].push(m);
    }

    let ordered = [];

    for (let key of TOP_LEAGUES) {
        if (leagues[key]) ordered.push(key);
    }

    for (let key in leagues) {
        if (!TOP_LEAGUES.includes(key)) ordered.push(key);
    }

    for (let key of ordered) {
        let header = document.createElement("h3");
        header.textContent = key.split(":")[1];
        list.appendChild(header);

        for (let match of leagues[key]) {
            const home = match.teams.home;
            const away = match.teams.away;
            const g = match.goals;
            const status = match.fixture.status.short;

            let scoreDisplay = "";

            if (status === "NS") scoreDisplay = formatMatchTime(match.fixture.date);
            else if (status === "FT")
                scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (FT)`;
            else if (status === "HT")
                scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (HT)`;
            else {
                let min = match.fixture.status.elapsed;
                scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (${min}')`;
            }

            const li = document.createElement("li");
            li.innerHTML = `
                <div class="match-item">
                    <div class="team-side">
                        <img src="${home.logo}" class="team-logo">
                        <span class="team-name">${home.name}</span>
                    </div>
                    <div class="match-score">${scoreDisplay}</div>
                    <div class="team-side">
                        <span class="team-name">${away.name}</span>
                        <img src="${away.logo}" class="team-logo">
                    </div>
                </div>
            `;
            li.onclick = () => loadStats(match);
            list.appendChild(li);
        }
    }
}

// Search function
document.getElementById("search-bar").addEventListener("input", function () {
    const txt = this.value.toLowerCase();

    if (txt.trim() === "") {
        renderMatchList(allMatches);
        return;
    }

    const filtered = allMatches.filter(match => {
        return (
            match.league.name.toLowerCase().includes(txt) ||
            match.teams.home.name.toLowerCase().includes(txt) ||
            match.teams.away.name.toLowerCase().includes(txt)
        );
    });

    renderMatchList(filtered);
});

// Get goal events
async function fetchEvents(id) {
    const res = await fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${id}`,
        { method: "GET", headers: { "x-apisports-key": API_KEY } }
    );
    const data = await res.json();
    return data.response;
}

// Load stats and goals
async function loadStats(match) {
    const summary = document.getElementById("match-summary");

    const home = match.teams.home;
    const away = match.teams.away;
    const g = match.goals;
    const status = match.fixture.status.short;

    let scoreDisplay = "";
    if (status === "NS") scoreDisplay = formatMatchTime(match.fixture.date);
    else if (status === "FT") scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (FT)`;
    else if (status === "HT") scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (HT)`;
    else {
        let min = match.fixture.status.elapsed;
        scoreDisplay = `${g.home ?? "-"} - ${g.away ?? "-"} (${min}')`;
    }

    summary.innerHTML = `
        <div class="match-header">
            <div class="team-block">
                <img src="${home.logo}" class="header-logo">
                <p>${home.name}</p>
            </div>
            <div class="header-score">${scoreDisplay}</div>
            <div class="team-block">
                <img src="${away.logo}" class="header-logo">
                <p>${away.name}</p>
            </div>
        </div>
        
    `;

    let statsRes = await fetch(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.fixture.id}`,
        { method: "GET", headers: { "x-apisports-key": API_KEY } }
    );
    statsRes = await statsRes.json();
    const stats = statsRes.response;

    const events = await fetchEvents(match.fixture.id);

    // If no stats available yet
    if (!stats || stats.length === 0) {
        summary.innerHTML += `<p>No stats available for this match yet.</p>`;
        document.getElementById("stats-table").innerHTML = "";
        return;
    }

    showGoalScorers(events);
    showStats(stats);
}

// Show goal scorers
function showGoalScorers(events) {
    const summary = document.getElementById("match-summary");

    if (!events || events.length === 0) {
        summary.innerHTML += `<p>No goals yet.</p>`;
        return;
    }

    let goals = events.filter(e => e.type === "Goal");

    if (goals.length === 0) {
        summary.innerHTML += `<p>No goals yet.</p>`;
        return;
    }

    summary.innerHTML += `<h3>Goals:</h3>`;

    for (let g of goals) {
        summary.innerHTML += `
            <p>${g.time.elapsed}' – <strong>${g.player.name}</strong> (${g.team.name})</p>
        `;
    }
}

// Show stats when match is clicked
function showStats(stats) {
    const table = document.getElementById("stats-table");
    table.innerHTML = "";

    const homeStats = stats[0].statistics;
    const awayStats = stats[1].statistics;

    for (let i = 0; i < homeStats.length; i++) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${homeStats[i].type}</td>
            <td>${homeStats[i].value ?? "-"}</td>
            <td>${awayStats[i].value ?? "-"}</td>
        `;
        table.appendChild(row);
    }
}

loadMatches();
