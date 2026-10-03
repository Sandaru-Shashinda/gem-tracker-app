interface HandSignatureProps {
  /** The signatory's signature: a transparent PNG data URI from their profile. */
  src: string
  /** Height of the blank above the signature rule, in report pixels. */
  space: number
  /** Widest it may run — the rule's own width. */
  maxWidth: number
}

/**
 * How tall the signature stands, as a multiple of the blank above the rule. The blank is
 * only as tall as the gap the scanned signature beside it leaves; a signature held to it
 * came out a third the size of that one. It rises into the open space above instead, and
 * never down over the name under the rule.
 */
const SIGNATURE_RISE = 2.2

/**
 * The signatory's signature, written onto the typed signature field of a digital report.
 *
 * On paper the tester signs that field by hand, in the blank left above its dotted rule;
 * the copy a QR scan opens had nothing there, so it read as an unsigned certificate. This
 * draws their uploaded signature in the same place, sitting on the rule the way ink does.
 *
 * Placed inside the blank, which must be positioned. Only the digital copy passes a
 * signature; the copy downloaded for printing leaves the blank for the pen.
 */
export function HandSignature({ src, space, maxWidth }: HandSignatureProps) {
  return (
    <img
      src={src}
      alt='Signature'
      style={{
        position: "absolute",
        left: 0,
        bottom: "-2px",
        height: `${space * SIGNATURE_RISE}px`,
        maxWidth: `${maxWidth}px`,
        objectFit: "contain",
        objectPosition: "left bottom",
        pointerEvents: "none",
      }}
    />
  )
}
