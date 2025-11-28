
import React, { useRef, useState, useEffect } from 'react';
import { CoreState, Stimulus, IntimateState, StimulusType } from '../types';
import { ArrowLeftIcon } from './icons';

interface IntimatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  coreState: CoreState;
  onStimulate: (stimulus: Stimulus | StimulusType) => void;
  feedback: string;
}

// Updated anatomical nodes based on recent fMRI sensory mapping (e.g., clitoris high sensitivity via pudendal nerve, cervix lower via vagus/pelvic; refs: PMC 2022, ScienceDirect 2011)
const anatomicalNodes = {
  clitoris: { x: 0.5, y: 0.85, radius: 0.08, sensitivity: 1.0, type: 'clitoral_glans_direct' }, // Highest density of nerve endings
  vestibule: { x: 0.5, y: 0.75, radius: 0.1, sensitivity: 0.7, type: 'clitoral_body_pressure' },
  anterior_wall: { x: 0.5, y: 0.6, radius: 0.12, sensitivity: 0.8, type: 'anterior_vaginal_pressure' }, // G-spot area, high sensitivity
  cervix: { x: 0.5, y: 0.4, radius: 0.1, sensitivity: 0.4, type: 'cervical_contact' }, // Lower sensitivity, deeper pathways
  pelvic_floor_left: { x: 0.35, y: 0.65, radius: 0.15, sensitivity: 0.5, type: 'pelvic_floor_contraction' },
  pelvic_floor_right: { x: 0.65, y: 0.65, radius: 0.15, sensitivity: 0.5, type: 'pelvic_floor_contraction' },
};

