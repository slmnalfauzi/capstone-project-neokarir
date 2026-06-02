import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { authStaggerVariants, authItemVariants } from '../../../utils/animations';
import { useForgotPasswordForm } from '../hooks/useForgotPasswordForm';
import FormInput from '../../../components/ui/FormInput';
import Button from '../../../components/ui/Button';

const ForgotPasswordForm = () => {
  const {
    email,
    errors,
    isSubmitting,
    isSuccess,
    handleChange,
    handleSubmit,
    handleReset,
  } = useForgotPasswordForm();

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        /* ── Success State ── */
        <motion.div
          key="success"
          variants={authStaggerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="flex flex-col items-center text-center gap-4"
        >
          {/* Ikon animasi sukses */}
          <motion.div 
            variants={authItemVariants}
            className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </motion.div>
          </motion.div>

          <motion.h2 
            variants={authItemVariants}
            className="text-lg font-bold text-primary-text"
          >
            Permintaan Terkirim
          </motion.h2>

          <motion.p 
            variants={authItemVariants}
            className="text-sm text-secondary-text leading-relaxed max-w-sm"
          >
            Jika email tersebut terdaftar, kami telah mengirimkan link untuk mengatur ulang password.
            Silakan periksa kotak masuk atau folder spam Anda.
          </motion.p>

          <motion.div variants={authItemVariants} className="w-full mt-2">
            <Link to="/login">
              <Button variant="primary" className="w-full py-3.5 text-body">
                <ArrowLeft size={16} className="mr-2" />
                Kembali ke Login
              </Button>
            </Link>
          </motion.div>

          <motion.p
            variants={authItemVariants}
            className="text-xs text-secondary-text mt-1"
          >
            Tidak menerima email?{' '}
            <button
              type="button"
              onClick={handleReset}
              className="font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none cursor-pointer"
            >
              Kirim ulang
            </button>
          </motion.p>
        </motion.div>
      ) : (
        /* ── Form State ── */
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          variants={authStaggerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="flex flex-col gap-5"
        >
          <motion.p 
            variants={authItemVariants} 
            className="text-sm text-secondary-text leading-relaxed -mt-2 mb-1"
          >
            Masukkan alamat email yang terdaftar dan kami akan mengirimkan link untuk mengatur ulang password Anda.
          </motion.p>

          <motion.div variants={authItemVariants}>
            <FormInput
              label="Alamat Email"
              id="email"
              type="email"
              placeholder="hello@example.com"
              icon={Mail}
              value={email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
            />
          </motion.div>

          <motion.div variants={authItemVariants}>
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-3.5 text-body"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mr-2"
                  >
                  </motion.div>
                  Mengirim...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Kirim Link Reset
                </>
              )}
            </Button>
          </motion.div>

          <motion.p 
            variants={authItemVariants} 
            className="text-center text-sm text-secondary-text mt-2"
          >
            Ingat password Anda?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Masuk
            </Link>
          </motion.p>
        </motion.form>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordForm;
