'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function SlikParserPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Form states
  const [typeChecking, setTypeChecking] = useState('Individual');
  const [selectedDebitur, setSelectedDebitur] = useState('');
  const [jsonFile, setJsonFile] = useState(null);
  
  // Searchable Debitur list
  const [debiturs, setDebiturs] = useState([]);
  const [debitursLoading, setDebitursLoading] = useState(true);
  const [debiturSearch, setDebiturSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Upload actions
  const [uploadLoading, setUploadLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  // Slik Data list
  const [slikData, setSlikData] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    checkAuth();
    fetchDebiturs();
    fetchSlikData(1, '');
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

  const fetchDebiturs = async () => {
    setDebitursLoading(true);
    try {
      // Get debiturs (limit 1000 to cover all)
      const res = await fetch('/api/debiturs?limit=1000');
      const data = await res.json();
      if (data.success) {
        setDebiturs(data.debiturs || []);
      }
    } catch (err) {
      console.error('Error fetching debiturs:', err);
    } finally {
      setDebitursLoading(false);
    }
  };

  const fetchSlikData = async (pageNum = 1, searchVal = '') => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      if (searchVal) params.append('search', searchVal);

      const res = await fetch(`/api/slik/data?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSlikData(data.data || []);
        setTotalPages(data.pages || 1);
        setTotalItems(data.total || 0);
        setPage(data.currentPage || 1);
      }
    } catch (err) {
      console.error('Error fetching SLIK list:', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setListSearch(val);
    fetchSlikData(1, val);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchSlikData(newPage, listSearch);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Hanya diperbolehkan mengunggah file format JSON (.json).');
      return;
    }
    setJsonFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatusError('');
    setStatusSuccess('');

    if (!selectedDebitur) {
      setStatusError('Silakan pilih debitur link terlebih dahulu.');
      return;
    }

    if (!jsonFile) {
      setStatusError('Silakan pilih file JSON hasil SLIK OJK.');
      return;
    }

    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', jsonFile);
      formData.append('key', typeChecking);
      formData.append('nuptk', selectedDebitur.nopen); // Link nopen (Nomor Pensiun)

      const res = await fetch('/api/slik/upload-json', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setStatusSuccess('File JSON hasil SLIK OJK berhasil di-upload, di-parser, dan disimpan ke database!');
        setJsonFile(null);
        setSelectedDebitur('');
        setDebiturSearch('');
        // Refresh data
        fetchSlikData(1, listSearch);
        fetchDebiturs(); // has_slik status changed
      } else {
        setStatusError(data.message || 'Gagal memproses file JSON.');
      }
    } catch (err) {
      setStatusError('Terjadi kesalahan koneksi server.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data SLIK untuk ${nama}?`)) return;
    
    try {
      const res = await fetch(`/api/slik/data/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Data SLIK berhasil dihapus.');
        fetchSlikData(page, listSearch);
        fetchDebiturs();
      } else {
        alert(data.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  // Filter debiturs in autocomplete dropdown
  const filteredDebiturs = debiturs.filter(d => 
    d.nama.toLowerCase().includes(debiturSearch.toLowerCase()) ||
    d.nik.includes(debiturSearch) ||
    d.nopen.includes(debiturSearch)
  );

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
            
            {/* TOP SECTION: UPLOAD & PARSER PANEL (FULL WIDTH) */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', pb: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
                  <span>📥</span> Upload &amp; Parser Hasil SLIK OJK (JSON)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Unggah file JSON hasil iDeb SLIK OJK untuk di-parser otomatis dan dihubungkan ke data pengajuan nasabah.
                </p>
              </div>

              {statusError && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {statusError}
                </div>
              )}

              {statusSuccess && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✅ {statusSuccess}
                </div>
              )}

              <form onSubmit={handleUpload}>
                
                {/* Type Checking */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Jenis Hasil SLIK</label>
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
                      🏢 Badan Usaha (Perusahaan)
                    </button>
                  </div>
                </div>

                {/* Grid Row: Debitur Link & File Upload */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  
                  {/* Searchable Debitur Link Dropdown */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Link ke Calon Debitur *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder={selectedDebitur ? `${selectedDebitur.nama} (${selectedDebitur.nopen})` : 'Cari berdasarkan nama, NIK, atau nopen...'}
                      value={debiturSearch}
                      onChange={(e) => {
                        setDebiturSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      style={{
                        border: selectedDebitur ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                        background: selectedDebitur ? 'rgba(0, 180, 134, 0.03)' : 'var(--bg-secondary)'
                      }}
                    />
                    
                    {showDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 20,
                        marginTop: '0.25rem'
                      }}>
                        {debitursLoading ? (
                          <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Memuat data debitur...</div>
                        ) : filteredDebiturs.length === 0 ? (
                          <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Debitur tidak ditemukan</div>
                        ) : (
                          filteredDebiturs.map((deb) => (
                            <div 
                              key={deb.id} 
                              onClick={() => {
                                setSelectedDebitur(deb);
                                setDebiturSearch('');
                                setShowDropdown(false);
                              }}
                              style={{
                                padding: '0.6rem 0.88rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                borderBottom: '1px solid var(--border-glass)',
                                background: selectedDebitur?.id === deb.id ? 'rgba(0,180,134,0.05)' : 'transparent',
                                color: selectedDebitur?.id === deb.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{deb.nama}</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>Nopen: {deb.nopen}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {selectedDebitur && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem 0.85rem', background: 'rgba(0,180,134,0.05)', border: '1px solid rgba(0,180,134,0.2)', borderRadius: '4px', fontSize: '0.825rem' }}>
                        <span>🔗 Terpilih: <b style={{ color: 'var(--accent-primary)' }}>{selectedDebitur.nama}</b> (Nopen: {selectedDebitur.nopen})</span>
                        <button type="button" onClick={() => setSelectedDebitur('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}>✕ Batal</button>
                      </div>
                    )}
                  </div>

                  {/* JSON File Upload Dropzone */}
                  <div className="form-group">
                    <label className="form-label">File JSON Hasil SLIK OJK *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ border: '2px dashed var(--border-glass)', padding: '1.25rem 1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'var(--bg-secondary)' }}>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={handleFileChange}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                        />
                        <span style={{ fontSize: '1.75rem' }}>📄</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                          Klik atau Drag &amp; Drop File Hasil SLIK OJK (.json)
                        </p>
                      </div>

                      {jsonFile && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '4px', fontSize: '0.8rem' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                            📁 {jsonFile.name} ({(jsonFile.size / 1024).toFixed(1)} KB)
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setJsonFile(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ padding: '0.8rem 2.5rem', fontSize: '0.95rem' }}
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? 'Memproses JSON...' : '⚙️ Proses & Parse File JSON'}
                  </button>
                </div>

              </form>
            </div>

            {/* BOTTOM SECTION: PARSED SLIK RECORDS TABLE (FULL WIDTH) */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                    <span>📁</span> Data Hasil SLIK Ter-parser
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Daftar seluruh data hasil iDeb SLIK OJK yang telah berhasil diparse dan disimpan.
                  </p>
                </div>

                <button 
                  onClick={() => fetchSlikData(page, listSearch)} 
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
                    placeholder="Cari berdasarkan NAMA DEBITUR, NIK, atau ID REQUEST..." 
                    value={listSearch}
                    onChange={handleSearchChange}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {listLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Memuat data hasil SLIK...
                </div>
              ) : slikData.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Belum ada data hasil checking SLIK ter-parser.
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>ID Request</th>
                          <th>Nama &amp; NIK Debitur</th>
                          <th>Tipe SLIK</th>
                          <th>Petugas OJK</th>
                          <th>Tanggal Hasil</th>
                          <th style={{ textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slikData.map((slik) => (
                          <tr key={slik.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                              {slik.id}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{slik.nama}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>NIK: {slik.nik}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: slik.jns_bi === 'Individual' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                color: slik.jns_bi === 'Individual' ? 'var(--info)' : '#8b5cf6',
                                border: slik.jns_bi === 'Individual' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)'
                              }}>
                                {slik.jns_bi}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{slik.petugas}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {slik.tgl_hasil_slik ? slik.tgl_hasil_slik : '-'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <Link 
                                  href={`/slik-detail/${slik.id}/${slik.jns_bi}`}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                >
                                  🔎 Lihat Detail
                                </Link>
                                <button 
                                  onClick={() => handleDelete(slik.id, slik.nama)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', boxShadow: 'none' }}
                                >
                                  Hapus
                                </button>
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
