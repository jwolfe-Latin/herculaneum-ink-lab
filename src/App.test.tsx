import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as evaluation from './evaluation'
import * as caseData from './caseData'
import type { LoadedCaseResources } from './caseData'
import App from './App'

async function openInvestigation() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(
    screen.getByRole('button', { name: 'Begin Tutorial' }),
  )
  return user
}

async function enterLabelMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Label mode' }))
}

function drawStroke(pointerId = 1) {
  const layer = screen.getByTestId('annotation-layer')
  fireEvent.pointerDown(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: 120,
    clientY: 100,
  })
  fireEvent.pointerMove(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: 180,
    clientY: 140,
  })
  fireEvent.pointerUp(layer, {
    pointerId,
    pointerType: 'pen',
    clientX: 180,
    clientY: 140,
  })
}

function fakeCaseResources(): LoadedCaseResources {
  const referenceMembership = new Uint8Array(16)
  referenceMembership[0] = 1
  return {
    metadata: {
      caseId: 'test-case',
      caseTitle: 'Test case',
      studentInstructions: 'Inspect the test.',
      surfaceImage: 'surface.png',
      referenceMask: 'reference-mask.png',
      minimumInkRecovery: 0.2,
      minimumLabelPrecision: 0.6,
      sourceCredit: 'Test',
      license: 'Test',
      referenceMaskDescription: 'Test reference.',
    },
    surface: { width: 4, height: 4, decoded: true },
    reference: {
      width: 4,
      height: 4,
      decoded: true,
      hasAlphaChannel: true,
      data: new Uint8ClampedArray(64),
    },
    referenceMembership,
    validation: {
      passed: true,
      surfaceWidth: 4,
      surfaceHeight: 4,
      referenceWidth: 4,
      referenceHeight: 4,
      acceptedInkPixels: 1,
      transparentPixels: 15,
      partiallyTransparentPixels: 0,
      unusualIncludedRgbPixels: 0,
      errors: [],
      warnings: [],
    },
  }
}

function mockSuccessfulScoring() {
  vi.spyOn(caseData, 'loadCaseResources').mockResolvedValue(
    fakeCaseResources(),
  )
  vi.spyOn(evaluation, 'rasterizeStudentStrokes').mockImplementation(
    (strokes) => {
      const result = new Uint8Array(16)
      if (strokes.length > 0) result[0] = 1
      return result
    },
  )
}

async function revealExpertReference(
  user: ReturnType<typeof userEvent.setup>,
) {
  await enterLabelMode(user)
  drawStroke()
  await user.click(screen.getByRole('button', { name: 'Check My Labels' }))
  await user.click(
    await screen.findByRole('button', {
      name: 'Reveal Expert Reference',
    }),
  )
}

async function enterSideBySideComparison(
  user: ReturnType<typeof userEvent.setup>,
) {
  await revealExpertReference(user)
  await user.click(
    screen.getByRole('button', { name: 'Side-by-Side Comparison' }),
  )
}

