import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to guard against accidental navigation with unsaved changes.
 * Handles both browser tab/window closes (beforeunload) and in-app navigation (guardedNavigate & back button).
 *
 * @param {boolean} isDirty - Whether there are unsaved changes
 * @returns {object} { showPrompt, guardedNavigate, confirmNavigation, cancelNavigation }
 */
export const useUnsavedChangesWarning = (isDirty) => {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // 1. Guard against browser tab closing / refreshing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 2. Guard against in-app link / button navigation
  const guardedNavigate = useCallback((to, options) => {
    if (isDirty) {
      setPendingAction(() => () => navigate(to, options));
      setShowPrompt(true);
    } else {
      navigate(to, options);
    }
  }, [isDirty, navigate]);

  // 3. Guard a generic callback action (e.g. custom back handler)
  const guardedAction = useCallback((actionFn) => {
    if (isDirty) {
      setPendingAction(() => actionFn);
      setShowPrompt(true);
    } else {
      actionFn();
    }
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    setShowPrompt(false);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  }, [pendingAction]);

  const cancelNavigation = useCallback(() => {
    setShowPrompt(false);
    setPendingAction(null);
  }, []);

  return {
    showPrompt,
    guardedNavigate,
    guardedAction,
    confirmNavigation,
    cancelNavigation
  };
};
