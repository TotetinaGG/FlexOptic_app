# FlexOptic App

Aplicación web pública para conectar una ESP32 por Bluetooth Low Energy, recibir lecturas del LDR, mostrar cronómetro de inactividad y activar alerta a los 45 minutos.

## Cómo usar
1. Cargar `Firmware/Firmware_FlexOptic.ino` en la ESP32 desde Arduino IDE.
2. Conectar el LDR al GPIO 34, buzzer al GPIO 25 y LED constante al GPIO 26.
3. Abrir `index.html` en Chrome o Edge.
4. Presionar “Conectar ESP32 por Bluetooth”.

## Publicar para cualquier usuario
Subir los archivos `index.html`, `style.css` y `script.js` a Netlify, Vercel o Firebase Hosting. La app queda disponible mediante un link público.

## Nota
Web Bluetooth funciona principalmente en Chrome/Edge y requiere que el usuario conecte manualmente su ESP32 desde el botón de la app.
