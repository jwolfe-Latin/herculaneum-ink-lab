import {
  MIN_LETTER_REGION_SIZE,
  moveLetterRegion,
  normalizeLetterRegion,
  resizeLetterRegion,
  type LetterRegion,
} from './letterRegions'

const sourceSize = { width: 100, height: 80 }

describe('letter-region source geometry', () => {
  it.each([
    [{ x: 10, y: 20 }, { x: 40, y: 60 }],
    [{ x: 40, y: 20 }, { x: 10, y: 60 }],
    [{ x: 10, y: 60 }, { x: 40, y: 20 }],
    [{ x: 40, y: 60 }, { x: 10, y: 20 }],
  ])('normalizes selection drags in every direction', (start, end) => {
    expect(normalizeLetterRegion('r1', start, end, sourceSize)).toEqual({
      id: 'r1',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })
  })

  it('rejects regions below the minimum size', () => {
    expect(MIN_LETTER_REGION_SIZE).toBe(4)
    expect(
      normalizeLetterRegion(
        'tiny',
        { x: 3, y: 3 },
        { x: 6, y: 30 },
        sourceSize,
      ),
    ).toBeNull()
  })

  it('clamps creation to every source-image edge and corner', () => {
    expect(
      normalizeLetterRegion(
        'bounded',
        { x: -20, y: -10 },
        { x: 130, y: 100 },
        sourceSize,
      ),
    ).toEqual({
      id: 'bounded',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    })
  })

  it('moves regions without allowing them outside the source image', () => {
    const region: LetterRegion = {
      id: 'r1',
      x: 20,
      y: 20,
      width: 30,
      height: 25,
      label: 'A',
      lineNumber: 2,
      uncertainty: 'uncertain',
      note: 'Possible diagonal',
    }
    expect(
      moveLetterRegion(region, { x: -100, y: 100 }, sourceSize),
    ).toMatchObject({
      x: 0,
      y: 55,
      label: 'A',
      lineNumber: 2,
      uncertainty: 'uncertain',
      note: 'Possible diagonal',
    })
  })

  it.each([
    ['nw', { x: 5, y: 6 }, { x: 5, y: 6, width: 45, height: 39 }],
    ['ne', { x: 90, y: 6 }, { x: 20, y: 6, width: 70, height: 39 }],
    ['sw', { x: 5, y: 70 }, { x: 5, y: 20, width: 45, height: 50 }],
    ['se', { x: 90, y: 70 }, { x: 20, y: 20, width: 70, height: 50 }],
  ] as const)(
    'resizes the %s handle in source-image coordinates',
    (handle, pointer, expected) => {
      const region = { id: 'r1', x: 20, y: 20, width: 30, height: 25 }
      expect(
        resizeLetterRegion(region, handle, pointer, sourceSize),
      ).toMatchObject(expected)
    },
  )

  it('clamps resizing at source-image boundaries and the minimum size', () => {
    const region = { id: 'r1', x: 20, y: 20, width: 30, height: 25 }
    expect(
      resizeLetterRegion(region, 'nw', { x: -50, y: -50 }, sourceSize),
    ).toMatchObject({ x: 0, y: 0, width: 50, height: 45 })
    expect(
      resizeLetterRegion(region, 'se', { x: 21, y: 21 }, sourceSize),
    ).toMatchObject({ x: 20, y: 20, width: 4, height: 4 })
  })
})