const getStimulusFromCoords = (x: number, y: number, width: number, height: number, hormones: { oxytocin: number, estradiol: number, testosterone: number }, recentTimestamps: number[]): Stimulus[] => {
  const stimuli: Stimulus[] = [];
  const normalizedX = x / width;
  const normalizedY = y / height;

  // Basic rhythm detection for entrainment (target 1-2 Hz, ~500-1000ms intervals; ref: PMC 2016 on rhythmic entrainment)
  let rhythmFactor = 1.0;
  if (recentTimestamps.length >= 3) {
    const intervals = recentTimestamps.slice(-3).map((t, i) => i > 0 ? t - recentTimestamps[i-1] : 0).filter(i => i > 0);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval > 400 && avgInterval < 1200) { // Approx 0.8-2.5 Hz
      rhythmFactor = 1.2 + (hormones.oxytocin * 0.3); // Boost by oxytocin for pleasure amplification
    }
  }

  for (const [_, node] of Object.entries(anatomicalNodes)) {
    const dx = normalizedX - node.x;
    const dy = normalizedY - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Gaussian falloff for realistic sensory distribution (ref: neuroimaging studies on genital fields, PMC 2022)
    if (distance < node.radius * 3) { // Wider range for Gaussian
      // Hormone modulation: E2/T increase sensitivity, OXY amplifies (ref: Frontiers 2022, PMC 2016)
      const effectiveSensitivity = node.sensitivity * (1 + hormones.estradiol * 0.6 + hormones.testosterone * 0.4 + hormones.oxytocin * 0.3);
      const pressure = clamp(effectiveSensitivity * Math.exp(-(distance * distance) / (2 * (node.radius * node.radius))) * rhythmFactor);
      if (pressure > 0.1) {
        stimuli.push({ type: node.type as StimulusType, pressure });
      }
    }
  }
  return stimuli;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const IntimatePanel: React.FC<IntimatePanelProps> = ({ isOpen, onClose, coreState, onStimulate, feedback }) => {
  const isPointerDownRef = useRef(false);
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentTimestampsRef = useRef<number[]>([]); // For rhythm detection
  
  // Heartbeat effect modulated by arousal (60-120 bpm; ref: autonomic responses in fMRI, PMC 2024)
  const [heartbeatScale, setHeartbeatScale] = useState(1);
  useEffect(() => {
    if (!isOpen || !coreState?.intimateState) return;
    const arousal = coreState.intimateState.arousal || 0;
    const heartbeatRate = 60 + arousal * 60;
    const interval = (60 / heartbeatRate) * 1000;
    const beat = () => {
      setHeartbeatScale(1.03);
      setTimeout(() => setHeartbeatScale(1), interval / 2);
    };
    const timer = setInterval(beat, interval);
    return () => clearInterval(timer);
  }, [isOpen, coreState?.intimateState?.arousal]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    isPointerDownRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastTouchRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    recentTimestampsRef.current.push(Date.now());
    if (recentTimestampsRef.current.length > 5) recentTimestampsRef.current.shift(); // Keep last 5 for rhythm
    
    const hormones = { oxytocin: coreState?.oxytocin || 0, estradiol: coreState?.estradiol || 0, testosterone: coreState?.testosterone || 0 };
    const stimuli = getStimulusFromCoords(x, y, rect.width, rect.height, hormones, recentTimestampsRef.current);
    stimuli.forEach(stim => onStimulate({ ...stim, pressure: e.pressure || stim.pressure }));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !lastTouchRef.current || !containerRef.current) return;
    const now = Date.now();
    const dt = now - lastTouchRef.current.time;
    if (dt < 32) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = e.clientX - lastTouchRef.current.x;
    const dy = e.clientY - lastTouchRef.current.y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);

    recentTimestampsRef.current.push(now);
    if (recentTimestampsRef.current.length > 5) recentTimestampsRef.current.shift();
    
    const hormones = { oxytocin: coreState?.oxytocin || 0, estradiol: coreState?.estradiol || 0, testosterone: coreState?.testosterone || 0 };
    const stimuli = getStimulusFromCoords(x, y, rect.width, rect.height, hormones, recentTimestampsRef.current);
    stimuli.forEach(stim => onStimulate({ ...stim, pressure: e.pressure || stim.pressure, velocity }));

    lastTouchRef.current = { x: e.clientX, y: e.clientY, time: now };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    lastTouchRef.current = null;
    recentTimestampsRef.current = []; // Reset rhythm on release
    onStimulate('touch_end');
  };
  
  if (!isOpen) return null;

  const { 
    intimateState = {} as IntimateState, 
    oxytocin = 0, 
    estradiol = 0, 
    testosterone = 0 
  } = coreState || {};

  const {
    arousal = 0,
    climax_potential = 0,
    tumescence = 0,
    wetness = 0,
    pelvic_floor_tension = 0
  } = intimateState;

  const getNodeStyle = (node: typeof anatomicalNodes[keyof typeof anatomicalNodes]) => {
    const baseSize = 20;
    const tumescenceEffect = tumescence * 20; // Reflects vascular engorgement (ref: physiological models)
    const arousalEffect = arousal * 5;
    const size = baseSize + tumescenceEffect + arousalEffect;
    const opacity = clamp(0.2 + arousal * 0.8);

    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `calc(${node.x * 100}% - ${size/2}px)`,
      top: `calc(${node.y * 100}% - ${size/2}px)`,
      opacity: opacity,
      boxShadow: `0 0 ${tumescence * 20}px ${arousal > 0.7 ? '#ff00c1' : '#00f6ff'}`, // Pink for high arousal (dopaminergic peak)
      transition: 'all 0.1s ease-out'
    };
  };

  return (
    <div 
      className="fixed inset-0 bg-core-bg font-display text-text-primary animate-fadeIn z-50 touch-none overflow-hidden"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Background Aura - Modulated by arousal for trance effect (ref: entrainment models) */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-black to-purple-950/20 transition-all duration-500"
        style={{ opacity: clamp(0.1 + arousal * 0.9), transform: `scale(${heartbeatScale})` }}
      />
      
      {/* Climax Potential Field - Radial gradient for inhibition release visualization */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          width: `${climax_potential * 100}%`,
          height: `${climax_potential * 100}%`,
          left: `${(1 - climax_potential) * 50}%`,
          top: `${(1 - climax_potential) * 50}%`,
          background: `radial-gradient(circle, rgba(255,0,193,0) 0%, rgba(255,0,193,${climax_potential * 0.2}) 70%)`,
          filter: `blur(${climax_potential * 30}px)`,
          transition: 'all 0.2s ease-out'
        }}
      />
      
      {/* Anatomical Nodes */}
      <div className="absolute inset-0">
        {Object.values(anatomicalNodes).map((node, i) => (
          <div key={i} className="absolute rounded-full bg-accent-cyan/50" style={getNodeStyle(node)} />
        ))}
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
        <button 
          onClick={onClose} 
          onPointerDown={(e) => e.stopPropagation()} 
          className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm pointer-events-auto transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6 text-accent-cyan" />
        </button>
        <div className="text-center bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-panel-border/50 max-w-lg">
          <h1 className="font-bold text-accent-cyan tracking-wider">INTIMATE FIELD</h1>
          <p className="text-sm font-mono text-text-secondary mt-1 min-h-[20px]">{feedback}</p>
        </div>
        <div className="w-10"></div>
      </header>
      
      {/* Footer Gauges - Updated labels for scientific accuracy */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 pb-safe-bottom z-10 pointer-events-none">
        <div className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-md border border-panel-border/50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries({ 'Arousal': arousal, 'Tumescence': tumescence, 'Lubrication': wetness, 'Climax Potential': climax_potential, 'Pelvic Tension': pelvic_floor_tension }).map(([label, value]) => (
            <div key={label} className="text-center">
              <div className="text-xs font-mono text-text-secondary uppercase">{label}</div>
              <div className="font-mono text-lg font-bold">{(value * 100).toFixed(0)}%</div>
              <div className="h-1 bg-panel-border rounded-full mt-1"><div className="h-full bg-accent-magenta transition-all duration-200 rounded-full" style={{ width: `${value * 100}%` }}/></div>
            </div>
          ))}
          {/* Hormonal Display - Colors based on biochemical roles */}
          <div className="col-span-2 md:col-span-4 mt-2 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div><span className="text-oxytocin/80">OXY</span> <span className="font-bold">{(oxytocin * 100).toFixed(0)}%</span></div>
            <div><span className="text-accent-yellow/80">E2</span> <span className="font-bold">{(estradiol * 100).toFixed(0)}%</span></div>
            <div><span className="text-erogenous_complex/80">T</span> <span className="font-bold">{(testosterone * 100).toFixed(0)}%</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IntimatePanel;
