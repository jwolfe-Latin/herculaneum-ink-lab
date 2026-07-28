import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { LetterRegionSelector } from './LetterRegionSelector'

const testProps = {
  sourceImageUrl: '/test-source.png',
  sourceImageAlt: 'Test inscription',
  sourceSize: { width: 100, height: 100 },
}

async function renderSelector() {
  const user = userEvent.setup()
  render(<LetterRegionSelector {...testProps} />)
  await user.click(
    screen.getByRole('button', { name: 'Select Letter mode' }),
  )
  return user
}

function drag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  pointerType = 'mouse',
  pointerId = 1,
) {
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId,
    pointerType,
    clientX: start.x,
    clientY: start.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId,
    pointerType,
    clientX: end.x,
    clientY: end.y,
  })
  fireEvent.pointerUp(layer, {
    pointerId,
    pointerType,
    clientX: end.x,
    clientY: end.y,
  })
}

describe('LetterRegionSelector', () => {
  it('starts in Navigate mode and changes to Select Letter mode', async () => {
    const user = userEvent.setup()
    render(<LetterRegionSelector {...testProps} />)
    const navigate = screen.getByRole('button', { name: 'Navigate mode' })
    const select = screen.getByRole('button', {
      name: 'Select Letter mode',
    })
    expect(navigate).toHaveAttribute('aria-pressed', 'true')

    drag({ x: 10, y: 10 }, { x: 30, y: 30 })
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
    await user.click(select)
    expect(select).toHaveAttribute('aria-pressed', 'true')
  })

  it('creates normalized regions from drags in every direction', async () => {
    await renderSelector()
    drag({ x: 40, y: 50 }, { x: 10, y: 20 })

    const box = screen.getByTestId('letter-region-box-letter-region-1')
    expect(box).toHaveAttribute('x', '10')
    expect(box).toHaveAttribute('y', '20')
    expect(box).toHaveAttribute('width', '30')
    expect(box).toHaveAttribute('height', '30')
  })

  it('shows a draft before committing a valid region', async () => {
    await renderSelector()
    const layer = screen.getByTestId('letter-region-layer')
    fireEvent.pointerDown(layer, {
      pointerId: 3,
      pointerType: 'pen',
      clientX: 5,
      clientY: 5,
    })
    fireEvent.pointerMove(layer, {
      pointerId: 3,
      pointerType: 'pen',
      clientX: 25,
      clientY: 30,
    })

    expect(screen.getByTestId('letter-region-draft')).toBeInTheDocument()
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()

    fireEvent.pointerUp(layer, {
      pointerId: 3,
      pointerType: 'pen',
      clientX: 25,
      clientY: 30,
    })
    expect(screen.getByTestId('letter-region')).toBeInTheDocument()
  })

  it('ignores selections below the minimum size', async () => {
    await renderSelector()
    drag({ x: 10, y: 10 }, { x: 12, y: 30 })
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
  })

  it('moves and resizes the selected region without leaving the image', async () => {
    await renderSelector()
    drag({ x: 10, y: 10 }, { x: 30, y: 30 })
    const box = screen.getByTestId('letter-region-box-letter-region-1')

    fireEvent.pointerDown(box, {
      pointerId: 5,
      clientX: 15,
      clientY: 15,
    })
    fireEvent.pointerMove(screen.getByTestId('letter-region-layer'), {
      pointerId: 5,
      clientX: 95,
      clientY: 95,
    })
    fireEvent.pointerUp(screen.getByTestId('letter-region-layer'), {
      pointerId: 5,
      clientX: 95,
      clientY: 95,
    })
    expect(box).toHaveAttribute('x', '80')
    expect(box).toHaveAttribute('y', '80')

    const handle = screen.getByTestId('resize-handle-nw')
    fireEvent.pointerDown(handle, {
      pointerId: 6,
      clientX: 80,
      clientY: 80,
    })
    fireEvent.pointerMove(screen.getByTestId('letter-region-layer'), {
      pointerId: 6,
      clientX: -20,
      clientY: -10,
    })
    fireEvent.pointerUp(screen.getByTestId('letter-region-layer'), {
      pointerId: 6,
      clientX: -20,
      clientY: -10,
    })
    expect(box).toHaveAttribute('x', '0')
    expect(box).toHaveAttribute('y', '0')
  })

  it('deletes, undoes, and redoes region edits', async () => {
    const user = await renderSelector()
    drag({ x: 10, y: 10 }, { x: 30, y: 30 })

    await user.click(
      screen.getByRole('button', { name: 'Delete Selected' }),
    )
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByTestId('letter-region')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
  })

  it('supports keyboard deletion of a focused region', async () => {
    await renderSelector()
    drag({ x: 10, y: 10 }, { x: 30, y: 30 })
    fireEvent.focus(
      screen.getByTestId('letter-region-box-letter-region-1'),
    )

    fireEvent.keyDown(window, { key: 'Delete' })
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
  })

  it('undoes and redoes movement and resizing', async () => {
    const user = await renderSelector()
    drag({ x: 10, y: 10 }, { x: 30, y: 30 })
    const box = screen.getByTestId('letter-region-box-letter-region-1')
    fireEvent.pointerDown(box, {
      pointerId: 31,
      clientX: 15,
      clientY: 15,
    })
    fireEvent.pointerUp(screen.getByTestId('letter-region-layer'), {
      pointerId: 31,
      clientX: 25,
      clientY: 25,
    })
    expect(box).toHaveAttribute('x', '20')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(box).toHaveAttribute('x', '10')
    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(box).toHaveAttribute('x', '20')

    fireEvent.focus(box)
    fireEvent.pointerDown(screen.getByTestId('resize-handle-se'), {
      pointerId: 32,
      clientX: 40,
      clientY: 40,
    })
    fireEvent.pointerUp(screen.getByTestId('letter-region-layer'), {
      pointerId: 32,
      clientX: 55,
      clientY: 60,
    })
    expect(Number(box.getAttribute('width'))).toBeCloseTo(35)
    expect(Number(box.getAttribute('height'))).toBeCloseTo(40)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(box).toHaveAttribute('width', '20')
    expect(box).toHaveAttribute('height', '20')
  })

  it('asks for confirmation before clearing and can hide selections', async () => {
    const user = await renderSelector()
    drag({ x: 10, y: 10 }, { x: 30, y: 30 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await user.click(
      screen.getByRole('button', { name: 'Clear Selections' }),
    )
    expect(screen.getByTestId('letter-region')).toBeInTheDocument()
    confirm.mockReturnValue(true)
    await user.click(
      screen.getByRole('button', { name: 'Hide Selections' }),
    )
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Show Selections' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Clear Selections' }),
    )
    expect(confirm).toHaveBeenCalledWith(
      'Clear all letter selections? This cannot be undone.',
    )
    expect(screen.queryByTestId('letter-region')).not.toBeInTheDocument()
  })

  it.each(['touch', 'pen'])(
    'creates regions with %s pointer input',
    async (pointerType) => {
      await renderSelector()
      drag({ x: 2, y: 2 }, { x: 20, y: 25 }, pointerType)
      expect(screen.getByTestId('letter-region')).toBeInTheDocument()
    },
  )

  it('preserves source coordinates through zoom, pan, reset, and resize', async () => {
    const user = await renderSelector()
    drag({ x: 0, y: 0 }, { x: 20, y: 20 })
    const box = screen.getByTestId('letter-region-box-letter-region-1')

    await user.click(screen.getByRole('button', { name: 'Navigate mode' }))
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    const viewer = screen.getByRole('region', {
      name: 'Letter-region source image',
    })
    fireEvent.pointerDown(viewer, {
      pointerId: 9,
      clientX: 40,
      clientY: 40,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 9,
      clientX: 60,
      clientY: 55,
    })
    fireEvent.pointerUp(viewer, { pointerId: 9 })
    fireEvent(window, new Event('resize'))

    expect(box).toHaveAttribute('x', '0')
    expect(box).toHaveAttribute('y', '0')
    expect(screen.getByTestId('letter-region-stage')).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(20px, 15px, 0) scale(1.4)',
    })

    await user.click(
      screen.getByRole('button', { name: 'Select Letter mode' }),
    )
    drag({ x: 14, y: 9 }, { x: 42, y: 37 }, 'pen', 41)
    const transformedBox = screen.getByTestId(
      'letter-region-box-letter-region-2',
    )
    expect(Number(transformedBox.getAttribute('x'))).toBeCloseTo(10)
    expect(Number(transformedBox.getAttribute('y'))).toBeCloseTo(10)
    expect(Number(transformedBox.getAttribute('width'))).toBeCloseTo(20)
    expect(Number(transformedBox.getAttribute('height'))).toBeCloseTo(20)

    await user.click(screen.getByRole('button', { name: 'Reset View' }))
    expect(screen.getByTestId('letter-region-stage')).toHaveStyle({
      transform:
        'translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1)',
    })
  })

  it.each([
    ['top edge', { x: 40, y: 0 }, { x: 50, y: 5 }, 40, 0],
    ['one pixel below top', { x: 40, y: 1 }, { x: 50, y: 6 }, 40, 1],
    ['bottom edge', { x: 40, y: 95 }, { x: 50, y: 100 }, 40, 95],
    ['left edge', { x: 0, y: 40 }, { x: 5, y: 50 }, 0, 40],
    ['right edge', { x: 95, y: 40 }, { x: 100, y: 50 }, 95, 40],
    ['top-left corner', { x: 0, y: 0 }, { x: 5, y: 5 }, 0, 0],
    ['top-right corner', { x: 95, y: 0 }, { x: 100, y: 5 }, 95, 0],
    ['bottom-left corner', { x: 0, y: 95 }, { x: 5, y: 100 }, 0, 95],
    [
      'bottom-right corner',
      { x: 95, y: 95 },
      { x: 100, y: 100 },
      95,
      95,
    ],
  ])(
    'creates a region at the %s',
    async (_name, start, end, expectedX, expectedY) => {
      await renderSelector()
      drag(start, end)
      const box = screen.getByTestId(
        'letter-region-box-letter-region-1',
      )
      expect(box).toHaveAttribute('x', String(expectedX))
      expect(box).toHaveAttribute('y', String(expectedY))
    },
  )

  it('exposes the hidden RIB 785 demo without enabling the case', () => {
    window.history.pushState({}, '', '/?dev=letter-regions')
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Reusable Letter-Region Selection Tool',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 source illustration for selection-tool demonstration',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    expect(
      screen.getByText(/not an active RIB 785 student investigation/i),
    ).toBeInTheDocument()
  })
})
