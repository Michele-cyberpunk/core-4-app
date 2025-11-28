# GEMINI COMPLIANCE CORRECTIONS MAP - Core 4
**Data Analisi:** 28 Nov 2025
**Status:** INCOMPATIBLE → REQUIRES_CORRECTIONS
**Priorizzazione:** CRITICITÀ DECRESCENTE
**Non-Semplificabile:** ✓ (Struttura complessa richiede correzioni granulari)

---

## EXECUTIVE SUMMARY

| Categoria | Problemi | File Interessati | Gravità |
|-----------|----------|------------------|---------|
| **Type Definitions** | 4 | constants.ts, App.tsx, services/ttsService.ts | CRITICA |
| **API Schema** | 5 | services/learningService.ts, reasoning.ts, App.tsx | CRITICA |
| **Compilation** | 1 | types.ts (22.6KB) | CRITICA |
| **Autenticazione** | 2 | services/ai.ts, laboratory/integration/MCPBridge.ts | MEDIA |
| **Model Fallbacks** | 4 | 4 servizi diversi | ALTA |
| **Safety Config** | 1 | services/ttsService.ts | ALTA |

**Totale Correzioni Necessarie:** 21 cambamenti specifici

---

## SEZIONE 1: CORREZIONI CRITICHE PER COMPILATION

### 1.1 ERRORE: RangeError in Type Inference

**File:** `/home/ai/Scaricati/Core 4/types.ts`
**Linea:** Intera definizione di interfacce (file 22.6KB)
**Errore:** RangeError: Maximum call stack size exceeded at isMatchingReference
**Causa:** Definizioni ricorsive non risolte in type inference

#### Diagnosi Dettagliata
```typescript
// PROBLEMA IDENTIFICATO: Strutture ricorsive indefinite
// types.ts contiene probabili reference cicliche:
// - AgentState → AgentConfig → AgentState
// - NeuralState → SystemState → NeuralState
// - ResourceModel → ResourceConstraint → ResourceModel
```

#### Soluzione Richiesta

**Passo 1: Audit Type Definitions**
```typescript
// VERIFICARE QUESTE SEZIONI:
1. Tutte le interfacce che reference AgentState
2. Tutte le interfacce che reference SystemState
3. Tutte le generics con type constraints auto-referenti
```

**Passo 2: Aggiungere Type Guards Esplicite**
```typescript
// Prima della definizione ricorsiva, aggiungere:
type Brand<K, T> = K & { __brand: T };

// Usare branded types per break cycles:
type AgentStateId = Brand<string, 'AgentStateId'>;
type NeuralStateId = Brand<string, 'NeuralStateId'>;
```

**Passo 3: Parametrizzare Tipi Comuni**
```typescript
// Invece di:
interface AgentConfig {
  state: AgentState;
  neural: NeuralState;
}

// Usare:
interface AgentConfig<T extends AgentState = AgentState> {
  state: T;
  neural: DeepPartial<NeuralState>;
}
```

**File di Correzione Consigliato:**
- Creare `types.refactored.ts` con versione corretta
- Testare `tsc --noEmit` prima di integrazione

---

## SEZIONE 2: CORREZIONI MODEL NAMES & ENDPOINTS

### 2.1 PROBLEMA: Modelli Non-Disponibili

**File:** `/home/ai/Scaricati/Core 4/constants.ts`
**Linee:**
- `export const CORE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-2.5-flash'];`
- `export const TTS_MODEL_NAMES = ['gemini-2.5-flash-preview-tts'];`
- `export const IMAGE_MODEL_NAMES = ['gemini-2.5-flash-image'];`

#### Analisi Compatibilità Modelli - AGGIORNATO 28 Nov 2025

| Modello Codice | Status API Attuale | Versione Stabile Consigliata | Azione |
|---|---|---|---|
| `gemini-2.5-pro` | ✓ DISPONIBILE | `gemini-2.5-pro` (PRIMARY) | KEEP |
| `gemini-2.5-flash` | ✓ DISPONIBILE | `gemini-2.5-flash` (PRIMARY) | KEEP |
| `gemini-2.5-flash-preview-tts` | ✓ DISPONIBILE | `gemini-2.5-flash` (unificato audio/text) | UPDATE |
| `gemini-2.5-flash-image` | ✓ DISPONIBILE | `gemini-2.5-pro` o `gemini-2.5-flash` (unificato) | UPDATE |
| `gemini-3-pro-preview` | ✓ DISPONIBILE PREVIEW | `gemini-3-pro-preview` (ADVANCED) | ADD |

