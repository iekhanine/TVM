import { CalendarClock, RotateCcw } from 'lucide-react';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import { currentSchedule, formatTime } from '../utils/time';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulingSection() {
  const { data, updateSchedule, setManualMenuOverride } = useAppStore();
  const activeSchedule = currentSchedule(data.schedules);
  const activeMenu = data.menus.find((menu) => menu.id === (data.manualMenuOverride || activeSchedule?.menuId));

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Automatic dayparts</span><h1>Scheduling</h1><p>Map each time period to a real menu. Screens configured to follow scheduling switch automatically.</p></div><div className="period-chip"><CalendarClock size={15} /> Live: {activeMenu?.name ?? 'Assigned menu'}</div></div>

      <section className="admin-card override-card">
        <div><span className="eyebrow">Manager control</span><h2>Manual menu override</h2><p>Temporarily force scheduled screens to one menu. Bar screens that do not follow scheduling stay unchanged.</p></div>
        <div className="override-controls"><select value={data.manualMenuOverride} onChange={(event) => setManualMenuOverride(event.target.value)}><option value="">Automatic</option>{data.menus.filter((menu) => menu.enabled).map((menu) => <option value={menu.id} key={menu.id}>{menu.name}</option>)}</select>{data.manualMenuOverride && <button className="button button--secondary" type="button" onClick={() => setManualMenuOverride('')}><RotateCcw size={15} /> Clear override</button>}</div>
      </section>

      <div className="schedule-list">
        {data.schedules.map((schedule) => <article className="admin-card schedule-row schedule-row--menus" key={schedule.id}>
          <div className="schedule-row__identity"><div className="schedule-icon"><CalendarClock /></div><div><h2>{schedule.name}</h2><span>{formatTime(schedule.startTime)} to {formatTime(schedule.endTime)}</span></div></div>
          <label className="schedule-menu-select"><span>Menu</span><select value={schedule.menuId} onChange={(event) => updateSchedule(schedule.id, { menuId: event.target.value })}>{data.menus.map((menu) => <option value={menu.id} key={menu.id}>{menu.name}</option>)}</select></label>
          <div className="day-buttons">{days.map((day, index) => <button key={day} type="button" className={schedule.days.includes(index) ? 'active' : ''} onClick={() => updateSchedule(schedule.id, { days: schedule.days.includes(index) ? schedule.days.filter((value) => value !== index) : [...schedule.days, index] })}>{day}</button>)}</div>
          <div className="time-inputs"><input aria-label="Start time" type="time" value={schedule.startTime} onChange={(event) => updateSchedule(schedule.id, { startTime: event.target.value })} /><span>to</span><input aria-label="End time" type="time" value={schedule.endTime} onChange={(event) => updateSchedule(schedule.id, { endTime: event.target.value })} /></div>
          <Toggle checked={schedule.enabled} onChange={(value) => updateSchedule(schedule.id, { enabled: value })} />
        </article>)}
      </div>
      <div className="info-callout"><strong>Example:</strong> Main Counter follows Scheduling, so it can show Breakfast Menu at 8 AM and Main Menu at noon. Bar Menu can remain permanently assigned to Bar / Drinks.</div>
    </div>
  );
}
