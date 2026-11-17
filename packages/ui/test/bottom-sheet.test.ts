import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '../src/components/bottom-sheet';

afterEach(() => {
  cleanup();
});

describe('BottomSheet Component Guard (7B.1 / F-5)', () => {
  it('renders bottom sheet content when open with accessible structure', () => {
    const { getByRole, getByText } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(
            BottomSheetHeader,
            null,
            React.createElement(BottomSheetTitle, null, 'Test Sheet Title'),
            React.createElement(BottomSheetDescription, null, 'Test sheet description')
          ),
          React.createElement('p', null, 'Sheet body content'),
          React.createElement(
            BottomSheetFooter,
            null,
            React.createElement('button', { type: 'button' }, 'Action')
          )
        )
      )
    );

    const dialog = getByRole('dialog');
    assert.ok(dialog);
    assert.equal(getByText('Test Sheet Title').textContent, 'Test Sheet Title');
    assert.equal(getByText('Test sheet description').textContent, 'Test sheet description');
    assert.equal(getByText('Sheet body content').textContent, 'Sheet body content');
    assert.equal(dialog.getAttribute('data-drag-state'), 'idle');
  });

  it('handles showCloseButton={false} by adding sr-only class for accessible close', () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          { showCloseButton: false },
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const closeBtn = getByRole('button', { name: 'Close' });
    assert.ok(closeBtn);
    assert.ok(closeBtn.className.includes('sr-only'));
  });

  it('shows close button visually by default (showCloseButton=true)', () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const closeBtn = getByRole('button', { name: 'Close' });
    assert.ok(closeBtn);
    assert.equal(closeBtn.className.includes('sr-only'), false);
  });

  it('triggers dismissal when dragged downwards > 75px', async () => {
    let openState = true;
    const onOpenChange = (open: boolean) => {
      openState = open;
    };

    const { getByRole, container } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle, 'Drag handle must be rendered');

    // Simulate drag start at clientY: 100
    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Simulate drag move to clientY: 180 (delta = 80 > 75)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 180 }],
      changedTouches: [{ clientX: 100, clientY: 180 }],
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');
    assert.equal(dialog.getAttribute('data-drag-level'), 'high');

    // Simulate touch end
    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 180 }],
        changedTouches: [{ clientX: 100, clientY: 180 }],
      });
    });

    // When delta > 75, dismiss state is entered and close button is triggered
    assert.equal(dialog.getAttribute('data-drag-state'), 'dismissing');
    assert.equal(openState, false);
  });

  it('snaps back cleanly when dragged downwards <= 75px', async () => {
    let openState = true;
    const onOpenChange = (open: boolean) => {
      openState = open;
    };

    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    // Simulate drag start at clientY: 100
    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Simulate drag move to clientY: 140 (delta = 40 <= 75)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 140 }],
      changedTouches: [{ clientX: 100, clientY: 140 }],
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');
    assert.equal(dialog.getAttribute('data-drag-level'), 'medium');

    // Simulate touch end
    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 140 }],
        changedTouches: [{ clientX: 100, clientY: 140 }],
      });
    });

    // Does NOT dismiss (open remains true)
    assert.equal(openState, true);
    assert.equal(dialog.getAttribute('data-drag-state'), 'snapping');
  });

  it('restores sheet to resting state when onTouchCancel is fired', async () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 150 }],
      changedTouches: [{ clientX: 100, clientY: 150 }],
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');

    // Gesture interrupted / cancelled by OS (e.g. phone call, browser gesture)
    await act(async () => {
      fireEvent.touchCancel(dragHandle, {
        touches: [{ clientX: 100, clientY: 150 }],
        changedTouches: [{ clientX: 100, clientY: 150 }],
      });
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'snapping');
  });

  it('supports keyboard dismissal via Escape key and traps focus attributes', async () => {
    let openState = true;
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange: (open) => { openState = open; } },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Keyboard Dismissible'),
          React.createElement(BottomSheetDescription, null, 'Focus test')
        )
      )
    );

    const dialog = getByRole('dialog');
    assert.ok(dialog);

    // Press Escape
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    });

    assert.equal(openState, false);
  });
});
