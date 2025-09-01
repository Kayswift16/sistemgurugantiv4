import { Teacher, ScheduleEntry, Substitution } from '../types';

export const generateSubstitutionPlan = async (
  absentTeachersInfo: { teacher: Teacher; reason: string }[],
  allTeachers: Teacher[],
  timetable: ScheduleEntry[],
  absenceDay: string,
): Promise<Substitution[]> => {
  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        absentTeachersInfo,
        allTeachers,
        timetable,
        absenceDay,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch substitution plan from the API.');
    }

    const plan: Substitution[] = await response.json();
    return plan.sort((a, b) => a.time.localeCompare(b.time));

  } catch (error) {
    console.error("Error calling backend API:", error);
    if (error instanceof Error) {
        throw new Error(`Gagal menjana pelan guru ganti: ${error.message}`);
    }
    throw new Error("Gagal menjana pelan guru ganti. Sila cuba lagi.");
  }
};
