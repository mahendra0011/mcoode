// @ts-nocheck — OpenTUI JSX, type-covered by esbuild bundle + manual runs, not tsc.
import { useState, useEffect } from 'react';
import { useKeyboard, useRenderer, useTerminalDimensions } from '@opentui/react';
import { useTicker } from './useTicker.js';
import { TextAttributes } from '@opentui/core';
import { Logo } from './Logo.jsx';
import { theme, SPACING } from './theme.js';
import { getClipboardText, sanitizePasteText } from './clipboard.js';
import { usePaste } from './usePaste.js';

// ─── Small reusable primitives ──────────────────────────────────────────────

function Divider({ width = 56, color = '#262626' }) {
  return <text fg={color}>{'─'.repeat(width)}</text>;
}

function StepIndicator({ current, total, label = '' }) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <text key={i} fg={i === current ? theme.greenBright : i < current ? theme.green : '#333333'}>
        {i === current ? ' ● ' : i < current ? ' ✓ ' : ' ○ '}
      </text>
    );
  }
  return (
    <box flexDirection="column" alignItems="center" marginBottom={SPACING.sm}>
      <box justifyContent="center">{dots}</box>
      {label ? <text fg={theme.dim} marginTop={1}>{label}</text> : null}
    </box>
  );
}

function SelectionItem({ label, description, isSelected, icon = '▸', badge = null }) {
  return (
    <box
      paddingLeft={SPACING.md}
      paddingRight={SPACING.md}
      paddingTop={SPACING.xs || 0}
      paddingBottom={SPACING.xs || 0}
      backgroundColor={isSelected ? '#14291f' : undefined}
      flexDirection="row"
      alignItems="center"
    >
      <text fg={isSelected ? theme.greenBright : '#333333'}>
        {isSelected ? `${icon} ` : '  '}
      </text>
      <text
        fg={isSelected ? theme.textBright : theme.dim}
        attributes={isSelected ? TextAttributes.BOLD : 0}
      >
        {label}
      </text>
      {badge && (
        <text fg={theme.green} attributes={TextAttributes.BOLD}>{`  [${badge}]`}</text>
      )}
      {description && (
        <text fg={isSelected ? theme.dim : '#52555e'}>{`  ${description}`}</text>
      )}
    </box>
  );
}

function TextInput({ label, value, focused, hidden = false, placeholder = '', icon = '•' }) {
  const displayValue = hidden ? '•'.repeat(value.length) : value;
  return (
    <box paddingLeft={SPACING.md} paddingRight={SPACING.md} flexDirection="row" alignItems="center">
      <text fg={focused ? theme.green : theme.dim}>{icon} {label}: </text>
      <box
        borderStyle="round"
        borderColor={focused ? theme.greenBright : '#2a2e37'}
        paddingLeft={SPACING.sm}
        paddingRight={SPACING.sm}
        minWidth={34}
        backgroundColor={focused ? '#0f1715' : '#0d0d0f'}
      >
        {value.length > 0 ? (
          <text fg={theme.textBright}>{displayValue}</text>
        ) : (
          <text fg="#444751">{placeholder}</text>
        )}
        {focused && <text fg={theme.greenBright}>▌</text>}
      </box>
    </box>
  );
}

function StatusMessage({ type, message }) {
  const icons = { ok: '✓', error: '✗', warn: '⚠', info: '●', otp: '✉' };
  const colors = { ok: theme.greenBright, error: theme.red, warn: theme.amber, info: theme.blue, otp: theme.blue };
  return (
    <box paddingLeft={SPACING.md} paddingRight={SPACING.md} marginTop={SPACING.sm} justifyContent="center">
      <text fg={colors[type] || theme.dim} attributes={TextAttributes.BOLD}>
        {icons[type] || '●'} {message}
      </text>
    </box>
  );
}

function ShortcutLegend({ items }) {
  return (
    <box marginTop={SPACING.sm} flexDirection="row" justifyContent="center">
      {items.map((item, idx) => (
        <box key={idx} flexDirection="row" marginRight={idx < items.length - 1 ? SPACING.md : 0}>
          <text fg={theme.gray}>{item.key} </text>
          <text fg={theme.dim}>{item.desc}</text>
        </box>
      ))}
    </box>
  );
}

// ─── Provider choices ───────────────────────────────────────────────────────

