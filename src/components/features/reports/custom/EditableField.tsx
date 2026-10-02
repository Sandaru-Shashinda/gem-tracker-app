import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

import { textWidth, wrapText } from "@/lib/text-layout"

/**
 * Editing a certificate's text on the certificate itself.
 *
 * A custom card has no form behind it on purpose: a row's label, its value and the
 * headline are all typed where they will be printed, because the only question worth
 * asking about a one-off certificate is what it looks like. That rules out a text input
 * with a border and a background of its own — the field has to be the printed text
 * until the moment somebody clicks it, and has to go back to being the printed text the
 * moment they are done.
 *
 * So each field draws its own printed span and swaps in an editor only while it holds
 * focus. {@link EditableText} sizes that editor to the text it contains, which is what
 * keeps a row from jumping as the dotted leader gives up its width; {@link EditableOverlay}
 * lays the editor over a block whose lines have already been measured and broken, where
 * an inline swap would reflow the whole block.
 *
 * The card is drawn twice — once on screen, once off-screen for the exporters — and only
 * the screen copy passes `editable`. Nothing here can reach the PNG or the PDF.
 */

/** CSS the two editors share. Mounted once by the builder, alongside the card. */
export const EDITABLE_FIELD_STYLES = `
  .crc-editable {
    cursor: text;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
    transition: background-color 0.12s ease, box-shadow 0.12s ease;
  }
  .crc-editable:hover {
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.55);
  }
  .crc-editor {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-align: inherit;
    background-color: #ffffff;
    border: none;
    border-radius: 2px;
    outline: 2px solid rgba(37, 99, 235, 0.7);
    padding: 0;
    margin: 0;
    resize: none;
  }
  .crc-row-delete { opacity: 0; transition: opacity 0.12s ease; }
  .crc-row:hover .crc-row-delete, .crc-row-delete:focus-visible { opacity: 1; }
`

interface EditableTextProps {
  value: string
  onChange: (next: string) => void
  /** False renders the printed span and nothing else — the exporters' copy is never editable. */
  editable: boolean
  /**
   * Printed in place of an empty value — the standard card's own "-" for a data row.
   * It reaches the PNG and the PDF, so it is text the certificate is willing to carry;
   * anything that is only there to be clicked belongs in {@link EditableTextProps.hint}.
   */
  placeholder?: string
  /**
   * Shown faintly, on screen only, when a field is empty and has no printed placeholder.
   * Without it an empty field collapses to nothing and there is no way back into it.
   */
  hint?: string
  /** Canvas font shorthand of the printed text, used to size the editor to what it holds. */
  font: string
  /** Applied to the printed span and the editor alike, so the swap moves nothing. */
  style?: CSSProperties
  minWidth?: number
  maxWidth?: number
  title?: string
  /** Tracking the field is drawn with — a canvas font shorthand cannot carry it. */
  letterSpacing?: number
  /** Set when the field is drawn in caps, so it is measured in caps. */
  uppercase?: boolean
}

