import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Loader2, CircleDollarSign, ArrowLeft, CheckCircle } from "lucide-react";
import { authService } from "@/services/auth.service";

/**
 * Redefinir senha com token recebido por e-mail (link do backend).
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const hasToken = token.length > 0;

  useEffect(() => {
    if (!hasToken) {
      setError("Link inválido. Solicite uma nova redefinição de senha.");
    }
  }, [hasToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasToken) return;

    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link inválido ou expirado. Solicite uma nova redefinição.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CircleDollarSign className="h-10 w-10 text-[#c8ff00]" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
                VAI DE PIX
              </h1>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                Redefinir senha
              </CardTitle>
              <CardDescription className="text-base">
                {hasToken
                  ? "Digite sua nova senha abaixo."
                  : "Use o link que enviamos por e-mail para redefinir sua senha."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <AlertDescription>
                        Senha alterada com sucesso. Faça login com a nova senha.
                      </AlertDescription>
                    </div>
                  </Alert>
                  <Button asChild className="w-full" size="sm">
                    <Link to="/auth" className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Ir para o login
                    </Link>
                  </Button>
                </div>
              ) : !hasToken ? (
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link to="/auth/forgot-password" className="inline-flex items-center gap-2">
                    Solicitar novo link
                  </Link>
                </Button>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-new-password">Nova senha</Label>
                    <Input
                      id="reset-new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password">Confirmar senha</Label>
                    <Input
                      id="reset-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      minLength={8}
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
                        Salvando...
                      </>
                    ) : (
                      "Redefinir senha"
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
