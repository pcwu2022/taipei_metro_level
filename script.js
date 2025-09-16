// --- Metro Data ---
import { LINES } from './lines.js';

const LEVELS = [
  { value: 0, label: 'None', color: 'var(--level-0)' },
  { value: 1, label: 'Passed', color: 'var(--level-1)' },
  { value: 2, label: 'Transfer', color: 'var(--level-2)' },
  { value: 3, label: 'Visited', color: 'var(--level-3)' },
  { value: 4, label: 'Commute node', color: 'var(--level-4)' },
  { value: 5, label: 'Lived nearby', color: 'var(--level-5)' },
];

const circleRadius = 5;
const strokeWeight = 6;
const labelSize = 'small';

const ax = 0.4;
const bx = 30;
const ay = 0.4;
const by = -60;

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
      console.log(s1.x)
      svg.appendChild(lineElement(s1.x, s1.y, s2.x, s2.y, line.color));
    }
  }
  // Draw stations
  for (const line of LINES) {
    for (const s of line.stations) {
      if (s.x == null || s.y == null) continue;
      svg.appendChild(stationElement(s));
      svg.appendChild(labelElement(s));
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
function stationElement(station) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', station.x);
  c.setAttribute('cy', station.y);
  c.setAttribute('r', circleRadius);
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
function labelElement(station) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', station.x);
  t.setAttribute('y', station.y + 28);
  t.setAttribute('class', 'station-label');
  t.textContent = station.name;
  return t;
}

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
  const current = stationLevels[station.id] || 0;
  LEVELS.forEach(lvl => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class='level-dot' style='background:${lvl.color}'></span> ${lvl.label}`;
    if (lvl.value == current) btn.classList.add('selected');
    btn.onclick = () => {
      stationLevels[station.id] = lvl.value;
      saveLevels();
      updateTotalLevel();
      renderMap();
      hideLevelMenu();
    };
    levelMenu.appendChild(btn);
  });
  // Position menu
  const svg = document.getElementById('metro-svg');
  const rect = svg.getBoundingClientRect();
  let x = station.x * (rect.width / svg.viewBox.baseVal.width);
  let y = station.y * (rect.height / svg.viewBox.baseVal.height);
  levelMenu.style.left = (rect.left + x - 70) + 'px';
  levelMenu.style.top = (rect.top + y + 10 + window.scrollY) + 'px';
  levelMenu.style.display = 'flex';
  menuOpen = true;
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
  document.getElementById('total-level').textContent = 'Total Level: ' + getTotalLevel();
}

// --- Init ---
loadLevels();
renderMap();
updateTotalLevel();

// --- Accessibility: Keyboard navigation ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) hideLevelMenu();
});