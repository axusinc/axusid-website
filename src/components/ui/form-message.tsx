type FormMessageProps = {
  children: React.ReactNode;
};

export function FormError({ children }: FormMessageProps) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {children}
    </p>
  );
}

export function FormSuccess({ children }: FormMessageProps) {
  return (
    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      {children}
    </p>
  );
}
