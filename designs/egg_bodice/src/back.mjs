import { measurementsPlugin } from '@freesewing/plugin-measurements'

function draftBack({
  options,
  Point,
  Path,
  points,
  paths,
  measurements,
  Snippet,
  snippets,
  sa,
  complete,
  // log,
  macro,
  store,
  utils,
  part,
}) {
  // body points
  points.waistCB = new Point(0, 0)
  points.hipsCB = points.waistCB.shift(-90, measurements.waistToHips)
  points.seatCB = points.waistCB.shift(-90, measurements.waistToSeat)
  points.bustCB = points.waistCB.shift(
    90,
    measurements.waistToUnderbust + measurements.bustPointToUnderbust
  )
  points.necklineCB = points.waistCB.shift(90, measurements.waistToNecklineBack)

  points.waistSB = points.waistCB.shift(0, measurements.waistBack / 2)
  points.hipsSB = points.hipsCB.shift(0, measurements.hips / 4)
  points.seatSB = points.seatCB.shift(0, measurements.seatBack / 2)
  points.bustSB = points.bustCB.shift(0, (measurements.chest - measurements.bustFront) / 2)
  points.armpitBack = points.waistSB.shiftTowards(points.bustSB, measurements.waistToArmpit)

  points.bustApexBack = points.bustCB.shift(0, measurements.bustSpan / 2)
  points.HPSBack = new Point(
    points.necklineCB.x + measurements.neckline / 6,
    points.waistCB.y - measurements.hpsToWaistBack
  )
  points.shoulderTipBack = utils.beamsIntersect(
    points.HPSBack,
    points.HPSBack.shift(-measurements.shoulderSlope, 10),
    points.waistCB.shift(0, measurements.shoulderToShoulder / 2),
    points.necklineCB.shift(0, measurements.shoulderToShoulder / 2)
  )
  points.neckCB = utils.beamsIntersect(
    points.waistCB,
    points.necklineCB,
    points.HPSBack,
    points.shoulderTipBack
  )
  let armholeHeight = points.shoulderTipBack.dy(points.armpitBack) / 2
  points.acrossBack = new Point(measurements.acrossBack / 2, points.armpitBack.y - armholeHeight)

  // ease points
  let extraLength = points.necklineCB.dy(points.seatCB) * options.lengthBonus
  let hipsEase = (options.waistEase + options.seatEase) / 2
  let acrossEase = points.waistCB.dx(points.acrossBack) * options.armholeEase
  points.bustEaseSB = points.bustCB.shiftFractionTowards(points.bustSB, 1 + options.chestEase)
  points.waistEaseSB = points.waistCB.shiftFractionTowards(points.waistSB, 1 + options.waistEase)
  points.hipsEaseSB = points.hipsCB.shiftFractionTowards(points.hipsSB, 1 + hipsEase)
  points.seatEaseSB = points.seatCB.shiftFractionTowards(points.seatSB, 1 + options.seatEase)
  points.bottomEaseCB = points.seatCB.shift(-90, extraLength)
  points.bottomEaseSB = points.seatEaseSB.shift(-90, extraLength)
  points.necklineEaseCB = points.neckCB.shiftFractionTowards(
    points.necklineCB,
    1 + options.collarEase
  )
  points.HPSEaseBack = points.neckCB.shiftFractionTowards(points.HPSBack, 1 + options.collarEase)
  points.shoulderTipEaseBack = points.shoulderTipBack.shiftTowards(points.HPSBack, -acrossEase)
  points.acrossEaseBack = points.acrossBack.shift(0, acrossEase)
  points.armpitEaseBack = points.armpitBack.translate(acrossEase * 2, acrossEase * 2)

  // actual armpit point should be at the interception of the waist/bust line and an horizontal line at the armhole point
  points.armpitEaseBack = utils.beamsIntersect(
    points.waistEaseSB,
    points.bustEaseSB,
    points.armpitEaseBack,
    points.armpitEaseBack.shift(0, 1)
  )

  // darts

  // shoulder dart will allow the armhole curve to be smoother, by increasing the shoulder angle
  let shoulderTipToAcrossAngle = points.shoulderTipEaseBack.angle(points.acrossEaseBack)
  let shoulderTipToAcrossDelta = shoulderTipToAcrossAngle - (-measurements.shoulderSlope - 90)
  let hasShoulderBackDart = false
  if (shoulderTipToAcrossDelta > 0) {
    hasShoulderBackDart = true
    // adding a shoulder dart to achieve at least this angle
    points.shoulderSeamCenterBack = points.HPSEaseBack.shiftFractionTowards(
      points.shoulderTipEaseBack,
      0.5
    )
    points.shoulderDartTipBack = points.shoulderSeamCenterBack.shiftTowards(
      points.bustApexBack,
      armholeHeight / 2
    )
    points.shoulderDartLeftBack = points.shoulderDartRightBack = points.shoulderSeamCenterBack
    for (const element of ['shoulderDartRightBack', 'shoulderTipEaseBack']) {
      let nameWithoutDart = element + 'WithoutDart'
      points[nameWithoutDart] = points[element]
      points[element] = points[element].rotate(
        -shoulderTipToAcrossDelta,
        points.shoulderDartTipBack
      )
    }
    // dart trueing
    points.shoulderDartMiddleBack = points.shoulderDartLeftBack.shiftFractionTowards(
      points.shoulderDartRightBack,
      0.5
    )
    macro('mirror', {
      mirror: [points.shoulderDartRightBack, points.shoulderDartTipBack],
      points: ['shoulderTipEaseBack'],
      clone: true,
    })
    points.shoulderDartTrueingMiddleBack = utils.beamsIntersect(
      points.shoulderDartRightBack,
      points.mirroredShoulderTipEaseBack,
      points.shoulderDartTipBack,
      points.shoulderDartMiddleBack
    )
  }

  // waist dart will smooth the angle at the waist side
  let hasWaistCenterDart = false
  let hasWaistBustDart = false
  let waistLineReduction =
    Math.min(points.waistEaseSB.dx(points.bustEaseSB), points.waistEaseSB.dx(points.seatEaseSB)) *
    options.waistDartReduction
  let waistDartCount = parseInt(options.waistDartCount)
  if (waistDartCount >= 2) {
    // adding a center waist dart
    hasWaistCenterDart = true
    points.waistCenterDartRightBack = points.waistCB.shift(0, waistLineReduction / 3)
    let waistCenterDartAngle = (points.bustCB.angle(points.waistCenterDartRightBack) - 270) * 2
    points.waistCenterDartTopTipBack = points.waistCB.shiftFractionTowards(
      points.bustCB,
      1 - waistCenterDartAngle / 180
    )
    points.waistCenterDartBottomTipBack = points.waistCB.shift(
      -90,
      points.waistCenterDartTopTipBack.dy(points.waistCB)
    )
    points.waistEaseSB = points.waistEaseSB.shift(0, waistLineReduction / 3)
    waistLineReduction = waistLineReduction * (2 / 3)
  }
  if (waistDartCount >= 1) {
    hasWaistBustDart = true
    points.waistBustDartCenter = points.waistCB.shift(0, measurements.bustSpan / 2)
    points.waistBustDartLeftBack = points.waistBustDartCenter.shift(180, waistLineReduction / 2)
    let waistBustDartAngle = (270 - points.bustApexBack.angle(points.waistBustDartLeftBack)) * 2
    points.waistBustDartRightBack = points.waistBustDartCenter.shift(0, waistLineReduction / 2)
    points.waistBustDartTopTipBack = points.waistBustDartCenter.shiftFractionTowards(
      points.bustApexBack,
      1 - waistBustDartAngle / 180
    )
    points.waistBustDartBottomTipBack = points.waistBustDartCenter.shift(
      -90,
      points.waistBustDartTopTipBack.dy(points.waistBustDartCenter)
    )
    points.waistEaseSB = points.waistEaseSB.shift(0, waistLineReduction)
  }

  // curves
  // TODO: adjust the hip curve to ensure it follows the hip point
  points.seatEaseSBCp1 = points.seatEaseSB.shift(90, points.waistCB.dy(points.seatCB) / 2)

  points.armpitEaseBackCp1 = points.armpitEaseBack.shift(
    90 + points.waistEaseSB.angle(points.armpitEaseBack),
    points.acrossEaseBack.dx(points.armpitEaseBack)
  )
  points.acrossEaseBackCp2 = points.acrossEaseBack.shift(
    -90,
    points.acrossEaseBack.dy(points.armpitEaseBack) / 1.5
  )
  points.acrossEaseBackCp1 = points.acrossEaseBack.shift(
    90,
    points.shoulderTipEaseBack.dy(points.acrossEaseBack) / 4
  )
  let shoulderTipAnglePoint = hasShoulderBackDart
    ? points.shoulderDartRightBack
    : points.HPSEaseBack
  points.shoulderTipEaseBackCp2 = points.shoulderTipEaseBack.shift(
    shoulderTipAnglePoint.angle(points.shoulderTipEaseBack) - 90,
    points.shoulderTipEaseBack.dy(points.acrossEaseBack) / 4
  )

  points.necklineEaseCBCp2 = points.necklineEaseCB.shift(
    0,
    points.necklineEaseCB.dx(points.HPSEaseBack) / 2
  )
  points.HPSEaseBackCp1 = points.HPSEaseBack.shift(
    90 + points.shoulderTipEaseBack.angle(points.HPSEaseBack),
    points.HPSEaseBack.dy(points.necklineEaseCB)
  )

  // if the bottom is shorter than seat, we adapt the bottom side point
  if (points.bottomEaseSB.dy(points.seatEaseSB) > 0) {
    points.bottomEaseSB = utils.curveIntersectsY(
      points.seatEaseSB,
      points.seatEaseSBCp1,
      points.waistEaseSB,
      points.waistEaseSB,
      points.bottomEaseSB.y
    )
  }

  // control points for body lines
  points.seatSBCp1 = points.seatSB.shift(90, points.waistSB.dy(points.seatSB) / 2)

  points.armpitBackCp1 = points.armpitBack.shift(
    90 + points.waistSB.angle(points.armpitBack),
    points.acrossBack.dx(points.armpitBack) / 1.5
  )
  points.acrossBackCp2 = points.acrossBack.shift(
    -90,
    points.acrossBack.dy(points.armpitBack) / 1.5
  )
  points.acrossBackCp1 = points.acrossBack.shift(
    90,
    points.shoulderTipBack.dy(points.acrossBack) / 4
  )
  points.shoulderTipBackCp2 = points.shoulderTipBack.shift(
    -90 - measurements.shoulderSlope,
    points.shoulderTipBack.dy(points.acrossBack) / 4
  )

  points.HPSBackCp1 = points.HPSBack.shift(
    -90 - measurements.shoulderSlope,
    points.HPSBack.dy(points.necklineCB)
  )
  points.necklineCBCp2 = points.necklineCB.shift(0, points.necklineCB.dx(points.HPSBack) / 1.5)

  if (options.drawBodyLines) {
    paths.body_lines = new Path()
      .move(points.waistCB)
      .line(points.hipsCB)
      .line(points.seatCB)
      .line(points.seatSB)
      .curve_(points.seatSBCp1, points.waistSB)
      .line(points.bustSB)
      .line(points.armpitBack)
      .curve(points.armpitBackCp1, points.acrossBackCp2, points.acrossBack)
      .curve(points.acrossBackCp1, points.shoulderTipBackCp2, points.shoulderTipBack)
      .line(points.HPSBack)
      .curve(points.HPSBackCp1, points.necklineCBCp2, points.necklineCB)
      .line(points.bustCB)
      .line(points.waistCB)
      .close()
      .attr('class', 'note')
  }

  paths.saBase = new Path()
    .move(points.bottomEaseCB)
    .line(points.bottomEaseSB)
    .noop('seatSide')
    .curve_(points.seatEaseSBCp1, points.waistEaseSB)
    .line(points.armpitEaseBack)
    .curve(points.armpitEaseBackCp1, points.acrossEaseBackCp2, points.acrossEaseBack)
    .curve(points.acrossEaseBackCp1, points.shoulderTipEaseBackCp2, points.shoulderTipEaseBack)
    .noop('shoulderDart')
    .line(points.HPSEaseBack)
    .curve(points.HPSEaseBackCp1, points.necklineEaseCBCp2, points.necklineEaseCB)

  if (points.bottomEaseSB.dy(points.seatEaseSB) <= 0) {
    paths.saBase = paths.saBase.insop('seatSide', new Path().line(points.seatEaseSB))
  }

  if (hasShoulderBackDart) {
    paths.saBase = paths.saBase.insop(
      'shoulderDart',
      new Path()
        .line(points.shoulderDartRightBack)
        .line(points.shoulderDartTrueingMiddleBack)
        .line(points.shoulderDartLeftBack)
    )
    paths.shoulderDart = new Path()
      .move(points.shoulderDartRightBack)
      .line(points.shoulderDartTipBack)
      .line(points.shoulderDartLeftBack)
      .attr('class', 'fabric')
  }

  if (hasWaistCenterDart) {
    paths.waistCenterDart = new Path()
      .move(points.waistCenterDartTopTipBack)
      .line(points.waistCenterDartRightBack)
      .line(points.waistCenterDartBottomTipBack)
      .attr('class', 'fabric')
  }

  if (hasWaistBustDart) {
    paths.waistBustDart = new Path()
      .move(points.waistBustDartTopTipBack)
      .line(points.waistBustDartLeftBack)
      .line(points.waistBustDartBottomTipBack)
      .line(points.waistBustDartRightBack)
      .line(points.waistBustDartTopTipBack)
      .close()
      .attr('class', 'fabric')
  }

  paths.seam = new Path()
    .move(points.waistCB)
    .line(points.hipsCB)
    .line(points.bottomEaseCB)
    .join(paths.saBase)
    .line(points.bustCB)
    .line(points.waistCB)
    .close()
    .attr('class', 'fabric')

  // Store some measurements for the sleeve
  let upperArmhole = new Path()
    .move(points.acrossBack)
    .curve(points.acrossBackCp1, points.shoulderTipBackCp2, points.shoulderTipBack)
  let lowerArmhole = new Path()
    .move(points.armpitBack)
    .curve(points.armpitBackCp1, points.acrossBackCp2, points.acrossBack)
  let lowerArmholeLength = lowerArmhole.length()
  let armholeLength = lowerArmholeLength + upperArmhole.length()
  store.set('armholeLengthBack', armholeLength)
  store.set('armholeHeightBack', points.shoulderTipBack.dy(points.armpitBack))

  let upperArmholeEase = new Path()
    .move(points.acrossEaseBack)
    .curve(points.acrossEaseBackCp1, points.shoulderTipEaseBackCp2, points.shoulderTipEaseBack)
  let lowerArmholeEase = new Path()
    .move(points.armpitEaseBack)
    .curve(points.armpitEaseBackCp1, points.acrossEaseBackCp2, points.acrossEaseBack)
  let lowerArmholeEaseLength = lowerArmholeEase.length()
  let armholeEaseLength = lowerArmholeEaseLength + upperArmholeEase.length()
  store.set('armholeLengthEaseBack', armholeEaseLength)
  store.set('armholeHeightEaseBack', points.shoulderTipEaseBack.dy(points.armpitEaseBack))

  if (complete) {
    paths.waistLine = new Path().move(points.waistCB).line(points.waistEaseSB).attr('class', 'help')
    points.hipsSBLine = utils.beamIntersectsCurve(
      points.hipsCB,
      points.hipsEaseSB,
      points.seatEaseSB,
      points.seatEaseSBCp1,
      points.waistEaseSB,
      points.waistEaseSB
    )
    paths.hipsLine = new Path().move(points.hipsCB).line(points.hipsSBLine).attr('class', 'help')
    if (points.armpitEaseBack.y > points.bustEaseSB.y) {
      points.bustSBLine = utils.beamIntersectsCurve(
        points.bustCB,
        points.bustEaseSB,
        points.armpitEaseBack,
        points.armpitEaseBackCp1,
        points.acrossEaseBackCp2,
        points.acrossEaseBack
      )
    } else {
      points.bustSBLine = points.bustEaseSB
    }

    paths.bustLine = new Path().move(points.bustCB).line(points.bustSBLine).attr('class', 'help')
    if (options.lengthBonus >= 0) {
      paths.seatLine = new Path().move(points.seatCB).line(points.seatEaseSB).attr('class', 'help')
    }

    if (sa) {
      paths.sa = new Path()
        .move(points.bottomEaseCB)
        .join(paths.saBase.offset(sa))
        .line(points.necklineEaseCB)
        .attr('class', 'fabric sa')
    }

    store.cutlist.setCut({ cut: 1, from: 'fabric', onFold: true })

    macro('cutonfold', {
      from: points.necklineEaseCB.shiftFractionTowards(points.bottomEaseCB, 1 / 6),
      to: points.bottomEaseCB.shiftFractionTowards(points.necklineEaseCB, 1 / 6),
      grainline: true,
    })

    points.title = points.acrossEaseBack.shift(
      180,
      (points.waistCB.dx(points.acrossEaseBack) * 3) / 4
    )
    macro('title', {
      nr: '2',
      at: points.title,
      brand: 'Morgane l’a fait !',
      title: 'Back',
    })

    // notches
    let notches = ['waistEaseSB']
    if (options.lengthBonus > 0) {
      notches.push('seatEaseSB')
    }
    if (hasShoulderBackDart) {
      notches.push('shoulderDartRightBack', 'shoulderDartLeftBack', 'shoulderDartTipBack')
    }
    if (hasWaistBustDart) {
      notches.push(
        'waistBustDartTopTipBack',
        'waistBustDartLeftBack',
        'waistBustDartBottomTipBack',
        'waistBustDartRightBack'
      )
    }
    if (hasWaistCenterDart) {
      notches.push(
        'waistCenterDartTopTipBack',
        'waistCenterDartBottomTipBack',
        'waistCenterDartRightBack'
      )
    }
    macro('sprinkle', {
      snippet: 'notch',
      on: notches,
    })
    snippets.acrossBackNotch = new Snippet('bnotch', points.acrossEaseBack)

    // TODO: add paperless annotations
  }

  return part
}

