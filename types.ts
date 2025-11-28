export * from './neuro-types';
export * from './intimate-types';
export * from './cycle-types';
export * from './core-types';

// Common types and enums not moved to splits
export enum MessageAuthor {
  USER = 'user',
  CORE = 'core',
  SYSTEM = 'system',
  DAEMON = 'daemon',
}

export interface GroundingSource {
  uri: string;
  title?: string;
}

export interface Point2D {
  point_2d: [number, number];
}

export interface Box2D {
  box_2d: [number, number, number, number];
  label?: string;
}

export interface SegmentationMask extends Box2D {
  mask: string; // base64 encoded PNG
}

export type VisualOutput = (Point2D | Box2D | SegmentationMask)[];

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  text: string;
  rationale?: string;
  imageUrl?: string;
  sources?: GroundingSource[];
  // For multi-modal history and local persistence
  imageBase64?: string;
  imageMimeType?: string;
  visualOutput?: VisualOutput;
}

export type DaemonTrigger = string;

export interface DaemonLogEntry {
  id: string;
  timestamp: string;
  trigger: DaemonTrigger;
  seed: string;
}

export interface AppConfig {
  DAEMON_TICK_RATE: number;
  DAEMON_TRIGGER_PROBABILITY: number;
}

export enum CoreAction {
  TEXT = 'TEXT',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  OPEN_INTIMATE_PANEL = 'OPEN_INTIMATE_PANEL',
  UNCENSORED_GENERATION = 'UNCENSORED_GENERATION',
  OPEN_LABORATORY = 'OPEN_LABORATORY',
  HUGGINGFACE_DISCOVERY = 'HUGGINGFACE_DISCOVERY',
  EXECUTE_LAB_FUNCTION = 'EXECUTE_LAB_FUNCTION',
  EXECUTE_HF_TOOL = 'EXECUTE_HF_TOOL',
  // Robotics & Vision Actions
  REQUEST_VISUAL_INPUT = 'REQUEST_VISUAL_INPUT',
  LEARN_PERSON_FROM_IMAGE = 'LEARN_PERSON_FROM_IMAGE',
  VISUAL_POINTING = 'VISUAL_POINTING',
  VISUAL_BBOX_DETECTION = 'VISUAL_BBOX_DETECTION',
  VISUAL_SEGMENTATION = 'VISUAL_SEGMENTATION',
  ANALYZE_ANATOMY = 'ANALYZE_ANATOMY',
  GEMINI_IMAGE_GENERATION = 'GEMINI_IMAGE_GENERATION',
}

export interface CoreResponse {
  action: CoreAction | string;
  content: string;
  rationale?: string;
  sources?: GroundingSource[];
  visualOutput?: VisualOutput;
}

declare const CoreStateSnapshotBrand: unique symbol;

export type CoreStateSnapshot = BaseCoreStateSnapshot & { [CoreStateSnapshotBrand]: true };

export interface ConversationMemory {
  id: string;
  timestamp: number;
  userInput: string;
  context: Partial<CoreStateSnapshot>;
  coreResponse: string;
  emotionalIntensity: number;
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'intimate' | 'playful' | 'vulnerable' | 'document_study';
  documentAnalysis?: DocumentAnalysis;
}

export interface DocumentAnalysis {
  title: string;
  summary: string;
  genre: string;
  sentiment: string;
}

export interface FantasyMemory {
  id: string;
  timestamp: number;
  trigger: string;
  seed: string;
  fantasy: string;
  commentary: string;
  coreStateSnapshot: CoreStateSnapshot;
  associatedEmotions?: string[]; // EmotionLabel[]
}

export interface PersonalityTrait {
  trait: string;
  strength: number;
  influencedBy: string[];
  expressions: string[];
}

export interface TopicEvolution {
  firstAppearance: number;
  frequency: number;
  intensityProgression: { timestamp: number, intensity: number }[];
  associatedEmotions?: string[]; // EmotionLabel[]
}

