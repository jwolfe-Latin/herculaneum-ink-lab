import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { letterReferenceDraftKey } from './letterReference'

const REVIEW_URL =
  '/?dev=letter-reference-review&case=RIB%20785'

function renderReview() {
  window.history.pushState({}, '', REVIEW_URL)
  render(<App />)
}

afterEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('permanent RIB 785 letter-reference review', () => {
  it('opens only through the hidden review query and reports validation passed', () => {
    renderReview()

    expect(
      screen.getByRole('heading', {
        name: 'RIB 785 Permanent Letter Reference',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('832 × 1084')).toBeInTheDocument()
  })

  it('overlays all 47 labels on the source image', () => {
    renderReview()

    expect(
      screen.getByRole('img', {
        name: 'RIB 785 source illustration with reviewed letter regions',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    expect(
      screen.getByTestId('permanent-reference-overlay'),
    ).toHaveAttribute(
      'aria-label',
      '47 visible permanent letter regions',
    )
    expect(document.querySelectorAll('[data-region-id]')).toHaveLength(47)
  })

  it('shows the permanent count for every inscription line', () => {
    renderReview()

    const summary = screen.getByRole('region', {
      name: 'Permanent reference summary',
    })
    expect(summary).toHaveTextContent('Line 1')
    expect(summary).toHaveTextContent('Line 2')
    expect(summary).toHaveTextContent('Line 3')
    expect(summary).toHaveTextContent('Line 4')
    expect(summary).toHaveTextContent('Line 5')
    expect(summary).toHaveTextContent('Total regions47')
  })

  it('filters the overlay by line without changing permanent data', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Filter reference by line',
      }),
      '4',
    )

    expect(document.querySelectorAll('[data-region-id]')).toHaveLength(12)
    expect(
      document.querySelectorAll('[data-line-number="4"]'),
    ).toHaveLength(12)
    expect(
      screen.getByTestId('permanent-reference-overlay'),
    ).toHaveAttribute(
      'aria-label',
      '12 visible permanent letter regions',
    )
  })

  it('is read-only and never modifies the instructor draft', async () => {
    const key = letterReferenceDraftKey('RIB 785')
    localStorage.setItem(key, 'preserve-this-draft')
    const user = userEvent.setup()
    renderReview()

    expect(
      screen.queryByRole('button', { name: /select letter/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Filter reference by line',
      }),
      '2',
    )
    expect(localStorage.getItem(key)).toBe('preserve-this-draft')
  })

  it('returns to the editable editor without linking from the homepage', () => {
    renderReview()

    expect(
      screen.getByRole('link', { name: 'Return to Editable Editor' }),
    ).toHaveAttribute(
      'href',
      '/herculaneum-ink-lab/?dev=letter-reference-editor&case=RIB%20785',
    )

    window.history.pushState({}, '', '/')
    render(<App />)
    expect(
      document.querySelector(
        'a[href*="letter-reference-review"]',
      ),
    ).not.toBeInTheDocument()
  })
})
