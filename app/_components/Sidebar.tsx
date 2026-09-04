'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const NAV = [
  {href: '/', label: 'Dashboard'},
  {href: '/episodes', label: 'Episodes'},
  {href: '/episodes/new', label: 'New Episode'},
  {href: '/growth', label: 'Growth'},
  {href: '/settings', label: 'Settings'},
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="side">
      <div className="brand">
        Finance<span>·</span>Engine
      </div>
      <nav className="nav">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? path === '/' : path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
