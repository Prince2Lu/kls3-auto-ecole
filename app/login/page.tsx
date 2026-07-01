import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Connexion collaborateur
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Accédez à l&apos;espace de gestion de votre auto-école
          </p>
        </div>
        {error === "unauthorized" && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Vous n&apos;avez pas accès à cet espace.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
