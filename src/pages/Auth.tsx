import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

export default function Auth() {
  const { login, register, isLoading, user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasToken = hasSessionToken();

  // Só redirecionar quando token E usuário carregado (evita loop /auth <-> /)
  useEffect(() => {
    if (hasToken && user) {
      navigate("/", { replace: true });
    }
  }, [hasToken, user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginForm.email || !loginForm.password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    try {
      await login(loginForm.email, loginForm.password);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao VAI DE PIX.",
      });
      // Redirecionar para o dashboard após login bem-sucedido
      navigate("/", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao fazer login");
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
      setError("Por favor, preencha todos os campos");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (registerForm.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      await register(
        registerForm.name,
        registerForm.email,
        registerForm.password,
      );
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao VAI DE PIX.",
      });
      // Redirecionar para o dashboard após registro bem-sucedido
      navigate("/", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao criar conta");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0a0a0a]">
      {/* Painel esquerdo — apenas desktop */}
      <div className="hidden md:flex md:flex-1 flex-col justify-between bg-[#0d0d0d] border-r border-white/[0.05] p-12 relative overflow-hidden">
        {/* Glow decorativo superior esquerdo */}
        <div
          className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(200,255,0,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Glow decorativo inferior direito */}
        <div
          className="absolute bottom-0 right-0 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(200,255,0,0.02) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        <div className="relative z-10">
          <h1
            className="font-serif italic font-light text-white leading-tight mb-4"
            style={{ fontSize: "36px", letterSpacing: "-0.5px" }}
          >
            Domine suas<br />
            finanças com<br />
            <span style={{ color: "#c8ff00" }}>inteligência</span>
          </h1>

          <p className="text-sm text-white/30 leading-relaxed mb-10 max-w-sm">
            Sistema completo de gestão financeira pessoal com análises
            inteligentes, metas e automações.
          </p>

          <div className="flex flex-col gap-3.5">
            {[
              "Relatórios detalhados para decisões melhores",
              "Dados 100% seguros e criptografados",
              "Automações para ganhar tempo no dia a dia",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                  style={{ background: "#c8ff00" }}
                />
                <span
                  className="font-mono text-white/40 uppercase"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.8px",
                    lineHeight: 1.5,
                  }}
                >
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p
          className="relative z-10 font-mono text-white/15 uppercase"
          style={{ fontSize: "9px", letterSpacing: "1px" }}
        >
          © 2026 vai de pix — controle financeiro
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="w-full md:w-[420px] flex-shrink-0 flex flex-col justify-center bg-[#0a0a0a] px-8 md:px-11 py-12">
        <div className="w-full">
          <Tabs defaultValue="login" className="w-full">
            <div className="mb-8">
              {/* Logo no mobile (painel esquerdo não aparece) */}
              <div className="mb-6 md:hidden">
                <Logo size="md" />
              </div>

              <h2
                className="font-serif italic font-normal text-white mb-1.5"
                style={{ fontSize: "24px" }}
              >
                Bem-vindo de volta
              </h2>
              <p
                className="font-mono text-white/25 uppercase"
                style={{ fontSize: "10px", letterSpacing: "1.5px" }}
              >
                Entre com suas credenciais
              </p>
            </div>

            <TabsList className="flex bg-white/[0.04] rounded-xl p-0.5 mb-7 border border-white/[0.06]">
              <TabsTrigger
                value="login"
                className="flex-1 py-2.5 rounded-[10px] font-mono uppercase text-[#0a0a0a] font-medium data-[state=active]:bg-[#c8ff00] data-[state=active]:text-[#0a0a0a] data-[state=inactive]:text-white/30"
                style={{ fontSize: "10px", letterSpacing: "1px" }}
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 py-2.5 rounded-[10px] font-mono uppercase text-white/30 data-[state=active]:bg-[#c8ff00] data-[state=active]:text-[#0a0a0a]"
                style={{ fontSize: "10px", letterSpacing: "1px" }}
              >
                Criar conta
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="login-email"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="login-password"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                    <div className="text-right mt-1 mb-6">
                      <Link
                        to="/auth/forgot-password"
                        className="font-mono uppercase"
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.8px",
                          color: "rgba(200,255,0,0.55)",
                          textDecoration: "none",
                        }}
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl font-mono uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mb-4"
                    style={{
                      padding: "14px",
                      background: "#c8ff00",
                      border: "none",
                      color: "#0a0a0a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                    }}
                  >
                    {isLoading ? "Carregando..." : "Entrar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="register-name"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Nome completo
                    </Label>
                    <Input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      value={registerForm.name}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="register-email"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={registerForm.email}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="register-password"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Senha
                    </Label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="register-confirm-password"
                      className="block font-mono uppercase text-white/30 mb-1.5"
                      style={{ fontSize: "10px", letterSpacing: "1px" }}
                    >
                      Confirmar senha
                    </Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-full rounded-[10px] px-3.5 py-3 font-sans text-sm text-white placeholder-white/20 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        fontSize: "13px",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(200,255,0,0.35)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                      }}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl font-mono uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mb-4"
                    style={{
                      padding: "14px",
                      background: "#c8ff00",
                      border: "none",
                      color: "#0a0a0a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                    }}
                  >
                    {isLoading ? "Carregando..." : "Criar conta"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <p
            className="text-center font-mono uppercase mt-5"
            style={{
              fontSize: "9px",
              letterSpacing: "0.8px",
              color: "rgba(255,255,255,0.18)",
            }}
          >
            VAI DE PIX é um organizador financeiro. Não realizamos transações bancárias.
          </p>
        </div>
      </div>
    </div>
  );
}