/** An editor that grows with its text, for fields printed on a single line. */
export function EditableText({
  value,
  onChange,
  editable,
  placeholder = "",
  hint = "edit",
  font,
  style,
  minWidth = 40,
  maxWidth = 260,
  title,
  letterSpacing = 0,
  uppercase = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  // What the field held when it was opened, so Escape has something to put back.
  const entryValue = useRef(value)

  if (!editable) return <span style={style}>{value || placeholder}</span>

  const printed = value || placeholder

  if (editing) {
    const drawn = uppercase ? value.toUpperCase() : value
    const width = Math.min(Math.max(textWidth(drawn, font, letterSpacing) + 6, minWidth), maxWidth)
    return (
      <input
        className='crc-editor'
        autoFocus
        value={value}
        style={{ ...style, width: `${width}px` }}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            onChange(entryValue.current)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <span
      className='crc-editable'
      title={title}
      tabIndex={0}
      role='button'
      style={style}
      onClick={() => {
        entryValue.current = value
        setEditing(true)
      }}
      onFocus={() => {
        entryValue.current = value
        setEditing(true)
      }}
    >
      {printed || <span style={{ opacity: 0.35 }}>{hint}</span>}
    </span>
  )
}

interface EditableOverlayProps {
  value: string
  onChange: (next: string) => void
  editable: boolean
  /** The value as the card actually prints it — measured, broken and cut to fit. */
  children: ReactNode
  multiline?: boolean
  /** Font the editor sets its own text in. It overlays the block rather than replacing it. */
  editorStyle?: CSSProperties
  style?: CSSProperties
  title?: string
  /**
   * Set to drive the editor from outside. The comments block needs it: its first line
   * shares a row with its own label, so the block has no single click target covering
   * the value and nothing else — it opens the editor from two of its own instead.
   */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
}

/**
 * An editor laid over a block whose lines are already settled.
 *
 * The gem name and the comments are both broken to fit a fixed box before they are
 * drawn, so swapping either for an inline input would re-break everything under it on
 * every keystroke. The printed block stays where it is and holds the space; the editor
 * sits on top of it.
 */
export function EditableOverlay({
  value,
  onChange,
  editable,
  children,
  multiline = false,
  editorStyle,
  style,
  title,
  editing: controlledEditing,
  onEditingChange,
}: EditableOverlayProps) {
  const [ownEditing, setOwnEditing] = useState(false)
  const controlled = controlledEditing !== undefined
  const editing = controlled ? controlledEditing : ownEditing
  const entryValue = useRef(value)

  const setEditing = (next: boolean) => {
    if (next) entryValue.current = value
    if (controlled) onEditingChange?.(next)
    else setOwnEditing(next)
  }

  const open = () => setEditing(true)

  const keys = (e: { key: string; currentTarget: { blur: () => void }; shiftKey: boolean }) => {
    // Enter commits a single-line field; a comment block needs it for its own breaks.
    if (e.key === "Enter" && (!multiline || !e.shiftKey)) e.currentTarget.blur()
    if (e.key === "Escape") {
      onChange(entryValue.current)
      setEditing(false)
    }
  }

  return (
    <div style={{ position: "relative", ...style }}>
      {editable && !editing && !controlled ? (
        <div
          className='crc-editable'
          title={title}
          role='button'
          tabIndex={0}
          onClick={open}
          onFocus={open}
        >
          {children}
        </div>
      ) : (
        children
      )}

      {editable && editing &&
        (multiline ? (
          <textarea
            className='crc-editor'
            autoFocus
            value={value}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...editorStyle }}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={keys}
          />
        ) : (
          <input
            className='crc-editor'
            autoFocus
            value={value}
            style={{ position: "absolute", inset: 0, width: "100%", ...editorStyle }}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={keys}
          />
        ))}
    </div>
  )
}

interface EditableWrapTextProps {
  value: string
  onChange: (next: string) => void
  /** False renders the printed span and nothing else — the exporters' copy is never editable. */
  editable: boolean
  /** Printed in place of an empty value — the card's own "-" for a data row. */
  placeholder?: string
  /** Shown faintly, on screen only, when the field is empty and prints nothing. */
  hint?: string
  /**
   * The value slot's own layout: its flex sizing and its alignment. Applied to the one
   * element that is both the printed value and, while editing, the editor — which is the
   * whole point of this component.
   */
  style?: CSSProperties
  title?: string
  /** Canvas font shorthand the value is set in, so its lines can be measured. */
  font: string
  /** Widest a line of the value may run before it wraps. */
  maxTextWidth: number
  /** Space between the dotted leader and the value, in px. */
  gutter?: number
}

/**
 * The slot's width: the widest of its wrapped lines, once it has more than one.
 *
 * Left to the browser, a wrapped value's box is always the full maximum width — CSS
 * does not shrink a box to the widest line it broke into. The text is right-aligned in
 * that box, so whenever the first line is shorter than the maximum there was an empty
 * strip between the end of the dotted leader and the first word, and the leader seemed
 * to stop short of the value it was leading to. Sizing the box to its widest line puts
 * that line flush against the leader.
 *
 * The lines are broken here with the same measure the comments use, and the box is
 * given a couple of pixels over the widest so the browser, measuring a hair differently
 * from the canvas, breaks the text where these lines did rather than a word earlier. A
 * value that fits on one line is left to size itself, exactly as it always has.
 */
