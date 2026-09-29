import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <Logo />
      <div className="mt-10 w-full max-w-md rounded-2xl bg-paper p-6 shadow-[0_1px_0_var(--color-line)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
