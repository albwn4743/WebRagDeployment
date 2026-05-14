import React, { useState } from 'react';
import Landing from './pages/Landing';
import ChatApp from './pages/ChatApp';
import PanelFloatApp from './panel-float/PanelFloatApp';
import './styles/global.css';

function App() {
  const path =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/$/, '') || '/'
      : '/';
  if (path === '/panel-float') {
    return <PanelFloatApp />;
  }

  const [started, setStarted] = useState(false);
  const [initialSession, setInitialSession] = useState(null);

  const handleGetStarted = () => setStarted(true);

  const handleBack = () => {
    setStarted(false);
    setInitialSession(null);
  };

  return (
    <div className="app">
      {!started ? (
        <Landing onGetStarted={handleGetStarted} />
      ) : (
        <ChatApp onBack={handleBack} initialSession={initialSession} />
      )}
    </div>
  );
}

export default App;
