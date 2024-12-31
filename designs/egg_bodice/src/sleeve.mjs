import { measurementsPlugin } from '@freesewing/plugin-measurements'
import { front } from './front.mjs'
import { back } from './back.mjs'

function draftSleeve({
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
  log,
  macro,
  store,
  utils,
  part,
}) {
  let sleeveHeadHeight = (store.get('armholeHeightFront') + store.get('armholeHeightBack')) / 2
  let sleeveHeadHeightEase = (store.get('armholeHeightEaseFront') + store.get('armholeHeightEaseBack')) / 2
  let sleeveShoulderTipDelta = (store.get('armholeLengthFront') - store.get('armholeLengthBack')) / 2
  log.info('armholeLengthFront = ' + store.get('armholeLengthFront') + ', back = ' + store.get('armholeLengthBack') + ', delta = ' + sleeveShoulderTipDelta)
  // points
  points.sleeveArmpitCenter = new Point(0, 0)
  points.sleeveArmpitBack = points.sleeveArmpitCenter.shift(180, measurements.biceps / 2)
  points.sleeveArmpitFront = points.sleeveArmpitBack.shift(0, measurements.biceps)
  points.sleeveHeadCenter = points.sleeveArmpitCenter.shift(90, sleeveHeadHeight)
  points.sleeveElbowCenter = points.sleeveArmpitCenter.shift(-90, measurements.shoulderToElbow)
  points.sleeveWristCenter = points.sleeveHeadCenter.shift(-90, measurements.shoulderToWrist)
  points.sleeveWristBack = points.sleeveWristCenter.shift(180, measurements.wrist / 2)
  points.sleeveWristFront = points.sleeveWristBack.shift(0, measurements.wrist)

  // ease points
  points.sleeveArmpitEaseBack = points.sleeveArmpitBack.shift(180, (measurements.biceps * options.bicepsEase) / 2)
  points.sleeveArmpitEaseFront = points.sleeveArmpitEaseBack.shift(0, measurements.biceps * (1 + options.bicepsEase))
  points.sleeveHeadEaseCenter = points.sleeveArmpitCenter.shift(90, sleeveHeadHeightEase)
  points.sleeveBottomCenter = points.sleeveWristCenter.shiftFractionTowards(points.sleeveHeadCenter, - options.sleeveLengthBonus)

  points.fullSleeveWristEaseBack = points.sleeveWristBack.shiftFractionTowards(points.sleeveWristFront, - options.cuffEase)
  points.fullSleeveWristEaseFront = points.sleeveWristFront.shiftFractionTowards(points.sleeveWristBack, - options.cuffEase)
  // if options.sleeveLengthBonus is negative, we cut from the full seamline to
  // accomodate bigger circumference
  if ( options.sleeveLengthBonus < 0 ) {
    points.sleeveBottomEaseBack = utils.beamIntersectsY(points.sleeveArmpitEaseBack, points.fullSleeveWristEaseBack, points.sleeveBottomCenter.y)
    points.sleeveBottomEaseFront = utils.beamIntersectsY(points.sleeveArmpitEaseFront, points.fullSleeveWristEaseFront, points.sleeveBottomCenter.y)
  } else {
    points.sleeveBottomEaseBack = new Point(points.fullSleeveWristEaseBack.x, points.sleeveBottomCenter.y)
    points.sleeveBottomEaseFront = new Point(points.fullSleeveWristEaseFront.x, points.sleeveBottomCenter.y)
  }

  points.sleeveHeadMiddleEaseBack = points.sleeveHeadEaseCenter.shiftFractionTowards(points.sleeveArmpitEaseBack, .5)
  points.sleeveHeadMiddleEaseFront = points.sleeveHeadEaseCenter.shiftFractionTowards(points.sleeveArmpitEaseFront, .5)
  let sleeveHeadDiagonalAngleFront = points.sleeveHeadEaseCenter.angle(points.sleeveArmpitEaseFront)
  let sleeveHeadDiagonalAngleBack = points.sleeveHeadEaseCenter.angle(points.sleeveArmpitEaseBack)
  // TODO: figure out how to make these values fully parametric
  let sleeveHeadBackCurveInnerShift = 25
  let sleeveHeadBackCurveOuterShift = 18
  let sleeveHeadFrontCurveInnerShift = 25
  let sleeveHeadFrontCurveOuterShift = 16

  points.sleeveHeadInnerBack = points.sleeveHeadMiddleEaseBack.shiftFractionTowards(points.sleeveArmpitEaseBack, .5).shift(sleeveHeadDiagonalAngleBack + 90, sleeveHeadBackCurveInnerShift)
  points.sleeveHeadOuterBack = points.sleeveHeadMiddleEaseBack.shiftFractionTowards(points.sleeveHeadEaseCenter, .5).shift(sleeveHeadDiagonalAngleBack - 90, sleeveHeadBackCurveOuterShift)
  points.sleeveHeadInnerFront = points.sleeveHeadMiddleEaseFront.shiftFractionTowards(points.sleeveArmpitEaseFront, .5).shift(sleeveHeadDiagonalAngleFront - 90, sleeveHeadFrontCurveInnerShift)
  points.sleeveHeadOuterFront = points.sleeveHeadMiddleEaseFront.shiftFractionTowards(points.sleeveHeadEaseCenter, .5).shift(sleeveHeadDiagonalAngleFront + 90, sleeveHeadFrontCurveOuterShift)

  // curves

  // the main one, the sleeve head!

  // Front part
  let d_armpit_inner_front = points.sleeveHeadInnerFront.dist(points.sleeveArmpitEaseFront)
  let d_middle_inner_front = points.sleeveHeadMiddleEaseFront.dist(points.sleeveHeadInnerFront)
  let d_outer_middle_front = points.sleeveHeadOuterFront.dist(points.sleeveHeadMiddleEaseFront)
  let d_center_outer_front = points.sleeveHeadEaseCenter.dx(points.sleeveHeadOuterFront)
  points.sleeveArmpitEaseFrontCp1 = points.sleeveArmpitEaseFront.shift(
    points.sleeveArmpitEaseFront.angle(points.sleeveBottomEaseFront) - 90,
    d_armpit_inner_front * 2/3
  )
  points.sleeveHeadInnerFrontCp2 = points.sleeveHeadInnerFront.shift(
    sleeveHeadDiagonalAngleFront,
    d_armpit_inner_front / 4
  )
  points.sleeveHeadInnerFrontCp1 = points.sleeveHeadInnerFront.shift(
    sleeveHeadDiagonalAngleFront + 180,
    d_middle_inner_front / 4
  )
  points.sleeveHeadOuterFrontCp2 = points.sleeveHeadOuterFront.shift(
    sleeveHeadDiagonalAngleFront,
    d_outer_middle_front / 4
  )
  points.sleeveHeadOuterFrontCp1 = points.sleeveHeadOuterFront.shift(
    sleeveHeadDiagonalAngleFront + 180,
    d_center_outer_front / 4
  )

  let sleeveHeadMiddleFrontAngle = (points.sleeveHeadOuterFrontCp2.angle(points.sleeveHeadMiddleEaseFront) + points.sleeveHeadMiddleEaseFront.angle(points.sleeveHeadInnerFrontCp1)) / 2
  points.sleeveHeadMiddleEaseFrontCp2 = points.sleeveHeadMiddleEaseFront.shift(sleeveHeadMiddleFrontAngle, d_middle_inner_front / 2)
  points.sleeveHeadMiddleEaseFrontCp1 = points.sleeveHeadMiddleEaseFront.shift(sleeveHeadMiddleFrontAngle + 180, d_outer_middle_front / 2)
  points.sleeveHeadEaseCenterCp2 = utils.beamIntersectsY(points.sleeveHeadOuterFront, points.sleeveHeadOuterFrontCp1, points.sleeveHeadEaseCenter.y)

  if ( sleeveShoulderTipDelta > 0 ) {
    points.sleeveShoulderTipEase = new Path()
      .move(points.sleeveHeadEaseCenter)
      .curve(points.sleeveHeadEaseCenterCp2, points.sleeveHeadOuterFrontCp1, points.sleeveHeadOuterFront)
      .shiftAlong(sleeveShoulderTipDelta)
  }
  let sleeveHeadFront = new Path()
    .move(points.sleeveArmpitEaseFront)
    .curve(points.sleeveArmpitEaseFrontCp1, points.sleeveHeadInnerFrontCp2, points.sleeveHeadInnerFront)
    .curve(points.sleeveHeadInnerFrontCp1, points.sleeveHeadMiddleEaseFrontCp2, points.sleeveHeadMiddleEaseFront)
    .curve(points.sleeveHeadMiddleEaseFrontCp1, points.sleeveHeadOuterFrontCp2, points.sleeveHeadOuterFront)
    .curve(points.sleeveHeadOuterFrontCp1, points.sleeveHeadEaseCenterCp2, points.sleeveHeadEaseCenter)

  let sleeveHeadFrontLength = sleeveHeadFront.length() - sleeveShoulderTipDelta
  log.info('sleeveHeadFrontLength = ' + sleeveHeadFrontLength)

  // Back part
  let d_armpit_inner_Back = Math.abs(points.sleeveHeadInnerBack.dist(points.sleeveArmpitEaseBack))
  let d_middle_inner_Back = Math.abs(points.sleeveHeadMiddleEaseBack.dist(points.sleeveHeadInnerBack))
  let d_outer_middle_Back = Math.abs(points.sleeveHeadOuterBack.dist(points.sleeveHeadMiddleEaseBack))
  let d_center_outer_Back = Math.abs(points.sleeveHeadEaseCenter.dx(points.sleeveHeadOuterBack))
  points.sleeveArmpitEaseBackCp2 = points.sleeveArmpitEaseBack.shift(
    points.sleeveArmpitEaseBack.angle(points.sleeveBottomEaseBack) + 90,
    d_armpit_inner_Back * 2/3
  )
  points.sleeveHeadInnerBackCp1 = points.sleeveHeadInnerBack.shift(
    sleeveHeadDiagonalAngleBack,
    d_armpit_inner_Back / 4
  )
  points.sleeveHeadInnerBackCp2 = points.sleeveHeadInnerBack.shift(
    sleeveHeadDiagonalAngleBack + 180,
    d_middle_inner_Back / 4
  )
  points.sleeveHeadOuterBackCp1 = points.sleeveHeadOuterBack.shift(
    sleeveHeadDiagonalAngleBack,
    d_outer_middle_Back / 4
  )
  points.sleeveHeadOuterBackCp2 = points.sleeveHeadOuterBack.shift(
    sleeveHeadDiagonalAngleBack + 180,
    d_center_outer_Back / 4
  )

  let sleeveHeadMiddleBackAngle = (points.sleeveHeadOuterBackCp1.angle(points.sleeveHeadMiddleEaseBack) + points.sleeveHeadMiddleEaseBack.angle(points.sleeveHeadInnerBackCp2)) / 2
  points.sleeveHeadMiddleEaseBackCp1 = points.sleeveHeadMiddleEaseBack.shift(sleeveHeadMiddleBackAngle, d_middle_inner_Back / 2)
  points.sleeveHeadMiddleEaseBackCp2 = points.sleeveHeadMiddleEaseBack.shift(sleeveHeadMiddleBackAngle + 180, d_outer_middle_Back / 2)
  points.sleeveHeadEaseCenterCp1 = utils.beamIntersectsY(points.sleeveHeadOuterBack, points.sleeveHeadOuterBackCp1, points.sleeveHeadEaseCenter.y)

  if ( sleeveShoulderTipDelta > 0 ) {
    points.sleeveShoulderTipEase = new Path()
      .move(points.sleeveHeadEaseCenter)
      .curve(points.sleeveHeadEaseCenterCp2, points.sleeveHeadOuterBackCp1, points.sleeveHeadOuterBack)
      .shiftAlong(sleeveShoulderTipDelta)
  }
  let sleeveHeadBack = new Path()
    .move(points.sleeveHeadEaseCenter)
    .curve(points.sleeveHeadEaseCenterCp1, points.sleeveHeadOuterBackCp2, points.sleeveHeadOuterBack)
    .curve(points.sleeveHeadOuterBackCp1, points.sleeveHeadMiddleEaseBackCp2, points.sleeveHeadMiddleEaseBack)
    .curve(points.sleeveHeadMiddleEaseBackCp1, points.sleeveHeadInnerBackCp2, points.sleeveHeadInnerBack)
    .curve(points.sleeveHeadInnerBackCp1, points.sleeveArmpitEaseBackCp2, points.sleeveArmpitEaseBack)

  let sleeveHeadBackLength = sleeveHeadBack.length() - sleeveShoulderTipDelta
  log.info('sleeveHeadBackLength = ' + sleeveHeadBackLength)

  if (options.drawBodyLines) {
    paths.body_lines = new Path()
      .move(points.sleeveArmpitBack)
      .line(points.sleeveWristBack)
      .line(points.sleeveWristFront)
      .line(points.sleeveArmpitFront)
      .line(points.sleeveHeadCenter)
      .line(points.sleeveArmpitBack)
      .close()
      .attr('class', 'note')
  }

  paths.seam = new Path()
    .move(points.sleeveArmpitEaseBack)
    .line(points.sleeveBottomEaseBack)
    .line(points.sleeveBottomEaseFront)
    .line(points.sleeveArmpitEaseFront)
    .join(sleeveHeadFront)
    .join(sleeveHeadBack)
    .close()
    .attr('class', 'fabric')

  if (complete) {
    if ( points.sleeveBottomCenter.dy(points.sleeveElbowCenter) > 0 ) {
      points.sleeveElbowBack = utils.beamIntersectsY(points.sleeveArmpitEaseBack, points.sleeveBottomEaseBack, points.sleeveElbowCenter.y)
      points.sleeveElbowFront = utils.beamIntersectsY(points.sleeveArmpitEaseFront, points.sleeveBottomEaseFront, points.sleeveElbowCenter.y)
      paths.elbowLine = new Path().move(points.sleeveElbowBack).line(points.sleeveElbowFront).attr('class', 'help')
    }

    if ( points.sleeveBottomCenter.dy(points.sleeveWristCenter) > 0 ) {
      points.sleeveWristBack = utils.beamIntersectsY(points.sleeveArmpitEaseBack, points.sleeveBottomEaseBack, points.sleeveWristCenter.y)
      points.sleeveWristFront = utils.beamIntersectsY(points.sleeveArmpitEaseFront, points.sleeveBottomEaseFront, points.sleeveWristCenter.y)
      paths.wristLine = new Path().move(points.sleeveWristBack).line(points.sleeveWristFront).attr('class', 'help')
    }

    if (sa) {
      paths.sa = paths.seam.offset(sa).attr('class', 'fabric sa')
    }

    store.cutlist.setCut({ cut: 2, from: 'fabric' })

    points.grainlineTop = points.sleeveHeadEaseCenter.shiftFractionTowards(points.sleeveBottomCenter, 1/6)
    points.grainlineBottom = points.sleeveBottomCenter.shiftFractionTowards(points.sleeveHeadEaseCenter, 1/6)

    macro('grainline', {
      from: points.grainlineTop,
      to: points.grainlineBottom,
    })

    points.title = points.sleeveArmpitCenter
    macro('title', {
      nr: '3',
      at: points.title,
      brand: 'Morgane l’a fait !',
      title: 'Sleeve',
    })

    // notches
    let notches = []
    macro('sprinkle', {
      snippet: 'notch',
      on: notches,
    })

    // TODO: add paperless annotations
  }

  return part
}

export const sleeve = {
  name: 'sleeve',
  after: [ front, back ],
  options: {
    // Fit
    bicepsEase: { pct: 10, min: 5, max: 30, menu: 'fit' },
    cuffEase: { pct: 10, min: 0, max: 30, menu: 'fit' },
    // Style
    sleeveLengthBonus: { pct: 0, min: -4, max: 60, menu: 'style' },
    // Advanced
    drawBodyLines: { bool: true, menu: 'advanced' },
  },
  plugins: [measurementsPlugin],
  measurements: [
    'biceps',
    'shoulderToElbow',
    'shoulderToWrist',
    'wrist',
  ],
  draft: draftSleeve,
}