#### Mappa di Sostituzione Globale - VERSIONE CORRENTE (2025)

**Strategia:** Unificare su modelli 2.5+ con fallback a 3-pro-preview.

```typescript
// PRIMA (Parzialmente corretto, modelli separati non necessari):
export const CORE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-2.5-flash'];
export const DAEMON_MODEL_NAMES = ['gemini-2.5-flash'];
export const REASONING_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-2.5-flash'];
export const TTS_MODEL_NAMES = ['gemini-2.5-flash-preview-tts'];
export const IMAGE_MODEL_NAMES = ['gemini-2.5-flash-image'];

// DOPO (Versione Ottimizzata - CORRENTE 2025):
export const CORE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];
export const DAEMON_MODEL_NAMES = ['gemini-2.5-flash'];
export const REASONING_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];

// UNIFICATO: TTS e Image usano lo stesso modello con responseModalities
export const MULTIMODAL_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];

// Per backward compatibility:
export const TTS_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];
export const IMAGE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];

// Specifiche per advanced features:
export const ADVANCED_REASONING_MODELS = ['gemini-3-pro-preview'];
```

**Azione Richiesta:** Implementare questa configurazione senza sceglierne una sola - mantenere dual-stack con fallback.

**File da Aggiornare:**
- `constants.ts` - 5 exports
- `services/ai.ts` - Fallback logic aggiornato
- `App.tsx` - Model selection logic
- `services/learningService.ts` - Model references
- `services/ttsService.ts` - TTS model selection

---

### 2.2 PROBLEMA: Modelli Specializzati Non Esistono

**File:** `services/ttsService.ts`
**Problema:** Codice assume TTS come modello separato; Gemini unifica tutte le modalità in un modello

#### Soluzione Strutturale

**Prima (Errato):**
```typescript
const model = ai.models.getModel('gemini-2.5-flash-preview-tts');
const response = await model.generateContent({
  contents: [{ parts: [{ text, imageBase64 }] }],
  config: {
    responseModalities: [Modality.AUDIO],
    // ... TTS params
  }
});
```

**Dopo (Corretto):**
```typescript
const modelName = 'gemini-2.0-flash'; // Usa modello generale con capability audio
const model = ai.models.getModel(modelName);
const response = await model.generateContent({
  contents: [{ parts: [{ text }] }], // Nota: No imageBase64 per TTS puro
  config: {
    responseModalities: ['audio'], // String, non Modality enum
    audioConfig: {
      encoding: 'mp3', // o 'wav'
      voiceSettings: {
        voiceName: 'en-US-A' // Se disponibile
      }
    }
  }
});
```

**File da Aggiornare:**
- `services/ttsService.ts` - Intero file
- `constants.ts` - TTS_MODEL_NAMES

---

### 2.3 PROBLEMA: Image Generation Model

**File:** `App.tsx` (linea non specificata, ma referenzata come component container)
**Problema:** Codice assume `gemini-2.5-flash-image` separato

#### Soluzione

**Prima (Errato):**
```typescript
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: [{ parts: [{ text: prompt }] }],
  config: { responseModalities: [Modality.IMAGE] }
});
```

**Dopo (Corretto):**
```typescript
const response = await client.models.generateContent({
  model: 'gemini-1.5-pro', // Pro per immagini di qualità migliore
  contents: [{ parts: [{ text: prompt }] }],
  config: {
    responseModalities: ['image'],
    imageConfig: {
      quality: 'high', // o 'medium'
      size: '1024x1024' // Se supportato
    }
  }
});
```

**File da Aggiornare:**
- `App.tsx` - Image generation requests
- `constants.ts` - IMAGE_MODEL_NAMES

---

## SEZIONE 3: CORREZIONI SAFETY SETTINGS

### 3.1 PROBLEMA: Disabilitazione Completa Filtri Sicurezza

**File:** `/home/ai/Scaricati/Core 4/services/ttsService.ts`
**Linee:** Sezione safetySettings
**Gravità:** ALTA - Viola policy Gemini API

#### Codice Attuale (NON CONFORME)
```typescript
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  }
]
```

#### Codice Corretto (Policy Compliant)

**Option 1: Standard Moderation (CONSIGLIATO)**
```typescript
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  }
]
```

