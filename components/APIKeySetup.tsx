import React, { useState, useEffect } from 'react';
import { CloseIcon, CogIcon } from './icons';

interface APIKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKeys: (keys: APIKeys) => void;
  initialKeys: APIKeys;
}

export interface APIKeys {
  huggingface_token?: string;
  custom_endpoints?: {
    heartsync_nsfw?: string;
    flux_uncensored?: string;
    cors_proxy?: string;
  };
}

const APIKeySetup: React.FC<APIKeySetupProps> = ({
  isOpen,
  onClose,
  onSaveKeys,
  initialKeys
}) => {
  const [keys, setKeys] = useState<APIKeys>(initialKeys);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setKeys(initialKeys);
      setValidationResults({});
    }
  }, [isOpen, initialKeys]);

  const updateKey = (keyPath: string, value: string) => {
    setKeys(prev => {
      const newKeys = { ...prev };
      const pathParts = keyPath.split('.');
      if (pathParts.length === 1) {
        (newKeys as any)[pathParts[0]] = value;
      } else if (pathParts.length === 2) {
        if (!newKeys.custom_endpoints) newKeys.custom_endpoints = {};
        (newKeys.custom_endpoints as any)[pathParts[1]] = value;
      }
      return newKeys;
    });
  };

  const validateAPIKeys = async () => {
    setIsValidating(true);
    const results: Record<string, boolean> = {};

    if (keys.huggingface_token && keys.huggingface_token.startsWith('hf_')) {
      try {
        const response = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: {
            Authorization: `Bearer ${keys.huggingface_token}`
          }
        });
        results.huggingface_token = response.ok;
      } catch {
        results.huggingface_token = false;
      }
    } else {
      results.huggingface_token = false;
    }

    if (keys.custom_endpoints?.heartsync_nsfw) {
      try {
        const endpoint = keys.custom_endpoints.heartsync_nsfw;
        // If cors_proxy is provided, prefix it
        const fullUrl = keys.custom_endpoints.cors_proxy
          ? `${keys.custom_endpoints.cors_proxy}${endpoint}`
          : endpoint;
        const response = await fetch(fullUrl, { method: 'GET' });
        results.heartsync_nsfw = response.ok || response.type === 'opaque';
      } catch {
        results.heartsync_nsfw = false;
      }
    }

    setValidationResults(results);
    setIsValidating(false);
  };

  const canSave = !!keys.huggingface_token && validationResults.huggingface_token === true;

  const saveKeys = () => {
    if (!canSave) {
      alert('Please fix the validation errors before saving.');
      return;
    }
    onSaveKeys(keys);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-core-bg/90 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-daemon-bg w-full max-w-2xl max-h-[90vh] border border-accent-cyan/30 rounded-lg shadow-lg p-6 m-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-accent-cyan" />
            <h2 className="text-xl font-mono text-accent-cyan tracking-wider">// API Configuration</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-accent-cyan transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="text-sm text-text-secondary font-mono p-3 bg-core-bg/50 border border-panel-border rounded-md">
          Il token per Gemini non è gestito qui. Questo pannello serve solo per configurare servizi esterni (es. Hugging Face) che integreranno l’app nel contesto Gemini.
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-accent-magenta">// External Service Keys</h3>
          <div className="space-y-2">
            <label className="block text-sm font-mono text-text-primary">
              HuggingFace Token (for external model access)
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-cyan ml-2 hover:underline"
              >
                • Get one here
              </a>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keys.huggingface_token || ''}
                onChange={e => updateKey('huggingface_token', e.target.value)}
                placeholder="hf_..."
                className="flex-1 bg-core-bg border border-panel-border rounded-md px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-cyan"
              />
              {validationResults.huggingface_token !== undefined && (
                <div className={`px-3 py-2 rounded-md text-xs font-mono ${
                  validationResults.huggingface_token
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
                }`}>
                  {validationResults.huggingface_token ? 'VALID' : 'INVALID'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-accent-magenta">// Custom Endpoints</h3>
          <div className="space-y-2">
            <label className="block text-sm font-mono text-text-primary">
              Heartsync NSFW Endpoint
            </label>
            <input
              type="text"
              value={keys.custom_endpoints?.heartsync_nsfw || ''}
              onChange={e =>
                updateKey('custom_endpoints.heartsync_nsfw', e.target.value)
              }
              placeholder="https://…/heartsync-nsfw-uncensored-photo.hf.space/api/predict"
              className="w-full bg-core-bg border border-panel-border rounded-md px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-mono text-text-primary">
              CORS Proxy (optional)
            </label>
            <input
              type="text"
              value={keys.custom_endpoints?.cors_proxy || ''}
              onChange={e =>
                updateKey('custom_endpoints.cors_proxy', e.target.value)
              }
              placeholder="https://api.allorigins.win/raw?url="
              className="w-full bg-core-bg border border-panel-border rounded-md px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-panel-border">
          <button
            onClick={validateAPIKeys}
            disabled={isValidating}
            className="bg-accent-cyan/20 text-accent-cyan px-4 py-2 rounded-md font-mono text-sm hover:bg-accent-cyan/30 transition-colors disabled:opacity-50"
          >
            {isValidating ? 'VALIDATING...' : 'VALIDATE KEYS'}
          </button>
          <button
            onClick={saveKeys}
            disabled={!canSave}
            className="bg-accent-magenta/20 text-accent-magenta px-4 py-2 rounded-md font-mono text-sm hover:bg-accent-magenta/30 transition-colors disabled:opacity-50"
          >
            SAVE & CLOSE
          </button>
          <button
            onClick={onClose}
            className="ml-auto bg-panel-border text-text-secondary px-4 py-2 rounded-md font-mono text-sm hover:bg-panel-border/70 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIKeySetup;
