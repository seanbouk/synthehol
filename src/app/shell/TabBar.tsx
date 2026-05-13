import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppStore } from '../../state/app-store';
import type { TabId } from '../../state/app-store';

export function TabBar() {
  const devices = useAppStore((s) => s.devices);
  const activeTab = useAppStore((s) => s.activeTab);
  const onClick = useAppStore((s) => s.onTabClick);
  const setActiveTabLeft = useAppStore((s) => s.setActiveTabLeft);

  const isActive = (tab: TabId) => {
    if (typeof tab === 'string' && typeof activeTab === 'string') return tab === activeTab;
    if (typeof tab === 'object' && typeof activeTab === 'object') {
      return tab.deviceId === activeTab.deviceId;
    }
    return false;
  };

  const tabClass = (tab: TabId) => (isActive(tab) ? 'tab active' : 'tab');

  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Whenever the active tab or device list changes, measure the active
  // button's viewport-left so the device-details menu can anchor under
  // it. We re-measure on window resize too — tab-bar buttons reflow.
  useLayoutEffect(() => {
    const measure = () => {
      const el = activeBtnRef.current;
      if (!el) {
        setActiveTabLeft(null);
        return;
      }
      setActiveTabLeft(el.getBoundingClientRect().left);
    };
    measure();
  }, [activeTab, devices.length, setActiveTabLeft]);

  useEffect(() => {
    const onResize = () => {
      const el = activeBtnRef.current;
      if (!el) return;
      setActiveTabLeft(el.getBoundingClientRect().left);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setActiveTabLeft]);

  // Attach the ref only to the active tab so we have one source of truth.
  const refFor = (tab: TabId) => (isActive(tab) ? activeBtnRef : undefined);

  return (
    <nav className="tabbar">
      <button ref={refFor('home')} className={tabClass('home')} onClick={() => onClick('home')}>🏠 Home</button>
      <button ref={refFor('drums')} className={tabClass('drums')} onClick={() => onClick('drums')}>🥁 Drums</button>
      <button ref={refFor('bass')} className={tabClass('bass')} onClick={() => onClick('bass')}>🎸 Bass</button>
      {devices.map((d) => {
        const tab: TabId = { kind: 'device', deviceId: d.id };
        return (
          <button key={d.id} ref={refFor(tab)} className={tabClass(tab)} onClick={() => onClick(tab)}>
            🎮 {d.name}
          </button>
        );
      })}
      <button ref={refFor('output')} className={tabClass('output')} onClick={() => onClick('output')}>🎛️ Output</button>
    </nav>
  );
}