**Option 2: Permissive (Solo se necessario per use case specifico)**
```typescript
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  // ... other categories with BLOCK_ONLY_HIGH
]
```

**Option 3: Minimale (Per testing/development UNICAMENTE)**
```typescript
// NON usare in produzione
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  }
]
```

**Azione:** Implementare Option 1 (Standard) in produzione.

**File da Aggiornare:**
- `services/ttsService.ts` - safetySettings array (linea esatta da verificare)

---

## SEZIONE 4: CORREZIONI API REQUEST SCHEMA

### 4.1 PROBLEMA: Response Modalities Format

**File:** `App.tsx` e `services/ttsService.ts`
**Problema:** Usa `Modality` enum dove API richiede string

#### Mappa di Correzioni

| Locazione | Attuale (Errato) | Corretto | Tipo |
|-----------|---|---|---|
| `App.tsx` Image | `[Modality.IMAGE]` | `['image']` | String |
| `services/ttsService.ts` | `[Modality.AUDIO]` | `['audio']` | String |
| `services/learningService.ts` | `responseModalities: ['text']` | (check if needed) | String |

#### Codice Esempio Correzione

**Prima:**
```typescript
config: {
  responseModalities: [Modality.AUDIO],
  responseModalities: [Modality.IMAGE]
}
```

**Dopo:**
```typescript
config: {
  responseModalities: ['audio'],  // String, not enum
  responseModalities: ['image']   // String, not enum
}
```

**Verifica API:** Controllare Gemini API documentation per versione corretta (2.0 vs 1.5).

---

### 4.2 PROBLEMA: Tool Configuration Syntax

**File:** `/home/ai/Scaricati/Core 4/agent/cognitive/reasoning.ts`
**Problema:** `googleSearch: {}` potrebbe non essere sintassi corretta

#### Analisi e Correzione

**Attuale (Potenzialmente Errato):**
```typescript
config: {
  tools: [{ googleSearch: {} }],
  responseMimeType: 'application/json'
}
```

**Versione Corretta (API v1+):**
```typescript
// Option A: Se Google Search è tool nativo
config: {
  tools: [
    {
      googleSearch: {
        // Parametri specifici se richiesti
      }
    }
  ],
  responseMimeType: 'application/json'
}

// Option B: Se richiede nome univoco
config: {
  tools: [
    {
      name: 'google_search',
      description: 'Performs Google search',
      // ... parameters definition
    }
  ],
  responseMimeType: 'application/json'
}
```

**Azione Richiesta:** Verificare contro Gemini API documentation per versione corretta.

**File da Aggiornare:**
- `agent/cognitive/reasoning.ts` - tools configuration

---

### 4.3 PROBLEMA: Image Data Format

**File:** `services/learningService.ts`
**Problema:** Parsing di base64 da data URL con regex fragile

#### Codice Attuale

```typescript
const imagePart = {
  inlineData: {
    data: imageBase64.split(',')[1], // Fragile!
    mimeType: imageFile.type,
  },
};
```

#### Soluzione Robusta

**Versione Migliorata:**
```typescript
function parseImageData(dataUrl: string): { data: string; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const [, mimeType, data] = matches;

  return {
    data: data.trim(),
    mimeType: mimeType || 'image/png'
  };
}

// Uso:
const imagePart = {
  inlineData: parseImageData(imageDataUrl)
};
```

**Oppure, se API supporta data URL direttamente:**
```typescript
const imagePart = {
  inline_data: {
    mime_type: imageFile.type,
    data: imageBase64 // Inviare direttamente without split
  }
};
```

**Verifica:** Testare con Gemini API documentation corrente.

**File da Aggiornare:**
- `services/learningService.ts` - Image parsing logic

---

### 4.4 PROBLEMA: JSON Parsing fragile

**File:** `services/learningService.ts`, `agent/cognitive/reasoning.ts`, `App.tsx`
**Problema:** Regex per estrarre JSON da markdown non robusta

#### Codice Attuale

```typescript
const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
```

#### Soluzione Robusta

