import React, { useState, useEffect } from 'react'
import s from './ControlPanel.module.css'

const CHECKPOINT_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'REORDER']

// ─── Tiny reusable bits ──────────────────────────────────────────────────────
function Tag({ label, color }) {
  return <span className={s.tag} style={{ background: color }}>{label}</span>
}
const PB   = () => <Tag label="PB" color="#2a4a7a" />
const MOB  = () => <Tag label="Mobile" color="#1a6a3a" />
const STAR = () => <Tag label="Star" color="#7a6010" />

function Row({ label, tags, children }) {
  return (
    <div className={s.row}>
      <label>{label}{tags}</label>
      {children}
    </div>
  )
}

function Slider({ value, min = 0, max = 100, step = 1, onChange }) {
  const [text, setText] = useState(String(value))

  useEffect(() => { setText(String(value)) }, [value])

  function handleChange(raw) {
    setText(raw)
    const n = Number(raw)
    if (!isNaN(n) && raw.trim() !== '') {
      onChange(Math.min(max, Math.max(min, n)))
    }
  }

  return (
    <input
      type="number" className={s.numInput}
      value={text} min={min} max={max} step={step}
      onChange={e => handleChange(e.target.value)}
      onBlur={() => { if (text.trim() === '' || isNaN(Number(text))) setText(String(value)) }}
      onKeyDown={e => {
        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault()
          const n = Number(text)
          if (!isNaN(n)) {
            const delta = e.key === 'ArrowUp' ? 10 : -10
            onChange(Math.min(max, Math.max(min, n + delta)))
          }
        }
      }}
    />
  )
}

function Check({ checked, onChange }) {
  return (
    <input type="checkbox" checked={checked}
      onChange={e => onChange(e.target.checked)} className={s.checkbox} />
  )
}

// ─── ControlPanel ────────────────────────────────────────────────────────────
export default function ControlPanel({
  bbValues, checkpoints,
  onBBChange, onLaunchStar,
}) {
  return (
    <div className={s.panels}>

      {/* ── Star Animations ── */}
      <div className={s.panel}>
        {/* ★ STAR ANIMATION ─────────────────────────────────────────────────────
            playSingleStar / playDoubleStars / playTripleStars: booleans that
            select which celebration animation plays (1, 2 or 3 stars).
            launchStar: Rive trigger that actually fires the animation.
        ──────────────────────────────────────────────────────────────────────── */}
        <h2>Star Animations <STAR /></h2>
        <Row label="playSingleStar">
          <Check checked={bbValues.playSingleStar} onChange={v => onBBChange('playSingleStar', v)} />
        </Row>
        <Row label="playDoubleStars">
          <Check checked={bbValues.playDoubleStars} onChange={v => onBBChange('playDoubleStars', v)} />
        </Row>
        <Row label="playTripleStars">
          <Check checked={bbValues.playTripleStars} onChange={v => onBBChange('playTripleStars', v)} />
        </Row>
        <div className={s.btnRow}>
          {/* ★ STAR ANIMATION – click to fire the launchStar Rive trigger */}
          <button className={s.btn} onClick={onLaunchStar}>launchStar (Trigger)</button>
        </div>
      </div>

      {/* ── Progress Bar Controller ── */}
      <div className={s.panel}>
        <h2>Progress Bar Controller <Tag label="Bottom Bar Machine" color="#2a4a7a" /></h2>

        <Row label="progressBarPercentage " tags={<PB />}>
          <Slider value={bbValues.progressBarPercentage} max={100}
            onChange={v => onBBChange('progressBarPercentage', v)} />
        </Row>
        <Row label="currentModuleNum " tags={<PB />}>
          <Slider value={bbValues.currentModuleNum} max={20}
            onChange={v => onBBChange('currentModuleNum', v)} />
        </Row>
        <Row label="totalModuleNum " tags={<PB />}>
          <Slider value={bbValues.totalModuleNum} min={1} max={20}
            onChange={v => onBBChange('totalModuleNum', v)} />
        </Row>
        <Row label="currentPageNum " tags={<><PB /><MOB /></>}>
          <Slider value={bbValues.currentPageNum} max={50}
            onChange={v => onBBChange('currentPageNum', v)} />
        </Row>
        <Row label="totalPageNum " tags={<><PB /><MOB /></>}>
          <Slider value={bbValues.totalPageNum} min={1} max={50}
            onChange={v => onBBChange('totalPageNum', v)} />
        </Row>
        {/* ★ STAR ANIMATION – number of stars earned, displayed in the star icon (0–3) */}
        <Row label="starEarned " tags={<STAR />}>
          <Slider value={bbValues.starEarned} max={3}
            onChange={v => onBBChange('starEarned', v)} />
        </Row>
      </div>

      {/* ── checkpointList ── */}
      <div className={s.panel}>
        <h2>Quiz Checkpoint Data <Tag label="PB" color="#2a4a7a" /></h2>
        <div className={s.cpList}>
          {checkpoints.map((cp, i) => (
            <div key={i} className={s.cpRow}>
              <span className={s.cpInfo}>
                [{i}] pos <b>{cp.percentPos}%</b> · <b>{CHECKPOINT_TYPES[cp.type] ?? cp.type}</b>
                · done <b style={{ color: cp.quizCompleted ? '#4ade80' : '#f87171' }}>
                  {String(cp.quizCompleted)}</b>
                · pass <b style={{ color: cp.quizPassed ? '#4ade80' : '#f87171' }}>
                  {String(cp.quizPassed)}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
