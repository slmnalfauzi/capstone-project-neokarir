import React, { useState } from 'react';
import { Save, CheckCircle, Loader2, LogOut, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../../components/ui/Card';
import PasswordInput from '../../../components/ui/PasswordInput';
import Button from '../../../components/ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';

const AccountSecurityTab = ({ security, updateSecurity, removeSession, onSave, isSaving, saveSuccess, isDeletingAccount, handleDeleteAccount }) => {
  const { t } = useLanguage();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const onConfirmDelete = async () => {
    if (!deletePassword) return;
    try {
      await handleDeleteAccount(deletePassword);
      setIsDeleteModalOpen(false);
      setDeletePassword('');
    } catch (error) {
      // Error handled by the hook
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletePassword('');
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-security"
      aria-labelledby="tab-security"
      className="space-y-6 animate-fade-in"
    >
      {/* Change Password */}
      <Card className="!p-6 md:!p-8">
        <h3 className="text-body-lg font-bold text-primary-text mb-1">
          {t.profile.changePassword}
        </h3>
        <p className="text-body-sm text-secondary-text mb-6">
          {t.profile.passwordSecDesc}
        </p>

        <div className="space-y-4 max-w-md">
          <PasswordInput
            label={t.profile.currentPassword}
            id="security-current-password"
            placeholder={t.profile.currentPasswordPlaceholder}
            value={security.currentPassword}
            onChange={(e) => updateSecurity('currentPassword', e.target.value)}
          />

          <PasswordInput
            label={t.profile.newPassword}
            id="security-new-password"
            placeholder={t.profile.newPasswordPlaceholder}
            showStrength={true}
            value={security.newPassword}
            onChange={(e) => updateSecurity('newPassword', e.target.value)}
          />

          <PasswordInput
            label={t.profile.confirmPassword}
            id="security-confirm-password"
            placeholder={t.profile.confirmPasswordPlaceholder}
            value={security.confirmPassword}
            onChange={(e) => updateSecurity('confirmPassword', e.target.value)}
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving || !security.currentPassword || !security.newPassword || !security.confirmPassword}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {t.common.saving}
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={16} className="mr-2" />
                {t.common.saved}
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                {t.profile.updatePassword}
              </>
            )}
          </Button>
          {saveSuccess && (
            <span className="text-caption text-success font-medium animate-fade-in">
              {t.profile.securitySaveSuccess}
            </span>
          )}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="!p-6 md:!p-8 !border-error/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-error" />
          </div>
          <div className="flex-1">
            <h3 className="text-body-lg font-bold text-error mb-1">
              {t.profile.dangerZone}
            </h3>
            <p className="text-body-sm text-secondary-text mb-4">
              {t.profile.dangerZoneDesc}
            </p>
            <Button
              variant="outline"
              className="!border-error !text-error hover:!bg-error-light"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              {t.profile.deleteAccount}
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-error-light text-error rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Hapus Akun Permanen
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Tindakan ini tidak dapat dibatalkan. Masukkan kata sandi Anda untuk mengonfirmasi penghapusan akun.
                </p>
                
                <div className="w-full mb-6 text-left">
                  <PasswordInput
                    label="Kata Sandi Saat Ini"
                    id="confirm-delete-password"
                    placeholder="Masukkan kata sandi"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="secondary"
                    onClick={closeDeleteModal}
                    className="flex-1 justify-center"
                    disabled={isDeletingAccount}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onConfirmDelete}
                    disabled={!deletePassword || isDeletingAccount}
                    className="flex-1 justify-center !bg-error hover:!bg-error/90 !text-white !border-transparent"
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Menghapus...
                      </>
                    ) : (
                      'Hapus Akun'
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

export default AccountSecurityTab;