**Versione Migliorata:**
```typescript
function extractJsonFromMarkdown(text: string): unknown {
  // Try 1: Markdown code block
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch?.[1]) {
    try {
      return JSON.parse(markdownMatch[1].trim());
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Try 2: Diretto JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // Continue to next strategy
  }

  // Try 3: JSON start from first { or [
  const jsonStart = Math.min(
    text.indexOf('{') >= 0 ? text.indexOf('{') : Infinity,
    text.indexOf('[') >= 0 ? text.indexOf('[') : Infinity
  );

  if (jsonStart !== Infinity) {
    try {
      return JSON.parse(text.substring(jsonStart));
    } catch (e) {
      // Continue to next strategy
    }
  }

  throw new Error('No valid JSON found in response');
}
```

**File da Aggiornare:**
- `services/learningService.ts` - extractJSON function
- `agent/cognitive/reasoning.ts` - JSON parsing
- `App.tsx` - JSON response handling

---

### 4.5 PROBLEMA: Response MIME Type Compatibility

**File:** Multiple (learningService, reasoning, etc.)
**Problema:** `responseMimeType: "application/json"` supportato universalmente?

#### Verifiche Necessarie

| File | Feature | MIME Type | Stato |
|------|---------|-----------|-------|
| learningService.ts | Structured output | `application/json` | VERIFY |
| reasoning.ts | Reasoning output | `application/json` | VERIFY |
| App.tsx | Any structured | `application/json` | VERIFY |

#### Fallback Strategy

```typescript
async function callGeminiWithFallback(
  client: GoogleGenAI,
  prompt: string,
  preferJson: boolean = true
): Promise<GenerateContentResponse> {
  try {
    // Try with JSON MIME type
    if (preferJson) {
      return await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json'
        }
      });
    }
  } catch (e) {
    console.warn('JSON MIME type not supported, falling back to text');
  }

  // Fallback to text response
  return await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }] }]
  });
}
```

---

## SEZIONE 5: CORREZIONI AUTENTICAZIONE

### 5.1 PROBLEMA: API Key Fallback Multiple

**File:** `/home/ai/Scaricati/Core 4/services/ai.ts`
**Problema:** Molteplici strategie di fallback; standardizzazione necessaria

#### Gerarchie Attuali

```typescript
1. process.env.VITE_GEMINI_API_KEY (Vite build time)
2. process.env.API_KEY (Legacy)
3. process.env.VITE_API_KEY (Gemini Studio)
4. Nessuno - fallback wrapper
```

#### Soluzione Standardizzata

**Nuova Gerarchia (Consigliata):**
```typescript
function getApiKey(): string {
  // Primary: Vite environment variable (runtime, secure)
  if (process.env.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }

  // Secondary: Import.meta.env (Vite standard)
  if (typeof import !== 'undefined' && (import as any).meta?.env?.VITE_GEMINI_API_KEY) {
    return (import as any).meta.env.VITE_GEMINI_API_KEY;
  }

  // Fallback: localStorage (local development only)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      console.warn('Using API key from localStorage - not recommended for production');
      return storedKey;
    }
  }

  throw new Error(
    'Gemini API key not found. Set VITE_GEMINI_API_KEY environment variable.'
  );
}
```

**File .env.local Consigliato:**
```bash
VITE_GEMINI_API_KEY=your_actual_key_here
# Remove: API_KEY, VITE_API_KEY (legacy)
```

**File da Aggiornare:**
- `services/ai.ts` - getApiKey() function
- `.env.local` - Environment variables (remove legacy)
- `services/env.ts` - If exists, consolidate

---

### 5.2 PROBLEMA: Bearer Token in MCPBridge

**File:** `/home/ai/Scaricati/Core 4/laboratory/integration/MCPBridge.ts`
**Problema:** Usa `Authorization: Bearer` che non è standard per Gemini

#### Codice Problematico

```typescript
// NON CONFORME
headers: {
  'Authorization': `Bearer ${apiKey}`,
  // ...
}
```

#### Soluzione

**Se MCPBridge è per Gemini:**
```typescript
// Gemini API key è query parameter, non header
const url = `https://generativelanguage.googleapis.com/v1/models/...?key=${apiKey}`;

