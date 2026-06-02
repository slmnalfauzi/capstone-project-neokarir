import { X, Plus, BrainCog, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../../components/ui/Card';
import FormInput from '../../../components/ui/FormInput';
import Button from '../../../components/ui/Button';
import { BriefcaseBusiness, Target } from 'lucide-react';
import { EDUCATION_LEVELS, IT_DOMAINS } from '../../onboarding/data/onboardingData';
import { useLanguage } from '../../../contexts/LanguageContext';

const CareerSkillsTab = ({
  careerInfo,
  updateCareerInfo,
  addSkill,
  removeSkill,
  newSkill,
  setNewSkill,
  isReprocessing,
  handleReprocess,
  isModalOpen,
  openModal,
  closeModal,
  onSave,
  isSaving,
  saveSuccess
}) => {
  const { t } = useLanguage();

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      addSkill(newSkill.trim());
      setNewSkill('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-career"
      aria-labelledby="tab-career"
      className="space-y-6 animate-fade-in"
    >
      {/* Career Information */}
      <Card className="!p-6 md:!p-8">
        <h3 className="text-body-lg font-bold text-primary-text mb-1">
          {t.profile.careerInfoTitle}
        </h3>
        <p className="text-body-sm text-secondary-text mb-6">
          {t.profile.careerInfoDesc}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormInput
            label={t.profile.currentRole}
            id="career-current-role"
            placeholder="e.g. Full Stack Developer"
            icon={BriefcaseBusiness}
            value={careerInfo.currentRole}
            onChange={(e) => updateCareerInfo('currentRole', e.target.value)}
          />

          <FormInput
            label={t.profile.targetRole}
            id="career-target-role"
            placeholder="e.g. Senior Full Stack Developer"
            icon={Target}
            value={careerInfo.targetRole}
            onChange={(e) => updateCareerInfo('targetRole', e.target.value)}
          />

          {/* Target Domain select */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="career-target-domain"
              className="text-sm font-semibold text-primary-text"
            >
              Target Domain
            </label>
            <select
              id="career-target-domain"
              value={careerInfo.targetDomain}
              onChange={(e) => updateCareerInfo('targetDomain', e.target.value)}
              className="
                w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary-text
                transition-all duration-200 outline-none appearance-none cursor-pointer
                border-border hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10
              "
            >
              <option value="" disabled>Pilih Target Domain</option>
              {IT_DOMAINS.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          {/* Experience Level select */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="career-experience"
              className="text-sm font-semibold text-primary-text"
            >
              {t.profile.experienceLevel}
            </label>
            <select
              id="career-experience"
              value={careerInfo.experienceLevel}
              onChange={(e) => updateCareerInfo('experienceLevel', e.target.value)}
              className="
                w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary-text
                transition-all duration-200 outline-none appearance-none cursor-pointer
                border-border hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10
              "
            >
              <option value="Fresh Graduate">{t.profile.expFresh}</option>
              <option value="Junior (1-2 tahun)">{t.profile.expJunior}</option>
              <option value="Mid-Level (3-5 tahun)">{t.profile.expMid}</option>
              <option value="Senior (5+ tahun)">{t.profile.expSenior}</option>
              <option value="Lead / Manager">{t.profile.expLead}</option>
            </select>
          </div>

          {/* Education Level select */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="career-education"
              className="text-sm font-semibold text-primary-text"
            >
              {t.profile.education}
            </label>
            <select
              id="career-education"
              value={careerInfo.education || 'S1'}
              onChange={(e) => updateCareerInfo('education', e.target.value)}
              className="
                w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary-text
                transition-all duration-200 outline-none appearance-none cursor-pointer
                border-border hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10
              "
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Save career info button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isSaving}
          id="save-career-btn"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              {t.common.saving}
            </>
          ) : saveSuccess ? (
            t.profile.savedStatus
          ) : (
            t.profile.saveCareerInfo
          )}
        </Button>
      </div>

      {/* Skills Section */}
      <Card className="!p-6 md:!p-8">
        <h3 className="text-body-lg font-bold text-primary-text mb-1">
          {t.profile.skills}
        </h3>
        <p className="text-body-sm text-secondary-text mb-4">
          {t.profile.skillsDesc}
        </p>

        {/* Skill chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {careerInfo.skills.map((skill) => (
            <span
              key={skill}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-body-sm font-medium bg-primary-light text-primary
                transition-all duration-200 group
              "
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="p-0.5 rounded-full hover:bg-primary/10 transition-colors"
                aria-label={t.profile.deleteSkillLabel(skill)}
              >
                <X size={12} className="text-primary/60 group-hover:text-primary" />
              </button>
            </span>
          ))}
        </div>

        {/* Add new skill */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              id="career-new-skill"
              placeholder={t.profile.skillsPlaceholder}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyPress}
              className="
                w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-primary-text
                placeholder:text-secondary-text/60
                transition-all duration-200 outline-none
                border-border hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10
              "
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleAddSkill}
            disabled={!newSkill.trim()}
            className="shrink-0"
          >
            <Plus size={16} className="mr-1" />
            {t.profile.addSkill}
          </Button>
        </div>
      </Card>

      {/* Reprocess with AI button */}
      <Card className="!p-6 md:!p-8 border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-body-lg font-bold text-primary-text flex items-center gap-2">
              {t.profile.reprocessTitle}
            </h3>
            <p className="text-body-sm text-secondary-text mt-1">
              {t.profile.reprocessDesc}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={openModal}
            disabled={isReprocessing}
            className="shrink-0"
          >
            {isReprocessing ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {t.profile.reprocessing}
              </>
            ) : (
              <>
                <BrainCog size={16} className="mr-2" />
                {t.profile.reprocessBtn}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t.profile.reprocessModalTitle}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t.profile.reprocessModalDesc}
                </p>
                <div className="flex gap-3 w-full">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    className="flex-1 justify-center"
                    disabled={isReprocessing}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleReprocess}
                    disabled={isReprocessing}
                    className="flex-1 justify-center bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                  >
                    {isReprocessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        {t.profile.reprocessing}
                      </>
                    ) : (
                      t.profile.reprocessModalConfirm
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CareerSkillsTab;
