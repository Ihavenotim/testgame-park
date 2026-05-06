(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    money: document.getElementById("money"),
    guests: document.getElementById("guests"),
    happiness: document.getElementById("happiness"),
    cleanliness: document.getElementById("cleanliness"),
    selectedName: document.getElementById("selected-name"),
    selectedDetails: document.getElementById("selected-details"),
    appealValue: document.getElementById("appeal-value"),
    appealMeter: document.getElementById("appeal-meter"),
    queueValue: document.getElementById("queue-value"),
    queueMeter: document.getElementById("queue-meter"),
    statusValue: document.getElementById("status-value"),
    statusMeter: document.getElementById("status-meter"),
    log: document.getElementById("log"),
    pause: document.getElementById("pause"),
    reset: document.getElementById("reset"),
    season: document.getElementById("season-label"),
    rating: document.getElementById("rating"),
    saveToggle: document.getElementById("save-toggle"),
    savePanel: document.getElementById("save-panel"),
    saveClose: document.getElementById("save-close"),
    saveSlots: document.getElementById("save-slots"),
    ticketPrice: document.getElementById("ticket-price"),
    ticketDown: document.getElementById("ticket-down"),
    ticketUp: document.getElementById("ticket-up"),
    hireCleaner: document.getElementById("hire-cleaner"),
    hireMechanic: document.getElementById("hire-mechanic"),
    launchAd: document.getElementById("launch-ad"),
    claimGoal: document.getElementById("claim-goal"),
    cleanersCount: document.getElementById("cleaners-count"),
    mechanicsCount: document.getElementById("mechanics-count"),
    marketingTime: document.getElementById("marketing-time"),
    goalReward: document.getElementById("goal-reward"),
    goalText: document.getElementById("goal-text")
  };

  const TILE_W = 72;
  const TILE_H = 36;
  const MAP_W = 26;
  const MAP_H = 26;
  const MAX_GUESTS = 72;
  const entrance = { x: 0, y: 13 };
  const SAVE_PREFIX = "isopark-save-v2-";
  const AUTO_SAVE_KEY = `${SAVE_PREFIX}auto`;
  const GOALS = [
    { text: "服务 35 名游客", reward: 160, check: (s) => totalServed(s) >= 35 },
    { text: "拥有 5 个营业设施", reward: 210, check: (s) => attractionCount(s) >= 5 },
    { text: "把星级提升到 3.2", reward: 260, check: (s) => s.rating >= 3.2 },
    { text: "清洁度保持在 82% 以上并拥有 45 名游客", reward: 320, check: (s) => s.cleanliness >= 82 && s.guests.length >= 45 },
    { text: "资金达到 $1800", reward: 400, check: (s) => s.money >= 1800 }
  ];

  const catalog = {
    road: { name: "糖砖步道", cost: 10, kind: "path", appeal: 1 },
    carousel: { name: "梦彩旋转木马", cost: 140, kind: "ride", appeal: 19, capacity: 5, duration: 7, income: 12 },
    wheel: { name: "观景摩天轮", cost: 220, kind: "ride", appeal: 30, capacity: 8, duration: 10, income: 18 },
    coaster: { name: "云弧过山车", cost: 260, kind: "ride", appeal: 36, capacity: 6, duration: 8, income: 22 },
    teacups: { name: "糖霜茶杯", cost: 120, kind: "ride", appeal: 15, capacity: 4, duration: 6, income: 10 },
    snack: { name: "星星小吃摊", cost: 80, kind: "shop", appeal: 9, capacity: 3, duration: 4, income: 8 },
    tree: { name: "泡泡树", cost: 18, kind: "scenery", appeal: 4 },
    garden: { name: "彩屑花园", cost: 28, kind: "scenery", appeal: 7 },
    water: { name: "蓝璃水体", cost: 22, kind: "water", appeal: 3 },
    fountain: { name: "银铃喷泉", cost: 65, kind: "scenery", appeal: 12 },
    clean: { name: "清洁", cost: 4 },
    remove: { name: "拆除", cost: 0 }
  };

  const state = {
    tiles: [],
    guests: [],
    particles: [],
    money: 640,
    cleanliness: 96,
    happiness: 74,
    appeal: 0,
    rating: 1,
    ticketPrice: 6,
    cleaners: 0,
    mechanics: 0,
    marketing: 0,
    goalIndex: 0,
    goalsClaimed: 0,
    operatingCostClock: 0,
    autosaveClock: 0,
    dayTime: 0,
    speed: 1,
    paused: false,
    selectedTool: "road",
    hover: null,
    selectedTile: entrance,
    camera: { x: 0, y: 0, zoom: 1 },
    dragging: false,
    dragStart: null,
    dragMoved: false,
    keys: new Set(),
    log: ["公园开门了。先把路连到景点，游客就会自己出发。"]
  };

  function makeTile(x, y) {
    return {
      x,
      y,
      terrain: Math.random() > 0.87 ? "flower" : "grass",
      object: null,
      road: false,
      litter: 0,
      wear: 100,
      queue: [],
      riders: [],
      pulse: Math.random() * Math.PI * 2
    };
  }

  function resetGame() {
    state.tiles = [];
    state.guests = [];
    state.particles = [];
    state.money = 640;
    state.cleanliness = 96;
    state.happiness = 74;
    state.rating = 1;
    state.ticketPrice = 6;
    state.cleaners = 0;
    state.mechanics = 0;
    state.marketing = 0;
    state.goalIndex = 0;
    state.goalsClaimed = 0;
    state.operatingCostClock = 0;
    state.autosaveClock = 0;
    state.dayTime = 0;
    state.paused = false;
    state.camera.x = canvas.width / 2 - 88;
    state.camera.y = 110;
    state.camera.zoom = Math.min(1.05, Math.max(0.72, canvas.width / 1180));
    state.log = ["新的公园地块准备好了。"];
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) state.tiles.push(makeTile(x, y));
    }

    setRoad(0, 13);
    for (let x = 1; x <= 6; x += 1) setRoad(x, 13);
    for (let y = 10; y <= 16; y += 1) setRoad(6, y);
    placeObject(8, 10, "carousel", true);
    placeObject(8, 16, "snack", true);
    placeObject(4, 10, "tree", true);
    placeObject(5, 16, "garden", true);
    placeObject(10, 13, "fountain", true);
    for (let i = 0; i < 10; i += 1) spawnGuest();
    selectTile(entrance.x, entrance.y);
    log("游客开始从入口进园。");
    refreshSavePanel();
  }

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return null;
    return state.tiles[y * MAP_W + x];
  }

  function totalServed(source = state) {
    return source.tiles.reduce((sum, tile) => sum + (tile.object ? tile.object.served || 0 : 0), 0);
  }

  function attractionCount(source = state) {
    return source.tiles.filter((tile) => tile.object && ["ride", "shop"].includes(catalog[tile.object.type].kind)).length;
  }

  function setRoad(x, y) {
    const tile = tileAt(x, y);
    if (!tile) return;
    tile.road = true;
    tile.object = null;
  }

  function placeObject(x, y, type, free = false) {
    const tile = tileAt(x, y);
    const item = catalog[type];
    if (!tile || !item || tile.road || tile.object) return false;
    if (!free && state.money < item.cost) {
      log("资金不够，先让现有设施赚一会儿。");
      return false;
    }
    if (!free) state.money -= item.cost;
    tile.object = {
      type,
      name: item.name,
      status: 100,
      appeal: item.appeal,
      capacity: item.capacity || 0,
      duration: item.duration || 0,
      income: item.income || 0,
      timer: 0,
      riders: [],
      served: 0
    };
    return true;
  }

  function log(message) {
    state.log.unshift(message);
    state.log = state.log.slice(0, 5);
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    state.camera.x = window.innerWidth / 2 - 120;
    state.camera.y = Math.max(102, window.innerHeight * 0.18);
  }

  function isoToScreen(x, y, z = 0) {
    return {
      x: (x - y) * TILE_W * 0.5,
      y: (x + y) * TILE_H * 0.5 - z
    };
  }

  function screenToIso(px, py) {
    const x = (px - state.camera.x) / state.camera.zoom;
    const y = (py - state.camera.y) / state.camera.zoom;
    return {
      x: Math.floor(y / TILE_H + x / TILE_W),
      y: Math.floor(y / TILE_H - x / TILE_W)
    };
  }

  function drawDiamond(g, x, y, fill, stroke) {
    g.beginPath();
    g.moveTo(x, y - TILE_H / 2);
    g.lineTo(x + TILE_W / 2, y);
    g.lineTo(x, y + TILE_H / 2);
    g.lineTo(x - TILE_W / 2, y);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1;
      g.stroke();
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawTile(g, tile) {
    const p = isoToScreen(tile.x, tile.y);
    const grass = tile.terrain === "flower" ? "#94cf78" : "#8bcf7d";
    drawDiamond(g, p.x, p.y, grass, "rgba(45,90,74,.18)");
    g.fillStyle = "rgba(255,255,255,.12)";
    g.beginPath();
    g.moveTo(p.x, p.y - 14);
    g.lineTo(p.x + 36, p.y);
    g.lineTo(p.x, p.y + 18);
    g.closePath();
    g.fill();

    if (tile.terrain === "flower") {
      for (let i = 0; i < 3; i += 1) {
        const ox = ((tile.x * 17 + tile.y * 11 + i * 21) % 34) - 17;
        const oy = ((tile.x * 9 + tile.y * 19 + i * 13) % 15) - 7;
        g.fillStyle = i % 2 ? "#ffd45d" : "#f17c91";
        g.fillRect(p.x + ox, p.y + oy, 3, 2);
      }
    }

    if (tile.road) drawRoad(g, tile, p);
    if (tile.object) drawObject(g, tile, p);
    if (tile.litter > 0) drawLitter(g, p, tile.litter);

    if (state.hover && state.hover.x === tile.x && state.hover.y === tile.y) {
      drawDiamond(g, p.x, p.y, "rgba(255, 241, 139, .28)", "#fff6a6");
    }
  }

  function drawRoad(g, tile, p) {
    drawDiamond(g, p.x, p.y, "#e9be7a", "rgba(99,80,45,.2)");
    drawDiamond(g, p.x, p.y - 1, "#f5d594", null);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    g.strokeStyle = "rgba(143,101,55,.36)";
    g.lineWidth = 5;
    g.lineCap = "round";
    for (const [dx, dy] of dirs) {
      const n = tileAt(tile.x + dx, tile.y + dy);
      if (n && n.road) {
        const np = isoToScreen(tile.x + dx, tile.y + dy);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo((p.x + np.x) / 2, (p.y + np.y) / 2);
        g.stroke();
      }
    }
  }

  function drawObject(g, tile, p) {
    const obj = tile.object;
    if (obj.type === "tree") drawTree(g, p, tile.pulse);
    if (obj.type === "garden") drawGarden(g, p, tile.pulse);
    if (obj.type === "water") drawWater(g, p, tile.pulse);
    if (obj.type === "fountain") drawFountain(g, p, tile.pulse);
    if (obj.type === "carousel") drawCarousel(g, p, state.dayTime + tile.pulse);
    if (obj.type === "wheel") drawWheel(g, p, state.dayTime * 0.7 + tile.pulse);
    if (obj.type === "coaster") drawCoaster(g, p, state.dayTime + tile.pulse);
    if (obj.type === "teacups") drawTeacups(g, p, state.dayTime + tile.pulse);
    if (obj.type === "snack") drawSnack(g, p, tile.pulse);
  }

  function drawBase(g, p, color) {
    drawDiamond(g, p.x, p.y, shade(color, 28), "rgba(36,50,55,.28)");
    g.fillStyle = shade(color, -18);
    g.beginPath();
    g.moveTo(p.x - 36, p.y);
    g.lineTo(p.x, p.y + 18);
    g.lineTo(p.x, p.y + 26);
    g.lineTo(p.x - 36, p.y + 8);
    g.closePath();
    g.fill();
    g.fillStyle = shade(color, -38);
    g.beginPath();
    g.moveTo(p.x + 36, p.y);
    g.lineTo(p.x, p.y + 18);
    g.lineTo(p.x, p.y + 26);
    g.lineTo(p.x + 36, p.y + 8);
    g.closePath();
    g.fill();
  }

  function drawTree(g, p, pulse) {
    drawBase(g, p, "#80c266");
    g.fillStyle = "#9b7244";
    g.fillRect(p.x - 4, p.y - 31, 8, 32);
    const colors = ["#47a965", "#63c779", "#2e8d67"];
    for (let i = 0; i < 4; i += 1) {
      g.fillStyle = colors[i % colors.length];
      g.beginPath();
      g.ellipse(p.x + Math.sin(pulse + i) * 9, p.y - 40 - i * 6, 18 - i * 2, 12, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawGarden(g, p) {
    drawBase(g, p, "#79c982");
    const petals = ["#f17c91", "#ffd45d", "#8bd6dd", "#eaa2df"];
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const r = 8 + (i % 4) * 4;
      g.fillStyle = petals[i % petals.length];
      g.beginPath();
      g.arc(p.x + Math.cos(a) * r, p.y - 15 + Math.sin(a) * r * 0.55, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#fff7be";
    g.beginPath();
    g.arc(p.x, p.y - 18, 6, 0, Math.PI * 2);
    g.fill();
  }

  function drawWater(g, p, pulse) {
    drawDiamond(g, p.x, p.y, "#57b8ce", "#357f95");
    g.strokeStyle = "rgba(255,255,255,.58)";
    g.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      g.beginPath();
      g.ellipse(p.x + Math.sin(pulse + i) * 10, p.y - 2 + i * 5, 18, 4, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }

  function drawFountain(g, p, pulse) {
    drawWater(g, p, pulse);
    g.fillStyle = "#e9f6f3";
    g.beginPath();
    g.ellipse(p.x, p.y - 11, 17, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#7abfcb";
    g.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      g.beginPath();
      g.moveTo(p.x, p.y - 16);
      g.quadraticCurveTo(p.x + i * 13, p.y - 36 - Math.sin(pulse) * 5, p.x + i * 18, p.y - 18);
      g.stroke();
    }
  }

  function drawCarousel(g, p, t) {
    drawBase(g, p, "#f2ad57");
    g.fillStyle = "#fff6bc";
    g.beginPath();
    g.ellipse(p.x, p.y - 38, 31, 14, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e55e74";
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + t * 0.25;
      g.beginPath();
      g.moveTo(p.x, p.y - 65);
      g.lineTo(p.x + Math.cos(a) * 31, p.y - 38 + Math.sin(a) * 8);
      g.lineTo(p.x + Math.cos(a + 0.38) * 31, p.y - 38 + Math.sin(a + 0.38) * 8);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(p.x, p.y - 77);
    g.lineTo(p.x + 34, p.y - 44);
    g.lineTo(p.x - 34, p.y - 44);
    g.closePath();
    g.fill();
    g.fillStyle = "#50a7c7";
    g.fillRect(p.x - 3, p.y - 66, 6, 48);
    for (let i = 0; i < 4; i += 1) {
      const a = t * 0.7 + i * Math.PI * 0.5;
      g.fillStyle = i % 2 ? "#7fc8ff" : "#f17c91";
      g.beginPath();
      g.ellipse(p.x + Math.cos(a) * 19, p.y - 25 + Math.sin(a) * 7, 7, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawWheel(g, p, t) {
    drawBase(g, p, "#8bd6dd");
    g.strokeStyle = "#31576b";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(p.x - 24, p.y);
    g.lineTo(p.x, p.y - 62);
    g.lineTo(p.x + 24, p.y);
    g.stroke();
    g.strokeStyle = "#effbff";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(p.x, p.y - 58, 35, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const a = t * 0.2 + i * Math.PI * 0.2;
      g.strokeStyle = i % 2 ? "#e55e74" : "#e7a83d";
      g.beginPath();
      g.moveTo(p.x, p.y - 58);
      g.lineTo(p.x + Math.cos(a) * 34, p.y - 58 + Math.sin(a) * 34);
      g.stroke();
      g.fillStyle = "#fff3c6";
      g.fillRect(p.x + Math.cos(a) * 34 - 4, p.y - 58 + Math.sin(a) * 34 - 3, 8, 7);
    }
  }

  function drawCoaster(g, p, t) {
    drawBase(g, p, "#83c273");
    g.strokeStyle = "#e55e74";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(p.x - 31, p.y - 9);
    g.bezierCurveTo(p.x - 17, p.y - 70, p.x + 18, p.y - 70, p.x + 32, p.y - 9);
    g.stroke();
    g.strokeStyle = "#ffe3a0";
    g.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      g.beginPath();
      g.moveTo(p.x + i * 13, p.y - 6);
      g.lineTo(p.x + i * 8, p.y - 46);
      g.stroke();
    }
    const carT = (Math.sin(t * 0.8) + 1) / 2;
    const cx = p.x - 22 + carT * 44;
    const cy = p.y - 17 - Math.sin(carT * Math.PI) * 44;
    g.fillStyle = "#50a7c7";
    g.fillRect(cx - 9, cy - 5, 18, 10);
    g.fillStyle = "#fff6bc";
    g.fillRect(cx - 5, cy - 9, 10, 5);
  }

  function drawTeacups(g, p, t) {
    drawBase(g, p, "#c69be2");
    for (let i = 0; i < 4; i += 1) {
      const a = t * 0.55 + i * Math.PI * 0.5;
      const x = p.x + Math.cos(a) * 19;
      const y = p.y - 19 + Math.sin(a) * 9;
      g.fillStyle = i % 2 ? "#fff7be" : "#8bd6dd";
      g.beginPath();
      g.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#6d4d86";
      g.stroke();
    }
    g.fillStyle = "#f17c91";
    g.beginPath();
    g.arc(p.x, p.y - 27, 8, 0, Math.PI * 2);
    g.fill();
  }

  function drawSnack(g, p) {
    drawBase(g, p, "#f4c167");
    g.fillStyle = "#fef3c1";
    g.fillRect(p.x - 24, p.y - 44, 48, 34);
    g.fillStyle = "#de5d68";
    for (let i = 0; i < 4; i += 1) g.fillRect(p.x - 24 + i * 12, p.y - 44, 7, 34);
    g.fillStyle = "#455a64";
    g.fillRect(p.x - 18, p.y - 26, 36, 16);
    g.fillStyle = "#fff6bc";
    g.beginPath();
    g.moveTo(p.x - 31, p.y - 44);
    g.lineTo(p.x + 31, p.y - 44);
    g.lineTo(p.x + 20, p.y - 59);
    g.lineTo(p.x - 20, p.y - 59);
    g.closePath();
    g.fill();
  }

  function drawLitter(g, p, amount) {
    for (let i = 0; i < Math.min(4, Math.ceil(amount)); i += 1) {
      g.fillStyle = i % 2 ? "#fff6bc" : "#e55e74";
      g.fillRect(p.x - 16 + i * 9, p.y + 4 + (i % 2) * 4, 5, 3);
    }
  }

  function findNearestRoad(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const tile of state.tiles) {
      if (!tile.road) continue;
      const d = Math.abs(tile.x - x) + Math.abs(tile.y - y);
      if (d < bestD) {
        best = tile;
        bestD = d;
      }
    }
    return best;
  }

  function neighbors(tile) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => tileAt(tile.x + dx, tile.y + dy))
      .filter(Boolean);
  }

  function findPath(start, goal) {
    const startTile = tileAt(start.x, start.y);
    const goalTile = tileAt(goal.x, goal.y);
    if (!startTile || !goalTile || !startTile.road || !goalTile.road) return [];
    const key = (t) => `${t.x},${t.y}`;
    const queue = [startTile];
    const came = new Map([[key(startTile), null]]);
    while (queue.length) {
      const current = queue.shift();
      if (current === goalTile) break;
      for (const n of neighbors(current)) {
        if (!n.road || came.has(key(n))) continue;
        came.set(key(n), current);
        queue.push(n);
      }
    }
    if (!came.has(key(goalTile))) return [];
    const path = [];
    let cur = goalTile;
    while (cur) {
      path.unshift({ x: cur.x, y: cur.y });
      cur = came.get(key(cur));
    }
    return path;
  }

  function availableDestinations() {
    return state.tiles.filter((tile) => tile.object && ["ride", "shop"].includes(catalog[tile.object.type].kind))
      .map((tile) => {
        const road = neighbors(tile).find((n) => n.road);
        return road ? { attraction: tile, road } : null;
      })
      .filter(Boolean);
  }

  function chooseDestination(guest) {
    const options = availableDestinations();
    if (!options.length) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const option of options) {
      const obj = option.attraction.object;
      const score = obj.appeal * 1.6 - option.attraction.queue.length * 5 + Math.random() * 22 - Math.abs(option.road.x - guest.x) * 0.25;
      if (score > bestScore) {
        best = option;
        bestScore = score;
      }
    }
    return best;
  }

  function spawnGuest() {
    if (state.guests.length >= MAX_GUESTS) return;
    const mood = 62 + Math.random() * 32 - Math.max(0, state.ticketPrice - 8) * 2.4;
    state.money += state.ticketPrice;
    state.guests.push({
      x: entrance.x,
      y: entrance.y,
      px: entrance.x,
      py: entrance.y,
      path: [],
      pathIndex: 0,
      speed: 1.55 + Math.random() * 0.8,
      mood,
      spent: 0,
      target: null,
      state: "arriving",
      wait: 0,
      color: ["#e55e74", "#50a7c7", "#e7a83d", "#8368c8", "#42b98f"][Math.floor(Math.random() * 5)]
    });
  }

  function directGuest(guest) {
    const dest = chooseDestination(guest);
    if (!dest) {
      guest.path = findPath({ x: guest.x, y: guest.y }, entrance);
      guest.pathIndex = 0;
      guest.state = "wandering";
      return;
    }
    const path = findPath({ x: guest.x, y: guest.y }, dest.road);
    if (!path.length) {
      guest.mood -= 7;
      guest.state = "confused";
      return;
    }
    guest.target = dest.attraction;
    guest.path = path;
    guest.pathIndex = 0;
    guest.state = "walking";
  }

  function updateGuests(dt) {
    const priceDrag = Math.max(0.32, 1.18 - state.ticketPrice * 0.065);
    const campaignBoost = state.marketing > 0 ? 1.75 : 1;
    if (Math.random() < dt * 0.34 * (1 + state.appeal / 150) * priceDrag * campaignBoost * (0.55 + state.rating / 4.5)) spawnGuest();

    for (const guest of state.guests) {
      if (!guest.path.length && ["arriving", "wandering", "confused"].includes(guest.state)) directGuest(guest);
      if (guest.state === "walking" || guest.state === "wandering") {
        const next = guest.path[guest.pathIndex + 1];
        if (!next) {
          if (guest.target && guest.target.object) {
            guest.state = "queued";
            guest.wait = 0;
            if (!guest.target.queue.includes(guest)) guest.target.queue.push(guest);
          } else {
            directGuest(guest);
          }
          continue;
        }
        const dx = next.x - guest.px;
        const dy = next.y - guest.py;
        const dist = Math.hypot(dx, dy);
        const step = guest.speed * dt;
        if (dist <= step) {
          guest.px = next.x;
          guest.py = next.y;
          guest.x = next.x;
          guest.y = next.y;
          guest.pathIndex += 1;
          const tile = tileAt(guest.x, guest.y);
          if (tile && Math.random() < 0.003) tile.litter += 1;
        } else {
          guest.px += (dx / dist) * step;
          guest.py += (dy / dist) * step;
        }
      } else if (guest.state === "queued") {
        guest.wait += dt;
        guest.mood -= dt * 0.22;
      } else if (guest.state === "riding") {
        guest.mood += dt * 1.5;
      } else if (guest.state === "confused") {
        guest.wait += dt;
        if (guest.wait > 3) directGuest(guest);
      }
      guest.mood = Math.max(8, Math.min(100, guest.mood));
    }
  }

  function updateAttractions(dt) {
    for (const tile of state.tiles) {
      if (!tile.object) continue;
      const item = catalog[tile.object.type];
      const obj = tile.object;
      obj.status = Math.max(32, obj.status - dt * 0.035 * (obj.riders.length + tile.queue.length * 0.4));
      if (!obj.capacity) continue;

      obj.timer -= dt;
      if (obj.timer <= 0 && obj.riders.length) {
        for (const guest of obj.riders) {
          guest.state = "wandering";
          guest.target = null;
          guest.path = [];
          guest.pathIndex = 0;
          guest.mood += (item.kind === "shop" ? 5 : 13) * (obj.status < 45 ? 0.55 : 1);
          guest.spent += obj.income;
          state.money += obj.income;
          tile.litter += Math.random() < 0.18 ? 1 : 0;
        }
        obj.served += obj.riders.length;
        obj.riders = [];
      }

      if (!obj.riders.length && tile.queue.length) {
        const count = Math.min(obj.capacity, tile.queue.length);
        obj.riders = tile.queue.splice(0, count);
        for (const guest of obj.riders) guest.state = "riding";
        obj.timer = obj.duration * (1.1 - obj.status / 500) * (obj.status < 45 ? 1.45 : 1);
      }
    }
  }

  function updateSystems(dt) {
    const litter = state.tiles.reduce((sum, tile) => sum + tile.litter, 0);
    state.appeal = Math.min(100, state.tiles.reduce((sum, tile) => sum + (tile.object ? tile.object.appeal : 0) + (tile.road ? 0.2 : 0), 0));
    state.cleanliness = Math.max(0, Math.min(100, 100 - litter * 4));
    const queues = state.tiles.reduce((sum, tile) => sum + tile.queue.length, 0);
    const guestMood = state.guests.length ? state.guests.reduce((sum, g) => sum + g.mood, 0) / state.guests.length : 74;
    state.happiness = Math.max(0, Math.min(100, guestMood * 0.72 + state.cleanliness * 0.22 + state.appeal * 0.12 - queues * 0.7));
    const objectTiles = state.tiles.filter((tile) => tile.object);
    const maintenance = objectTiles.reduce((sum, tile) => sum + tile.object.status, 0) / Math.max(1, objectTiles.length);
    state.rating = Math.max(1, Math.min(5, 0.8 + state.appeal / 70 + state.happiness / 100 + state.cleanliness / 125 + maintenance / 150 - queues / 28));
    state.marketing = Math.max(0, state.marketing - dt);
    state.operatingCostClock += dt;
    state.autosaveClock += dt;

    if (state.cleaners > 0) {
      const dirty = state.tiles.filter((tile) => tile.litter > 0).sort((a, b) => b.litter - a.litter).slice(0, state.cleaners);
      for (const tile of dirty) tile.litter = Math.max(0, tile.litter - dt * 0.42);
    }

    if (state.mechanics > 0) {
      const worn = state.tiles.filter((tile) => tile.object && tile.object.status < 96).sort((a, b) => a.object.status - b.object.status).slice(0, state.mechanics);
      for (const tile of worn) tile.object.status = Math.min(100, tile.object.status + dt * 0.62);
    }

    if (state.operatingCostClock >= 10) {
      state.operatingCostClock = 0;
      const payroll = state.cleaners * 12 + state.mechanics * 16;
      if (payroll > 0) {
        state.money -= payroll;
        log(`支付员工薪资 $${payroll}。`);
      }
    }

    if (state.autosaveClock >= 45) {
      state.autosaveClock = 0;
      saveGame("auto", true);
    }
    state.dayTime += dt;

    if (state.keys.has("KeyA")) state.camera.x += 340 * dt;
    if (state.keys.has("KeyD")) state.camera.x -= 340 * dt;
    if (state.keys.has("KeyW")) state.camera.y += 340 * dt;
    if (state.keys.has("KeyS")) state.camera.y -= 340 * dt;
  }

  function drawGuests(g) {
    for (const guest of state.guests) {
      if (guest.state === "queued" && guest.target) continue;
      const p = isoToScreen(guest.px, guest.py, 15 + Math.sin(state.dayTime * 5 + guest.px) * 2);
      g.fillStyle = "rgba(42,52,50,.18)";
      g.beginPath();
      g.ellipse(p.x, p.y + 10, 7, 3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = guest.color;
      g.beginPath();
      g.arc(p.x, p.y, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff3c6";
      g.beginPath();
      g.arc(p.x, p.y - 6, 4, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawWorld() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const sky = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    sky.addColorStop(0, "#bde7d8");
    sky.addColorStop(0.52, "#9fd3bd");
    sky.addColorStop(1, "#7fc5ad");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);

    for (let s = 0; s < MAP_W + MAP_H - 1; s += 1) {
      for (let y = 0; y < MAP_H; y += 1) {
        const x = s - y;
        const tile = tileAt(x, y);
        if (tile) drawTile(ctx, tile);
      }
    }
    drawGuests(ctx);
    drawEntrance(ctx);
    ctx.restore();
  }

  function drawEntrance(g) {
    const p = isoToScreen(entrance.x, entrance.y, 0);
    g.save();
    g.translate(p.x - 34, p.y - 76);
    g.fillStyle = "#263e45";
    g.fillRect(0, 26, 7, 46);
    g.fillRect(62, 26, 7, 46);
    g.fillStyle = "#fff6bc";
    g.beginPath();
    g.moveTo(0, 30);
    g.quadraticCurveTo(34, -8, 69, 30);
    g.lineTo(60, 36);
    g.quadraticCurveTo(34, 10, 9, 36);
    g.closePath();
    g.fill();
    g.fillStyle = "#e55e74";
    g.fillRect(15, 28, 40, 12);
    g.restore();
  }

  function updateUi() {
    ui.money.textContent = `$${Math.floor(state.money)}`;
    ui.guests.textContent = String(state.guests.length);
    ui.happiness.textContent = `${Math.round(state.happiness)}%`;
    ui.cleanliness.textContent = `${Math.round(state.cleanliness)}%`;
    ui.rating.textContent = state.rating.toFixed(1);
    ui.appealValue.textContent = Math.round(state.appeal);
    ui.appealMeter.value = state.appeal;
    const selected = state.selectedTile ? tileAt(state.selectedTile.x, state.selectedTile.y) : null;
    const queue = selected ? selected.queue.length : 0;
    const status = selected && selected.object ? selected.object.status : selected && selected.road ? selected.wear : 100;
    ui.queueValue.textContent = queue;
    ui.queueMeter.value = queue;
    ui.statusValue.textContent = `${Math.round(status)}%`;
    ui.statusMeter.value = status;
    ui.log.innerHTML = state.log.map((item) => `<div>${item}</div>`).join("");
    ui.pause.textContent = state.paused ? "▶" : "Ⅱ";
    const phase = ["晨光入园", "午后巡游", "晚霞灯会"][Math.floor((state.dayTime % 90) / 30)];
    ui.season.textContent = phase;
    ui.ticketPrice.textContent = `$${state.ticketPrice}`;
    ui.cleanersCount.textContent = state.cleaners;
    ui.mechanicsCount.textContent = state.mechanics;
    ui.marketingTime.textContent = `${Math.ceil(state.marketing)}s`;
    const goal = GOALS[Math.min(state.goalIndex, GOALS.length - 1)];
    const complete = goal && goal.check(state);
    ui.goalText.textContent = goal ? `${complete ? "可领取" : "目标"}：${goal.text}` : "所有阶段目标已完成。";
    ui.goalReward.textContent = goal ? `$${goal.reward}` : "$0";
    ui.claimGoal.disabled = !complete;
    ui.launchAd.disabled = state.marketing > 0 || state.money < 120;
    updateSelectedDetails(selected);
  }

  function updateSelectedDetails(tile) {
    if (!tile) return;
    if (tile.object) {
      const obj = tile.object;
      ui.selectedName.textContent = obj.name;
      ui.selectedDetails.innerHTML = `类型：${catalog[obj.type].kind === "ride" ? "景点" : catalog[obj.type].kind === "shop" ? "服务" : "景观"}<br>人气：${obj.appeal}<br>排队：${tile.queue.length} 人<br>已服务：${obj.served || 0} 人`;
    } else if (tile.road) {
      ui.selectedName.textContent = tile.x === entrance.x && tile.y === entrance.y ? "入园广场" : "糖砖步道";
      ui.selectedDetails.innerHTML = `坐标：${tile.x}, ${tile.y}<br>垃圾：${tile.litter.toFixed(0)}<br>道路连接让游客顺畅抵达设施。`;
    } else {
      ui.selectedName.textContent = "空闲地块";
      ui.selectedDetails.innerHTML = `坐标：${tile.x}, ${tile.y}<br>地形：${tile.terrain === "flower" ? "野花草地" : "柔绿草地"}<br>可放置景点、景观或水体。`;
    }
  }

  function buildAt(tile) {
    if (!tile) return;
    const tool = state.selectedTool;
    if (tool === "remove") {
      if (tile.x === entrance.x && tile.y === entrance.y) return;
      if (tile.object) {
        state.money += Math.floor((catalog[tile.object.type].cost || 0) * 0.35);
        tile.object = null;
        tile.queue = [];
        log("已拆除设施并回收部分资金。");
      } else if (tile.road) {
        tile.road = false;
        log("移除了一段道路。");
      }
      selectTile(tile.x, tile.y);
      return;
    }
    if (tool === "clean") {
      if (tile.litter > 0 && state.money >= catalog.clean.cost) {
        state.money -= catalog.clean.cost;
        tile.litter = Math.max(0, tile.litter - 3);
        log("清洁完成，游客的心情轻了一点。");
      }
      selectTile(tile.x, tile.y);
      return;
    }
    if (tool === "road") {
      if (tile.object || tile.road) {
        selectTile(tile.x, tile.y);
        return;
      }
      if (state.money >= catalog.road.cost) {
        state.money -= catalog.road.cost;
        tile.road = true;
        log("铺设道路。新的路线可被游客识别。");
      } else log("资金不够铺路。");
      selectTile(tile.x, tile.y);
      return;
    }
    const placed = placeObject(tile.x, tile.y, tool);
    if (placed) log(`${catalog[tool].name} 开始营业。`);
    selectTile(tile.x, tile.y);
  }

  function serializeGame() {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      money: state.money,
      cleanliness: state.cleanliness,
      happiness: state.happiness,
      appeal: state.appeal,
      rating: state.rating,
      ticketPrice: state.ticketPrice,
      cleaners: state.cleaners,
      mechanics: state.mechanics,
      marketing: state.marketing,
      goalIndex: state.goalIndex,
      goalsClaimed: state.goalsClaimed,
      dayTime: state.dayTime,
      selectedTool: state.selectedTool,
      camera: state.camera,
      selectedTile: state.selectedTile,
      tiles: state.tiles.map((tile) => ({
        x: tile.x,
        y: tile.y,
        terrain: tile.terrain,
        road: tile.road,
        litter: tile.litter,
        wear: tile.wear,
        pulse: tile.pulse,
        object: tile.object ? {
          type: tile.object.type,
          name: tile.object.name,
          status: tile.object.status,
          appeal: tile.object.appeal,
          capacity: tile.object.capacity,
          duration: tile.object.duration,
          income: tile.object.income,
          timer: tile.object.timer,
          served: tile.object.served || 0
        } : null
      })),
      guests: state.guests.slice(0, 50).map((guest) => ({
        x: guest.x,
        y: guest.y,
        px: guest.px,
        py: guest.py,
        mood: guest.mood,
        spent: guest.spent,
        color: guest.color,
        speed: guest.speed
      }))
    };
  }

  function restoreGame(save) {
    if (!save || !Array.isArray(save.tiles)) return false;
    state.tiles = save.tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      terrain: tile.terrain || "grass",
      object: tile.object ? { ...tile.object, riders: [] } : null,
      road: Boolean(tile.road),
      litter: Number(tile.litter) || 0,
      wear: Number(tile.wear) || 100,
      queue: [],
      riders: [],
      pulse: Number(tile.pulse) || Math.random() * Math.PI * 2
    }));
    state.guests = (save.guests || []).map((guest) => ({
      x: guest.x,
      y: guest.y,
      px: guest.px,
      py: guest.py,
      path: [],
      pathIndex: 0,
      speed: guest.speed || 1.8,
      mood: guest.mood || 70,
      spent: guest.spent || 0,
      target: null,
      state: "wandering",
      wait: 0,
      color: guest.color || "#50a7c7"
    }));
    while (state.guests.length < 8) spawnGuest();
    state.money = Number(save.money) || 0;
    state.cleanliness = Number(save.cleanliness) || 90;
    state.happiness = Number(save.happiness) || 70;
    state.appeal = Number(save.appeal) || 0;
    state.rating = Number(save.rating) || 1;
    state.ticketPrice = Number(save.ticketPrice) || 6;
    state.cleaners = Number(save.cleaners) || 0;
    state.mechanics = Number(save.mechanics) || 0;
    state.marketing = Number(save.marketing) || 0;
    state.goalIndex = Number(save.goalIndex) || 0;
    state.goalsClaimed = Number(save.goalsClaimed) || 0;
    state.dayTime = Number(save.dayTime) || 0;
    state.selectedTool = save.selectedTool || "road";
    state.camera = save.camera || state.camera;
    state.selectedTile = save.selectedTile || entrance;
    state.paused = false;
    document.querySelectorAll(".tool").forEach((item) => item.classList.toggle("selected", item.dataset.tool === state.selectedTool));
    log("存档读取完成，公园重新开园。");
    refreshSavePanel();
    return true;
  }

  function saveGame(slot, silent = false) {
    try {
      localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(serializeGame()));
      if (!silent) log(slot === "auto" ? "自动存档已更新。" : `已保存到存档 ${Number(slot) + 1}。`);
      refreshSavePanel();
      return true;
    } catch (error) {
      log("存档失败：浏览器存储空间不可用。");
      return false;
    }
  }

  function loadGame(slot) {
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
      if (!raw) {
        log("这个存档槽还是空的。");
        return false;
      }
      return restoreGame(JSON.parse(raw));
    } catch (error) {
      log("读取失败：存档数据已损坏。");
      return false;
    }
  }

  function deleteSave(slot) {
    localStorage.removeItem(`${SAVE_PREFIX}${slot}`);
    log(slot === "auto" ? "已删除自动存档。" : `已删除存档 ${Number(slot) + 1}。`);
    refreshSavePanel();
  }

  function readSaveMeta(slot) {
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
      if (!raw) return null;
      const save = JSON.parse(raw);
      return {
        savedAt: save.savedAt,
        money: Math.floor(save.money || 0),
        rating: Number(save.rating || 1).toFixed(1),
        guests: (save.guests || []).length,
        attractions: attractionCount(save)
      };
    } catch {
      return { broken: true };
    }
  }

  function refreshSavePanel() {
    if (!ui.saveSlots) return;
    const slots = ["0", "1", "2", "auto"];
    ui.saveSlots.innerHTML = slots.map((slot) => {
      const meta = readSaveMeta(slot);
      const title = slot === "auto" ? "自动存档" : `存档 ${Number(slot) + 1}`;
      const body = meta
        ? meta.broken
          ? "数据损坏"
          : `${new Date(meta.savedAt).toLocaleString()} · $${meta.money} · ${meta.rating}星 · ${meta.guests}客 · ${meta.attractions}设施`
        : "空槽";
      return `<div class="save-slot">
        <div><strong>${title}</strong><small>${body}</small></div>
        <div class="slot-actions">
          <button type="button" data-load-slot="${slot}">读取</button>
          <button type="button" data-delete-slot="${slot}">删除</button>
        </div>
      </div>`;
    }).join("");
  }

  function selectTile(x, y) {
    state.selectedTile = { x, y };
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const pos = pointerPos(event);
    state.dragging = true;
    state.dragMoved = false;
    state.dragStart = { x: pos.x, y: pos.y, cx: state.camera.x, cy: state.camera.y };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    const pos = pointerPos(event);
    state.hover = screenToIso(pos.x, pos.y);
    if (state.dragging && state.dragStart) {
      const dx = pos.x - state.dragStart.x;
      const dy = pos.y - state.dragStart.y;
      if (Math.hypot(dx, dy) > 8) state.dragMoved = true;
      if (state.dragMoved) {
        state.camera.x = state.dragStart.cx + dx;
        state.camera.y = state.dragStart.cy + dy;
      }
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    const pos = pointerPos(event);
    const tilePos = screenToIso(pos.x, pos.y);
    const tile = tileAt(tilePos.x, tilePos.y);
    if (!state.dragMoved && tile) buildAt(tile);
    state.dragging = false;
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const old = state.camera.zoom;
    const next = Math.max(0.55, Math.min(1.65, old * (event.deltaY > 0 ? 0.9 : 1.1)));
    const pos = pointerPos(event);
    state.camera.x = pos.x - ((pos.x - state.camera.x) / old) * next;
    state.camera.y = pos.y - ((pos.y - state.camera.y) / old) * next;
    state.camera.zoom = next;
  }, { passive: false });

  document.querySelectorAll(".tool").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTool = button.dataset.tool;
      document.querySelectorAll(".tool").forEach((item) => item.classList.toggle("selected", item === button));
    });
  });

  ui.pause.addEventListener("click", () => {
    state.paused = !state.paused;
  });

  ui.reset.addEventListener("click", resetGame);

  ui.ticketDown.addEventListener("click", () => {
    state.ticketPrice = Math.max(2, state.ticketPrice - 1);
    log(`门票调整为 $${state.ticketPrice}。`);
  });

  ui.ticketUp.addEventListener("click", () => {
    state.ticketPrice = Math.min(18, state.ticketPrice + 1);
    log(`门票调整为 $${state.ticketPrice}。`);
  });

  ui.hireCleaner.addEventListener("click", () => {
    if (state.money < 90) return log("雇清洁员需要 $90。");
    state.money -= 90;
    state.cleaners += 1;
    log("清洁员上岗，会持续处理垃圾。");
  });

  ui.hireMechanic.addEventListener("click", () => {
    if (state.money < 120) return log("雇维修队需要 $120。");
    state.money -= 120;
    state.mechanics += 1;
    log("维修队上岗，会持续恢复设施状态。");
  });

  ui.launchAd.addEventListener("click", () => {
    if (state.marketing > 0) return;
    if (state.money < 120) return log("营销巡游需要 $120。");
    state.money -= 120;
    state.marketing = 35;
    log("营销巡游开始，短时间内游客更愿意入园。");
  });

  ui.claimGoal.addEventListener("click", () => {
    const goal = GOALS[state.goalIndex];
    if (!goal || !goal.check(state)) return;
    state.money += goal.reward;
    state.goalIndex += 1;
    state.goalsClaimed += 1;
    log(`目标完成，获得奖励 $${goal.reward}。`);
  });

  ui.saveToggle.addEventListener("click", () => {
    const open = ui.savePanel.getAttribute("aria-hidden") === "true";
    ui.savePanel.setAttribute("aria-hidden", String(!open));
    refreshSavePanel();
  });

  ui.saveClose.addEventListener("click", () => {
    ui.savePanel.setAttribute("aria-hidden", "true");
  });

  document.querySelectorAll("[data-save-slot]").forEach((button) => {
    button.addEventListener("click", () => saveGame(button.dataset.saveSlot));
  });

  ui.saveSlots.addEventListener("click", (event) => {
    const loadButton = event.target.closest("[data-load-slot]");
    const deleteButton = event.target.closest("[data-delete-slot]");
    if (loadButton) loadGame(loadButton.dataset.loadSlot);
    if (deleteButton) deleteSave(deleteButton.dataset.deleteSlot);
  });

  window.addEventListener("keydown", (event) => state.keys.add(event.code));
  window.addEventListener("keyup", (event) => state.keys.delete(event.code));
  window.addEventListener("resize", resize);

  window.__isoPark = {
    state,
    catalog,
    tileAt,
    setTool(tool) {
      if (!catalog[tool]) return false;
      state.selectedTool = tool;
      document.querySelectorAll(".tool").forEach((item) => item.classList.toggle("selected", item.dataset.tool === tool));
      return true;
    },
    build(x, y, tool = state.selectedTool) {
      this.setTool(tool);
      buildAt(tileAt(x, y));
      return this.snapshot();
    },
    snapshot() {
      return {
        money: Math.floor(state.money),
        guests: state.guests.length,
        happiness: Math.round(state.happiness),
        cleanliness: Math.round(state.cleanliness),
        appeal: Math.round(state.appeal),
        rating: Number(state.rating.toFixed(2)),
        ticketPrice: state.ticketPrice,
        cleaners: state.cleaners,
        mechanics: state.mechanics,
        marketing: Math.ceil(state.marketing),
        goalIndex: state.goalIndex,
        roads: state.tiles.filter((tile) => tile.road).length,
        attractions: attractionCount(state),
        queues: state.tiles.reduce((sum, tile) => sum + tile.queue.length, 0),
        served: totalServed(state),
        litter: state.tiles.reduce((sum, tile) => sum + tile.litter, 0)
      };
    },
    saveGame,
    loadGame,
    deleteSave,
    serializeGame,
    restoreGame
  };

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * state.speed * (state.paused ? 0 : 1);
    last = now;
    if (dt > 0) {
      updateGuests(dt);
      updateAttractions(dt);
      updateSystems(dt);
    }
    drawWorld();
    updateUi();
    requestAnimationFrame(loop);
  }

  resize();
  resetGame();
  requestAnimationFrame(loop);
})();
