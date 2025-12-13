"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = "内容を入力...",
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[150px] p-3 focus:outline-none",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-slate-200 ${
            editor.isActive("bold") ? "bg-slate-200 text-emerald-600" : "text-slate-600"
          }`}
          title="太字"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-slate-200 ${
            editor.isActive("italic") ? "bg-slate-200 text-emerald-600" : "text-slate-600"
          }`}
          title="斜体"
        >
          <span className="italic">I</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-slate-200 ${
            editor.isActive("underline") ? "bg-slate-200 text-emerald-600" : "text-slate-600"
          }`}
          title="下線"
        >
          <span className="underline">U</span>
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-slate-200 ${
            editor.isActive("bulletList") ? "bg-slate-200 text-emerald-600" : "text-slate-600"
          }`}
          title="箇条書き"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-slate-200 ${
            editor.isActive("orderedList") ? "bg-slate-200 text-emerald-600" : "text-slate-600"
          }`}
          title="番号付きリスト"
        >
          1.
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-slate-200 text-slate-600"
          title="区切り線"
        >
          ━
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {editor.isEmpty && (
        <div className="absolute top-[60px] left-3 text-slate-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}










