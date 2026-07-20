'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function SlikDetailPage() {
  const params = useParams();
  const id = params.id;
  const type = params.type;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slik, setSlik] = useState(null);

  useEffect(() => {
    fetchDetails();
  }, [id, type]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slik/data/${id}/details`);
      const data = await res.json();
      if (data.success) {
        setSlik(data);
      } else {
        setError(data.message || 'Gagal memuat data detail SLIK.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi server.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined) return 'Rp 0';
    return 'Rp ' + parseFloat(num).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDateString = (str) => {
    if (!str) return '-';
    // If str is in YYYY-MM-DD format
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Memuat detail laporan SLIK...
      </div>
    );
  }

  if (error || !slik) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="glass-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Peringatan</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Data tidak ditemukan.'}</p>
          <Link href="/slik-parser" className="btn btn-secondary" style={{ width: '100%' }}>
            Kembali ke Daftar SLIK
          </Link>
        </div>
      </div>
    );
  }

  const { header, activeLoans, collaterals, paidOffLoans, owners } = slik;

  // Group active loans by Kolektibilitas
  const loansByKol = activeLoans.reduce((acc, loan) => {
    const kolKey = loan.kol || 'Lainnya';
    if (!acc[kolKey]) acc[kolKey] = [];
    acc[kolKey].push(loan);
    return acc;
  }, {});

  // Calculate totals
  const totalPlafond = activeLoans.reduce((sum, l) => sum + parseFloat(l.platfond || '0'), 0);
  const totalBakiDebet = activeLoans.reduce((sum, l) => sum + parseFloat(l.bakidebet || '0'), 0);
  const totalAngsuran = activeLoans.reduce((sum, l) => sum + parseFloat(l.angsuran || '0'), 0);

  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>

      {/* Dynamic Print Styles CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .print-header {
            margin-bottom: 20px !important;
          }
          table.print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
          }
          table.print-table th, table.print-table td {
            border: 1px solid #000000 !important;
            padding: 5px 8px !important;
            font-size: 8.5pt !important;
            color: #000000 !important;
            background: transparent !important;
          }
          table.print-table th {
            font-weight: bold !important;
            text-align: center !important;
            background: #f3f4f6 !important;
          }
          .section-title {
            color: #000000 !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 3px !important;
            margin-top: 25px !important;
            margin-bottom: 10px !important;
            font-size: 11pt !important;
          }
          .signature-section {
            margin-top: 40px !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
          <Link href="/slik-parser" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ◀ Kembali ke Daftar SLIK
          </Link>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
            🖨️ Cetak Laporan PDF
          </button>
        </div>

        {/* PRINT CONTENT AREA */}
        <div className="glass-card print-container" style={{ padding: '2.5rem', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          {/* Header BPRS HIK MCI */}
          <div className="print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double #1e293b', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/logo_mci.png" alt="BPRS HIK MCI" style={{ height: '55px', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#475569' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>PT. BPRS HIK MITRA CAHAYA INDONESIA</h2>
              <p style={{ margin: '0.2rem 0 0 0' }}>Jl. Kaliurang KM 09, Ngaglik, Sleman, Yogyakarta</p>
              <p style={{ margin: 0 }}>Telp/Fax: (0274) 881159</p>
            </div>
          </div>

          {/* Title Laporan */}
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textDecoration: 'underline', textTransform: 'uppercase' }}>
              LAPORAN HASIL PORTOPOLIO SLIK DEBITUR
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
              ID Permintaan: <b>{header.id}</b>
            </p>
          </div>

          {/* Debtor Profile Details Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', marginBottom: '2rem' }}>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569', width: '35%' }}>NAMA DEBITUR</td>
                    <td style={{ padding: '0.25rem 0' }}>: <b>{header.nama}</b></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569' }}>NIK / NPWP</td>
                    <td style={{ padding: '0.25rem 0', fontFamily: 'monospace' }}>: {header.nik} {header.npwp ? ` / ${header.npwp}` : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569' }}>ALAMAT KTP</td>
                    <td style={{ padding: '0.25rem 0', lineHeight: 1.4 }}>: {header.alamat}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569', width: '45%' }}>JENIS CHECKING</td>
                    <td style={{ padding: '0.25rem 0' }}>: <span style={{ fontWeight: 700 }}>{header.jns_bi}</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569' }}>PETUGAS / OPERATOR</td>
                    <td style={{ padding: '0.25rem 0' }}>: {header.petugas}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', fontWeight: 600, color: '#475569' }}>TANGGAL HASIL SLIK</td>
                    <td style={{ padding: '0.25rem 0' }}>: {formatDateString(header.tgl_hasil_slik)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Active Loans (Portofolio Pembiayaan) */}
          <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
            I. PORTOFOLIO FASILITAS PEMBIAYAAN / KREDIT AKTIF
          </h4>

          {activeLoans.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Tidak ditemukan adanya fasilitas kredit aktif pada data SLIK OJK debitur ini.
            </p>
          ) : (
            Object.keys(loansByKol).map((kolGroup) => (
              <div key={kolGroup} style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: kolGroup === 'Lancar' ? '#10b981' : '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Kolektibilitas: {kolGroup}
                </h5>
                <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '5%' }}>No</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '25%' }}>Nama Bank/LJK</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', width: '15%' }}>Plafond Awal</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '15%' }}>Tanggal Kontrak</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '8%' }}>Tenor</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '7%' }}>Bunga</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', width: '12%' }}>Angsuran Bln</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', width: '13%' }}>Baki Debet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loansByKol[kolGroup].map((loan, idx) => (
                      <tr key={loan.id_bi || idx}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 600 }}>{loan.nm_bank}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{formatRupiah(loan.platfond)}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', fontSize: '0.75rem' }}>
                          {formatDateString(loan.tgl_m)} s/d {formatDateString(loan.tgl_jt)}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{loan.jkw} bln</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{loan.bunga}%</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{formatRupiah(loan.angsuran)}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatRupiah(loan.bakidebet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          {/* Table Totals Row */}
          {activeLoans.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', marginBottom: '2rem' }}>
              <span>RINGKASAN TOTAL AKTIF:</span>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <span>Total Plafond: <span style={{ color: '#0f172a' }}>{formatRupiah(totalPlafond)}</span></span>
                <span>Total Angsuran: <span style={{ color: '#0284c7' }}>{formatRupiah(totalAngsuran)}</span></span>
                <span>Total Baki Debet: <span style={{ color: '#ef4444' }}>{formatRupiah(totalBakiDebet)}</span></span>
              </div>
            </div>
          )}

          {/* Section: Owners / Shareholders (Only Perusahaan) */}
          {type === 'Perusahaan' && owners.length > 0 && (
            <>
              <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', marginTop: '2rem' }}>
                II. PENGURUS DAN PEMILIK SAHAM BADAN USAHA
              </h4>
              <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1', marginBottom: '2rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', width: '5%', textAlign: 'center' }}>No</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '25%' }}>Nama Sesuai Identitas</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '20%' }}>Nomor Identitas</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '15%' }}>Jabatan / Posisi</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '10%' }}>Saham (%)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '25%' }}>Alamat</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((ow, idx) => (
                    <tr key={ow.id_pemilik || idx}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 600 }}>{ow.namaSesuaiIdentitas}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', fontFamily: 'monospace' }}>{ow.nomorIdentitas}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{ow.posisiPekerjaan?.split('_')[1] || ow.posisiPekerjaan}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>{ow.prosentaseKepemilikan}%</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontSize: '0.75rem', lineHeight: 1.3 }}>{ow.alamat?.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Section: Collaterals (Agunan) */}
          <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
            {type === 'Perusahaan' ? 'III' : 'II'}. RINCIAN JAMINAN / AGUNAN DEBITUR
          </h4>

          {collaterals.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0', marginBottom: '2rem' }}>
              Tidak ditemukan adanya rincian jaminan/agunan aktif dalam berkas checking SLIK OJK debitur ini.
            </p>
          ) : (
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', width: '5%', textAlign: 'center' }}>No</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '20%' }}>LJK/Bank Pelapor</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '25%' }}>Jenis & No Bukti Agunan</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', width: '15%' }}>Nilai Agunan (LJK)</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '15%' }}>Pemilik Agunan</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '20%' }}>Lokasi / Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {collaterals.map((ag, idx) => (
                  <tr key={ag.id_agunan || idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 600 }}>{ag.nm_bank}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', lineHeight: 1.3 }}>
                      <b>{ag.jenisAgunanKet}</b><br />
                      <span style={{ fontSize: '0.75rem', color: '#475569' }}>No: {ag.nomorAgunan || '-'}</span>
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {formatRupiah(ag.nilaiAgunanMenurutLJK)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem' }}>{ag.namaPemilikAgunan || '-'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontSize: '0.75rem', lineHeight: 1.3 }}>{ag.alamatAgunan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Section: Paid Off Loans (Riwayat Fasilitas yang Sudah Lunas) */}
          <h4 className="section-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
            {type === 'Perusahaan' ? 'IV' : 'III'}. RIWAYAT PEMBIAYAAN YANG SUDAH LUNAS
          </h4>

          {paidOffLoans.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0', marginBottom: '2rem' }}>
              Tidak ditemukan riwayat pembiayaan lunas dalam database.
            </p>
          ) : (
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1', marginBottom: '2.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', width: '5%', textAlign: 'center' }}>No</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '30%' }}>Nama Bank/LJK</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right', width: '18%' }}>Plafond</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '12%' }}>Tenor</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center', width: '15%' }}>Tanggal Lunas</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'left', width: '20%' }}>Kondisi Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {paidOffLoans.map((loan, idx) => (
                  <tr key={loan.id_lunas || idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontWeight: 600 }}>{loan.nm_bank}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'right' }}>{formatRupiah(loan.platfond)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>{loan.jkw} bln</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      {formatDateString(loan.tgl_jt)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      {loan.kondisi_ket || 'Lunas / Selesai'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Signatures and Approval Block */}
          <div className="signature-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center', fontSize: '0.85rem', marginTop: '3rem', pageBreakInside: 'avoid' }}>
            <div>
              <p>Petugas Analis / AO</p>
              <div style={{ height: '70px' }}></div>
              <p style={{ fontWeight: 700, textDecoration: 'underline' }}>{header.petugas || 'ACCOUNT OFFICER'}</p>
              <p style={{ fontSize: '0.75rem', color: '#475569' }}>PT. BPRS HIK MCI</p>
            </div>
            <div>
              <p>Diperiksa Oleh,</p>
              <div style={{ height: '70px' }}></div>
              <p style={{ fontWeight: 700, textDecoration: 'underline' }}>KADIV PEMBIAYAAN</p>
              <p style={{ fontSize: '0.75rem', color: '#475569' }}>PT. BPRS HIK MCI</p>
            </div>
            <div>
              <p>Diketahui Oleh,</p>
              <div style={{ height: '70px' }}></div>
              <p style={{ fontWeight: 700, textDecoration: 'underline' }}>LEGAL OFFICER</p>
              <p style={{ fontSize: '0.75rem', color: '#475569' }}>PT. BPRS HIK MCI</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
