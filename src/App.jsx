import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRive, Layout, Fit } from '@rive-app/react-webgl2'
import ControlPanel from './ControlPanel'
import QuizLayout from './QuizLayout'
import styles from './App.module.css'
import DEFAULT_CHECKPOINTS from './checkpoints.json'
import DEFAULT_ANSWERS from './answers.json'
import { generateRiveTheme, hexToRiveColor, detectAppearance } from './themeGenerator'

// ─── Detect real device orientation ─────────────────────────────────────────
function useOrientation() {
  const [isPortrait, setIsPortrait] = useState(
    () => window.innerHeight > window.innerWidth
  )
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const handler = (e) => setIsPortrait(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isPortrait
}

export default function App() {
  // ─── Simulated orientation (controls canvas rendering) ───────────────────
  const realIsPortrait = useOrientation()
  const [simOrientation, setSimOrientation] = useState(null) // null = real device
  const isPortrait = simOrientation !== null ? simOrientation === 'portrait' : realIsPortrait

  // ─── Preview ratio (drives the badge) ────────────────────────────────────
  const [previewIsPortrait, setPreviewIsPortrait] = useState(false)

  const [status, setStatus] = useState('loading')  // 'loading' | 'ready' | 'error'
  const [checkpoints, setCheckpoints] = useState(DEFAULT_CHECKPOINTS)
  const [bbValues, setBbValues] = useState({
    progressBarPercentage: 10,
    currentModuleNum: 3,
    totalModuleNum: 8,
    currentPageNum: 1,
    totalPageNum: 10,
    starEarned: 1,
    playSingleStar: false,
    playDoubleStars: false,
    playTripleStars: false,
    showAllCounters: true,
    navButtonsWidth: 196,
  })

  const [answers, setAnswers] = useState(DEFAULT_ANSWERS)
  const [theme, setTheme] = useState({ bg: '#1A1C34', accent: '#1473F3' })
  const vmBBRef = useRef(null)
  const vmQCRef = useRef(null)
  const vmQARef = useRef(null)
  const [previewWidth, setPreviewWidth] = useState(null)
  const previewColRef = useRef(null)

  // ─── Badge: watch actual preview column ratio ─────────────────────────────
  useEffect(() => {
    const el = previewColRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setPreviewIsPortrait(height > 0 && width / height <= 1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ─── Resize handle drag ───────────────────────────────────────────────────
  const startResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = previewColRef.current.getBoundingClientRect().width
    const bodyWidth = previewColRef.current.parentElement.getBoundingClientRect().width
    const maxWidth = bodyWidth - 340 - 16 // editor col + resize handle
    function onMove(e) {
      setPreviewWidth(Math.min(maxWidth, Math.max(150, startWidth + e.clientX - startX)))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const { RiveComponent, rive } = useRive({
    src: '/progressbar.riv',
    stateMachines: 'Bottom Bar Machine',
    layout: new Layout({ fit: Fit.Layout }),
    autoplay: true,
    onLoad: () => setStatus('ready'),
    onLoadError: () => setStatus((s) => s === 'ready' ? s : 'error'),
  })

  // ─── Write helpers ─────────────────────────────────────────────────────────
  function applyTheme(inst, t) {
    if (!inst) return
    const colors = generateRiveTheme(t.bg, t.accent)  // appearance auto-detected from bg
    Object.entries(colors).forEach(([name, hex]) => {
      const prop = inst.color(name)
      if (prop) prop.value = hexToRiveColor(hex)
    })
  }

  // ─── Bind BottomBarVM once, push data once ─────────────────────────────────
  useEffect(() => {
    if (!rive || status !== 'ready') return
    const bbVM = rive.viewModelByName('BottomBarVM')
    if (!bbVM) { console.warn('BottomBarVM not found'); return }
    const inst = bbVM.defaultInstance()
    if (!inst) { console.warn('BottomBarVM defaultInstance() null'); return }
    rive.bindViewModelInstance(inst)
    vmBBRef.current = inst
    vmQCRef.current = rive.viewModelByName('QuizCheckpointVM')
    vmQARef.current = rive.viewModelByName('QuizAnswerVM')

    applyBBValues(inst, bbValues)
    pushCheckpoints(inst, vmQCRef.current, DEFAULT_CHECKPOINTS)
    pushAnswers(inst, vmQARef.current, DEFAULT_ANSWERS)
    applyTheme(inst, theme)
  }, [rive, status])  // eslint-disable-line react-hooks/exhaustive-deps

  function applyBBValues(inst, vals) {
    const numbers = ['progressBarPercentage','currentModuleNum','totalModuleNum',
                     'currentPageNum','totalPageNum','starEarned','navButtonsWidth']
    numbers.forEach(k => inst.number(k)?.value !== undefined && (inst.number(k).value = Number(vals[k])))
    const bools = ['playSingleStar','playDoubleStars','playTripleStars','showAllCounters']
    bools.forEach(k => inst.boolean(k)?.value !== undefined && (inst.boolean(k).value = Boolean(vals[k])))
  }

  function pushCheckpoints(bbInst, qcVM, cps) {
    if (!bbInst) return
    const list = bbInst.list('checkpointList')
    if (!list) return
    while (list.length < cps.length && qcVM) {
      const item = qcVM.instance()
      if (item) list.addInstance(item)
      else break
    }
    const items = Array.from({ length: list.length }, (_, i) => list.instanceAt(i))
    cps.forEach((cp, i) => {
      const item = items[i]
      if (!item) return
      item.boolean('quizCompleted')?.value !== undefined && (item.boolean('quizCompleted').value = cp.quizCompleted)
      item.boolean('quizPassed')?.value !== undefined && (item.boolean('quizPassed').value = cp.quizPassed)
      const et = item.enum('quizCheckpointType'); if (et) et.valueIndex = cp.type
      item.number('quizCheckpointPercentPos')?.value !== undefined && (item.number('quizCheckpointPercentPos').value = cp.percentPos)
    })
  }

  function pushAnswers(bbInst, qaVM, ans) {
    if (!bbInst) return
    const list = bbInst.list('answerList')
    if (!list) return
    while (list.length < ans.length && qaVM) {
      const item = qaVM.instance()
      if (item) list.addInstance(item)
      else break
    }
    const items = Array.from({ length: list.length }, (_, i) => list.instanceAt(i))
    ans.forEach((a, i) => {
      const item = items[i]
      if (!item) return
      item.string('quizLabel')?.value !== undefined && (item.string('quizLabel').value = a.quizLabel)
      item.boolean('correctAnswer')?.value !== undefined && (item.boolean('correctAnswer').value = a.correctAnswer)
      item.number('numberProperty')?.value !== undefined && (item.number('numberProperty').value = i)
    })
  }

  // ─── Update handlers ───────────────────────────────────────────────────────
  const handleThemeChange = useCallback((newTheme) => {
    const t = { bg: newTheme.bg, accent: newTheme.accent }
    setTheme(t)
    applyTheme(vmBBRef.current, t)
  }, [])

  const handleBBChange = useCallback((key, value) => {
    setBbValues(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'currentPageNum') {
        next.progressBarPercentage = Math.round(value / next.totalPageNum * 100)
      } else if (key === 'totalPageNum') {
        next.progressBarPercentage = Math.round(next.currentPageNum / value * 100)
      } else if (key === 'progressBarPercentage') {
        const pageSize = 100 / next.totalPageNum
        const exactPage = value / pageSize
        if (Number.isInteger(Math.round(exactPage * 1000) / 1000)) {
          next.currentPageNum = Math.round(exactPage)
        }
      }
      const vm = vmBBRef.current
      if (vm) {
        if (typeof value === 'boolean') {
          vm.boolean(key)?.value !== undefined && (vm.boolean(key).value = value)
        } else {
          vm.number(key)?.value !== undefined && (vm.number(key).value = Number(value))
          if (key === 'currentPageNum' || key === 'totalPageNum')
            vm.number('progressBarPercentage')?.value !== undefined && (vm.number('progressBarPercentage').value = next.progressBarPercentage)
          if (key === 'progressBarPercentage')
            vm.number('currentPageNum')?.value !== undefined && (vm.number('currentPageNum').value = next.currentPageNum)
        }
      }
      return next
    })
  }, [])

  const handleLaunchStar = useCallback(() => {
    vmBBRef.current?.trigger('launchStar')?.trigger()
  }, [])

  const handleCheckpointsChange = useCallback((newCps) => {
    setCheckpoints(newCps)
    pushCheckpoints(vmBBRef.current, vmQCRef.current, newCps)
  }, [])

  const handleAnswersChange = useCallback((newAnswers) => {
    setAnswers(newAnswers)
    pushAnswers(vmBBRef.current, vmQARef.current, newAnswers)
  }, [])


  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>Progress Bar Demo</h1>
        <div className={styles.statusBar}>
          <span className={`${styles.dot} ${styles[status]}`} />
          <span>{status === 'ready' ? 'Rive loaded – ViewModels ready'
                : status === 'error' ? 'Load error'
                : 'Loading…'}</span>
          <span className={styles.orientBadge}>{previewIsPortrait ? '📱 Portrait' : '🖥 Landscape'}</span>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Left: preview ── */}
        <div
          ref={previewColRef}
          className={styles.previewCol}
          style={previewWidth ? { flex: 'none', width: previewWidth } : undefined}
        >
          <QuizLayout RiveComponent={RiveComponent} answers={answers} />
        </div>

        <div className={styles.resizeHandle} onMouseDown={startResize} />

        {/* ── Right: editor ── */}
        <div className={styles.editorCol}>
          <div className={styles.orientToggle} style={{ display: 'none' }}>
            <h2 className={styles.orientHeader}>
              Simulate Orientation
              <span className={styles.orientTag}>Responsive</span>
            </h2>
            <OrientButtons isPortrait={isPortrait} onSimulate={(o) => { setSimOrientation(o); setPreviewWidth(null) }} />
          </div>
          <ControlPanel
            bbValues={bbValues}
            checkpoints={checkpoints}
            answers={answers}
            theme={theme}
            onBBChange={handleBBChange}
            onLaunchStar={handleLaunchStar}
            onCheckpointsChange={handleCheckpointsChange}
            onAnswersChange={handleAnswersChange}
            onThemeChange={handleThemeChange}
          />
        </div>
      </div>
    </div>
  )
}

function OrientButtons({ isPortrait, onSimulate }) {
  return (
    <div className={styles.tabSwitch}>
      <button
        className={`${styles.tabBtn} ${isPortrait ? styles.tabBtnActive : ''}`}
        onClick={() => onSimulate('portrait')}
      >Portrait</button>
      <button
        className={`${styles.tabBtn} ${!isPortrait ? styles.tabBtnActive : ''}`}
        onClick={() => onSimulate('landscape')}
      >Landscape</button>
    </div>
  )
}
