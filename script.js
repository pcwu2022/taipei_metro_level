// --- Metro Data ---
import { LINES } from './lines.js';

const LEVELS = [
  { value: 0, label: '無', color: 'var(--level-0)' },
  { value: 1, label: '通過', color: 'var(--level-1)' },
  { value: 2, label: '轉乘', color: 'var(--level-2)' },
  { value: 3, label: '造訪過', color: 'var(--level-3)' },
  { value: 4, label: '通勤節點', color: 'var(--level-4)' },
  { value: 5, label: '居住過', color: 'var(--level-5)' },
];

const circleRadius = 8;
const strokeWeight = 7;
const labelSize = 'small';

const ax = 0.6;
const bx = -40;
const ay = 0.6;
const by = -90;

// size
for (let line of LINES) {
  for (let station of line["stations"]) {
    station.x = station.x ? station.x * ax + bx : null;
    station.y = station.y ? station.y * ay + by : null;
  }
}

const STORAGE_KEY = 'taipei-metro-levels-v1';

// --- State ---
let stationLevels = {};

function loadLevels() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) stationLevels = JSON.parse(data);
    else stationLevels = {};
  } catch {
    stationLevels = {};
  }
}
function saveLevels() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stationLevels));
}

function getTotalLevel() {
  return Object.values(stationLevels).reduce((a, b) => a + (parseInt(b) || 0), 0);
}

// --- SVG Map Rendering ---
function renderMap() {
  const svg = document.getElementById('metro-svg');
  svg.innerHTML = '';
  // Draw lines
  for (const line of LINES) {
    for (let i = 0; i < line.stations.length - 1; ++i) {
      const s1 = line.stations[i], s2 = line.stations[i+1];
      if (s1.x == null || s1.y == null || s2.x == null || s2.y == null) continue;
      svg.appendChild(lineElement(s1.x, s1.y, s2.x, s2.y, line.color));
    }
  }
  // Draw stations
  for (const line of LINES) {
    for (const s of line.stations) {
      if (s.x == null || s.y == null) continue;
      svg.appendChild(stationElement(s));
      // svg.appendChild(labelElement(s)); // Remove label from map
    }
  }
}
function lineElement(x1, y1, x2, y2, color) {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', x1);
  l.setAttribute('y1', y1);
  l.setAttribute('x2', x2);
  l.setAttribute('y2', y2);
  l.setAttribute('stroke', `var(--shadow), ${color}`);
  l.setAttribute('stroke', color);
  l.setAttribute('stroke-width', strokeWeight);
  l.setAttribute('stroke-linecap', 'round');
  l.setAttribute('opacity', 0.92);
  return l;
}

const displayedStations = [];

function stationElement(station) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', station.x);
  c.setAttribute('cy', station.y);
  const xy = Math.floor(station.x * 10000 + station.y);
  if (displayedStations.indexOf(xy) !== -1) {
    c.setAttribute('r', 0);
    // console.log(station.id);
  } else {
    c.setAttribute('r', circleRadius);
    displayedStations.push(xy);
    // console.log(xy);
  }
  c.setAttribute('class', 'station' + (stationLevels[station.id] ? ' selected' : ''));
  const level = stationLevels[station.id] || 0;
  c.setAttribute('fill', LEVELS[level]?.color || LEVELS[0].color);
  c.setAttribute('data-id', station.id);
  c.setAttribute('data-label-size', labelSize);
  c.setAttribute('tabindex', 0);
  c.setAttribute('aria-label', station.name);
  c.addEventListener('click', (e) => onStationClick(e, station));
  c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onStationClick(e, station); });
  g.appendChild(c);
  return g;
}
// Remove labelElement function if not used elsewhere, or leave as is if you want to keep it for future use

// --- Level Menu ---
const levelMenu = document.getElementById('level-menu');
let menuOpen = false;
let menuStation = null;

function onStationClick(e, station) {
  e.stopPropagation();
  menuStation = station;
  showLevelMenu(e, station);
}
function showLevelMenu(e, station) {
  levelMenu.innerHTML = '';
  // Add station name label at the top of the menu
  const labelDiv = document.createElement('div');
  labelDiv.textContent = station.name;
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.fontSize = '1.08em';
  labelDiv.style.padding = '0.3em 1.2em 0.5em 1.2em';
  labelDiv.style.textAlign = 'left';
  levelMenu.appendChild(labelDiv);

  const current = stationLevels[station.id] || 0;
  LEVELS.forEach(lvl => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class='level-dot' style='background:${lvl.color}'></span> ${lvl.label}`;
    if (lvl.value == current) btn.classList.add('selected');
    btn.onclick = () => {
      stationLevels[station.id] = lvl.value;
      saveLevels();
      updateTotalLevel();
      // Update only the circle color, not the whole map
      const svg = document.getElementById('metro-svg');
      const circle = svg.querySelector(`circle[data-id="${station.id}"]`);
      if (circle) {
        circle.setAttribute('fill', LEVELS[lvl.value]?.color || LEVELS[0].color);
      }
      hideLevelMenu();
    };
    levelMenu.appendChild(btn);
  });
  levelMenu.style.display = 'flex';
  levelMenu.style.flexDirection = 'column';
  levelMenu.style.position = 'absolute';
  levelMenu.style.zIndex = '1000';
  menuOpen = true;

  // Only set position once, at click/tap
  let clientX = e.clientX, clientY = e.clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  moveLevelMenu(clientX, clientY);
}

function moveLevelMenu(x, y) {
  // Offset so menu doesn't cover cursor
  levelMenu.style.left = (x + 16) + 'px';
  levelMenu.style.top = (y + 16 + window.scrollY) + 'px';
}

function hideLevelMenu() {
  levelMenu.style.display = 'none';
  menuOpen = false;
  menuStation = null;
}
document.body.addEventListener('click', (e) => {
  if (menuOpen) hideLevelMenu();
});
window.addEventListener('resize', hideLevelMenu);

// --- Total Level ---
function updateTotalLevel() {
  document.getElementById('total-level').textContent = '總等級：' + getTotalLevel();
}

// --- Init ---
loadLevels();
renderMap();
updateTotalLevel();

// --- Accessibility: Keyboard navigation ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) hideLevelMenu();
});

svgPanZoom('#metro-svg', {
  viewportSelector: '.svg-pan-zoom_viewport'
});

const restartButton = document.getElementById("restart");

restartButton.addEventListener("click", (e) => {
  if (confirm("確定重設所有的等級嗎？")) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    location.reload();
  }
});

const presetButton = document.getElementById("preset");

presetButton.addEventListener("click", (e) => {
  if (confirm("確定將所有車站設定為「造訪過」嗎？")) {
    const allLevels = {};
    for (const line of LINES) {
      for (const station of line.stations) {
        allLevels[station.id] = 3; // Set to "造訪過"
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLevels));
    location.reload();
  }
});