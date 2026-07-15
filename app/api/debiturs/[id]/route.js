import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { queryWablast } from '../../../../lib/db_wablast';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// Helper to check authentication
async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');
    if (!sessionCookie) return null;
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('ascii'));
  } catch (e) {
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch Debitur
    const debiturs = await query('SELECT * FROM debiturs WHERE id = ?', [id]);
    if (debiturs.length === 0) {
      return NextResponse.json({ success: false, message: 'Debitur tidak ditemukan' }, { status: 404 });
    }

    const debitur = debiturs[0];
    
    // Parse rab_items
    if (debitur.rab_items) {
      try {
        debitur.rab_items = JSON.parse(debitur.rab_items);
      } catch (e) {
        debitur.rab_items = [];
      }
    } else {
      debitur.rab_items = [];
    }

    // Fetch SLIK records from db_wablast using NIK
    let slikRecords = [];
    try {
      const dataRows = await queryWablast('SELECT id FROM tbl_data WHERE NIK = ? LIMIT 1', [debitur.nik]);
      if (dataRows.length > 0) {
        const biId = dataRows[0].id;
        slikRecords = await queryWablast(
          'SELECT nm_bank, kol, platfond, bakidebet, angsuran, jkw, kondisi_ket FROM tbl_bi_orang WHERE id = ?',
          [biId]
        );
      }
    } catch (err) {
      console.error('Error fetching SLIK for detail:', err);
    }

    return NextResponse.json({ success: true, debitur, slikRecords });

  } catch (error) {
    console.error('Error fetching debitur detail:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await query('DELETE FROM debiturs WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Data debitur berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting debitur:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
