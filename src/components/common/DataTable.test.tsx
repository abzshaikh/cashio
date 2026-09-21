import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: '1', name: 'Groceries', amount: 3500 },
  { id: '2', name: 'Fuel', amount: 2000 },
  { id: '3', name: 'Rent', amount: 15000 },
];

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true },
  { id: 'amount', header: 'Amount', accessor: (r) => r.amount, sortable: true, align: 'right' },
];

describe('DataTable', () => {
  it('renders all rows and columns', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Fuel')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('shows the empty state when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        emptyTitle="No transactions"
      />,
    );
    expect(screen.getByText('No transactions')).toBeInTheDocument();
  });

  it('shows a loading state instead of the table', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} loading />);
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
  });

  it('sorts rows when a sortable column header is clicked', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    fireEvent.click(screen.getByText('Amount'));
    const cells = screen.getAllByRole('row').slice(1); // skip header row
    expect(cells[0]).toHaveTextContent('Fuel'); // smallest amount first (asc)
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} onRowClick={onRowClick} />,
    );
    fireEvent.click(screen.getByText('Groceries'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
