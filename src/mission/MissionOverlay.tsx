import { useCallback, useEffect, useRef, useState } from 'react'
import { MissionSceneCanvas } from './MissionScene'
import { useMissionStore } from './store'
import { useMissionLoop } from './useMissionLoop'
import { SIGNAL_DROP_START_KM } from './physics'

const glass =
  'rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl'

const glassSoft =
  'rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'

function fmtKm(km: number) {
  if (!Number.isFinite(km) || km > 1e10) return '—'
  return `${Math.round(km).toLocaleString('ru-RU')} км`
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m} мин ${sec} с`
}

function useLaggedTelemetry() {
  const sim = useMissionStore((s) => s.sim)
  const [lagged, setLagged] = useState(sim)
  const simRef = useRef(sim)
  simRef.current = sim

  useEffect(() => {
    const pct = sim.signalPercent
    const base = pct > 58 ? 120 : pct > 35 ? 280 : pct > 15 ? 520 : 880
    const jitter = Math.floor(Math.random() * 80)
    const id = window.setTimeout(() => setLagged({ ...simRef.current }), base + jitter)
    return () => clearTimeout(id)
  }, [sim.t, sim.distanceEarthKm, sim.signalPercent, sim.velocityDisplay, sim.connectionLost])

  return sim.connectionLost ? sim : lagged
}

function LabGuide() {
  return (
    <details className={`group ${glass}`} open>
      <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200/90 outline-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-100">?</span>
          Зачем лаборатория и как ею пользоваться
        </span>
        <span className="ml-2 text-slate-500 group-open:hidden">(развернуть)</span>
      </summary>
      <div className="mt-4 space-y-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-300">
        <section>
          <h3 className="mb-1.5 font-semibold text-slate-100">Для чего это нужно</h3>
          <p>
            Лаборатория — <strong className="text-white">наглядная модель</strong> учебной темы: как после старта с
            Земли траектория изгибается в поле Солнца, зачем нужен короткий импульс двигателя (аналог КДУ-414), как
            растёт дистанция до Земли и почему радиосигнал падает после порядка{' '}
            <strong className="text-cyan-200">{SIGNAL_DROP_START_KM.toLocaleString('ru-RU')} км</strong>. Это не
            «боевой» расчёт НАСА, а <strong className="text-white">демонстрация понятий</strong> для аудитории и для
            вас перед защитой.
          </p>
        </section>
        <section>
          <h3 className="mb-1.5 font-semibold text-slate-100">Пошагово</h3>
          <ol className="list-decimal space-y-2 pl-4 marker:text-cyan-400/80">
            <li>
              Нажмите <strong className="text-cyan-100">«Запуск миссии»</strong> — аппарат отрывается от Земли, камера
              отъезжает, появляется дуга траектории.
            </li>
            <li>
              Во время полёта нажимайте <strong className="text-amber-100">«Импульс КДУ»</strong> — увидите сдвиг
              дуги и лёгкую тряску камеры (коррекция курса).
            </li>
            <li>
              <strong className="text-slate-100">«Сброс»</strong> — вернуть всё к старту у Земли.
            </li>
            <li>
              <strong className="text-slate-100">«Траектория»</strong> — включить или скрыть линию пути.
            </li>
            <li>
              Включите <strong className="text-cyan-100">«Режим обучения»</strong> — подсказки по физике сцены и
              пролёту у Венеры.
            </li>
          </ol>
        </section>
        <p className="rounded-lg bg-black/25 px-2 py-1.5 font-mono text-[10px] text-slate-500">
          Закрыть окно: кнопка «Закрыть» или клавиша <kbd className="rounded bg-white/10 px-1">Esc</kbd>. Презентация
          под сценой не листается, пока открыта лаборатория.
        </p>
      </div>
    </details>
  )
}

export function MissionOverlay() {
  const open = useMissionStore((s) => s.overlayOpen)
  const setOpen = useMissionStore((s) => s.setOverlayOpen)
  const studyMode = useMissionStore((s) => s.studyMode)
  const setStudyMode = useMissionStore((s) => s.setStudyMode)
  const showTrajectory = useMissionStore((s) => s.showTrajectory)
  const toggleTrajectory = useMissionStore((s) => s.toggleTrajectory)
  const launch = useMissionStore((s) => s.launch)
  const reset = useMissionStore((s) => s.reset)
  const fireThruster = useMissionStore((s) => s.fireThruster)

  useMissionLoop()
  const telem = useLaggedTelemetry()

  const onClose = useCallback(() => setOpen(false), [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-[#02040a]/92 text-slate-100 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Лаборатория межпланетного полёта"
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 ${glassSoft} mx-3 mt-3 rounded-2xl border sm:mx-4`}
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/85">
            Лаборатория · Венера-1
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-white">Межпланетный полёт (учебная модель)</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-slate-200 transition hover:border-cyan-400/45 hover:bg-white/10 hover:text-white"
        >
          Закрыть · Esc
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
        <div
          className={`relative min-h-[38vh] flex-[2] overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] sm:min-h-0`}
        >
          <MissionSceneCanvas />
          {telem.connectionLost && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="max-w-sm text-center font-mono text-sm uppercase tracking-[0.28em] text-red-300/95 [text-shadow:0_0_20px_rgba(255,60,60,0.45)]">
                Связь потеряна
              </p>
            </div>
          )}
        </div>

        <aside className="flex w-full min-w-0 shrink-0 flex-col gap-3 overflow-y-auto sm:max-w-[400px] lg:max-w-[420px]">
          <LabGuide />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={launch}
              disabled={telem.launched}
              title="Старт с Земли: аппарат получает скорость, включается запись траектории."
              className={`${glassSoft} py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-35`}
            >
              Запуск миссии
            </button>
            <button
              type="button"
              onClick={fireThruster}
              disabled={!telem.launched || telem.connectionLost}
              title="Короткий импульс вдоль скорости — как работа КДУ-414."
              className={`${glassSoft} py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-400/35 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-35`}
            >
              Импульс КДУ
            </button>
            <button
              type="button"
              onClick={reset}
              title="Вернуть аппарат на Землю и очистить траекторию."
              className={`${glassSoft} py-3 font-mono text-[11px] uppercase tracking-wide text-slate-200 transition hover:bg-white/10`}
            >
              Сброс
            </button>
            <button
              type="button"
              onClick={toggleTrajectory}
              title="Показать или скрыть линию пройденного пути."
              className={`${glassSoft} py-3 font-mono text-[11px] uppercase tracking-wide text-slate-200 transition hover:bg-white/10`}
            >
              {showTrajectory ? 'Скрыть траекторию' : 'Показать траекторию'}
            </button>
          </div>

          <label
            className={`flex cursor-pointer items-center gap-3 ${glass} py-3 pl-4 pr-3`}
          >
            <input
              type="checkbox"
              checked={studyMode}
              onChange={(e) => setStudyMode(e.target.checked)}
              className="size-4 accent-cyan-400"
            />
            <span className="text-sm leading-snug text-slate-200">
              <span className="font-semibold text-white">Режим обучения</span> — краткие пояснения к траектории,
              коррекции и пролёту у Венеры.
            </span>
          </label>

          <div
            className={`${glass} space-y-3 font-mono text-xs transition-all duration-500 ${
              telem.connectionLost
                ? 'opacity-45 saturate-50'
                : telem.launched && telem.signalPercent < 28
                  ? 'opacity-90 [text-shadow:0_0_12px_rgba(255,100,80,0.12)]'
                  : ''
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Телеметрия</p>
            <div className="flex justify-between gap-2 border-b border-white/10 pb-2 text-slate-200">
              <span className="text-slate-500">До Земли</span>
              <span className="text-right text-cyan-100/95">{fmtKm(telem.distanceEarthKm)}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/10 pb-2 text-slate-200">
              <span className="text-slate-500">Сигнал</span>
              <span className={telem.signalPercent < 28 ? 'text-amber-300' : 'text-emerald-300/90'}>
                {`${telem.signalPercent.toFixed(0)} %`}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/10 pb-2 text-slate-200">
              <span className="text-slate-500">Скорость</span>
              <span className="text-cyan-100/95">{telem.velocityDisplay.toFixed(1)} усл. ед.</span>
            </div>
            <div className="flex justify-between gap-2 text-slate-200">
              <span className="text-slate-500">Время полёта</span>
              <span className="text-cyan-100/95">{fmtTime(telem.t)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              После примерно {SIGNAL_DROP_START_KM.toLocaleString('ru-RU')} км от Земли сигнал в модели начинает
              падать; цифры в панели могут обновляться с задержкой — так показана «деградация канала».
            </p>
          </div>

          {studyMode && (
            <div className={`${glass} space-y-2 text-xs leading-relaxed text-slate-300`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400/95">Подсказки</p>
              <ul className="list-inside list-disc space-y-1.5 marker:text-cyan-500/80">
                <li>
                  <strong className="text-slate-100">Траектория</strong> — изгиб из-за притяжения к Солнцу; Венера
                  слегка отклоняет путь.
                </li>
                <li>
                  <strong className="text-slate-100">КДУ</strong> — импульс меняет скорость и форму дуги.
                </li>
                <li>
                  <strong className="text-slate-100">Пролёт</strong> — в истории миссии расчётная дистанция порядка{' '}
                  <strong className="text-white">100 000 км</strong> до облаков; здесь число «мин. дистанция» берётся
                  из симуляции.
                </li>
                <li>
                  Мин. дистанция (запись):{' '}
                  <strong className="text-white">
                    {telem.minClosestVenusKm > 1e9
                      ? '—'
                      : `${Math.round(telem.minClosestVenusKm).toLocaleString('ru-RU')} км`}
                  </strong>
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
