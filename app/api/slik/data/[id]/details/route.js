import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params; // idPermintaan / SLIK ID

    // 1. Fetch SLIK header
    const headerSql = `SELECT * FROM tbl_data WHERE id = ?`;
    const headers = await query(headerSql, [id]);

    if (headers.length === 0) {
      return NextResponse.json({ success: false, message: 'Data SLIK tidak ditemukan' }, { status: 404 });
    }

    const slikHeader = headers[0];
    const type = slikHeader.jns_bi;

    let activeLoans = [];
    let collaterals = [];
    let paidOffLoans = [];
    let owners = [];

    if (type === 'Individual') {
      // Fetch individual active loans
      activeLoans = await query(`SELECT * FROM tbl_bi_orang WHERE id = ? ORDER BY kol ASC`, [id]);
      
      // Fetch individual collaterals
      collaterals = await query(`SELECT * FROM tbl_agunan WHERE id = ?`, [id]);
      
      // Fetch individual paid off loans
      paidOffLoans = await query(`SELECT * FROM tbl_lunas WHERE id = ?`, [id]);
    } else if (type === 'Perusahaan') {
      // Fetch company active loans
      activeLoans = await query(`SELECT * FROM tbl_bi_pt WHERE id = ? ORDER BY kol ASC`, [id]);
      
      // Fetch company collaterals
      collaterals = await query(`SELECT * FROM tbl_agunan_pt WHERE id = ?`, [id]);
      
      // Fetch company paid off loans
      paidOffLoans = await query(`SELECT * FROM tbl_lunas WHERE id = ?`, [id]);
      
      // Fetch company owners/shareholders
      owners = await query(`SELECT * FROM tbl_pemilik WHERE id = ?`, [id]);
    }

    return NextResponse.json({
      success: true,
      header: slikHeader,
      activeLoans,
      collaterals,
      paidOffLoans,
      owners
    });

  } catch (error) {
    console.error('Error fetching SLIK details:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
