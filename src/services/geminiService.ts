import { GEMINI_API_KEY } from '../config/ai';

interface VoiceParseContext {
  workers: { id: string; name: string; code?: string }[];
  activities: { id: string; name: string; unit: string }[];
  blocks: string[];
}

export interface ParsedShift {
  activityId?: string;
  activityName?: string;
  startTime: string;
  endTime: string;
  block?: string;
  achievedPerformance: number;
}

export interface ParsedRecord {
  workerId?: string;
  workerName?: string;
  shifts: ParsedShift[];
  notes?: string;
}

export interface ParsedVoiceResult {
  records: ParsedRecord[];
}

export async function parseVoiceWithGemini(
  transcript: string,
  context: VoiceParseContext
): Promise<ParsedVoiceResult> {
  const prompt = `Eres un asistente para una app de gestión de rendimientos agrícolas en Argentina.
El usuario dictó por voz: "${transcript}"

Extrae la información de UNO O VARIOS registros y responde SOLO con JSON válido (sin markdown, sin texto extra).

Trabajadores disponibles:
${JSON.stringify(context.workers, null, 2)}

Actividades disponibles:
${JSON.stringify(context.activities, null, 2)}

Bloques disponibles: ${JSON.stringify(context.blocks)}

Formato de respuesta requerido:
{
  "records": [
    {
      "workerId": "uuid del trabajador si lo identificas, sino null",
      "workerName": "nombre como fue mencionado",
      "shifts": [
        {
          "activityId": "uuid de la actividad si la identificas, sino null",
          "activityName": "nombre como fue mencionado o null si no se menciona",
          "startTime": "HH:mm en formato 24h",
          "endTime": "HH:mm en formato 24h",
          "block": "nombre exacto del bloque de la lista disponible o null",
          "achievedPerformance": número
        }
      ],
      "notes": "notas adicionales o null"
    }
  ]
}

Notas importantes:
- Puede haber VARIOS trabajadores en un solo dictado. Cada trabajador es un elemento separado en "records".
- Un mismo trabajador puede tener VARIOS turnos. Inclúyelos todos en su array "shifts".
- Convierte horas AM/PM a formato 24h (ej: "7am" → "07:00", "3pm" → "15:00")
- Si el usuario dice "turno de 7 a 3" asume AM para inicio y PM para fin
- Identifica el trabajador por similitud de nombre aunque esté abreviado
- Identifica la actividad por similitud de nombre
- Para el bloque, usa SIEMPRE el nombre exacto que aparece en la lista de bloques disponibles (respeta mayúsculas/minúsculas). Si dice "bloque 10" y existe "10", usa "10".
- Si una nota aplica a un trabajador, ponla en su campo "notes"`;

  // Modelos en orden de preferencia: si uno falla, se intenta el siguiente
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];

  let text: string | undefined;
  let lastError = '';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        lastError = await response.text();
        console.log(`[Gemini] ${model} falló (${response.status}), probando siguiente...`);
        continue;
      }

      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) break;

      lastError = 'Respuesta vacía';
      console.log(`[Gemini] ${model} devolvió respuesta vacía, probando siguiente...`);
    } catch (e: any) {
      lastError = e?.message || 'Error de red';
      console.log(`[Gemini] ${model} error de red, probando siguiente...`);
    }
  }

  if (!text) throw new Error(`Gemini API error: ${lastError}`);

  // Limpiar posibles bloques de código markdown
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Compatibilidad: si devuelve un solo registro sin envolver en "records"
  if (parsed.records) return parsed as ParsedVoiceResult;
  if (parsed.shifts) return { records: [parsed as ParsedRecord] };
  return { records: [] };
}
