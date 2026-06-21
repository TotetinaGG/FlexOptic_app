// FlexOptic App - Web Bluetooth + cronómetro + chatbot local
const ALERT_TIME_MS = 45 * 60 * 1000; // 45 minutos
const MOVEMENT_THRESHOLD = 50; // ajustar según calibración del LDR
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let lastLdrValue = null;
let lastMovementTime = Date.now();
let alertPlayed = false;

const connectBtn = document.getElementById('connectBtn');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const ldrValueEl = document.getElementById('ldrValue');
const movementStatusEl = document.getElementById('movementStatus');
const lastMoveEl = document.getElementById('lastMove');
const alertBox = document.getElementById('alertBox');

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function beep() {
  const audio = new AudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain); gain.connect(audio.destination);
  osc.frequency.value = 880; gain.gain.value = 0.15;
  osc.start(); setTimeout(() => { osc.stop(); audio.close(); }, 600);
}

setInterval(() => {
  const elapsed = Date.now() - lastMovementTime;
  timerEl.textContent = formatTime(elapsed);
  if (elapsed >= ALERT_TIME_MS) {
    alertBox.classList.remove('hidden');
    movementStatusEl.textContent = 'Inactividad prolongada detectada.';
    if (!alertPlayed) { beep(); alertPlayed = true; }
  }
}, 1000);

function processLdrValue(value) {
  ldrValueEl.textContent = value;
  if (lastLdrValue === null) {
    lastLdrValue = value;
    lastMovementTime = Date.now();
    lastMoveEl.textContent = new Date().toLocaleTimeString();
    return;
  }
  const diff = Math.abs(value - lastLdrValue);
  if (diff > MOVEMENT_THRESHOLD) {
    lastMovementTime = Date.now();
    alertPlayed = false;
    alertBox.classList.add('hidden');
    movementStatusEl.textContent = 'Movimiento de rodilla detectado. Cronómetro reiniciado.';
    lastMoveEl.textContent = new Date().toLocaleTimeString();
  } else {
    movementStatusEl.textContent = 'Sin movimiento significativo.';
  }
  lastLdrValue = value;
}

connectBtn.addEventListener('click', async () => {
  try {
    if (!navigator.bluetooth) {
      alert('Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en computador/Android.');
      return;
    }
    statusEl.textContent = 'Estado: buscando ESP32...';
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'FlexOptic' }],
      optionalServices: [SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', event => {
      const text = new TextDecoder().decode(event.target.value);
      const value = parseInt(text, 10);
      if (!Number.isNaN(value)) processLdrValue(value);
    });
    statusEl.textContent = `Estado: conectado a ${device.name}`;
  } catch (error) {
    statusEl.textContent = 'Estado: no se pudo conectar';
    console.error(error);
  }
});

// Chatbot local para rodilla, sin API externa
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatWindow = document.getElementById('chatWindow');

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `${type} msg`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function botReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('dolor') || msg.includes('duele')) {
    return 'Para dolor de rodilla, realiza extensión suave sentado: estira la pierna lentamente, mantén 5 segundos y baja. Haz 8 repeticiones. Si el dolor aumenta, detente.';
  }
  if (msg.includes('rigidez') || msg.includes('ties')) {
    return 'Para rigidez, prueba bombeo articular: sentado, flexiona y extiende la rodilla suavemente durante 1 minuto, sin forzar el rango de movimiento.';
  }
  if (msg.includes('inflam') || msg.includes('hinch')) {
    return 'Si hay inflamación, eleva la pierna y realiza contracciones suaves del cuádriceps: aprieta el muslo 5 segundos y relaja. Repite 10 veces.';
  }
  if (msg.includes('flex') || msg.includes('doblar')) {
    return 'Para mejorar flexión, desliza el talón hacia el cuerpo estando acostado, mantén 3 segundos y vuelve. Hazlo lento, 8 a 10 repeticiones.';
  }
  if (msg.includes('ejercicio') || msg.includes('rutina')) {
    return 'Rutina sugerida: 1 minuto de bombeo articular, 10 contracciones de cuádriceps, 8 deslizamientos de talón y 8 extensiones sentado. Todo debe ser suave.';
  }
  return 'Puedo ayudarte con ejercicios para dolor, rigidez, inflamación o flexión de rodilla. Escríbeme qué sientes y te recomiendo una pausa activa.';
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  chatInput.value = '';

  addMessage('Pensando...', 'bot');

  try {

    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text
      })
    });

    const data = await response.json();

    const mensajesBot = document.querySelectorAll('.bot.msg');

    mensajesBot[mensajesBot.length - 1].textContent = data.reply;

  } catch (error) {

    const mensajesBot = document.querySelectorAll('.bot.msg');

    mensajesBot[mensajesBot.length - 1].textContent =
      'Error al conectar con la IA. Revisa el servidor y la API key.';

    console.error(error);
  }
});
