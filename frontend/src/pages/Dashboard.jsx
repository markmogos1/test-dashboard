import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TrackerCard from '../components/TrackerCard'
import TodayBar from '../components/TodayBar'
import LogModal from '../components/LogModal'
import CreateTrackerModal from '../components/CreateTrackerModal'

const today = format(new Date(), 'yyyy-MM-dd')

function loadOrder(userId) {
  try { return JSON.parse(localStorage.getItem(`tracker-order-${userId}`)) ?? [] }
  catch { return [] }
}
function saveOrder(userId, ids) {
  localStorage.setItem(`tracker-order-${userId}`, JSON.stringify(ids))
}

export default function Dashboard() {
  const { user } = useAuth()
  const [trackers, setTrackers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTracker, setEditingTracker] = useState(null)
  const [activeTracker, setActiveTracker] = useState(null)
  const [trackerOrder, setTrackerOrder] = useState(() => loadOrder(user.id))

  const logsByTracker = useMemo(() => {
    const map = {}
    logs.forEach(log => {
      if (!map[log.tracker_id]) map[log.tracker_id] = []
      map[log.tracker_id].push(log)
    })
    return map
  }, [logs])

  // Apply stored order, new trackers go to the end
  const orderedTrackers = useMemo(() => {
    if (!trackerOrder.length) return trackers
    const byId = Object.fromEntries(trackers.map(t => [t.id, t]))
    const ordered = trackerOrder.map(id => byId[id]).filter(Boolean)
    const rest = trackers.filter(t => !trackerOrder.includes(t.id))
    return [...ordered, ...rest]
  }, [trackers, trackerOrder])

  async function load() {
    const [{ data: tData }, { data: lData }] = await Promise.all([
      supabase.from('trackers').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('logs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ])
    setTrackers(tData ?? [])
    setLogs(lData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleLogged(newLog) {
    setLogs(prev => [newLog, ...prev])
    setActiveTracker(null)
  }

  function handleTrackerUpdated(updatedTracker) {
    setTrackers(prev => prev.map(t => t.id === updatedTracker.id ? updatedTracker : t))
    setActiveTracker(updatedTracker)
  }

  function handleCreateSaved() {
    setShowCreate(false)
    load()
  }

  function handleEditSaved(updatedTracker) {
    setTrackers(prev => prev.map(t => t.id === updatedTracker.id ? updatedTracker : t))
    setEditingTracker(null)
  }

  function handleDeleted(id) {
    setTrackers(prev => prev.filter(t => t.id !== id))
    const newOrder = trackerOrder.filter(oid => oid !== id)
    setTrackerOrder(newOrder)
    saveOrder(user.id, newOrder)
    setEditingTracker(null)
  }

  function handleMoveUp(id) {
    const ids = orderedTrackers.map(t => t.id)
    const i = ids.indexOf(id)
    if (i <= 0) return
    ;[ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]
    setTrackerOrder(ids)
    saveOrder(user.id, ids)
  }

  function handleMoveDown(id) {
    const ids = orderedTrackers.map(t => t.id)
    const i = ids.indexOf(id)
    if (i < 0 || i >= ids.length - 1) return
    ;[ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]
    setTrackerOrder(ids)
    saveOrder(user.id, ids)
  }

  return (
    <div>
      <TodayBar
        trackers={orderedTrackers}
        logsByTracker={logsByTracker}
        today={today}
        onPillClick={setActiveTracker}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Trackers
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            border: '2px solid #111', background: 'var(--accent)',
            padding: '6px 14px', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', borderRadius: 0,
          }}
        >
          + Add tracker
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '24px 0' }}>Loading...</div>
      ) : trackers.length === 0 ? (
        <div style={{ border: '2px solid #111', padding: '48px 24px', textAlign: 'center', background: 'var(--surface)' }}>
          <div style={{ fontSize: '26px', fontWeight: 500, marginBottom: '10px' }}>—</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            No trackers yet. Add your first one to get started.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              border: '2px solid #111', background: 'var(--accent)',
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', borderRadius: 0,
            }}
          >
            + Add tracker
          </button>
        </div>
      ) : (
        <div className="tracker-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {orderedTrackers.map((tracker, i) => (
            <TrackerCard
              key={tracker.id}
              tracker={tracker}
              logs={logsByTracker[tracker.id] ?? []}
              today={today}
              onClick={() => setActiveTracker(tracker)}
              onEdit={() => setEditingTracker(tracker)}
              onMoveUp={i > 0 ? () => handleMoveUp(tracker.id) : null}
              onMoveDown={i < orderedTrackers.length - 1 ? () => handleMoveDown(tracker.id) : null}
            />
          ))}
        </div>
      )}

      {activeTracker && (
        <LogModal
          tracker={activeTracker}
          logs={logsByTracker[activeTracker.id] ?? []}
          today={today}
          onClose={() => setActiveTracker(null)}
          onLogged={handleLogged}
          onTrackerUpdated={handleTrackerUpdated}
        />
      )}

      {showCreate && (
        <CreateTrackerModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreateSaved}
        />
      )}

      {editingTracker && (
        <CreateTrackerModal
          tracker={editingTracker}
          onClose={() => setEditingTracker(null)}
          onCreated={handleEditSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
