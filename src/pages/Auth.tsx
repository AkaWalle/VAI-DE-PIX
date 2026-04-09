import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Pix diamond logo ── */
function PixLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 1L27 14L14 27L1 14Z" fill="#25d366" />
      <path d="M14 7.5L20.5 14L14 20.5L7.5 14Z" fill="#128c7e" />
    </svg>
  );
}

const BULLETS = [
  "Receitas e despesas organizadas",
  "Metas e caixinhas financeiras",
  "Relatórios detalhados",
];

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
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginForm.email || !loginForm.password) { setError("Preencha todos os campos"); return; }
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
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setError("Preencha todos os campos"); return;
    }
    if (registerForm.password !== registerForm.confirmPassword) { setError("As senhas não coincidem"); return; }
    if (registerForm.password.length < 6) { setError("Senha mínima de 6 caracteres"); return; }
    try {
      await register(registerForm.name, registerForm.email, registerForm.password);
      toast({ title: "Conta criada!", description: "Bem-vindo ao VAI DE PIX." });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  };

  /* Shared input style */
  const inputClass =
    "h-[42px] border border-[#e5e7eb] bg-white text-[#1a1a1a] placeholder:text-[#9ca3af] " +
    "rounded-[8px] px-[14px] focus-visible:border-[#128c7e] focus-visible:ring-[3px] focus-visible:ring-[rgba(18,140,126,0.15)] " +
    "transition-all duration-150";

  return (
    <div className="flex min-h-screen">
      {/* ── Left — Branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "#075e54" }}
      >
        <div className="flex flex-col h-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#128c7e] shadow-lg">
              <PixLogo size={28} />
            </div>
            <span className="text-[18px] font-bold tracking-tight text-white">VAI DE PIX</span>
          </div>

          {/* Hero */}
          <div className="space-y-8">
            <p className="text-[22px] font-light leading-snug text-white max-w-xs">
              Controle total das suas finanças, de forma simples.
            </p>
            <ul className="space-y-3">
              {BULLETS.map((text) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20">
                    <Check className="h-3 w-3 text-[#25d366]" />
                  </span>
                  <span className="text-sm text-[#dcf8c6]">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} VAI DE PIX · v1.0
          </p>
        </div>
      </div>

      {/* ── Right — Formulário ── */}
      <div
        className="flex flex-1 items-center justify-center p-8"
        style={{ background: "#ece5dd" }}
      >
        <div
          className="w-full max-w-[400px] animate-fade-in-up rounded-[16px] p-10"
          style={{
            background: "#ffffff",
            boxShadow: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
          }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#128c7e]">
              <PixLogo size={20} />
            </div>
            <span className="text-base font-bold text-[#1a1a1a]">VAI DE PIX</span>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-[#e5e7eb] flex gap-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={[
                  "pb-3 text-sm font-medium transition-colors duration-150",
                  tab === t
                    ? "text-[#128c7e] border-b-2 border-[#128c7e] -mb-px"
                    : "text-[#6b7280] hover:text-[#1a1a1a]",
                ].join(" ")}
              >
                {t === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          {/* ── Login ── */}
          {tab === "login" && (
            <>
              <div className="space-y-1 mb-6">
                <h1 className="text-xl font-bold text-[#1a1a1a]">Bem-vindo de volta</h1>
                <p className="text-sm text-[#6b7280]">Entre com suas credenciais para continuar</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[13px] font-medium text-[#1a1a1a]">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className={inputClass}
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[13px] font-medium text-[#1a1a1a]">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className={inputClass}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toast({ title: "Recuperação de senha", description: "Função disponível em breve." })}
                    className="text-[13px] text-[#128c7e] hover:text-[#075e54] hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                {error && (
                  <Alert className="rounded-[8px] border-rose-500/30 bg-rose-500/10">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <AlertDescription className="text-rose-600">{error}</AlertDescription>
                  </Alert>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 h-[42px] w-full rounded-[8px] bg-[#128c7e] text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#075e54] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>
                    : "Entrar"}
                </button>
              </form>
            </>
          )}

          {/* ── Criar Conta ── */}
          {tab === "register" && (
            <>
              <div className="space-y-1 mb-6">
                <h1 className="text-xl font-bold text-[#1a1a1a]">Criar nova conta</h1>
                <p className="text-sm text-[#6b7280]">Preencha os dados para começar</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                {[
                  { id: "name",         label: "Nome completo",   type: "text",     placeholder: "Seu nome",      field: "name" },
                  { id: "reg-email",    label: "Email",           type: "email",    placeholder: "seu@email.com", field: "email" },
                  { id: "reg-password", label: "Senha",           type: "password", placeholder: "••••••••",       field: "password" },
                  { id: "reg-confirm",  label: "Confirmar senha", type: "password", placeholder: "••••••••",       field: "confirmPassword" },
                ].map(({ id, label, type, placeholder, field }) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id} className="text-[13px] font-medium text-[#1a1a1a]">{label}</Label>
                    <Input
                      id={id}
                      type={type}
                      placeholder={placeholder}
                      className={inputClass}
                      value={registerForm[field as keyof typeof registerForm]}
                      onChange={(e) => setRegisterForm(p => ({ ...p, [field]: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                ))}
                {error && (
                  <Alert className="rounded-[8px] border-rose-500/30 bg-rose-500/10">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <AlertDescription className="text-rose-600">{error}</AlertDescription>
                  </Alert>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 h-[42px] w-full rounded-[8px] bg-[#128c7e] text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#075e54] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</>
                    : "Criar Conta"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
