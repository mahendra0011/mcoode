import { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Logo } from './Logo.jsx';
import { theme } from './theme.js';

// ─── Small reusable primitives ──────────────────────────────────────────────

function Divider({ width = 56, color = '#1f2937' }) {
  return <Text color={color}>{'─'.repeat(width)}</Text>;
}

function Badge({ label, color = theme.green }) {
  return (
    <Text color={color} bold>
      {'  '}[{label}]
    </Text>
  );
}

function StepIndicator({ current, total }) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <Text key={i} color={i === current ? theme.green : '#1f2937'}>
        {i === current ? ' ● ' : ' ○ '}
      </Text>
    );
  }
  return <Box justifyContent="center">{dots}</Box>;
}

function SelectionItem({ label, description, isSelected, index }) {
  return (
    <Box paddingX={2}>
      <Text color={isSelected ? theme.greenBright : '#1f2937'}>
        {isSelected ? '▸ ' : '  '}
      </Text>
      <Text color={isSelected ? theme.text : theme.dim} bold={isSelected}>
        {label}
      </Text>
      {description && (
        <Text color={theme.gray}>{`  ${description}`}</Text>
      )}
    </Box>
  );
}

function TextInput({ label, value, focused, hidden = false, placeholder = '' }) {
  const displayValue = hidden ? '•'.repeat(value.length) : value;
  return (
    <Box paddingX={2} flexDirection="row">
      <Text color={theme.dim}>{label}: </Text>
      <Box
        borderStyle="round"
        borderColor={focused ? theme.green : '#1f2937'}
        paddingX={1}
        minWidth={32}
      >
        {value.length > 0 ? (
          <Text color={theme.text}>{displayValue}</Text>
        ) : (
          <Text color="#3a3f47">{placeholder}</Text>
        )}
        {focused && <Text color={theme.greenBright}>▌</Text>}
      </Box>
    </Box>
  );
}

