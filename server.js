require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static(__dirname));

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres el asistente FlexOptic, especializado en apoyo general para rehabilitación de rodilla. Responde en español, de forma clara, amable y segura. Recomienda ejercicios suaves para movilidad, rigidez, inflamación leve y pausas activas. No diagnostiques enfermedades ni reemplaces a un médico o kinesiólogo. Si el usuario menciona dolor fuerte, caída, fiebre, herida abierta, cirugía muy reciente, aumento importante de inflamación, pérdida de sensibilidad, incapacidad para apoyar la pierna o dolor que empeora, recomienda detener el ejercicio y consultar a un profesional de salud."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      reply: "Error al conectar con OpenAI."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor FlexOptic ejecutándose en el puerto ${PORT}`);
});