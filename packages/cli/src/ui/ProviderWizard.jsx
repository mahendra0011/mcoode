import { useState, useEffect } from 'react';
import { SelectModal } from './SelectModal.jsx';
import { TextInputModal } from './TextInputModal.jsx';
import { getAllAdapters } from '../providers/index.js';
import { loadVault, saveVault } from '../core/vault.js';
import { loadConfig, saveConfig } from '../core/store.js';
import { theme } from './theme.js';

export function ProviderWizard({ mode = 'connect', onClose }) {
  const [step, setStep] = useState('loading');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [models, setModels] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function init() {
      const secrets = await loadVault();
      const config = await loadConfig();
      const allAdapters = getAllAdapters(secrets);
      
      const activeProviders = allAdapters.filter(p => p.id !== 'mock');
      setProviders(activeProviders);
      
      if (mode === 'models') {
        const configured = activeProviders.filter(p => p.kind === 'local' || (p.apiKey && p.apiKey.length > 0));
        if (configured.length > 0) {
          if (configured.length === 1) {
            handleProviderSelect(configured[0]);
          } else {
            setStep('select-configured-provider');
            setProviders(configured);
          }
        } else {
          setStep('select-provider'); // Fallback if no configured providers
        }
      } else {
        setStep('select-provider');
      }
    }
    init();
  }, [mode]);

  const handleProviderSelect = async (provider) => {
    setSelectedProvider(provider);
    
    if (provider.kind === 'local' || provider.apiKey) {
      await proceedToModels(provider);
    } else {
      setStep('enter-key');
    }
  };

  const handleKeySubmit = async (key) => {
    setError(null);
    setStep('validating');
    const isValid = await selectedProvider.testKey(key);
    if (!isValid) {
      setError('Invalid API key. Please check and try again.');
      setStep('enter-key');
      return;
    }
    
    const secrets = await loadVault();
    await saveVault({ ...secrets, [selectedProvider.envVar]: key });
    selectedProvider.apiKey = key;
    await proceedToModels(selectedProvider);
  };

  const proceedToModels = async (provider) => {
    setStep('loading-models');
    try {
      const ms = await provider.listModels();
      setModels(ms);
      setStep('select-model');
    } catch (err) {
      onClose(); // Fail gracefully
    }
  };

  const handleModelSelect = async (model) => {
    // In mcode, we typically assign roles or just save the preferred model
    // For simplicity, we update the config to use this as the primary model.
    const config = await loadConfig();
    config.roles = config.roles || {};
    config.roles.build = `${selectedProvider.id}:${model.id}`;
    config.roles.docs = `${selectedProvider.id}:${model.id}`;
    await saveConfig(config);
    onClose();
  };

  if (step === 'loading' || step === 'validating' || step === 'loading-models') {
    return (
      <box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
        <box padding={1} borderStyle="single" border borderColor={theme.green} backgroundColor={theme.panel}>
          <text>{step === 'loading-models' ? 'Fetching models...' : (step === 'validating' ? 'Validating key...' : 'Loading...')}</text>
        </box>
      </box>
    );
  }

  if (step === 'select-provider' || step === 'select-configured-provider') {
    // Top popular ones matching the screenshot
    const popularIds = ['opencode', 'openai', 'github', 'anthropic', 'google'];
    
    const options = providers.map(p => {
      const isPopular = popularIds.some(id => p.id.includes(id));
      return {
        label: p.displayName,
        value: p.id,
        category: isPopular ? 'Popular providers' : 'All providers',
        hint: p.apiKey ? '(configured)' : (p.kind === 'local' ? '(local)' : ''),
        raw: p
      };
    });

    // Sort popular first
    options.sort((a, b) => {
      if (a.category === 'Popular providers' && b.category !== 'Popular providers') return -1;
      if (b.category === 'Popular providers' && a.category !== 'Popular providers') return 1;
      return 0;
    });

    return (
      <SelectModal 
        title={step === 'select-provider' ? "Connect a provider" : "Select provider"}
        placeholder="Search"
        options={options}
        onSelect={(opt) => handleProviderSelect(opt.raw)}
        onClose={onClose}
      />
    );
  }

  if (step === 'enter-key') {
    return (
      <TextInputModal
        title={`Manually enter API Key`}
        placeholder="API key"
        password={true}
        error={error}
        onSubmit={handleKeySubmit}
        onClose={onClose}
      />
    );
  }

  if (step === 'select-model') {
    const options = models.map(m => ({
      label: m.name || m.id,
      value: m.id,
      category: 'Available models',
      hint: m.free ? 'Free' : '',
      raw: m
    }));

    return (
      <SelectModal 
        title="Select model"
        placeholder="Search"
        options={options}
        onSelect={(opt) => handleModelSelect(opt.raw)}
        onClose={onClose}
      />
    );
  }

  return null;
}
