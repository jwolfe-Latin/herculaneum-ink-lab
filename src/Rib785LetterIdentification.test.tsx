import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'

async function openRib785() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(
    screen.getByRole('button', {
      name: 'RIB 785: Funerary Inscription for Crescentinus: Begin Investigation',
    }),
  )
  return user
}

function drawFirstReferenceRegion(pointerType = 'mouse') {
  const reference = RIB_785_LETTER_REFERENCE.regions[0]
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId: 71,
    pointerType,
    clientX: reference.x,
    clientY: reference.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId: 71,
    pointerType,
    clientX: reference.x + reference.width,
    clientY: reference.y + reference.height,
  })
  fireEvent.pointerUp(layer, {
    pointerId: 71,
    pointerType,
    clientX: reference.x + reference.width,
    clientY: reference.y + reference.height,
  })
}

async function createRegion(
  user: ReturnType<typeof userEvent.setup>,
  label = 'd',
  line = '1',
  pointerType = 'mouse',
) {
  await user.click(
    screen.getByRole('button', { name: 'Select Letter mode' }),
  )
  drawFirstReferenceRegion(pointerType)
  if (label) {
    await user.type(
      screen.getByRole('textbox', { name: 'Letter label' }),
      label,
    )
  }
  if (line) {
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Line number' }),
      line,
    )
  }
}

