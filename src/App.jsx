import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRive, Layout, Fit } from '@rive-app/react-webgl2'
import ControlPanel from './ControlPanel'
import styles from './App.module.css'
import DEFAULT_CHECKPOINTS from './checkpoints.json'

// ─── Detect orientation ─────────────────────────────────────────────────────
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
  const realIsPortrait = useOrientation()
  const [simOrientation, setSimOrientation] = useState(null) // null = real device
  const isPortrait = simOrientation !== null ? simOrientation === 'portrait' : realIsPortrait
  const [status, setStatus] = useState('loading')  // 'loading' | 'ready' | 'error'
  // Checkpoints are static – loaded from JSON once, only state (completed/passed) can change
  const [checkpoints, setCheckpoints] = useState(DEFAULT_CHECKPOINTS)
  const [bbValues, setBbValues] = useState({
    progressBarPercentage: 10,
    currentModuleNum: 3,
    totalModuleNum: 8,
    currentPageNum: 1,
    totalPageNum: 10,
    // ★ STAR ANIMATION – how many stars the user has earned (0–3)
    starEarned: 1,
    // ★ STAR ANIMATION – booleans that control which star celebration plays
    playSingleStar: false,
    playDoubleStars: false,
    playTripleStars: false,
  })

  const vmBBRef = useRef(null)
  const vmQCRef = useRef(null)

  const { RiveComponent, rive } = useRive({
    src: '/progressbar.riv',
    stateMachines: 'Bottom Bar Machine',
    layout: new Layout({ fit: Fit.Layout }),
    autoplay: true,
    onLoad: () => setStatus('ready'),
    onLoadError: () => setStatus((s) => s === 'ready' ? s : 'error'),
  })

  // ─── Bind BottomBarVM once, push checkpoints once ──────────────────────────
  useEffect(() => {
    if (!rive || status !== 'ready') return
    const bbVM = rive.viewModelByName('BottomBarVM')
    if (!bbVM) { console.warn('BottomBarVM not found'); return }
    const inst = bbVM.defaultInstance()
    if (!inst) { console.warn('BottomBarVM defaultInstance() null'); return }
    rive.bindViewModelInstance(inst)
    vmBBRef.current = inst
    vmQCRef.current = rive.viewModelByName('QuizCheckpointVM')

    applyBBValues(inst, bbValues)
    pushCheckpoints(inst, vmQCRef.current, DEFAULT_CHECKPOINTS)
  }, [rive, status])  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Write helpers ─────────────────────────────────────────────────────────
  function applyBBValues(inst, vals) {
    const numbers = ['progressBarPercentage','currentModuleNum','totalModuleNum',
                     'currentPageNum','totalPageNum',
                     'starEarned'] // ★ STAR ANIMATION
    numbers.forEach(k => inst.number(k)?.value !== undefined && (inst.number(k).value = Number(vals[k])))
    // ★ STAR ANIMATION – boolean flags that trigger the star celebration animations
    const bools = ['playSingleStar','playDoubleStars','playTripleStars']
    bools.forEach(k => inst.boolean(k)?.value !== undefined && (inst.boolean(k).value = Boolean(vals[k])))
  }

  function pushCheckpoints(bbInst, qcVM, cps) {
    if (!bbInst) return
    const list = bbInst.list('checkpointList')
    if (!list) return
    // Grow list to match checkpoint count
    while (list.length < cps.length && qcVM) {
      const item = qcVM.instance()
      if (item) list.addInstance(item)
      else break
    }
    // Snapshot all items first, then set – avoids list re-sort mid-iteration
    const items = Array.from({ length: list.length }, (_, i) => list.instanceAt(i))
    // Set properties on each item
    cps.forEach((cp, i) => {
      const item = items[i]
      if (!item) return
      item.boolean('quizCompleted')?.value !== undefined && (item.boolean('quizCompleted').value = cp.quizCompleted)
      item.boolean('quizPassed')?.value !== undefined && (item.boolean('quizPassed').value = cp.quizPassed)
      const et = item.enum('quizCheckpointType'); if (et) et.valueIndex = cp.type
      item.number('quizCheckpointPercentPos')?.value !== undefined && (item.number('quizCheckpointPercentPos').value = cp.percentPos)
    })
  }

  // ─── Update handlers ───────────────────────────────────────────────────────
  const handleBBChange = useCallback((key, value) => {
    setBbValues(prev => {
      const next = { ...prev, [key]: value }
      // Maintain: progressBarPercentage = (currentPageNum / totalPageNum) * 100
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

  // ★ STAR ANIMATION – fires the launchStar Rive trigger to play the star burst effect
  const handleLaunchStar = useCallback(() => {
    vmBBRef.current?.trigger('launchStar')?.trigger()
  }, [])

  // Update only checkpoint states (quizCompleted / quizPassed) – list size stays fixed
  const handleCheckpointsChange = useCallback((newCps) => {
    setCheckpoints(newCps)
    pushCheckpoints(vmBBRef.current, vmQCRef.current, newCps)
  }, [])

  const handlePreset = useCallback((preset) => {
    let newVals = { ...bbValues }
    let newCps  = checkpoints

    if (preset === 'start') {
      newVals = { ...newVals, progressBarPercentage: 0, currentModuleNum: 0,
                  currentPageNum: 0,
                  starEarned: 0,                                              // ★ STAR ANIMATION
                  playSingleStar: false, playDoubleStars: false, playTripleStars: false } // ★ STAR ANIMATION
    } else if (preset === 'mid') {
      newVals = { ...newVals, progressBarPercentage: 45, currentModuleNum: 3,
                  totalModuleNum: 8, currentPageNum: 5, totalPageNum: 12,
                  starEarned: 1,                                              // ★ STAR ANIMATION
                  playSingleStar: true, playDoubleStars: false, playTripleStars: false } // ★ STAR ANIMATION
    } else if (preset === 'complete') {
      newVals = { ...newVals, progressBarPercentage: 100, currentModuleNum: 8,
                  totalModuleNum: 8, currentPageNum: 12, totalPageNum: 12,
                  starEarned: 3,                                              // ★ STAR ANIMATION
                  playSingleStar: false, playDoubleStars: false, playTripleStars: true } // ★ STAR ANIMATION
    } else if (preset === 'quizPass') {
      newCps = checkpoints.map(cp => ({ ...cp, quizCompleted: true, quizPassed: true }))
    } else if (preset === 'quizFail') {
      newCps = checkpoints.map(cp => ({ ...cp, quizCompleted: true, quizPassed: false }))
    }

    setBbValues(newVals)
    setCheckpoints(newCps)
    const vm = vmBBRef.current
    if (vm) {
      applyBBValues(vm, newVals)
      pushCheckpoints(vm, vmQCRef.current, newCps)
    }
  }, [bbValues, checkpoints])

  const canvasStyle = isPortrait
    ? { width: '100%', aspectRatio: '9/16', maxHeight: '80vh' }
    : { width: '100%', aspectRatio: '16/9', maxHeight: '75vh' }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>Progress Bar Demo</h1>
        <div className={styles.statusBar}>
          <span className={`${styles.dot} ${styles[status]}`} />
          <span>{status === 'ready' ? 'Rive loaded – ViewModels ready'
                : status === 'error' ? 'Load error'
                : 'Loading…'}</span>
          <span className={styles.orientBadge}>{isPortrait ? '📱 Portrait' : '🖥 Landscape'}</span>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Left: preview ── */}
        <div className={styles.previewCol}>
          <div className={styles.canvasWrap} style={isPortrait ? { maxWidth: 390, alignSelf: 'center' } : undefined}>
            <RiveComponent style={canvasStyle} />
          </div>
        </div>

        {/* ── Right: editor ── */}
        <div className={styles.editorCol}>
          <div className={styles.orientToggle}>
            <h2 className={styles.orientHeader}>
              Simulate Orientation
              <span className={styles.orientTag}>Responsive</span>
            </h2>
            <OrientButtons isPortrait={isPortrait} onSimulate={setSimOrientation} />
          </div>
          <ControlPanel
            bbValues={bbValues}
            checkpoints={checkpoints}
            onBBChange={handleBBChange}
            onLaunchStar={handleLaunchStar}
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
