import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store-index";
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
  CircleDollarSign,
  TrendingUp,
  Shield,
  Zap,
  PiggyBank,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { login, register, isLoading, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-primary text-primary-foreground pl-32 pr-16 py-12 flex-col justify-center relative overflow-hidden">
        {/* Background Image - Porquinho com moedas */}
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{
            // Otimizado: WebP primeiro (menor tamanho), fallback para PNG
            backgroundImage: "url('/piggy-bank-background.webp'), url('/piggy-bank-background.jpg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.9,
          }}
        />
        {/* Gradient Overlay - Leve para destacar a imagem */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-600/10 to-emerald-600/20" />

        <div className="max-w-lg space-y-8 relative z-10">
          <div className="space-y-6">
            <h2 className="text-4xl font-black leading-tight text-white drop-shadow-lg tracking-tight">
              Domine suas finanças com inteligência
            </h2>
            <p className="text-2xl text-white/95 drop-shadow-md font-medium leading-relaxed">
              Sistema completo de gestão financeira pessoal com análises
              inteligentes e automações.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-6 w-6 text-white drop-shadow-md flex-shrink-0" />
              <span className="text-xl text-white drop-shadow-md font-medium">
                Relatórios detalhados para decisões melhores
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Shield className="h-6 w-6 text-white drop-shadow-md flex-shrink-0" />
              <span className="text-xl text-white drop-shadow-md font-medium">
                Dados 100% seguros e criptografados
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Zap className="h-6 w-6 text-white drop-shadow-md flex-shrink-0" />
              <span className="text-xl text-white drop-shadow-md font-medium">
                Automação para ganhar tempo no dia a dia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 lg:flex-none lg:w-[500px] flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CircleDollarSign className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-extrabold tracking-wide">
                VAI DE PIX
              </h1>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card>
                <CardHeader className="space-y-2 text-center">
                  <CardTitle className="text-3xl font-bold">
                    Bem-vindo de volta
                  </CardTitle>
                  <CardDescription className="text-base">
                    Entre com suas credenciais para acessar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
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
                  </form>

                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>Usuários de teste:</p>
                    <p>joao@exemplo.com / maria@exemplo.com</p>
                    <p>Senha: 123456</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <Card>
                <CardHeader className="space-y-2 text-center">
                  <CardTitle className="text-3xl font-bold">
                    Criar nova conta
                  </CardTitle>
                  <CardDescription className="text-base">
                    Preencha os dados abaixo para criar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Seu nome"
                        value={registerForm.name}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">
                        Confirmar senha
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.confirmPassword}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
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