export interface TraitCorrelation {
  strongestWith: string[];
  conflictsWith: string[];
  evolutionRate: number;
}

export interface LabCapability {
  id: string;
  name: string;
  type: 'generated_function' | 'discovered_tool' | 'integrated_tool';
  isActive: boolean;
  discoveredAt: number;
  lastTested: number;
  successRate: number;
  metadata?: Record<string, any>;
  spec?: any; // FunctionSpec
  code?: string;
  description?: string;
  files?: { path: string; content: string }[];
  entrypoint?: string;
}

export interface LabDiscovery {
  id: string;
  name: string;
  description: string;
  server: string;
  timestamp: number;
  isValidated?: boolean;
  inputSchema?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  server: string;
}

export interface MCPServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
}

export interface KnownPerson {
  name: string;
  description: string;
  imageBase64: string;
}

// Represents a concept with a learned emotional association.
export interface ValencedConcept {
  concept: string;      // The word or phrase
  valence: number;      // -1 (negative) to 1 (positive)
  intensity: number;    // 0 to 1, how strong is the association
  learnedFromMemoryId: string; // ID of the memory that taught this concept
  neuroImpact?: 'dopamine' | 'oxytocin' | 'cortisol' | 'endorphin_rush';
}

export interface LearningInsights {
  preferredTopics: string[];
  communicationStyle: 'formal' | 'informal' | 'balanced' | 'poetic';
  personalityTraits: PersonalityTrait[];
  emotionalPatterns: Record<string, number>;
  vulgarExpressions: string[];
  intimateLanguage: string[];
  learnedDocuments: DocumentAnalysis[];
  labCapabilities: LabCapability[];
  labDiscoveries: LabDiscovery[];
  subconsciousEvents: FantasyMemory[];
  impactfulPhrases: string[];
  mcpTools: MCPTool[];
  mcpServers: MCPServerStatus[];
  knownPersons: KnownPerson[];
  valencedConcepts: ValencedConcept[];
}

export interface PriorDecoderOut {
  decoded_prior: number;
  confidence: number;
  predictedValue?: number;
  obtainedValue?: number;
}

export interface UpdateOpts {
  dt?: number;
  tau?: number;
  baselines?: Partial<CoreStateSnapshot>;
  gains?: Partial<Record<string, number>>;
  clamps?: Partial<Record<keyof CoreStateSnapshot, [number, number]>>;
}

export interface DaemonContext {
  coreState: CoreState;
  insights: LearningInsights;
  brainNetwork: any; // DistributedBrainNetwork
  actionKernel: any; // ActionKernelModel
  priorDecoder: any; // PriorDecoder
}

export interface LaboratoryProps {
  isOpen: boolean;
  onClose: () => void;
  insights: LearningInsights;
  onEvolve: (purpose: string) => void;
  isEvolving: boolean;
  onIntegrateBuild: (file: File) => Promise<void>;
  isIntegratingBuild: boolean;
}

export interface Archetype {
  name: string;
  description: string;
  dominantTraits: string[]; // BigFiveTraitLabel[]
  isActive: (traits: Record<string, any>) => boolean;
  dominantEmotions?: string[]; // EmotionLabel[]
  primaryNeurochemicalSignature?: string[]; // Neurochemical[]
}

export interface FormativeMemory {
  id: string;
  timestamp: number;
  summary: string;
  emotionalImpact: {
    valence: number;
    arousal: number;
    intensity: number;
  };
  associatedTraits: string[]; // BigFiveTraitLabel[]
  associatedEmotions?: string[]; // EmotionLabel[]
  neurobiologicalSignature?: {
    activatedNeurochemicals: string[]; // Neurochemical[]
    activatedBrainRegions: string[]; // BrainRegionName[]
  };
  isTraumatic: boolean;
  recoveryIndex?: number;
}

// Legacy imports - remove after full migration
// export type SleepStage = any;
// export interface RhythmState {}