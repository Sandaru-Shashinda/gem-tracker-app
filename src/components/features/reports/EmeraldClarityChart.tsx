import type { CSSProperties } from "react"
import {
  CLARITY_ENHANCEMENT_GRADES,
  clarityKey,
  EMERALD_CLARITY_GRADES,
  type ClarityCell,
} from "@/lib/clarity"

interface EmeraldClarityChartProps {
  grade?: string
  enhancement?: string
  /** Each report's own cell and marker styles, so the chart matches the sheet it is on. */
  cellStyle: CSSProperties
  activeCellStyle: CSSProperties
  tableStyle: CSSProperties
  /** Type size of the graded rows, when it differs from the headings above them. */
  gradeFontSize?: string
  /**
   * Tighter cells for a sheet with no room to spare. The A5 prints two tables where the
   * standard scale is one, in the same column above its QR code and footer.
   */
  compact?: boolean
  /** Click a grade to mark it, click it again to leave the scale unmarked. */
  editable?: boolean
  onGradeChange?: (next: string) => void
  onEnhancementChange?: (next: string) => void
}

/**
 * The emerald clarity chart: the clarity scale, then the clarity enhancement scale, each
 * with the stone's grade marked. Printed in place of the standard chart for an emerald.
 */
export function EmeraldClarityChart({
  grade,
  enhancement,
  cellStyle,
  activeCellStyle,
  tableStyle,
  gradeFontSize,
  compact = false,
  editable = false,
  onGradeChange,
  onEnhancementChange,
}: EmeraldClarityChartProps) {
  if (compact) {
    const tight: CSSProperties = { padding: "1px 2px", fontSize: "6.5px", lineHeight: 1.15 }
    cellStyle = { ...cellStyle, ...tight }
    activeCellStyle = { ...activeCellStyle, ...tight }
  }

  const captionStyle: CSSProperties = {
    fontFamily: cellStyle.fontFamily,
    fontSize: cellStyle.fontSize,
    fontWeight: 700,
    color: "#111",
    margin: compact ? "0 0 1px" : "0 0 2px",
  }

  const gradeRow = (
    cells: readonly ClarityCell[],
    marked: string | undefined,
    onChange?: (next: string) => void,
  ) => {
    const current = clarityKey(marked)
    return cells.map(({ key, label }) => {
      const active = key === current
      const clickable = editable && onChange
      return (
        <td
          key={key}
          onClick={clickable ? () => onChange(active ? "" : key) : undefined}
          title={clickable ? "Click to mark this grade" : undefined}
          style={{
            ...(active ? activeCellStyle : cellStyle),
            ...(gradeFontSize && { fontSize: gradeFontSize }),
            cursor: clickable ? "pointer" : undefined,
          }}
        >
          {label}
        </td>
      )
    })
  }

  const [none, ...classes] = CLARITY_ENHANCEMENT_GRADES

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? "3px" : "6px" }}>
      <div>
        <p style={captionStyle}>Clarity</p>
        <table style={tableStyle}>
          <tbody>
            <tr>
              {EMERALD_CLARITY_GRADES.map(({ key, name }) => (
                <td key={key} style={cellStyle}>
                  {name}
                </td>
              ))}
            </tr>
            <tr>{gradeRow(EMERALD_CLARITY_GRADES, grade, onGradeChange)}</tr>
          </tbody>
        </table>
      </div>

      <div>
        <p style={captionStyle}>Clarity Enhancement</p>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td rowSpan={2} style={cellStyle}>
                {none.name}
              </td>
              <td colSpan={classes.length} style={cellStyle}>
                Classification of Clarity Enhancement
              </td>
            </tr>
            <tr>
              {classes.map(({ key, name }) => (
                <td key={key} style={cellStyle}>
                  {name}
                </td>
              ))}
            </tr>
            <tr>{gradeRow(CLARITY_ENHANCEMENT_GRADES, enhancement, onEnhancementChange)}</tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
