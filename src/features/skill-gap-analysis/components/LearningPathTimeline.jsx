import React from 'react';
import { ExternalLink, CheckCircle2, AlertCircle, PlayCircle, Check } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const LearningPathTimeline = ({ pathData, completedCourses = [], onToggleCourse, ownedSkills = [] }) => {
  const { t } = useLanguage();
  const isEmpty = !pathData || pathData.length === 0;

  const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();
  const isCompletedCourse = (courseId) => {
    const normalizedCourseId = normalizeCourseId(courseId);
    if (!normalizedCourseId || !Array.isArray(completedCourses)) return false;

    return completedCourses.some((completedCourseId) => {
      const normalizedCompletedCourseId = normalizeCourseId(completedCourseId);
      return normalizedCompletedCourseId === normalizedCourseId
        || normalizedCourseId.endsWith(`-${normalizedCompletedCourseId}`)
        || normalizedCompletedCourseId.endsWith(`-${normalizedCourseId}`);
    });
  };

  return (
    <div className="mt-8 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
      <div className="mb-8">
        <h3 className="text-subtitle font-bold text-slate-800">{t.career.learningPathTitle}</h3>
        <p className="text-slate-500 mt-1 text-caption">{t.skillGap.learningPathSubtitle}</p>
      </div>

      {isEmpty ? (
        <div className="p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
          <p className="text-body-sm font-semibold text-slate-600 mb-1">{t.skillGap.learningPathUnavailable}</p>
          <p className="text-caption text-slate-400 max-w-sm">
            {t.skillGap.learningPathUnavailableDesc}
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-indigo-100 ml-4 md:ml-6 space-y-10">
          {pathData.map((course, index) => {
            const isHighPriority = course.prioritas === "Tinggi";
            const isCompleted = isCompletedCourse(course.id);
            const priorityVal = course.prioritas === "Tinggi" 
              ? t.skillGap.priorityHigh 
              : course.prioritas === "Sedang" 
                ? t.skillGap.priorityMedium 
                : t.skillGap.priorityLow;
            
            return (
              <div key={course.id} className="relative pl-8 md:pl-10">
                
                {/* Timeline Checkbox Button */}
                {isCompleted ? (
                  <button 
                    onClick={() => onToggleCourse && onToggleCourse(course.id)}
                    title={t.career.markUncompleted}
                    className="absolute -left-[17px] top-1 bg-emerald-600 border-4 border-emerald-100 w-8 h-8 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-emerald-700 transition-all duration-200 z-10"
                  >
                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                  </button>
                ) : (
                  <button 
                    onClick={() => onToggleCourse && onToggleCourse(course.id)}
                    title={t.career.markCompleted}
                    className="absolute -left-[17px] top-1 bg-white border-4 border-indigo-100 w-8 h-8 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:border-indigo-400 group/btn transition-all duration-200 z-10"
                  >
                    <span className="text-caption font-extrabold text-indigo-600 group-hover/btn:hidden">{index + 1}</span>
                    <Check className="w-3.5 h-3.5 text-indigo-400 hidden group-hover/btn:block stroke-[3px]" />
                  </button>
                )}

                <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group ${
                  isCompleted 
                    ? 'bg-emerald-50/10 border-emerald-100' 
                    : 'bg-white border-slate-100'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    
                    {/* Info Left */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded text-caption font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t.skillGap.doneLabel}
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-caption font-bold ${
                            isHighPriority ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {t.skillGap.priorityLabel(priorityVal)}
                          </span>
                        )}
                        <span className="text-caption font-medium text-slate-300">•</span>
                        <span className="text-caption font-extrabold text-indigo-600">
                          {course.platform}
                        </span>
                      </div>
                      
                      <h4 className={`text-body font-bold mb-2 transition-colors ${
                        isCompleted 
                          ? 'text-slate-400 line-through' 
                          : 'text-slate-800 group-hover:text-indigo-600'
                      }`}>
                        {course.judul}
                      </h4>
                      
                      <p className={`text-caption leading-relaxed mb-4 ${
                        isCompleted ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {course.deskripsi}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-caption font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="text-slate-400">{t.skillGap.targetSkill}</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isCompleted ? 'bg-slate-50 text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {course.skill}
                          </span>
                        </div>
                        
                        {course.prasyarat && course.prasyarat.length > 0 && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="text-slate-400">{t.skillGap.prerequisite}</span>
                            <div className="flex items-center gap-2">
                              {course.prasyarat.map((req, idx) => {
                                const ownedMockSkills = ownedSkills && ownedSkills.length > 0 ? ownedSkills : ["Problem Solving", "React", "Communication", "Laravel"];
                                const hasSkill = ownedMockSkills.includes(req);
                                
                                return (
                                  <span key={idx} className="flex items-center gap-1 text-caption">
                                    {hasSkill ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                    <span className={hasSkill ? 'text-emerald-700' : 'text-amber-700'}>{req}</span>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CTA Right */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                      <div className="text-caption font-extrabold text-slate-600 mb-0 lg:mb-4 flex items-center gap-1">
                        ⏱ {course.durasi}
                      </div>
                      
                      <a 
                        href={course.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-body-sm transition-all focus:ring-4 ${
                          isCompleted 
                            ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 focus:ring-slate-50' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-100'
                        }`}
                      >
                        <PlayCircle className="w-4 h-4" />
                        {isCompleted ? t.career.learnAgain : t.career.startCourse}
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearningPathTimeline;
