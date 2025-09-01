import type { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenAI, Type } from "@google/genai";
import type { Teacher, ScheduleEntry, Substitution } from '../../src/types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    Anda adalah Penolong Kanan Pentadbiran. Cari guru ganti terbaik untuk SEMUA guru tidak hadir pada hari ${absenceDay}.
    Kembalikan jawapan dalam **JSON sahaja**, ikut skema ditetapkan.

    Hari Tidak Hadir: ${absenceDay}
    Senarai Guru Tidak Hadir:
${absentTeacherDetails}

    Jadual Penuh Hari ${absenceDay}: ${JSON.stringify(relevantTimetableForDay)}
    Senarai Semua Guru: ${JSON.stringify(allTeachers)}

    Jadual Guru Tidak Hadir: ${JSON.stringify(absentTeachersSchedules)}
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
    required: ["day","time","class","subject","absentTeacherName","substituteTeacherId","substituteTeacherName","justification"]
  },
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { "Allow": "POST", "Content-Type": "text/plain" },
      body: "Method Not Allowed"
    };
  }

  try {
    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');

    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Missing required fields in request body." })
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

    const jsonText = response.text?.trim() ?? "";

    // **Extra safe logging**
    console.log("AI Raw Response:", jsonText);

    if (!jsonText) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "AI response kosong atau tidak valid.", raw: jsonText })
      };
    }

    let result: Substitution[];
    try {
      result = JSON.parse(jsonText);
    } catch (err) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "AI response bukan JSON sah.", raw: jsonText })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Gagal menjana pelan guru ganti: ${errorMessage}` })
    };
  }
};
