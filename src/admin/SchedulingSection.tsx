import { CalendarClock, RotateCcw } from 'lucide-react';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import { currentPeriod, formatTime } from '../utils/time';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulingSection() {
  const { data, updateSchedule, setManualPeriodOverride } = useAppStore();
  const activePeriod = currentPeriod(data.schedules, data.manualPeriodOverride);

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Automatic dayparts</span><h1>Scheduling</h1><p>OneTime Menu chooses the current daypart from the browser clock unless a manager applies a manual override.</p></div><div className="period-chip"><CalendarClock size={15} /> Live: {activePeriod}</div></div>

      <section className="admin-card override-card">
        <div><span className="eyebrow">Manager control</span><h2>Manual menu override</h2><p>Temporarily force a menu period on every display. Choose Automatic to return control to the schedule.</p></div>
        <div className="override-controls"><select value={data.manualPeriodOverride} onChange={(event) => setManualPeriodOverride(event.target.value)}><option value="">Automatic</option>{data.schedules.map((schedule) => <option value={schedule.name} key={schedule.id}>{schedule.name}</option>)}</select>{data.manualPeriodOverride && <button className="button button--secondary" type="button" onClick={() => setManualPeriodOverride('')}><RotateCcw size={15} /> Clear override</button>}</div>
      </section>

      <div className="schedule-list">
        {data.schedules.map((schedule) => <article className="admin-card schedule-row" key={schedule.id}>
          <div className="schedule-row__identity"><div className="schedule-icon"><CalendarClock /></div><div><h2>{schedule.name}</h2><span>{formatTime(schedule.startTime)} to {formatTime(schedule.endTime)}</span></div></div>
          <div className="day-buttons">{days.map((day, index) => <button key={day} type="button" className={schedule.days.includes(index) ? 'active' : ''} onClick={() => updateSchedule(schedule.id, { days: schedule.days.includes(index) ? schedule.days.filter((value) => value !== index) : [...schedule.days, index] })}>{day}</button>)}</div>
          <div className="time-inputs"><input aria-label="Start time" type="time" value={schedule.startTime} onChange={(event) => updateSchedule(schedule.id, { startTime: event.target.value })} /><span>to</span><input aria-label="End time" type="time" value={schedule.endTime} onChange={(event) => updateSchedule(schedule.id, { endTime: event.target.value })} /></div>
          <Toggle checked={schedule.enabled} onChange={(value) => updateSchedule(schedule.id, { enabled: value })} />
        </article>)}
      </div>
      <div className="info-callout"><strong>Scheduling behavior:</strong> the display reads the current browser time, checks enabled dayparts for today, and displays the active period. Late Night takes priority when its Friday/Saturday window overlaps Dinner.</div>
    </div>
  );
}
