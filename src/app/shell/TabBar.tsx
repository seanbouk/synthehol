import { useAppStore } from '../../state/app-store';
import type { TabId } from '../../state/app-store';

export function TabBar() {
  const devices = useAppStore((s) => s.devices);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActive = useAppStore((s) => s.setActiveTab);

  const isActive = (tab: TabId) => {
    if (typeof tab === 'string' && typeof activeTab === 'string') return tab === activeTab;
    if (typeof tab === 'object' && typeof activeTab === 'object') {
      return tab.deviceId === activeTab.deviceId;
    }
    return false;
  };

  const tabClass = (tab: TabId) => (isActive(tab) ? 'tab active' : 'tab');

  return (
    <nav className="tabbar">
      <button className={tabClass('home')} onClick={() => setActive('home')}>🏠 Home</button>
      <button className={tabClass('drums')} onClick={() => setActive('drums')}>🥁 Drums</button>
      <button className={tabClass('bass')} onClick={() => setActive('bass')}>🎸 Bass</button>
      {devices.map((d) => {
        const tab: TabId = { kind: 'device', deviceId: d.id };
        return (
          <button key={d.id} className={tabClass(tab)} onClick={() => setActive(tab)}>
            🎮 {d.name}
          </button>
        );
      })}
      <button className={tabClass('output')} onClick={() => setActive('output')}>🎛️ Output</button>
    </nav>
  );
}
