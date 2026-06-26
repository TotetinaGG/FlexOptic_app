// FlexOptic App - Web Bluetooth + cronómetro + chatbot

const ALERT_TIME_MS = 45 * 60 * 1000; // 45 minutos
const MOVEMENT_THRESHOLD = 50; // Diferencia mínima para considerar movimiento

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let lastLdrValue = null;
let lastMovementTime = null;
let timerInterval = null;
let alertPlayed = false;
let isConnected = false;
let connectedDevice = null;

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

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.frequency.value = 880;
  gain.gain.value = 0.15;

  osc.start();

  setTimeout(() => {
    osc.stop();
    audio.close();
  }, 600);
}

function resetMonitoring() {
  isConnected = false;
  lastLdrValue = null;
  lastMovementTime = null;
  alertPlayed = false;

  timerEl.textContent = '00:00:00';
  lastMoveEl.textContent = '--';
  movementStatusEl.textContent = 'Conecta tu ESP32 para iniciar el monitoreo.';
  alertBox.classList.add('hidden');

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startMonitoring() {
  isConnected = true;
  lastMovementTime = Date.now();
  alertPlayed = false;

  timerEl.textContent = '00:00:00';
  lastMoveEl.textContent = '--';
  movementStatusEl.textContent = 'Monitoreo iniciado. Esperando actividad de rodilla.';
  alertBox.classList.add('hidden');

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    if (!isConnected || lastMovementTime === null) return;

    const elapsed = Date.now() - lastMovementTime;
    timerEl.textContent = formatTime(elapsed);

    if (elapsed >= ALERT_TIME_MS) {
      alertBox.classList.remove('hidden');

      movementStatusEl.textContent =
        'Tu rodilla lleva mucho tiempo quieta. Realiza una pausa activa suave.';

      if (!alertPlayed) {
        beep();
        alertPlayed = true;
      }
    }
  }, 1000);
}

function getMovementMessage(diff) {
  if (diff <= 50) {
    return 'Tu rodilla lleva un rato quieta. Recuerda moverte suavemente pronto.';
  }

  if (diff <= 150) {
    return 'Buen inicio, detectamos un movimiento suave.';
  }

  if (diff <= 400) {
    return '¡Bien! Detectamos actividad de rodilla.';
  }

  if (diff <= 800) {
    return 'Vaya, te estás moviendo bastante. Mantén movimientos suaves y controlados.';
  }

  return 'Movimiento intenso detectado. Si sientes dolor, baja la intensidad.';
}

function processLdrValue(value) {
  if (!isConnected) return;

  ldrValueEl.textContent = value;

  if (lastLdrValue === null) {
    lastLdrValue = value;
    lastMovementTime = Date.now();

    const now = new Date().toLocaleTimeString();
    lastMoveEl.textContent = now;

    movementStatusEl.textContent = 'Datos recibidos. Monitoreo iniciado.';
    return;
  }

  const diff = Math.abs(value - lastLdrValue);

  movementStatusEl.textContent = getMovementMessage(diff);

  if (diff > MOVEMENT_THRESHOLD) {
    lastMovementTime = Date.now();
    alertPlayed = false;
    alertBox.classList.add('hidden');

    const now = new Date().toLocaleTimeString();
    lastMoveEl.textContent = now;
  }

  lastLdrValue = value;
}

connectBtn.addEventListener('click', async () => {
  try {
    if (!navigator.bluetooth) {
      alert('Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en computador o Android.');
      return;
    }

    statusEl.textContent = 'Estado: buscando ESP32...';

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'FlexOptic' }],
      optionalServices: [SERVICE_UUID]
    });

    connectedDevice = device;

    connectedDevice.addEventListener('gattserverdisconnected', () => {
      statusEl.textContent = 'Estado: desconectado';
      resetMonitoring();
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    await characteristic.startNotifications();

    characteristic.addEventListener('characteristicvaluechanged', event => {
      const text = new TextDecoder().decode(event.target.value);
      const value = parseInt(text, 10);

      if (!Number.isNaN(value)) {
        processLdrValue(value);
      }
    });

    statusEl.textContent = `Estado: conectado a ${device.name}`;
    startMonitoring();

  } catch (error) {
    statusEl.textContent = 'Estado: no se pudo conectar';
    console.error(error);
    resetMonitoring();
  }
});

// Chatbot de ejercicios para rodilla

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

resetMonitoring();