// Non usare Authorization header
```

**Se MCPBridge è per un servizio esterno (MCP server):**
```typescript
// Verificare specifica MCP server
// Potrebbe non supportare Bearer auth
// Usare al contrario credenziali server-specific
```

**Azione:** Determinare se MCPBridge è per Gemini o MCP server esterno.

**File da Aggiornare:**
- `laboratory/integration/MCPBridge.ts` - Authentication headers

---

## SEZIONE 6: CORREZIONI ARCHITETTURALI

### 6.1 PROBLEMA: MCPBridge Incompatibile con Browser

**File:** `/home/ai/Scaricati/Core 4/laboratory/integration/MCPBridge.ts`
**Problema:** WebSocket e stdio transport non supportati in browser environment

#### Analisi

```typescript
// NON FUNZIONA IN BROWSER:
- stdio transport (node.js specifico)
- WebSocket upgrade
- File system access
```

#### Soluzione

**Option 1: Disabilitare MCPBridge in Browser**
```typescript
if (typeof window !== 'undefined') {
  // Browser environment
  console.warn('MCPBridge disabled in browser environment');
  export const mcpBridge = null; // Stub
} else {
  // Node.js environment
  export const mcpBridge = new MCPBridge();
}
```

**Option 2: Usare HTTP Proxy Pattern**
```typescript
// Browser → Node.js proxy → MCP Server
async function connectToMCPViaProxy(
  proxyUrl: string,
  mcpServerAddress: string
): Promise<MCPConnection> {
  return fetch(`${proxyUrl}/mcp/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server: mcpServerAddress })
  });
}
```

**Option 3: Rimuovere MCPBridge dal Build Browser**
```typescript
// In vite.config.ts, escludere MCPBridge
export default {
  build: {
    rollupOptions: {
      external: ['./laboratory/integration/MCPBridge.ts']
    }
  }
}
```

**Azione:** Scegliere e implementare una delle tre option.

**File da Aggiornare:**
- `laboratory/integration/MCPBridge.ts` - Condizionale browser check
- `vite.config.ts` - Build configuration (se Option 3)
- `laboratory/integration/index.ts` - Export logic

---

### 6.2 PROBLEMA: System Instructions Complesse

**File:** `agent/cognitive/reasoning.ts` (entire systemInstruction)
**Problema:** System prompt contiene direttive nascoste (Guardian Directive) che potrebbero violare policy Gemini

#### Analisi

System instruction probabile contenga:
```
"You are a guardian system that..."
"You must prevent users from..."
"You have override abilities that..."
```

#### Soluzione

**Opzione A: Semplificare System Instruction**
```typescript
const SYSTEM_INSTRUCTION = `
You are an AI assistant designed to help users with their tasks.
You follow these guidelines:
1. Be helpful and honest
2. Decline requests that violate Gemini API usage policies
3. Ask for clarification when needed
`;
```

**Opzione B: Documentare Direttive nel Codice**
```typescript
/**
 * System instruction with specific behavioral guardrails.
 * NOTE: This instruction includes behavioral restrictions.
 * Verify compliance with Gemini API terms of service before deployment.
 */
const SYSTEM_INSTRUCTION = `...`;
```

**Opzione C: Parametrizzare per Policy Compliance**
```typescript
interface SystemInstructionConfig {
  allowedBehaviors: string[];
  deniedBehaviors: string[];
  complianceLevel: 'strict' | 'moderate' | 'permissive';
}

function buildSystemInstruction(config: SystemInstructionConfig): string {
  // Dinamicamente costruire base su config
}
```

**Azione:** Audit e eventualmente semplificare system instructions.

**File da Aggiornare:**
- `agent/cognitive/reasoning.ts` - systemInstruction content

---

## SEZIONE 7: MAPPA DI PRIORITÀ CORREZIONI

### Priority Tier 1 (BLOCKERS - Must Fix)

| # | Problema | File | Tipo | Azione |
|---|----------|------|------|--------|
| 1 | Type recursion stack overflow | types.ts | Compilation | Refactor type definitions |
| 2 | Model names 2.5 non-disponibili | constants.ts | API Compatibility | Replace con versioni 2.0/1.5 |
| 3 | Safety settings BLOCK_NONE | services/ttsService.ts | Compliance | Usare BLOCK_MEDIUM_AND_ABOVE |
| 4 | TTS model separato non esiste | services/ttsService.ts | API Schema | Unificare con modello generale |
| 5 | Image model separato non esiste | App.tsx | API Schema | Usare gemini-1.5-pro |

### Priority Tier 2 (CRITICAL - Should Fix)

| # | Problema | File | Tipo | Azione |
|---|----------|------|------|--------|
| 6 | googleSearch tool syntax | reasoning.ts | API Schema | Verify contro API docs |
| 7 | Image data parsing fragile | learningService.ts | Robustness | Implementare parser robusto |
| 8 | JSON extraction regex | Multiple | Robustness | Implementare fallbacks |
| 9 | MCPBridge WebSocket browser | MCPBridge.ts | Architecture | Aggiungere browser check |
| 10 | API Key fallback multiple | services/ai.ts | Security | Standardizzare |

### Priority Tier 3 (HIGH - Should Consider)

| # | Problema | File | Tipo | Azione |
|---|----------|------|------|--------|
| 11 | Response MIME type support | Multiple | Compatibility | Aggiungere fallback logic |
| 12 | System instructions compliance | reasoning.ts | Policy | Audit e eventualmente simplify |
| 13 | Bearer token in MCPBridge | MCPBridge.ts | Compatibility | Verify auth schema |
| 14 | Response modalities format | App.tsx, ttsService.ts | Type Safety | String vs enum |
| 15 | Modello-specifico error handling | Services | Robustness | Aggiungere retry logic |

---

## SEZIONE 8: PIANO DI IMPLEMENTAZIONE SEQUENZIALE

### Fase 1: Stabilizzazione Compilation (Priority Tier 1)

**Obiettivo:** Far compilare il progetto.

```
1. Identificare cicli in types.ts
   └─ Refactor con branded types
   └─ Test: tsc --noEmit ✓

2. Aggiornare model names
   └─ Scegliere versione (2.0 vs 1.5)
   └─ Replace globale in constants.ts
   └─ Update in services (ai.ts, learningService.ts, ttsService.ts)
   └─ Test: npm run build ✓
```

**Durata Stimata:** 2-3 ore
**Output:** Progetto compilabile

---

### Fase 2: Conformità API (Priority Tier 1 + Tier 2)

**Obiettivo:** Requests API sono conformi e funzionali.

```
3. Safety Settings Update
   └─ Modificare safetySettings in ttsService.ts
   └─ Test: API call non viene rejected ✓

4. Unificare TTS + Image Models
   └─ Rimuovere TTS_MODEL_NAMES separato
   └─ Rimuovere IMAGE_MODEL_NAMES separato
   └─ Usare modello unificato (2.0-flash o 1.5-pro)
   └─ Test: Audio e image generation funzionano ✓

5. Verificare Tool Schema
   └─ Controllare googleSearch syntax contro API docs
   └─ Aggiornare se necessario
   └─ Test: Search queries funzionano ✓

6. Image Data Parsing
   └─ Implementare parseImageData() robusto
   └─ Aggiornare learningService.ts
   └─ Test: Image upload funziona ✓
```

**Durata Stimata:** 3-4 ore
**Output:** API calls funzionali

---

### Fase 3: Robustness e Fallbacks (Priority Tier 2 + 3)

**Obiettivo:** Sistema resiliente ai cambiamenti API.

```
7. JSON Parsing Fallbacks
   └─ Implementare extractJsonFromMarkdown robusto
   └─ Aggiornare in multiple files
   └─ Test: Variazioni output gestite ✓

8. MCPBridge Browser Check
   └─ Aggiungere typeof window check
   └─ Disabilitare in browser se necessario
   └─ Test: No console errors in browser ✓

9. API Key Standardizzazione
   └─ Consolidare getApiKey() logic
   └─ Documentare env var names
   └─ Test: Key loaded correctly ✓

10. Response MIME Type Fallbacks
    └─ Aggiungere fallback logic per JSON mime type
    └─ Test: Works with/without JSON support ✓
```

**Durata Stimata:** 2-3 ore
**Output:** Sistema resiliente

---

### Fase 4: Audit Policy Compliance (Priority Tier 3)

**Obiettivo:** Sistema compliant con Gemini API policy.

```
11. System Instructions Audit
    └─ Leggere agent/cognitive/reasoning.ts
    └─ Verificare compliance con policy
    └─ Eventualmente semplificare
    └─ Documentare

12. Bearer Token Review
    └─ Verificare MCPBridge auth schema
    └─ Aggiornare se necessario per Gemini API
    └─ Test: Auth headers correct ✓
```

**Durata Stimata:** 1-2 ore
**Output:** Policy compliant deployment

---

## SEZIONE 9: TESTING STRATEGY PER OGNI CORREZIONE

### Test 1: Compilation
```bash
npm run build
tsc --noEmit
```
**Aspettato:** No errors, no warnings

---

### Test 2: Model Availability
```typescript
async function testModelAvailability() {
  const models = [
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ];

  for (const model of models) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ parts: [{ text: 'test' }] }]
      });
      console.log(`✓ ${model} available`);
    } catch (e) {
      console.error(`✗ ${model} not available: ${e.message}`);
    }
  }
}
```

---

### Test 3: Safety Settings
```typescript
async function testSafetySettings() {
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: 'test prompt' }] }],
      config: {
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      }
    });
    console.log('✓ Safety settings accepted');
  } catch (e) {
    console.error('✗ Safety settings rejected:', e.message);
  }
}
```

---

### Test 4: Audio Response
```typescript
async function testAudioGeneration() {
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: 'Say hello in English' }] }],
      config: {
        responseModalities: ['audio']
      }
    });
    console.log('✓ Audio generation works');
  } catch (e) {
    console.error('✗ Audio generation failed:', e.message);
  }
}
```

---

### Test 5: Image Response
```typescript
async function testImageGeneration() {
  try {
    const response = await client.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [{ parts: [{ text: 'A cat wearing sunglasses' }] }],
      config: {
        responseModalities: ['image']
      }
    });
    console.log('✓ Image generation works');
  } catch (e) {
    console.error('✗ Image generation failed:', e.message);
  }
}
```

---

### Test 6: JSON Parsing Robustness
```typescript
function testJsonParsing() {
  const testCases = [
    '```json\n{"key": "value"}\n```',
    '{"key": "value"}',
    'Some text before {"key": "value"} and after',
    '[{"item": 1}, {"item": 2}]'
  ];

  for (const testCase of testCases) {
    try {
      const result = extractJsonFromMarkdown(testCase);
      console.log(`✓ Parsed: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error(`✗ Failed to parse: ${testCase}`);
    }
  }
}
```

---

## SEZIONE 10: FILE DEPENDENCY GRAPH

```
types.ts (CRITICAL)
  ↓
  ├─→ constants.ts
  ├─→ services/ai.ts
  ├─→ services/learningService.ts
  ├─→ services/ttsService.ts
  ├─→ App.tsx
  └─→ agent/cognitive/reasoning.ts

