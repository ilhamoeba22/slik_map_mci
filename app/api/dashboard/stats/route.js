import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // 1. Overall Totals
    const mapStatsRes = await query(`
      SELECT 
        COUNT(*) as totalMap, 
        COALESCE(SUM(plafon_pengajuan), 0) as totalPlafon 
      FROM debiturs
    `);
    const totalMap = mapStatsRes[0]?.totalMap || 0;
    const totalPlafon = parseFloat(mapStatsRes[0]?.totalPlafon || 0);

    const slikReqRes = await query(`SELECT COUNT(*) as count FROM tb_slik_request`);
    const totalSlikRequests = slikReqRes[0]?.count || 0;

    const slikDataRes = await query(`SELECT COUNT(*) as count FROM tbl_data`);
    const totalSlikData = slikDataRes[0]?.count || 0;

    // 2. Monthly Trend (Last 6 Months)
    const monthlyMapRes = await query(`
      SELECT 
        DATE_FORMAT(submitted_at, '%Y-%m') as month_key,
        DATE_FORMAT(submitted_at, '%b %Y') as month_label,
        COUNT(*) as count,
        COALESCE(SUM(plafon_pengajuan), 0) as total_plafon
      FROM debiturs
      WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month_key, month_label
      ORDER BY month_key ASC
    `);

    const monthlySlikRes = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month_key,
        COUNT(*) as count
      FROM tb_slik_request
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month_key
      ORDER BY month_key ASC
    `);

    // Combine monthly data
    const monthlySlikMap = {};
    monthlySlikRes.forEach(r => {
      monthlySlikMap[r.month_key] = r.count;
    });

    const monthlyTrend = monthlyMapRes.map(r => ({
      monthKey: r.month_key,
      label: r.month_label,
      mapCount: r.count,
      plafon: parseFloat(r.total_plafon),
      slikCount: monthlySlikMap[r.month_key] || 0
    }));

    // 3. Segment Breakdown (based on SLIK requests type_checking / jenis_nasabah)
    let segmentRes = await query(`
      SELECT 
        COALESCE(NULLIF(type_checking, ''), 'Perorangan (Individual)') as segment, 
        COUNT(*) as count 
      FROM tb_slik_request 
      GROUP BY segment 
      ORDER BY count DESC 
      LIMIT 6
    `);

    if (!segmentRes || segmentRes.length === 0) {
      segmentRes = await query(`
        SELECT 
          COALESCE(NULLIF(jenis_nasabah, ''), 'Pensiunan') as segment, 
          COUNT(*) as count 
        FROM debiturs 
        GROUP BY segment 
        ORDER BY count DESC 
        LIMIT 6
      `);
    }

    // 4. Recent Activity
    const recentMap = await query(`
      SELECT id, nama, nik, nopen, plafon_pengajuan, submitted_at 
      FROM debiturs 
      ORDER BY submitted_at DESC 
      LIMIT 5
    `);

    const recentSlik = await query(`
      SELECT id_slik, nama, nik, ao, created_at 
      FROM tb_slik_request 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      summary: {
        totalMap,
        totalPlafon,
        totalSlikRequests,
        totalSlikData
      },
      monthlyTrend,
      segmentBreakdown: segmentRes,
      recentMap,
      recentSlik
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}