export const back = {
  name: 'back',
  options: {
    // Fit
    armholeEase: { pct: 0, min: 0, max: 15, menu: 'fit' },
    chestEase: { pct: 5, min: -4, max: 20, menu: 'fit' },
    collarEase: { pct: 5, min: 0, max: 50, menu: 'fit' },
    seatEase: { pct: 5, min: -4, max: 20, menu: 'fit' },
    waistEase: { pct: 5, min: -4, max: 20, menu: 'fit' },
    // Style
    lengthBonus: { pct: 0, min: -4, max: 60, menu: 'style' },
    waistDartCount: { count: 1, min: 0, max: 2, menu: 'style' },
    waistDartReduction: { pct: 50, min: 20, max: 80, menu: 'style' },
    // Advanced
    shoulderSlopeReduction: { pct: 0, min: 0, max: 80, menu: 'advanced' },
    drawBodyLines: { bool: true, menu: 'advanced' },
  },
  plugins: [measurementsPlugin],
  measurements: [
    'acrossBack',
    'chest',
    'bustFront',
    'bustPointToUnderbust',
    'bustSpan',
    'hips',
    'hpsToBust',
    'hpsToWaistBack',
    'neck',
    'neckline',
    'seatBack',
    'shoulderSlope',
    'shoulderToShoulder',
    'underbust',
    'waistBack',
    'waistToArmpit',
    'waistToHips',
    'waistToUnderbust',
    'waistToSeat',
    'waistToNecklineBack',
  ],
  draft: draftBack,
}
