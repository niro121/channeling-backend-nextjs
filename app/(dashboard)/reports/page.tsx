import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';

const reportsData = [
  {
    id: '1',
    masterData: 'All Doctors List',
    description: 'Comprehensive list of all doctors with their details',
    route: '/reports/doctors'
  },
  {
    id: '2',
    masterData: 'Channel Agent Reference Book',
    description: 'View channel agent reference book information with filters',
    route: '/reports/channel-agent-reference-book'
  },
  {
    id: '3',
    masterData: 'Doctor Arrivals Report',
    description: 'View doctor arrivals information with filters',
    route: '/reports/arrivals'
  },
  {
    id: '4',
    masterData: 'Agent Detail Report',
    description: 'View agent information with filters',
    route: '/reports/agent-detail'
  }
];

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Reports</CardTitle>
            <CardDescription>
              Access various master data reports and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Master Data</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsData.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link
                        href={report.route}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {report.masterData}
                      </Link>
                    </TableCell>
                    <TableCell>{report.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
