<div align="center">
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">

<style>
* {
  font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.logo-container {
  margin: 40px 0;
  position: relative;
}

.logo-image {
  width: 180px;
  height: 180px;
  margin-bottom: 20px;
  filter: drop-shadow(0 8px 32px rgba(0, 255, 255, 0.3));
  animation: logoGlow 3s ease-in-out infinite alternate;
}

@keyframes logoGlow {
  0% { filter: drop-shadow(0 8px 32px rgba(0, 255, 255, 0.2)); }
  100% { filter: drop-shadow(0 8px 32px rgba(0, 255, 255, 0.5)); }
}

.main-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 20px 0 10px 0;
  background: linear-gradient(135deg, #00ffff, #0080ff, #8000ff);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 4s ease-in-out infinite;
  letter-spacing: -2px;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.cursor-blink {
  color: #00ff00;
  animation: blink 1.2s infinite;
  font-weight: 400;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.subtitle {
  font-size: 1.4rem;
  font-weight: 400;
  color: #64748b;
  margin-bottom: 30px;
  animation: fadeInUp 1s ease-out 0.5s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 10px 5px;
  animation: pulse 2s infinite;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #475569;
  max-width: 800px;
  margin: 0 auto 40px auto;
  animation: fadeIn 1s ease-out 1s both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 40px 0;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.feature-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  border-color: rgba(0, 255, 255, 0.3);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  display: block;
}

.feature-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1e293b;
}

.feature-description {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.5;
}

.ai-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #00ff00;
  border-radius: 50%;
  margin-left: 8px;
  animation: aiPulse 1.5s infinite;
}

@keyframes aiPulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
    background: #00ff00;
  }
  25% { 
    opacity: 0.7; 
    transform: scale(1.2);
    background: #00ffff;
  }
  50% { 
    opacity: 0.5; 
    transform: scale(1.4);
    background: #0080ff;
  }
  75% { 
    opacity: 0.7; 
    transform: scale(1.2);
    background: #8000ff;
  }
}
</style>

<div class="logo-container">
  <img src="./icons/stable/troubleshoot-dev_cnl.svg" alt=">troubleshoot.dev Logo" class="logo-image"/>
  <h1 class="main-title">>troubleshoot.dev<span class="cursor-blink">/</span></h1>
  <div class="ai-badge">🤖 AI-Powered</div>
  <div class="ai-badge">🚀 Open Source</div>
  <div class="ai-badge">🛡️ Privacy-First</div>
  <h3 class="subtitle">Next-Generation Code Editor for Developers and Troubleshooting<span class="ai-indicator"></span></h3>
</div>

<div class="description">
<strong>>troubleshoot.dev</strong> is a fork of VSCodium with comprehensive AI assistance built-in. It provides freely-licensed binaries of Visual Studio Code enhanced with powerful AI features for development and troubleshooting workflows.
</div>

</div>

<div class="features-grid">
  <div class="feature-card">
    <span class="feature-icon">💬</span>
    <h3 class="feature-title">AI Chat Assistant</h3>
    <p class="feature-description">Built-in AI chat panel with context-aware responses. Ask questions about your code directly in the editor with persistent conversation history.</p>
  </div>
  
  <div class="feature-card">
    <span class="feature-icon">🚀</span>
    <h3 class="feature-title">AI Code Completion</h3>
    <p class="feature-description">Intelligent autocomplete with multi-line suggestions. AI understands your project structure and coding patterns across all languages.</p>
  </div>
  
  <div class="feature-card">
    <span class="feature-icon">⚡</span>
    <h3 class="feature-title">AI Code Editing</h3>
    <p class="feature-description">Edit code with natural language instructions (Ctrl+K). Transform code directly in the editor with smart refactoring and error fixing.</p>
  </div>
  
  <div class="feature-card">
    <span class="feature-icon">🔍</span>
    <h3 class="feature-title">AI Code Analysis</h3>
    <p class="feature-description">Understand complex code with AI explanations (Ctrl+Shift+E). Get debugging assistance and performance optimization suggestions.</p>
  </div>
  
  <div class="feature-card">
    <span class="feature-icon">🖥️</span>
    <h3 class="feature-title">AI Terminal Assistant</h3>
    <p class="feature-description">Generate shell commands from natural language. Get command explanations and debug failed commands with AI assistance.</p>
  </div>
  
  <div class="feature-card">
    <span class="feature-icon">📊</span>
    <h3 class="feature-title">AI Log Analysis</h3>
    <p class="feature-description">Intelligent log parsing with pattern detection. Extract errors, analyze performance issues, and get troubleshooting recommendations.</p>
  </div>
</div>

<div align="center" style="margin: 60px 0 40px 0;">
  <h2 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
    🛡️ Privacy & Security First
  </h2>
  <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 30px;">
    <div style="background: rgba(0,255,0,0.1); border: 1px solid rgba(0,255,0,0.3); border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 200px;">
      <div style="font-size: 1.5rem; margin-bottom: 8px;">🌐</div>
      <div style="font-weight: 600; color: #1e293b;">Multiple Privacy Modes</div>
      <div style="font-size: 0.9rem; color: #64748b;">Cloud, local, or hybrid processing</div>
    </div>
    <div style="background: rgba(0,255,255,0.1); border: 1px solid rgba(0,255,255,0.3); border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 200px;">
      <div style="font-size: 1.5rem; margin-bottom: 8px;">🔒</div>
      <div style="font-weight: 600; color: #1e293b;">File Pattern Exclusion</div>
      <div style="font-size: 0.9rem; color: #64748b;">Automatically exclude sensitive files</div>
    </div>
    <div style="background: rgba(128,0,255,0.1); border: 1px solid rgba(128,0,255,0.3); border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 200px;">
      <div style="font-size: 1.5rem; margin-bottom: 8px;">🏠</div>
      <div style="font-weight: 600; color: #1e293b;">Local Model Support</div>
      <div style="font-size: 0.9rem; color: #64748b;">Run AI entirely offline for maximum privacy</div>
    </div>
  </div>
</div>

