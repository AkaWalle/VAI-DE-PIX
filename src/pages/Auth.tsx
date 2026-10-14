import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

const BULLETS = [
  "Receitas e despesas organizadas",
  "Metas e caixinhas financeiras",
  "Saldo derivado do ledger, sem atalho",
];

const fieldClass =
  "h-11 rounded-[10px] border-white/10 bg-white/[0.04] text-foreground placeholder:text-muted-foreground/40 " +
  "focus-visible:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-primary/20";

export default function Auth() {
  const { login, register, isLoading, user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasToken = hasSessionToken();

  useEffect(() => {
    if (hasToken && user) navigate("/", { replace: true });
  }, [hasToken, user, navigate]);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sent" | "no-email">("idle");
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginForm.email || !loginForm.password) {
      setError("Preencha todos os campos");
      return;
    }
    try {
      await login(loginForm.email, loginForm.password);
      toast({ title: "Bem-vindo de volta!" });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (
      !registerForm.name ||
      !registerForm.email ||
      !registerForm.password ||
      !registerForm.confirmPassword
    ) {
      setError("Preencha todos os campos");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (registerForm.password.length < 6) {
      setError("Senha mínima de 6 caracteres");
      return;
    }
    try {
      await register(registerForm.name, registerForm.email, registerForm.password);
      toast({ title: "Conta criada!", description: "Bem-vindo ao VAI DE PIX." });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 p-12 lg:flex lg:w-1/2">
        <div
          className="pointer-events-none absolute left-0 top-0 h-80 w-80 rounded-full"
          style={{
            background: "radial-gradient(circle, var(--neon-green-glow) 0%, transparent 70%)",
          }}
        />
        <Logo size="lg" />
        <div className="relative z-10 max-w-sm space-y-8">
          <h1 className="font-serif text-4xl font-light italic leading-tight tracking-tight text-foreground">
            Controle total das suas finanças, de forma simples.
          </h1>
          <ul className="space-y-3">
            {BULLETS.map((text) => (
              <li key={text} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/50">
          © {new Date().getFullYear()} vai de pix
        </p>
      </div>

      <div className="flex flex-1 items-start justify-center p-6 pt-12 sm:p-8 lg:items-center lg:pt-8">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          <div className="mb-6 lg:hidden">
            <Logo size="md" />
          </div>

          <div className="mb-7 flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={[
                  "flex-1 rounded-[10px] py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {tab === "login" && (
            <>
              <div className="mb-6 space-y-1">
                <h2 className="font-serif text-2xl italic text-foreground">Bem-vindo de volta</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Entre com suas credenciais
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-email"
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className={fieldClass}
                    value={loginForm.email}
                    onChange={(e) => {
                      setLoginForm((p) => ({ ...p, email: e.target.value }));
                      if (resetStatus !== "idle") setResetStatus("idle");
                    }}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-password"
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    Senha
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={fieldClass}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!loginForm.email.trim()) {
                        setResetStatus("no-email");
                        emailInputRef.current?.focus();
                        return;
                      }
                      setResetStatus("sent");
                    }}
                    className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary/80 transition-opacity hover:text-primary"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                {resetStatus === "no-email" && (
                  <Alert className="rounded-[8px] border-warning/30 bg-warning/10">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      Digite seu email acima para receber o link de recuperação.
                    </AlertDescription>
                  </Alert>
                )}
                {resetStatus === "sent" && (
                  <Alert className="rounded-[8px] border-primary/30 bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-foreground">
                      Se <strong>{loginForm.email}</strong> tiver uma conta, o link de recuperação
                      será enviado em breve. Verifique sua caixa de entrada.
                    </AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert className="rounded-[8px] border-expense/30 bg-expense/10">
                    <AlertCircle className="h-4 w-4 text-expense" />
                    <AlertDescription className="text-expense">{error}</AlertDescription>
                  </Alert>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>
            </>
          )}

          {tab === "register" && (
            <>
              <div className="mb-6 space-y-1">
                <h2 className="font-serif text-2xl italic text-foreground">Criar nova conta</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Preencha os dados para começar
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                {(
                  [
                    {
                      id: "name",
                      label: "Nome completo",
                      type: "text",
                      placeholder: "Seu nome",
                      field: "name",
                      autoComplete: "name",
                    },
                    {
                      id: "reg-email",
                      label: "Email",
                      type: "email",
                      placeholder: "seu@email.com",
                      field: "email",
                      autoComplete: "email",
                    },
                    {
                      id: "reg-password",
                      label: "Senha",
                      type: "password",
                      placeholder: "••••••••",
                      field: "password",
                      autoComplete: "new-password",
                    },
                    {
                      id: "reg-confirm",
                      label: "Confirmar senha",
                      type: "password",
                      placeholder: "••••••••",
                      field: "confirmPassword",
                      autoComplete: "new-password",
                    },
                  ] as const
                ).map(({ id, label, type, placeholder, field, autoComplete }) => (
                  <div key={id} className="space-y-1.5">
                    <Label
                      htmlFor={id}
                      className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      {label}
                    </Label>
                    <Input
                      id={id}
                      type={type}
                      autoComplete={autoComplete}
                      placeholder={placeholder}
                      className={fieldClass}
                      value={registerForm[field]}
                      onChange={(e) =>
                        setRegisterForm((p) => ({ ...p, [field]: e.target.value }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                ))}
                {error && (
                  <Alert className="rounded-[8px] border-expense/30 bg-expense/10">
                    <AlertCircle className="h-4 w-4 text-expense" />
                    <AlertDescription className="text-expense">{error}</AlertDescription>
                  </Alert>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
