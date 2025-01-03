import { measurementsPlugin } from '@freesewing/plugin-measurements'

function draftFront({
  options,
  Point,
  Path,
  points,
  paths,
  measurements,
  // Snippet,
  // snippets,
  sa,
  complete,
  // log,
  macro,
  store,
  utils,
  part,
}) {
  // body points
  points.waistCF = new Point(0, 0)
  points.hipsCF = points.waistCF.shift(-90, measurements.waistToHips)
  points.seatCF = points.waistCF.shift(-90, measurements.waistToSeat)
  points.bustCF = points.waistCF.shift(
    90,
    measurements.waistToUnderbust + measurements.bustPointToUnderbust
  )
  points.necklineCF = points.waistCF.shift(90, measurements.waistToNecklineFront)

  points.waistSF = points.waistCF.shift(0, measurements.waistFront / 2)
  points.hipsSF = points.hipsCF.shift(0, measurements.hips / 4)
  points.seatSF = points.seatCF.shift(0, measurements.seatFront / 2)
  points.bustSF = points.bustCF.shift(0, measurements.bustFront / 2)
  points.armpitFront = points.waistSF.shiftTowards(points.bustSF, measurements.waistToArmpit)

  points.bustApexFront = points.bustCF.shift(0, measurements.bustSpan / 2)
  points.HPSFront = new Point(
    points.necklineCF.x + measurements.neckline / 6,
    points.waistCF.y - measurements.hpsToWaistFront
  )
  points.shoulderTipFront = utils.beamsIntersect(
    points.HPSFront,
    points.HPSFront.shift(-measurements.shoulderSlope, 10),
    points.waistCF.shift(0, measurements.shoulderToShoulder / 2),
    points.necklineCF.shift(0, measurements.shoulderToShoulder / 2)
  )
  points.neckCF = utils.beamsIntersect(
    points.waistCF,
    points.necklineCF,
    points.HPSFront,
    points.shoulderTipFront
  )
  let armholeHeight = points.shoulderTipFront.dy(points.armpitFront) / 2
  points.acrossFront = new Point(measurements.acrossFront / 2, points.armpitFront.y - armholeHeight)

  // ease points
  let extraLength = points.necklineCF.dy(points.seatCF) * options.lengthBonus
  let hipsEase = (options.waistEase + options.seatEase) / 2
  let acrossEase = points.waistCF.dx(points.acrossFront) * options.armholeEase
  points.bustEaseSF = points.bustCF.shiftFractionTowards(points.bustSF, 1 + options.chestEase)
  points.waistEaseSF = points.waistCF.shiftFractionTowards(points.waistSF, 1 + options.waistEase)
  points.hipsEaseSF = points.hipsCF.shiftFractionTowards(points.hipsSF, 1 + hipsEase)
  points.seatEaseSF = points.seatCF.shiftFractionTowards(points.seatSF, 1 + options.seatEase)
  points.bottomEaseCF = points.seatCF.shift(-90, extraLength)
  points.bottomEaseSF = points.seatEaseSF.shift(-90, extraLength)
  points.necklineEaseCF = points.neckCF.shiftFractionTowards(
    points.necklineCF,
    1 + options.collarEase
  )
  points.HPSEaseFront = points.neckCF.shiftFractionTowards(points.HPSFront, 1 + options.collarEase)
  points.shoulderTipEaseFront = points.shoulderTipFront.shiftTowards(points.HPSFront, -acrossEase)
  points.acrossEaseFront = points.acrossFront.shift(0, acrossEase)
  points.armpitEaseFront = points.armpitFront.translate(acrossEase * 2, acrossEase * 2)

  // actual armpit point should be at the interception of the waist/bust line and an horizontal line at the armhole point
  points.armpitEaseFront = utils.beamsIntersect(
    points.waistEaseSF,
    points.bustEaseSF,
    points.armpitEaseFront,
    points.armpitEaseFront.shift(0, 1)
  )
  // darts

  // bust dart will take into account the breasts thanks to the difference between
  // bustFront and highBustFront
  let FBAFront =
    ((measurements.bustFront - measurements.highBustFront) / 2) * (1 + options.chestEase)
  points.underBustFront = points.bustApexFront.shift(-90, measurements.bustPointToUnderbust)
  points.FBAFront = points.bustApexFront.shift(180, FBAFront)
  let frontBustDartAngle = Math.max(
    0,
    points.underBustFront.angle(points.FBAFront) - points.underBustFront.angle(points.bustApexFront)
  )
  // log.info('bustDartAngle = ' + frontBustDartAngle)
  // paths.FBADebug = new Path()
  //   .move(points.bustApexFront)
  //   .line(points.underBustFront)
  //   .line(points.FBAFront)
  //   .attr('class', 'various')
  let hasBustFrontDart = false
  if (frontBustDartAngle > 0) {
    hasBustFrontDart = true
    // adding a shoulder dart
    points.shoulderSeamCenterFront = points.HPSEaseFront.shiftFractionTowards(
      points.shoulderTipEaseFront,
      0.5
    )
    points.bustDartTipFront = points.shoulderSeamCenterFront.shiftFractionTowards(
      points.bustApexFront,
      1 - frontBustDartAngle / 180
    )
    points.bustDartLeftFront = points.bustDartRightFront = points.shoulderSeamCenterFront
    for (const element of ['bustDartRightFront', 'shoulderTipEaseFront', 'acrossEaseFront']) {
      let nameWithoutDart = element + 'WithoutDart'
      points[nameWithoutDart] = points[element]
      points[element] = points[element].rotate(-frontBustDartAngle, points.bustDartTipFront)
    }
    // dart trueing
    points.bustDartMiddleFront = points.bustDartLeftFront.shiftFractionTowards(
      points.bustDartRightFront,
      0.5
    )
    macro('mirror', {
      mirror: [points.bustDartRightFront, points.bustDartTipFront],
      points: ['shoulderTipEaseFront'],
      clone: true,
    })
    points.bustDartTrueingMiddleFront = utils.beamsIntersect(
      points.bustDartRightFront,
      points.mirroredShoulderTipEaseFront,
      points.bustDartTipFront,
      points.bustDartMiddleFront
    )
  }

  // waist dart will smooth the angle at the waist side
  let hasWaistCenterDart = false
  let hasWaistBustDart = false
  let waistLineReduction =
    Math.min(points.waistEaseSF.dx(points.bustEaseSF), points.waistEaseSF.dx(points.seatEaseSF)) *
    options.waistDartReduction
  let waistDartCount = parseInt(options.waistDartCount)
  if (waistDartCount >= 1) {
    hasWaistBustDart = true
    points.waistBustDartCenter = points.waistCF.shift(0, measurements.bustSpan / 2)
    points.waistBustDartLeftFront = points.waistBustDartCenter.shift(180, waistLineReduction / 2)
    let waistBustDartAngle = (270 - points.bustApexFront.angle(points.waistBustDartLeftFront)) * 2
    points.waistBustDartRightFront = points.waistBustDartCenter.shift(0, waistLineReduction / 2)
    points.waistBustDartTopTipFront = points.waistBustDartCenter.shiftFractionTowards(
      points.bustApexFront,
      1 - waistBustDartAngle / 180
    )
    points.waistBustDartBottomTipFront = points.waistBustDartCenter.shift(
      -90,
      points.waistBustDartTopTipFront.dy(points.waistBustDartCenter)
    )
    points.waistEaseSF = points.waistEaseSF.shift(0, waistLineReduction)
  }

  // curves
  // TODO: adjust the hip curve to ensure it follows the hip point
  points.seatEaseSFCp1 = points.seatEaseSF.shift(90, points.waistCF.dy(points.seatCF) / 2)

  points.armpitEaseFrontCp1 = points.armpitEaseFront.shift(
    90 + points.waistEaseSF.angle(points.armpitEaseFront),
    points.acrossEaseFront.dx(points.armpitEaseFront)
  )
  points.acrossEaseFrontCp2 = points.acrossEaseFront.shift(
    -90 - frontBustDartAngle,
    points.acrossEaseFront.dy(points.armpitEaseFront) / 1.5
  )
  points.acrossEaseFrontCp1 = points.acrossEaseFront.shift(
    90 - frontBustDartAngle,
    points.shoulderTipEaseFront.dy(points.acrossEaseFront) / 4
  )
  let shoulderTipAnglePoint = hasBustFrontDart ? points.bustDartRightFront : points.HPSEaseFront
  points.shoulderTipEaseFrontCp2 = points.shoulderTipEaseFront.shift(
    shoulderTipAnglePoint.angle(points.shoulderTipEaseFront) - 90,
    points.shoulderTipEaseFront.dy(points.acrossEaseFront) / 4
  )

  points.necklineEaseCFCp2 = points.necklineEaseCF.shift(
    0,
    points.necklineEaseCF.dx(points.HPSEaseFront) / 2
  )
  points.HPSEaseFrontCp1 = points.HPSEaseFront.shift(
    90 + points.shoulderTipEaseFront.angle(points.HPSEaseFront),
    points.HPSEaseFront.dy(points.necklineEaseCF)
  )

  // if the bottom is shorter than seat, we adapt the bottom side point
  if (points.bottomEaseSF.dy(points.seatEaseSF) > 0) {
    points.bottomEaseSF = utils.curveIntersectsY(
      points.seatEaseSF,
      points.seatEaseSFCp1,
      points.waistEaseSF,
      points.waistEaseSF,
      points.bottomEaseSF.y
    )
  }

  // control points for body lines
  points.seatSFCp1 = points.seatSF.shift(90, points.waistSF.dy(points.seatSF) / 2)

  points.armpitFrontCp1 = points.armpitFront.shift(
    90 + points.waistSF.angle(points.armpitFront),
    points.acrossFront.dx(points.armpitFront) / 1.5
  )
  points.acrossFrontCp2 = points.acrossFront.shift(
    -90,
    points.acrossFront.dy(points.armpitFront) / 1.5
  )
  points.acrossFrontCp1 = points.acrossFront.shift(
    90,
    points.shoulderTipFront.dy(points.acrossFront) / 4
  )
  points.shoulderTipFrontCp2 = points.shoulderTipFront.shift(
    -90 - measurements.shoulderSlope,
    points.shoulderTipFront.dy(points.acrossFront) / 4
  )

  points.HPSFrontCp1 = points.HPSFront.shift(
    -90 - measurements.shoulderSlope,
    points.HPSFront.dy(points.necklineCF)
  )
  points.necklineCFCp2 = points.necklineCF.shift(0, points.necklineCF.dx(points.HPSFront) / 1.5)

  if (options.drawBodyLines) {

    paths.body_lines = new Path()
      .move(points.waistCF)
      .line(points.hipsCF)
      .line(points.seatCF)
      .line(points.seatSF)
      .curve_(points.seatSFCp1, points.waistSF)
      .line(points.bustSF)
      .line(points.armpitFront)
      .curve(points.armpitFrontCp1, points.acrossFrontCp2, points.acrossFront)
      .curve(points.acrossFrontCp1, points.shoulderTipFrontCp2, points.shoulderTipFront)
      .line(points.HPSFront)
      .curve(points.HPSFrontCp1, points.necklineCFCp2, points.necklineCF)
      .line(points.bustCF)
      .line(points.waistCF)
      .close()
      .attr('class', 'note')
  }

  paths.seam = new Path()
    .move(points.waistCF)
    .line(points.hipsCF)
    .line(points.bottomEaseCF)
    .line(points.bottomEaseSF)
    .noop('seatSide')
    .curve_(points.seatEaseSFCp1, points.waistEaseSF)
    .line(points.armpitEaseFront)
    .curve(points.armpitEaseFrontCp1, points.acrossEaseFrontCp2, points.acrossEaseFront)
    .curve(points.acrossEaseFrontCp1, points.shoulderTipEaseFrontCp2, points.shoulderTipEaseFront)
    .noop('bustDart')
    .line(points.HPSEaseFront)
    .curve(points.HPSEaseFrontCp1, points.necklineEaseCFCp2, points.necklineEaseCF)
    .line(points.bustCF)
    .line(points.waistCF)
    .close()
    .attr('class', 'fabric')

  if (points.bottomEaseSF.dy(points.seatEaseSF) <= 0) {
    paths.seam = paths.seam.insop('seatSide', new Path().line(points.seatEaseSF))
  }

  if (hasBustFrontDart) {
    paths.seam = paths.seam.insop(
      'bustDart',
      new Path()
        .line(points.bustDartRightFront)
        .line(points.bustDartTrueingMiddleFront)
        .line(points.bustDartLeftFront)
    )
    paths.bustDart = new Path()
      .move(points.bustDartRightFront)
      .line(points.bustDartTipFront)
      .line(points.bustDartLeftFront)
      .attr('class', 'fabric')
  }

  if (hasWaistCenterDart) {
    paths.waistCenterDart = new Path()
      .move(points.waistCenterDartTopTipFront)
      .line(points.waistCenterDartRightFront)
      .line(points.waistCenterDartBottomTipFront)
      .attr('class', 'fabric')
  }

  if (hasWaistBustDart) {
    paths.waistBustDart = new Path()
      .move(points.waistBustDartTopTipFront)
      .line(points.waistBustDartLeftFront)
      .line(points.waistBustDartBottomTipFront)
      .line(points.waistBustDartRightFront)
      .line(points.waistBustDartTopTipFront)
      .close()
      .attr('class', 'fabric')
  }

  // Store some measurements for the sleeve
  let upperArmhole = new Path()
    .move(points.acrossFront)
    .curve(points.acrossFrontCp1, points.shoulderTipFrontCp2, points.shoulderTipFront)
  let lowerArmhole = new Path()
    .move(points.armpitFront)
    .curve(points.armpitFrontCp1, points.acrossFrontCp2, points.acrossFront)
  let lowerArmholeLength = lowerArmhole.length()
  let armholeLength = lowerArmholeLength + upperArmhole.length()
  store.set('armholeLengthFront', armholeLength)
  store.set('armholeHeightFront', points.shoulderTipFront.dy(points.armpitFront))

  let upperArmholeEase = new Path()
    .move(points.acrossEaseFront)
    .curve(points.acrossEaseFrontCp1, points.shoulderTipEaseFrontCp2, points.shoulderTipEaseFront)
  let lowerArmholeEase = new Path()
    .move(points.armpitEaseFront)
    .curve(points.armpitEaseFrontCp1, points.acrossEaseFrontCp2, points.acrossEaseFront)
  let lowerArmholeEaseLength = lowerArmholeEase.length()
  let armholeEaseLength = lowerArmholeEaseLength + upperArmholeEase.length()
  store.set('armholeLengthEaseFront', armholeEaseLength)
  store.set('armholeHeightEaseFront', points.shoulderTipEaseFront.dy(points.armpitEaseFront))

  if (complete) {
    paths.waistLine = new Path().move(points.waistCF).line(points.waistEaseSF).attr('class', 'help')
    points.hipsSFLine = utils.beamIntersectsCurve(
      points.hipsCF,
      points.hipsEaseSF,
      points.seatEaseSF,
      points.seatEaseSFCp1,
      points.waistEaseSF,
      points.waistEaseSF
    )
    paths.hipsLine = new Path().move(points.hipsCF).line(points.hipsSFLine).attr('class', 'help')
    if (points.armpitEaseFront.y > points.bustEaseSF.y) {
      points.bustSFLine = utils.beamIntersectsCurve(
        points.bustCF,
        points.bustEaseSF,
        points.armpitEaseFront,
        points.armpitEaseFrontCp1,
        points.acrossEaseFrontCp2,
        points.acrossEaseFront
      )
    } else {
      points.bustSFLine = points.bustEaseSF
    }

    paths.bustLine = new Path().move(points.bustCF).line(points.bustSFLine).attr('class', 'help')
    if (options.lengthBonus >= 0) {
      paths.seatLine = new Path().move(points.seatCF).line(points.seatEaseSF).attr('class', 'help')
    }

    if (sa) {
      paths.sa = paths.seam.offset(sa).attr('class', 'fabric sa')
    }

    store.cutlist.setCut({ cut: 2, from: 'fabric' })

    const grainlineDistance = points.waistCF.dx(points.armpitEaseFront) * 0.2
    points.grainlineTop = points.necklineEaseCF.shift(0, grainlineDistance)
    points.grainlineBottom = points.bottomEaseCF.shift(0, grainlineDistance)

    macro('grainline', {
      from: points.grainlineTop.shiftFractionTowards(points.grainlineBottom, 1 / 6),
      to: points.grainlineBottom.shiftFractionTowards(points.grainlineTop, 1 / 6),
    })

    points.title = points.acrossEaseFront.shift(
      180,
      (points.waistCF.dx(points.acrossEaseFront) * 3) / 4
    )
    macro('title', {
      nr: '1',
      at: points.title,
      brand: 'Morgane l’a fait !',
      title: 'Front',
    })

    // notches
    let notches = ['waistEaseSF', 'acrossEaseFront']
    if (options.lengthBonus > 0) {
      notches.push('seatEaseSF')
    }
    if (hasBustFrontDart) {
      notches.push('bustDartRightFront', 'bustDartLeftFront', 'bustDartTipFront')
    }
    if (hasWaistBustDart) {
      notches.push(
        'waistBustDartTopTipFront',
        'waistBustDartLeftFront',
        'waistBustDartBottomTipFront',
        'waistBustDartRightFront'
      )
    }
    if (hasWaistCenterDart) {
      notches.push(
        'waistCenterDartTopTipFront',
        'waistCenterDartBottomTipFront',
        'waistCenterDartRightFront'
      )
    }
    macro('sprinkle', {
      snippet: 'notch',
      on: notches,
    })

    // TODO: add paperless annotations
  }

  return part
}

export const front = {
  name: 'front',
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
    'acrossFront',
    'chest',
    'bustFront',
    'bustPointToUnderbust',
    'bustSpan',
    'highBustFront',
    'hips',
    'hpsToBust',
    'hpsToWaistFront',
    'neck',
    'neckline',
    'seat',
    'seatBack',
    'shoulderSlope',
    'shoulderToShoulder',
    'underbust',
    'waist',
    'waistBack',
    'waistToArmpit',
    'waistToHips',
    'waistToUnderbust',
    'waistToSeat',
    'waistToNecklineFront',
  ],
  draft: draftFront,
}