function wrappedWidth(text: string, font: string, maxTextWidth: number): number | null {
  const lines = wrapText(text, { width: maxTextWidth, maxLines: 100, font })
  if (lines.length < 2) return null
  const widest = Math.max(...lines.map((line) => textWidth(line, font)))
  return Math.min(maxTextWidth, Math.ceil(widest) + 2)
}

/** Row values are one line of prose: line breaks and runs of whitespace print as a space. */
const toRowValue = (text: string) => text.replace(/\s+/g, " ")

/**
 * A row value that wraps onto further lines once it reaches its slot's maximum width,
 * and is edited in place without changing shape.
 *
 * A row's value used to be edited in a single-line input sized to its text, which was
 * right for a short value and wrong for a long one: past the input's width the text
 * scrolled sideways inside it, while the printed row simply ran on. A textarea does not
 * fix that. Its width does not follow its text, so in a label ···· value row it either
 * needs a width nobody can know in advance or takes every pixel the leader had.
 *
 * So the slot itself becomes editable. It is the same element with the same styles
 * whether it is being edited or printed, and it breaks its lines where the export will.
 *
 * Two rules keep contentEditable honest under React. While editing, React renders the
 * element with no children and the text is handed to the DOM once, when editing starts —
 * if React reconciled the text on each keystroke, the caret would jump to the start
 * every time. And the DOM text is cleared before editing ends, so the text React then
 * renders into the element is not appended to what the user typed.
 */
export function EditableWrapText({
  value,
  onChange,
  editable,
  placeholder = "",
  hint = "edit",
  style,
  title,
  font,
  maxTextWidth,
  gutter = 0,
}: EditableWrapTextProps) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  // What the field held when it was opened: the text handed to the DOM, and what Escape
  // puts back.
  const entryValue = useRef(value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!editing || !el) return
    el.textContent = entryValue.current
    el.focus()
    // Caret to the end, where a click on the printed text would expect to resume.
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [editing])

  const width = wrappedWidth(value || placeholder, font, maxTextWidth)
  const slot: CSSProperties = {
    ...style,
    paddingLeft: gutter ? `${gutter}px` : undefined,
    maxWidth: `${maxTextWidth + gutter}px`,
    width: width === null ? undefined : `${width + gutter}px`,
  }

  if (!editable) return <span style={slot}>{value || placeholder}</span>

  const open = () => {
    entryValue.current = value
    setEditing(true)
  }

  if (editing) {
    return (
      <span
        ref={ref}
        className='crc-editor'
        contentEditable
        role='textbox'
        // A little room to click into when the value is empty.
        style={{ ...slot, minWidth: "40px" }}
        onInput={(e) => onChange(toRowValue(e.currentTarget.textContent ?? ""))}
        onBlur={(e) => {
          e.currentTarget.textContent = ""
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === "Escape") {
            e.preventDefault()
            onChange(entryValue.current)
            e.currentTarget.blur()
          }
          // Bold, italic and underline would style the text while editing and then vanish
          // on save, since only the text is kept.
          if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) {
            e.preventDefault()
          }
        }}
        onPaste={(e) => {
          // Text only: a paste from a document would otherwise bring its formatting in.
          e.preventDefault()
          const text = toRowValue(e.clipboardData.getData("text/plain"))
          document.execCommand("insertText", false, text)
        }}
      />
    )
  }

  const printed = value || placeholder
  return (
    <span
      className='crc-editable'
      title={title}
      tabIndex={0}
      role='button'
      style={slot}
      onClick={open}
      onFocus={open}
    >
      {printed || <span style={{ opacity: 0.35 }}>{hint}</span>}
    </span>
  )
}
