import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="font-serif text-7xl italic text-primary sm:text-8xl">404</p>
        <p className="mt-4 font-sans text-muted-foreground">Esta página não existe.</p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-[10px] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
