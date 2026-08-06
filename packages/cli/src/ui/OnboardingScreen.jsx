import { useState, useEffect } from 'react';
import { useKeyboard, useRenderer } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { Logo } from './Logo.jsx';
import { theme } from './theme.js';

// ─── Small reusable primitives ──────────────────────────────────────────────

function Divider({ width = 56, color = '#1f2937' }) {
  return <text fg={color}>{'─'.repeat(width)}</text>;
}

function Badge({ label, color = theme.green }) {
  return (
    <text fg={color} attributes={TextAttributes.BOLD}>
      {'  '}[{label}]
    </text>
  );
}

function StepIndicator({ current, total }) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <text key={i} fg={i === current ? theme.green : '#1f2937'}>
        {i === current ? ' ● ' : ' ○ '}
      </text>
    );
  }
  return <box justifyContent="center">{dots}</box>;
}

function SelectionItem({ label, description, isSelected, index }) {
  return (
    <box paddingLeft={2} paddingRight={2}>
      <text fg={isSelected ? theme.greenBright : '#1f2937'}>
        {isSelected ? '▸ ' : '  '}
      </text>
      <text fg={isSelected ? theme.text : theme.dim} attributes={isSelected ? TextAttributes.BOLD : 0}>
        {label}
      </text>
      {description && (
        <text fg={theme.gray}>{`  ${description}`}</text>
      )}
    </box>
  );
}

function TextInput({ label, value, focused, hidden = false, placeholder = '' }) {
  const displayValue = hidden ? '•'.repeat(value.length) : value;
  return (
    <box paddingLeft={2} paddingRight={2} flexDirection="row">
      <text fg={theme.dim}>{label}: </text>
      <box
        borderStyle="round"
        borderColor={focused ? theme.green : '#1f2937'}
        paddingLeft={1} paddingRight={1}
        minWidth={32}
      >
        {value.length > 0 ? (
          <text fg={theme.text}>{displayValue}</text>
        ) : (
          <text fg="#3a3f47">{placeholder}</text>
        )}
        {focused && <text fg={theme.greenBright}>▌</text>}
      </box>
    </box>
  );
}

function StatusMessage({ type, message }) {
  const icons = { ok: '✓', error: '✗', warn: '⚠', info: '●' };
  const colors = { ok: theme.green, error: theme.red, warn: theme.amber, info: theme.blue };
  return (
    <box paddingLeft={2} paddingRight={2} marginTop={1}>
      <text fg={colors[type] || theme.dim}>{icons[type] || '●'} {message}</text>
    </box>
  );
}

// ─── Provider choices ───────────────────────────────────────────────────────

const PROVIDER_CHOICES = [
  { id: 'OpenRouter', env: 'OPENROUTER_API_KEY', icon: '◈' },
  { id: 'OpenAI', env: 'OPENAI_API_KEY', icon: '◆' },
  { id: 'Anthropic (Claude)', env: 'ANTHROPIC_API_KEY', icon: '◇' },
  { id: 'Google (Gemini)', env: 'GOOGLE_API_KEY', icon: '◈' },
  { id: 'Groq', env: 'GROQ_API_KEY', icon: '▪' },
  { id: 'DeepSeek', env: 'DEEPSEEK_API_KEY', icon: '▫' },
  { id: 'Mistral', env: 'MISTRAL_API_KEY', icon: '◆' },
  { id: 'Poolside', env: 'POOLSIDE_API_KEY', icon: '◈' },
  { id: 'Other provider', env: null, icon: '○' },
];

// ─── Steps ──────────────────────────────────────────────────────────────────

const STEPS = {
  WELCOME: 'welcome',
  CREATE_ACCOUNT: 'create_account',
  LOGIN: 'login',
  API_KEY_ASK: 'api_key_ask',
  API_KEY_PROVIDER: 'api_key_provider',
  API_KEY_INPUT: 'api_key_input',
  DONE: 'done',
};

// ─── Main Onboarding Component ──────────────────────────────────────────────

