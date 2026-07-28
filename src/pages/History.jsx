import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import { weekLabel, monthLabel, nextRangeAnchor, prevRangeAnchor } from '../history.js';
import BalanceCard from '../components/BalanceCard.jsx';
import BalanceCarousel from '../components/BalanceCarousel.jsx';
import WeekView from '../components/WeekView.jsx';
import MonthView from '../components/MonthView.jsx';
import YearView from '../components/YearView.jsx';
import DayDetailModal from '../components/DayDetailModal.jsx';

const SCOPES = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function History() {
  const [targets, setTargets] = useState(null);

  // Top-of-page balance cards always reflect the current week/month/year,
  // independent of whatever the browser below is paged to.
  const [currentWeek, setCurrentWeek] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);

  const [scope, setScope] = useState('week');
  const [anchor, setAnchor] = useState(null); // null = current period
  const [range, setRange] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [openDate, setOpenDate] = useState(null);

  useEffect(() => {
    api.getTargets().then(setTargets);
    api.getHistoryRange('week').then(setCurrentWeek);
    api.getHistoryRange('month').then(setCurrentMonth);
    api.getHistoryRange('year').then(setCurrentYear);
  }, []);

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    const data = await api.getHistoryRange(scope, anchor || undefined);
    setRange(data);
    setRangeLoading(false);
  }, [scope, anchor]);

  useEffect(() => {
    loadRange();
  }, [loadRange]);

  function switchScope(nextScope) {
    setScope(nextScope);
    setAnchor(null);
  }

  function goPrev() {
    if (!range) return;
    setAnchor(prevRangeAnchor(range));
  }

  function goNext() {
    if (!range) return;
    setAnchor(nextRangeAnchor(range));
  }

  function goToday() {
    setAnchor(null);
  }

  function jumpToMonth(monthStart) {
    setScope('month');
    setAnchor(monthStart);
  }

  function handleDayChanged() {
    // An edit/delete inside the day detail sheet can change aggregates —
    // refresh both the browse range and the always-current top cards.
    loadRange();
    api.getHistoryRange('week').then(setCurrentWeek);
    api.getHistoryRange('month').then(setCurrentMonth);
    api.getHistoryRange('year').then(setCurrentYear);
  }

  const currency = targets?.currency;

  const rangeLabel = range && range.scope === scope
    ? scope === 'week'
      ? weekLabel(range.start, range.end)
      : scope === 'month'
        ? monthLabel(range.start)
        : String(range.year)
    : '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History</h1>
          <div className="subtitle">Your money flow over time</div>
        </div>
      </div>

      <BalanceCarousel
        cards={[
          <BalanceCard title="This Week" loading={!currentWeek || !targets} loggedDays={currentWeek?.loggedDays} totals={currentWeek?.totals} currency={currency} />,
          <BalanceCard title="This Month" loading={!currentMonth || !targets} loggedDays={currentMonth?.loggedDays} totals={currentMonth?.totals} currency={currency} />,
          <BalanceCard title="This Year" loading={!currentYear || !targets} loggedDays={currentYear?.loggedDays} totals={currentYear?.totals} currency={currency} />,
        ]}
      />

      <div className="segmented">
        {SCOPES.map((s) => (
          <button key={s.id} className={scope === s.id ? 'active' : ''} onClick={() => switchScope(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="range-header">
        <div className="range-header-label">{rangeLabel}</div>
        <div className="range-nav">
          <button onClick={goPrev} disabled={!range} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          {anchor && (
            <button onClick={goToday} aria-label="Jump to current">
              <span style={{ fontSize: 11, fontWeight: 700, padding: '0 4px' }}>Now</span>
            </button>
          )}
          <button onClick={goNext} disabled={!range} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {rangeLoading || !range || !targets || range.scope !== scope ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Loading…
        </div>
      ) : (
        <>
          {scope === 'week' && <WeekView range={range} currency={currency} onDateClick={setOpenDate} />}
          {scope === 'month' && <MonthView range={range} targets={targets} onDateClick={setOpenDate} />}
          {scope === 'year' && <YearView range={range} targets={targets} onMonthClick={jumpToMonth} />}
        </>
      )}

      {openDate && targets && (
        <DayDetailModal date={openDate} targets={targets} onClose={() => setOpenDate(null)} onChanged={handleDayChanged} />
      )}
    </div>
  );
}
