import { NextResponse } from 'next/server';
import { getCurriculumCoverageReport } from '@/lib/content-coverage';

export async function GET() {
  const report = await getCurriculumCoverageReport();
  return NextResponse.json(report);
}
