
import { Teacher, ScheduleEntry } from './types';

export const TEACHERS: Teacher[] = [
  { id: 'MJ', name: 'Moktar bin Jaman' },
  { id: 'KV', name: 'Kenny Voo Kai Lin' },
  { id: 'MN', name: 'Muhd Nazmi bin Rosli' },
  { id: 'MA', name: 'Mohamad Ali bin Kaling' },
  { id: 'BB', name: 'Baby Trucy Sedrek' },
  { id: 'FS', name: 'Florida Engillia Sim' },
  { id: 'SD', name: 'Surayadi binti Drahman' },
  { id: 'JL', name: 'Jessy Lessy' },
  { id: 'NS', name: 'Nur Syafiqah binti Roslan' },
  { id: 'IM', name: 'Idrus bin Matjisin' },
  { id: 'NZ', name: 'Mohd Nazrin bin Ibrahim' },
  { id: 'AY', name: 'Amy Syahida binti Ahbasah' },
];

const timeSlots = [
    "0720-0750", "0750-0820", "0820-0850", "0850-0920", "0920-0950", 
    "1010-1040", "1040-1110", "1110-1140", "1140-1210", "1210-1240"
];

const rawData = {
    ISNIN: {
        "TAHUN 1": ["BM/NS", "BM/NS", "PK/NZ", "BI/FS", "BI/FS", "PM/AY", "PM/AY", "MT/SD", "MT/SD", ""],
        "TAHUN 2": ["BM/JL", "BM/JL", "BM/JL", "SN/MA", "SN/MA", "PM/MN", "PM/MN", "BI/FS", "BI/FS", ""],
        "TAHUN 3": ["SN/KV", "SN/KV", "BI/BB", "BI/BB", "MT/NS", "PM/SD", "PM/SD", "BM/JL", "BM/JL", ""],
        "TAHUN 4": ["BI/MN", "BI/MN", "MT/IM", "SN/AY", "SN/AY", "BM/NS", "BM/NS", "MZ/KV", "PS/BB", "PS/BB"],
        "TAHUN 5": ["BI/FS", "BI/FS", "MT/SD", "BM/NZ", "BM/NZ", "SN/JL", "PM/BB", "PM/BB", "RBT/AY", "RBT/AY"],
        "TAHUN 6": ["BI/BB", "SEJ/AY", "SEJ/AY", "MT/IM", "MT/IM", "BM/NZ", "BM/NZ", "MZ/IM", "SN/MA", "SN/MA"],
    },
    SELASA: {
        "TAHUN 1": ["", "BM/NS", "BM/NS", "BI/FS", "BI/FS", "MT/SD", "MT/SD", "PS/NS", "PS/NS", ""],
        "TAHUN 2": ["", "BM/JL", "BM/JL", "PM/MN", "PM/MN", "MT/KV", "MT/KV", "BI/FS", "BI/FS", ""],
        "TAHUN 3": ["PH", "PH", "PH", "PH", "PH", "BM/JL", "BM/JL", "PS/SD", "PS/SD", ""],
        "TAHUN 4": ["", "MT/IM", "MT/IM", "RBT/AY", "RBT/AY", "BM/NS", "BM/NS", "SN/AY", "BI/MN", "BI/MN"],
        "TAHUN 5": ["", "BI/FS", "BI/FS", "MT/SD", "MT/SD", "SEJ/AY", "SEJ/AY", "BM/NZ", "PM/BB", "PM/BB"],
        "TAHUN 6": ["", "BM/NZ", "BM/NZ", "MT/IM", "MT/IM", "MT/IM", "BI/BB", "BI/BB", "SN/MA", "SN/MA"],
    },
    RABU: {
        "TAHUN 1": ["BI/FS", "BI/FS", "PM/AY", "BM/NS", "BM/NS", "BM/NS", "MZ/KV", "PM/AY", "PM/AY", ""],
        "TAHUN 2": ["PM/MN", "PJ/IM", "PJ/IM", "BM/JL", "BM/JL", "BI/FS", "BI/FS", "MT/KV", "MT/KV", ""],
        "TAHUN 3": ["MT/NS", "MT/NS", "PM/SD", "BI/BB", "BI/BB", "BM/JL", "BM/JL", "PM/SD", "PM/SD", ""],
        "TAHUN 4": ["PJ/NZ", "PJ/NZ", "BI/MN", "SEJ/AY", "SEJ/AY", "PM/SD", "PM/SD", "BM/NS", "BM/NS", "PK/NZ"],
        "TAHUN 5": ["PJ/MA", "PJ/MA", "PM/BB", "BI/FS", "BI/FS", "MZ/AY", "BM/NZ", "BM/NZ", "SN/JL", "SN/JL"],
        "TAHUN 6": ["PS/SD", "PS/SD", "BM/NZ", "MT/IM", "MT/IM", "PM/MJ", "PM/MJ", "BI/BB", "BI/BB", "PK/MA"],
    },
    KHAMIS: {
        "TAHUN 1": ["BI/FS", "PJ/NZ", "PJ/NZ", "BM/NS", "BM/NS", "SN/AY", "SN/AY", "MT/SD", "MT/SD", ""],
        "TAHUN 2": ["MT/KV", "MT/KV", "BI/FS", "BI/FS", "PK/AY", "PS/FS", "PS/FS", "BM/JL", "BM/JL", ""],
        "TAHUN 3": ["BM/JL", "BM/JL", "MZ/SD", "BI/BB", "BI/BB", "SN/KV", "SN/KV", "MT/NS", "MT/NS", ""],
        "TAHUN 4": ["BM/NS", "SN/AY", "SN/AY", "PM/SD", "PM/SD", "BI/MN", "BI/MN", "MT/IM", "MT/IM", ""],
        "TAHUN 5": ["MT/SD", "MT/SD", "SN/JL", "SN/JL", "BI/FS", "BM/NZ", "BM/NZ", "PS/AY", "PS/AY", ""],
        "TAHUN 6": ["BI/BB", "BI/BB", "SN/MA", "PM/MJ", "PM/MJ", "RBT/BB", "RBT/BB", "BM/NZ", "BM/NZ", ""],
    },
    JUMAAT: {
        "TAHUN 1": ["BI/FS", "BI/FS", "SN/AY", "SN/AY", "MT/SD", "BM/NS", "BM/NS", "", "", ""],
        "TAHUN 2": ["BM/JL", "BM/JL", "MT/KV", "BI/FS", "MZ/IM", "SN/MA", "SN/MA", "", "", ""],
        "TAHUN 3": ["BI/BB", "PJ/NZ", "PJ/NZ", "MT/NS", "MT/NS", "BM/JL", "BM/JL", "", "", ""],
        "TAHUN 4": ["BM/NS", "BM/NS", "PM.SD", "BI/MN", "BI/MN", "MT/IM", "MT/IM", "", "", ""],
        "TAHUN 5": ["MT/SD", "MT/SD", "PK/MA", "BM/NZ", "BM/NZ", "BI/FS", "BI/FS", "", "", ""],
        "TAHUN 6": ["PJ/MA", "PJ/MA", "PM/MJ", "BI/BB", "BI/BB", "BM/NZ", "BM/NZ", "", "", ""],
    }
};

export const TIMETABLE: ScheduleEntry[] = [];

Object.entries(rawData).forEach(([day, classes]) => {
    Object.entries(classes).forEach(([className, subjects]) => {
        subjects.forEach((subjectTeacher, index) => {
            if (subjectTeacher && subjectTeacher !== "PH" && subjectTeacher.includes('/')) {
                const [subject, teacherId] = subjectTeacher.split('/');
                TIMETABLE.push({
                    day,
                    time: timeSlots[index],
                    class: className,
                    subject,
                    teacherId: teacherId.trim()
                });
            } else if (subjectTeacher === "PM.SD") { // Handle typo from OCR
                 TIMETABLE.push({
                    day,
                    time: timeSlots[index],
                    class: className,
                    subject: "PM",
                    teacherId: "SD"
                });
            }
        });
    });
});
