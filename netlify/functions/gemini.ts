import type { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenAI, Type } from "@google/genai";
import type { Teacher, ScheduleEntry, Substitution } from '../../src/types';

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
Anda adalah Penolong Kanan Pentadbiran. Tugas anda adalah mencari guru ganti terbaik untuk guru yang tidak hadir pada hari ${absenceDay}.

Hari Tidak Hadir: ${absenceDay}
Guru Tidak Hadir:
${absentTeacherDetails}

Jadual Waktu Hari ${absenceDay}:
${JSON.stringify(relevantTimetableForDay)}

Senarai Semua Guru:
${JSON.stringify(allTeachers)}

Langkah:
1. Kenal pasti semua slot guru yang tidak hadir.
2. Jangan cadangkan guru yang tidak hadir.
3. Cari guru berkelapangan untuk setiap slot.
4. Cadangkan SATU guru ganti paling sesuai.
5. Keutamaan:
   a. Subjek sama
   b. Tahun (kelas) sama
   c. Beban waktu paling rendah
6. Sertakan justifikasi ringkas, masukkan nama guru yang diganti.
7. Kembalikan JSON sahaja mengikut skema.

Jadual gabungan guru yang tidak hadir:
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

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST', 'Content-Type': 'text/plain' }, body: 'Method Not Allowed' };
  }

  try {
    if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');

    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "Missing required fields in request body." })
      };
    }

    const prompt = generatePrompt(absentTeachersInfo, allTeachers, timetable, absenceDay);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      console.warn("AI returned empty response");
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify([])
      };
    }

    let result: Substitution[] = [];
    try {
      result = JSON.parse(rawText);
    } catch (err) {
      console.error("Failed to parse AI JSON:", err, "Raw AI text:", rawText);
      // fallback empty array
      result = [];
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Error in Netlify function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify({ error: `Failed to generate substitution plan: ${errorMessage}` })
    };
  }
};
