export interface Teacher {
  id: string;
  name: string;
}

export interface AbsentTeacherInfo {
  key: string; // For React list keys
  id: string;
  reason: string;
}

export interface ScheduleEntry {
  day: string;
  time: string;
  class: string;
  subject: string;
  teacherId: string;
}

export interface Substitution {
  day: string;
  time: string;
  class: string;
  subject: string;
  absentTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  justification: string;
}