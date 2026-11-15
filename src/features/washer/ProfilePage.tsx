import { Building2, Phone, ShieldCheck, Star } from 'lucide-react';
import { Avatar } from '@/components/app/Avatar';
import { Card, SectionTitle } from '@/components/ui/Card';
import { SelectField } from '@/components/ui/Field';
import { joinWeekdays } from '@/lib/dates';
import { formatDateNumeric } from '@/lib/format';
import { averageRating } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';

export function ProfilePage() {
  const washerId = useDemoStore((s) => s.session.washerId);
  const washers = useDemoStore((s) => s.washers);
  const compounds = useDemoStore((s) => s.compounds);
  const washes = useDemoStore((s) => s.washes);
  const presentationMode = useDemoStore((s) => s.session.presentationMode);
  const washer = washers.find((w) => w.id === washerId) ?? washers[0];
  const rating = averageRating(washes.filter((w) => w.washerId === washer.id)) ?? washer.rating;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Profile</h1>
      <Card className="flex items-center gap-4">
        <Avatar initials={washer.photoInitials} size="lg" />
        <div>
          <p className="text-xl font-semibold">{washer.name}</p>
          <p className="text-success flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-5" aria-hidden />
            ID verified
          </p>
          <p className="text-ink-2 flex items-center gap-1.5 text-sm">
            <Phone className="size-4" aria-hidden />
            {washer.phone}
          </p>
        </div>
      </Card>
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-ink-2 text-sm">Customer rating</p>
          <p className="tabular flex items-center gap-2 text-3xl font-semibold">
            <Star className="size-7 fill-amber-400 text-amber-400" aria-hidden />
            {rating.toFixed(2)}
          </p>
        </div>
        <p className="text-ink-2 text-right text-sm">
          With us since
          <span className="text-ink block font-medium">{formatDateNumeric(washer.joinedAt)}</span>
        </p>
      </Card>
      <Card>
        <SectionTitle className="mb-2">Your compounds</SectionTitle>
        <ul className="divide-border divide-y">
          {compounds
            .filter((c) => washer.compoundIds.includes(c.id))
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <Building2 className="text-ink-2 size-5" aria-hidden />
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-ink-2 text-sm">
                    {c.area} · {joinWeekdays(c.serviceDays)}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </Card>
      {!presentationMode && (
        <Card className="border-dashed shadow-none">
          <SelectField
            label="Demo: view as another washer"
            value={washer.id}
            onChange={(e) => useDemoStore.getState().setWasher(e.target.value)}
            hint="Pick a washer who works today to see a full route."
          >
            {washers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectField>
        </Card>
      )}
    </div>
  );
}
