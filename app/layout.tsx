import type {ReactNode} from 'react';
import './globals.css';
import {Sidebar} from './_components/Sidebar';

export const metadata = {
  title: 'Finance Content Engine',
  description: 'Internal US personal-finance YouTube production engine',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Sidebar />
          <div className="content">{children}</div>
        </div>
      </body>
    </html>
  );
}
