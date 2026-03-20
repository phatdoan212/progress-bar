import React from 'react'
import s from './QuizLayout.module.css'

export default function QuizLayout({ RiveComponent, answers = [] }) {
  return (
    <div className={s.page}>
      <div className={s.riveWrapper}>
        <div className={s.riveInner}>
          <RiveComponent style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}
