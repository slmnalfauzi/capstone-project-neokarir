import { X, PlayCircle, Check, ExternalLink, Clock, BookOpen } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const RoadmapDrawer = ({ job, completedCourses, toggleCourse, onClose }) => {
  const { t } = useLanguage();

  if (!job) return null;

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

  const jobCourses = job.courses || [];
  const completedJobCourses = jobCourses.filter(c => isCompletedCourse(c.id));
  const completionPercentage = jobCourses.length > 0
    ? Math.round((completedJobCourses.length / jobCourses.length) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
        <div>
          <h3 className="text-body font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
            {t.career.learningPathTitle}
          </h3>
          <p className="text-caption font-semibold text-slate-400 mt-0.5 tracking-wider">
            {t.career.learningPathDesc(job.job_title)}
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-caption font-bold text-slate-700">{t.career.myProgress}</span>
          <span className="text-caption font-extrabold text-indigo-600">
            {t.career.progressFinished(completedJobCourses.length, jobCourses.length, completionPercentage)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-caption text-slate-400 font-semibold mt-2.5">
          {t.career.progressTips}
        </p>
      </div>

      {/* Timeline Steps */}
      <div className="relative border-l-2 border-indigo-100 ml-4 pl-6 space-y-6">
        {jobCourses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-caption text-slate-400 font-medium">
              {t.career.noRoadmap}
            </p>
          </div>
        ) : (
          jobCourses.map((course, index) => {
            const isCompleted = isCompletedCourse(course.id);
            const isHighPriority = course.prioritas === 'Tinggi';
            
            return (
              <div key={course.id} className="relative">
                
                {/* Timeline Circle Button */}
                {isCompleted ? (
                  <button 
                    onClick={() => toggleCourse(course.id)}
                    title={t.career.markUncompleted}
                    className="absolute -left-[35px] top-0.5 bg-emerald-600 border-4 border-emerald-100 w-6.5 h-6.5 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-emerald-700 transition-all duration-200 z-10"
                  >
                    <Check className="w-3 h-3 text-white stroke-[3px]" />
                  </button>
                ) : (
                  <button 
                    onClick={() => toggleCourse(course.id)}
                    title={t.career.markCompleted}
                    className="absolute -left-[35px] top-0.5 bg-white border-4 border-indigo-100 w-6.5 h-6.5 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:border-indigo-400 group/btn transition-all duration-200 z-10"
                  >
                    <span className="text-caption font-extrabold text-indigo-600 group-hover/btn:hidden">{index + 1}</span>
                    <Check className="w-3 h-3 text-indigo-400 hidden group-hover/btn:block stroke-[3px]" />
                  </button>
                )}

                {/* Course card */}
                <div 
                  className={`rounded-xl border p-4 transition-all duration-200 group
                    ${isCompleted 
                      ? 'bg-emerald-50/10 border-emerald-100' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-caption font-bold bg-indigo-50 text-indigo-600">
                      {course.skill}
                    </span>
                    <span className="text-caption font-bold text-slate-400">
                      • {course.platform}
                    </span>
                    {isHighPriority && (
                      <span className="ml-auto text-caption font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                        {t.career.highPriorityBadge}
                      </span>
                    )}
                  </div>

                  <h4 className={`text-caption font-bold mb-1 transition-colors leading-tight
                    ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-indigo-600'}
                  `}>
                    {course.judul}
                  </h4>

                  <p className={`text-caption leading-relaxed mb-3
                    ${isCompleted ? 'text-slate-400' : 'text-slate-500'}
                  `}>
                    {course.deskripsi}
                  </p>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2.5">
                    <span className="flex items-center gap-1 text-caption font-semibold text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {course.durasi}
                    </span>

                    <a 
                      href={course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-extrabold border transition-all cursor-pointer
                        ${isCompleted
                          ? 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                          : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:shadow-2xs'
                        }
                      `}
                    >
                      <PlayCircle className="w-3 h-3" />
                      {isCompleted ? t.career.learnAgain : t.career.startCourse}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoadmapDrawer;
