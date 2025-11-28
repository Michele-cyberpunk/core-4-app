import React, { useState } from 'react';
import { CoreState, LearningInsights, LabCapability, MCPServerStatus, MCPTool, LaboratoryProps } from '../types';
import { CloseIcon, BeakerIcon, FlaskIcon, UploadIcon } from './icons';


const Laboratory: React.FC<LaboratoryProps> = ({
    isOpen,
    onClose,
    insights,
    onEvolve,
    isEvolving,
    onIntegrateBuild,
    isIntegratingBuild,
}) => {
    const [purpose, setPurpose] = useState('');

    const handleEvolveClick = () => {
        if (purpose.trim() && !isEvolving) {
            onEvolve(purpose.trim());
            setPurpose('');
        }
    };

    const handleBuildFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await onIntegrateBuild(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    if (!isOpen) return null;

    const getStatusColor = (status: MCPServerStatus['status']) => {
        switch (status) {
            case 'connected': return 'text-green-400';
            case 'disconnected': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-text-secondary';
        }
    };

    const evolvedCapabilities = insights.labCapabilities.filter(c => c.type === 'generated_function');
    const integratedTools = insights.labCapabilities.filter(c => c.type === 'integrated_tool');

    return (
        <div className="fixed inset-0 bg-core-bg/90 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-daemon-bg w-full max-w-4xl h-[95vh] max-h-[900px] border border-accent-cyan/30 rounded-lg shadow-lg p-6 m-4 flex flex-col gap-6 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BeakerIcon className="w-6 h-6 text-accent-cyan animate-pulse" />
                        <h2 className="text-xl font-mono text-accent-cyan tracking-wider">// Autonomous Evolution Laboratory</h2>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-accent-cyan transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                    {/* Evolve new capability */}
                    <div className="space-y-4 flex flex-col">
                        <h3 className="font-mono text-accent-magenta">// Evolve New Capability</h3>
                        <p className="text-sm text-text-secondary/80 font-mono">
                          Propose a new function for Core to learn. The evolution engine will generate and integrate code that calls external models (e.g., from Hugging Face) to fulfill the purpose.
                        </p>
                        <div className="space-y-2">
                            <label htmlFor="capability-purpose" className="font-mono text-text-primary text-sm">
                                Purpose of the new function:
                            </label>
                            <textarea
                                id="capability-purpose"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                placeholder="e.g., 'Summarize a long text' or 'Analyze the sentiment of a sentence'"
                                className="w-full bg-core-bg/50 border border-panel-border rounded-md p-3 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-cyan h-24 resize-none"
                            />
                        </div>
                        <button
                            onClick={handleEvolveClick}
                            disabled={isEvolving || !purpose.trim()}
                            className="flex items-center justify-center gap-2 bg-accent-magenta/80 hover:bg-accent-magenta text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FlaskIcon className="w-5 h-5" />
                            {isEvolving ? 'Evolving...' : 'Evolve'}
                        </button>
                        <div className="text-xs text-text-secondary/60 font-mono mt-2">
                            Note: Generated functions will attempt to call external APIs and are persisted with the session.
                        </div>

                        <div className="border-t border-panel-border my-4"></div>

                        <div>
                            <h3 className="font-mono text-accent-magenta">// Integrate Gemini BuildStudio Build</h3>
                            <p className="text-sm text-text-secondary/80 font-mono mt-2">
                                Upload a .zip build file from Gemini BuildStudio to integrate new, pre-packaged capabilities.
                            </p>
                            <div className="mt-3">
                                <label htmlFor="integrate-build-input" className={`flex items-center justify-center gap-2 bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer ${isIntegratingBuild ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <UploadIcon className="w-5 h-5" />
                                    {isIntegratingBuild ? "Integrating..." : "Upload .zip Build"}
                                </label>
                                <input id="integrate-build-input" type="file" accept=".zip" className="hidden" onChange={handleBuildFileChange} disabled={isIntegratingBuild} />
                            </div>
                        </div>
                    </div>

                    {/* Learned & Discovered Tools */}
                    <div className="space-y-4 flex flex-col overflow-hidden">
                        <h3 className="font-mono text-accent-magenta">// Acquired Tools & Capabilities</h3>
                        <div className="bg-core-bg/30 rounded-md p-3 flex-1 overflow-y-auto space-y-4">
                            <div>
                                <h4 className='font-mono text-accent-cyan/80 text-sm mb-2'>Integrated Tools (from BuildStudio)</h4>
                                {integratedTools.length === 0 ? (
                                    <div className="text-sm text-text-secondary/50 font-mono">No tools integrated from builds yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {integratedTools.map((tool: LabCapability) => (
                                            <div key={tool.id} className="bg-daemon-bg/50 rounded-md p-3">
                                                <div className="font-mono text-sm text-accent-cyan/90">{tool.name}</div>
                                                <p className="text-xs text-text-primary/80 mt-1 font-mono">{tool.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                             <div>
                                <h4 className='font-mono text-accent-cyan/80 text-sm mb-2'>Evolved Capabilities (Lab)</h4>
                                {evolvedCapabilities.length === 0 ? (
                                    <div className="text-sm text-text-secondary/50 font-mono">No new capabilities evolved yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {evolvedCapabilities.map((cap: LabCapability) => (
                                            <div key={cap.id} className="bg-daemon-bg/50 rounded-md p-3">
                                                <div className="font-mono text-sm text-accent-cyan/90">{cap.spec?.name || cap.name}</div>
                                                <p className="text-xs text-text-primary/80 mt-1 font-mono">{cap.spec?.purpose || cap.type}</p>
                                                <p className="text-xs text-text-secondary/70 mt-2">ID: {cap.id}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                             <div>
                                <h4 className='font-mono text-accent-cyan/80 text-sm mb-2'>Discovered MCP Tools</h4>
                                {insights.mcpTools.length === 0 ? (
                                    <div className="text-sm text-text-secondary/50 font-mono">No MCP tools discovered.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {insights.mcpTools.map((tool: MCPTool) => (
                                            <div key={tool.name} className="bg-daemon-bg/50 rounded-md p-3">
                                                <div className="font-mono text-sm text-accent-cyan/90">{tool.name}</div>
                                                <p className="text-xs text-text-primary/80 mt-1 font-mono">{tool.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-center pt-4 border-t border-panel-border">
                    <button onClick={onClose} className="bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-6 rounded-lg transition-colors">
                        Exit Laboratory
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Laboratory;