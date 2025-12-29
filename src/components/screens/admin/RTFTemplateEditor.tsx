import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'quill/dist/quill.snow.css';
import '../../../client/utils/placeholderBlot'; // Register custom blot
import {
  ALLOWED_PLACEHOLDERS,
  PLACEHOLDER_LABELS,
  createEditorModules,
  FORMATS,
  PlaceholderField,
  validatePlaceholders,
} from '../../../client/utils/rtfEditorConfig';
import { convertHtmlToRtf } from 'html-to-rtf';

interface RTFTemplateEditorProps {
  initialContent?: string; // Initial HTML content
  templateId?: number; // If editing existing template
  onSave?: (rtfContent: string, htmlContent: string) => Promise<void>;
  onCancel?: () => void;
}

export function RTFTemplateEditor({
  initialContent = '',
  templateId,
  onSave,
  onCancel,
}: RTFTemplateEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const placeholderMenuRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>(initialContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);

  // Update content when initialContent prop changes (for editing existing templates)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  /**
   * Handle placeholder insertion from toolbar
   */
  const handleInsertPlaceholder = useCallback(() => {
    setShowPlaceholderMenu(!showPlaceholderMenu);
  }, [showPlaceholderMenu]);

  /**
   * Insert a specific placeholder at cursor position
   */
  const insertPlaceholder = useCallback((field: PlaceholderField) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection();
    const index = range?.index || 0;

    // Insert the custom placeholder blot
    editor.insertEmbed(index, 'placeholder', field);

    // Move cursor after the placeholder
    editor.setSelection(index + 1, 0);

    setShowPlaceholderMenu(false);
  }, []);

  /**
   * Editor modules with custom placeholder handler
   * Memoized to prevent unnecessary Quill re-renders
   */
  const modules = useMemo(
    () => createEditorModules(handleInsertPlaceholder),
    [handleInsertPlaceholder]
  );

  /**
   * Add data-testid attributes to Quill toolbar buttons after mount
   */
  useEffect(() => {
    const toolbar = document.querySelector('.ql-toolbar');
    if (toolbar) {
      toolbar.querySelector('.ql-bold')?.setAttribute('data-testid', 'rtf-toolbar-bold');
      toolbar.querySelector('.ql-italic')?.setAttribute('data-testid', 'rtf-toolbar-italic');
      toolbar.querySelector('.ql-underline')?.setAttribute('data-testid', 'rtf-toolbar-underline');
      toolbar.querySelector('.ql-picker.ql-font')?.setAttribute('data-testid', 'rtf-toolbar-font-family');
      toolbar.querySelector('.ql-picker.ql-size')?.setAttribute('data-testid', 'rtf-toolbar-font-size');
      toolbar.querySelector('[value="ordered"]')?.setAttribute('data-testid', 'rtf-toolbar-numbered-list');
      toolbar.querySelector('[value="bullet"]')?.setAttribute('data-testid', 'rtf-toolbar-bullet-list');
      toolbar.querySelector('.ql-better-table')?.setAttribute('data-testid', 'rtf-toolbar-table');

      // Find the placeholder insert button (custom button)
      const buttons = toolbar.querySelectorAll('button');
      buttons.forEach(button => {
        if (button.className.includes('ql-placeholder-insert')) {
          button.setAttribute('data-testid', 'rtf-placeholder-insert');
        }
      });
    }
  }, []);

  /**
   * Click-away handler for placeholder menu
   */
  useEffect(() => {
    if (!showPlaceholderMenu) return;

    const handleClickAway = (event: MouseEvent) => {
      if (placeholderMenuRef.current && !placeholderMenuRef.current.contains(event.target as Node)) {
        setShowPlaceholderMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [showPlaceholderMenu]);

  /**
   * Handle content changes
   */
  const handleChange = (value: string) => {
    setContent(value);
    setValidationError(''); // Clear validation errors on edit
    setSuccessMessage(''); // Clear success messages on edit
  };

  /**
   * Toggle preview mode
   */
  const handleTogglePreview = async () => {
    if (!isPreviewMode) {
      // Switching to preview - generate preview with sample data
      try {
        const response = await fetch('/api/rtf-templates/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ htmlContent: content }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate preview');
        }

        const { previewHtml: generatedHtml } = await response.json();
        setPreviewHtml(generatedHtml);
        setIsPreviewMode(true);
      } catch (error) {
        console.error('[RTFTemplateEditor] Preview generation failed:', error);
        setValidationError('Failed to generate preview. Please check your template content and try again.');
      }
    } else {
      // Switching back to edit mode
      setIsPreviewMode(false);
    }
  };

  /**
   * Handle save with validation
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setValidationError('');

      // Validate placeholders
      const unknownPlaceholders = validatePlaceholders(content);
      if (unknownPlaceholders.length > 0) {
        setValidationError(
          `Unknown placeholders: ${unknownPlaceholders.join(', ')}`
        );
        return;
      }

      // Convert HTML to RTF
      let rtfContent: string;
      try {
        rtfContent = convertHtmlToRtf(content);
      } catch (error) {
        console.error('[RTFTemplateEditor] RTF conversion failed:', error);
        setValidationError('Failed to convert template to RTF format. Please simplify your formatting and try again.');
        return;
      }

      // Validate RTF structure
      if (!rtfContent.startsWith('{\\rtf')) {
        setValidationError('Invalid RTF format generated');
        return;
      }

      // Call save callback
      if (onSave) {
        await onSave(rtfContent, content);
      }

      // Show success message
      setSuccessMessage('Template saved successfully!');
      setValidationError('');
    } catch (error) {
      console.error('[RTFTemplateEditor] Save failed:', error);
      setValidationError('Failed to save template. Please try again or contact support if the problem persists.');
      setSuccessMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="rtf-template-editor-container"
      data-testid="rtf-template-editor"
      role="region"
      aria-label="RTF Template Editor"
    >
      {/* Toolbar - Quill renders this automatically, but we add data-testid */}
      <div data-testid="rtf-toolbar" aria-label="Formatting toolbar" />

      {/* Placeholder Menu */}
      {showPlaceholderMenu && (
        <div
          ref={placeholderMenuRef}
          className="placeholder-menu"
          role="menu"
          aria-label="Insert placeholder"
          style={{
            position: 'absolute',
            top: '50px', // Below toolbar
            right: '16px', // Aligned to right
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            minWidth: '200px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Insert Placeholder
          </div>
          {ALLOWED_PLACEHOLDERS.map((field) => (
            <button
              key={field}
              type="button"
              role="menuitem"
              aria-label={`Insert ${PLACEHOLDER_LABELS[field]} placeholder`}
              onClick={() => insertPlaceholder(field)}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {PLACEHOLDER_LABELS[field]}
            </button>
          ))}
        </div>
      )}

      {/* Editor or Preview Pane */}
      {!isPreviewMode ? (
        <ReactQuill
          ref={quillRef}
          value={content}
          onChange={handleChange}
          modules={modules}
          formats={FORMATS}
          theme="snow"
          placeholder="Enter template content here..."
        />
      ) : (
        <div
          className="preview-pane"
          data-testid="rtf-template-preview-pane"
          role="article"
          aria-label="Template preview"
          style={{
            border: '1px solid #ccc',
            padding: '16px',
            minHeight: '400px',
            backgroundColor: '#f9f9f9',
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          className="success-message"
          data-testid="rtf-template-success-message"
          role="status"
          aria-live="polite"
          style={{
            color: '#2e7d32',
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#e8f5e9',
            border: '1px solid #4caf50',
            borderRadius: '4px',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div
          className="validation-error"
          data-testid="rtf-template-validation-error"
          role="alert"
          aria-live="polite"
          style={{
            color: 'red',
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
          }}
        >
          {validationError}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleTogglePreview}
          data-testid="rtf-template-preview-toggle"
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isPreviewMode ? 'Edit' : 'Preview'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          data-testid="rtf-template-save"
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: isSaving ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>

    </div>
  );
}

export default RTFTemplateEditor;
