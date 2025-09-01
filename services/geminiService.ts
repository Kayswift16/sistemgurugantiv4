import { GoogleGenAI, Type } from "@google/genai";
import { Teacher, ScheduleEntry, Substitution } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generatePrompt = (
  absentTeacher: Teacher,
  reason: string,
  allTeachers: Teacher[],
  timetable: ScheduleEntry[],
  absenceDay: string,
): string => {
  const upperCaseAbsenceDay = absenceDay.toUpperCase();
  
  const relevantTimetableForDay = timetable.filter(entry => entry.day.toUpperCase() === upperCaseAbsenceDay);
  
  const absentTeacherSchedule = relevantTimetableForDay.filter(entry => entry.teacherId === absentTeacher.id);

  return `
    Anda adalah Penolong Kanan Pentadbiran yang bijak di sebuah sekolah. Tugas anda adalah untuk mencari guru ganti terbaik untuk guru yang tidak hadir pada hari tertentu.

    MAKLUMAT KES:
    - Hari Tidak Hadir: ${absenceDay}
    - Guru Tidak Hadir: ${absentTeacher.name} (ID: ${absentTeacher.id})
    - Sebab Tidak Hadir: ${reason}
    - Jadual Waktu Penuh Sekolah untuk Hari ${absenceDay}: ${JSON.stringify(relevantTimetableForDay)}
    - Senarai Semua Guru: ${JSON.stringify(allTeachers)}

    TUGASAN:
    Berdasarkan data yang diberikan, sila laksanakan langkah-langkah berikut untuk hari ${absenceDay} SAHAJA:
    1. Kenal pasti semua slot waktu mengajar untuk guru yang tidak hadir, ${absentTeacher.name}, pada hari ${absenceDay}.
    2. Untuk setiap slot waktu tersebut, cari semua guru yang tidak mempunyai kelas pada masa yang sama pada hari ${absenceDay}.
    3. Daripada senarai guru yang berkelapangan, cadangkan SATU guru ganti yang paling sesuai untuk setiap slot.
    4. Gunakan kriteria berikut untuk membuat cadangan:
        a. Keutamaan Tertinggi: Guru yang mengajar subjek yang sama.
        b. Keutamaan Kedua: Guru yang mengajar di tahun (kelas) yang sama.
        c. Keutamaan Ketiga: Guru yang mempunyai beban waktu mengajar paling sedikit pada hari tersebut untuk mengimbangi beban kerja.
    5. Sediakan justifikasi ringkas untuk setiap cadangan anda.
    6. JANGAN cadangkan guru yang sudah ada kelas pada slot masa tersebut.
    7. Kembalikan jawapan anda dalam format JSON sahaja, mengikut skema yang ditetapkan. Jangan sertakan sebarang teks atau penjelasan di luar struktur JSON.
    
    Berikut adalah jadual guru yang tidak hadir pada hari ${absenceDay}:
    ${JSON.stringify(absentTeacherSchedule)}
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
      substituteTeacherId: { type: Type.STRING },
      substituteTeacherName: { type: Type.STRING },
      justification: { type: Type.STRING },
    },
    required: ["day", "time", "class", "subject", "substituteTeacherId", "substituteTeacherName", "justification"]
  },
};

export const generateSubstitutionPlan = async (
  absentTeachersInfo: { teacher: Teacher; reason: string }[],
  allTeachers: Teacher[],
  timetable: ScheduleEntry[],
  absenceDay: string,
): Promise<Substitution[]> => {
  try {
    const promises = absentTeachersInfo.map(async ({ teacher, reason }) => {
      const prompt = generatePrompt(teacher, reason, allTeachers, timetable, absenceDay);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.2,
        },
      });

      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText) as Omit<Substitution, 'absentTeacherName'>[];
      
      return result.map(sub => ({
        ...sub,
        absentTeacherName: teacher.name,
      }));
    });

    const results = await Promise.all(promises);
    return results.flat().sort((a, b) => a.time.localeCompare(b.time));

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Gagal menjana pelan guru ganti. Sila cuba lagi.");
  }
};