function StatusMessage({ type, message }) {
  const icons = { ok: '✓', error: '✗', warn: '⚠', info: '●' };
  const colors = { ok: theme.green, error: theme.red, warn: theme.amber, info: theme.blue };
  return (
    <Box paddingX={2} marginTop={1}>
      <Text color={colors[type] || theme.dim}>{icons[type] || '●'} {message}</Text>
    </Box>
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

export function OnboardingScreen({ onComplete, hasAccount, hasKey, config, apiHandlers }) {
  const { exit } = useApp();
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

  // ── Welcome step ────────────────────────────────────────────────────────

  const WelcomeStep = () => {
    const options = [
      { label: 'Create Account', desc: 'new to mcode? start here' },
      { label: 'Login', desc: 'already have an account' },
    ];

    useInput((input, key) => {
      if (loading) return;
      if (key.upArrow || key.pageUp) setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.downArrow || key.pageDown) setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if (key.return) {
        if (selectedIdx === 0) { setStep(STEPS.CREATE_ACCOUNT); setActiveField(0); }
        else if (selectedIdx === 1) { setStep(STEPS.LOGIN); setActiveField(0); }
      }
      if (key.escape) { exit(); }
    });

    return (
      <Box flexDirection="column" alignItems="center">
        <Box marginBottom={1}>
          <Text color={theme.dim}>
            welcome{config?.account?.name ? `, ${config.account.name}` : ''}!
          </Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="#1f2937"
          paddingY={1}
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
        </Box>
        <Box marginTop={1}>
          <Text color={theme.gray}>↑↓</Text>
          <Text color={theme.dim}> navigate  </Text>
          <Text color={theme.gray}>enter</Text>
          <Text color={theme.dim}> select  </Text>
          <Text color={theme.gray}>esc</Text>
          <Text color={theme.dim}> quit</Text>
        </Box>
      </Box>
    );
  };

  // ── Create Account step ─────────────────────────────────────────────────

  const CreateAccountStep = () => {
    const fields = ['email', 'name', 'password'];
    const placeholders = { email: 'user@example.com', name: 'Your Name', password: 'min 8 chars' };

    useInput((input, key) => {
      if (loading) return;

      // OTP sub-step
      if (status?.type === 'otp') {
        if (key.backspace || key.delete) { setField('otp', inputValues.otp.slice(0, -1)); return; }
        if (key.return && inputValues.otp.length === 6) {
          verifyOtp();
          return;
        }
        if (key.escape) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
        if (input && /\d/.test(input) && inputValues.otp.length < 6) {
          setField('otp', inputValues.otp + input);
        }
        return;
      }

      if (key.tab || key.downArrow || key.pageDown) setActiveField((f) => Math.min(fields.length - 1, f + 1));
      if (key.upArrow || key.pageUp) setActiveField((f) => Math.max(0, f - 1));
      if (key.escape) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
      if (key.backspace || key.delete) {
        const field = fields[activeField];
        setField(field, inputValues[field].slice(0, -1));
        return;
      }
      if (key.return) {
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
      <Box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={totalSteps} />
        <Box marginY={1}><Text color={theme.text} bold>Create Account</Text></Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.green}
          paddingY={1}
          width={56}
        >
          {!isOtpMode ? (
            <>
              {fields.map((field, i) => (
                <Box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
                  <TextInput
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={inputValues[field]}
                    focused={i === activeField}
                    hidden={field === 'password'}
                    placeholder={placeholders[field]}
                  />
                </Box>
              ))}
              <Box paddingX={2} marginTop={1}>
                <Text color={theme.dim}>tab/↑↓ switch fields · enter to submit · esc back</Text>
              </Box>
            </>
          ) : (
            <Box flexDirection="column" paddingX={2}>
              <StatusMessage type="ok" message={status.message} />
              {status.devOtp && (
                <StatusMessage type="info" message={`Dev mode OTP: ${status.devOtp}`} />
              )}
              <Box marginTop={1}>
                <Text color={theme.dim}>Enter 6-digit code: </Text>
                <Box borderStyle="round" borderColor={theme.green} paddingX={1} minWidth={12}>
                  <Text color={theme.text} bold>
                    {inputValues.otp.split('').join(' ')}
                    {'  '.repeat(Math.max(0, 6 - inputValues.otp.length))}
                  </Text>
                </Box>
              </Box>
              <Box marginTop={1}>
                <Text color={theme.dim}>
                  {inputValues.otp.length}/6 digits · enter to verify · esc back
                </Text>
              </Box>
            </Box>
          )}
        </Box>
        {loading && (
          <Box marginTop={1}>
            <Text color={theme.green}>⟳ processing{dots}</Text>
          </Box>
        )}
        {status && status.type === 'error' && (
          <StatusMessage type="error" message={status.message} />
        )}
        {status && status.type === 'ok' && (
          <StatusMessage type="ok" message={status.message} />
        )}
      </Box>
    );
  };

  // ── Login step ──────────────────────────────────────────────────────────

  const LoginStep = () => {
    const fields = ['email', 'password'];
    const placeholders = { email: 'user@example.com', password: 'your password' };

    useInput((input, key) => {
      if (loading) return;
      if (key.tab || key.downArrow || key.pageDown) setActiveField((f) => Math.min(fields.length - 1, f + 1));
      if (key.upArrow || key.pageUp) setActiveField((f) => Math.max(0, f - 1));
      if (key.escape) { setStep(STEPS.WELCOME); setStatus(null); setSelectedIdx(0); return; }
      if (key.backspace || key.delete) {
        const field = fields[activeField];
        setField(field, inputValues[field].slice(0, -1));
        return;
      }
      if (key.return) {
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
      <Box flexDirection="column" alignItems="center">
        <StepIndicator current={0} total={totalSteps} />
        <Box marginY={1}><Text color={theme.text} bold>Login</Text></Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.blue}
          paddingY={1}
          width={56}
        >
          {fields.map((field, i) => (
            <Box key={field} marginBottom={i < fields.length - 1 ? 1 : 0}>
              <TextInput
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                value={inputValues[field]}
                focused={i === activeField}
                hidden={field === 'password'}
                placeholder={placeholders[field]}
              />
            </Box>
          ))}
          <Box paddingX={2} marginTop={1}>
            <Text color={theme.dim}>tab/↑↓ switch fields · enter to submit · esc back</Text>
          </Box>
        </Box>
        {loading && (
          <Box marginTop={1}>
            <Text color={theme.green}>⟳ processing{dots}</Text>
          </Box>
        )}
        {status && status.type === 'error' && <StatusMessage type="error" message={status.message} />}
        {status && status.type === 'ok' && <StatusMessage type="ok" message={status.message} />}
      </Box>
    );
  };

  // ── API Key Ask step ────────────────────────────────────────────────────

  const ApiKeyAskStep = () => {
    const options = [
      { label: 'Yes, add an API key now', desc: '' },
      { label: 'Skip for now', desc: 'mock + local providers still work' },
    ];

    useInput((input, key) => {
      if (key.upArrow || key.pageUp) setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.downArrow || key.pageDown) setSelectedIdx((i) => Math.min(options.length - 1, i + 1));
      if (key.return) {
        if (selectedIdx === 0) { setStep(STEPS.API_KEY_PROVIDER); setSelectedIdx(0); }
        else onComplete();
      }
      if (key.escape) onComplete();
    });

    return (
      <Box flexDirection="column" alignItems="center">
        <StepIndicator current={1} total={3} />
        <Box marginY={1} flexDirection="column" alignItems="center">
          <Text color={theme.amber}>● </Text>
          <Text color={theme.text} bold>API Key Setup</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color={theme.dim}>You need an AI provider API key for chat and god mode</Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.amber}
          paddingY={1}
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
        </Box>
        <Box marginTop={1}>
          <Text color={theme.gray}>↑↓</Text>
          <Text color={theme.dim}> navigate  </Text>
          <Text color={theme.gray}>enter</Text>
          <Text color={theme.dim}> select  </Text>
          <Text color={theme.gray}>esc</Text>
          <Text color={theme.dim}> skip</Text>
        </Box>
      </Box>
    );
  };

  // ── API Key Provider Select ─────────────────────────────────────────────

  const ApiKeyProviderStep = () => {
    useInput((input, key) => {
      if (key.upArrow || key.pageUp) setSelectedIdx((i) => Math.max(0, i - 1));
      if (key.downArrow || key.pageDown) setSelectedIdx((i) => Math.min(PROVIDER_CHOICES.length - 1, i + 1));
      if (key.escape) { setStep(STEPS.API_KEY_ASK); setSelectedIdx(0); return; }
      if (key.return) {
        const choice = PROVIDER_CHOICES[selectedIdx];
        setSelectedProvider(choice);
        setActiveField(choice.env ? 0 : 1); // 1 = custom env name field
        setField('apiKey', '');
        setField('customEnv', '');
        setStep(STEPS.API_KEY_INPUT);
      }
    });

    return (
      <Box flexDirection="column" alignItems="center">
        <StepIndicator current={2} total={3} />
        <Box marginY={1}><Text color={theme.text} bold>Select Provider</Text></Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingY={1}
          width={56}
        >
          {PROVIDER_CHOICES.map((p, i) => (
            <Box key={i} paddingX={2}>
              <Text color={i === selectedIdx ? theme.greenBright : '#1f2937'}>
                {i === selectedIdx ? '▸ ' : '  '}
              </Text>
              <Text color={i === selectedIdx ? theme.purple : theme.dim}>
                {p.icon}{' '}
              </Text>
              <Text color={i === selectedIdx ? theme.text : theme.dim} bold={i === selectedIdx}>
                {p.id}
              </Text>
              {p.env && i === selectedIdx && (
                <Text color={theme.gray}>{`  (${p.env})`}</Text>
              )}
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.gray}>↑↓</Text>
          <Text color={theme.dim}> navigate  </Text>
          <Text color={theme.gray}>enter</Text>
          <Text color={theme.dim}> select  </Text>
          <Text color={theme.gray}>esc</Text>
          <Text color={theme.dim}> back</Text>
        </Box>
      </Box>
    );
  };

  // ── API Key Input step ──────────────────────────────────────────────────

  const ApiKeyInputStep = () => {
    const needsCustomEnv = !selectedProvider?.env;

    useInput((input, key) => {
      if (loading) return;
      if (needsCustomEnv && key.tab) {
        setActiveField((f) => f === 0 ? 1 : 0);
        return;
      }
      if (key.escape) { setStep(STEPS.API_KEY_PROVIDER); setSelectedIdx(0); setStatus(null); return; }
      if (key.backspace || key.delete) {
        if (needsCustomEnv && activeField === 1) {
          setField('customEnv', inputValues.customEnv.slice(0, -1));
        } else {
          setField('apiKey', inputValues.apiKey.slice(0, -1));
        }
        return;
      }
      if (key.return) {
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
      <Box flexDirection="column" alignItems="center">
        <StepIndicator current={2} total={3} />
        <Box marginY={1}>
          <Text color={theme.text} bold>
            Enter {selectedProvider?.id || 'Provider'} API Key
          </Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.purple}
          paddingY={1}
          width={56}
        >
          {needsCustomEnv && (
            <Box marginBottom={1}>
              <TextInput
                label="Env var"
                value={inputValues.customEnv}
                focused={activeField === 1}
                placeholder="e.g. OPENAI_API_KEY"
              />
            </Box>
          )}
          <TextInput
            label="API Key"
            value={inputValues.apiKey}
            focused={needsCustomEnv ? activeField === 0 : true}
            hidden={true}
            placeholder="sk-..."
          />
          <Box paddingX={2} marginTop={1}>
            <Text color={theme.dim}>
              {needsCustomEnv ? 'tab switch · ' : ''}enter to save · esc back
            </Text>
          </Box>
        </Box>
        {loading && (
          <Box marginTop={1}>
            <Text color={theme.green}>⟳ saving{dots}</Text>
          </Box>
        )}
        {status && status.type === 'error' && <StatusMessage type="error" message={status.message} />}
        {status && status.type === 'ok' && <StatusMessage type="ok" message={status.message} />}
      </Box>
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
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%">
      <Logo />
      <Box marginBottom={1}>
        <Text color={theme.dim}>terminal-first, multi-model AI coding CLI</Text>
      </Box>
      <Divider />
      <Box marginTop={1}>
        <CurrentStep />
      </Box>
      <Box position="absolute" marginTop={2}>
        <Text color="#1a1e22">v2.4.6</Text>
      </Box>
    </Box>
  );
}
