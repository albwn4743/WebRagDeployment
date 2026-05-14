import React, { useState, useEffect } from 'react';
import {
  FiGlobe, FiX, FiChevronDown, FiChevronUp,
  FiZap, FiCheck, FiAlertCircle, FiLoader,
  FiFile, FiHash, FiType
} from 'react-icons/fi';

function ScrapePanel({ onScrape, scrapeStatus, scrapeResult, scrapeError }) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse after success
  useEffect(() => {
    if (scrapeStatus === 'success') {
      const timer = setTimeout(() => {
        setCollapsed(true);
      }, 3000); // Collapse after 3 seconds
      return () => clearTimeout(timer);
    } else if (scrapeStatus === null) {
      // Reset when starting a new chat
      setCollapsed(false);
      setUrl('');
    }
  }, [scrapeStatus]);

  const handleScrape = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    onScrape(finalUrl, depth);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleScrape(e);
    }
  };

  const isLoading = scrapeStatus === 'loading';

  return (
    <div className="scrape-panel">
      <div className="scrape-panel-inner">
        <div className="scrape-panel-header">
          <div className="scrape-panel-title">
            <FiGlobe /> Scrape Website
          </div>
          <button className="btn-toggle-panel" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronDown /> : <FiChevronUp />}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="url-input-row">
              <div className="url-input-wrapper">
                <FiGlobe className="url-input-icon" />
                <input
                  type="text"
                  className="url-input"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  spellCheck={false}
                />
                {url && (
                  <button className="url-clear-btn" onClick={() => setUrl('')}>
                    <FiX />
                  </button>
                )}
              </div>
              {/* 
              <select
                className="depth-select"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                disabled={isLoading}
                title="Crawl depth"
              >
                <option value={0}>Single page</option>
                <option value={1}>Depth 1</option>
                <option value={2}>Depth 2</option>
              </select> */}

              <button
                className="btn-scrape"
                onClick={handleScrape}
                disabled={isLoading || !url.trim() || scrapeStatus === 'success'}
              >
                {isLoading ? (
                  <><FiLoader className="spin" /> Scraping...</>
                ) : (
                  <><FiZap /> Scrape</>
                )}
              </button>
            </div>

            {/* Status messages */}
            {scrapeStatus === 'loading' && (
              <div className="scrape-status loading">
                <FiLoader className="spin" />
                <span>Scraping website content... This may take a moment.</span>
              </div>
            )}

            {scrapeStatus === 'error' && (
              <div className="scrape-status error">
                <FiAlertCircle />
                <span>{scrapeError}</span>
              </div>
            )}

            {scrapeStatus === 'success' && scrapeResult && (
              <div>
                <div className="scrape-status success">
                  <FiCheck />
                  <span>
                    Successfully scraped <strong>{scrapeResult.stats?.pagesScraped}</strong> page(s) from{' '}
                    <strong>{scrapeResult.stats?.title}</strong>
                  </span>
                </div>
                <div className="scrape-stats">
                  <div className="stat-chip">
                    <FiFile />
                    {scrapeResult.stats?.pagesScraped} pages
                  </div>
                  <div className="stat-chip">
                    <FiHash />
                    {scrapeResult.stats?.chunksCreated} chunks
                  </div>
                  <div className="stat-chip">
                    <FiType />
                    {scrapeResult.stats?.totalWords?.toLocaleString()} words
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ScrapePanel;
