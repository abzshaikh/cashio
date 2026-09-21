import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { NetWorthPage } from './NetWorthPage';
import type { Account } from '../../types/account';
import type { Debt } from '../../types/debt';
import type { DebtPayment } from '../../types/debtPayment';
import type { Asset } from '../../types/asset';
import type { Liability } from '../../types/liability';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

let mockAccounts: Account[] | null = [];
const reloadAccountsMock = vi.fn();
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts, error: null, reload: reloadAccountsMock }),
}));

let mockDebts: Debt[] | null = [];
vi.mock('../../hooks/useDebts', () => ({
  useDebts: () => ({ debts: mockDebts, error: null, reload: vi.fn() }),
}));

let mockPayments: DebtPayment[] | null = [];
vi.mock('../../hooks/useDebtPayments', () => ({
  useDebtPayments: () => ({ payments: mockPayments, error: null, reload: vi.fn() }),
}));

const subscribeToAssetsMock = vi.fn();
const createAssetMock = vi.fn();
const updateAssetMock = vi.fn();
const deleteAssetMock = vi.fn();
vi.mock('../../services/assetService', () => ({
  subscribeToAssets: (...args: unknown[]) => subscribeToAssetsMock(...args),
  createAsset: (...args: unknown[]) => createAssetMock(...args),
  updateAsset: (...args: unknown[]) => updateAssetMock(...args),
  deleteAsset: (...args: unknown[]) => deleteAssetMock(...args),
}));

const subscribeToLiabilitiesMock = vi.fn();
const createLiabilityMock = vi.fn();
const updateLiabilityMock = vi.fn();
const deleteLiabilityMock = vi.fn();
vi.mock('../../services/liabilityService', () => ({
  subscribeToLiabilities: (...args: unknown[]) => subscribeToLiabilitiesMock(...args),
  createLiability: (...args: unknown[]) => createLiabilityMock(...args),
  updateLiability: (...args: unknown[]) => updateLiabilityMock(...args),
  deleteLiability: (...args: unknown[]) => deleteLiabilityMock(...args),
}));

let assetsData: Asset[] | 'error' = [];
let liabilitiesData: Liability[] | 'error' = [];

function setup() {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  subscribeToAssetsMock.mockImplementation((_uid, onData, onError) => {
    if (assetsData === 'error') onError(new Error('Failed to load assets'));
    else onData(assetsData);
    return vi.fn();
  });
  subscribeToLiabilitiesMock.mockImplementation((_uid, onData, onError) => {
    if (liabilitiesData === 'error') onError(new Error('Failed to load liabilities'));
    else onData(liabilitiesData);
    return vi.fn();
  });
  render(<NetWorthPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAccounts = [];
  mockDebts = [];
  mockPayments = [];
  assetsData = [];
  liabilitiesData = [];
});

describe('NetWorthPage', () => {
  it('shows a loading state while accounts are still loading', () => {
    mockAccounts = null;
    setup();
    expect(screen.getByText('Loading net worth…')).toBeInTheDocument();
  });

  it('computes and shows total assets, liabilities, and net worth', () => {
    mockAccounts = [
      {
        id: 'a1',
        userId: 'user-1',
        name: 'Checking',
        type: 'bank',
        institution: '',
        accountNumber: '',
        openingBalance: 0,
        currentBalance: 100000,
        currency: 'INR',
        status: 'active',
        notes: '',
        createdAt: '',
        updatedAt: '',
      },
    ];
    assetsData = [
      {
        id: 'as1',
        userId: 'user-1',
        type: 'property',
        label: 'House',
        value: 50000000,
        asOf: '2026-01-01',
        createdAt: '',
        updatedAt: '',
      },
    ];
    liabilitiesData = [
      {
        id: 'l1',
        userId: 'user-1',
        type: 'tax',
        label: 'Back taxes',
        value: 20000000,
        asOf: '2026-01-01',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'l2',
        userId: 'user-1',
        type: 'loan',
        label: 'Personal loan',
        value: 10000000,
        asOf: '2026-01-01',
        createdAt: '',
        updatedAt: '',
      },
    ];
    setup();
    // Phase 34: these are minor units (paise) — ₹1,000 (account) + ₹5,00,000
    // (manual asset) = ₹5,01,000 assets; ₹2,00,000 + ₹1,00,000 (manual) =
    // ₹3,00,000 liabilities; ₹2,01,000 net worth.
    // Every total below is deliberately distinct from any individual
    // line item so it can't collide with a breakdown chart's or a
    // section list's own row for the same amount.
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('₹5,01,000')).toBeInTheDocument();
    expect(screen.getByText('₹3,00,000')).toBeInTheDocument();
    expect(screen.getByText('₹2,01,000')).toBeInTheDocument();
  });

  it('shows an empty assets/liabilities state with nothing tracked', () => {
    setup();
    expect(screen.getByText('No other assets yet')).toBeInTheDocument();
    expect(screen.getByText('No other liabilities yet')).toBeInTheDocument();
  });

  it('adds a new asset', async () => {
    createAssetMock.mockResolvedValue('new-asset-id');
    setup();
    // Both the section header's button and the empty state's own action
    // button share the label "Add Asset" while the list is empty.
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Asset' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Car' } });
    fireEvent.change(within(dialog).getByLabelText('Current value'), { target: { value: '20000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Asset' }));
    await waitFor(() =>
      expect(createAssetMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ label: 'Car', value: 20000 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Asset added');
  });

  it('deletes an asset after confirmation', async () => {
    assetsData = [
      {
        id: 'as1',
        userId: 'user-1',
        type: 'property',
        label: 'House',
        value: 500000,
        asOf: '2026-01-01',
        createdAt: '',
        updatedAt: '',
      },
    ];
    confirmMock.mockResolvedValue(true);
    deleteAssetMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByLabelText('Delete asset House'));
    await waitFor(() => expect(deleteAssetMock).toHaveBeenCalledWith('as1'));
    expect(notifySuccess).toHaveBeenCalledWith('Asset deleted');
  });

  it('adds a new liability', async () => {
    createLiabilityMock.mockResolvedValue('new-liability-id');
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Liability' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'IOU' } });
    fireEvent.change(within(dialog).getByLabelText('Amount owed'), { target: { value: '500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Liability' }));
    await waitFor(() =>
      expect(createLiabilityMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ label: 'IOU', value: 500 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Liability added');
  });
});
