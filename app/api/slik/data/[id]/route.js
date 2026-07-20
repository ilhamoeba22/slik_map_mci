import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function DELETE(request, { params }) {
  let connection;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params; // idPermintaan / SLIK ID

    const db = getDb();
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Fetch the linked debitur nopen (stored in "kode" column of tbl_data)
    const [headerRows] = await connection.query('SELECT kode FROM tbl_data WHERE id = ?', [id]);
    
    if (headerRows.length > 0) {
      const nopen = headerRows[0].kode;
      
      // 2. Reset has_slik status in debiturs table to 0
      await connection.query('UPDATE debiturs SET has_slik = 0 WHERE nopen = ?', [nopen]);
    }

    // 3. Delete from all related SLIK tables
    await connection.query('DELETE FROM tbl_data WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_bi_orang WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_bi_pt WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_agunan WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_agunan_pt WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_lunas WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_pemilik WHERE id = ?', [id]);
    await connection.query('DELETE FROM tbl_in_out WHERE id = ?', [id]);

    // Commit Transaction
    await connection.commit();

    return NextResponse.json({ success: true, message: 'Data hasil SLIK berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting SLIK data:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rErr) {
        console.error('Rollback error:', rErr);
      }
    }
    return NextResponse.json({ success: false, message: `Gagal menghapus data SLIK: ${error.message}` }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
