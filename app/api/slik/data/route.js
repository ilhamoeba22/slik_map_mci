import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query, queryRaw } from '@/lib/db';

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
      whereClauses.push('(nama LIKE ? OR nik LIKE ? OR id LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    // Get count
    const countSql = `SELECT COUNT(*) as total FROM tbl_data${whereStr}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get paginated rows
    const sql = `SELECT * FROM tbl_data${whereStr} ORDER BY created_bi DESC LIMIT ? OFFSET ?`;
    const pageParams = [...params, limit, offset];
    const data = await queryRaw(sql, pageParams);

    return NextResponse.json({
      success: true,
      data,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit
    });
  } catch (error) {
    console.error('Error fetching SLIK data list:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
