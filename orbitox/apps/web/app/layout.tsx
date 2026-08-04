export const metadata = {
  title: 'OrbitoX Platform',
  description: 'The Plugin-Driven SaaS Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
