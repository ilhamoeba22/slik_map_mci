'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function SlikRequestPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Form states
  const [idSlik, setIdSlik] = useState('');
  const [typeChecking, setTypeChecking] = useState('Individual');
  const [tujuanPermintaan, setTujuanPermintaan] = useState('01'); // Default: Pembiayaan Baru
  const [pembiayaan, setPembiayaan] = useState('');
  
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [ttl, setTtl] = useState('');
  const [alamat, setAlamat] = useState('');

  // Spouse / joint states
  const [showSpouse, setShowSpouse] = useState(false);
  const [nik2, setNik2] = useState('');
  const [nama2, setNama2] = useState('');
  const [ttl2, setTtl2] = useState('');
  const [alamat2, setAlamat2] = useState('');

  // File states
  const [ktpFiles, setKtpFiles] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // List states
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Check auth
  useEffect(() => {
    checkAuth();
    fetchRequests(1, '');
    // Auto-generate batch ID
    const date = new Date();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setIdSlik(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${rand}`);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchRequests = async (pageNum = 1, searchVal = '') => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      if (searchVal) params.append('search', searchVal);

      const res = await fetch(`/api/slik/request?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setTotalPages(data.pages || 1);
        setTotalItems(data.total || 0);
        setPage(data.currentPage || 1);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchRequests(1, val);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchRequests(newPage, search);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + ktpFiles.length > 4) {
      alert('Maksimal file KTP yang diizinkan hanya 4 file.');
      return;
    }
    setKtpFiles([...ktpFiles, ...files]);
  };

  const removeFile = (index) => {
    setKtpFiles(ktpFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!idSlik || !nik || !nama || !tujuanPermintaan) {
      setFormError('Harap isi semua kolom wajib (ID SLIK, NIK, Nama, Tujuan Permintaan).');
      return;
    }

    if (nik.length !== 16) {
      setFormError('NIK harus terdiri dari 16 digit.');
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('id_slik', idSlik);
      formData.append('type_checking', typeChecking);
      formData.append('tujuan_permintaan', tujuanPermintaan);
      formData.append('pembiayaan', pembiayaan);
      
      formData.append('nik', nik);
      formData.append('nama', nama.toUpperCase());
      formData.append('ttl', ttl);
      formData.append('alamat', alamat);

      if (showSpouse) {
        formData.append('nik_2', nik2);
        formData.append('nama_2', nama2.toUpperCase());
        formData.append('ttl_2', ttl2);
        formData.append('alamat_2', alamat2);
      }

      ktpFiles.forEach((file) => {
        formData.append('ktp', file);
      });

      const res = await fetch('/api/slik/request', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess('Permintaan SLIK berhasil disimpan!');
        // Reset form
        setNik('');
        setNama('');
        setTtl('');
        setAlamat('');
        setNik2('');
        setNama2('');
        setTtl2('');
        setAlamat2('');
        setKtpFiles([]);
        setShowSpouse(false);
        // Regenerate batch ID
        const date = new Date();
        const rand = Math.floor(1000 + Math.random() * 9000);
        setIdSlik(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${rand}`);
        // Refresh list
        fetchRequests(1, search);
      } else {
        setFormError(data.message || 'Gagal menyimpan permintaan.');
      }
    } catch (err) {
      setFormError('Terjadi kesalahan koneksi server.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Memverifikasi sesi...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Akses Ditolak</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Anda harus masuk terlebih dahulu untuk mengakses halaman ini.</p>
          <Link href="/" className="btn btn-primary" style={{ width: '100%' }}>
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      
      <div className="main-content">
        <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* TOP SECTION: FORM INPUT (FULL WIDTH) */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', pb: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
                  <span>✍️</span> Pengajuan Checking SLIK OJK
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Isi formulir pengajuan di bawah ini untuk membuat berkas request TXT OJK secara otomatis.
                </p>
              </div>

              {formError && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {formError}
                </div>
              )}

              {formSuccess && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✅ {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                
                {/* Checking Type Toggle */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Tipe Checking Nasabah</label>
                  <div style={{ display: 'flex', gap: '1rem', maxWidth: '500px' }}>
                    <button 
                      type="button" 
                      onClick={() => setTypeChecking('Individual')}
                      className={`btn ${typeChecking === 'Individual' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.875rem', boxShadow: 'none' }}
                    >
                      👤 Perorangan (Individual)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTypeChecking('Perusahaan')}
                      className={`btn ${typeChecking === 'Perusahaan' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.875rem', boxShadow: 'none' }}
                    >
                      🏢 Badan Usaha / PT
                    </button>
                  </div>
                </div>

                {/* Grid Row 1: ID SLIK, Tujuan, Pembiayaan */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">ID SLIK (Batch ID) *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={idSlik} 
                      onChange={(e) => setIdSlik(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tujuan OJK *</label>
                    <select 
                      className="form-control" 
                      value={tujuanPermintaan}
                      onChange={(e) => setTujuanPermintaan(e.target.value)}
                    >
                      <option value="01">01 - Pembiayaan Baru</option>
                      <option value="02">02 - Pembiayaan Tambahan</option>
                      <option value="03">03 - Review Portofolio</option>
                      <option value="04">04 - Lainnya</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pembiayaan (Plafon/Jenis)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Contoh: 150.000.000 / Multiguna Pensiun" 
                      value={pembiayaan}
                      onChange={(e) => setPembiayaan(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section Header: Debitur Utama */}
                <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTops: '1.25rem', margin: '1.5rem 0 1rem 0' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    👤 Data Debitur Utama
                  </h4>
                </div>

                {/* Grid Row 2: NIK & Nama Utama */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">NIK Debitur Utama *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      maxLength={16}
                      placeholder="Masukkan 16 digit NIK"
                      value={nik}
                      onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nama Lengkap Debitur Utama *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="NAMA LENGKAP SESUAI KTP"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Grid Row 3: TTL & Alamat Utama */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tempat, Tanggal Lahir</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Contoh: Banda Aceh, 31-12-1980"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alamat Lengkap</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Alamat domisili / sesuai KTP"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                    />
                  </div>
                </div>

                {/* Toggle Spouse Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowSpouse(!showSpouse)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {showSpouse ? '➖ Sembunyikan Data Pasangan/Penjamin' : '➕ Tambah Data Pasangan/Penjamin (Jika Ada)'}
                  </button>
                </div>

                {showSpouse && (
                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      👩‍❤️‍👨 Data Debitur Pasangan / Penjamin
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">NIK Pasangan</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          maxLength={16}
                          placeholder="Masukkan NIK Pasangan"
                          value={nik2}
                          onChange={(e) => setNik2(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Nama Pasangan</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Nama Pasangan Sesuai KTP"
                          value={nama2}
                          onChange={(e) => setNama2(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                      <div className="form-group">
                        <label className="form-label">Tempat, Tanggal Lahir Pasangan</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Contoh: Banda Aceh, 01-01-1985"
                          value={ttl2}
                          onChange={(e) => setTtl2(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alamat Pasangan</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Alamat Pasangan"
                          value={alamat2}
                          onChange={(e) => setAlamat2(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload KTP Section */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">Unggah Foto KTP (Maksimal 4 File)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ border: '2px dashed var(--border-glass)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'var(--bg-secondary)' }}>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                      />
                      <span style={{ fontSize: '2rem' }}>📷</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.5rem' }}>
                        Klik atau Drag &amp; Drop Foto KTP / Berkas PDF
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Format yang didukung: JPG, PNG, WEBP, PDF (Maks. 4 file)</p>
                    </div>

                    {ktpFiles.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {ktpFiles.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                            <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                            <button 
                              type="button" 
                              onClick={() => removeFile(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ padding: '0.8rem 2.5rem', fontSize: '0.95rem' }}
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Menyimpan & Memproses...' : '💾 Simpan & Ajukan Permintaan SLIK'}
                  </button>
                </div>

              </form>
            </div>

            {/* BOTTOM SECTION: REQUEST HISTORY LIST (FULL WIDTH) */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                    <span>📋</span> Riwayat Permintaan Checking SLIK OJK
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Daftar seluruh riwayat pengajuan checking SLIK yang telah diinput ke dalam sistem.
                  </p>
                </div>
                
                <button 
                  onClick={() => fetchRequests(page, search)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  🔄 Refresh Data
                </button>
              </div>

              {/* Search bar */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}>🔍</span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Cari berdasarkan NAMA DEBITUR, NIK, atau BATCH ID..." 
                    value={search}
                    onChange={handleSearchChange}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {listLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Memuat data riwayat...
                </div>
              ) : requests.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Tidak ada riwayat permintaan checking SLIK yang cocok.
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Batch ID (SLIK ID)</th>
                          <th>Debitur Utama &amp; Pasangan</th>
                          <th>AO Pengaju</th>
                          <th>Tanggal Pengajuan</th>
                          <th>Lampiran KTP</th>
                          <th style={{ textAlign: 'right' }}>Berkas OJK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => (
                          <tr key={req.id_request}>
                            <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                              {req.id_slik}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.nama}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>NIK: {req.nik}</span>
                                {req.nama_2 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    👩‍❤️‍👨 Pasangan: {req.nama_2} ({req.nik_2})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.ao}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              {req.file_ktp ? (
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  {req.file_ktp.split(',').map((file, idx) => (
                                    <a 
                                      key={idx} 
                                      href={`/uploads/slik/${file}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.2rem' }}
                                      title={`Lihat Foto KTP ${idx + 1}`}
                                    >
                                      🖼️ KTP {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tidak ada file</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <a 
                                  href={`/api/slik/request/${req.id_slik}/download-txt`} 
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.775rem', boxShadow: 'none' }}
                                >
                                  📥 Unduh TXT OJK
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Menampilkan <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.min((page - 1) * limit + 1, totalItems)}</span> - <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.min(page * limit, totalItems)}</span> dari <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{totalItems}</span> data
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          opacity: page === 1 ? 0.4 : 1,
                          cursor: page === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ◀ Prev
                      </button>

                      {(() => {
                        const pages = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          if (page <= 4) {
                            pages.push(1, 2, 3, 4, 5, '...', totalPages);
                          } else if (page >= totalPages - 3) {
                            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                          } else {
                            pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
                          }
                        }
                        return pages.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={idx} style={{ padding: '0 0.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                ...
                              </span>
                            );
                          }
                          const isCurrent = p === page;
                          return (
                            <button
                              key={idx}
                              onClick={() => handlePageChange(p)}
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: isCurrent ? 'none' : '1px solid var(--border-glass)',
                                background: isCurrent ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'var(--bg-secondary)',
                                color: isCurrent ? '#ffffff' : 'var(--text-primary)',
                              }}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}

                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          opacity: page === totalPages ? 0.4 : 1,
                          cursor: page === totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Next ▶
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
