
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppConfigProvider } from '@/contexts/AppConfigContext'; // Import AppConfigProvider
import AppLayout from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/components/ThemeProvider'; 

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

// Metadata can't be dynamic in the root layout in this way.
// We'll update the title dynamically on the client side using a component.
export const metadata: Metadata = {
  title: 'Caixa Tulsi',
  description: 'Sistema de Lançamentos Diários para Restaurantes e Hotéis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppConfigProvider>
            <AuthProvider>
              <AppLayout>{children}</AppLayout>
              <Toaster />
            </AuthProvider>
          </AppConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
