import { useEffect, useState } from 'react';
import Welcome from './components/Welcome.jsx';
import Dashboard from './components/Dashboard.jsx';
import { browserStorage, STORE } from './lib/storage.js';
import { readInvite } from './lib/spaceKey.js';

export default function App() {
  const [spaceKey, setSpaceKey] = useState(() => browserStorage.read(STORE.key, null));
  const [invite, setInvite] = useState(() => readInvite(window.location.hash));

  // نُزيل الرمز من شريط العنوان حتى لا يبقى ظاهراً أو في سجل التصفح
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  function enter({ key, name, space, created }) {
    browserStorage.write(STORE.key, key);
    if (name) browserStorage.write(STORE.name, name);
    if (created) {
      browserStorage.write(STORE.cache, { key, space, items: [] });
      browserStorage.write(STORE.invitePrompt, true);
    }
    setInvite(null);
    setSpaceKey(key);
  }

  function leave() {
    browserStorage.remove(STORE.key);
    browserStorage.remove(STORE.cache);
    browserStorage.remove(STORE.queue);
    browserStorage.remove(STORE.invitePrompt);
    setSpaceKey(null);
  }

  if (!spaceKey || (invite && invite !== spaceKey)) {
    return (
      <Welcome
        invite={invite}
        savedName={browserStorage.read(STORE.name, '')}
        onEnter={enter}
        onBack={spaceKey ? () => setInvite(null) : null}
      />
    );
  }

  return <Dashboard key={spaceKey} spaceKey={spaceKey} onLeave={leave} />;
}
