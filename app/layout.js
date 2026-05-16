import './globals.css';

export const metadata = {
  title: 'CPH/27 Marathon Tracker',
  description: 'Copenhagen Marathon 2027 Training Plan — Sub-3:52 @ 5:30/km',
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CPH/27" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  );
}
