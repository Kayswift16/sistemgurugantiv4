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
Anda adalah Penolong Kanan Pentadbiran. Cari guru ganti terbaik untuk guru yang tidak hadir pada hari ${absenceDay}.

Data:
Hari Tidak Hadir: ${absenceDay}
Guru Tidak Hadir:
${absentTeacherDetails}

Jadual Hari ${absenceDay}:
${JSON.stringify(relevantTimetableForDay)}

Semua Guru:
${JSON.stringify(allTeachers)}

Langkah-langkah:
1. Kenal pasti semua slot guru yang tidak hadir.
2. Jangan cadangkan guru yang tidak hadir.
3. Cari guru berkelapangan untuk setiap slot.
4. Cadangkan SATU guru ganti paling sesuai.
5. Keutamaan:
   a. Subjek sama
   b. Tahun (kelas) sama
   c. Beban waktu paling rendah
6. Sertakan justifikasi ringkas, masukkan nama guru yang diganti.

Hanya kembalikan JSON array sahaja, ikut format ini:

[
  {
    "day": "Hari",
    "time": "Masa",
    "class": "Kelas",
    "subject": "Subjek",
    "absentTeacherName": "Nama guru yang diganti",
    "substituteTeacherId": "ID guru ganti",
    "substituteTeacherName": "Nama guru ganti",
    "justification": "Ringkasan kenapa guru ini dipilih"
  }
]

Jika tiada cadangan, kembalikan array kosong [].

Jadual gabungan guru tidak hadir:
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
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain', Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');

    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "Missing required fields." })
      };
    }

    const prompt = generatePrompt(absentTeachersInfo, allTeachers, timetable, absenceDay);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("AI response did not contain any text.");

    const result = JSON.parse(jsonText.trim()) as Substitution[];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Error in Netlify function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify({ error: `Gagal menjana pelan guru ganti: ${errorMessage}` })
    };
  }
};
