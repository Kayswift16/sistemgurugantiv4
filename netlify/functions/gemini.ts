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
Anda adalah Penolong Kanan Pentadbiran yang bijak di sebuah sekolah. Tugas anda adalah untuk mencari guru ganti terbaik untuk SEMUA guru yang tidak hadir pada hari tertentu.

MAKLUMAT KES:
- Hari Tidak Hadir: ${absenceDay}
- Senarai Guru Tidak Hadir:
${absentTeacherDetails}
- Jadual Waktu Penuh Sekolah untuk Hari ${absenceDay}: ${JSON.stringify(relevantTimetableForDay)}
- Senarai Semua Guru: ${JSON.stringify(allTeachers)}

TUGASAN:
1. Untuk SETIAP guru yang tidak hadir, kenal pasti semua slot waktu mengajar mereka.
2. Guru yang berada dalam "Senarai Guru Tidak Hadir" TIDAK BOLEH dicadangkan sebagai guru ganti.
3. Untuk setiap slot yang kosong, cari semua guru yang berkelapangan (tidak mempunyai kelas dan tidak termasuk dalam senarai guru tidak hadir).
4. Cadangkan SATU guru ganti yang paling sesuai untuk setiap slot. Elakkan seorang guru ganti ditugaskan pada dua kelas yang berbeza pada masa yang sama.
5. Keutamaan:
   a. Guru yang mengajar subjek yang sama.
   b. Guru yang mengajar di tahun (kelas) yang sama.
   c. Guru yang mempunyai beban waktu mengajar paling sedikit.
6. Sediakan justifikasi ringkas untuk setiap cadangan. Masukkan nama guru yang digantikan dalam justifikasi.
7. Kembalikan jawapan anda dalam format JSON sahaja.

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
      headers: { Allow: 'POST', 'Content-Type': 'text/plain' },
      body: 'Method Not Allowed',
    };
  }

  try {
    if (!process.env.API_KEY) {
      throw new Error("Pemboleh ubah persekitaran API_KEY tidak ditetapkan pada pelayan.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { absentTeachersInfo, allTeachers, timetable, absenceDay } = JSON.parse(event.body || '{}');

    if (!absentTeachersInfo || !allTeachers || !timetable || !absenceDay) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "Medan yang diperlukan tiada dalam badan permintaan." })
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

    // Safety wrapper untuk JSON parsing
    const jsonText = response.text?.trim();
    if (!jsonText) {
      console.error("AI response kosong!");
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "AI tidak menghasilkan sebarang output. Cuba lagi." })
      };
    }

    let result: Substitution[] = [];
    try {
      result = JSON.parse(jsonText);
    } catch (err) {
      console.error("JSON parse gagal:", err, "AI response:", jsonText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ error: "Respons AI bukan JSON yang sah. Sila semak log." })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Ralat dalam fungsi Netlify:", error);
    const errorMessage = error instanceof Error ? error.message : "Berlaku ralat yang tidak diketahui.";
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      body: JSON.stringify({ error: `Gagal menjana pelan guru ganti: ${errorMessage}` })
    };
  }
};
