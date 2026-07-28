import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import {
  RIB_785_LETTER_REFERENCE_CONTEXT,
  RIB_785_LETTER_REFERENCE_FILENAME,
  RIB_785_LETTER_REFERENCE_PATH,
} from './InstructorLetterReferenceEditor'
import {
  createLetterReferenceDraft,
  createLetterReferenceExport,
  letterReferenceDraftKey,
} from './letterReference'
import type { LetterRegion } from './letterRegions'

const EDITOR_URL = '/?dev=letter-reference-editor&case=RIB%20785'

function openEditor() {
  window.history.pushState({}, '', EDITOR_URL)
  const user = userEvent.setup()
  render(<App />)
  return user
}

function drawRegion(
  start = { x: 10, y: 10 },
  end = { x: 30, y: 30 },
  pointerId = 1,
) {
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: start.x,
    clientY: start.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: end.x,
    clientY: end.y,
  })
  fireEvent.pointerUp(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: end.x,
    clientY: end.y,
  })
}

function completeRib785Regions(): LetterRegion[] {
  return RIB_785_LETTER_REFERENCE_CONTEXT.transcriptionLines.flatMap(
    (line, lineIndex) =>
      line
        .replace(/\s+/g, '')
        .split('')
        .map((label, characterIndex) => ({
          id: `line-${lineIndex + 1}-character-${characterIndex + 1}`,
          x: 10 + characterIndex * 9,
          y: 20 + lineIndex * 30,
          width: 6,
          height: 10,
          label,
          lineNumber: lineIndex + 1,
          uncertainty: 'certain' as const,
        })),
  )
}

