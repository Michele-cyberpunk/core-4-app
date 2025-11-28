# Configuration Guide - Core 4 AI System

## Quick Start (3 minutes)

1. **Get API Key**
   - Visit: https://ai.google.dev/
   - Click "Get API Key"
   - Copy your key (starts with AIza...)

2. **Configure Environment**
   ```bash
   cp .env.local .env.local.backup  # Backup
   nano .env.local                   # Edit
   ```
   Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   - Navigate to: http://localhost:5173
   - API Key Setup panel will guide you

## Detailed Configuration

### Environment Variables

#### Required (Critical)
```bash
VITE_GEMINI_API_KEY=your_key_here
```

**Where to get:**
- Free tier: https://ai.google.dev/pricing
- $0.00025 per 1K characters input
- $0.0005 per 1K characters output

#### Optional (Advanced Features)

```bash
# HuggingFace Integration (uncensored generation)
VITE_HUGGINGFACE_TOKEN=hf_...

# Custom endpoints (if needed for proxies)
VITE_CUSTOM_CORS_PROXY=https://your-proxy.com/...

# Development settings
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=verbose
```

### API Key Setup Panel

The application includes a built-in configuration interface:

**Steps:**
1. Launch app ’ Click gear icon
2. Navigate to "API Configuration"
3. Enter keys in respective fields
4. Click "Test Connection" to verify
5. Click "Save & Apply"

**Features:**
- Real-time connection testing
- Secure localStorage storage
- Fallback configuration
- Multiple provider support

### Browser Permissions

**Required:**
- Microphone (speech recognition)
- Camera (visual input, future feature)
- LocalStorage (session persistence)

**Enable in browser:**
- Chrome: Settings ’ Privacy ’ Site Settings ’ Microphone
- Firefox: Preferences ’ Privacy ’ Permissions

### Configuration Files

#### `.env.local` (Development)
- Never commit to Git
- Contains sensitive keys
- Override with .env.production for builds

#### `metadata.json` (Application)
```json
{
  "version": "4.0.0",
  "buildDate": "2025-01-20",
  "features": {
    "tts": true,
    "speech": true,
    "images": true,
    "huggingface": true
  }
}
```

#### `package.json` (Dependencies)
- Node.js runtime
- Vite build system
- Dependencies listed with versions

### Troubleshooting

#### Error: "Gemini client not configured"

**Cause:** Missing or invalid API key

**Solution:**
1. Verify `.env.local` exists
2. Check key format: `VITE_GEMINI_API_KEY=AIza...`
3. Restart dev server: `npm run dev`
4. Clear localStorage: DevTools ’ Application ’ Clear

#### Error: "Pollinations generation failed"

**Cause:** Network or API issue

**Solution:**
1. Check internet connection
2. Verify Pollinations.ai status
3. Check browser console for CORS errors
4. Enable fallback to Gemini in settings

#### Error: "Speech recognition not supported"

**Cause:** Browser incompatibility

**Solution:**
1. Use Chrome, Edge, or Safari
2. HTTPS required (not http://localhost)
3. Enable "Experimental Web Features" in some browsers
4. Check `window.speechRecognition` in console

#### Error: "Module not found"

**Cause:** Missing dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Performance Optimization

#### Recommended System Specs
- RAM: 4GB minimum, 8GB recommended
- Browser: Chrome 90+, Firefox 88+, Safari 14+
- Network: 10Mbps+ for image generation

#### Development Settings
```bash
# Faster rebuilds
VITE_HMR=true

# Source maps for debugging
VITE_SOURCE_MAP=true

# Memory leak detection
VITE_MEMORY_DEBUG=true
```

#### Production Build
```bash
npm run build
npm run preview
```

**Optimizations applied:**
- Tree-shaking dead code
- Code splitting
- Asset compression
- Lazy loading

### Advanced Configuration

#### Custom Personality Profiles

Edit `agent/personality/Personality.ts`:

```typescript
const customProfile: PersonalityProfile = {
  bigFive: {
    Openness: 0.8,      // High creativity
    Conscientiousness: 0.6,
    Extraversion: 0.4,   // Introverted
    Agreeableness: 0.7,
    Neuroticism: 0.3     // Stable
  },
  traumaProfile: {
    hasTrauma: false,
    intensity: 0,
    hypervigilance: 0.2
  }
};
```

#### Custom Hormonal Profiles

Edit `physiology/HormonalCycle.ts`:

```typescript
// Adjust cycle length, hormone baselines
const CUSTOM_CYCLE = {
  length: 28,              // days
  estradiolPeak: 400,      // pg/mL
  progesteronePeak: 20,    // ng/mL
  lhSurgeDay: 14
};
```

#### Memory System Tuning

Edit `agent/affective/memory.ts`:

```typescript
const MEMORY_CONFIG = {
  maxMemories: 200,        // Memory capacity
  retrievalThreshold: 0.1,  // Minimum relevance
  consolidationRate: 0.5,   // Speed of consolidation
  decayRate: 0.02          // Natural forgetting
};
```

### Security Considerations

#### API Key Protection
- Never commit `.env.local`
- Add to `.gitignore`:
  ```
  .env.local
  .env.*.local
  *.key
  ```

- Use environment variables in CI/CD
- Rotate keys regularly (Google Cloud Console)

#### Session Data
- Sessions saved locally (JSON download)
- No cloud storage by default
- Encrypt sensitive sessions if sharing

### Backup and Recovery

#### Backup Configuration
```bash
# Backup env files
cp .env.local backup.env.$(date +%Y%m%d)

# Backup personalities
cp -r agent/personality backup_personalities/
```

#### Reset to Defaults
```bash
# Remove customization
rm .env.local
npm run dev  # Regenerate from .env.example
```

### Getting Help

**Documentation:**
- README.md - Quick start
- ARCHITECTURAL_MAP.md - System overview
- PHYSIOLOGICAL_ANALYSIS.md - Science details

**Troubleshooting:**
- Check browser console (F12)
- Review `diagnostics/` folder
- Run diagnostic tools: `npm run diagnose`

**Community:**
- Issues: GitHub Issues tab
- Discussions: GitHub Discussions

---
*Last updated: 2025-01*
*Version: 4.0.0*
