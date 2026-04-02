import { AuthPageView } from "@/components/auth/auth-page-view";

type AuthPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;

  return <AuthPageView nextPath={params?.next} />;
}
