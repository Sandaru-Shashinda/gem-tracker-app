import { useEffect, useState } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  /** Sanitised HTML from the API, or plain text for a post written before the editor. */
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  "aria-invalid"?: boolean
  "aria-labelledby"?: string
}

/**
 * Posts written before the editor existed are plain text with blank lines for
 * paragraphs. Loading one of those straight in would collapse it into a single
 * run-on paragraph, so it is promoted to the paragraphs its author meant.
 * Anything already carrying a tag is left alone.
 */
const toEditorHtml = (value: string) => {
  const text = value ?? ""
  if (!text.trim()) return ""
  if (/<[a-z][\s\S]*>/i.test(text)) return text

  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = paragraph
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
      return `<p>${escaped}</p>`
    })
    .join("")
}

/** A toolbar button; its pressed state doubles as the "is this mark on" readout. */
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      // Without this the button takes focus on mousedown and the selection the
      // command is about to act on is gone by the time it runs.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!isActive}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors",
        "hover:bg-slate-100 hover:text-slate-900",
        "disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden='true' className='mx-0.5 h-5 w-px bg-slate-200' />
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined
    const href = window.prompt("Link address", current ?? "https://")
    // Cancelling leaves the selection alone; clearing the box removes the link.
    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run()
  }

  return (
    <div className='flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5'>
      <ToolbarButton
        label='Bold'
        disabled={disabled}
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Italic'
        disabled={disabled}
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Underline'
        disabled={disabled}
        isActive={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Strikethrough'
        disabled={disabled}
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={15} />
      </ToolbarButton>

      <Divider />

      {/* No H1: the article's one H1 is its title, which grc.lk prints itself. */}
      <ToolbarButton
        label='Heading'
        disabled={disabled}
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Subheading'
        disabled={disabled}
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label='Bulleted list'
        disabled={disabled}
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Numbered list'
        disabled={disabled}
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Quote'
        disabled={disabled}
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label='Add link'
        disabled={disabled}
        isActive={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Remove link'
        disabled={disabled || !editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label='Undo'
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        label='Redo'
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={15} />
      </ToolbarButton>
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledBy,
}: RichTextEditorProps) {
  // The toolbar's pressed states have to follow the caret, and the editor
  // instance is stable across those moves, so a re-render is asked for by hand.
  const [, forceUpdate] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          // Mirrors the API's allowlist, so a destination the editor accepts is
          // one that survives being saved.
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "tiptap-body focus:outline-none",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      // An editor emptied by hand still reports "<p></p>". Reporting "" instead
      // keeps the form's required check a plain truthiness test.
      onChange(editor.isEmpty ? "" : editor.getHTML())
    },
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    onTransaction: () => forceUpdate((n) => n + 1),
  })

  // The modal keeps this mounted while it switches between posts, so content is
  // pushed in when the post being edited changes. Comparing against the editor's
  // own HTML first stops this from fighting the typing it just reported, which
  // would reset the caret on every keystroke.
  useEffect(() => {
    if (!editor) return
    const next = toEditorHtml(value)
    const current = editor.isEmpty ? "" : editor.getHTML()
    if (next === current) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        ariaInvalid && "border-destructive ring-destructive/20",
        disabled && "opacity-50",
      )}
    >
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent
        editor={editor}
        className='tiptap-shell max-h-[340px] overflow-y-auto px-3 py-2 text-sm'
      />
    </div>
  )
}
