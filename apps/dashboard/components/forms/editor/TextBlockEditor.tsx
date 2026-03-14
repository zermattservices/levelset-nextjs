import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import sty from './TextBlockEditor.module.css';

interface TextBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TextBlockEditor({ content, onChange }: TextBlockEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  if (!editor) return null;

  const handleLinkToggle = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  return (
    <div className={sty.editorWrapper}>
      <div className={sty.toolbar}>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('bold') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <FormatBoldIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('italic') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <FormatItalicIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('bulletList') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <FormatListBulletedIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('orderedList') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <FormatListNumberedIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('link') ? sty.toolbarButtonActive : ''}`}
          onClick={handleLinkToggle}
          title="Link"
        >
          <LinkIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
      <div className={sty.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