function validReferenceJson() {
  return JSON.stringify(
    createLetterReferenceExport(
      {
        caseId: RIB_785_LETTER_REFERENCE_CONTEXT.caseId,
        sourceSize: RIB_785_LETTER_REFERENCE_CONTEXT.sourceSize,
        regions: completeRib785Regions(),
        acknowledgedMismatchLines: new Set(),
      },
      RIB_785_LETTER_REFERENCE_CONTEXT,
      '2026-07-28T12:00:00.000Z',
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('Instructor Letter-Reference Editor', () => {
  it('opens the hidden editor and loads the permanent RIB 785 case data', () => {
    openEditor()

    expect(
      screen.getByRole('heading', {
        name: 'Instructor Letter-Reference Editor',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Current case:/)).toHaveTextContent('RIB 785')
    expect(screen.getByText(/Source image:/)).toHaveTextContent(
      '832 × 1084 pixels',
    )
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 source illustration for instructor reference editing',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    expect(screen.getByText('CRESCENTINV')).toBeInTheDocument()
    expect(screen.getByText('PATER POSVIT')).toBeInTheDocument()
  })

  it('creates and edits complete metadata for a selected region', async () => {
    const user = openEditor()
    await user.click(
      screen.getByRole('button', { name: 'Select Letter mode' }),
    )
    drawRegion({ x: 0, y: 0 }, { x: 20, y: 20 })

    expect(screen.getByLabelText('Region ID')).toHaveValue(
      'letter-region-1',
    )
    expect(screen.getByLabelText('Uncertainty status')).toHaveValue(
      'certain',
    )
    await user.type(screen.getByLabelText('Letter label'), 'V')
    await user.selectOptions(screen.getByLabelText('Line number'), '2')
    await user.selectOptions(
      screen.getByLabelText('Uncertainty status'),
      'damaged',
    )
    await user.type(
      screen.getByLabelText('Instructor note'),
      'Upper stroke is faint.',
    )

    expect(screen.getByText('letter-region-1: V')).toBeInTheDocument()
    expect(screen.getByText('Line 2 · damaged')).toBeInTheDocument()
    expect(
      screen.getByTestId('letter-region-box-letter-region-1'),
    ).toHaveAttribute('y', '0')
    expect(screen.getByText('Draft saved locally')).toBeInTheDocument()
    const stored = localStorage.getItem(
      letterReferenceDraftKey('RIB 785'),
    )
    expect(stored).toContain('Upper stroke is faint.')
    expect(stored).toContain('"label":"V"')
  })

  it('groups regions by line and supports manual ordering controls', async () => {
    const user = openEditor()
    await user.click(
      screen.getByRole('button', { name: 'Select Letter mode' }),
    )
    drawRegion({ x: 10, y: 10 }, { x: 20, y: 20 }, 1)
    await user.type(screen.getByLabelText('Letter label'), 'D')
    await user.selectOptions(screen.getByLabelText('Line number'), '1')
    drawRegion({ x: 30, y: 10 }, { x: 40, y: 20 }, 2)
    await user.type(screen.getByLabelText('Letter label'), 'M')
    await user.selectOptions(screen.getByLabelText('Line number'), '1')

    expect(
      screen.getAllByRole('heading', { name: 'Line 1' }).length,
    ).toBeGreaterThanOrEqual(1)
    await user.click(
      screen.getByRole('button', {
        name: 'Move letter-region-1 later',
      }),
    )
    expect(screen.getByText('Manual order 1')).toBeInTheDocument()
    expect(screen.getByText('Manual order 2')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Use automatic left-to-right order',
      }),
    )
    expect(screen.queryByText('Manual order 1')).not.toBeInTheDocument()
  })

  it('cross-checks diplomatic transcription and displays mismatches', () => {
    openEditor()

    expect(
      screen.getAllByText('Mismatch needs review'),
    ).toHaveLength(5)
    expect(
      screen.getByText(
        'Spaces are ignored for comparison. Visible V is preserved and is never normalized to U.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Export Reference JSON' }),
    ).toBeDisabled()
  })

  it('restores and clears a case-keyed local draft', async () => {
    const draftRegion: LetterRegion = {
      id: 'saved-region',
      x: 1,
      y: 1,
      width: 10,
      height: 10,
      label: 'D',
      lineNumber: 1,
      uncertainty: 'insecure',
    }
    localStorage.setItem(
      letterReferenceDraftKey('RIB 785'),
      JSON.stringify(
        createLetterReferenceDraft({
          caseId: 'RIB 785',
          sourceSize: { width: 832, height: 1084 },
          regions: [draftRegion],
          acknowledgedMismatchLines: new Set(),
        }),
      ),
    )
    const user = openEditor()
    await user.click(screen.getByRole('button', { name: 'Restore Draft' }))

    expect(
      screen.getByTestId('letter-region-box-saved-region'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Draft restored. Draft saved locally'),
    ).toBeInTheDocument()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(
      screen.getByRole('button', { name: 'Clear Local Draft' }),
    )
    expect(confirm).toHaveBeenCalledWith(
      'Clear the locally saved RIB 785 instructor draft?',
    )
    expect(
      localStorage.getItem(letterReferenceDraftKey('RIB 785')),
    ).toBeNull()
  })

  it('warns before overwriting an existing draft', async () => {
    localStorage.setItem(
      letterReferenceDraftKey('RIB 785'),
      JSON.stringify(
        createLetterReferenceDraft({
          caseId: 'RIB 785',
          sourceSize: { width: 832, height: 1084 },
          regions: [],
          acknowledgedMismatchLines: new Set(),
        }),
      ),
    )
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = openEditor()
    await user.click(
      screen.getByRole('button', { name: 'Select Letter mode' }),
    )
    drawRegion()

    expect(confirm).toHaveBeenCalledWith(
      'A local draft already exists for RIB 785. Overwrite it with these changes?',
    )
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
  })

  it('imports, exports, and generates validated reference JSON', async () => {
    const user = openEditor()
    const file = {
      name: RIB_785_LETTER_REFERENCE_FILENAME,
      type: 'application/json',
      text: vi.fn().mockResolvedValue(validReferenceJson()),
    }
    fireEvent.change(screen.getByLabelText('Import Reference JSON'), {
      target: { files: [file] },
    })
    expect(
      await screen.findByText('Ready for final export.'),
    ).toBeInTheDocument()

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test-reference'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    await user.click(
      screen.getByRole('button', { name: 'Export Reference JSON' }),
    )
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', {
        name: 'Generate Case Reference Data',
      }),
    )
    expect(
      screen.getByText(RIB_785_LETTER_REFERENCE_FILENAME),
    ).toBeInTheDocument()
    expect(
      screen.getByText(RIB_785_LETTER_REFERENCE_PATH),
    ).toBeInTheDocument()
  })

  it('rejects imported JSON with the wrong case ID', async () => {
    openEditor()
    const invalid = JSON.parse(validReferenceJson())
    invalid.caseId = 'RIB 999'
    fireEvent.change(screen.getByLabelText('Import Reference JSON'), {
      target: {
        files: [
          {
            text: vi.fn().mockResolvedValue(JSON.stringify(invalid)),
          },
        ],
      },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'must belong to RIB 785',
    )
  })

  it('filters regions, hides labels, and zooms to a listed region', async () => {
    const user = openEditor()
    fireEvent.change(screen.getByLabelText('Import Reference JSON'), {
      target: {
        files: [{ text: vi.fn().mockResolvedValue(validReferenceJson()) }],
      },
    })
    await screen.findByText('Ready for final export.')

    await user.selectOptions(screen.getByLabelText('Line filter'), '1')
    expect(screen.getAllByTestId('letter-region')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Hide Labels' }))
    expect(
      document.querySelector('.letter-region-layer text'),
    ).not.toBeInTheDocument()

    const viewer = screen.getByRole('region', {
      name: 'Letter-region source image',
    })
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => undefined,
    })
    const zoomButtons = screen.getAllByRole('button', {
      name: 'Zoom to region',
    })
    await user.click(zoomButtons[0])
    expect(screen.getByText('600%')).toBeInTheDocument()
  })

  it('keeps the editor absent from the student homepage and RIB 785 disabled', () => {
    render(<App />)

    expect(
      screen.queryByRole('heading', {
        name: 'Instructor Letter-Reference Editor',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'RIB 785: Funerary Inscription for Crescentinus: In Development',
      }),
    ).toBeDisabled()
    expect(
      document.querySelector(
        'a[href*="letter-reference-editor"]',
      ),
    ).not.toBeInTheDocument()
  })
})
