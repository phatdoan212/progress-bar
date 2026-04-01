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

// ─── ColorInput ──────────────────────────────────────────────────────────────
function ColorInput({ label, value, onChange }) {
  const [hex, setHex] = useState(value)

  useEffect(() => { setHex(value) }, [value])

  function handleText(raw) {
    setHex(raw)
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) onChange(raw)
  }

  function handlePicker(raw) {
    setHex(raw)
    onChange(raw)
  }

  return (
    <div className={s.colorRow}>
      <span className={s.colorLabel}>{label}</span>
      <input
        type="color"
        className={s.colorPicker}
        value={/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#000000'}
        onChange={e => handlePicker(e.target.value)}
      />
      <input
        type="text"
        className={s.colorHex}
        value={hex}
        onChange={e => handleText(e.target.value)}
        maxLength={7}
        spellCheck={false}
      />
    </div>
  )
}

// ─── ControlPanel ────────────────────────────────────────────────────────────
export default function ControlPanel({
  bbValues, checkpoints, answers, theme,
  onBBChange, onLaunchStar, onCheckpointsChange, onAnswersChange, onThemeChange,
}) {
  return (
    <div className={s.panels}>

      {/* ── Theme Colors ── */}
      <div className={s.panel}>
        <h2>Theme Colors <Tag label="Theme" color="#5a2a7a" /></h2>
        <ColorInput
          label="Background / Base"
          value={theme.bg}
          onChange={v => onThemeChange({ ...theme, bg: v })}
        />
        <ColorInput
          label="Accent / Primary"
          value={theme.accent}
          onChange={v => onThemeChange({ ...theme, accent: v })}
        />
      </div>

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
        <Row label="showAllCounters " tags={<PB />}>
          <Check checked={bbValues.showAllCounters} onChange={v => onBBChange('showAllCounters', v)} />
        </Row>
        <Row label="navButtonsWidth " tags={<PB />}>
          <Slider value={bbValues.navButtonsWidth} min={0} max={400}
            onChange={v => onBBChange('navButtonsWidth', v)} />
        </Row>
      </div>

      {/* ── checkpointList ── */}
      <div className={s.panel}>
        <h2>Quiz Checkpoint Data <Tag label="PB" color="#2a4a7a" /></h2>
        <div className={s.cpList}>
          {checkpoints.map((cp, i) => {
            function update(field, val) {
              onCheckpointsChange(checkpoints.map((c, j) => j === i ? { ...c, [field]: val } : c))
            }
            return (
              <div key={i} className={s.cpCard}>
                <div className={s.cpCardTop}>
                  <span className={s.cpIdx}>#{i}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Slider value={cp.percentPos} min={0} max={100}
                      onChange={v => update('percentPos', v)} />
                  </div>
                  <select className={s.select} value={cp.type}
                    onChange={e => update('type', Number(e.target.value))}>
                    {CHECKPOINT_TYPES.map((t, idx) => <option key={idx} value={idx}>{t}</option>)}
                  </select>
                  <button className={s.rmBtn}
                    onClick={() => onCheckpointsChange(checkpoints.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className={s.cpCardBot}>
                  <label className={s.cpCheckLabel}>
                    <input type="checkbox" className={s.checkbox} checked={cp.quizCompleted}
                      onChange={e => update('quizCompleted', e.target.checked)} />
                    completed
                  </label>
                  <label className={s.cpCheckLabel}>
                    <input type="checkbox" className={s.checkbox} checked={cp.quizPassed}
                      onChange={e => update('quizPassed', e.target.checked)} />
                    passed
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <div className={s.btnRow}>
          <button className={s.btn} onClick={() =>
            onCheckpointsChange([...checkpoints, { quizCompleted: false, quizPassed: false, type: 0, percentPos: 0 }])
          }>+ Add Checkpoint</button>
        </div>
      </div>

    </div>
  )
}
