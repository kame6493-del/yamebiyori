import { useCallback, useEffect, useRef, useState } from 'react';
import { activeHabit, addCoping, addCraving, addHabit, addSlip, canAddHabit, emptyData, exportBackup, importBackup, newHabit, removeCraving, removeHabit, removeSlip, updateHabit, visibleHabits } from './domain/data';
import { FLAVOR, wordsFor } from './domain/flavor';
import { planMilestoneNotices } from './domain/milestones';
import { computeStats } from './domain/stats';
import { applyTheme, themeById } from './domain/themes';
import type { AppData } from './domain/types';
import { loadBilling, restore, type BillingState } from './platform/billing';
import { buzz, scheduleMilestones, shareText } from './platform/native';
import { clearData, loadData, saveData } from './platform/storage';
import { BodyPage } from './ui/BodyPage';
import { TabBar, type Tab } from './ui/common';
import { Craving } from './ui/Craving';
import { HabitForm, type HabitFields } from './ui/HabitForm';
import { Home } from './ui/Home';
import { LogPage } from './ui/LogPage';
import { Paywall } from './ui/Paywall';
import { SettingsPage } from './ui/SettingsPage';
import { ShareImage } from './ui/ShareImage';
import { SlipPage } from './ui/Slip';

type Overlay =
  | { t: 'craving' } | { t: 'slip' } | { t: 'paywall' } | { t: 'add' } | { t: 'edit'; id: string }
  | { t: 'card'; days: number } | { t: 'wall' } | null;

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '読み込み中…' });
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');
  const [fatal, setFatal] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const premium = billing.status === 'ready' && billing.premium;

  useEffect(() => {
    loadData().then(setData).catch((e) => setFatal(`記録を読み込めませんでした(${e})`));
    loadBilling().then(setBilling).catch(() => setBilling({ status: 'unavailable', reason: 'ストアに接続できませんでした' }));
  }, []);

  // 時計(30秒ごと・画面に戻った時)
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [overlay, tab]);

  const theme = themeById(data?.settings.theme ?? 'base', premium);
  useEffect(() => { applyTheme(theme); }, [theme]);

  // 記念日のお知らせを入れ直す(記録が変わるたび。少し待ってまとめる)
  useEffect(() => {
    if (!data) return;
    const id = window.setTimeout(async () => {
      const hs = visibleHabits(data, premium);
      const notices = data.settings.notify
        ? hs.slice(0, 80).flatMap((h, i) => planMilestoneNotices(h, Date.now(), data.settings.notifyTime, 10000 + i * 1000, wordsFor(h.kind, h.name).thing, Math.floor(48 / Math.max(1, hs.length))))
        : [];
      const ok = await scheduleMilestones(notices);
      setNotifyMsg(ok ? '' : 'お知らせが許可されていません。端末の設定アプリで、このアプリの通知を許可してください。');
    }, 600);
    return () => window.clearTimeout(id);
  }, [data, premium]);

  const commit = useCallback((d: AppData) => {
    setData(d);
    void saveData(d);
  }, []);

  const say = (t: string) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  };

  if (fatal) return <div className="fatal">{fatal}</div>;
  if (!data) return <div className="splash">やめ日和</div>;

  const fieldsToHabit = (f: HabitFields) => newHabit(f);

  if (data.habits.length === 0) {
    return (
      <div className="app">
        <HabitForm mode="first" now={now} onSave={(f) => { commit(addHabit(data, fieldsToHabit(f))); setNow(Date.now()); }} />
      </div>
    );
  }

  const habits = visibleHabits(data, premium);
  const h = activeHabit(data, premium)!;
  const close = () => setOverlay(null);
  const unlock = () => setOverlay({ t: 'paywall' });

  let page: React.ReactNode = null;
  if (overlay?.t === 'craving') {
    page = (
      <Craving habit={h} onClose={close} onAddCoping={(t) => commit(addCoping(data, h.id, t))}
        onDone={(c) => {
          const at = new Date().toISOString();
          commit(addCraving(data, h.id, { ...c, at }));
          buzz();
          setNow(Date.now());
          close();
          say(c.outcome === 'passed' ? '乗り切れました。記録しました。' : `記録しました。通算${computeStats(h, Date.now()).totalDays}日はそのままです。`);
        }} />
    );
  } else if (overlay?.t === 'slip') {
    page = <SlipPage habit={h} now={now} onClose={close} onSave={(s) => {
      const next = addSlip(data, h.id, s);
      commit(next);
      setNow(Date.now());
      close();
      say(`記録しました。通算${computeStats(next.habits.find((x) => x.id === h.id)!, Date.now()).totalDays}日はそのままです。`);
    }} />;
  } else if (overlay?.t === 'paywall') {
    page = <Paywall billing={billing} onClose={close} onBought={() => { setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b)); close(); say('完全版をひらきました。ありがとうございます。'); }} />;
  } else if (overlay?.t === 'add') {
    page = <HabitForm mode="add" now={now} onCancel={close} onSave={(f) => { commit(addHabit(data, fieldsToHabit(f))); close(); setTab('home'); }} />;
  } else if (overlay?.t === 'edit') {
    const target = data.habits.find((x) => x.id === overlay.id);
    if (target) {
      page = (
        <HabitForm mode="edit" now={now} initial={target} onCancel={close}
          onSave={(f) => {
            commit(updateHabit(data, target.id, (x) => ({ ...x, startAt: f.startAt, reason: f.reason, cost: { yenPerDay: f.yenPerDay, packYen: f.packYen, perDay: f.perDay, perPack: f.perPack } })));
            close();
            say('保存しました');
          }}
          onDelete={() => { if (confirm(`${wordsFor(target.kind, target.name).thing}の記録をすべて消します。よろしいですか`)) { commit(removeHabit(data, target.id)); close(); } }} />
      );
    }
  } else if (overlay?.t === 'card' || overlay?.t === 'wall') {
    page = premium
      ? <ShareImage habit={h} now={now} theme={theme} kind={overlay.t} days={overlay.t === 'card' ? overlay.days : undefined} onClose={close} />
      : <Paywall billing={billing} onClose={close} onBought={() => { setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b)); }} />;
  }

  if (page) return <div className="app">{page}{toast && <div className="toast" role="status">{toast}</div>}</div>;

  return (
    <div className="app">
      {tab === 'home' && (
        <Home habit={h} habits={habits} now={now} premium={premium}
          onSwitch={(id) => commit({ ...data, activeId: id })}
          onCrave={() => setOverlay({ t: 'craving' })} onSlip={() => setOverlay({ t: 'slip' })} onUnlock={unlock}
          onCard={(days) => setOverlay(premium ? { t: 'card', days } : { t: 'paywall' })} onBody={() => setTab('body')} />
      )}
      {tab === 'log' && (
        <LogPage habit={h} now={now} premium={premium} onUnlock={unlock}
          onCard={(days) => setOverlay({ t: 'card', days })} onWallpaper={() => setOverlay({ t: 'wall' })}
          onRemoveSlip={(id) => commit(removeSlip(data, h.id, id))} onRemoveCraving={(id) => commit(removeCraving(data, h.id, id))} />
      )}
      {tab === 'body' && <BodyPage habit={h} now={now} />}
      {tab === 'settings' && (
        <SettingsPage data={data} habits={habits} premium={premium} notifyMsg={notifyMsg}
          onNotify={(on, time) => commit({ ...data, settings: { ...data.settings, notify: on, notifyTime: time } })}
          onTheme={(id) => commit({ ...data, settings: { ...data.settings, theme: id } })}
          onEdit={(id) => setOverlay({ t: 'edit', id })}
          onAdd={() => (canAddHabit(data, premium) ? setOverlay({ t: 'add' }) : unlock())}
          onUnlock={unlock}
          onRestore={async () => {
            try {
              if (await restore()) { setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b)); say('完全版を復元しました'); }
              else say('購入は見つかりませんでした');
            } catch (e) { say(`復元できませんでした(${(e as Error).message ?? e})`); }
          }}
          onExport={async () => {
            try { await shareText(exportBackup(data, FLAVOR.key), `yamebiyori_${FLAVOR.key}_backup.json`); say('控えを書き出しました'); }
            catch (e) { say(`書き出せませんでした(${(e as Error).message ?? e})`); }
          }}
          onImport={(text) => {
            try { commit(importBackup(text)); say('控えを読み込みました'); setTab('home'); }
            catch (e) { say((e as Error).message); }
          }}
          onClearAll={async () => { await clearData(); setData(emptyData()); setTab('home'); }} />
      )}
      <TabBar tab={tab} onTab={setTab} bodyLabel="体のこと" />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
