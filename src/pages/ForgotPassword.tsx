import { useState } from "react";
import { Link } from "react-router-dom";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CircleDollarSign, ArrowLeft } from "lucide-react";
import { authService } from "@/services/auth.service";

/**
 * Página "Esqueci minha senha". Chama POST /auth/forgot-password; backend envia e-mail via Resend ou SMTP.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Informe seu email.");
      return;
    }
    // Validação básica de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Informe um email válido.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(trimmed);
      setSuccess(true);
    } catch {
      setError("Não foi possível enviar o link. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Painel direito (mesmo estilo da Auth) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CircleDollarSign className="h-10 w-10 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
                VAI DE PIX
              </h1>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                Esqueci minha senha
              </CardTitle>
              <CardDescription className="text-base">
                Informe o email da sua conta. Enviaremos um link para redefinir sua senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                    <AlertDescription>
                      Se esse email estiver cadastrado, você receberá as instruções em instantes. Verifique a caixa de entrada e o spam.
                    </AlertDescription>
                  </Alert>
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link to="/auth" className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar para o login
                    </Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                        Enviando...
                      </>
                    ) : (
                      "Enviar link"
                    )}
                  </Button>

                  <Button asChild variant="ghost" className="w-full" size="sm">
                    <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar para o login
                    </Link>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            VAI DE PIX é um organizador financeiro. Não realizamos transações bancárias.
          </p>
        </div>
      </div>
    </div>
  );
}
