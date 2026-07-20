'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function Home() {
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard states
  const [debiturs, setDebiturs] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [hasSlik, setHasSlik] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({}); // { [fileName]: 'pending' | 'uploading' | 'success' | 'error' }
  const [uploadErrors, setUploadErrors] = useState({}); // { [fileName]: string }
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Detail Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDebitur, setDetailDebitur] = useState(null);
  const [detailSlik, setDetailSlik] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Genie Animation states
  const [genieStyle, setGenieStyle] = useState({});
  const [isClosingUpload, setIsClosingUpload] = useState(false);
  const [isClosingDetail, setIsClosingDetail] = useState(false);
  const genieAnimRef = useRef(null);
  const genieFilterRef = useRef(null);

  // Animate SVG feDisplacementMap scale for organic warp
  const animateGenieFilter = useCallback((opening) => {
    if (genieAnimRef.current) cancelAnimationFrame(genieAnimRef.current);
    const duration = opening ? 500 : 420;
    const startScale = opening ? 110 : 0;
    const endScale = opening ? 0 : 110;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutQuint for opening, easeInCubic for closing
      const eased = opening
        ? 1 - Math.pow(1 - t, 5)
        : t * t * t;
      const scale = startScale + (endScale - startScale) * eased;
      const dm = document.getElementById('genie-displacement-map');
      if (dm) dm.setAttribute('scale', String(Math.round(scale)));
      if (t < 1) genieAnimRef.current = requestAnimationFrame(tick);
    };
    genieAnimRef.current = requestAnimationFrame(tick);
  }, []);

  // Check auth on mount
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    checkAuth();

    // Theme Mutation Observer to sync with documentElement
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const handleThemeChange = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchData('', 1, { sortBy: 'date_desc', filterYear: '', filterMonth: '', hasSlik: '' }, true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        window.location.reload();
      } else {
        setLoginError(data.message || 'Login gagal.');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan jaringan.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function fetchData(searchVal = search, pageVal = 1, filters = { sortBy, filterYear, filterMonth, hasSlik }, force = false) {
    if (!isAuthenticated && !force) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchVal) params.append('search', searchVal);
      params.append('page', pageVal.toString());
      params.append('limit', limit.toString());
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.filterYear) params.append('year', filters.filterYear);
      if (filters.filterMonth) params.append('month', filters.filterMonth);
      if (filters.hasSlik) params.append('has_slik', filters.hasSlik);

      const res = await fetch(`/api/debiturs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDebiturs(data.debiturs || []);
        setTotalPages(data.pages || 1);
        setTotalItems(data.total || 0);
        setPage(data.currentPage || 1);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchData(val, 1, { sortBy, filterYear, filterMonth, hasSlik });
  };

  const handleFilterChange = (type, val) => {
    let newFilters = { sortBy, filterYear, filterMonth, hasSlik };
    if (type === 'sort') {
      setSortBy(val);
      newFilters.sortBy = val;
    } else if (type === 'year') {
      setFilterYear(val);
      newFilters.filterYear = val;
    } else if (type === 'month') {
      setFilterMonth(val);
      newFilters.filterMonth = val;
    } else if (type === 'slik') {
      setHasSlik(val);
      newFilters.hasSlik = val;
    }
    fetchData(search, 1, newFilters);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchData(search, newPage, { sortBy, filterYear, filterMonth, hasSlik });
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data nasabah ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/debiturs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData(search);
      } else {
        alert(data.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi server.');
    }
  };

  const calculateGenieStyle = (rect) => {
    if (!rect || typeof window === 'undefined') return {};
    const vw = window.innerWidth;

    // Posisi X tengah tombol sebagai % dari lebar viewport
    const triggerCenterX = rect.left + rect.width / 2;
    const oxPercent = Math.round((triggerCenterX / vw) * 100);
    const clamped = Math.min(95, Math.max(5, oxPercent));

    // Offset translate: seberapa jauh tombol dari tengah viewport (dalam %)
    // Positif = tombol di kanan tengah, Negatif = tombol di kiri tengah
    const offsetFromCenter = ((triggerCenterX - vw / 2) / (vw / 2)) * 100;
    const txPercent = Math.round(offsetFromCenter * 0.6); // 60% dari jarak agar tidak keluar layar

    // Sudut skew: arahkan condong ke posisi tombol
    const skewDeg = Math.round((clamped - 50) / 50 * 12); // max ±12deg

    return {
      '--genie-ox': `${clamped}%`,
      '--genie-tx': `${txPercent}%`,
      '--genie-skew': `${Math.abs(skewDeg)}deg`,
    };
  };

  const closeUploadModal = () => {
    setIsClosingUpload(true);
    animateGenieFilter(false);
    setTimeout(() => {
      setShowUploadModal(false);
      setIsClosingUpload(false);
      setSelectedFiles([]);
      setUploadStatus({});
      setUploadErrors({});
      setGlobalError('');
      setGlobalSuccess('');
    }, 430);
  };

  const closeDetailModal = () => {
    setIsClosingDetail(true);
    animateGenieFilter(false);
    setTimeout(() => {
      setShowDetailModal(false);
      setIsClosingDetail(false);
    }, 430);
  };

  const triggerUploadModal = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGenieStyle(calculateGenieStyle(rect));
    setShowUploadModal(true);
    animateGenieFilter(true);
  };

  const triggerDetailModal = (e, id) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGenieStyle(calculateGenieStyle(rect));
    handleOpenDetail(id);
    animateGenieFilter(true);
  };

  const handleOpenDetail = async (id) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    setDetailDebitur(null);
    setDetailSlik([]);
    try {
      const res = await fetch(`/api/debiturs/${id}`);
      const data = await res.json();
      if (data.success) {
        setDetailDebitur(data.debitur);
        setDetailSlik(data.slikRecords || []);
      } else {
        alert(data.message || 'Gagal mengambil detail nasabah.');
        closeDetailModal();
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan saat mengambil detail.');
      closeDetailModal();
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatNoRegistrasi = (id, dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][date.getMonth()];
    const idStr = String(id).padStart(5, '0');
    return `${idStr}/MI/PBY/${monthRoman}/${year}`;
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDateSlash = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const parseDateSmart = (dateStr) => {
    if (!dateStr) return null;
    let str = dateStr.trim().replace(/\s+/g, ' ');
    if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
      return null;
    }

    str = str.replace(/[.\/–—]/g, '-').replace(/\s*-\s*/g, '-');

    // Case 1: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    }

    // Case 2: DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
      const parts = str.split('-');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Case 3: YYYY-M-D
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
      const parts = str.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Case 4: DD-MonthName-YYYY (jan, feb, mar, apr, mei/may, jun, jul, ags/aug, sep, okt/oct, nov, des/dec)
    const monthMap = {
      jan: 0, januari: 0, january: 0,
      feb: 1, februari: 1, february: 1,
      mar: 2, maret: 2, march: 2,
      apr: 3, april: 3,
      mei: 4, may: 4,
      jun: 5, juni: 5, june: 5,
      jul: 6, juli: 6, july: 6,
      ags: 7, agustus: 7, aug: 7, august: 7,
      sep: 8, september: 8,
      okt: 9, oktober: 9, oct: 9, october: 9,
      nov: 10, november: 10,
      des: 11, desember: 11, dec: 11, december: 11
    };

    const textMatch = str.match(/^(\d{1,2})-([a-zA-Z]+)-(\d{4})$/);
    if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      const monthName = textMatch[2].toLowerCase();
      const year = parseInt(textMatch[3], 10);
      if (monthMap[monthName] !== undefined) {
        const d = new Date(year, monthMap[monthName], day);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }

    return null;
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseDateToUpload = (rawVal) => {
    if (!rawVal || rawVal === '-') return '-';
    const parsedDate = parseDateSmart(rawVal);
    return parsedDate ? formatDateToYYYYMMDD(parsedDate) : rawVal;
  };

  // Upload file parsing & handlers
  const parseINI = (text) => {
    const result = {};
    let currentSection = null;
    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) {
        continue;
      }
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.substring(1, line.length - 1).toUpperCase();
        result[currentSection] = result[currentSection] || {};
        continue;
      }
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        if (currentSection) {
          result[currentSection][key] = value;
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFileSelection = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(files);
    setGlobalError('');
    setGlobalSuccess('');
    setUploadErrors({});

    const initialStatus = {};
    files.forEach(f => {
      initialStatus[f.name] = 'pending';
    });
    setUploadStatus(initialStatus);

    const parsedFilesData = [];
    for (const file of files) {
      try {
        const content = await readFileContent(file);
        const parsed = parseINI(content);
        const nik = parsed.NASABAH?.nik || '';
        const nopen = parsed.NASABAH?.nopen || '';
        parsedFilesData.push({ fileName: file.name, nik, nopen });
      } catch (err) {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        setUploadErrors(prev => ({ ...prev, [file.name]: 'Gagal membaca isi berkas.' }));
      }
    }

    const niks = parsedFilesData.map(d => d.nik).filter(x => x.trim().length > 0);
    const nopens = parsedFilesData.map(d => d.nopen).filter(x => x.trim().length > 0);

    if (niks.length > 0 || nopens.length > 0) {
      try {
        const res = await fetch(`/api/debiturs?check_niks=${encodeURIComponent(niks.join(','))}&check_nopens=${encodeURIComponent(nopens.join(','))}`);
        const data = await res.json();
        if (data.success && data.duplicates && data.duplicates.length > 0) {
          const dups = data.duplicates;
          parsedFilesData.forEach(item => {
            const foundDup = dups.find(d => (d.nik && d.nik === item.nik) || (d.nopen && d.nopen === item.nopen));
            if (foundDup) {
              setUploadStatus(prev => ({ ...prev, [item.fileName]: 'error' }));
              setUploadErrors(prev => ({
                ...prev,
                [item.fileName]: `Data ganda! Nasabah '${foundDup.nama}' dengan NIK/Nopen tersebut sudah terdaftar di database BPRS.`
              }));
            }
          });
        }
      } catch (err) {
        console.error('Error pre-validating files:', err);
      }
    }
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      setGlobalError('Silakan pilih minimal satu berkas TXT.');
      return;
    }

    setIsUploading(true);
    setGlobalError('');
    setGlobalSuccess('');
    setUploadErrors({});

    let successCount = 0;
    let failCount = 0;

    for (let file of selectedFiles) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      try {
        const content = await readFileContent(file);
        const parsed = parseINI(content);
        if (!parsed || Object.keys(parsed).length === 0) {
          throw new Error('Format berkas tidak valid atau kosong.');
        }

        const dataPayload = {
          // Nasabah
          nama: parsed.NASABAH?.nama || '',
          nik: parsed.NASABAH?.nik || '',
          nopen: parsed.NASABAH?.nopen || '',
          tanggal_lahir: parseDateToUpload(parsed.NASABAH?.tanggal_lahir),
          status_perkawinan: parsed.NASABAH?.status_perkawinan || '',
          alamat: parsed.NASABAH?.alamat || '',
          no_hp: parsed.NASABAH?.no_hp || '',
          gaji_pensiun: parsed.NASABAH?.gaji_pensiun || '0',
          jenis_kelamin: parsed.NASABAH?.jenis_kelamin || '',
          nama_pasangan: parsed.NASABAH?.nama_pasangan || '',
          nik_pasangan: parsed.NASABAH?.nik_pasangan || '',
          tanggal_lahir_pasangan: parseDateToUpload(parsed.NASABAH?.tanggal_lahir_pasangan),
          jumlah_tanggungan: parsed.NASABAH?.jumlah_tanggungan || '0',
          perjanjian_pisah_harta: parsed.NASABAH?.perjanjian_pisah_harta || '',
          sumber_penghasilan: parsed.NASABAH?.sumber_penghasilan || '',

          // Pensiun
          nama_pensiun: parsed.PENSIUN?.nama_pensiun || '',
          no_sk_pensiun: parsed.PENSIUN?.no_sk_pensiun || '',
          tanggal_sk_pensiun: parseDateToUpload(parsed.PENSIUN?.tanggal_sk_pensiun),
          pensiunan_dari: parsed.PENSIUN?.pensiunan_dari || '',
          kantor_bayar_asal: parsed.PENSIUN?.kantor_bayar_asal || '',
          kantor_bayar_tujuan: parsed.PENSIUN?.kantor_bayar_tujuan || '',
          nama_penerima_pensiun: parsed.PENSIUN?.nama_penerima_pensiun || '',
          status_sk: parsed.PENSIUN?.status_sk || '',
          sk_dikeluarkan_di: parsed.PENSIUN?.sk_dikeluarkan_di || '',

          // Pembiayaan
          plafon_pengajuan: parsed.PEMBIAYAAN?.plafon_pengajuan || '0',
          tenor: parsed.PEMBIAYAAN?.tenor || '0',
          tujuan_penggunaan: parsed.PEMBIAYAAN?.tujuan_penggunaan || '',
          margin_efektif: parsed.PEMBIAYAAN?.margin_efektif || '0',
          biaya_administrasi: parsed.PEMBIAYAAN?.biaya_administrasi || '0',
          biaya_asuransi: parsed.PEMBIAYAAN?.biaya_asuransi || '0',
          biaya_tabungan: parsed.PEMBIAYAAN?.biaya_tabungan || '0',
          biaya_meterai: parsed.PEMBIAYAAN?.biaya_meterai || '0',
          biaya_lain: parsed.PEMBIAYAAN?.biaya_lain || '0',
          nominal_take_over: parsed.PEMBIAYAAN?.nominal_take_over || '0',
          jenis_nasabah: parsed.PEMBIAYAAN?.jenis_nasabah || '',
          status_nasabah: parsed.PEMBIAYAAN?.status_nasabah || '',
          produk_pembiayaan: parsed.PEMBIAYAAN?.produk_pembiayaan || '',
          mitra_vendor: parsed.PEMBIAYAAN?.mitra_vendor || '',
          pks_no: parsed.PEMBIAYAAN?.pks_no || '',
          jenis_pembiayaan: parsed.PEMBIAYAAN?.jenis_pembiayaan || '',
          jenis_akad: parsed.PEMBIAYAAN?.jenis_akad || '',
          jenis_pengikatan: parsed.PEMBIAYAAN?.jenis_pengikatan || '',
          no_cif: parsed.PEMBIAYAAN?.no_cif || '',
          no_rek_pembiayaan: parsed.PEMBIAYAAN?.no_rek_pembiayaan || '',
          no_rek_simpanan: parsed.PEMBIAYAAN?.no_rek_simpanan || '',
          status_pembiayaan: parsed.PEMBIAYAAN?.status_pembiayaan || '',
          asuransi: parsed.PEMBIAYAAN?.asuransi || '',
          jenis_pembayaran: parsed.PEMBIAYAAN?.jenis_pembayaran || '',
          skema_pembayaran: parsed.PEMBIAYAAN?.skema_pembayaran || '',
          jenis_penggunaan: parsed.PEMBIAYAAN?.jenis_penggunaan || '',

          // Approval
          ao_nama: parsed.APPROVAL?.ao_nama || '',
          kadiv_nama: parsed.APPROVAL?.kadiv_nama || '',
          catatan_approval: parsed.APPROVAL?.catatan_approval || '',
          keputusan_approval: parsed.APPROVAL?.keputusan_approval || '',
          catatan_analisa: parsed.APPROVAL?.catatan_analisa || ''
        };

        const fd = new FormData();
        Object.keys(dataPayload).forEach(key => {
          fd.append(key, dataPayload[key]);
        });

        const res = await fetch('/api/debiturs', {
          method: 'POST',
          body: fd
        });

        const resData = await res.json();
        if (resData.success) {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
          successCount++;
        } else {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
          setUploadErrors(prev => ({ ...prev, [file.name]: resData.message || 'Gagal menyimpan ke database.' }));
          failCount++;
        }

      } catch (err) {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        setUploadErrors(prev => ({ ...prev, [file.name]: err.message || 'Gagal memproses berkas.' }));
        failCount++;
      }
    }

    setIsUploading(false);
    if (failCount === 0) {
      setGlobalSuccess(`Berhasil mengunggah ${successCount} berkas TXT.`);
      fetchData(search); // Refresh dashboard list instantly!
      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFiles([]);
        setUploadStatus({});
        setUploadErrors({});
        setGlobalSuccess('');
      }, 1500);
    } else {
      setGlobalError(`Selesai dengan kesalahan. ${successCount} berhasil, ${failCount} gagal.`);
      fetchData(search); // Refresh partial success list anyway
    }
  };

  // Calculate PMT Nett
  const calculatePMT = (plafon, tenor, margin) => {
    const rate = (margin / 100) / 12;
    if (rate <= 0) return Math.round(plafon / tenor);
    const pmt = (plafon * rate) / (1 - Math.pow(1 + rate, -tenor));
    return Math.round(pmt);
  };

  // Calculate DSR/IIR
  const calculateIIR = (plafon, tenor, margin, slikRows, gaji) => {
    const bprsPmt = calculatePMT(plafon, tenor, margin);
    let slikTotalPmt = 0;
    slikRows.forEach(row => {
      const status_lower = (row.kondisi_ket || '').toLowerCase();
      if (!status_lower.includes('lunas') && !status_lower.includes('dialihkan')) {
        slikTotalPmt += parseFloat(row.angsuran || 0);
      }
    });
    if (!gaji || gaji <= 0) return 0;
    return Math.round(((bprsPmt + slikTotalPmt) / gaji) * 100);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memeriksa sesi masuk...</div>
      </div>
    );
  }

  // RENDER LOGIN SCREEN if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>


        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <img 
                  src="/logo_mci.png" 
                  alt="Logo BPRS HIK MCI" 
                  style={{ height: '65px', width: 'auto', objectFit: 'contain' }} 
                />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Masuk ke Sistem</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Gunakan NIK SSO Anda untuk mengkases Dashboard Generator MAP.</p>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                padding: '0.75rem',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">NIK (Username)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Masukkan NIK Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loginLoading}>
                {loginLoading ? 'Memverifikasi...' : 'Masuk via SSO'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ position: 'relative' }}>


        {/* Main Content */}
        <main className="container" style={{ flex: 1, padding: '2rem 1.5rem' }}>

        {/* Top Header Section */}
        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Daftar Pengajuan Pensiunan</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upload file TXT pengajuan untuk menghasilkan dokumen MAP Word (.docx) secara instan.</p>
          </div>
          <button onClick={triggerUploadModal} className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', border: 'none' }}>
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem', lineHeight: 1 }}>+</span> Upload TXT
          </button>
        </div>

        {/* List Card */}
        <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
          
          {/* Search & Filter Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {/* Search Input Row */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Cari berdasarkan nama nasabah, NIK, atau nomor nopen..."
                value={search}
                onChange={handleSearchChange}
                style={{ width: '100%', paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}
              />
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>⚡ Filter &amp; Urutan:</span>
              
              {/* Sort By Select */}
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 2rem 0.5rem 1rem',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="date_desc" style={{ background: 'var(--bg-primary)' }}>Pengajuan Terbaru</option>
                  <option value="date_asc" style={{ background: 'var(--bg-primary)' }}>Pengajuan Terlama</option>
                  <option value="plafond_desc" style={{ background: 'var(--bg-primary)' }}>Plafon Terbesar</option>
                  <option value="plafond_asc" style={{ background: 'var(--bg-primary)' }}>Plafon Terkecil</option>
                </select>
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
              </div>

              {/* Year Select */}
              <div style={{ position: 'relative' }}>
                <select
                  value={filterYear}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 2rem 0.5rem 1rem',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-primary)' }}>Semua Tahun</option>
                  <option value="2026" style={{ background: 'var(--bg-primary)' }}>Tahun 2026</option>
                  <option value="2025" style={{ background: 'var(--bg-primary)' }}>Tahun 2025</option>
                  <option value="2024" style={{ background: 'var(--bg-primary)' }}>Tahun 2024</option>
                </select>
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
              </div>

              {/* Month Select */}
              <div style={{ position: 'relative' }}>
                <select
                  value={filterMonth}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 2rem 0.5rem 1rem',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-primary)' }}>Semua Bulan</option>
                  <option value="1" style={{ background: 'var(--bg-primary)' }}>Januari</option>
                  <option value="2" style={{ background: 'var(--bg-primary)' }}>Februari</option>
                  <option value="3" style={{ background: 'var(--bg-primary)' }}>Maret</option>
                  <option value="4" style={{ background: 'var(--bg-primary)' }}>April</option>
                  <option value="5" style={{ background: 'var(--bg-primary)' }}>Mei</option>
                  <option value="6" style={{ background: 'var(--bg-primary)' }}>Juni</option>
                  <option value="7" style={{ background: 'var(--bg-primary)' }}>Juli</option>
                  <option value="8" style={{ background: 'var(--bg-primary)' }}>Agustus</option>
                  <option value="9" style={{ background: 'var(--bg-primary)' }}>September</option>
                  <option value="10" style={{ background: 'var(--bg-primary)' }}>Oktober</option>
                  <option value="11" style={{ background: 'var(--bg-primary)' }}>November</option>
                  <option value="12" style={{ background: 'var(--bg-primary)' }}>Desember</option>
                </select>
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
              </div>

              {/* SLIK Status Select */}
              <div style={{ position: 'relative' }}>
                <select
                  value={hasSlik}
                  onChange={(e) => handleFilterChange('slik', e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 2rem 0.5rem 1rem',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-primary)' }}>Semua Status SLIK</option>
                  <option value="yes" style={{ background: 'var(--bg-primary)' }}>Ada SLIK OJK</option>
                  <option value="no" style={{ background: 'var(--bg-primary)' }}>Belum Ada SLIK OJK</option>
                </select>
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
              </div>

              {/* Reset Button */}
              {(sortBy !== 'date_desc' || filterYear || filterMonth || hasSlik || search) && (
                <button
                  onClick={() => {
                    setSortBy('date_desc');
                    setFilterYear('');
                    setFilterMonth('');
                    setHasSlik('');
                    setSearch('');
                    fetchData('', 1, { sortBy: 'date_desc', filterYear: '', filterMonth: '', hasSlik: '' });
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  ✕ Reset Filter
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data pengajuan...</div>
          ) : debiturs.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>Belum ada data pengajuan yang cocok</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Cobalah mencari kata kunci lain atau bersihkan filter di atas.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>No Registrasi</th>
                      <th>NIK</th>
                      <th>Nama Nasabah</th>
                      <th>OS Pembiayaan</th>
                      <th>Tgl Pengajuan</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debiturs.map(deb => (
                      <tr key={deb.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                          {formatNoRegistrasi(deb.id, deb.submitted_at)}
                        </td>
                        <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{deb.nik}</td>
                        <td style={{ fontWeight: 600 }}>{deb.nama}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatRupiah(deb.plafon_pengajuan)}</td>
                        <td>{formatDateSlash(deb.submitted_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!deb.has_slik ? (
                              <>
                                <span style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                  ⚠️ SLIK Belum Ada
                                </span>
                                <button disabled className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }} title="SLIK Belum Ada">
                                  Download MAP
                                </button>
                              </>
                            ) : (
                              <a href={`/api/debiturs/${deb.id}/download-map`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', boxShadow: 'none' }}>
                                Download MAP
                              </a>
                            )}
                            <button onClick={(e) => triggerDetailModal(e, deb.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                              Detail
                            </button>
                            <button onClick={() => handleDelete(deb.id, deb.nama)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', boxShadow: 'none' }}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                borderTop: '1px solid var(--border-glass)',
                paddingTop: '1.25rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Menampilkan <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.min((page - 1) * limit + 1, totalItems)}</span> - <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.min(page * limit, totalItems)}</span> dari <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{totalItems}</span> nasabah
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
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '0.65rem 1rem',
        marginTop: 'auto',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(255, 255, 255, 0.01)',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.03em'
      }}>
        Copyright &copy; {new Date().getFullYear()} &bull; Developed by <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>IT, MIS, &amp; Product Development BPRS HIK MCI</span>
      </footer>

      {/* SVG Genie Warp Filter — dianimasikan via JS requestAnimationFrame */}
      <svg style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', top: 0, left: 0 }} aria-hidden="true">
        <defs>
          <filter id="genie-warp" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="linearRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.06"
              numOctaves="4"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              id="genie-displacement-map"
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Upload Modal Overlay */}
      {(showUploadModal || isClosingUpload) && (
        <div 
          className={isClosingUpload ? 'genie-overlay-close' : 'genie-overlay-open'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div 
            className={`glass-card ${isClosingUpload ? 'genie-modal-close' : 'genie-modal-open'}`}
            style={{
              maxWidth: '650px',
              width: '100%',
              padding: '2.5rem 2rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              filter: 'url(#genie-warp)',
              ...genieStyle
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>Upload File TXT Pengajuan</h2>
              <button 
                onClick={() => {
                  if (!isUploading) {
                    closeUploadModal();
                  }
                }} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.75rem',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: isUploading ? 0.4 : 0.8,
                  lineHeight: 1
                }}
                disabled={isUploading}
              >
                &times;
              </button>
            </div>

            {/* Error & Success Bars */}
            {globalError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'left' }}>{globalError}</div>}
            {globalSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'left' }}>{globalSuccess}</div>}

            {/* Upload Area */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '2.5rem 1.5rem', background: 'rgba(255,255,255,0.01)', textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</span>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Pilih Berkas TXT Nasabah</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Mendukung pemilihan banyak berkas sekaligus (.txt)</p>
              
              <input 
                type="file" 
                accept=".txt" 
                multiple 
                onChange={handleFileSelection} 
                style={{ display: 'none' }}
                id="modal-file-input"
                disabled={isUploading}
              />
              <label htmlFor="modal-file-input" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                Pilih Berkas...
              </label>
            </div>

            {/* File List Queue */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', textAlign: 'left' }}>Daftar Antrean Berkas ({selectedFiles.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', maxWidth: '70%' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{file.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(2)} KB</span>
                        {uploadErrors[file.name] && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.2rem', fontWeight: 500 }}>
                            ⚠️ {uploadErrors[file.name]}
                          </span>
                        )}
                      </div>
                      <div>
                        {uploadStatus[file.name] === 'pending' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Menunggu...</span>}
                        {uploadStatus[file.name] === 'uploading' && <span style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 700 }}>Mengunggah...</span>}
                        {uploadStatus[file.name] === 'success' && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✓ Sukses</span>}
                        {uploadStatus[file.name] === 'error' && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>✗ Gagal</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
              <button 
                onClick={closeUploadModal} 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                disabled={isUploading}
              >
                Batal
              </button>
              <button 
                onClick={handleUploadAll} 
                className="btn btn-primary" 
                disabled={isUploading || selectedFiles.length === 0 || Object.values(uploadStatus).includes('error')}
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
              >
                {isUploading ? 'Mengunggah...' : 'Unggah & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Preview Modal Overlay */}
      {(showDetailModal || isClosingDetail) && (
        <div 
          className={isClosingDetail ? 'genie-overlay-close' : 'genie-overlay-open'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div 
            className={`glass-card ${isClosingDetail ? 'genie-modal-close' : 'genie-modal-open'}`}
            style={{
              maxWidth: '900px',
              width: '100%',
              padding: '2.5rem 2rem',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
              textAlign: 'left',
              filter: 'url(#genie-warp)',
              ...genieStyle
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>Detail &amp; Preview Nasabah</h2>
                {detailDebitur && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No Registrasi: {formatNoRegistrasi(detailDebitur.id, detailDebitur.submitted_at)}
                  </p>
                )}
              </div>
              <button 
                onClick={closeDetailModal} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.75rem',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat rincian data...</div>
            ) : !detailDebitur ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Gagal memuat rincian data.</div>
            ) : (
              <div>
                {/* 2-Column Grid Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                  
                  {/* Column 1: Data Nasabah & SK */}
                  <div>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                      I. Informasi Data Nasabah
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <tbody>
                        {[
                          ['Nama Nasabah', detailDebitur.nama.toUpperCase()],
                          ['NIK Nasabah', detailDebitur.nik],
                          ['Nopen (No Pensiun)', detailDebitur.nopen],
                          ['Tanggal Lahir', formatDateSlash(detailDebitur.tanggal_lahir)],
                          ['Status Perkawinan', detailDebitur.status_perkawinan.toUpperCase()],
                          ['Nomor Handphone', detailDebitur.no_hp],
                          ['Alamat KTP', detailDebitur.alamat.toUpperCase()],
                          ['Gaji Pensiun Bersih', formatRupiah(detailDebitur.gaji_pensiun)],
                          ['Nama di SK Pensiun', detailDebitur.nama_pensiun.toUpperCase()],
                          ['Nomor SK Pensiun', detailDebitur.no_sk_pensiun],
                          ['Tanggal SK Pensiun', formatDateSlash(detailDebitur.tanggal_sk_pensiun)],
                          ['Pensiunan Dari', detailDebitur.pensiunan_dari.toUpperCase()],
                          ['Kantor Bayar Asal', detailDebitur.kantor_bayar_asal.toUpperCase()],
                          ['Kantor Bayar Tujuan', detailDebitur.kantor_bayar_tujuan.toUpperCase()]
                        ].map(([lbl, val], idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.4rem 0', fontWeight: 600, color: 'var(--text-secondary)', width: '40%' }}>{lbl}</td>
                            <td style={{ padding: '0.4rem 0', color: 'var(--text-primary)' }}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Column 2: Permohonan & Analisa Perhitungan */}
                  <div>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                      II. Permohonan &amp; Analisa Perhitungan
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      <tbody>
                        {[
                          ['Plafon Pengajuan', formatRupiah(detailDebitur.plafon_pengajuan)],
                          ['Jangka Waktu (Tenor)', `${detailDebitur.tenor} Bulan`],
                          ['Margin Bunga Efektif', `${detailDebitur.margin_efektif}% p.a.`],
                          ['Angsuran BPRS (PMT)', formatRupiah(calculatePMT(detailDebitur.plafon_pengajuan, detailDebitur.tenor, detailDebitur.margin_efektif))],
                          ['Tujuan Penggunaan', detailDebitur.tujuan_penggunaan],
                          ['Nominal Take Over', formatRupiah(detailDebitur.nominal_take_over)],
                          ['Biaya Administrasi', formatRupiah(detailDebitur.biaya_administrasi)],
                          ['Biaya Asuransi Jiwa', formatRupiah(detailDebitur.biaya_asuransi)],
                          ['Biaya Tabungan Awal', formatRupiah(detailDebitur.biaya_tabungan)],
                          ['Biaya Meterai', formatRupiah(detailDebitur.biaya_meterai)],
                          ['Biaya Lain-lain', formatRupiah(detailDebitur.biaya_lain)]
                        ].map(([lbl, val], idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.4rem 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{lbl}</td>
                            <td style={{ padding: '0.4rem 0', color: 'var(--text-primary)', fontWeight: lbl.includes('Angsuran') ? 700 : 'normal' }}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                      III. Rasio IIR (Installment to Income Ratio)
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                      <span style={{ fontSize: '2rem' }}>📊</span>
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                          {calculateIIR(detailDebitur.plafon_pengajuan, detailDebitur.tenor, detailDebitur.margin_efektif, detailSlik, detailDebitur.gaji_pensiun)}% <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>dari Maks 95%</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Rasio seluruh angsuran aktif terhadap pendapatan pensiun bersih.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SLIK Table Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                    IV. Rincian Informasi SLIK OJK (db_wablast)
                  </h3>
                  {detailSlik.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                      ⚠️ TIDAK ADA DATA SLIK ATAU SLIK BELUM TERSEDIA
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nama Bank</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Baki Debet</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Angsuran</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Kolektibilitas</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailSlik.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: (row.kondisi_ket || '').toLowerCase().includes('lunas') ? 'transparent' : 'rgba(239, 68, 68, 0.02)' }}>
                              <td style={{ padding: '0.75rem 1rem' }}>{idx + 1}.</td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.nm_bank ? row.nm_bank.toUpperCase() : '-'}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(row.bakidebet || 0)}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatRupiah(row.angsuran || 0)}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  background: (row.kol === 'Lancar' || row.kol === '1') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: (row.kol === 'Lancar' || row.kol === '1') ? 'var(--success)' : 'var(--danger)',
                                  fontSize: '0.7rem'
                                }}>
                                  {row.kol || 'Lancar'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>
                                <span style={{
                                  fontWeight: 600,
                                  color: (row.kondisi_ket || '').toLowerCase().includes('lunas') ? 'var(--success)' : 'var(--info)'
                                }}>
                                  {row.kondisi_ket ? row.kondisi_ket.toUpperCase() : 'AKTIF'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* V. Approval Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                    V. Informasi Persetujuan Komite
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Diusulkan Oleh (AO)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{detailDebitur.ao_nama ? detailDebitur.ao_nama.toUpperCase() : '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Kepala Divisi Bisnis</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{detailDebitur.kadiv_nama ? detailDebitur.kadiv_nama.toUpperCase() : '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Keputusan Komite</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: (detailDebitur.keputusan_approval || '').toLowerCase().includes('tidak') ? 'var(--danger)' : 'var(--success)' }}>
                        {detailDebitur.keputusan_approval ? detailDebitur.keputusan_approval.toUpperCase() : '-'}
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Catatan Approval</div>
                      <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                        {detailDebitur.catatan_approval ? `"${detailDebitur.catatan_approval}"` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Modal Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
                  <button 
                    onClick={closeDetailModal} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                  >
                    Tutup
                  </button>
                  {detailSlik.length === 0 ? (
                    <button disabled className="btn btn-secondary" style={{ padding: '0.5rem 2rem', fontSize: '0.85rem', opacity: 0.5, cursor: 'not-allowed' }} title="SLIK Belum Ada">
                      ⚠️ MAP Belum Bisa Diunduh
                    </button>
                  ) : (
                    <a 
                      href={`/api/debiturs/${detailDebitur.id}/download-map`} 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 2rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <span>📥</span> Download MAP (.docx)
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