export function OnboardingScreen({ onComplete, onSkip = onComplete, onToast = null, hasAccount, hasKey, config, apiHandlers }) {
  const renderer = useRenderer();
  const exit = () => renderer.destroy();
  const [step, setStep] = useState(STEPS.WELCOME);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [inputValues, setInputValues] = useState({ email: '', name: '', password: '', otp: '', apiKey: '', customEnv: '' });
  const [activeField, setActiveField] = useState(0);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [dots, setDots] = useState('');

  // Loading animation
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 300);
    return () => clearInterval(id);
  }, [loading]);

  // Skip if already onboarded
  useEffect(() => {
    if (hasAccount && hasKey) {
      onComplete();
    }
  }, []);

  const setField = (field, value) => setInputValues((v) => ({ ...v, [field]: value }));

  // Skip setup entirely — proceed without storing any keys.
  const skipSetup = () => {
    if (onToast) onToast({ kind: 'warn', text: 'skipped setup — no providers configured' });
    onSkip();
  };

  // ── Welcome step ────────────────────────────────────────────────────────

  const WelcomeStep = () => {
    const options = [
      { label: 'Create Account', desc: 'new to mcode? start here' },
      { label: 'Login', desc: 'already have an account' },
    ];

    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if (loading) return;
      if ((key.name === "up") || (key.name === "pageup")) setSelectedIdx((i) => Math.max(0, i - 1));
      if ((key.name === "down") || (key.name === "pagedown")) setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if ((key.name === "return")) {
        if (selectedIdx === 0) { setStep(STEPS.CREATE_ACCOUNT); setActiveField(0); }
        else if (selectedIdx === 1) { setStep(STEPS.LOGIN); setActiveField(0); }
      }
      if ((key.name === "escape")) { exit(); }
    });

    return (
      <box flexDirection="column" alignItems="center">
        <box marginBottom={1}>
          <text fg={theme.dim}>
            welcome{config?.account?.name ? `, ${config.account.name}` : ''}!
          </text>
        </box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor="#1f2937"
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {options.map((opt, i) => (
            <SelectionItem
              key={i}
              index={i}
              label={opt.label}
              description={opt.desc}
              isSelected={i === selectedIdx}
            />
          ))}
        </box>
        <box marginTop={1}>
          <text fg={theme.gray}>↑↓</text>
          <text fg={theme.dim}> navigate  </text>
          <text fg={theme.gray}>enter</text>
          <text fg={theme.dim}> select  </text>
          <text fg={theme.gray}>esc</text>
          <text fg={theme.dim}> quit</text>
        </box>
      </box>
    );
  };

  // ── Create Account step ─────────────────────────────────────────────────

  const CreateAccountStep = () => {
    const fields = ['email', 'name', 'password'];
    const placeholders = { email: 'user@example.com', name: 'Your Name', password: 'min 8 chars' };

    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if (loading) return;

      // OTP sub-step
      if (status?.type === 'otp') {
        if ((key.name === "backspace") || (key.name === "delete")) { setField('otp', inputValues.otp.slice(0, -1)); return; }
        if ((key.name === "return") && inputValues.otp.length === 6) {
          verifyOtp();
          return;
        }
        if ((key.name === "escape")) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
        if (input && /\d/.test(input) && inputValues.otp.length < 6) {
          setField('otp', inputValues.otp + input);
        }
        return;
      }

      if ((key.name === "tab") || (key.name === "down") || (key.name === "pagedown")) setActiveField((f) => Math.min(fields.length - 1, f + 1));
      if ((key.name === "up") || (key.name === "pageup")) setActiveField((f) => Math.max(0, f - 1));
      if ((key.name === "escape")) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
      if ((key.name === "backspace") || (key.name === "delete")) {
        const field = fields[activeField];
        setField(field, inputValues[field].slice(0, -1));
        return;
      }
      if ((key.name === "return")) {
        if (activeField < fields.length - 1) {
          setActiveField((f) => f + 1);
        } else {
          submitCreateAccount();
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        const field = fields[activeField];
        setField(field, inputValues[field] + input);
      }
    });

    const submitCreateAccount = async () => {
      const { email, name, password } = inputValues;
      if (!email.includes('@')) { setStatus({ type: 'error', message: 'Invalid email address' }); return; }
      if (name.length < 2) { setStatus({ type: 'error', message: 'Name must be at least 2 characters' }); return; }
      if (password.length < 8) { setStatus({ type: 'error', message: 'Password must be at least 8 characters' }); return; }
      setLoading(true);
      setStatus(null);
      try {
        const result = await apiHandlers.sendOtp(email);
        setStatus({
          type: 'otp',
          message: `Code sent to ${email}`,
          devOtp: result?.devOtp
        });
        setField('otp', '');
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    const verifyOtp = async () => {
      setLoading(true);
      try {
        await apiHandlers.verifySignup(inputValues);
        setStatus({ type: 'ok', message: 'Account created successfully!' });
        setTimeout(() => {
          if (hasKey) onComplete();
          else { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); setStatus(null); }
        }, 1200);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    const totalSteps = hasKey ? 2 : 3;
    const isOtpMode = status?.type === 'otp';

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={totalSteps} />
        <box marginTop={1} marginBottom={1}><text fg={theme.text} attributes={TextAttributes.BOLD}>Create Account</text></box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.green}
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {!isOtpMode ? (
            <>
              {fields.map((field, i) => (
                <box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
                  <TextInput
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={inputValues[field]}
                    focused={i === activeField}
                    hidden={field === 'password'}
                    placeholder={placeholders[field]}
                  />
                </box>
              ))}
              <box paddingLeft={2} paddingRight={2} marginTop={1}>
                <text fg={theme.dim}>tab/↑↓ switch fields · enter to submit · esc back</text>
              </box>
            </>
          ) : (
            <box flexDirection="column" paddingLeft={2} paddingRight={2}>
              <StatusMessage type="ok" message={status.message} />
              {status.devOtp && (
                <StatusMessage type="info" message={`Dev mode OTP: ${status.devOtp}`} />
              )}
              <box marginTop={1}>
                <text fg={theme.dim}>Enter 6-digit code: </text>
                <box borderStyle="round" borderColor={theme.green} paddingLeft={1} paddingRight={1} minWidth={12}>
                  <text fg={theme.text} attributes={TextAttributes.BOLD}>
                    {inputValues.otp.split('').join(' ')}
                    {'  '.repeat(Math.max(0, 6 - inputValues.otp.length))}
                  </text>
                </box>
              </box>
              <box marginTop={1}>
                <text fg={theme.dim}>
                  {inputValues.otp.length}/6 digits · enter to verify · esc back
                </text>
              </box>
            </box>
          )}
        </box>
        {loading && (
          <box marginTop={1}>
            <text fg={theme.green}>⟳ processing{dots}</text>
          </box>
        )}
        {status && status.type === 'error' && (
          <StatusMessage type="error" message={status.message} />
        )}
        {status && status.type === 'ok' && (
          <StatusMessage type="ok" message={status.message} />
        )}
      </box>
    );
  };

  // ── Login step ──────────────────────────────────────────────────────────

  const LoginStep = () => {
    const fields = ['email', 'password'];
    const placeholders = { email: 'user@example.com', password: 'your password' };

    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if (loading) return;
      if ((key.name === "tab") || (key.name === "down") || (key.name === "pagedown")) setActiveField((f) => Math.min(fields.length - 1, f + 1));
      if ((key.name === "up") || (key.name === "pageup")) setActiveField((f) => Math.max(0, f - 1));
      if ((key.name === "escape")) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
      if ((key.name === "backspace") || (key.name === "delete")) {
        const field = fields[activeField];
        setField(field, inputValues[field].slice(0, -1));
        return;
      }
      if ((key.name === "return")) {
        if (activeField < fields.length - 1) {
          setActiveField((f) => f + 1);
        } else {
          submitLogin();
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        const field = fields[activeField];
        setField(field, inputValues[field] + input);
      }
    });

    const submitLogin = async () => {
      const { email, password } = inputValues;
      if (!email.includes('@')) { setStatus({ type: 'error', message: 'Invalid email address' }); return; }
      if (!password) { setStatus({ type: 'error', message: 'Password is required' }); return; }
      setLoading(true);
      setStatus(null);
      try {
        await apiHandlers.login(email, password);
        setStatus({ type: 'ok', message: 'Logged in successfully!' });
        setTimeout(() => {
          if (hasKey) onComplete();
          else { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); setStatus(null); }
        }, 1200);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    const totalSteps = hasKey ? 2 : 3;

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={totalSteps} />
        <box marginTop={1} marginBottom={1}><text fg={theme.text} attributes={TextAttributes.BOLD}>Login</text></box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.blue}
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {fields.map((field, i) => (
            <box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
              <TextInput
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                value={inputValues[field]}
                focused={i === activeField}
                hidden={field === 'password'}
                placeholder={placeholders[field]}
              />
            </box>
          ))}
          <box paddingLeft={2} paddingRight={2} marginTop={1}>
            <text fg={theme.dim}>tab/↑↓ switch fields · enter to submit · esc back</text>
          </box>
        </box>
        {loading && (
          <box marginTop={1}>
            <text fg={theme.green}>⟳ processing{dots}</text>
          </box>
        )}
        {status && status.type === 'error' && <StatusMessage type="error" message={status.message} />}
        {status && status.type === 'ok' && <StatusMessage type="ok" message={status.message} />}
      </box>
    );
  };

  // ── API Key Ask step ────────────────────────────────────────────────────

  const ApiKeyAskStep = () => {
    const options = [
      { label: 'Yes, add an API key now', desc: '' },
      { label: 'Skip for now', desc: 'mock + local providers still work' },
    ];

    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if ((key.name === "up") || (key.name === "pageup")) setSelectedIdx((i) => Math.max(0, i - 1));
      if ((key.name === "down") || (key.name === "pagedown")) setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if ((key.name === "return")) {
        if (selectedIdx === 0) { setStep(STEPS.API_KEY_PROVIDER); setSelectedIdx(0); }
        else onComplete();
      }
      if ((key.name === "escape")) onComplete();
    });

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={1} total={3} />
        <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
          <text fg={theme.amber}>● </text>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>API Key Setup</text>
        </box>
        <box marginBottom={1}>
          <text fg={theme.dim}>You need an AI provider API key for chat and god mode</text>
        </box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.amber}
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {options.map((opt, i) => (
            <SelectionItem
              key={i}
              index={i}
              label={opt.label}
              description={opt.desc}
              isSelected={i === selectedIdx}
            />
          ))}
        </box>
        <box marginTop={1}>
          <text fg={theme.gray}>↑↓</text>
          <text fg={theme.dim}> navigate  </text>
          <text fg={theme.gray}>enter</text>
          <text fg={theme.dim}> select  </text>
          <text fg={theme.gray}>esc</text>
          <text fg={theme.dim}> skip</text>
        </box>
      </box>
    );
  };

  // ── API Key Provider Select ─────────────────────────────────────────────

  const ApiKeyProviderStep = () => {
    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if ((key.name === "up") || (key.name === "pageup")) setSelectedIdx((i) => Math.max(0, i - 1));
      if ((key.name === "down") || (key.name === "pagedown")) setSelectedIdx((i) => Math.min(PROVIDER_CHOICES.length - 1, i + 1));
      if ((key.name === "escape")) { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); return; }
      if ((key.name === "return")) {
        const choice = PROVIDER_CHOICES[selectedIdx];
        setSelectedProvider(choice);
        setActiveField(choice.env ? 0 : 1); // 1 = custom env name field
        setField('apiKey', '');
        setField('customEnv', '');
        setStep(STEPS.API_KEY_INPUT);
      }
    });

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={2} total={3} />
        <box marginTop={1} marginBottom={1}><text fg={theme.text} attributes={TextAttributes.BOLD}>Select Provider</text></box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {PROVIDER_CHOICES.map((p, i) => (
            <box key={i} paddingLeft={2} paddingRight={2}>
              <text fg={i === selectedIdx ? theme.greenBright : '#1f2937'}>
                {i === selectedIdx ? '▸ ' : '  '}
              </text>
              <text fg={i === selectedIdx ? theme.purple : theme.dim}>
                {p.icon}{' '}
              </text>
              <text fg={i === selectedIdx ? theme.text : theme.dim} attributes={i === selectedIdx ? TextAttributes.BOLD : 0}>
                {p.id}
              </text>
              {p.env && i === selectedIdx && (
                <text fg={theme.gray}>{`  (${p.env})`}</text>
              )}
            </box>
          ))}
        </box>
        <box marginTop={1}>
          <text fg={theme.gray}>↑↓</text>
          <text fg={theme.dim}> navigate  </text>
          <text fg={theme.gray}>enter</text>
          <text fg={theme.dim}> select  </text>
          <text fg={theme.gray}>esc</text>
          <text fg={theme.dim}> back</text>
        </box>
      </box>
    );
  };

  // ── API Key Input step ──────────────────────────────────────────────────

  const ApiKeyInputStep = () => {
    const needsCustomEnv = !selectedProvider?.env;

    useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
      if (loading) return;
      if (needsCustomEnv && (key.name === "tab")) {
        setActiveField((f) => f === 0 ? 1 : 0);
        return;
      }
      if ((key.name === "escape")) { setStep(STEPS.API_KEY_PROVIDER); setSelectedIdx(0); setStatus(null); return; }
      if ((key.name === "backspace") || (key.name === "delete")) {
        if (needsCustomEnv && activeField === 1) {
          setField('customEnv', inputValues.customEnv.slice(0, -1));
        } else {
          setField('apiKey', inputValues.apiKey.slice(0, -1));
        }
        return;
      }
      if ((key.name === "return")) {
        submitApiKey();
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        if (needsCustomEnv && activeField === 1) {
          setField('customEnv', inputValues.customEnv + input.toUpperCase());
        } else {
          setField('apiKey', inputValues.apiKey + input);
        }
      }
    });

    const submitApiKey = async () => {
      const env = selectedProvider?.env || inputValues.customEnv;
      if (!env || !/^[A-Z0-9_]+$/.test(env)) { setStatus({ type: 'error', message: 'Invalid env var name' }); return; }
      if (inputValues.apiKey.length < 8) { setStatus({ type: 'error', message: 'API key looks too short' }); return; }
      setLoading(true);
      setStatus(null);
      try {
        await apiHandlers.saveApiKey(env, inputValues.apiKey);
        setStatus({ type: 'ok', message: `Key stored as ${env}` });
        setTimeout(() => onComplete(), 1200);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={2} total={3} />
        <box marginTop={1} marginBottom={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Enter {selectedProvider?.id || 'Provider'} API Key
          </text>
        </box>
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingTop={1} paddingBottom={1}
          width={56}
        >
          {needsCustomEnv && (
            <box marginBottom={1}>
              <TextInput
                label="Env var"
                value={inputValues.customEnv}
                focused={activeField === 1}
                placeholder="e.g. OPENAI_API_KEY"
              />
            </box>
          )}
          <TextInput
            label="API Key"
            value={inputValues.apiKey}
            focused={needsCustomEnv ? activeField === 0 : true}
            hidden={true}
            placeholder="sk-..."
          />
          <box paddingLeft={2} paddingRight={2} marginTop={1}>
            <text fg={theme.dim}>
              {needsCustomEnv ? 'tab switch · ' : ''}enter to save · esc back
            </text>
          </box>
        </box>
        {loading && (
          <box marginTop={1}>
            <text fg={theme.green}>⟳ saving{dots}</text>
          </box>
        )}
        {status && status.type === 'error' && <StatusMessage type="error" message={status.message} />}
        {status && status.type === 'ok' && <StatusMessage type="ok" message={status.message} />}
      </box>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const stepComponents = {
    [STEPS.WELCOME]: WelcomeStep,
    [STEPS.CREATE_ACCOUNT]: CreateAccountStep,
    [STEPS.LOGIN]: LoginStep,
    [STEPS.API_KEY_ASK]: ApiKeyAskStep,
    [STEPS.API_KEY_PROVIDER]: ApiKeyProviderStep,
    [STEPS.API_KEY_INPUT]: ApiKeyInputStep,
  };

  const CurrentStep = stepComponents[step];
  if (!CurrentStep) return null;

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%">
      <Logo />
      <box marginBottom={1}>
        <text fg={theme.dim}>terminal-first, multi-model AI coding CLI</text>
      </box>
      <Divider />
      <box marginTop={1}>
        <CurrentStep />
      </box>
      <box position="absolute" marginTop={2}>
        <text fg="#1a1e22">v2.4.6</text>
      </box>
    </box>
  );
}
