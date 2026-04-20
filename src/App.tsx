import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SpaceScene } from './components/SpaceScene'
import { MissionOverlay } from './mission/MissionOverlay'
import { useMissionStore } from './mission/store'
import { SECTIONS } from './sections'
import { UNIVERSITY_SHORT, ACADEMIC_CREDIT_LINE } from './academic'
import './App.css'

export default function App() {
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const setMissionOpen = useMissionStore((s) => s.setOverlayOpen)

  const progress = ((active + 1) / SECTIONS.length) * 100

  const scrollToSection = useCallback((index: number) => {
    const i = Math.max(0, Math.min(index, SECTIONS.length - 1))
    const el = document.getElementById(SECTIONS[i]?.id ?? '')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          const idx = SECTIONS.findIndex((s) => s.id === en.target.id)
          if (idx >= 0) setActive(idx)
        })
      },
      { root, threshold: 0.48 },
    )

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })

    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        scrollToSection(active + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollToSection(active - 1)
      }
      if (e.key === 'Home') {
        e.preventDefault()
        scrollToSection(0)
      }
      if (e.key === 'End') {
        e.preventDefault()
        scrollToSection(SECTIONS.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, scrollToSection])

  const current = SECTIONS[active]
  const canPrev = active > 0
  const canNext = active < SECTIONS.length - 1

  return (
    <div className="app">
      <div className="progress-track" aria-hidden="true">
        <motion.div
          className="progress-fill"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 26 }}
        />
      </div>

      <div className="uni-banner" role="note">
        <span className="uni-banner__uni">{UNIVERSITY_SHORT}</span>
        <span className="uni-banner__people">{ACADEMIC_CREDIT_LINE}</span>
      </div>

      <SpaceScene slideIndex={active} />

      <header className="top-bar">
        <div className="top-bar__left">
          <div className="brand">
            <span className="brand__dot" />
            <span>Венера-1</span>
          </div>
          <button
            type="button"
            className="top-bar__mission"
            onClick={() => setMissionOpen(true)}
            title="Интерактивная модель: старт с Земли, траектория к Венере, импульс КДУ, падение связи после ~2 млн км. Внутри — пошаговая справка."
            aria-label="Открыть лабораторию межпланетного полёта"
          >
            Лаборатория миссии
          </button>
        </div>
        <p className="top-bar__hint">
          ↑ ↓ · Home/End · {SECTIONS.length} слайдов
        </p>
      </header>

      <MissionOverlay />

      <nav className="rail rail--many" aria-label="Разделы презентации">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`rail__dot${i === active ? ' rail__dot--on' : ''}`}
            onClick={() => scrollToSection(i)}
            aria-current={i === active ? 'true' : undefined}
            aria-label={`Слайд ${i + 1}: ${s.title}`}
          />
        ))}
      </nav>

      <div className="slide-nav-mobile" role="group" aria-label="Листание слайдов">
        <button
          type="button"
          className="slide-nav-mobile__btn"
          onClick={() => scrollToSection(active - 1)}
          disabled={!canPrev}
          aria-label="Предыдущий слайд"
        >
          ←
        </button>
        <span className="slide-nav-mobile__count" aria-live="polite">
          {active + 1} / {SECTIONS.length}
        </span>
        <button
          type="button"
          className="slide-nav-mobile__btn"
          onClick={() => scrollToSection(active + 1)}
          disabled={!canNext}
          aria-label="Следующий слайд"
        >
          →
        </button>
      </div>

      <div className="slides" ref={containerRef}>
        {SECTIONS.map((section, index) => (
          <section key={section.id} id={section.id} className="slide">
            <motion.div
              className="slide__inner"
              initial={{ opacity: 0, y: 44 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.38 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="slide__kicker">{section.kicker}</p>
              <p className="slide__speaker">
                <span className="slide__speaker-label">Спикер</span>
                {section.speaker}
              </p>
              <h1 className="slide__title">{section.title}</h1>
              <p className="slide__subtitle">{section.subtitle}</p>
              {section.facts && section.facts.length > 0 && (
                <motion.ul
                  className="slide__facts"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={{
                    hidden: {},
                    show: {
                      transition: { staggerChildren: 0.07, delayChildren: 0.08 },
                    },
                  }}
                >
                  {section.facts.map((f) => (
                    <motion.li
                      key={f}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0 },
                      }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {f}
                    </motion.li>
                  ))}
                </motion.ul>
              )}
              <motion.ul
                className="slide__tags"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.12 },
                  },
                }}
              >
                {section.meta.map((m) => (
                  <motion.li
                    key={m}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    {m}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <div className="slide__index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </div>
          </section>
        ))}
      </div>

      <footer className="footer">
        <span>
          {current.speaker} · {active + 1}/{SECTIONS.length}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={current.id}
            className="footer__chapter"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32 }}
          >
            {current.kicker}
          </motion.span>
        </AnimatePresence>
      </footer>
    </div>
  )
}
