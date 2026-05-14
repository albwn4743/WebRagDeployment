import React from 'react';
import { FiGlobe, FiZap, FiDatabase, FiMessageSquare, FiArrowRight, FiPlay } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import '../styles/landing.css';


function Landing({ onGetStarted }) {
  return (
    <div className="landing">
      <div className="landing-bg" />
      <div className="landing-grid" />

      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">🌐</div>
          <span className="nav-logo-text">Web<span>RAG</span></span>
        </div>
        <div className="nav-links">
          <button className="nav-btn-ghost">Developed By ALBIN JOY</button>
        </div>
      </nav>


      <section className="landing-hero">

        <h1 className="hero-title">
          Chat with{' '}
          <span className="hero-title-gradient">Any Website</span>
        </h1>

        <p className="hero-subtitle">
          Scrape and converse with any website using AI.<br />
          Built on retrieval-augmented generation for accuracy.
        </p>

        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={onGetStarted}>
            Get Started<FiArrowRight />
          </button>
        </div>
      </section>
      <footer className="landing-footer">
        Built with React, Node.js, Playwright, Weaviate, FastAPI & Groq.
      </footer>
    </div>
  );
}
export default Landing;
