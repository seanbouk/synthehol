import { useAppStore } from '../../state/app-store';
import { TabBar } from './TabBar';
import { DeviceDetailsMenu } from './DeviceDetailsMenu';
import { HomeTab } from '../tabs/HomeTab';
import { DrumsTab } from '../tabs/DrumsTab';
import { BassTab } from '../tabs/BassTab';
import { OutputTab } from '../tabs/OutputTab';
import { DeviceTab } from '../tabs/DeviceTab';

export function TabContainer() {
  const activeTab = useAppStore((s) => s.activeTab);

  let content;
  if (activeTab === 'home') content = <HomeTab />;
  else if (activeTab === 'drums') content = <DrumsTab />;
  else if (activeTab === 'bass') content = <BassTab />;
  else if (activeTab === 'output') content = <OutputTab />;
  else content = <DeviceTab deviceId={activeTab.deviceId} />;

  return (
    <div className="app">
      <TabBar />
      <DeviceDetailsMenu />
      <main className="tab-content">{content}</main>
    </div>
  );
}