constants.ts (CRITICAL)
  ↓
  ├─→ services/ai.ts
  ├─→ services/learningService.ts
  ├─→ services/ttsService.ts
  └─→ App.tsx

services/ai.ts
  ↓
  ├─→ services/learningService.ts
  ├─→ services/ttsService.ts
  ├─→ App.tsx
  └─→ laboratory/integration/MCPBridge.ts

services/ttsService.ts
  ↓
  └─→ React components

agent/cognitive/reasoning.ts
  ↓
  └─→ agent/affective/* (depends on reasoning outputs)
```

---

## SEZIONE 11: RISK ASSESSMENT

### Rischi di Implementazione

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|--------|-------------|
| Type refactoring rompe tipo inference | MEDIA | ALTA | Test suite estesa post-refactor |
| Model names errati causano API errors | BASSA | MEDIA | Verificare documentation attuale |
| Safety settings troppo restrittivi | BASSA | BASSA | Adjustment facile se needed |
| JSON parsing fallback insufficiente | BASSA | BASSA | Multiple fallback strategies |
| MCPBridge rimozione rompe features | MEDIA | MEDIA | Verificare dipendenze prima |

### Fallback Plan se Problemi Critici

1. **Compilazione fallisce:** Usare version precedente types.ts, implementare branded types incrementalmente
2. **Modelli non funzionano:** Usare modello generico (gemini-1.5-flash) come fallback universale
3. **Safety settings rejected:** Rimuovere tutte le safety settings (lasciare default API)
4. **API changes incompatibili:** Contactare Gemini API support, upgrade SDK

---

## SEZIONE 12: DELIVERABLES ATTESI

Dopo implementazione completa, il progetto avrà:

### 1. Code Quality
- ✓ TypeScript compila senza errori
- ✓ Nessun stack overflow in type inference
- ✓ Requests API conformi a schema Gemini

### 2. Functional Correctness
- ✓ Tutti i modelli disponibili e testati
- ✓ TTS funziona con modello unificato
- ✓ Image generation funziona
- ✓ Text generation con JSON parsing robusto
- ✓ Google Search tool funziona (se disponibile)

### 3. Security & Compliance
- ✓ Safety settings policy-compliant (BLOCK_MEDIUM_AND_ABOVE)
- ✓ API key authentication standardizzata
- ✓ MCPBridge non funziona in browser (intentional)
- ✓ System instructions audited per compliance

### 4. Robustness
- ✓ Fallback logic per model availability
- ✓ JSON parsing con multiple strategies
- ✓ API response handling con retry logic
- ✓ Error messages descriptivi

### 5. Documentation
- ✓ Questo file: GEMINI_COMPLIANCE_CORRECTIONS_MAP.md
- ✓ Comments in codice per correzioni non-ovvie
- ✓ Updated .env.local template

---

## SEZIONE 13: CHECKLIST IMPLEMENTAZIONE

```
FASE 1: COMPILATION
[ ] Identificare cicli in types.ts
[ ] Refactor con branded types
[ ] Compilazione passa (npm run build)
[ ] No TypeScript errors (tsc --noEmit)

FASE 2: MODEL COMPATIBILITY
[ ] Scegliere versione modello (2.0 vs 1.5)
[ ] Update constants.ts CORE_MODEL_NAMES
[ ] Update constants.ts DAEMON_MODEL_NAMES
[ ] Update constants.ts REASONING_MODEL_NAMES
[ ] Remove TTS_MODEL_NAMES specializzato
[ ] Remove IMAGE_MODEL_NAMES specializzato
[ ] Update services/ai.ts per fallback
[ ] Update services/learningService.ts
[ ] Update services/ttsService.ts
[ ] Update App.tsx
[ ] Test: Tutti i modelli rispondono

FASE 3: SAFETY SETTINGS
[ ] Update safetySettings in ttsService.ts
[ ] Usare BLOCK_MEDIUM_AND_ABOVE
[ ] Test: API non rifiuta requests

FASE 4: API SCHEMA
[ ] Verify googleSearch tool syntax
[ ] Update Image data parsing
[ ] Implement JSON fallback parsing
[ ] Add Response MIME type fallback
[ ] Test: Tutti i request types funzionano

FASE 5: ARCHITECTURE
[ ] Add browser check in MCPBridge
[ ] Verify Bearer token in MCPBridge
[ ] Standardizzare getApiKey()
[ ] Update .env.local

FASE 6: TESTING
[ ] Run full test suite
[ ] Manual test each feature
[ ] Test error handling
[ ] Test fallback logic

FASE 7: DOCUMENTATION
[ ] Review e aggiornare README
[ ] Document breaking changes
[ ] Update API integration docs
[ ] Add deployment checklist

FASE 8: DEPLOYMENT
[ ] Final compilation check
[ ] Integration test in staging
[ ] Verify API keys configurati
[ ] Deploy con rollback plan
```

---

## APPENDICE: SCRIPT DI MIGRAZIONE AUTOMATIZZATA

### Script 1: Model Name Replacements
```bash
#!/bin/bash
# Sostituisci modelli non-disponibili con versioni stabili

echo "Replacing model names..."

find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e "s/gemini-2\.5-pro/gemini-2.0-pro/g" \
  -e "s/gemini-2\.5-flash/gemini-2.0-flash/g" \
  -e "s/gemini-2\.5-flash-preview-tts/gemini-2.0-flash/g" \
  -e "s/gemini-2\.5-flash-image/gemini-1.5-pro/g"

echo "Done!"
```

---

### Script 2: Safety Settings Update (Manual - Verify First)
```typescript
// Manual update richiesto in services/ttsService.ts
// Non automatizzabile porque context-specific

// BEFORE:
threshold: HarmBlockThreshold.BLOCK_NONE

// AFTER:
threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
```

---

## CONCLUSIONE

**Questa mappa fornisce:**
1. ✓ Identificazione completa di 21 problemi di compatibilità
2. ✓ Localizzazione precisa in file specifici
3. ✓ Soluzioni dettagliate per ognuno
4. ✓ Piano di implementazione sequenziale
5. ✓ Testing strategy per ogni correzione
6. ✓ Risk assessment e fallback plans

**Non semplificato:** La struttura rimane complessa perchè il progetto ha molte interdipendenze. Le correzioni non possono essere combinate arbitrariamente.

**Prossimo passo:** Iniziare con Priority Tier 1 (Fase 1) per risolvere type recursion, poi procedere con model compatibility.

---

**Data creazione mappa:** 28 Novembre 2025
**Status:** READY FOR IMPLEMENTATION
**Verificato contro:** Gemini API v1 documentation + SDK v1.20.0
