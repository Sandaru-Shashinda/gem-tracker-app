import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./spectrometer.css"

interface Peak {
  idx: number
  wl: number
  intensity: number
  pct: string
}

/** A dark region in the transmitted spectrum — what a gemmologist reads off the chart. */
interface AbsBand {
  idx: number
  wl: number
  wlFrom: number
  wlTo: number
  depth: number
  label: "strong" | "medium" | "weak"
}

type View = "both" | "band" | "graph"

const BAND_LABEL_H = 16
const BAND_H = 58

/* ---- Wavelength → RGB ----
   `falloff` dims the deep violet / far red ends. The absorption band is drawn
   without it so the strip reads like the printed chart: full colour edge to edge. */
function wlToRGB(wl: number, falloff = true): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  if (wl >= 380 && wl < 440) {
    r = (440 - wl) / (440 - 380)
    b = 1
  } else if (wl >= 440 && wl < 490) {
    g = (wl - 440) / (490 - 440)
    b = 1
  } else if (wl >= 490 && wl < 510) {
    g = 1
    b = (510 - wl) / (510 - 490)
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510)
    g = 1
  } else if (wl >= 580 && wl < 645) {
    r = 1
    g = (645 - wl) / (645 - 580)
  } else if (wl >= 645 && wl <= 780) {
    r = 1
  } else if (wl < 380) {
    r = 0.35
    b = 1
  } else {
    r = 1
  }
  let f = 1
  if (falloff) {
    if (wl >= 380 && wl < 420) f = 0.3 + (0.7 * (wl - 380)) / 40
    else if (wl >= 700 && wl <= 780) f = 0.3 + (0.7 * (780 - wl)) / 80
  }
  return [Math.round(r * f * 255), Math.round(g * f * 255), Math.round(b * f * 255)]
}

function maxOf(arr: Float32Array): number {
  let m = 0
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i]
  return m
}

function minOf(arr: Float32Array): number {
  let m = Infinity
  for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i]
  return m === Infinity ? 0 : m
}

/* ---- Moving average, O(n) via a prefix sum ---- */
function smooth(arr: Float32Array, k: number): Float32Array {
  const n = arr.length
  const out = new Float32Array(n)
  if (!n) return out
  const pre = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + arr[i]
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - k)
    const b = Math.min(n - 1, i + k)
    out[i] = (pre[b + 1] - pre[a]) / (b - a + 1)
  }
  return out
}

/* ---- Sliding-window maximum (monotonic deque), O(n) ----
   Used to trace the illumination envelope so only the dips remain. */
function slidingMax(arr: Float32Array, k: number): Float32Array {
  const n = arr.length
  const out = new Float32Array(n)
  const dq: number[] = []
  let head = 0
  for (let i = 0; i < n + k; i++) {
    if (i < n) {
      while (dq.length > head && arr[dq[dq.length - 1]] <= arr[i]) dq.pop()
      dq.push(i)
    }
    const c = i - k
    if (c >= 0 && c < n) {
      while (dq.length > head && dq[head] < c - k) head++
      out[c] = arr[dq[head]]
    }
  }
  return out
}

function percentile(arr: Float32Array, p: number): number {
  const copy = Array.from(arr).sort((a, b) => a - b)
  return copy[Math.min(copy.length - 1, Math.max(0, Math.round(p * (copy.length - 1))))] ?? 0
}

/**
 * Turn one raw luminance scan into a transmission curve (1 = light passes,
 * 0 = fully absorbed). With a captured white-light reference the ratio is the
 * real thing; without one the illumination envelope stands in for it, which is
 * enough to make the absorption bands pop.
 */
function analyse(raw: Float32Array, k: number, ref: Float32Array | null) {
  const s = smooth(raw, k)
  const n = s.length
  let base: Float32Array
  const usingRef = !!ref && ref.length === n
  if (ref && usingRef) {
    base = smooth(ref, Math.max(k, 3))
  } else {
    const win = Math.max(6, Math.round(n * 0.12))
    base = smooth(slidingMax(s, win), Math.round(win / 2))
  }

  // Camera black level: leave a little headroom so a true band still reaches 0.
  const dark = Math.min(minOf(s), minOf(base)) * 0.8
  const trans = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, s[i] - dark)
    const b = Math.max(1e-6, base[i] - dark)
    trans[i] = Math.min(1, v / b)
  }

  if (usingRef) {
    // Exposure between reference and sample rarely matches; rescale to the bright end.
    const p = percentile(trans, 0.98)
    if (p > 0.05) for (let i = 0; i < n; i++) trans[i] = Math.min(1, trans[i] / p)
  }

  return { s, trans, usingRef }
}

