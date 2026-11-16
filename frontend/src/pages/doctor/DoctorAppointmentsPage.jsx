import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { listDoctorAppointments } from '../../api/doctorPortal.js';
import DoctorAppointmentList from '../../components/DoctorAppointmentList.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import StatusTabs from '../../components/StatusTabs.jsx';
import useFetch from '../../hooks/useFetch.js';
import { statusLabel } from '../../utils/status.js';

export default function DoctorAppointmentsPage() {
  const [filter, setFilter] = useState('PENDING');
  const { data, loading, error, reload } = useFetch(() => listDoctorAppointments(filter === 'ALL' ? undefined : filter), [filter]);

  return (
    <>
      <PageHeader title="Appointments" subtitle="Requests and visits on your slots, earliest first." />
      <div className="mb-5"><StatusTabs value={filter} onChange={setFilter} /></div>
      {error && !data ? <ErrorState error={error} onRetry={reload} /> :
        loading && !data ? <ListSkeleton rows={3} /> :
        (data || []).length === 0 ? (
          <EmptyState icon={ClipboardList} title={filter === 'ALL' ? 'No appointments yet' : `No ${statusLabel(filter).toLowerCase()} appointments`}
            message="Appointments appear here when patients book your slots." />
        ) : (
          <div className={loading ? 'opacity-60' : ''}><DoctorAppointmentList appointments={data} onChanged={reload} /></div>
        )}
    </>
  );
}
