import React from 'react';
import { Substitution, Teacher } from '../types';

interface SubstitutionCardProps {
  substitution: Substitution;
  availableTeachers: Teacher[];
  onSubstituteChange: (newTeacherId: string) => void;
  onCustomSubstituteNameChange: (newName: string) => void;
  isEditing: boolean;
}

const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const UserCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
);

const BookOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
);

const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ substitution, availableTeachers, onSubstituteChange, onCustomSubstituteNameChange, isEditing }) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
            <div className="bg-sky-100 text-sky-600 p-2 rounded-full">
                <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-800">{substitution.day} - {substitution.time}</p>
              <p className="text-slate-500 font-medium">{substitution.class}</p>
              <p className="text-xs text-slate-400 mt-1">Menggantikan: {substitution.absentTeacherName}</p>
            </div>
        </div>
        <div className="bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-2">
            <BookOpenIcon className="w-4 h-4" />
            {substitution.subject}
        </div>
      </div>

      <div className="bg-slate-50 rounded-md p-4 mt-4 border border-slate-200">
        <label htmlFor={`substitute-teacher-${substitution.time}-${substitution.class}`} className="text-sm font-medium text-slate-500 mb-2 block">
          Guru Ganti Dicadangkan:
        </label>
        {isEditing ? (
          <div>
            <select
              id={`substitute-teacher-${substitution.time}-${substitution.class}`}
              value={substitution.substituteTeacherId}
              onChange={(e) => onSubstituteChange(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-bold text-emerald-700 text-lg"
            >
              {!availableTeachers.some(t => t.id === substitution.substituteTeacherId) && substitution.substituteTeacherId !== 'LAIN_LAIN' && (
                <option key={substitution.substituteTeacherId} value={substitution.substituteTeacherId}>
                  {substitution.substituteTeacherName}
                </option>
              )}
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
              <option value="LAIN_LAIN">Lain-lain</option>
            </select>
             {substitution.substituteTeacherId === 'LAIN_LAIN' && (
                <input
                    type="text"
                    value={substitution.substituteTeacherName}
                    onChange={(e) => onCustomSubstituteNameChange(e.target.value)}
                    placeholder="Masukkan nama pengganti"
                    className="mt-2 block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 text-emerald-700 font-semibold"
                    aria-label="Nama Guru Ganti Lain-lain"
                />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
              <UserCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">
                {substitution.substituteTeacherName || (substitution.substituteTeacherId === 'LAIN_LAIN' ? '(Nama belum diisi)' : 'N/A')}
              </p>
            </div>
          </div>
        )}
        <p className="text-sm text-slate-600 italic mt-2">"{substitution.justification}"</p>
      </div>
    </div>
  );
};

export default SubstitutionCard;
