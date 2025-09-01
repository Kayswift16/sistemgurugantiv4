import type { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenAI, Type } from "@google/genai";
import type { Teacher, ScheduleEntry, Substitution } from '../../src/types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generate AI prompt
const generatePrompt = (
  absentTeachersInfo: { teacher: Teacher; reason: string }[],
  allTeachers: Teacher[],
  timetable: ScheduleEntry[],
  absenceDay: string,
): string => {
  const upperCaseAbsenceDay = absenceDay.toUpperCase();
  const relevantTimetableForDay = timetable.filter(entry => entry.day.toUpperCase() === upperCaseAbsenceDay);
  
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
Berdasarkan data yang diberikan, sila laksanakan langkah-langkah berikut untuk hari ${absenceDay} SAHAJA:
1. Kenal pasti semua slot waktu guru yang tidak hadir.
2. Guru yang tidak hadir TIDAK BOLEH dicadangkan sebagai ganti.
3. Cari guru berkelapangan untuk setiap slot kosong.
4. Cadangkan SATU guru ganti untuk setiap slot. Elakkan guru ganti bertindih masa.
5. Keutamaan: 
   a. Guru yang mengajar subjek yang sama
   b. Guru yang mengajar kelas yang sama
   c. Guru yang mempunyai beban waktu paling sedikit
6. Sertakan justifikasi ringkas untuk setiap cadangan.
7. Kembalikan jawapan dalam format JSON sahaja mengikut skema.

Jadual guru tidak hadir pada hari ${absenceDay}:
${JSON.stringify(absentTeachersSchedules)}
  `;
};

// Schema expected from AI
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
    required: [
      "day", "time", "class", "subject", 
      "absentTeacherName", "substituteTeacherId", 
      "substituteTeacherName", "justification"
    ]
  },
};

// Netlify Function handler
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        "Allow": "POST",
        "Content-Type": "text/plain"
      },
      body: 'Method Not Allowed',
    };
  }

  try {
    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');

    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields in the request body." })
      };
    }

    const prompt = generatePrompt(absentTeachersInfo, allTeachers, timetable, absenceDay);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    });

    // Guard against empty AI output
    if (!response.text || response.text.trim() === '') {
      throw new Error("AI response is empty or invalid JSON.");
    }

    let result: Substitution[];
    try {
      result = JSON.parse(response.text.trim()) as Substitution[];
    } catch (err) {
      console.error("AI JSON parse error:", response.text);
      throw new Error("Failed to parse AI response as JSON.");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Gagal menjana pelan guru ganti: ${errorMessage}` })
    };
  }
};