const PROVIDER_CHOICES = [
  { id: 'OpenRouter (Web IDE suite)', env: 'OPENROUTER_API_KEY', icon: '◈', badge: 'Default' },
  { id: 'OpenAI (GPT-4o / Codex)', env: 'OPENAI_API_KEY', icon: '◆' },
  { id: 'Anthropic (Claude 3.5 Sonnet)', env: 'ANTHROPIC_API_KEY', icon: '◇' },
  { id: 'Google (Gemini 2.5 Flash)', env: 'GOOGLE_API_KEY', icon: '◈' },
  { id: 'Groq (Ultra-fast Llama)', env: 'GROQ_API_KEY', icon: '▪' },
  { id: 'DeepSeek (V3 / R1)', env: 'DEEPSEEK_API_KEY', icon: '▫' },
  { id: 'Mistral (Large / Codestral)', env: 'MISTRAL_API_KEY', icon: '◆' },
  { id: 'Other provider (Custom env)', env: null, icon: '○' },
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

export function OnboardingScreen({ onComplete, _onSkip = onComplete, _onToast = null, hasAccount, hasKey, config, apiHandlers }) {
  const renderer = useRenderer();
  const exit = () => renderer.destroy();
  const { width: tw = 80, height: th = 24 } = useTerminalDimensions();
  const isCompact = th < 28;
  const cardWidth = Math.min(66, Math.max(50, tw - 4));

  // If user already has account, jump past welcome if they already have keys
  const [step, setStep] = useState(hasAccount ? (hasKey ? STEPS.DONE : STEPS.API_KEY_ASK) : STEPS.WELCOME);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [inputValues, setInputValues] = useState({
    email: config?.account?.email || '',
    name: config?.account?.name || '',
    password: '',
    otp: '',
    apiKey: '',
    customEnv: ''
  });
  const [activeField, setActiveField] = useState(0);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [dots, setDots] = useState('');

  // Ticker animation
  const ticks = useTicker();
  useEffect(() => {
    if (loading) {
      const dotsLength = Math.floor(ticks / 5) % 4;
      setDots('.'.repeat(dotsLength));
    } else {
      setDots('');
    }
  }, [loading, ticks]);

  // If already fully onboarded, skip immediately
  useEffect(() => {
    if (hasAccount && hasKey) {
      onComplete();
    }
  }, []);

  const setField = (field, value) => setInputValues((v) => ({ ...v, [field]: value }));

  // ── Welcome step ────────────────────────────────────────────────────────

  const WelcomeStep = () => {
    const isUserLoggedIn = Boolean(config?.account?.email);
    const options = isUserLoggedIn
      ? [
          { label: 'Continue to Workspace & IDE', desc: 'start coding immediately', badge: 'Ready' },
          { label: 'Configure AI Models & Keys', desc: '6 OpenRouter models available' },
          { label: 'Switch Account / Log in again', desc: 'use a different email' },
        ]
      : [
          { label: 'Login with Mcode Account', desc: 'same account as website', badge: 'Cloud' },
          { label: 'Create New Account', desc: 'new to mcode? start here' },
          { label: 'Quick Start (Guest Mode)', desc: 'skip auth & use local/mock models' },
        ];

    useKeyboard((key) => {
      if (loading) return;
      if (key.name === 'up' || key.name === 'pageup') setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.name === 'down' || key.name === 'pagedown') setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if (key.name === 'return') {
        if (isUserLoggedIn) {
          if (selectedIdx === 0) onComplete();
          else if (selectedIdx === 1) { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); }
          else if (selectedIdx === 2) { setStep(STEPS.LOGIN); setActiveField(0); }
        } else {
          if (selectedIdx === 0) { setStep(STEPS.LOGIN); setActiveField(0); }
          else if (selectedIdx === 1) { setStep(STEPS.CREATE_ACCOUNT); setActiveField(0); }
          else if (selectedIdx === 2) { onComplete(); }
        }
      }
      if (key.name === 'escape') { exit(); }
    });

    return (
      <box flexDirection="column" alignItems="center">
        {isUserLoggedIn ? (
          <box
            marginBottom={SPACING.sm}
            paddingLeft={SPACING.md}
            paddingRight={SPACING.md}
            borderStyle="round"
            borderColor={theme.green}
            backgroundColor="#0c1f15"
          >
            <text fg={theme.greenBright}>
              ● Signed in: <span attributes={TextAttributes.BOLD}>{config.account.email}</span>
              {config.account.name ? ` (${config.account.name})` : ''}
            </text>
          </box>
        ) : (
          <box marginBottom={SPACING.sm}>
            <text fg={theme.dim}>Unified Account: Website & CLI share the same login</text>
          </box>
        )}
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.green}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {options.map((opt, i) => (
            <SelectionItem
              key={i}
              label={opt.label}
              description={opt.desc}
              badge={opt.badge}
              isSelected={i === selectedIdx}
            />
          ))}
        </box>
        <ShortcutLegend
          items={[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵ enter', desc: 'select' },
            { key: 'esc', desc: 'quit' },
          ]}
        />
      </box>
    );
  };

  // ── Create Account step ─────────────────────────────────────────────────

  const CreateAccountStep = () => {
    const fields = ['email', 'name', 'password'];
    const placeholders = { email: 'technomp786@gmail.com', name: 'Your Name', password: 'min 8 characters' };

    usePaste((clip) => {
      if (loading) return;
      const field = status?.type === 'otp' ? 'otp' : fields[activeField];
      setField(field, (inputValues[field] || '') + clip);
    }, !loading);

    useKeyboard((key) => {
      if (loading) return;

      // Clipboard paste (Ctrl+V / Cmd+V)
      if ((key.ctrl || key.meta) && (key.name === 'v' || key.sequence === '\x16')) {
        const clip = sanitizePasteText(getClipboardText());
        if (clip) {
          const field = status?.type === 'otp' ? 'otp' : fields[activeField];
          setField(field, (inputValues[field] || '') + clip);
          return;
        }
      }

      if (key.name === 'tab' || key.name === 'down') {
        setActiveField((f) => (f + 1) % fields.length);
        return;
      }
      if (key.name === 'up') {
        setActiveField((f) => (f - 1 + fields.length) % fields.length);
        return;
      }
      if (key.name === 'escape') {
        setStep(STEPS.WELCOME);
        setStatus(null);
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        const field = status?.type === 'otp' ? 'otp' : fields[activeField];
        setField(field, (inputValues[field] || '').slice(0, -1));
        return;
      }
      if (key.name === 'return') {
        if (status?.type === 'otp') {
          verifyOtp();
        } else if (activeField < fields.length - 1) {
          setActiveField((f) => f + 1);
        } else {
          submitCreateAccount();
        }
        return;
      }

      // Normal typing or terminal-chunk pasted text
      if (key.sequence && !key.ctrl && !key.meta) {
        const clean = sanitizePasteText(key.sequence);
        if (clean) {
          const field = status?.type === 'otp' ? 'otp' : fields[activeField];
          setField(field, (inputValues[field] || '') + clean);
        }
      }
    });

    const submitCreateAccount = async () => {
      const { email, name, password } = inputValues;
      if (!email.includes('@')) { setStatus({ type: 'error', message: 'Enter a valid email address' }); return; }
      if (name.length < 2) { setStatus({ type: 'error', message: 'Name must be at least 2 characters' }); return; }
      if (password.length < 8) { setStatus({ type: 'error', message: 'Password must be at least 8 characters' }); return; }
      setLoading(true);
      setStatus(null);
      try {
        const result = await apiHandlers.sendOtp(email);
        setStatus({
          type: 'otp',
          message: `Verification code sent to ${email}`,
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
        setStatus({ type: 'ok', message: 'Account created and logged in!' });
        setTimeout(() => {
          setStep(STEPS.API_KEY_ASK);
          setSelectedIdx(0);
          setStatus(null);
        }, 1000);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    const isOtpMode = status?.type === 'otp';

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={3} label="Step 1 of 3: Create Account" />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.green}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {!isOtpMode ? (
            <>
              {fields.map((field, i) => (
                <box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
                  <TextInput
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    icon={field === 'email' ? '✉' : field === 'name' ? '👤' : '🔒'}
                    value={inputValues[field]}
                    focused={i === activeField}
                    hidden={field === 'password'}
                    placeholder={placeholders[field]}
                  />
                </box>
              ))}
            </>
          ) : (
            <box flexDirection="column" paddingLeft={SPACING.md} paddingRight={SPACING.md}>
              <StatusMessage type="otp" message={status.message} />
              {status.devOtp && (
                <StatusMessage type="info" message={`Dev Mode Code: ${status.devOtp}`} />
              )}
              <box marginTop={SPACING.sm} flexDirection="row" alignItems="center">
                <text fg={theme.dim}>6-Digit Code: </text>
                <box borderStyle="round" borderColor={theme.green} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} minWidth={14}>
                  <text fg={theme.textBright} attributes={TextAttributes.BOLD}>
                    {inputValues.otp.split('').join(' ')}
                    {'  '.repeat(Math.max(0, 6 - inputValues.otp.length))}
                  </text>
                </box>
              </box>
            </box>
          )}
        </box>

        {loading && (
          <box marginTop={SPACING.sm}>
            <text fg={theme.green}>⟳ Processing{dots}</text>
          </box>
        )}
        {status && status.type !== 'otp' && (
          <StatusMessage type={status.type} message={status.message} />
        )}

        <ShortcutLegend
          items={[
            { key: '↵ enter', desc: isOtpMode ? 'verify' : 'submit' },
            { key: '⇥ tab', desc: 'switch field' },
            { key: 'ctrl+v', desc: 'paste' },
            { key: 'esc', desc: 'back' },
          ]}
        />
      </box>
    );
  };

  // ── Login step ──────────────────────────────────────────────────────────

  const LoginStep = () => {
    const fields = ['email', 'password'];
    const placeholders = { email: 'technomp786@gmail.com', password: 'website password' };

    usePaste((clip) => {
      if (loading) return;
      const field = fields[activeField];
      setField(field, (inputValues[field] || '') + clip);
    }, !loading);

    useKeyboard((key) => {
      if (loading) return;

      // Clipboard paste (Ctrl+V / Cmd+V)
      if ((key.ctrl || key.meta) && (key.name === 'v' || key.sequence === '\x16')) {
        const clip = sanitizePasteText(getClipboardText());
        if (clip) {
          const field = fields[activeField];
          setField(field, (inputValues[field] || '') + clip);
          return;
        }
      }

      if (key.name === 'tab' || key.name === 'down') {
        setActiveField((f) => (f + 1) % fields.length);
        return;
      }
      if (key.name === 'up') {
        setActiveField((f) => (f - 1 + fields.length) % fields.length);
        return;
      }
      if (key.name === 'escape') {
        setStep(STEPS.WELCOME);
        setStatus(null);
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        const field = fields[activeField];
        setField(field, (inputValues[field] || '').slice(0, -1));
        return;
      }
      if (key.name === 'return') {
        if (activeField < fields.length - 1) {
          setActiveField((f) => f + 1);
        } else {
          submitLogin();
        }
        return;
      }

      // Normal typing or terminal-chunk pasted text
      if (key.sequence && !key.ctrl && !key.meta) {
        const clean = sanitizePasteText(key.sequence);
        if (clean) {
          const field = fields[activeField];
          setField(field, (inputValues[field] || '') + clean);
        }
      }
    });

    const submitLogin = async () => {
      const { email, password } = inputValues;
      if (!email.includes('@')) { setStatus({ type: 'error', message: 'Enter a valid email address' }); return; }
      if (!password) { setStatus({ type: 'error', message: 'Password is required' }); return; }
      setLoading(true);
      setStatus(null);
      try {
        await apiHandlers.login(email, password);
        setStatus({ type: 'ok', message: '✓ Logged in successfully!' });
        setTimeout(() => {
          setStep(STEPS.API_KEY_ASK);
          setSelectedIdx(0);
          setStatus(null);
        }, 900);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={3} label="Step 1 of 3: Login to Mcode" />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.blue}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {fields.map((field, i) => (
            <box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
              <TextInput
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                icon={field === 'email' ? '✉' : '🔒'}
                value={inputValues[field]}
                focused={i === activeField}
                hidden={field === 'password'}
                placeholder={placeholders[field]}
              />
            </box>
          ))}
        </box>

        {loading && (
          <box marginTop={SPACING.sm}>
            <text fg={theme.blue}>⟳ Verifying credentials{dots}</text>
          </box>
        )}
        {status && <StatusMessage type={status.type} message={status.message} />}

        <ShortcutLegend
          items={[
            { key: '↵ enter', desc: 'submit' },
            { key: '⇥ tab', desc: 'switch field' },
            { key: 'ctrl+v', desc: 'paste' },
            { key: 'esc', desc: 'back' },
          ]}
        />
      </box>
    );
  };

  // ── API Key Ask step ────────────────────────────────────────────────────

  const ApiKeyAskStep = () => {
    const options = [
      {
        label: 'OpenRouter (Recommended)',
        desc: 'one key unlocks many models: Llama 3.3, GPT-4o, DeepSeek V3, Qwen, Gemini',
        badge: 'Recommended'
      },
      {
        label: 'Enter Custom API Key',
        desc: 'use your own key (OpenAI, Claude, DeepSeek, OpenRouter, etc.)',
        badge: 'Custom'
      },
      {
        label: 'Skip for Now',
        desc: 'start directly with local / mock providers',
        badge: 'Offline'
      },
    ];

    useKeyboard((key) => {
      if (loading) return;
      if (key.name === 'up' || key.name === 'pageup') setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.name === 'down' || key.name === 'pagedown') setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if (key.name === 'return') {
        if (selectedIdx === 0 || selectedIdx === 1) {
          // SECURITY-FIX: this option used to store a hardcoded demo OpenRouter
          // key (leaked). There is no bundled key anymore — both leading
          // options route to the key-entry flow.
          setStep(STEPS.API_KEY_PROVIDER);
          setSelectedIdx(0);
        } else {
          setStep(STEPS.DONE);
        }
      }
      if (key.name === 'escape') setStep(STEPS.DONE);
    });

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={1} total={3} label="Step 2 of 3: AI Models & Providers" />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {options.map((opt, i) => (
            <SelectionItem
              key={i}
              label={opt.label}
              description={opt.desc}
              badge={opt.badge}
              isSelected={i === selectedIdx}
            />
          ))}
        </box>

        {loading && (
          <box marginTop={SPACING.sm}>
            <text fg={theme.purple}>⟳ Configuring OpenRouter models{dots}</text>
          </box>
        )}
        {status && <StatusMessage type={status.type} message={status.message} />}

        <ShortcutLegend
          items={[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵ enter', desc: 'select' },
            { key: 'esc', desc: 'skip' },
          ]}
        />
      </box>
    );
  };

  // ── API Key Provider Select ─────────────────────────────────────────────

  const ApiKeyProviderStep = () => {
    useKeyboard((key) => {
      if (loading) return;
      if (key.name === 'up' || key.name === 'pageup') setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.name === 'down' || key.name === 'pagedown') setSelectedIdx((i) => Math.min(PROVIDER_CHOICES.length - 1, i + 1));
      if (key.name === 'escape') { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); return; }
      if (key.name === 'return') {
        const choice = PROVIDER_CHOICES[selectedIdx];
        setSelectedProvider(choice);
        setActiveField(choice.env ? 0 : 1);
        setField('apiKey', '');
        setField('customEnv', '');
        setStep(STEPS.API_KEY_INPUT);
      }
    });

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={1} total={3} label="Select AI Provider" />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {PROVIDER_CHOICES.map((p, i) => (
            <SelectionItem
              key={i}
              label={p.id}
              description={p.env ? `(${p.env})` : ''}
              badge={p.badge}
              icon={p.icon}
              isSelected={i === selectedIdx}
            />
          ))}
        </box>
        <ShortcutLegend
          items={[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵ enter', desc: 'select' },
            { key: 'esc', desc: 'back' },
          ]}
        />
      </box>
    );
  };

  // ── API Key Input step ──────────────────────────────────────────────────

  const ApiKeyInputStep = () => {
    const needsCustomEnv = !selectedProvider?.env;
    const fields = needsCustomEnv ? ['customEnv', 'apiKey'] : ['apiKey'];

    usePaste((clip) => {
      if (loading) return;
      const field = fields[activeField];
      setField(field, (inputValues[field] || '') + (field === 'customEnv' ? clip.toUpperCase() : clip));
    }, !loading);

    useKeyboard((key) => {
      if (loading) return;

      // Clipboard paste (Ctrl+V / Cmd+V)
      if ((key.ctrl || key.meta) && (key.name === 'v' || key.sequence === '\x16')) {
        const clip = sanitizePasteText(getClipboardText());
        if (clip) {
          const field = fields[activeField];
          setField(field, (inputValues[field] || '') + clip);
          return;
        }
      }

      if (needsCustomEnv && (key.name === 'tab' || key.name === 'down')) {
        setActiveField((f) => (f + 1) % fields.length);
        return;
      }
      if (needsCustomEnv && key.name === 'up') {
        setActiveField((f) => (f - 1 + fields.length) % fields.length);
        return;
      }
      if (key.name === 'escape') { setStep(STEPS.API_KEY_PROVIDER); setSelectedIdx(0); setStatus(null); return; }
      if (key.name === 'backspace' || key.name === 'delete') {
        const field = fields[activeField];
        setField(field, (inputValues[field] || '').slice(0, -1));
        return;
      }
      if (key.name === 'return') {
        submitApiKey();
        return;
      }

      // Normal typing or terminal-chunk pasted text
      if (key.sequence && !key.ctrl && !key.meta) {
        const clean = sanitizePasteText(key.sequence);
        if (clean) {
          const field = fields[activeField];
          setField(field, (inputValues[field] || '') + (field === 'customEnv' ? clean.toUpperCase() : clean));
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
        setStatus({ type: 'ok', message: `✓ Stored in vault as ${env}` });
        setTimeout(() => setStep(STEPS.DONE), 800);
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={1} total={3} label={`Enter ${selectedProvider?.id || 'API'} Key`} />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          width={cardWidth}
        >
          {needsCustomEnv && (
            <box marginBottom={SPACING.sm}>
              <TextInput
                label="Env Variable"
                icon="⚡"
                value={inputValues.customEnv}
                focused={activeField === 0}
                placeholder="e.g. OPENAI_API_KEY"
              />
            </box>
          )}
          <TextInput
            label="API Key"
            icon="🔑"
            value={inputValues.apiKey}
            focused={needsCustomEnv ? activeField === 1 : true}
            hidden={true}
            placeholder="sk-..."
          />
        </box>

        {loading && (
          <box marginTop={SPACING.sm}>
            <text fg={theme.green}>⟳ Saving key to encrypted vault{dots}</text>
          </box>
        )}
        {status && <StatusMessage type={status.type} message={status.message} />}

        <ShortcutLegend
          items={[
            { key: '↵ enter', desc: 'save' },
            ...(needsCustomEnv ? [{ key: '⇥ tab', desc: 'switch' }] : []),
            { key: 'ctrl+v', desc: 'paste' },
            { key: 'esc', desc: 'back' },
          ]}
        />
      </box>
    );
  };

  // ── Done step ───────────────────────────────────────────────────────────

  const DoneStep = () => {
    useKeyboard((key) => {
      if (key.name === 'return' || key.name === 'escape') onComplete();
    });

    return (
      <box flexDirection="column" alignItems="center">
        <StepIndicator current={2} total={3} label="✓ Setup Complete" />
        <box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.green}
          paddingTop={SPACING.sm}
          paddingBottom={SPACING.sm}
          paddingLeft={SPACING.md}
          paddingRight={SPACING.md}
          width={cardWidth}
        >
          <text fg={theme.greenBright} attributes={TextAttributes.BOLD}>
            ✓ Account: <span fg={theme.textBright}>{config?.account?.email || 'technomp786@gmail.com'}</span>
          </text>
          <text fg={theme.greenBright}>
            ✓ AI Suite: <span fg={theme.text}>6 OpenRouter Models Ready (Llama 3.3, GPT-4o, DeepSeek V3)</span>
          </text>
          <text fg={theme.greenBright}>
            ✓ Local Vault: <span fg={theme.dim}>Encrypted at ~/.mcode/vault.json.enc</span>
          </text>
          <box marginTop={SPACING.sm} marginBottom={SPACING.xs || 0}>
            <text fg={theme.blue} attributes={TextAttributes.BOLD}>Quick Commands inside TUI:</text>
          </box>
          <text fg={theme.text}>  • /model               — switch between 6+ AI models</text>
          <text fg={theme.text}>  • mcode --god "prompt"  — autonomous multi-agent coding</text>
          <text fg={theme.text}>  • /mode high           — toggle reasoning budget</text>
          <text fg={theme.text}>  • /watch on            — real-time code auto-fixer</text>
        </box>

        <ShortcutLegend
          items={[
            { key: '↵ enter', desc: 'start coding now' },
          ]}
        />
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
    [STEPS.DONE]: DoneStep,
  };

  const CurrentStep = stepComponents[step] || WelcomeStep;

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {!isCompact ? (
        <Logo />
      ) : (
        <box marginTop={SPACING.sm} marginBottom={SPACING.xs || 0}>
          <text fg={theme.greenBright} attributes={TextAttributes.BOLD}>
            ◈  M C O D E  ◈
          </text>
        </box>
      )}

      <box marginBottom={SPACING.xs || 0}>
        <text fg={theme.dim}>Autonomous Multi-Model AI Coding Assistant</text>
      </box>

      <Divider width={cardWidth} />

      <box marginTop={SPACING.sm}>
        <CurrentStep />
      </box>

      <box marginTop={SPACING.sm}>
        <text fg="#3a3f47">v2.4.6 · Web IDE Parity</text>
      </box>
    </box>
  );
}