async function prepareReport(
  user: ReturnType<typeof userEvent.setup>,
  identifier = 'Student 24',
) {
  await enterLabelMode(user)
  drawStroke()
  await user.click(screen.getByRole('button', { name: 'Check My Labels' }))
  const identifierInput = await screen.findByRole('textbox', {
    name: 'Student name or assigned identifier',
  })
  if (identifier) await user.type(identifierInput, identifier)
  await user.click(screen.getByRole('button', { name: 'Create Final Report' }))
}

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('Ancient Texts Lab', () => {
  it('shows the platform title, subtitle, and three student experiences', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Ancient Texts Lab' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Identify. Transcribe. Translate. Analyze.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Learn the basics of paleography by analyzing real texts from the ancient world.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('A Classical Languages Workspace')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Herculaneum Ink Tutorial' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Latin Paleography Training' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Annotated Texts')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Experimental AI Workspace' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Begin Tutorial' }),
    ).toBeInTheDocument()
  })

  it('opens the preserved Herculaneum tutorial', async () => {
    await openInvestigation()

    expect(
      screen.getByText(
        'Examine the surface carefully. What patterns might indicate ink?',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Grayscale scan of a Herculaneum papyrus surface',
      }),
    ).toHaveAttribute('src', '/herculaneum-ink-lab/surface.png')
  })

  it('supports keyboard activation of the investigation and mode controls', async () => {
    const user = userEvent.setup()
    render(<App />)
    const begin = screen.getByRole('button', { name: 'Begin Tutorial' })
    begin.focus()
    await user.keyboard('{Enter}')

    const labelMode = screen.getByRole('button', { name: 'Label mode' })
    labelMode.focus()
    await user.keyboard(' ')

    expect(labelMode).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Likely Ink brush' })).toBeEnabled()
  })

  it('shows RIB 785 under Latin investigations and opens its first stage', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'RIB 785: Funerary Inscription for Crescentinus',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inscription')).toBeInTheDocument()
    expect(screen.getByText('Latin')).toBeInTheDocument()
    expect(screen.getByText('Introductory')).toBeInTheDocument()
    expect(screen.getByText('5 minutes')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A Roman funerary inscription from Brougham, England.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'RIB 785: Funerary Inscription for Crescentinus: Begin Investigation',
      }),
    ).toBeEnabled()
    expect(
      document.querySelector('[data-case-id="RIB 785"]'),
    ).toHaveAttribute(
      'data-source-image',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'RIB 785: Funerary Inscription for Crescentinus: Begin Investigation',
      }),
    )
    expect(
      screen.getByRole('heading', { name: 'Letter Identification' }),
    ).toBeInTheDocument()
  })

  it('keeps the experimental AI workspace placeholder disabled', () => {
    render(<App />)

    expect(
      screen.getByRole('button', {
        name: 'Experimental Workspace — Future Expansion',
      }),
    ).toBeDisabled()
  })

  it('keeps the expert reference hidden when an investigation begins', async () => {
    await openInvestigation()

    expect(
      document.querySelector('.expert-reference-overlay'),
    ).not.toBeInTheDocument()
  })

  it('disables reveal before the student labels anything', async () => {
    await openInvestigation()

    expect(
      screen.getByRole('button', { name: 'Reveal Expert Reference' }),
    ).toBeDisabled()
  })

  it('keeps reveal disabled after labeling but before checking', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()

    expect(
      screen.getByRole('button', { name: 'Reveal Expert Reference' }),
    ).toBeDisabled()
  })

  it('enables reveal after a genuine attempt and label check', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()

    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))

    expect(
      await screen.findByRole('button', {
        name: 'Reveal Expert Reference',
      }),
    ).toBeEnabled()
  })

  it('hides and relocks the reference after Start Over', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()
    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))
    const revealButton = await screen.findByRole('button', {
      name: 'Reveal Expert Reference',
    })
    await user.click(revealButton)

    expect(
      document.querySelector('.expert-reference-overlay'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The expert reference annotation is a comparison standard based on expert judgment. It does not prove that every transparent region contains no ink.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start Over' }))

    expect(
      document.querySelector('.expert-reference-overlay'),
    ).not.toBeInTheDocument()
    expect(revealButton).toBeDisabled()
    expect(screen.queryByTestId('annotation-stroke')).not.toBeInTheDocument()
  })

  it('shows and hides the revealed expert reference', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    const reference = screen.getByTestId('expert-reference-overlay')

    expect(reference).toHaveStyle({ opacity: '0.55' })
    await user.click(
      screen.getByRole('button', { name: 'Hide Expert Reference' }),
    )
    expect(reference).toHaveStyle({ opacity: '0' })

    await user.click(
      screen.getByRole('button', { name: 'Show Expert Reference' }),
    )
    expect(reference).toHaveStyle({ opacity: '0.55' })
  })

  it('changes expert-reference opacity without affecting student labels', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    const opacity = screen.getByRole('slider', {
      name: 'Expert Reference Opacity',
    })

    fireEvent.change(opacity, { target: { value: '28' } })

    expect(opacity).toHaveValue('28')
    expect(screen.getByText('Expert Reference Opacity: 28%')).toBeInTheDocument()
    expect(screen.getByTestId('expert-reference-overlay')).toHaveStyle({
      opacity: '0.28',
    })
    expect(document.querySelector('.label-color')).toHaveAttribute(
      'opacity',
      '1',
    )
  })

  it('shows and hides student labels after the reference is revealed', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    const labels = document.querySelector('.label-color')

    await user.click(screen.getByRole('button', { name: 'Hide My Labels' }))
    expect(labels).toHaveAttribute('opacity', '0')

    await user.click(screen.getByRole('button', { name: 'Show My Labels' }))
    expect(labels).toHaveAttribute('opacity', '1')
  })

  it('restores both layers for Overlay Comparison', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    await user.click(screen.getByRole('button', { name: 'Hide My Labels' }))
    await user.click(
      screen.getByRole('button', { name: 'Hide Expert Reference' }),
    )

    await user.click(
      screen.getByRole('button', { name: 'Overlay Comparison' }),
    )

    expect(document.querySelector('.label-color')).toHaveAttribute(
      'opacity',
      '1',
    )
    expect(screen.getByTestId('expert-reference-overlay')).toHaveStyle({
      opacity: '0.55',
    })
  })

  it('enters side-by-side mode with the correct panel labels', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)

    expect(screen.getByTestId('side-by-side-comparison')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'My Labels' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Expert Reference' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Return to Overlay Comparison' }),
    ).toBeInTheDocument()
  })

  it('keeps both side-by-side panels synchronized while zooming', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)

    await user.click(screen.getByRole('button', { name: 'Zoom In' }))

    const studentStage = screen.getByTestId('student-comparison-stage')
    const expertStage = screen.getByTestId('expert-comparison-stage')
    expect(studentStage.getAttribute('style')).toBe(
      expertStage.getAttribute('style'),
    )
    expect(studentStage).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1.4)',
    })
  })

  it('keeps both side-by-side panels synchronized while panning', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    const expertPanel = screen.getByRole('region', {
      name: 'Expert Reference comparison panel',
    })

    fireEvent.pointerDown(expertPanel, {
      pointerId: 9,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(expertPanel, {
      pointerId: 9,
      clientX: 135,
      clientY: 128,
    })
    fireEvent.pointerUp(expertPanel, { pointerId: 9 })

    const studentStyle = screen
      .getByTestId('student-comparison-stage')
      .getAttribute('style')
    const expertStyle = screen
      .getByTestId('expert-comparison-stage')
      .getAttribute('style')
    expect(studentStyle).toBe(expertStyle)
    expect(studentStyle).toContain('translate3d(35px, 28px, 0)')
  })

  it('resets both side-by-side panels to the same view', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))

    await user.click(screen.getByRole('button', { name: 'Reset View' }))

    for (const stage of [
      screen.getByTestId('student-comparison-stage'),
      screen.getByTestId('expert-comparison-stage'),
    ]) {
      expect(stage).toHaveStyle({
        transform:
          'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)',
      })
    }
  })

  it('uses the same source-image grid at the top edge and all corners in both panels', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    const image = screen.getByRole('img', {
      name: 'Grayscale scan of a Herculaneum papyrus surface',
    })
    Object.defineProperty(image, 'naturalWidth', {
      configurable: true,
      value: 1746,
    })
    Object.defineProperty(image, 'naturalHeight', {
      configurable: true,
      value: 1164,
    })
    fireEvent.load(image)
    await enterSideBySideComparison(user)
    const annotation = screen.getByTestId('annotation-layer')
    const studentStage = screen.getByTestId('student-comparison-stage')
    const expertStage = screen.getByTestId('expert-comparison-stage')

    expect(annotation).toHaveAttribute('viewBox', '0 0 1746 1164')
    expect(annotation).toHaveAttribute('preserveAspectRatio', 'none')
    expect(studentStage.getAttribute('style')).toBe(
      expertStage.getAttribute('style'),
    )
    expect(
      expertStage.querySelector('.expert-reference-overlay'),
    ).toBeInTheDocument()
  })

  it('returns to overlay mode', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)

    await user.click(
      screen.getByRole('button', { name: 'Return to Overlay Comparison' }),
    )

    expect(
      screen.queryByTestId('side-by-side-comparison'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Zoomable papyrus surface' }),
    ).toBeInTheDocument()
  })

  it('provides responsive panel classes for tablet-width stacking', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await enterSideBySideComparison(user)

    expect(screen.getByTestId('side-by-side-comparison')).toHaveClass(
      'side-by-side-comparison',
    )
    expect(
      screen.getByRole('region', { name: 'My Labels comparison panel' }),
    ).toHaveClass('comparison-viewer')
    expect(
      screen.getByRole('region', {
        name: 'Expert Reference comparison panel',
      }),
    ).toHaveClass('comparison-viewer')
  })

  it('does not duplicate or change student annotation data when changing comparison modes', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    const originalPath = screen
      .getByTestId('annotation-stroke')
      .getAttribute('d')

    await user.click(
      screen.getByRole('button', { name: 'Side-by-Side Comparison' }),
    )
    expect(screen.getAllByTestId('annotation-stroke')).toHaveLength(1)
    expect(screen.getByTestId('annotation-stroke')).toHaveAttribute(
      'd',
      originalPath,
    )

    await user.click(
      screen.getByRole('button', { name: 'Return to Overlay Comparison' }),
    )
    expect(screen.getAllByTestId('annotation-stroke')).toHaveLength(1)
    expect(screen.getByTestId('annotation-stroke')).toHaveAttribute(
      'd',
      originalPath,
    )
  })

  it('keeps scoring unchanged after using side-by-side comparison', async () => {
    mockSuccessfulScoring()
    const rasterize = vi.spyOn(evaluation, 'rasterizeStudentStrokes')
    const user = await openInvestigation()
    await enterSideBySideComparison(user)
    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))

    expect(rasterize).toHaveBeenCalledTimes(2)
    expect(
      screen
        .getByRole('heading', { name: 'Ink Recovered' })
        .parentElement?.querySelector('strong'),
    ).toHaveTextContent('100%')
    expect(
      screen
        .getByRole('heading', { name: 'Label Precision' })
        .parentElement?.querySelector('strong'),
    ).toHaveTextContent('100%')
  })

  it('keeps source, expert, student, and cursor on the source-image grid at the top edge and corners', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    const image = screen.getByRole('img', {
      name: 'Grayscale scan of a Herculaneum papyrus surface',
    })
    Object.defineProperty(image, 'naturalWidth', {
      configurable: true,
      value: 1746,
    })
    Object.defineProperty(image, 'naturalHeight', {
      configurable: true,
      value: 1164,
    })
    fireEvent.load(image)
    await revealExpertReference(user)

    const stage = screen.getByTestId('surface-stage')
    const annotation = screen.getByTestId('annotation-layer')
    const reference = screen.getByTestId('expert-reference-overlay')
    expect(annotation).toHaveAttribute('viewBox', '0 0 1746 1164')
    expect(annotation).toHaveAttribute('preserveAspectRatio', 'none')
    expect(image.parentElement).toBe(stage)
    expect(annotation.parentElement).toBe(stage)
    expect(reference.parentElement).toBe(stage)
  })

  it('keeps overlay alignment through zoom, pan, reset, and browser resize', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await revealExpertReference(user)
    await user.click(screen.getByRole('button', { name: 'Navigate mode' }))
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    const viewer = screen.getByRole('region', {
      name: 'Zoomable papyrus surface',
    })
    fireEvent.pointerDown(viewer, {
      pointerId: 7,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 7,
      clientX: 130,
      clientY: 125,
    })
    fireEvent.pointerUp(viewer, { pointerId: 7 })
    fireEvent(window, new Event('resize'))

    const stage = screen.getByTestId('surface-stage')
    expect(screen.getByTestId('annotation-layer').parentElement).toBe(stage)
    expect(screen.getByTestId('expert-reference-overlay').parentElement).toBe(
      stage,
    )

    await user.click(screen.getByRole('button', { name: 'Reset View' }))
    expect(stage).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)',
    })
  })

  it('allows revision after reveal and updates scoring when checked again', async () => {
    vi.spyOn(caseData, 'loadCaseResources').mockResolvedValue(
      fakeCaseResources(),
    )
    const rasterize = vi
      .spyOn(evaluation, 'rasterizeStudentStrokes')
      .mockImplementation((strokes) => {
        const result = new Uint8Array(16)
        if (strokes.length > 0) result[0] = 1
        if (strokes.length > 1) result[1] = 1
        return result
      })
    const user = await openInvestigation()
    await revealExpertReference(user)

    drawStroke(2)
    expect(screen.getAllByTestId('annotation-stroke')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Clear Labels' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))

    expect(rasterize).toHaveBeenCalledTimes(2)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('7%')).toBeInTheDocument()
  })

  it('resets a zoomed view', async () => {
    const user = await openInvestigation()
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))

    expect(screen.getByText('140%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset View' }))

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByTestId('surface-stage')).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)',
    })
  })

  it('allows a minimum brush size of 4 px', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    const sizeControl = screen.getByRole('slider')

    fireEvent.change(sizeControl, { target: { value: '4' } })

    expect(sizeControl).toHaveAttribute('min', '4')
    expect(sizeControl).toHaveValue('4')
    expect(screen.getByText('Brush size: 4 px')).toBeInTheDocument()
  })

  it('allows a maximum brush size of 12 px', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    const sizeControl = screen.getByRole('slider')

    fireEvent.change(sizeControl, { target: { value: '12' } })
    fireEvent.pointerMove(screen.getByTestId('annotation-layer'), {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 100,
    })

    expect(sizeControl).toHaveAttribute('max', '12')
    expect(sizeControl).toHaveValue('12')
    expect(screen.getByTestId('brush-cursor')).toHaveAttribute('r', '6')
  })

  it('uses a default brush size of 8 px', async () => {
    await openInvestigation()

    expect(screen.getByRole('slider')).toHaveValue('8')
    expect(screen.getByText('Brush size: 8 px')).toBeInTheDocument()
  })

  it('uses whole-number increments of 1 px', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    const sizeControl = screen.getByRole('slider')

    expect(sizeControl).toHaveAttribute('step', '1')
    fireEvent.change(sizeControl, { target: { value: '9' } })

    expect(sizeControl).toHaveValue('9')
    expect(screen.getByText('Brush size: 9 px')).toBeInTheDocument()
  })

  it('does not allow brush sizes outside 4–12 px', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    const sizeControl = screen.getByRole('slider')

    fireEvent.change(sizeControl, { target: { value: '99' } })

    expect(sizeControl).toHaveValue('12')
    expect(screen.getByText('Brush size: 12 px')).toBeInTheDocument()

    fireEvent.change(sizeControl, { target: { value: '-20' } })

    expect(sizeControl).toHaveValue('4')
    expect(screen.getByText('Brush size: 4 px')).toBeInTheDocument()
  })

  it('uses the same selected source-pixel size for brush and eraser', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    fireEvent.change(screen.getByRole('slider'), {
      target: { value: '10' },
    })

    drawStroke()
    await user.click(screen.getByRole('button', { name: 'Eraser' }))
    drawStroke(2)

    const strokes = screen.getAllByTestId('annotation-stroke')
    expect(strokes[0]).toHaveAttribute('data-source-size', '10')
    expect(strokes[1]).toHaveAttribute('data-source-size', '10')
  })

  it('keeps cursor and annotation diameter consistent across zoom levels', async () => {
    const user = await openInvestigation()
    const image = screen.getByRole('img', {
      name: 'Grayscale scan of a Herculaneum papyrus surface',
    })
    Object.defineProperty(image, 'naturalWidth', {
      configurable: true,
      value: 1746,
    })
    Object.defineProperty(image, 'naturalHeight', {
      configurable: true,
      value: 1164,
    })
    fireEvent.load(image)
    await enterLabelMode(user)
    const layer = screen.getByTestId('annotation-layer')
    fireEvent.pointerMove(layer, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 100,
    })
    drawStroke()

    expect(
      Number(screen.getByTestId('brush-cursor').getAttribute('r')),
    ).toBeCloseTo(4)
    expect(
      Number(screen.getByTestId('annotation-stroke').getAttribute('stroke-width')),
    ).toBeCloseTo(8)

    await user.click(screen.getByRole('button', { name: 'Navigate mode' }))
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    await user.click(screen.getByRole('button', { name: 'Label mode' }))
    fireEvent.pointerMove(layer, {
      pointerId: 3,
      pointerType: 'mouse',
      clientX: 140,
      clientY: 120,
    })

    expect(screen.getByTestId('surface-stage')).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1.4)',
    })
    expect(
      Number(screen.getByTestId('brush-cursor').getAttribute('r')),
    ).toBeCloseTo(4)
  })

  it('draws a likely-ink annotation with pointer input', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)

    drawStroke()

    expect(screen.getByTestId('annotation-stroke')).toHaveAttribute(
      'data-tool',
      'ink',
    )
  })

  it('draws with touch pointer input', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    const layer = screen.getByTestId('annotation-layer')

    fireEvent.pointerDown(layer, {
      pointerId: 21,
      pointerType: 'touch',
      clientX: 90,
      clientY: 80,
    })
    fireEvent.pointerMove(layer, {
      pointerId: 21,
      pointerType: 'touch',
      clientX: 130,
      clientY: 110,
    })
    fireEvent.pointerUp(layer, {
      pointerId: 21,
      pointerType: 'touch',
      clientX: 130,
      clientY: 110,
    })

    expect(screen.getByTestId('annotation-stroke')).toHaveAttribute(
      'data-tool',
      'ink',
    )
  })

  it('adds an eraser stroke to remove painted regions', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()
    await user.click(screen.getByRole('button', { name: 'Eraser' }))

    drawStroke(2)

    const strokes = screen.getAllByTestId('annotation-stroke')
    expect(strokes).toHaveLength(2)
    expect(strokes[1]).toHaveAttribute('data-tool', 'eraser')
  })

  it('undoes the most recent annotation action', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.queryByTestId('annotation-stroke')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
  })

  it('confirms before clearing all labels', async () => {
    const user = await openInvestigation()
    await enterLabelMode(user)
    drawStroke()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await user.click(screen.getByRole('button', { name: 'Clear Labels' }))

    expect(confirm).toHaveBeenCalledWith(
      'Clear all labels? This cannot be undone.',
    )
    expect(screen.queryByTestId('annotation-stroke')).not.toBeInTheDocument()
    confirm.mockRestore()
  })

  it('replaces evaluation results after labels are revised and checked again', async () => {
    vi.spyOn(caseData, 'loadCaseResources').mockResolvedValue(
      fakeCaseResources(),
    )
    vi.spyOn(evaluation, 'rasterizeStudentStrokes').mockImplementation(
      (strokes) => {
        const result = new Uint8Array(16)
        if (strokes.length > 0) result[0] = 1
        return result
      },
    )
    const user = await openInvestigation()

    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))
    expect(
      await screen.findByText(
        'Add labels before precision can be calculated.',
      ),
    ).toBeInTheDocument()

    await enterLabelMode(user)
    drawStroke()
    await user.click(screen.getByRole('button', { name: 'Check My Labels' }))

    expect(
      screen.queryByText('Add labels before precision can be calculated.'),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('100%')).toHaveLength(3)
  })

  it('requires a student identifier before creating the report', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()

    await prepareReport(user, '')

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Enter a student name or assigned identifier.')
    expect(
      screen.queryByRole('heading', {
        name: 'Herculaneum Ink Lab — Investigation Report',
      }),
    ).not.toBeInTheDocument()
  })

  it('returns from the report with the current identifier and labels preserved', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await prepareReport(user)

    await user.click(
      screen.getByRole('button', { name: 'Return to Investigation' }),
    )

    expect(screen.getByTestId('annotation-stroke')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', {
        name: 'Student name or assigned identifier',
      }),
    ).toHaveValue('Student 24')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })

  it('clears personal and investigation data when report Start Over is confirmed', async () => {
    mockSuccessfulScoring()
    const user = await openInvestigation()
    await prepareReport(user)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await user.click(screen.getByRole('button', { name: 'Start Over' }))

    expect(confirm).toHaveBeenCalledWith(
      'Start over? This clears the student identifier, labels, and results.',
    )
    expect(screen.queryByText('Student 24')).not.toBeInTheDocument()
    expect(screen.queryByTestId('annotation-stroke')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reveal Expert Reference' }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('textbox', {
        name: 'Student name or assigned identifier',
      }),
    ).not.toBeInTheDocument()
  })

  it('does not store the student identifier in browser storage', async () => {
    mockSuccessfulScoring()
    const localSet = vi.spyOn(Storage.prototype, 'setItem')
    const user = await openInvestigation()

    await prepareReport(user, 'Private Student')

    expect(localSet).not.toHaveBeenCalled()
    expect(document.cookie).toBe('')
  })

  it('keeps source, student, and reference layers on one stage through zoom and resize', async () => {
    window.history.pushState({}, '', '/?teacher=1')
    vi.spyOn(caseData, 'loadCaseResources').mockResolvedValue(
      fakeCaseResources(),
    )
    const user = await openInvestigation()
    const stage = screen.getByTestId('surface-stage')
    const annotation = screen.getByTestId('annotation-layer')
    const reference = document.querySelector('.expert-reference-overlay')
    const source = screen.getByRole('img', {
      name: 'Grayscale scan of a Herculaneum papyrus surface',
    })

    expect(reference).not.toBeNull()
    expect(source.parentElement).toBe(stage)
    expect(annotation.parentElement).toBe(stage)
    expect(reference?.parentElement).toBe(stage)

    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    fireEvent(window, new Event('resize'))

    expect(stage).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1.4)',
    })
    expect(annotation.getAttribute('style') ?? '').not.toContain('transform')
    expect(reference?.getAttribute('style') ?? '').not.toContain('transform')
  })
})
