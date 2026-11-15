import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeforeAfterSlider } from '@/components/app/BeforeAfterSlider';
import { CarIllustration } from '@/components/app/CarIllustration';
import { DayCapacityCard } from '@/components/app/DayCapacityCard';
import { PlanCard } from '@/components/app/PlanCard';
import { DataTable } from '@/components/ui/DataTable';
import { StarRating } from '@/components/ui/StarRating';

describe('PlanCard', () => {
  it('shows name, price, inclusions and an approximate price per wash', () => {
    render(<PlanCard plan="plus" selected={false} onSelect={() => {}} />);
    expect(screen.getByText('Plus')).toBeInTheDocument();
    expect(screen.getByText('EGP 950')).toBeInTheDocument();
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    expect(screen.getByText('1 interior clean every month')).toBeInTheDocument();
    expect(screen.getByText('≈ EGP 219 per wash')).toBeInTheDocument();
  });

  it('only highlights the popular plan', () => {
    render(<PlanCard plan="essential" selected={false} onSelect={() => {}} />);
    expect(screen.queryByText('Most popular')).not.toBeInTheDocument();
  });

  it('calls onSelect and reflects selection', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<PlanCard plan="premium" selected={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith('premium');
    rerender(<PlanCard plan="premium" selected onSelect={onSelect} />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('shows the family discount with the list price struck through', () => {
    render(<PlanCard plan="plus" selected={false} onSelect={() => {}} price={808} />);
    expect(screen.getByText('EGP 808')).toBeInTheDocument();
    expect(screen.getByText('EGP 950').tagName).toBe('S');
  });
});

describe('DayCapacityCard', () => {
  const nextDate = new Date(2026, 10, 17);

  it('shows spots left and can be selected when available', async () => {
    const onSelect = vi.fn();
    render(
      <DayCapacityCard
        day="tue"
        nextDate={nextDate}
        spotsLeft={6}
        selected={false}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('6 spots left')).toBeInTheDocument();
    expect(screen.getByText('Next: Tue, 17 Nov')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM – 2:00 PM')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith('tue');
  });

  it('warns when nearly full', () => {
    render(<DayCapacityCard day="sat" nextDate={nextDate} spotsLeft={2} selected={false} />);
    expect(screen.getByText('Only 2 spots left')).toBeInTheDocument();
    expect(screen.getByRole('radio')).toBeEnabled();
  });

  it('uses the singular for one spot', () => {
    render(<DayCapacityCard day="sat" nextDate={nextDate} spotsLeft={1} selected={false} />);
    expect(screen.getByText('Only 1 spot left')).toBeInTheDocument();
  });

  it('cannot be selected when full, and offers the waitlist', async () => {
    const onSelect = vi.fn();
    const onJoinWaitlist = vi.fn();
    render(
      <DayCapacityCard
        day="sun"
        nextDate={nextDate}
        spotsLeft={0}
        selected={false}
        onSelect={onSelect}
        onJoinWaitlist={onJoinWaitlist}
      />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Full — join waitlist' }));
    expect(onJoinWaitlist).toHaveBeenCalledWith('sun');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('is locked (not changeable) for Premium', () => {
    render(<DayCapacityCard day="tue" nextDate={nextDate} spotsLeft={6} selected locked />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('StarRating', () => {
  it('renders five radio stars and reports the chosen one', async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marks the current value as checked', () => {
    render(<StarRating value={3} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1 star' })).toHaveAttribute('aria-checked', 'false');
  });

  it('is a labelled image when read-only', () => {
    render(<StarRating value={4.6} label="Average rating" />);
    expect(screen.getByRole('img', { name: 'Average rating: 4.6 out of 5' })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('BeforeAfterSlider', () => {
  const setup = () => {
    render(<BeforeAfterSlider before={<div>before</div>} after={<div>after</div>} />);
    return screen.getByRole('slider', { name: 'Before and after comparison' });
  };
  // jsdom normalises "0" to "0px"; compare the part that matters.
  const clip = () => screen.getByTestId('before-layer').style.clipPath.replace(/0px/g, '0');

  it('starts in the middle', () => {
    const slider = setup();
    expect(slider).toHaveValue('50');
    expect(clip()).toBe('inset(0 50% 0 0)');
  });

  it('moves with the arrow keys, faster with Shift', () => {
    const slider = setup();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveValue('52');
    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(slider).toHaveValue('42');
    expect(clip()).toBe('inset(0 58% 0 0)');
  });

  it('jumps to the ends with Home and End, and stays in range', () => {
    const slider = setup();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveValue('100');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveValue('100');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveValue('0');
    expect(slider).toHaveAttribute('aria-valuetext', '0% before, 100% after');
  });

  it('follows pointer and touch drags through the range input', () => {
    const slider = setup();
    fireEvent.change(slider, { target: { value: '80' } });
    expect(clip()).toBe('inset(0 20% 0 0)');
  });

  it('ignores unrelated keys', () => {
    const slider = setup();
    fireEvent.keyDown(slider, { key: 'a' });
    expect(slider).toHaveValue('50');
  });
});

describe('CarIllustration', () => {
  it('is deterministic for the same seed and differs between dirty and clean', () => {
    const html = (state: 'dirty' | 'clean', seed: number) =>
      render(
        <CarIllustration bodyType="suv" color="red" state={state} seed={seed} />,
      ).container.innerHTML.replace(/_r_\w+_|«\w+»/g, '');
    expect(html('dirty', 4)).toBe(html('dirty', 4));
    expect(html('dirty', 4)).not.toBe(html('dirty', 5));
    expect(html('dirty', 4)).not.toBe(html('clean', 4));
  });

  it('is labelled when given a title and hidden from assistive tech otherwise', () => {
    const { container, rerender } = render(
      <CarIllustration bodyType="sedan" color="white" state="clean" title="After the wash" />,
    );
    expect(screen.getByRole('img', { name: 'After the wash' })).toBeInTheDocument();
    rerender(<CarIllustration bodyType="sedan" color="white" state="clean" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('DataTable', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    name: `Compound ${String.fromCharCode(65 + i)}`,
    n: (i * 7) % 12,
  }));
  const setup = () =>
    render(
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={5}
        searchText={(r) => r.name}
        columns={[
          { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
          { key: 'n', header: 'Count', cell: (r) => r.n, sortValue: (r) => r.n },
        ]}
      />,
    );
  const firstCell = () => screen.getAllByRole('row')[1].firstChild?.textContent;

  it('paginates', async () => {
    setup();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('1–5 of 12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(firstCell()).toBe('Compound F');
  });

  it('sorts ascending then descending', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Count' }));
    expect(firstCell()).toBe('Compound A');
    expect(screen.getByRole('columnheader', { name: 'Count' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Count' }));
    expect(screen.getByRole('columnheader', { name: 'Count' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getAllByRole('row')[1].lastChild?.textContent).toBe('11');
  });

  it('filters by search and shows an empty state', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'compound k');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument();
  });
});
