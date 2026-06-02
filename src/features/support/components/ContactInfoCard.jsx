import React from 'react';
import { Mail, Clock, ShieldAlert } from 'lucide-react';
import { Icon as Iconify } from '@iconify/react';
import { useLanguage } from '../../../contexts/LanguageContext';

const ContactInfoCard = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-3xl border border-border p-6 md:p-8 shadow-sm space-y-6 h-full flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-primary-text text-body-lg mb-1">{t.support.contactInfo}</h3>
          <p className="text-body-sm text-secondary-text">{t.support.contactInfoDesc}</p>
        </div>

        {/* Contact list */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-primary shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-caption font-bold text-secondary-text  tracking-wider">{t.support.supportEmail}</p>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=mfuture561@gmail.com" target="_blank" rel="noopener noreferrer" className="text-body-sm font-semibold text-primary-text hover:text-primary transition-colors">
                mfuture561@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-caption font-bold text-secondary-text tracking-wider">{t.support.operatingHours}</p>
              <p className="text-body-sm font-semibold text-primary-text leading-tight">
                {t.support.workingDays}
              </p>
              <p className="text-caption text-secondary-text mt-0.5">{t.support.operatingHoursDesc}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-caption font-bold text-secondary-text tracking-wider">{t.support.securityPrivacy}</p>
              <p className="text-caption font-medium text-secondary-text leading-relaxed">
                {t.support.securityPrivacyDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="border-t border-border/60 pt-6">
        <p className="text-caption font-bold text-secondary-text uppercase tracking-wider mb-3">{t.support.followUs}</p>
        <div className="flex items-center gap-3">
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-secondary-text hover:text-primary hover:border-primary/30 hover:bg-bg-secondary/30 transition-all cursor-pointer"
            title="LinkedIn"
          >
            <Iconify icon="mdi:linkedin" width={18} height={18} />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-secondary-text hover:text-primary hover:border-primary/30 hover:bg-bg-secondary/30 transition-all cursor-pointer"
            title="Twitter / X"
          >
            <Iconify icon="ri:twitter-x-fill" width={18} height={18} />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-secondary-text hover:text-primary hover:border-primary/30 hover:bg-bg-secondary/30 transition-all cursor-pointer"
            title="GitHub"
          >
            <Iconify icon="mdi:github" width={18} height={18} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoCard;
