'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch user status
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="navbar" style={{ padding: '0.45rem 0' }}>
      <div className="container navbar-container">
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image 
            src="/logo_mci.png" 
            alt="BPRS HIK MCI Logo" 
            width={180} 
            height={65} 
            style={{ objectFit: 'contain' }} 
            priority
          />
        </Link>

        {/* 3D Running Text (Marquee) */}
        <div className="marquee-container">
          <div className="marquee-text">
            BPRS HIK MCI — GENERATOR MAP Pembiayaan Pensiunan — BPRS HIK MCI — GENERATOR MAP Pembiayaan Pensiunan — 
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.nama}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{user.role}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Keluar
              </button>
            </div>
          )}
          {/* 3D Rocker Switch Theme Toggle */}
          <div className="navbar-theme-switch">
            <label className="rocker-switch" title={theme === 'light' ? 'Nyalakan Mode Gelap' : 'Nyalakan Mode Terang'}>
              <input 
                type="checkbox" 
                checked={theme === 'light'} 
                onChange={toggleTheme} 
              />
              <span className="rocker-switch-btn">
                <span className="rocker-switch-text-on">I</span>
                <span className="rocker-switch-text-off">O</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </nav>
  );
}
