import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useScriptureStore } from '../store/scriptureStore'
import { useSoundStore } from '../store/soundStore'
import { useProjectionStore, themeConfig } from '../store/projectionStore'
import { TRANSLATIONS } from '../data/versions'
import { getRecentSessions } from '../lib/firestore'
import Button from '../components/shared/Button'
import Badge from '../components/shared/Badge'

interface SessionData {
  id: string;
  date?: { toDate?: () => Date };
  verses?: Array<{ reference?: string; ref?: string; translation?: string }>;
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('stats')
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  const scripture = useScriptureStore()
  const sound = useSoundStore()
  const projection = useProjectionStore()

  useEffect(() => {
    if (!user) return
    getRecentSessions((user as any).uid, 20)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [user])

  const totalVersesProjected = sessions.reduce(
    (sum: number, s: SessionData) => sum + (s.verses?.length || 0), 0
  )

  const tabs = [
    { id: 'stats', label: 'Usage Stats' },
    { id: 'translations', label: 'Translations' },
    { id: 'sound', label: 'Sound Mode' },
    { id: 'projection', label: 'Projection' },
    { id: 'sessions', label: 'Service Logs' },
    { id: 'data', label: 'Data' },
  ]

  const clearAllData = () => {
    localStorage.removeItem('dmentalist-v1')
    localStorage.removeItem('dmentalist-sound')
    localStorage.removeItem('dmentalist-projection')
    localStorage.removeItem('dmentalist-usage')
    localStorage.removeItem('dmentalist-theme')
    scripture.clearHistory()
    scripture.clearResults()
    sound.reset()
    projection.clearProjection()
    projection.setTheme('dark')
    projection.setFontSize('large')
    projection.setShowReference(true)
    projection.setShowTranslation(true)
    sound.setSensitivity('medium')
    alert('All local data cleared.')
    window.location.reload()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">Admin</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {(user as any)?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">{sessions.length} sessions</Badge>
            <Button size="sm" variant="secondary" onClick={logout}>Sign Out</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface-lighter border border-white/5 w-fit flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Usage Stats */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-surface-lighter border border-white/5">
                <p className="text-xs text-text-muted uppercase tracking-wider">Service Sessions</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{sessions.length}</p>
              </div>
              <div className="p-5 rounded-xl bg-surface-lighter border border-white/5">
                <p className="text-xs text-text-muted uppercase tracking-wider">Verses Projected</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{totalVersesProjected}</p>
              </div>
              <div className="p-5 rounded-xl bg-surface-lighter border border-white/5">
                <p className="text-xs text-text-muted uppercase tracking-wider">History Size</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{scripture.searchHistory.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Translation settings */}
        {activeTab === 'translations' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-surface-lighter border border-white/5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Translation Settings</h3>
                <p className="text-xs text-text-muted mt-0.5">Select the active translation for searches</p>
              </div>
              <div className="space-y-2">
                {Object.entries(TRANSLATIONS).map(([id, t]) => (
                  <label
                    key={id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      scripture.activeTranslation === id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-white/5 bg-surface/50 hover:bg-surface-lighter'
                    }`}
                  >
                    <input
                      type="radio"
                      name="translation"
                      checked={scripture.activeTranslation === id}
                      onChange={() => scripture.setTranslation(id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{t.label}</span>
                        <Badge variant="default">{t.short}</Badge>
                      </div>
                      <p className="text-xs text-text-muted">
                        API: {t.apiCode}{' '}
                        {t.publicDomain
                          ? <span className="text-emerald-400">(Public Domain)</span>
                          : <span className="text-accent">(Licensed — fallback used)</span>
                        }
                      </p>
                    </div>
                    {scripture.activeTranslation === id && (
                      <Badge variant="primary">Active</Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs text-accent font-medium mb-1">⚠ Translation Notice</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                bible-api.com only serves public-domain translations (KJV, WEB, Darby, ASV, YLT).
                NIV and ESV are copyrighted and require a licensed API provider like{' '}
                <a href="https://scripture.api.bible" className="text-primary-light hover:underline" target="_blank" rel="noopener noreferrer">scripture.api.bible</a>.
                Until then, selecting NIV shows WEB text, ESV shows Darby, and NKJV shows KJV.
              </p>
            </div>
          </div>
        )}

        {/* Sound mode settings */}
        {activeTab === 'sound' && (
          <div className="p-5 rounded-xl bg-surface-lighter border border-white/5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Sound Mode Settings</h3>
              <p className="text-xs text-text-muted mt-0.5">Default detection sensitivity</p>
            </div>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => sound.setSensitivity(s)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    sound.sensitivity === s
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-lighter'
                  }`}
                >
                  <div className="capitalize">{s}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {s === 'low' && 'Confirm all'}
                    {s === 'medium' && 'Auto high'}
                    {s === 'high' && 'Auto all'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Projection settings */}
        {activeTab === 'projection' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-surface-lighter border border-white/5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Projection Settings</h3>
                <p className="text-xs text-text-muted mt-0.5">Default theme and font size</p>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-2">Default Theme</label>
                <div className="flex gap-2">
                  {Object.entries(themeConfig).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => projection.setTheme(key as "dark" | "light" | "warm")}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        projection.theme === key
                          ? 'border-primary'
                          : 'border-white/5 hover:border-white/10'
                      }`}
                      style={{
                        backgroundColor: t.bg,
                        color: t.text,
                      }}
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                      <div className="text-[10px] opacity-70 mt-0.5">Aa</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-2">Default Font Size</label>
                <div className="flex gap-2">
                  {(['medium', 'large', 'xlarge'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => projection.setFontSize(s)}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        projection.fontSize === s
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-lighter'
                      }`}
                    >
                      <span className="capitalize">{s}</span>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {s === 'medium' && '36px'}
                        {s === 'large' && '48px'}
                        {s === 'xlarge' && '64px'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projection.showReference}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => projection.setShowReference(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-primary">Show verse reference</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projection.showTranslation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => projection.setShowTranslation(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-primary">Show translation label</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Service Logs */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-surface-lighter border border-white/5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Service Sessions</h3>
              {loadingSessions ? (
                <p className="text-sm text-text-muted">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-text-muted">No service sessions yet. Start projecting verses to log them.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s: SessionData) => {
                    const verses = s.verses;
                    return (
                    <div key={s.id} className="p-3 rounded-lg bg-surface/50 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-muted">
                          {s.date?.toDate?.()?.toLocaleString() || 'Just now'}
                        </span>
                        <Badge variant="default">{verses?.length || 0} verses</Badge>
                      </div>
                      {verses && verses.length > 0 && (
                        <div className="text-xs text-text-secondary space-y-0.5 mt-1">
                          {verses.slice(0, 3).map((v: any, i: number) => (
                            <div key={i}>
                              {v.reference || v.ref} — {v.translation}
                            </div>
                          ))}
                          {verses.length > 3 && (
                            <div className="text-text-muted">+{verses.length - 3} more</div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data section */}
        {activeTab === 'data' && (
          <div className="p-5 rounded-xl bg-surface-lighter border border-white/5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Data & Storage</h3>
              <p className="text-xs text-text-muted mt-0.5">Manage application data</p>
            </div>
            <div className="space-y-2 text-sm text-text-secondary bg-surface/50 rounded-lg p-4">
              <p>Search history and settings are stored locally (localStorage).</p>
              <p>Service logs are saved to Firebase and synced across devices.</p>
              <p>Clearing data will reset all local settings and search history.</p>
            </div>
            <Button variant="danger" onClick={clearAllData}>
              Clear All Local Data
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
