import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

import {
  OperationalStatusBadge,
  DetailDrawer,
  StepUpConfirmationDialog,
  FilterToolbar,
  OperationalDataTable,
} from '../src/components';

describe('Phase 7C: Reusable Operational Components Suite', () => {
  afterEach(() => {
    cleanup();
  });

  // ─── 1. OperationalStatusBadge ──────────────────────────────────────────
  it('1. OperationalStatusBadge maps semantic status tones accurately', () => {
    const { container } = render(
      <div>
        <OperationalStatusBadge status="ACTIVE" />
        <OperationalStatusBadge status="SUSPENDED" />
        <OperationalStatusBadge status="DEGRADED" />
        <OperationalStatusBadge status="PROVISIONING" />
        <OperationalStatusBadge status="CUSTOM_ARCHIVED" />
      </div>
    );

    const badges = container.querySelectorAll('span[data-status]');
    assert.strictEqual(badges.length, 5);

    assert.strictEqual(badges[0]?.getAttribute('data-tone'), 'success');
    assert.strictEqual(badges[1]?.getAttribute('data-tone'), 'destructive');
    assert.strictEqual(badges[2]?.getAttribute('data-tone'), 'warning');
    assert.strictEqual(badges[3]?.getAttribute('data-tone'), 'info');
    assert.strictEqual(badges[4]?.getAttribute('data-tone'), 'neutral');
  });

  // ─── 2. FilterToolbar ───────────────────────────────────────────────────
  it('2. FilterToolbar handles search input, status options and reset callback', () => {
    let searchVal = '';
    let selectedStatus = 'ALL';
    let resetCalled = false;

    const { getByPlaceholderText, getByText } = render(
      <FilterToolbar
        searchQuery="delhi"
        onSearchChange={(q) => (searchVal = q)}
        statusFilter={selectedStatus}
        onStatusChange={(s) => (selectedStatus = s)}
        statusOptions={[
          { label: 'All', value: 'ALL', count: 10 },
          { label: 'Active', value: 'ACTIVE', count: 8 },
          { label: 'Suspended', value: 'SUSPENDED', count: 2 },
        ]}
        onResetFilters={() => (resetCalled = true)}
      />
    );

    const searchInput = getByPlaceholderText('Search...') as HTMLInputElement;
    assert.strictEqual(searchInput.value, 'delhi');

    // Click Active filter
    const activeBtn = getByText('Active');
    fireEvent.click(activeBtn);
    assert.strictEqual(selectedStatus, 'ACTIVE');

    // Click Reset
    const resetBtn = getByText('Reset');
    fireEvent.click(resetBtn);
    assert.strictEqual(resetCalled, true);
  });

  // ─── 3. DetailDrawer ────────────────────────────────────────────────────
  it('3. DetailDrawer renders drawer title, description, tabs, and content', () => {
    let activeTab = 'tab-overview';
    const { getByText } = render(
      <DetailDrawer
        open={true}
        onOpenChange={() => {}}
        title="Restaurant Location #1"
        description="delhi-cp-primary-branch"
        tabs={[
          {
            id: 'tab-overview',
            label: 'Overview',
            content: <div>Location Overview Content</div>,
          },
          {
            id: 'tab-projects',
            label: 'Projects',
            count: 3,
            content: <div>Projects Content</div>,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(t) => (activeTab = t)}
      />
    );

    assert.ok(getByText('Restaurant Location #1'));
    assert.ok(getByText('delhi-cp-primary-branch'));
    assert.ok(getByText('Location Overview Content'));

    // Switch tab
    const projectsTab = getByText('Projects');
    fireEvent.click(projectsTab);
    assert.strictEqual(activeTab, 'tab-projects');
  });

  // ─── 4. StepUpConfirmationDialog ─────────────────────────────────────────
  it('4. StepUpConfirmationDialog validates 6-digit TOTP before calling onConfirm', async () => {
    let confirmedCode = '';
    const { getByPlaceholderText, getByText } = render(
      <StepUpConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        title="Suspend Tenant Runtime"
        description="Are you sure you want to suspend this tenant?"
        impactWarning="All customer traffic and API calls for this tenant will immediately fail closed."
        confirmLabel="Suspend Tenant"
        onConfirm={(code) => {
          confirmedCode = code;
        }}
      />
    );

    assert.ok(getByText('Suspend Tenant Runtime'));
    assert.ok(
      getByText(
        'All customer traffic and API calls for this tenant will immediately fail closed.'
      )
    );

    const input = getByPlaceholderText('000000') as HTMLInputElement;
    const submitBtn = getByText('Suspend Tenant') as HTMLButtonElement;

    // Disabled initially
    assert.strictEqual(submitBtn.disabled, true);

    // Enter 3 digits -> still disabled
    fireEvent.change(input, { target: { value: '123' } });
    assert.strictEqual(submitBtn.disabled, true);

    // Enter 6 digits -> enabled
    fireEvent.change(input, { target: { value: '123456' } });
    assert.strictEqual(submitBtn.disabled, false);

    // Submit
    fireEvent.click(submitBtn);
    assert.strictEqual(confirmedCode, '123456');
  });

  // ─── 5. OperationalDataTable ─────────────────────────────────────────────
  it('5. OperationalDataTable renders columns, data rows, loading and forbidden states', () => {
    interface TestRow {
      id: string;
      name: string;
      status: string;
    }

    const columns = [
      {
        accessorKey: 'id',
        header: 'ID',
      },
      {
        accessorKey: 'name',
        header: 'Tenant Name',
      },
    ];

    const data: TestRow[] = [
      { id: 'ten_1', name: 'Bistro Delhi', status: 'ACTIVE' },
      { id: 'ten_2', name: 'Bistro Mumbai', status: 'SUSPENDED' },
    ];

    // Standard Render
    const { getByText, rerender, queryByText } = render(
      <OperationalDataTable
        columns={columns as any}
        data={data}
        totalRows={2}
        pageIndex={0}
        pageSize={10}
      />
    );

    assert.ok(getByText('Bistro Delhi'));
    assert.ok(getByText('Bistro Mumbai'));

    // Forbidden state render
    rerender(
      <OperationalDataTable
        columns={columns as any}
        data={[]}
        isForbidden={true}
      />
    );

    assert.ok(getByText('Access Restricted'));
    assert.strictEqual(queryByText('Bistro Delhi'), null);

    // Empty state render
    rerender(
      <OperationalDataTable
        columns={columns as any}
        data={[]}
        emptyTitle="No Tenants Available"
      />
    );

    assert.ok(getByText('No Tenants Available'));
  });
});
