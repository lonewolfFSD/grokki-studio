import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface UnsavedToastProps {
  visible: boolean;
  shaking: boolean;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

export const UnsavedToast: React.FC<UnsavedToastProps> = ({
  visible,
  shaking,
  saving,
  onReset,
  onSave,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className={`fixed bottom-0 left-0 right-0 w-full z-50 ${
            shaking ? 'toast-shake' : ''
          }`}
        >
          <div className="w-full bg-white dark:bg-[#13141a] text-gray-900 dark:text-gray-100 px-8 py-3.5 flex items-center justify-between border-t border-gray-200 dark:border-[#1e2029] shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-900 dark:text-gray-100 flex-shrink-0" />
              <strong className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Careful — you have unsaved changes!
              </strong>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={onReset}
                disabled={saving}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:underline cursor-pointer bg-transparent border-none py-1.5 px-3 transition-colors disabled:opacity-50"
              >
                Reset
              </button>

              <button
                onClick={onSave}
                disabled={saving}
                aria-label={saving ? 'Saving changes' : 'Save Changes'}
                className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs h-9 min-w-[115px] px-5 rounded-lg transition-all cursor-pointer border-none shadow-md flex items-center justify-center disabled:opacity-85"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white dark:text-gray-900" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
