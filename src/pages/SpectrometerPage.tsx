import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./spectrometer.css"

interface Peak {
  idx: number
  wl: number
  intensity: number
  pct: string
}

/* ---- Wavelength → RGB ---- */
function wlToRGB(wl: number): [number, number, number] {
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
  }
  let f = 1
  if (wl >= 380 && wl < 420) f = 0.3 + (0.7 * (wl - 380)) / 40
  else if (wl >= 700 && wl <= 780) f = 0.3 + (0.7 * (780 - wl)) / 80
  return [Math.round(r * f * 255), Math.round(g * f * 255), Math.round(b * f * 255)]
}

function maxOf(arr: Float32Array): number {
  let m = 0
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i]
  return m
}

/* ---- Moving-average smoothing ---- */
function smooth(arr: Float32Array, k: number): Float32Array {
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    let s = 0
    let c = 0
    for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++) {
      s += arr[j]
      c++
    }
    out[i] = c ? s / c : 0
  }
  return out
}

/* ---- Peak detection ---- */
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

export function SpectrometerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hiddenCvsRef = useRef<HTMLCanvasElement | null>(null)
  const specCvsRef = useRef<HTMLCanvasElement | null>(null)
  const rainbowCvsRef = useRef<HTMLCanvasElement | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const pausedRef = useRef(false)

  // Raw (unsmoothed) frame + the smoothed curve currently on screen.
  const lastRawRef = useRef<Float32Array | null>(null)
  const lastSmoothRef = useRef<Float32Array | null>(null)

  // Peak list is throttled so the canvas can still run at full frame rate.
  const peaksKeyRef = useRef("")
  const peaksAtRef = useRef(0)

  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [camState, setCamState] = useState<"idle" | "live" | "error">("idle")
  const [roiPos, setRoiPos] = useState(50)
  const [smoothing, setSmoothing] = useState(5)
  const [calLeft, setCalLeft] = useState(400)
  const [calRight, setCalRight] = useState(700)
  const [calLeftInput, setCalLeftInput] = useState("400")
  const [calRightInput, setCalRightInput] = useState("700")
  const [showCalib, setShowCalib] = useState(false)
  const [peaks, setPeaks] = useState<Peak[]>([])
  const [status, setStatus] = useState("Camera not started. Click ▶ Start camera.")

  // Live values for the render loop, without re-creating the loop on every change.
  const paramsRef = useRef({ roiPos, smoothing, calLeft, calRight })

  const axisLabels = useMemo(() => {
    const steps = 7
    return Array.from({ length: steps + 1 }, (_, i) =>
      Math.round(calLeft + (i / steps) * (calRight - calLeft))
    )
  }, [calLeft, calRight])

  /* ---- Draw rainbow bar ---- */
  const drawRainbow = useCallback((W: number) => {
    const cvs = rainbowCvsRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return
    const { calLeft: cl, calRight: cr } = paramsRef.current
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

  /* ---- Draw spectrum graph from a raw frame ---- */
  const drawSpectrum = useCallback(
    (raw: Float32Array) => {
      const cvs = specCvsRef.current
      if (!cvs) return
      const ctx = cvs.getContext("2d")
      if (!ctx) return

      const W = cvs.offsetWidth || 700
      const H = cvs.offsetHeight || 160
      cvs.width = W
      cvs.height = H

      const { smoothing: k, calLeft: cl, calRight: cr } = paramsRef.current
      const s = smooth(raw, k)
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
      const found = findPeaks(s, cl, cr)
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

      lastRawRef.current = raw
      lastSmoothRef.current = s
      drawRainbow(W)

      // Throttle the chip list (~6 Hz) and skip identical updates.
      const key = found.map((p) => `${p.wl}:${p.pct}`).join("|")
      const now = performance.now()
      if (key !== peaksKeyRef.current && now - peaksAtRef.current > 160) {
        peaksKeyRef.current = key
        peaksAtRef.current = now
        setPeaks(found)
      }
    },
    [drawFrame, drawRainbow]
  )

  /* ---- Empty graph before the camera starts ---- */
  const drawIdle = useCallback(() => {
    const cvs = specCvsRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return
    const W = cvs.offsetWidth || 700
    const H = cvs.offsetHeight || 160
    cvs.width = W
    cvs.height = H
    drawFrame(ctx, W, H)
    drawRainbow(W)
  }, [drawFrame, drawRainbow])

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

    drawSpectrum(spectrum)
    scheduleNext()
  }, [drawSpectrum, scheduleNext])

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
    if (!lastSmoothRef.current || !specCvsRef.current) {
      setStatus("No spectrum captured yet.")
      return
    }
    const link = document.createElement("a")
    link.download = "spectrum_" + Date.now() + ".png"
    link.href = specCvsRef.current.toDataURL("image/png")
    link.click()
  }, [])

  const saveCSV = useCallback(() => {
    const s = lastSmoothRef.current
    if (!s) {
      setStatus("No spectrum captured yet.")
      return
    }
    const rows = ["wavelength_nm,intensity"]
    for (let i = 0; i < s.length; i++) {
      const wl = (calLeft + (i / s.length) * (calRight - calLeft)).toFixed(2)
      rows.push(`${wl},${s[i].toFixed(4)}`)
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
    paramsRef.current = { roiPos, smoothing, calLeft, calRight }
    if (lastRawRef.current) drawSpectrum(lastRawRef.current)
    else drawIdle()
  }, [roiPos, smoothing, calLeft, calRight, drawSpectrum, drawIdle])

  // Repaint on resize (canvas width follows its CSS box).
  useEffect(() => {
    const onResize = () => {
      if (lastRawRef.current) drawSpectrum(lastRawRef.current)
      else drawIdle()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [drawSpectrum, drawIdle])

  // Release the camera when leaving the route.
  useEffect(() => stopCamera, [stopCamera])

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
          <canvas ref={rainbowCvsRef} className='spectro-rainbow' width={700} height={18} />
          <div className='spectro-wl-axis'>
            {axisLabels.map((wl, i) => (
              <span key={`${wl}-${i}`}>{wl}</span>
            ))}
          </div>
          <canvas ref={specCvsRef} className='spectro-graph' width={700} height={160} />
          <div className='spectro-peaks-row'>
            {peaks.map((p) => (
              <div className='spectro-peak-chip' key={p.idx}>
                <b>{p.wl} nm</b> · {p.pct}%
              </div>
            ))}
          </div>
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
