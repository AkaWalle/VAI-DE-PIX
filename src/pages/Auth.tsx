import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  CircleDollarSign,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FloatingField } from "@/components/auth/floating-field";
import { AuthDashboardPreview } from "@/components/auth/auth-dashboard-preview";

export default function Auth() {
  const { login, register, isLoading, user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasToken = hasSessionToken();
  const [authTab, setAuthTab] = useState("login");

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
      navigate("/", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao criar conta");
    }
  };

  const tabTriggerClass =
    "rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md " +
    "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:underline-offset-4 " +
    "data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:underline";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* Coluna esquerda ~60% — branding */}
      <div className="relative hidden min-h-0 flex-col justify-center overflow-hidden bg-gradient-primary px-10 py-12 text-primary-foreground lg:flex xl:px-16 2xl:px-24">
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{
            backgroundImage:
              "url('/piggy-bank-background.webp'), url('/piggy-bank-background.jpg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.88,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/25 via-green-600/15 to-emerald-700/25" />

        <div className="relative z-10 max-w-xl space-y-10">
          <div className="space-y-5">
            <h2 className="tracking-tight text-white drop-shadow-md">
              <span className="block text-3xl font-bold leading-[1.15] text-white/95 xl:text-4xl 2xl:text-5xl">
                Domine suas finanças
              </span>
              <span className="mt-2 block bg-gradient-to-r from-emerald-100 via-teal-100 to-white bg-clip-text text-4xl font-black leading-[1.1] text-transparent xl:text-5xl 2xl:text-6xl">
                com inteligência
              </span>
            </h2>
            <p className="max-w-md text-base font-normal leading-relaxed text-white/90 xl:text-lg 2xl:text-xl">
              Sistema completo de gestão financeira pessoal com análises e
              automações que cabem no seu dia a dia.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <TrendingUp
                className="h-6 w-6 flex-shrink-0 text-white drop-shadow-md"
                aria-hidden
              />
              <span className="text-base font-medium text-white/95 drop-shadow-sm xl:text-lg">
                Relatórios detalhados para decisões melhores
              </span>
            </div>
            <div className="flex items-start gap-4">
              <Shield
                className="h-6 w-6 flex-shrink-0 text-white drop-shadow-md"
                aria-hidden
              />
              <span className="text-base font-medium text-white/95 drop-shadow-sm xl:text-lg">
                Dados 100% seguros e criptografados
              </span>
            </div>
            <div className="flex items-start gap-4">
              <Zap
                className="h-6 w-6 flex-shrink-0 text-white drop-shadow-md"
                aria-hidden
              />
              <span className="text-base font-medium text-white/95 drop-shadow-sm xl:text-lg">
                Automação para ganhar tempo no dia a dia
              </span>
            </div>
          </div>

          <AuthDashboardPreview className="hidden xl:block" />
        </div>
      </div>

      {/* Coluna direita ~40% — formulários */}
      <div className="flex min-h-screen flex-col justify-center bg-background/95 px-6 py-10 sm:px-8 lg:min-h-0 lg:border-l lg:border-border/50 lg:px-10 xl:px-14 2xl:px-16 lg:py-12 lg:backdrop-blur-sm">
        {/* Hero compacto — mobile */}
        <div className="mb-8 space-y-3 text-center lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Vai de Pix
          </p>
          <h2 className="text-2xl font-bold leading-tight text-foreground">
            Domine suas finanças
            <span className="mt-1 block bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              com inteligência
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestão pessoal com clareza e segurança.
          </p>
          <div className="mx-auto max-w-sm pt-2 [&_*]:scale-90 [&_*]:origin-top">
            <AuthDashboardPreview className="[&>div]:max-w-full" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <CircleDollarSign className="h-10 w-10 text-primary" aria-hidden />
              <h1 className="text-2xl font-extrabold tracking-wide sm:text-3xl">
                VAI DE PIX
              </h1>
            </div>
          </div>

          <Tabs
            value={authTab}
            onValueChange={(v) => {
              setError("");
              setAuthTab(v);
            }}
            className="w-full"
          >
            <TabsList className="grid h-12 w-full grid-cols-2 gap-2 rounded-xl border border-border bg-muted/50 p-1.5">
              <TabsTrigger value="login" className={tabTriggerClass}>
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className={tabTriggerClass}>
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="space-y-2 px-6 pb-2 pt-6 text-center sm:px-8">
                  <CardTitle className="text-2xl font-bold sm:text-3xl">
                    Bem-vindo de volta
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Entre com suas credenciais para acessar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-6 pb-8 pt-2 sm:px-8">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <FloatingField
                      label="Email"
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <FloatingField
                      label="Senha"
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />

                    {error && authTab === "login" && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Ainda não tem conta?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/90 hover:decoration-primary"
                        onClick={() => {
                          setError("");
                          setAuthTab("register");
                        }}
                      >
                        Criar conta
                      </button>
                    </p>
                  </form>

                  <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
                    <p className="font-medium text-foreground/80">
                      Usuários de teste
                    </p>
                    <p>joao@exemplo.com / maria@exemplo.com</p>
                    <p>Senha: 123456</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="space-y-2 px-6 pb-2 pt-6 text-center sm:px-8">
                  <CardTitle className="text-2xl font-bold sm:text-3xl">
                    Criar nova conta
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Preencha os dados abaixo para criar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-6 pb-8 pt-2 sm:px-8">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <FloatingField
                      label="Nome completo"
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      value={registerForm.name}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <FloatingField
                      label="Email"
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      value={registerForm.email}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <FloatingField
                      label="Senha"
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <FloatingField
                      label="Confirmar senha"
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />

                    {error && authTab === "register" && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Já tem uma conta?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary/90 hover:decoration-primary"
                        onClick={() => {
                          setError("");
                          setAuthTab("login");
                        }}
                      >
                        Entrar
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
