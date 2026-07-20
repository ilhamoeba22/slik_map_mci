import { NextResponse } from 'next/server';
import { query, queryRaw } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import { cookies } from 'next/headers';
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(nama LIKE ? OR nik LIKE ? OR id_slik LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    // Get count
    const countSql = `SELECT COUNT(*) as total FROM tb_slik_request${whereStr}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get paginated rows
    const sql = `SELECT * FROM tb_slik_request${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const pageParams = [...params, limit, offset];
    const requests = await queryRaw(sql, pageParams);

    return NextResponse.json({
      success: true,
      requests,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit
    });
  } catch (error) {
    console.error('Error fetching SLIK requests:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('ascii'));
    const aoName = sessionData.nama;

    const formData = await request.formData();
    
    const id_slik = formData.get('id_slik');
    const tujuan_permintaan = formData.get('tujuan_permintaan');
    const type_checking = formData.get('type_checking') || 'Individual';
    const pembiayaan = formData.get('pembiayaan') || '';
    
    const nik = formData.get('nik');
    const nama = formData.get('nama');
    const ttl = formData.get('ttl');
    const alamat = formData.get('alamat');
    
    const nik_2 = formData.get('nik_2') || '';
    const nama_2 = formData.get('nama_2') || '';
    const ttl_2 = formData.get('ttl_2') || '';
    const alamat_2 = formData.get('alamat_2') || '';

    if (!id_slik || !nik || !tujuan_permintaan || !nama) {
      return NextResponse.json({ success: false, message: 'ID SLIK, NIK, Nama, dan Tujuan Permintaan wajib diisi.' }, { status: 400 });
    }

    // 1. Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'slik');
    await fs.mkdir(uploadDir, { recursive: true });

    // 2. Process KTP files upload
    const uploadedFiles = [];
    const files = formData.getAll('ktp');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && typeof file !== 'string' && file.size > 0) {
        const fileExt = path.extname(file.name) || '.jpg';
        const filename = `ktp_${id_slik.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${i}${fileExt}`;
        const filepath = path.join(uploadDir, filename);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filepath, buffer);
        uploadedFiles.push(filename);
      }
    }
    const file_ktp = uploadedFiles.join(',');

    // 3. Insert into database
    const sql = `
      INSERT INTO tb_slik_request (
        id_slik, pembiayaan, tujuan_permintaan, type_checking,
        nik, nama, ttl, alamat,
        nik_2, nama_2, ttl_2, alamat_2,
        file_ktp, ao, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      id_slik, pembiayaan, tujuan_permintaan, type_checking,
      nik, nama, ttl, alamat,
      nik_2, nama_2, ttl_2, alamat_2,
      file_ktp, aoName
    ];

    await query(sql, params);

    return NextResponse.json({ success: true, message: 'Permintaan SLIK berhasil disimpan.' });
  } catch (error) {
    console.error('Error saving SLIK request:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
