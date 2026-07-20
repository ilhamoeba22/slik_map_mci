import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return new Response('Not authenticated', { status: 401 });
    }

    const { id } = await params; // id_slik

    // Fetch requests for this batch
    const sql = `SELECT * FROM tb_slik_request WHERE id_slik = ?`;
    const records = await query(sql, [id]);

    if (records.length === 0) {
      return new Response('Data tidak ditemukan', { status: 404 });
    }

    let content = '';
    for (const r of records) {
      const jenisDebitur = r.type_checking === 'Individual' ? 'I' : 'C';
      
      // First applicant
      content += `${r.id_slik}|${r.tujuan_permintaan}|${jenisDebitur}|${r.nik}\r\n`;
      
      // Second applicant / spouse (if provided)
      if (r.nik_2 && r.nik_2.trim() !== '') {
        content += `${r.id_slik}|${r.tujuan_permintaan}|${jenisDebitur}|${r.nik_2}\r\n`;
      }
    }

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/-|:/g, '');
    const filename = `REQ_SLIK_BATCH_${dateStr}.txt`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error generating TXT batch:', error);
    return new Response('Server error', { status: 500 });
  }
}
