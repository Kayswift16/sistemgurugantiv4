import type { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenAI, Type } from "@google/genai";
import type { Teacher, ScheduleEntry, Substitution } from '../../src/types';

const MAX_RETRIES = 2;

const generatePrompt = (
  absentTeachersInfo: { teacher: Teacher; reason: string }[],
  allTeachers: Teacher[],
  timetable: ScheduleEntry[],
  absenceDay: string,
): string => {
  const upperCaseAbsenceDay = absenceDay.toUpperCase();
  const relevantTimetableForDay = timetable.filter(e => e.day.toUpperCase() === upperCaseAbsenceDay);
  const absentTeacherDetails = absentTeachersInfo.map(info => 
    `- ${info.teacher.name} (ID: ${info.teacher.id}), Sebab: ${info.reason || 'Tidak dinyatakan'}`
  ).join('\n');
  const absentTeacherIds = absentTeachersInfo.map(info => info.teacher.id);
  const absentTeachersSchedules = timetable.filter(entry =>
    entry.day.toUpperCase() === upperCaseAbsenceDay && absentTeacherIds.includes(entry.teacherId)
  );

  return `
Anda adalah Penolong Kanan Pentadbiran yang bijak di sebuah sekolah. Tugas anda adalah untuk mencari guru ganti terbaik untuk SEMUA guru yang tidak hadir pada hari tertentu.

MAKLUMAT KES:
- Hari Tidak Hadir: ${absenceDay}
- Senarai Guru Tidak Hadir:
${absentTeacherDetails}
- Jadual Waktu Penuh Sekolah untuk Hari ${absenceDay}: ${JSON.stringify(relevantTimetableForDay)}
- Senarai Semua Guru: ${JSON.stringify(allTeachers)}

TUGASAN:
1. Kenal pasti semua slot waktu mengajar guru yang tidak hadir.
2. Guru yang berada dalam senarai guru tidak hadir TIDAK BOLEH dicadangkan.
3. Cari guru berkelapangan untuk setiap slot kosong.
4. Cadangkan SATU guru ganti paling sesuai untuk setiap slot. Elakkan bertindih.
5. Keutamaan: subjek sama > tahun sama > beban waktu paling sedikit.
6. Sertakan justifikasi ringkas.
7. Kembalikan jawapan dalam format JSON sahaja.

Jadual gabungan guru yang tidak hadir hari ${absenceDay}:
${JSON.stringify(absentTeachersSchedules)}
`;
};

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.STRING },
      time: { type: Type.STRING },
      class: { type: Type.STRING },
      subject: { type: Type.STRING },
      absentTeacherName: { type: Type.STRING },
      substituteTeacherId: { type: Type.STRING },
      substituteTeacherName: { type: Type.STRING },
      justification: { type: Type.STRING },
    },
    required: ["day", "time", "class", "subject", "absentTeacherName", "substituteTeacherId", "substituteTeacherName", "justification"]
  },
};

const safeParseJSON = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("Gagal parse JSON AI response:", text);
    return fallback;
  }
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain', Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    if (!process.env.API_KEY) throw new Error("API_KEY tidak ditetapkan.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');
    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "Medan yang diperlukan tiada." })
      };
    }

    const prompt = generatePrompt(absentTeachersInfo, allTeachers, timetable, absenceDay);

    let jsonResult: Substitution[] = [];
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      });

      if (!response.text) {
        console.warn(`Attempt ${attempt + 1}: AI tidak hantar teks.`);
        continue;
      }

      jsonResult = safeParseJSON<Substitution[]>(response.text.trim(), []);
      if (jsonResult.length > 0) break; // JSON valid, exit retry
      console.warn(`Attempt ${attempt + 1}: JSON kosong, retrying...`);
    }

    if (jsonResult.length === 0) {
      console.warn("AI tidak hantar output yang valid selepas retries.");
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify(jsonResult),
    };

  } catch (err) {
    console.error("Ralat Netlify Function:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify({ error: `Gagal menjana pelan guru ganti: ${err instanceof Error ? err.message : "Unknown error"}` })
    };
  }
};
