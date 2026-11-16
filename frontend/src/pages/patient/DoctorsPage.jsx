import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Stethoscope } from 'lucide-react';
import { listDoctors, listSpecializations } from '../../api/doctors.js';
import DoctorCard from '../../components/DoctorCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Select } from '../../components/Fields.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import useFetch from '../../hooks/useFetch.js';

const SORTS = {
  name: { label: 'Name (A-Z)', fn: (a, b) => a.fullName.localeCompare(b.fullName) },
  experience: { label: 'Experience (high to low)', fn: (a, b) => b.experienceYears - a.experienceYears },
  fee: { label: 'Fee (low to high)', fn: (a, b) => Number(a.consultationFee) - Number(b.consultationFee) },
};

export default function DoctorsPage() {
  const [params, setParams] = useSearchParams();
  const specializationId = params.get('specializationId') || '';
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  // wait 350 ms after typing stops before asking the backend
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const specs = useFetch(() => listSpecializations(), []);
  const doctors = useFetch(() => listDoctors({ specializationId, search }), [specializationId, search]);

  function setSpec(value) {
    const next = new URLSearchParams(params);
    if (value) next.set('specializationId', value); else next.delete('specializationId');
    setParams(next, { replace: true });
  }

  const list = [...(doctors.data || [])].sort(SORTS[sort].fn);
  const filtered = Boolean(specializationId || search);

  return (
    <>
      <PageHeader title="Find a doctor" subtitle="Search by name or speciality, then pick a free time slot." />

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-slate-700">Search by name</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="search" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="e.g. Sharma"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" />
          </div>
        </div>
        <Select id="spec" label="Speciality" value={specializationId} onChange={(e) => setSpec(e.target.value)}>
          <option value="">All specialities</option>
          {(specs.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select id="sort" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {doctors.error && !doctors.data ? <ErrorState error={doctors.error} onRetry={doctors.reload} /> :
        doctors.loading && !doctors.data ? <ListSkeleton rows={3} /> :
        list.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No doctors found"
            message={filtered ? 'Try a different name or speciality.' : 'There are no active doctors yet.'} />
        ) : (
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${doctors.loading ? 'opacity-60' : ''}`}>
            {list.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        )}
    </>
  );
}