/* ---- Emission peak detection (intensity graph) ---- */
function findPeaks(arr: Float32Array, calLeft: number, calRight: number, threshold = 0.25): Peak[] {
  const max = maxOf(arr) || 1
  const peaks: Peak[] = []
  for (let i = 3; i < arr.length - 3; i++) {
    if (
      arr[i] > arr[i - 1] &&
      arr[i] > arr[i + 1] &&
      arr[i] > arr[i - 2] &&
      arr[i] > arr[i + 2] &&
      arr[i] > arr[i - 3] &&
      arr[i] > arr[i + 3] &&
      arr[i] / max > threshold
    ) {
      const wl = Math.round(calLeft + (i / arr.length) * (calRight - calLeft))
      peaks.push({ idx: i, wl, intensity: arr[i], pct: ((arr[i] / max) * 100).toFixed(0) })
    }
  }
  // deduplicate within 10 nm
  const out: Peak[] = []
  for (const p of peaks) {
    if (!out.some((q) => Math.abs(q.wl - p.wl) < 10)) out.push(p)
  }
  return out.slice(0, 10)
}

/* ---- Absorption band detection (dark regions of the strip) ---- */
function findBands(trans: Float32Array, calLeft: number, calRight: number): AbsBand[] {
  const n = trans.length
  if (!n) return []
  const wlAt = (i: number) => Math.round(calLeft + (i / n) * (calRight - calLeft))
  const enter = 0.55 // transmission that opens a band
  const exit = 0.75 // ...and the level it has to climb back over
  const minW = Math.max(2, Math.round(n * 0.005))
  const guard = Math.round(n * 0.015) // frame edges are dark; ignore them
  const out: AbsBand[] = []

  let i = guard
  while (i < n - guard) {
    if (trans[i] < enter) {
      let a = i
      while (a > guard && trans[a - 1] < exit) a--
      let b = i
      while (b < n - guard - 1 && trans[b + 1] < exit) b++
      let mi = a
      let mv = trans[a]
      for (let j = a; j <= b; j++) {
        if (trans[j] < mv) {
          mv = trans[j]
          mi = j
        }
      }
      if (b - a + 1 >= minW) {
        const depth = 1 - mv
        out.push({
          idx: mi,
          wl: wlAt(mi),
          wlFrom: wlAt(a),
          wlTo: wlAt(b),
          depth,
          label: depth > 0.7 ? "strong" : depth > 0.45 ? "medium" : "weak",
        })
      }
      i = b + 1
    } else i++
  }
  return out.sort((x, y) => y.depth - x.depth).slice(0, 8)
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  const c = ctx as CanvasRenderingContext2D & { roundRect?: (...a: number[]) => void }
  if (typeof c.roundRect === "function") {
    c.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function SpectrometerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hiddenCvsRef = useRef<HTMLCanvasElement | null>(null)
  const specCvsRef = useRef<HTMLCanvasElement | null>(null)
  const rainbowCvsRef = useRef<HTMLCanvasElement | null>(null)
  const bandCvsRef = useRef<HTMLCanvasElement | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const pausedRef = useRef(false)

  // Raw (unsmoothed) frame, the smoothed curve, and the transmission curve on screen.
  const lastRawRef = useRef<Float32Array | null>(null)
  const lastSmoothRef = useRef<Float32Array | null>(null)
  const lastTransRef = useRef<Float32Array | null>(null)
  // White-light scan used as the 100 % transmission baseline.
  const refSpectrumRef = useRef<Float32Array | null>(null)

  // Chip lists are throttled so the canvas can still run at full frame rate.
  const chipsKeyRef = useRef("")
  const chipsAtRef = useRef(0)

  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [camState, setCamState] = useState<"idle" | "live" | "error">("idle")
  const [roiPos, setRoiPos] = useState(50)
  const [smoothing, setSmoothing] = useState(5)
  const [contrast, setContrast] = useState(2.2)
  const [view, setView] = useState<View>("both")
  const [hasRef, setHasRef] = useState(false)
  const [calLeft, setCalLeft] = useState(400)
  const [calRight, setCalRight] = useState(700)
  const [calLeftInput, setCalLeftInput] = useState("400")
  const [calRightInput, setCalRightInput] = useState("700")
  const [showCalib, setShowCalib] = useState(false)
  const [peaks, setPeaks] = useState<Peak[]>([])
  const [bands, setBands] = useState<AbsBand[]>([])
  const [status, setStatus] = useState("Camera not started. Click ▶ Start camera.")

  // Live values for the render loop, without re-creating the loop on every change.
  const paramsRef = useRef({ roiPos, smoothing, calLeft, calRight, contrast })

  const axisLabels = useMemo(() => {
    const steps = 7
    return Array.from({ length: steps + 1 }, (_, i) =>
      Math.round(calLeft + (i / steps) * (calRight - calLeft))
    )
  }, [calLeft, calRight])

  /* ---- Absorption strip: the chart-style output ---- */
  const drawBand = useCallback((trans: Float32Array, found: AbsBand[], signal: number) => {
    const cvs = bandCvsRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return

    const W = cvs.offsetWidth || 700
    const H = BAND_LABEL_H + BAND_H
    const dpr = window.devicePixelRatio || 1
    cvs.width = Math.round(W * dpr)
    cvs.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { calLeft: cl, calRight: cr, contrast: gamma } = paramsRef.current
    const n = trans.length

    ctx.clearRect(0, 0, W, H)

    ctx.save()
    roundRectPath(ctx, 0, BAND_LABEL_H, W, BAND_H, 4)
    ctx.clip()
    ctx.fillStyle = "#000"
    ctx.fillRect(0, BAND_LABEL_H, W, BAND_H)
    for (let x = 0; x < W; x++) {
      const idx = n ? Math.min(n - 1, Math.floor((x / W) * n)) : 0
      const wl = cl + (x / W) * (cr - cl)
      // Transmission raised to the contrast exponent: bands go black, the rest stays lit.
      const t = Math.pow(Math.max(0, Math.min(1, n ? trans[idx] : 1)), gamma)
      const [r, g, b] = wlToRGB(wl, false)
      ctx.fillStyle = `rgb(${Math.round(r * t)},${Math.round(g * t)},${Math.round(b * t)})`
      ctx.fillRect(x, BAND_LABEL_H, 1, BAND_H)
    }
    ctx.restore()

    ctx.strokeStyle = "rgba(255,255,255,0.14)"
    ctx.lineWidth = 1
    roundRectPath(ctx, 0.5, BAND_LABEL_H + 0.5, W - 1, BAND_H - 1, 4)
    ctx.stroke()

    if (signal < 8) {
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.font = '11px "Space Mono", monospace'
      ctx.textAlign = "center"
      ctx.fillText("low signal — aim at a brighter source", W / 2, BAND_LABEL_H + BAND_H / 2 + 4)
      ctx.textAlign = "start"
      return
    }

    // Band markers, left to right, skipping any label that would collide.
    ctx.font = '10px "Space Mono", monospace'
    ctx.textAlign = "center"
    let lastRight = -Infinity
    for (const p of [...found].sort((a, b) => a.wl - b.wl)) {
      const x = Math.max(16, Math.min((p.idx / n) * W, W - 16))
      const half = ctx.measureText(`${p.wl}`).width / 2 + 4
      if (x - half < lastRight) continue
      lastRight = x + half
      ctx.fillStyle = "rgba(255,255,255,0.75)"
      ctx.fillText(`${p.wl}`, x, BAND_LABEL_H - 5)
      ctx.strokeStyle = "rgba(255,255,255,0.45)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, BAND_LABEL_H - 3)
      ctx.lineTo(x, BAND_LABEL_H + 5)
      ctx.stroke()
    }
    ctx.textAlign = "start"
  }, [])

  /* ---- Draw rainbow bar (shown when the strip is hidden) ---- */
  const drawRainbow = useCallback(() => {
    const cvs = rainbowCvsRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return
    const { calLeft: cl, calRight: cr } = paramsRef.current
    const W = cvs.offsetWidth || 700
    cvs.width = W
    cvs.height = 18
    for (let x = 0; x < W; x++) {
      const wl = cl + (x / W) * (cr - cl)
      const [r, g, b] = wlToRGB(wl)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, 0, 1, 18)
    }
  }, [])

  /* ---- Grid / background of the graph ---- */
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = "#080810"
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = "rgba(255,255,255,0.05)"
    ctx.lineWidth = 0.5
    for (let i = 1; i < 4; i++) {
      const y = H - (i / 4) * H
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    for (let i = 1; i < 7; i++) {
      const x = (i / 7) * W
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
  }, [])

  /* ---- Intensity graph ---- */
  const drawSpectrum = useCallback(
    (s: Float32Array, found: Peak[]) => {
      const cvs = specCvsRef.current
      if (!cvs) return
      const ctx = cvs.getContext("2d")
      if (!ctx) return

      const W = cvs.offsetWidth || 700
      const H = cvs.offsetHeight || 160
      cvs.width = W
      cvs.height = H

      const { calLeft: cl, calRight: cr } = paramsRef.current
      const max = maxOf(s) || 1

      drawFrame(ctx, W, H)

      // Fill, coloured by wavelength
      for (let x = 0; x < W; x++) {
        const idx = Math.min(s.length - 1, Math.floor((x / W) * s.length))
        const y = H - (s[idx] / max) * (H - 12)
        const wl = cl + (x / W) * (cr - cl)
        const [r, g, b] = wlToRGB(wl)
        ctx.fillStyle = `rgba(${r},${g},${b},0.6)`
        ctx.fillRect(x, y, 1, H - y)
      }

      // Outline
      ctx.beginPath()
      for (let x = 0; x < W; x++) {
        const idx = Math.min(s.length - 1, Math.floor((x / W) * s.length))
        const y = H - (s[idx] / max) * (H - 12)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = "rgba(255,255,255,0.8)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Peaks
      ctx.font = '10px "Space Mono", monospace'
      for (const p of found) {
        const x = (p.idx / s.length) * W
        const y = H - (p.intensity / max) * (H - 12)
        ctx.fillStyle = "#ffcc44"
        ctx.beginPath()
        ctx.arc(x, y - 2, 3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.strokeStyle = "rgba(255,204,68,0.3)"
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x, y + 2)
        ctx.lineTo(x, H)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "#ffcc44"
        const lx = Math.max(2, Math.min(x - 14, W - 46))
        const ly = Math.max(y - 8, 12)
        ctx.fillText(p.wl + "nm", lx, ly)
      }
    },
    [drawFrame]
  )

  /* ---- One frame: analyse once, feed every view ---- */
  const render = useCallback(
    (raw: Float32Array) => {
      const { smoothing: k, calLeft: cl, calRight: cr } = paramsRef.current
      const { s, trans } = analyse(raw, k, refSpectrumRef.current)
      const foundPeaks = findPeaks(s, cl, cr)
      const foundBands = findBands(trans, cl, cr)

      lastRawRef.current = raw
      lastSmoothRef.current = s
      lastTransRef.current = trans

      drawBand(trans, foundBands, maxOf(raw))
      drawSpectrum(s, foundPeaks)
      drawRainbow()

      // Throttle the chip lists (~6 Hz) and skip identical updates.
      const key =
        foundBands.map((b) => `${b.wl}:${b.label}`).join("|") +
        "#" +
        foundPeaks.map((p) => `${p.wl}:${p.pct}`).join("|")
      const now = performance.now()
      if (key !== chipsKeyRef.current && now - chipsAtRef.current > 160) {
        chipsKeyRef.current = key
        chipsAtRef.current = now
        setBands(foundBands)
        setPeaks(foundPeaks)
      }
    },
    [drawBand, drawSpectrum, drawRainbow]
  )

  /* ---- Empty views before the camera starts ---- */
  const drawIdle = useCallback(() => {
    const flat = new Float32Array(700).fill(1)
    drawBand(flat, [], 255)
    drawRainbow()
    const cvs = specCvsRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return
    const W = cvs.offsetWidth || 700
    const H = cvs.offsetHeight || 160
    cvs.width = W
    cvs.height = H
    drawFrame(ctx, W, H)
  }, [drawBand, drawFrame, drawRainbow])

  /* ---- Capture a frame from the ROI band ---- */
  // The loop re-schedules itself through this ref so it never captures a stale closure.
  const loopRef = useRef<() => void>(() => {})
  const scheduleNext = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => loopRef.current())
  }, [])

  const captureFrame = useCallback(() => {
    if (!runningRef.current || pausedRef.current) return
    const video = videoRef.current
    const hidden = hiddenCvsRef.current
    if (!video || !hidden) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) {
      scheduleNext()
      return
    }

    const hCtx = hidden.getContext("2d", { willReadFrequently: true })
    if (!hCtx) return
    hidden.width = vw
    hidden.height = vh
    hCtx.drawImage(video, 0, 0, vw, vh)

    const roiY = Math.floor((vh * paramsRef.current.roiPos) / 100)
    const thickness = Math.max(4, Math.floor(vh * 0.025))
    const y0 = Math.max(0, roiY - thickness)
    const rows = Math.max(1, Math.min(thickness * 2, vh - y0))

    const { data } = hCtx.getImageData(0, y0, vw, rows)
    const spectrum = new Float32Array(vw)
    for (let x = 0; x < vw; x++) {
      let lum = 0
      for (let row = 0; row < rows; row++) {
        const i = (row * vw + x) * 4
        lum += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
      }
      spectrum[x] = lum / rows
    }

    render(spectrum)
    scheduleNext()
  }, [render, scheduleNext])

  useEffect(() => {
    loopRef.current = captureFrame
  }, [captureFrame])

  /* ---- Start camera ---- */
  const startCamera = useCallback(async () => {
    if (runningRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("error")
      setStatus("Camera unavailable — this page needs HTTPS (or localhost).")
      return
    }
    try {
      setStatus("Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      await video.play()

      runningRef.current = true
      pausedRef.current = false
      setRunning(true)
      setPaused(false)
      setCamState("live")
      setStatus("Live. Aim at light source through diffraction grating.")
      captureFrame()
    } catch (e) {
      setCamState("error")
      setStatus("Camera error: " + (e instanceof Error ? e.message : String(e)))
    }
  }, [captureFrame])

  /* ---- Stop camera + release the stream ---- */
  const stopCamera = useCallback(() => {
    runningRef.current = false
    pausedRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
    setPaused(false)
    setCamState("idle")
  }, [])

  const togglePause = useCallback(() => {
    if (!runningRef.current) return
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    setStatus(next ? "Paused — spectrum frozen." : "Live.")
    if (!next) captureFrame()
  }, [captureFrame])

  /* ---- White-light reference ---- */
  const captureReference = useCallback(() => {
    const raw = lastRawRef.current
    if (!raw) {
      setStatus("Nothing to capture yet — start the camera first.")
      return
    }
    refSpectrumRef.current = Float32Array.from(raw)
    setHasRef(true)
    setStatus("Reference captured. Now place the gem in the beam — bands read against it.")
    render(raw)
  }, [render])

  const clearReference = useCallback(() => {
    refSpectrumRef.current = null
    setHasRef(false)
    setStatus("Reference cleared — using the auto illumination baseline.")
    if (lastRawRef.current) render(lastRawRef.current)
  }, [render])

  const applyCalibration = useCallback(() => {
    const l = parseFloat(calLeftInput) || 400
    const r = parseFloat(calRightInput) || 700
    setCalLeft(l)
    setCalRight(r)
    setStatus(`Calibration: ${l}–${r} nm applied.`)
  }, [calLeftInput, calRightInput])

  const resetCalibration = useCallback(() => {
    setCalLeft(400)
    setCalRight(700)
    setCalLeftInput("400")
    setCalRightInput("700")
    setStatus("Calibration reset to 400–700 nm.")
  }, [])

  const savePNG = useCallback(() => {
    if (!lastSmoothRef.current) {
      setStatus("No spectrum captured yet.")
      return
    }
    const parts = [bandCvsRef.current, specCvsRef.current].filter(
      (c): c is HTMLCanvasElement => !!c
    )
    if (!parts.length) return

    const gap = 10
    const pad = 12
    const W = Math.max(...parts.map((c) => c.offsetWidth))
    const H = parts.reduce((sum, c) => sum + c.offsetHeight, 0) + gap * (parts.length - 1)
    const out = document.createElement("canvas")
    out.width = W + pad * 2
    out.height = H + pad * 2
    const ctx = out.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#12121a"
    ctx.fillRect(0, 0, out.width, out.height)
    let y = pad
    for (const c of parts) {
      ctx.drawImage(c, pad, y, c.offsetWidth, c.offsetHeight)
      y += c.offsetHeight + gap
    }

    const link = document.createElement("a")
    link.download = "spectrum_" + Date.now() + ".png"
    link.href = out.toDataURL("image/png")
    link.click()
    setStatus("PNG saved.")
  }, [])

  const saveCSV = useCallback(() => {
    const s = lastSmoothRef.current
    const t = lastTransRef.current
    if (!s) {
      setStatus("No spectrum captured yet.")
      return
    }
    const rows = ["wavelength_nm,intensity,transmission,absorption"]
    for (let i = 0; i < s.length; i++) {
      const wl = (calLeft + (i / s.length) * (calRight - calLeft)).toFixed(2)
      const tr = t ? t[i] : 1
      rows.push(`${wl},${s[i].toFixed(4)},${tr.toFixed(4)},${(1 - tr).toFixed(4)}`)
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "spectrum_" + Date.now() + ".csv"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setStatus("CSV exported.")
  }, [calLeft, calRight])

  // Keep the loop's params in sync and repaint when a control changes.
  useEffect(() => {
    paramsRef.current = { roiPos, smoothing, calLeft, calRight, contrast }
    if (lastRawRef.current) render(lastRawRef.current)
    else drawIdle()
  }, [roiPos, smoothing, calLeft, calRight, contrast, view, render, drawIdle])

  // Repaint on resize (canvas width follows its CSS box).
  useEffect(() => {
    const onResize = () => {
      if (lastRawRef.current) render(lastRawRef.current)
      else drawIdle()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [render, drawIdle])

  // Release the camera when leaving the route.
  useEffect(() => stopCamera, [stopCamera])

  const showBand = view !== "graph"
  const showGraph = view !== "band"

  return (
    <div className='spectro'>
      <header className='spectro-header'>
        <h1>SPECTROMETER</h1>
        <span>diffraction grating · live analysis</span>
      </header>

      <div className='spectro-container'>
        <div className='spectro-viewfinder'>
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={hiddenCvsRef} style={{ display: "none" }} />
          <div
            className='spectro-roi-fill'
            style={{ top: `calc(${roiPos}% - 2.5%)`, height: "5%" }}
          />
          <div className='spectro-roi-line' style={{ top: `${roiPos}%` }} />
          <div
            className='spectro-vf-label spectro-roi-label'
            style={{ top: `calc(${roiPos}% - 18px)` }}>
            sampling band
          </div>
          <div className='spectro-vf-label spectro-cam-status'>
            {camState === "live" ? (
              <>
                <span className='spectro-live-dot' />
                LIVE
              </>
            ) : camState === "error" ? (
              "error"
            ) : (
              "no camera"
            )}
          </div>
        </div>

        <div className='spectro-ctrl-row'>
          <div className='spectro-ctrl-box'>
            <div className='spectro-ctrl-box-label'>
              ROI position <span>{roiPos}%</span>
            </div>
            <input
              type='range'
              min={10}
              max={90}
              step={1}
              value={roiPos}
              onChange={(e) => setRoiPos(Number(e.target.value))}
            />
          </div>
          <div className='spectro-ctrl-box'>
            <div className='spectro-ctrl-box-label'>
              Smoothing <span>{smoothing}</span>
            </div>
            <input
              type='range'
              min={1}
              max={25}
              step={1}
              value={smoothing}
              onChange={(e) => setSmoothing(Number(e.target.value))}
            />
          </div>
          <div className='spectro-ctrl-box'>
            <div className='spectro-ctrl-box-label'>
              Band contrast <span>{contrast.toFixed(1)}×</span>
            </div>
            <input
              type='range'
              min={1}
              max={6}
              step={0.1}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />
          </div>
        </div>

        <div className='spectro-btn-row'>
          <button
            className={`spectro-primary${running ? " spectro-active" : ""}`}
            onClick={startCamera}
            disabled={running}>
            {running ? "● Live" : "▶ Start camera"}
          </button>
          <button
            className={paused ? "spectro-active" : ""}
            onClick={togglePause}
            disabled={!running}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button onClick={stopCamera} disabled={!running}>
            ■ Stop
          </button>
          <button
            className={showCalib ? "spectro-active" : ""}
            onClick={() => setShowCalib((v) => !v)}>
            ⚙ Calibrate
          </button>
          <button onClick={resetCalibration}>↺ Reset</button>
        </div>

        <div className='spectro-btn-row'>
          <button className={hasRef ? "spectro-active" : ""} onClick={captureReference}>
            ◉ Set white reference
          </button>
          <button onClick={clearReference} disabled={!hasRef}>
            ✕ Clear reference
          </button>
        </div>

        {showCalib && (
          <div className='spectro-calib-panel'>
            <div className='spectro-calib-title'>Wavelength calibration</div>
            <div className='spectro-calib-fields'>
              <label htmlFor='spectro-cal-left'>Left edge (nm)</label>
              <input
                id='spectro-cal-left'
                type='number'
                min={300}
                max={600}
                value={calLeftInput}
                onChange={(e) => setCalLeftInput(e.target.value)}
              />
              <label htmlFor='spectro-cal-right'>Right edge (nm)</label>
              <input
                id='spectro-cal-right'
                type='number'
                min={500}
                max={900}
                value={calRightInput}
                onChange={(e) => setCalRightInput(e.target.value)}
              />
              <button onClick={applyCalibration}>Apply</button>
            </div>
            <p className='spectro-calib-hint'>
              Default: 400–700 nm. To calibrate precisely, point at a fluorescent lamp and match
              peaks to known mercury lines: 436 nm (blue), 546 nm (green), 611 nm (orange).
            </p>
          </div>
        )}

        <div className='spectro-block'>
          <div className='spectro-block-head'>
            <div className='spectro-block-title'>
              Absorption spectrum
              <em>{hasRef ? "vs. white reference" : "auto baseline"}</em>
            </div>
            <div className='spectro-view-tabs'>
              {(["band", "both", "graph"] as View[]).map((v) => (
                <button
                  key={v}
                  className={view === v ? "spectro-active" : ""}
                  onClick={() => setView(v)}>
                  {v === "band" ? "Band" : v === "graph" ? "Graph" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {showBand && (
            <canvas
              ref={bandCvsRef}
              className='spectro-band'
              style={{ height: BAND_LABEL_H + BAND_H }}
            />
          )}
          {!showBand && (
            <canvas ref={rainbowCvsRef} className='spectro-rainbow' width={700} height={18} />
          )}

          <div className='spectro-wl-axis'>
            {axisLabels.map((wl, i) => (
              <span key={`${wl}-${i}`}>{wl}</span>
            ))}
          </div>

          {showBand && (
            <div className='spectro-peaks-row'>
              {bands.length === 0 && (
                <div className='spectro-peak-chip spectro-empty'>no absorption bands detected</div>
              )}
              {bands.map((b) => {
                const [r, g, bl] = wlToRGB(b.wl, false)
                return (
                  <div className='spectro-peak-chip' key={`${b.wl}-${b.idx}`}>
                    <i className='spectro-swatch' style={{ background: `rgb(${r},${g},${bl})` }} />
                    <b>{b.wl} nm</b> · {b.wlFrom}–{b.wlTo} · {b.label}
                  </div>
                )
              })}
            </div>
          )}

          {showGraph && (
            <>
              <canvas ref={specCvsRef} className='spectro-graph' width={700} height={160} />
              <div className='spectro-peaks-row'>
                {peaks.map((p) => (
                  <div className='spectro-peak-chip' key={p.idx}>
                    <b>{p.wl} nm</b> · {p.pct}%
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className='spectro-export-row'>
          <button onClick={savePNG}>⬇ Save PNG</button>
          <button onClick={saveCSV}>⬇ Export CSV</button>
        </div>

        <div className='spectro-status'>{status}</div>
      </div>
    </div>
  )
}
