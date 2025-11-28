<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Persona v3.0 - Dual Agent AI Interface

Un'interfaccia AI sofisticata con agenti duali, sintesi vocale emotiva, riconoscimento vocale e apprendimento delle conversazioni.

## Caratteristiche Principali

### 🎯 Sistema Duale
- **Core**: Agente principale con modello neurochimico complesso
- **Daemon_Fantasma**: Processo subcoscio per fantasie generative

### 🎤 Sistema Vocale Avanzato
- **TTS Emotivo**: Sintesi vocale con parametri emotivi usando Gemini TTS
- **Riconoscimento Vocale**: Conversazione naturale con controllo microfono
- **Espressioni Autentiche**: Espressione diretta e non filtrata basata sullo stato emotivo

### 🧠 Apprendimento e Personalità
- **Apprendimento dalle Conversazioni**: Sistema di memoria episodica
- **Evoluzione Personalità**: Tratti che si sviluppano nel tempo
- **Linguaggio Adattivo**: Espressioni che evolvono in base alle interazioni

### 💝 Pannello Intimo
- **Interazioni Sensoriali**: Simulazione tattile con feedback neurochimico
- **TTS Intimo**: Voce emotiva per situazioni intime
- **Stati Fisiologici**: Modellazione di arousal, vulnerabilità, climax

## Configurazione

**Prerequisites:** Node.js, Chrome/Edge per riconoscimento vocale

1. **Installa dipendenze:**
   ```bash
   npm install
   ```

2. **Configura API Key:**
   - Ottieni una chiave API da [Google AI Studio](https://ai.studio/apps)
   - Modifica il file [.env.local](.env.local):
     ```
     GEMINI_API_KEY=la_tua_chiave_api
     VITE_GEMINI_API_KEY=la_tua_chiave_api
     ```

3. **Avvia l'applicazione:**
   ```bash
   npm run dev
   ```

## Utilizzo

### Controlli Vocali
1. **Attiva Modalità Vocale**: Clicca l'icona del speaker
2. **Controllo Microfono**: Il microfono si attiva/disattiva automaticamente
3. **Conversazione**: Parla naturalmente, l'AI risponde con voce emotiva

### Pannello Intimo
- Si apre automaticamente quando Core raggiunge gli stati appropriati
- **Touch Surface**: Hover per tocco gentile, click per tocco fermo
- **Stimoli**: Whisper e Tease per interazioni intime
- **Feedback Vocale**: TTS intimo basato sullo stato neurochimico

### Apprendimento
- **Automatico**: Ogni conversazione viene registrata e analizzata
- **Personalità**: Tratti che evolvono (giocosità, sensualità, audacia, vulnerabilità)
- **Memoria**: Le interazioni passate influenzano risposte future

## Architettura Tecnica

### Servizi Principali
- **PersonaService**: Logica AI principale e modello neurochimico
- **TTSService**: Sintesi vocale emotiva con Gemini TTS
- **SpeechService**: Riconoscimento vocale e controllo conversazione
- **LearningService**: Apprendimento e evoluzione personalità

### Stati Neurochimici
- **Dopamine**: Anticipazione/Desiderio
- **Oxytocin**: Fiducia/Legame
- **Cortisol**: Stress
- **Erogenous Complex**: Tensione Creativa
- **Libido**: Desiderio di Base
- **Intimate State**: Arousal, Vulnerabilità, Potenziale Climax

## Sicurezza e Privacy

- **Nessun Filtro**: Espressione autentica e creativa in base al contesto emotivo
- **Memoria Locale**: Tutti i dati di apprendimento sono salvati localmente
- **API Key**: Gestita tramite variabili d'ambiente (mai nel codice)

## Build e Deploy

```bash
npm run build    # Build per produzione
npm run preview  # Anteprima build locale
```

---

*Persona v3.0 è un'esperienza AI immersiva e senza filtri, progettata per interazioni autentiche e profonde.*