async function checkOneMatchedRegion(
  user: ReturnType<typeof userEvent.setup>,
) {
  await createRegion(user)
  await user.click(
    screen.getByRole('button', {
      name: 'Check Letter Identification',
    }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('RIB 785 student letter identification', () => {
  it('opens from the normal student homepage', async () => {
    await openRib785()

    expect(
      screen.getByRole('heading', {
        name: 'RIB 785: Funerary Inscription for Crescentinus',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Select each visible letter in the inscription and label it with the Latin character you see.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 funerary inscription for letter identification',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
  })

  it('starts in Letter Identification and keeps later stages gated', async () => {
    await openRib785()

    const stages = screen.getByRole('navigation', {
      name: 'RIB 785 investigation stages',
    })
    expect(stages).toHaveTextContent('Letter Identification')
    expect(stages).toHaveTextContent('Transcription')
    expect(stages).toHaveTextContent('Word Segmentation')
    expect(stages).toHaveTextContent('Translation')
    expect(stages.querySelectorAll('.student-letter-stage--active')).toHaveLength(
      1,
    )
    expect(stages.querySelectorAll('.student-letter-stage--locked')).toHaveLength(
      3,
    )
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )
    expect(screen.getByText('Transcription').closest('li')).toHaveTextContent(
      'Locked',
    )
  })

  it('keeps the instructor reference hidden before checking', async () => {
    await openRib785()

    expect(
      document.querySelector('[data-reference-region-id]'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Show Instructor Reference',
      }),
    ).not.toBeInTheDocument()
  })

  it('creates, labels, and assigns a student region using uppercase V without normalization', async () => {
    const user = await openRib785()
    await createRegion(user, 'v', '2', 'pen')

    expect(
      screen.getByRole('textbox', { name: 'Letter label' }),
    ).toHaveValue('V')
    expect(
      screen.getByRole('combobox', { name: 'Line number' }),
    ).toHaveValue('2')
    expect(screen.getByText('1 letter selected')).toBeInTheDocument()
    expect(
      screen.getByText(/visible inscriptional V remains V/i),
    ).toBeInTheDocument()
  })

  it('blocks checking until at least one region exists', async () => {
    await openRib785()

    expect(
      screen.getByRole('button', {
        name: 'Check Letter Identification',
      }),
    ).toBeDisabled()
  })

  it('blocks checking while a region lacks a label or line', async () => {
    const user = await openRib785()
    await createRegion(user, '', '')
    const check = screen.getByRole('button', {
      name: 'Check Letter Identification',
    })

    expect(check).toBeDisabled()
    await user.type(
      screen.getByRole('textbox', { name: 'Letter label' }),
      'D',
    )
    expect(check).toBeDisabled()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Line number' }),
      '1',
    )
    expect(check).toBeEnabled()
  })

  it('shows student-only progress without revealing expected reference totals', async () => {
    const user = await openRib785()
    await createRegion(user)

    const progress = screen.getByRole('region', {
      name: 'Letter selection summary',
    })
    expect(progress).toHaveTextContent('Total letters selected1')
    expect(progress).toHaveTextContent('Your selections on line 11')
    expect(progress).toHaveTextContent('Unlabeled regions0')
    expect(progress).toHaveTextContent('Regions without a line number0')
    expect(progress).not.toHaveTextContent('47')
    expect(progress).not.toHaveTextContent('expected')
  })

  it('classifies a matched region and missed reference regions after checking', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    expect(
      screen.getByText('Matched Letters').closest('div'),
    ).toHaveTextContent('1')
    expect(
      screen.getByText('Missed Reference Letters').closest('div'),
    ).toHaveTextContent('46')
    expect(
      screen.getByText('Student-Only Selections').closest('div'),
    ).toHaveTextContent('0')
    expect(
      screen.getByText('Label or Line Mismatches').closest('div'),
    ).toHaveTextContent('0')
  })

  it('reveals and hides the Instructor Reference only after checking', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    expect(
      document.querySelectorAll('[data-reference-region-id]'),
    ).toHaveLength(0)
    await user.click(
      screen.getByRole('button', {
        name: 'Show Instructor Reference',
      }),
    )
    expect(
      document.querySelectorAll('[data-reference-region-id]'),
    ).toHaveLength(47)
    await user.click(
      screen.getByRole('button', {
        name: 'Hide Instructor Reference',
      }),
    )
    expect(
      document.querySelectorAll('[data-reference-region-id]'),
    ).toHaveLength(0)
  })

  it('shows and hides student selections in overlay comparison', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    expect(
      document.querySelectorAll('[data-student-region-id]'),
    ).toHaveLength(1)
    await user.click(
      screen.getByRole('button', { name: 'Hide My Selections' }),
    )
    expect(
      document.querySelectorAll('[data-student-region-id]'),
    ).toHaveLength(0)
    await user.click(
      screen.getByRole('button', { name: 'Show My Selections' }),
    )
    expect(
      document.querySelectorAll('[data-student-region-id]'),
    ).toHaveLength(1)
  })

  it('provides overlay and responsive side-by-side comparison modes', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    expect(
      screen.getByTestId('student-letter-comparison-overlay'),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Side-by-Side Comparison',
      }),
    )
    expect(
      screen.getByTestId('student-letter-comparison-student'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('student-letter-comparison-reference'),
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        '.student-letter-comparison__panels--side-by-side',
      ),
    ).toBeInTheDocument()
  })

  it('uses text and distinct patterns instead of color alone', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    const legend = screen.getByRole('list', {
      name: 'Comparison pattern key',
    })
    expect(legend).toHaveTextContent('solid outline')
    expect(legend).toHaveTextContent('diagonal reference pattern')
    expect(legend).toHaveTextContent('double-dashed outline')
    expect(legend).toHaveTextContent('dotted outline')
  })

  it('allows revision and updates the comparison after rechecking', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    const label = screen.getByRole('textbox', { name: 'Letter label' })
    await user.clear(label)
    await user.type(label, 'M')

    expect(
      screen.getByText(/selections changed/i),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Check Letter Identification',
      }),
    )
    expect(
      screen.getByText('Matched Letters').closest('div'),
    ).toHaveTextContent('0')
    expect(
      screen.getByText('Label or Line Mismatches').closest('div'),
    ).toHaveTextContent('1')
    expect(
      screen.getByText(/label mismatch with the overlapping/i),
    ).toBeInTheDocument()
  })

  it('classifies a line mismatch separately in the neutral detail', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Line number' }),
      '2',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Check Letter Identification',
      }),
    )

    expect(
      screen.getByText(/line mismatch with the overlapping/i),
    ).toBeInTheDocument()
  })

  it('does not display a percentage, grade, combined score, or pass/fail result', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    const feedback = screen.getByRole('region', {
      name: 'Instructor Reference comparison',
    })
    expect(feedback).not.toHaveTextContent('%')
    expect(feedback).not.toHaveTextContent(/grade/i)
    expect(feedback).not.toHaveTextContent(/score/i)
    expect(feedback).not.toHaveTextContent(/pass|fail/i)
  })

  it('requires a current check and no label or line mismatch before completion', async () => {
    const user = await openRib785()
    await createRegion(user, 'M', '1')
    const complete = screen.getByRole('button', {
      name: 'Mark Letter Identification Complete',
    })
    expect(complete).toBeDisabled()
    await user.click(
      screen.getByRole('button', {
        name: 'Check Letter Identification',
      }),
    )
    expect(complete).toBeDisabled()
  })

  it('confirms completion when missed or student-only differences remain', async () => {
    const user = await openRib785()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await checkOneMatchedRegion(user)
    const complete = screen.getByRole('button', {
      name: 'Mark Letter Identification Complete',
    })

    expect(complete).toBeEnabled()
    await user.click(complete)
    expect(confirm).toHaveBeenCalledWith(
      'Finish this stage with remaining differences?',
    )
    expect(
      screen.queryByText('Letter Identification Complete'),
    ).not.toBeInTheDocument()
    confirm.mockReturnValue(true)
    await user.click(complete)
    expect(
      screen.getAllByText('Letter Identification Complete').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )
  })

  it('clears only student session data after Start Over confirmation', async () => {
    const user = await openRib785()
    const referenceBefore = JSON.stringify(RIB_785_LETTER_REFERENCE)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await checkOneMatchedRegion(user)
    await user.click(screen.getByRole('button', { name: 'Start Over' }))

    expect(confirm).toHaveBeenCalledWith(
      'Start over? This clears all of your RIB 785 investigation work.',
    )
    expect(screen.getByText('0 letters selected')).toBeInTheDocument()
    expect(
      screen.queryByText('Instructor Reference comparison'),
    ).not.toBeInTheDocument()
    expect(JSON.stringify(RIB_785_LETTER_REFERENCE)).toBe(referenceBefore)
  })

  it('warns before returning to the homepage after work begins', async () => {
    const user = await openRib785()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await createRegion(user)
    await user.click(
      screen.getByRole('button', { name: 'Return to Homepage' }),
    )

    expect(confirm).toHaveBeenCalledWith(
      'Return to the homepage? Your RIB 785 investigation work will be lost.',
    )
    expect(
      screen.getByRole('heading', {
        name: 'RIB 785: Funerary Inscription for Crescentinus',
      }),
    ).toBeInTheDocument()
  })

  it('warns the browser before refresh or close when work exists', async () => {
    const user = await openRib785()
    await createRegion(user)
    const event = new Event('beforeunload', { cancelable: true })

    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('keeps student data out of local and session storage', async () => {
    const user = await openRib785()
    await checkOneMatchedRegion(user)

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps developer routes absent from student navigation', async () => {
    await openRib785()

    expect(
      document.querySelector('a[href*="letter-regions"]'),
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('a[href*="letter-reference-editor"]'),
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('a[href*="letter-reference-review"]'),
    ).not.toBeInTheDocument()
  })
})
