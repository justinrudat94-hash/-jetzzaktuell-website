let isInEditMode = false;
let hasUnsavedChanges = false;
let onSaveCallback: (() => Promise<void>) | null = null;
let onDiscardCallback: (() => void) | null = null;

export const EditModeState = {
  setEditMode: (value: boolean) => {
    isInEditMode = value;
    console.log('📝 Edit mode set to:', value);
  },

  setUnsavedChanges: (value: boolean) => {
    hasUnsavedChanges = value;
    console.log('💾 Unsaved changes set to:', value);
  },

  isEditMode: () => isInEditMode,

  hasChanges: () => hasUnsavedChanges,

  setCallbacks: (save: (() => Promise<void>) | null, discard: (() => void) | null) => {
    onSaveCallback = save;
    onDiscardCallback = discard;
    console.log('🔧 Callbacks set:', { hasSave: !!save, hasDiscard: !!discard });
  },

  getSaveCallback: () => onSaveCallback,

  getDiscardCallback: () => onDiscardCallback,

  reset: () => {
    isInEditMode = false;
    hasUnsavedChanges = false;
    onSaveCallback = null;
    onDiscardCallback = null;
    console.log('🔄 Edit mode state reset');
  }
};
