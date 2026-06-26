// FlexOptic App - Web Bluetooth + cronómetro + chatbot

const ALERT_TIME_MS = 45 * 60 * 1000; // 45 minutos

// Mismo umbral que estás usando en el firmware.
// Si el valor es menor a 900, hay luz detectada y se considera movimiento.
const LIGHT_THRESHOLD = 900;

// Para que las frases no cambien demasiado rápido.
const MESSAGE_UPDATE_INTERVAL = 3000; // 3 segundos

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let lastMovementTime = null;
let timerInterval = null;
let alertPlayed = false;
let isConnected = false;
let connectedDevice = null;

let lastMessageUpdate = 0;
let currentMovementCategory = '';

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
  lastMovementTime = null;
  alertPlayed = false;
  lastMessageUpdate = 0;
  currentMovementCategory = '';

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
  lastMessageUpdate = 0;
  currentMovementCategory = '';

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

function getMovementCategory(value) {
  if (value >= LIGHT_THRESHOLD) {
    return 'sinMovimiento';
  }

  if (value >= 700) {
    return 'movimientoLeve';
  }

  if (value >= 500) {
    return 'movimientoModerado';
  }

  if (value >= 300) {
    return 'movimientoAlto';
  }

  return 'movimientoIntenso';
}

function getMovementMessage(category) {
  if (category === 'sinMovimiento') {
    return 'Tu rodilla está quieta. Recuerda moverte suavemente pronto.';
  }

  if (category === 'movimientoLeve') {
    return 'Detectamos un movimiento suave de rodilla.';
  }

  if (category === 'movimientoModerado') {
    return '¡Bien! Detectamos actividad de rodilla.';
  }

  if (category === 'movimientoAlto') {
    return 'Vaya, te estás moviendo bastante. Mantén movimientos controlados.';
  }

  if (category === 'movimientoIntenso') {
    return 'Movimiento intenso detectado. Si sientes dolor, baja la intensidad.';
  }

  return 'Esperando datos del sensor.';
}

function updateMovementMessage(category) {
  const now = Date.now();

  const categoryChanged = category !== currentMovementCategory;
  const enoughTimePassed = now - lastMessageUpdate >= MESSAGE_UPDATE_INTERVAL;

  if (categoryChanged && enoughTimePassed) {
    movementStatusEl.textContent = getMovementMessage(category);
    currentMovementCategory = category;
    lastMessageUpdate = now;
  }
}

function processLdrValue(value) {
  if (!isConnected) return;

  // El valor se sigue guardando internamente, pero no se muestra en pantalla.
  ldrValueEl.textContent = value;

  const category = getMovementCategory(value);

  updateMovementMessage(category);

  // En tu sistema, si el valor es menor a 900, hay luz detectada.
  // Eso significa que hay movimiento y se reinicia el cronómetro.
  if (value < LIGHT_THRESHOLD) {
    lastMovementTime = Date.now();
    alertPlayed = false;
    alertBox.classList.add('hidden');

    const now = new Date().toLocaleTimeString();
    lastMoveEl.textContent = now;
  }
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
